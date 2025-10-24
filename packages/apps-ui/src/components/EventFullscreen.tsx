import type { ConnpassEvent } from "../types";
import { formatDateRange, participantsLabel, eventFallbackLabel } from "../utils";
import "./EventFullscreen.css";

interface EventFullscreenProps {
  event: ConnpassEvent;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
}

export function EventFullscreen({
  event,
  onClose,
  onOpenExternal,
}: EventFullscreenProps) {
  return (
    <div className="connpass-fullscreen">
      {/* Hero Image */}
      {event.imageUrl ? (
        <figure className="connpass-hero">
          <img src={event.imageUrl} alt={`${event.title ?? "Connpass イベント"}の画像`} />
          <span className="connpass-hero__badge">
            <svg
              className="connpass-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
            <span>{participantsLabel(event.participants)} 人</span>
          </span>
        </figure>
      ) : (
        <div className="connpass-hero connpass-hero--fallback">
          <span className="connpass-hero__label">{eventFallbackLabel(event)}</span>
          <span className="connpass-hero__badge">
            <svg
              className="connpass-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
            <span>{participantsLabel(event.participants)} 人</span>
          </span>
        </div>
      )}

      {/* Header */}
      <header className="connpass-fullscreen__header">
        <div className="connpass-fullscreen__header-main">
          <p className="connpass-text-sub">Connpass イベント</p>
          <h1 style={{ margin: "6px 0 0", fontSize: "26px", lineHeight: 1.2, fontWeight: 700 }}>
            {event.title ?? "Connpass イベント"}
          </h1>
        </div>

        <button
          type="button"
          className="connpass-pill-button connpass-pill-button--ghost"
          onClick={onClose}
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
            <path d="m18 6-12 12" />
            <path d="m6 6 12 12" />
          </svg>
          <span>閉じる</span>
        </button>
      </header>

      {/* Body */}
      <div className="connpass-fullscreen__body">
        {/* Meta Information */}
        <section>
          <div className="connpass-meta">
            <MetaRow
              icon="M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
              label={formatDateRange(event)}
            />
            <MetaRow
              icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              label={`参加者 ${participantsLabel(event.participants)} 人`}
            />
            {event.location?.place && (
              <MetaRow
                icon="M12 21c-4.2-3.4-7-7.3-7-11a7 7 0 1 1 14 0c0 3.7-2.8 7.6-7 11zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                label={event.location.place}
                subLabel={event.location.address}
              />
            )}
          </div>
        </section>

        {/* Owner/Group Info */}
        <section className="connpass-detail">
          <h2>主催・関連</h2>
          <div className="connpass-detail-grid">
            {event.owner && (
              <MetaRow
                icon="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                label={`主催 ${event.owner.displayName || event.owner.nickname}`}
                subLabel={
                  event.owner.displayName &&
                  event.owner.nickname &&
                  event.owner.displayName !== event.owner.nickname
                    ? `@${event.owner.nickname}`
                    : undefined
                }
              />
            )}

            {event.group?.title && (
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
                  <path d="M4 4h6l2 2h8v14H4z" />
                </svg>
                <div className="connpass-row__label">
                  グループ {event.group.title}
                  {event.group.url && (
                    <div style={{ marginTop: "6px", display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="connpass-btn-link"
                        onClick={() => onOpenExternal(event.group!.url!)}
                      >
                        <span>グループを見る</span>
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
                  )}
                </div>
              </div>
            )}

            {event.hashTag && (
              <MetaRow
                icon="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"
                label={`ハッシュタグ #${String(event.hashTag).replace(/^#/, "")}`}
              />
            )}
          </div>
        </section>

        {/* Catch Phrase */}
        {event.catchPhrase && (
          <section>
            <h2>キャッチコピー</h2>
            <p>{event.catchPhrase}</p>
          </section>
        )}

        {/* Summary */}
        {event.summary && (
          <section>
            <h2>概要</h2>
            <div style={{ whiteSpace: "pre-wrap" }}>{event.summary}</div>
          </section>
        )}

        {/* Presentations */}
        {event.presentations && event.presentations.length > 0 && (
          <section>
            <h2>発表</h2>
            <div className="connpass-presentations">
              {event.presentations.map((pres, idx) => (
                <article key={idx} className="connpass-presentation">
                  <div className="connpass-presentation__header">
                    <p style={{ margin: 0, fontWeight: 650, fontSize: "15px" }}>
                      {pres.title ?? "発表"}
                    </p>
                    <span className="connpass-pill-button">#{pres.order ?? ""}</span>
                  </div>
                  {pres.speaker && (
                    <p className="connpass-text-sub" style={{ marginTop: "6px" }}>
                      {pres.speaker}
                    </p>
                  )}
                  {pres.summary && (
                    <p style={{ marginTop: "10px" }}>{pres.summary}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="connpass-fullscreen__footer">
        <div className="connpass-text-sub">
          <span>主催: </span>
          <strong style={{ color: "var(--connpass-text-primary)", fontWeight: 650 }}>
            {event.owner?.displayName ?? event.owner?.nickname ?? "主催者"}
          </strong>
          {event.group?.title && <span>({event.group.title})</span>}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            className="connpass-btn-primary"
            onClick={() => onOpenExternal(event.url)}
          >
            <span>Connpass でイベントを見る</span>
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
      </footer>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  subLabel,
}: {
  icon: string;
  label: string;
  subLabel?: string;
}) {
  return (
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
        <path d={icon} />
      </svg>
      <div className="connpass-row__label">
        {label}
        {subLabel && <div className="connpass-text-sub">{subLabel}</div>}
      </div>
    </div>
  );
}
