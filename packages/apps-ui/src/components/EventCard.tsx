import type { ConnpassEvent } from "../types";
import { formatDateRange, participantsLabel, eventFallbackLabel } from "../utils";
import "./EventCard.css";

interface EventCardProps {
  event: ConnpassEvent;
  onDetailClick: () => void;
  onLinkClick: () => void;
}

export function EventCard({ event, onDetailClick, onLinkClick }: EventCardProps) {
  return (
    <article className="connpass-card">
      {event.imageUrl ? (
        <figure className="connpass-card__media">
          <img
            src={event.imageUrl}
            alt={`${event.title ?? "Connpass イベント"}の画像`}
            loading="lazy"
          />
        </figure>
      ) : (
        <div className="connpass-card__media connpass-card__media--fallback">
          <span className="connpass-card__media-fallback-label">
            {eventFallbackLabel(event)}
          </span>
        </div>
      )}

      <div className="connpass-card__content">
        <h2 className="connpass-card__title">{event.title ?? "タイトル未設定"}</h2>

        <span className="connpass-badge">
          <svg
            className="connpass-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
          <span>{participantsLabel(event.participants)} 人</span>
        </span>

        <div className="connpass-row">
          <svg
            className="connpass-row__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          </svg>
          <div className="connpass-row__label">{formatDateRange(event)}</div>
        </div>

        {event.location?.place && (
          <div className="connpass-row">
            <svg
              className="connpass-row__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21c-4.2-3.4-7-7.3-7-11a7 7 0 1 1 14 0c0 3.7-2.8 7.6-7 11zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
            <div className="connpass-row__label">
              {event.location.place}
              {event.location.address && (
                <span className="connpass-text-sub">{event.location.address}</span>
              )}
            </div>
          </div>
        )}

        {event.catchPhrase && (
          <p className="connpass-card__catchphrase">{event.catchPhrase}</p>
        )}

        {event.hashTag && (
          <span className="connpass-tag">
            #{event.hashTag.replace(/^#/, "")}
          </span>
        )}
      </div>

      <div className="connpass-card__footer">
        <button
          type="button"
          className="connpass-btn-primary"
          onClick={onDetailClick}
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
            <path d="M15 3h6v6" />
            <path d="M21 3 14 10" />
            <path d="M9 21H3v-6" />
            <path d="m3 21 7-7" />
          </svg>
          <span>詳細を見る</span>
        </button>

        <button type="button" className="connpass-btn-link" onClick={onLinkClick}>
          <span>Connpass</span>
          <svg
            className="connpass-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="m15 3 6 6" />
            <path d="M21 3h-6v6" />
          </svg>
        </button>
      </div>
    </article>
  );
}
