import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ConnpassEvent } from "../types/events";
import { EventCard } from "./EventCard";

interface CarouselProps {
  events: ConnpassEvent[];
  onShowDetail: (event: ConnpassEvent) => void;
  isLoading?: boolean;
}

export function Carousel({ events, onShowDetail, isLoading }: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[200px] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-center">
        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
        <p>イベントを検索中</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[200px] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-center">
        <span className="text-4xl">🔍</span>
        <p>イベントが見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="relative w-full py-4 px-4 bg-zinc-100/50 dark:bg-zinc-900/50 shadow-inner rounded-xl">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onShowDetail={onShowDetail}
            />
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {canScrollPrev && (
        <button
          type="button"
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-700 shadow-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-colors z-10"
          onClick={scrollPrev}
          aria-label="前へ"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-700 shadow-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-colors z-10"
          onClick={scrollNext}
          aria-label="次へ"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
