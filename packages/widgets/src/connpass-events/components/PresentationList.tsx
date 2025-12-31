import { ExternalLink as ExternalLinkIcon, Youtube, Twitter } from "lucide-react";
import type { FormattedPresentation } from "../types/events";

interface PresentationListProps {
  presentations: FormattedPresentation[];
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.openai?.openExternal?.({ href });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

function PresentationCard({
  presentation,
}: {
  presentation: FormattedPresentation;
}) {
  const hasLinks =
    presentation.links?.url ||
    presentation.links?.slideshare ||
    presentation.links?.youtube ||
    presentation.links?.twitter;

  return (
    <article className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-xl border border-zinc-200 dark:border-zinc-600">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
        {presentation.title}
      </h4>

      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
        {presentation.speaker}
      </p>

      {presentation.summary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 mb-2">
          {presentation.summary}
        </p>
      )}

      {hasLinks && (
        <div className="flex flex-wrap gap-3">
          {presentation.links?.url && (
            <ExternalLink href={presentation.links.url}>
              <ExternalLinkIcon size={12} />
              <span>詳細</span>
            </ExternalLink>
          )}
          {presentation.links?.slideshare && (
            <ExternalLink href={presentation.links.slideshare}>
              <ExternalLinkIcon size={12} />
              <span>スライド</span>
            </ExternalLink>
          )}
          {presentation.links?.youtube && (
            <ExternalLink href={presentation.links.youtube}>
              <Youtube size={12} />
              <span>動画</span>
            </ExternalLink>
          )}
          {presentation.links?.twitter && (
            <ExternalLink href={presentation.links.twitter}>
              <Twitter size={12} />
              <span>Twitter</span>
            </ExternalLink>
          )}
        </div>
      )}
    </article>
  );
}

export function PresentationList({ presentations }: PresentationListProps) {
  if (presentations.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
        発表資料
      </h3>
      <div className="flex flex-col gap-2">
        {presentations.map((presentation) => (
          <PresentationCard key={presentation.id} presentation={presentation} />
        ))}
      </div>
    </section>
  );
}
