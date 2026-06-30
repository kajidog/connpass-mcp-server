import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { RefObject } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "../ui/carousel";

export interface SyncedSectionNavItem {
  /** スクロール先セクションの DOM id と一致させる値。 */
  id: string;
  /** ナビに表示する主ラベル。 */
  label: ReactNode;
  /** 件数や補足など、主ラベルの下に出す任意の情報。 */
  meta?: ReactNode;
  /** ボタン単位の読み上げラベル。未指定なら表示内容で読まれる。 */
  ariaLabel?: string;
}

interface SyncedSectionNavItemState {
  active: boolean;
  index: number;
}

interface SyncedSectionNavProps<T extends SyncedSectionNavItem> {
  /** items[].id と同じ id を持つセクションを探し、クリックとスクロール同期の対象にする。 */
  items: readonly T[];
  ariaLabel?: string;
  className?: string;
  itemClassName?: string;
  /** デフォルトのボタン見た目に追加する class。active 状態に応じた出し分けもできる。 */
  buttonClassName?:
    | string
    | ((item: T, state: SyncedSectionNavItemState) => string);
  /** sticky header の高さなど、active 判定とスクロール先から差し引く余白。 */
  scrollOffset?: number | (() => number);
  scrollBehavior?: ScrollBehavior;
  /** モーダル本文など、window 以外をスクロールさせる場合に渡す。 */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** ref を持てない Portal や外部 DOM では、関数でスクロールコンテナを解決できる。 */
  getScrollContainer?: () => HTMLElement | null;
  /** id 以外でセクション要素を探したい場合の escape hatch。 */
  getSectionElement?: (id: string) => HTMLElement | null;
  /** チップの中身を完全に差し替える。未指定なら label/meta の標準表示を使う。 */
  renderItem?: (item: T, state: SyncedSectionNavItemState) => ReactNode;
  onActiveChange?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

const SCROLL_SYNC_IDLE_MS = 120;

function resolveOffset(offset: number | (() => number)): number {
  return typeof offset === "function" ? offset() : offset;
}

function resolveScrollRoot(
  scrollContainerRef?: RefObject<HTMLElement | null>,
  getScrollContainer?: () => HTMLElement | null,
): Window | HTMLElement {
  // 呼び出し側でスクロール領域を指定しない場合は、通常ページの window を対象にする。
  return getScrollContainer?.() ?? scrollContainerRef?.current ?? window;
}

function isWindow(root: Window | HTMLElement): root is Window {
  return root === window;
}

function getScrollTop(root: Window | HTMLElement): number {
  return isWindow(root) ? window.scrollY : root.scrollTop;
}

function getTopRelativeToRoot(
  element: HTMLElement,
  root: Window | HTMLElement,
): number {
  // window と要素スクロールでは座標の基準が違うため、スクロールコンテナ基準の top に揃える。
  const elementTop = element.getBoundingClientRect().top;
  if (isWindow(root)) return elementTop;
  return elementTop - root.getBoundingClientRect().top;
}

function scrollRootTo(
  root: Window | HTMLElement,
  top: number,
  behavior: ScrollBehavior,
): void {
  if (isWindow(root)) {
    window.scrollTo({ top, behavior });
    return;
  }
  root.scrollTo({ top, behavior });
}

function resolveClassName<T extends SyncedSectionNavItem>(
  className:
    | string
    | ((item: T, state: SyncedSectionNavItemState) => string)
    | undefined,
  item: T,
  state: SyncedSectionNavItemState,
): string | undefined {
  return typeof className === "function" ? className(item, state) : className;
}

export function SyncedSectionNav<T extends SyncedSectionNavItem>({
  items,
  ariaLabel = "セクション",
  className,
  itemClassName,
  buttonClassName,
  scrollOffset = 0,
  scrollBehavior = "smooth",
  scrollContainerRef,
  getScrollContainer,
  getSectionElement,
  renderItem,
  onActiveChange,
  onSelect,
}: SyncedSectionNavProps<T>) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const clickedScrollLockRef = useRef(false);
  const scrollSyncResumeTimerRef = useRef<number | null>(null);

  const resolveSectionElement = useCallback(
    (id: string) => getSectionElement?.(id) ?? document.getElementById(id),
    [getSectionElement],
  );

  const updateActiveId = useCallback(
    (id: string | null) => {
      setActiveId(id);
      onActiveChange?.(id);
    },
    [onActiveChange],
  );

