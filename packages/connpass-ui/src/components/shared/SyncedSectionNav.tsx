import { useSyncedSectionNav } from "@/hooks/useSyncedSectionNav";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { RefObject } from "react";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

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
  /** スクロール対象のコンテナ。active 判定とスクロール先の基準になる（必須）。 */
  scrollContainerRef: RefObject<HTMLElement | null>;
  /** id 以外でセクション要素を探したい場合の escape hatch。 */
  getSectionElement?: (id: string) => HTMLElement | null;
  /** チップの中身を完全に差し替える。未指定なら label/meta の標準表示を使う。 */
  renderItem?: (item: T, state: SyncedSectionNavItemState) => ReactNode;
  onActiveChange?: (id: string | null) => void;
  onSelect?: (id: string) => void;
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
  getSectionElement,
  renderItem,
  onActiveChange,
  onSelect,
}: SyncedSectionNavProps<T>) {
  const { activeId, handleSelect, setCarouselApi } = useSyncedSectionNav({
    items,
    scrollContainerRef,
    scrollOffset,
    scrollBehavior,
    getSectionElement,
    onActiveChange,
    onSelect,
  });

  if (items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={className}>
      <Carousel
        aria-label={ariaLabel}
        opts={{ align: "center", dragFree: true, containScroll: "trimSnaps" }}
        setApi={setCarouselApi}
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
