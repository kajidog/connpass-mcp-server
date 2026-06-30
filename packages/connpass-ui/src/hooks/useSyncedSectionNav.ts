import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import type { CarouselApi } from "../components/ui/carousel";

type SectionItem = { id: string };
type ScrollOffset = number | (() => number);
type SectionResolver = (id: string) => HTMLElement | null;

function resolveOffset(offset: ScrollOffset): number {
  return typeof offset === "function" ? offset() : offset;
}

function getTopRelativeToRoot(element: HTMLElement, root: HTMLElement): number {
  // スクロールコンテナ基準の top に揃えて active 判定とスクロール量を計算する。
  return element.getBoundingClientRect().top - root.getBoundingClientRect().top;
}

/** id からセクション要素を引く resolver を作る（escape hatch があればそちらを優先）。 */
function useSectionResolver(
  getSectionElement?: SectionResolver,
): SectionResolver {
  return useCallback(
    (id: string) => getSectionElement?.(id) ?? document.getElementById(id),
    [getSectionElement],
  );
}

interface UseActiveSectionOptions<T extends SectionItem> {
  items: readonly T[];
  scrollContainerRef: RefObject<HTMLElement | null>;
  resolveSectionElement: SectionResolver;
  scrollOffset: ScrollOffset;
  onActiveChange?: (id: string | null) => void;
}

/**
 * スクロール位置から active なセクションを割り出す scroll spy。
 * スクロール対象は必ず scrollContainerRef で受け取る（window は対象にしない）。
 */
function useActiveSection<T extends SectionItem>({
  items,
  scrollContainerRef,
  resolveSectionElement,
  scrollOffset,
  onActiveChange,
}: UseActiveSectionOptions<T>) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  const selectActiveId = useCallback(
    (id: string | null) => {
      setActiveId(id);
      onActiveChange?.(id);
    },
    [onActiveChange],
  );

  const computeActiveId = useCallback(() => {
    const root = scrollContainerRef.current;
    if (!root || items.length === 0) return;

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

    selectActiveId(current);
  }, [
    items,
    resolveSectionElement,
    scrollContainerRef,
    scrollOffset,
    selectActiveId,
  ]);

  // items が差し替わったら先頭セクションを active に戻す。
  useEffect(() => {
    selectActiveId(items[0]?.id ?? null);
  }, [items, selectActiveId]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root || items.length === 0) return;

    let frame = 0;
    const requestCompute = () => {
      if (frame) return;
      // scroll イベントの連打で active 判定を過剰に走らせない。
      frame = requestAnimationFrame(() => {
        frame = 0;
        computeActiveId();
      });
    };

    computeActiveId();
    root.addEventListener("scroll", requestCompute, { passive: true });
    // コンテナのサイズ変化（レイアウト変更）でも判定し直す。
    const resizeObserver = new ResizeObserver(requestCompute);
    resizeObserver.observe(root);

    return () => {
      root.removeEventListener("scroll", requestCompute);
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [computeActiveId, items.length, scrollContainerRef]);

  return { activeId, selectActiveId };
}

interface UseSectionScrollerOptions {
  scrollContainerRef: RefObject<HTMLElement | null>;
  resolveSectionElement: SectionResolver;
  scrollOffset: ScrollOffset;
  scrollBehavior: ScrollBehavior;
}

/** 指定セクションへスクロールするだけの責務。成功したら true を返す。 */
function useSectionScroller({
  scrollContainerRef,
  resolveSectionElement,
  scrollOffset,
  scrollBehavior,
}: UseSectionScrollerOptions) {
  return useCallback(
    (id: string): boolean => {
      const root = scrollContainerRef.current;
      if (!root) return false;

      const element = resolveSectionElement(id);
      if (!element) return false;

      // scrollIntoView だと offset 調整が難しいため、スクロール先を明示計算する。
      const top =
        root.scrollTop +
        getTopRelativeToRoot(element, root) -
        resolveOffset(scrollOffset);

      root.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
      return true;
    },
    [resolveSectionElement, scrollBehavior, scrollContainerRef, scrollOffset],
  );
}

/** カルーセル（チップ列）を active なセクションに合わせて中央へ寄せる。 */
function useCarouselSync<T extends SectionItem>(
  items: readonly T[],
  activeId: string | null,
) {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || !activeId) return;
    const index = items.findIndex((item) => item.id === activeId);
    if (index >= 0) api.scrollTo(index);
  }, [api, activeId, items]);

  return { setCarouselApi: setApi };
}

export interface UseSyncedSectionNavOptions<T extends SectionItem> {
  /** items[].id と同じ id を持つセクションを探し、クリックとスクロール同期の対象にする。 */
  items: readonly T[];
  /** スクロール対象のコンテナ。active 判定とスクロール先の基準になる。 */
  scrollContainerRef: RefObject<HTMLElement | null>;
  /** sticky header の高さなど、active 判定とスクロール先から差し引く余白。 */
  scrollOffset?: ScrollOffset;
  scrollBehavior?: ScrollBehavior;
  /** id 以外でセクション要素を探したい場合の escape hatch。 */
  getSectionElement?: SectionResolver;
  onActiveChange?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

export interface UseSyncedSectionNavResult {
  /** 現在 active なセクションの id。 */
  activeId: string | null;
  /** 指定セクションへスクロールし、active を更新する。 */
  handleSelect: (id: string) => void;
  /** Carousel の setApi にそのまま渡す。チップ列を active に追従させる。 */
  setCarouselApi: (api: CarouselApi) => void;
}

/**
 * scroll spy・スクロール移動・カルーセル追従をまとめた、ナビ用の合成フック。
 * 呼び出し側はこのフック 1 つだけ使えば、ナビの同期挙動が完結する。
 */
export function useSyncedSectionNav<T extends SectionItem>({
  items,
  scrollContainerRef,
  scrollOffset = 0,
  scrollBehavior = "smooth",
  getSectionElement,
  onActiveChange,
  onSelect,
}: UseSyncedSectionNavOptions<T>): UseSyncedSectionNavResult {
  const resolveSectionElement = useSectionResolver(getSectionElement);

  const { activeId, selectActiveId } = useActiveSection({
    items,
    scrollContainerRef,
    resolveSectionElement,
    scrollOffset,
    onActiveChange,
  });

  const scrollToSection = useSectionScroller({
    scrollContainerRef,
    resolveSectionElement,
    scrollOffset,
    scrollBehavior,
  });

  const { setCarouselApi } = useCarouselSync(items, activeId);

  const handleSelect = useCallback(
    (id: string) => {
      if (!scrollToSection(id)) return;
      selectActiveId(id);
      onSelect?.(id);
    },
    [onSelect, scrollToSection, selectActiveId],
  );

  return { activeId, handleSelect, setCarouselApi };
}
