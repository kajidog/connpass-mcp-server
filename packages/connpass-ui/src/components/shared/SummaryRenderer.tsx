import { buildSummaryBlocks, type SummaryBlock } from '../../utils/summaryParser'

interface SummaryRendererProps {
  summary?: string
  onOpenLink: (url: string) => void
}

function ExternalLink({
  href,
  label,
  onOpenLink,
}: {
  href: string
  label?: string
  onOpenLink: (url: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenLink(href)}
      className="underline break-all text-left"
      style={{ color: 'var(--ui-accent)' }}
    >
      {label || href}
    </button>
  )
}

function ScheduleTable({
  block,
  onOpenLink,
}: {
  block: Extract<SummaryBlock, { type: 'schedule' }>
  onOpenLink: (url: string) => void
}) {
  const headers = block.headers?.slice(0, 3) ?? ['時間', '内容']
  while (headers.length < 2) {
    headers.push(headers.length === 0 ? '時間' : '内容')
  }
  const hasSpeakerColumn = headers.includes('発表者')
  const gridTemplateColumns = hasSpeakerColumn ? '96px 108px minmax(0, 1fr)' : '96px minmax(0, 1fr)'

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ border: '1px solid var(--ui-border)', background: 'var(--ui-bg)' }}
    >
      <div
        className="grid text-xs font-semibold"
        style={{ background: 'var(--ui-surface)', color: 'var(--ui-text-secondary)', gridTemplateColumns }}
      >
        <div className="px-3 py-2" style={{ borderRight: '1px solid var(--ui-border)' }}>{headers[0]}</div>
        {hasSpeakerColumn && (
          <div className="px-3 py-2" style={{ borderRight: '1px solid var(--ui-border)' }}>
            {headers[1]}
          </div>
        )}
        <div className="px-3 py-2">{hasSpeakerColumn ? headers[2] ?? '内容' : headers[1]}</div>
      </div>
      {block.entries.map((entry, index) => (
        <div
          key={`${entry.time}-${index}`}
          className="grid text-sm"
          style={{ borderTop: index === 0 ? 'none' : '1px solid var(--ui-border)', gridTemplateColumns }}
        >
          <div
            className="px-3 py-2 font-medium"
            style={{ color: 'var(--ui-accent)', borderRight: '1px solid var(--ui-border)' }}
          >
            {entry.time}
          </div>
          {hasSpeakerColumn && (
            <div
              className="px-3 py-2"
              style={{ color: 'var(--ui-text-secondary)', borderRight: '1px solid var(--ui-border)' }}
            >
              {entry.speaker ?? ''}
            </div>
          )}
          <div className="px-3 py-2">
            {entry.description && (
              <div className="leading-relaxed" style={{ color: 'var(--ui-text)' }}>
                {entry.description.startsWith('http')
                  ? <ExternalLink href={entry.description} onOpenLink={onOpenLink} />
                  : entry.description}
              </div>
            )}
            {entry.details.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {entry.details.map((detail, detailIndex) => (
                  <div key={`${detail}-${detailIndex}`} className="text-xs leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>
                    {detail.startsWith('http')
                      ? <ExternalLink href={detail} onOpenLink={onOpenLink} />
                      : <span className="whitespace-pre-line">{detail}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function GenericTable({ block }: { block: Extract<SummaryBlock, { type: 'table' }> }) {
  const maxColumns = Math.max(block.headers.length, ...block.rows.map((row) => row.length))
  const gridTemplateColumns =
    maxColumns === 2
      ? '88px minmax(0, 1fr)'
      : maxColumns === 3
        ? '96px 108px minmax(0, 1fr)'
        : `repeat(${maxColumns}, minmax(0, 1fr))`

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ border: '1px solid var(--ui-border)', background: 'var(--ui-bg)' }}
    >
      <div
        className="grid text-xs font-semibold"
        style={{ background: 'var(--ui-surface)', color: 'var(--ui-text-secondary)', gridTemplateColumns }}
      >
        {block.headers.map((header, index) => (
          <div
            key={`${header}-${index}`}
            className="px-3 py-2"
            style={{ borderRight: index === block.headers.length - 1 ? 'none' : '1px solid var(--ui-border)' }}
          >
            {header}
          </div>
        ))}
      </div>
      {block.rows.map((row, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid text-sm"
          style={{ borderTop: '1px solid var(--ui-border)', gridTemplateColumns }}
        >
          {Array.from({ length: maxColumns }).map((_, columnIndex) => (
            <div
              key={`cell-${rowIndex}-${columnIndex}`}
              className="px-3 py-2 leading-relaxed"
              style={{
                color:
                  columnIndex === 0 && maxColumns > 1
                    ? 'var(--ui-text-secondary)'
                    : 'var(--ui-text)',
                borderRight: columnIndex === maxColumns - 1 ? 'none' : '1px solid var(--ui-border)',
              }}
            >
              <span className="whitespace-pre-line">{row[columnIndex] ?? ''}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function renderBlock(block: SummaryBlock, index: number, onOpenLink: (url: string) => void) {
  switch (block.type) {
    case 'heading':
      return (
        <h3 key={index} className="text-base font-bold mt-5 first:mt-0" style={{ color: 'var(--ui-text)' }}>
          {block.text}
        </h3>
      )
    case 'paragraph':
      return (
        <p key={index} className="text-sm leading-relaxed" style={{ color: 'var(--ui-text)' }}>
          {block.text}
        </p>
      )
    case 'list':
      return (
        <div key={index} className="flex flex-col gap-1">
          {block.items.map((item, itemIndex) => (
            <div key={`${item}-${itemIndex}`} className="flex items-start gap-2 text-sm leading-relaxed">
              <span style={{ color: 'var(--ui-accent)' }}>•</span>
              <span style={{ color: 'var(--ui-text)' }}>{item}</span>
            </div>
          ))}
        </div>
      )
    case 'link':
      return <ExternalLink key={index} href={block.href} label={block.label} onOpenLink={onOpenLink} />
    case 'note':
      return (
        <p key={index} className="text-sm italic" style={{ color: 'var(--ui-text-secondary)' }}>
          {block.text}
        </p>
      )
    case 'keyValue':
      return (
        <div
          key={index}
          className="overflow-hidden rounded-xl"
          style={{ border: '1px solid var(--ui-border)', background: 'var(--ui-bg)' }}
        >
          {block.rows.map((row, rowIndex) => (
            <div
              key={`${row.key}-${rowIndex}`}
              className="grid grid-cols-[88px_1fr] text-sm"
              style={{ borderTop: rowIndex === 0 ? 'none' : '1px solid var(--ui-border)' }}
            >
              <div
                className="px-3 py-2 font-medium"
                style={{ background: 'var(--ui-surface)', color: 'var(--ui-text-secondary)', borderRight: '1px solid var(--ui-border)' }}
              >
                {row.key}
              </div>
              <div className="px-3 py-2 leading-relaxed" style={{ color: 'var(--ui-text)' }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )
    case 'table':
      return <GenericTable key={index} block={block} />
    case 'schedule':
      return <ScheduleTable key={index} block={block} onOpenLink={onOpenLink} />
    default:
      return null
  }
}

export function SummaryRenderer({ summary, onOpenLink }: SummaryRendererProps) {
  if (!summary) return null

  const blocks = buildSummaryBlocks(summary)
  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => renderBlock(block, index, onOpenLink))}
    </div>
  )
}
