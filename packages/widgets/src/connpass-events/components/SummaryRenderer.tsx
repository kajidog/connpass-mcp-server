import { buildSummaryBlocks, type SummaryBlock } from "../utils/summary-parser";
import { ScheduleTable } from "./ScheduleTable";

interface SummaryRendererProps {
  summary: string | undefined;
}

function ExternalLink({
  href,
  label,
}: {
  href: string;
  label?: string;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.openai?.openExternal?.({ href });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
      target="_blank"
      rel="noopener noreferrer"
    >
      {label || href}
    </a>
  );
}

function renderBlock(block: SummaryBlock, index: number) {
  switch (block.type) {
    case "heading":
      return (
        <h3
          key={index}
          className="text-base font-bold text-zinc-900 dark:text-white mt-5 mb-2 first:mt-0"
        >
          {block.text}
        </h3>
      );

    case "paragraph":
      return (
        <p
          key={index}
          className="text-sm text-zinc-700 dark:text-zinc-300 my-2 leading-relaxed"
        >
          {block.text}
        </p>
      );

    case "list":
      return (
        <ul
          key={index}
          className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 my-2 space-y-1"
        >
          {block.items.map((item, itemIdx) => (
            <li key={itemIdx}>{item}</li>
          ))}
        </ul>
      );

    case "link":
      return (
        <p key={index} className="my-2">
          <ExternalLink href={block.href} label={block.label} />
        </p>
      );

    case "note":
      return (
        <p
          key={index}
          className="text-sm text-amber-600 dark:text-amber-400 my-2 italic"
        >
          {block.text}
        </p>
      );

    case "schedule":
      return <ScheduleTable key={index} block={block} />;

    default:
      return null;
  }
}

export function SummaryRenderer({ summary }: SummaryRendererProps) {
  if (!summary) return null;

  const blocks = buildSummaryBlocks(summary);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
        {summary}
      </p>
    );
  }

  return <div className="space-y-1">{blocks.map(renderBlock)}</div>;
}
