import { useRef } from "react";
import type { ConnpassEvent } from "../types";
import { EventCard } from "./EventCard";
import "./EventCarousel.css";

interface EventCarouselProps {
  events: ConnpassEvent[];
  onEventClick: (eventId: number) => void;
  onOpenExternal: (url: string) => void;
}

export function EventCarousel({
  events,
  onEventClick,
  onOpenExternal,
}: EventCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (offset: number) => {
    scrollerRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollerRef.current) return;

    const scroller = scrollerRef.current;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth - 1;

    const prevBtn = scroller.parentElement?.querySelector('.connpass-carousel__nav--prev') as HTMLButtonElement;
    const nextBtn = scroller.parentElement?.querySelector('.connpass-carousel__nav--next') as HTMLButtonElement;

    if (prevBtn) prevBtn.disabled = scroller.scrollLeft <= 0;
    if (nextBtn) nextBtn.disabled = scroller.scrollLeft >= maxScroll;
  };

  return (
    <div className="connpass-carousel">
      <div
        className="connpass-carousel__scroller"
        ref={scrollerRef}
        onScroll={handleScroll}
      >
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onDetailClick={() => onEventClick(event.id)}
            onLinkClick={() => onOpenExternal(event.url)}
          />
        ))}
      </div>

      <button
        type="button"
        className="connpass-carousel__nav connpass-carousel__nav--prev"
        onClick={() => scrollBy(-280)}
        aria-label="前へ"
      >
        <svg
          className="connpass-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>

      <button
        type="button"
        className="connpass-carousel__nav connpass-carousel__nav--next"
        onClick={() => scrollBy(280)}
        aria-label="次へ"
      >
        <svg
          className="connpass-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