  const computeActiveId = useCallback(() => {
    if (typeof window === "undefined" || items.length === 0) return;

    const root = resolveScrollRoot(scrollContainerRef, getScrollContainer);
    const threshold = resolveOffset(scrollOffset);
    let current = items[0].id;

    // 上端の判定ラインを越えた最後のセクションを active にする。
    // 末尾到達時に最後へ強制切り替えはせず、実際の表示位置だけで決める。
    for (const item of items) {
      const element = resolveSectionElement(item.id);
      if (!element) continue;
      if (getTopRelativeToRoot(element, root) - threshold <= 0) {
        current = item.id;
      } else {
        break;
      }
    }

    updateActiveId(current);
  }, [
    items,
    getScrollContainer,
    resolveSectionElement,
    scrollContainerRef,
    scrollOffset,
    updateActiveId,
  ]);

  useEffect(() => {
    if (!api || !activeId) return;
    const index = items.findIndex((item) => item.id === activeId);
    if (index >= 0) api.scrollTo(index);
  }, [api, activeId, items]);

  useEffect(() => {
    const nextId = items[0]?.id ?? null;
    updateActiveId(nextId);
  }, [items, updateActiveId]);

  useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) return;

    const root = resolveScrollRoot(scrollContainerRef, getScrollContainer);
    let frame = 0;
    const requestCompute = () => {
      if (frame) return;
      // scroll イベントの連打で active 判定を過剰に走らせない。
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        // クリック直後の smooth scroll 中は、位置ベースの判定で選択先を上書きしない。
        if (clickedScrollLockRef.current) {
          if (scrollSyncResumeTimerRef.current !== null) {
            window.clearTimeout(scrollSyncResumeTimerRef.current);
          }
          scrollSyncResumeTimerRef.current = window.setTimeout(() => {
            scrollSyncResumeTimerRef.current = null;
            // active はクリック時に更新済みなので、停止後は通常同期へ戻すだけにする。
            clickedScrollLockRef.current = false;
          }, SCROLL_SYNC_IDLE_MS);
          return;
        }
        computeActiveId();
      });
    };

    computeActiveId();
    root.addEventListener("scroll", requestCompute, { passive: true });
    window.addEventListener("resize", requestCompute);

    return () => {
      root.removeEventListener("scroll", requestCompute);
      window.removeEventListener("resize", requestCompute);
      if (frame) window.cancelAnimationFrame(frame);
      if (scrollSyncResumeTimerRef.current !== null) {
        window.clearTimeout(scrollSyncResumeTimerRef.current);
        scrollSyncResumeTimerRef.current = null;
      }
    };
  }, [computeActiveId, getScrollContainer, items.length, scrollContainerRef]);

  const handleSelect = useCallback(
    (id: string) => {
      if (typeof window === "undefined") return;

      const element = resolveSectionElement(id);
      if (!element) return;

      const root = resolveScrollRoot(scrollContainerRef, getScrollContainer);
      // scrollIntoView だと offset 調整が難しいため、スクロール先を明示計算する。
      const top =
        getScrollTop(root) +
        getTopRelativeToRoot(element, root) -
        resolveOffset(scrollOffset);

      updateActiveId(id);
      onSelect?.(id);
      clickedScrollLockRef.current = true;
      if (scrollSyncResumeTimerRef.current !== null) {
        window.clearTimeout(scrollSyncResumeTimerRef.current);
        scrollSyncResumeTimerRef.current = null;
      }
      scrollRootTo(root, Math.max(0, top), scrollBehavior);
    },
    [
      getScrollContainer,
      onSelect,
      resolveSectionElement,
      scrollBehavior,
      scrollContainerRef,
      scrollOffset,
      updateActiveId,
    ],
  );

  if (items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={className}>
      <Carousel
        aria-label={ariaLabel}
        opts={{ align: "center", dragFree: true, containScroll: "trimSnaps" }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {items.map((item, index) => {
            const active = item.id === activeId;
            const itemState = { active, index };
            return (
              <CarouselItem
                key={item.id}
                className={cn("basis-auto pl-2", itemClassName)}
              >
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  aria-label={item.ariaLabel}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "flex min-w-14 flex-col items-center rounded-md border px-3 py-1.5 text-center whitespace-nowrap transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
                    resolveClassName(buttonClassName, item, itemState),
                  )}
                >
                  {renderItem ? (
                    renderItem(item, itemState)
                  ) : (
                    <>
                      <span className="text-xs font-semibold leading-tight">
                        {item.label}
                      </span>
                      {item.meta && (
                        <span
                          className={cn(
                            "text-[10px] leading-tight",
                            active
                              ? "text-primary-foreground/85"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.meta}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </nav>
  );
}
