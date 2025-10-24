import type { EventSection, MCPMetadata } from "../types";
import { formatDateRange, participantsLabel, eventFallbackLabel } from "../utils";
import "./EventAgenda.css";

interface EventAgendaProps {
  sections: EventSection[];
  metadata?: MCPMetadata;
  userId?: number;
  onEventClick: (eventId: number) => void;
  onOpenExternal: (url: string) => void;
}

export function EventAgenda({
  sections,
  metadata,
  userId,
  onEventClick,
  onOpenExternal,
}: EventAgendaProps) {
  const chipLabels: string[] = [];

  if (userId != null) {
    chipLabels.push(`ユーザーID ${userId}`);
  }

  if (metadata?.daysAhead != null && Number.isFinite(metadata.daysAhead)) {
    chipLabels.push(`表示期間 ${metadata.daysAhead}日`);
  }

  if (metadata?.limit != null && Number.isFinite(metadata.limit)) {
    chipLabels.push(`チェック上限 ${metadata.limit}件`);
  }

  if (metadata?.includePresentations != null) {
    chipLabels.push(
      metadata.includePresentations ? "発表情報あり" : "発表情報なし"
    );
  }

  const metaLineItems: string[] = [];
  if (metadata?.inspected != null && Number.isFinite(metadata.inspected)) {
    if (metadata.limit != null && Number.isFinite(metadata.limit)) {
      metaLineItems.push(`取得対象 ${metadata.inspected}/${metadata.limit}件`);
    } else {
      metaLineItems.push(`取得対象 ${metadata.inspected}件`);
    }
  }

  return (
    <div className="connpass-agenda">
      {chipLabels.length > 0 && (
        <div className="connpass-agenda__chips">
          {chipLabels.map((label, idx) => (
            <span key={idx} className="connpass-chip">
              {label}
            </span>
          ))}
        </div>
      )}

      {sections.map((section) => (
        <section key={section.key} className="connpass-agenda__section">
          <header className="connpass-agenda__section-header">
            <h2 className="connpass-agenda__section-title">{section.title}</h2>
            {section.subtitle && (
              <p className="connpass-agenda__section-subtitle">
                {section.subtitle}
              </p>
            )}
          </header>

          {section.events.length === 0 ? (
            <div className="connpass-agenda__empty">
              {section.emptyText ?? "イベントが見つかりません。"}
            </div>
          ) : (
            <div className="connpass-agenda__list">
              {section.events.map((event) => (
                <article key={event.id} className="connpass-list-card">
                  <div className="connpass-list-card__header">
                    <div className="connpass-list-card__header-media">
                      {event.owner?.imageUrl ? (
                        <img
                          src={event.owner.imageUrl}
                          alt={`${event.owner.displayName || event.owner.nickname || "主催者"}の画像`}
                          loading="lazy"
                        />
                      ) : event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={`${event.title ?? "Connpass イベント"}の画像`}
                          loading="lazy"
                        />
                      ) : (
                        <span className="connpass-list-card__media-fallback">
                          {eventFallbackLabel(event)}
                        </span>
                      )}
                    </div>

                    <div className="connpass-list-card__header-text">
                      <h3 className="connpass-list-card__title">
                        {event.title ?? "タイトル未設定"}
                      </h3>
                      <div className="connpass-list-card__owner">
                        {event.owner?.displayName ||
                          event.owner?.nickname ||
                          "主催者"}
                      </div>
                    </div>
                  </div>

                  <div className="connpass-list-card__body">
                    {event.catchPhrase ? (
                      <p className="connpass-list-card__catchphrase">
                        {event.catchPhrase}
                      </p>
                    ) : event.summary ? (
                      <p className="connpass-list-card__catchphrase">
                        {event.summary}
                      </p>
                    ) : null}

                    <div className="connpass-list-card__meta">
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
                        <div className="connpass-row__label">
                          {formatDateRange(event)}
                        </div>
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
                              <div className="connpass-text-sub">
                                {event.location.address}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                        </svg>
                        <div className="connpass-row__label">
                          {participantsLabel(event.participants)} 人
                        </div>
                      </div>
                    </div>

                    {event.hashTag ? (
                      <span className="connpass-tag">
                        #{event.hashTag.replace(/^#/, "")}
                      </span>
                    ) : event.group?.title ? (
                      <span className="connpass-tag">{event.group.title}</span>
                    ) : null}

                    <div className="connpass-list-card__actions">
                      <button
                        type="button"
                        className="connpass-btn-primary"
                        onClick={() => onEventClick(event.id)}
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

                      {event.url && (
                        <button
                          type="button"
                          className="connpass-btn-link"
                          onClick={() => onOpenExternal(event.url)}
                        >
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
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}

      {metaLineItems.length > 0 && (
        <div className="connpass-agenda__meta">
          {metaLineItems.join(" ・ ")}
        </div>
      )}
    </div>
  );
}
