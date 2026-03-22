import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

// --- Production formatting (copied from apps/mcp-server/src/tools/formatting.ts) ---

const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&#x60;': '`',
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity) => {
      const mapped = HTML_ENTITY_MAP[entity]
      if (mapped) return mapped

      const numericMatch = entity.match(/^&#(x?[0-9a-fA-F]+);$/)
      if (!numericMatch) return entity

      const value = numericMatch[1]
      const codePoint =
        value.startsWith('x') || value.startsWith('X')
          ? Number.parseInt(value.slice(1), 16)
          : Number.parseInt(value, 10)

      if (!Number.isFinite(codePoint)) return entity

      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return entity
      }
    })
    .replace(/\u00a0/gi, ' ')
}

function stripHtml(input: string): string {
  if (!input) return ''

  const withoutScripts = input.replace(/<script[\s\S]*?<\/script>/gi, '')
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, '')

  // Replace <br> inside table cells with space to preserve row structure
  const withCellBrNormalized = withoutStyles.replace(
    /(<(?:td|th)\b[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi,
    (_, open, content, close) =>
      `${open}${content.replace(/<br\s*\/?\s*>/gi, ' ')}${close}`,
  )

  const normalizedTableCells = withCellBrNormalized
    .replace(/<\/(td|th)>\s*<(td|th)/gi, '</$1>\t<$2')
    .replace(/<\/(tr)>\s*<tr/gi, '</$1>\n<tr')

  const withLineBreaks = normalizedTableCells
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|li)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n## ')
    .replace(/<\/(h[1-6]|tr)>/gi, '\n')

  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, '')
  return decodeHtmlEntities(withoutTags)
}

function sanitizeRichText(input: string): string {
  if (!input) return ''

  const stripped = stripHtml(input)
  const normalizedWhitespace = stripped
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map((line) =>
      line
        .split(/\t+/)
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join('\t'),
    )
    .filter(Boolean)
    .join('\n')

  return normalizedWhitespace
    .replace(/ {2,}/g, ' ')
    .replace(/ *\t */g, '\t')
    .trim()
}

function truncateText(text: string, limit: number): string {
  if (!text) return ''
  if (text.length <= limit) return text
  if (limit <= 3) return text.slice(0, limit)
  return `${text.slice(0, limit - 3).trimEnd()}...`
}

// --- Summary parser (copied from packages/connpass-ui/src/utils/summaryParser.ts) ---

type SummaryBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'link'; href: string; label?: string }
  | { type: 'note'; text: string }
  | { type: 'keyValue'; rows: Array<{ key: string; value: string }> }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | {
      type: 'schedule'
      entries: Array<{ time: string; speaker?: string; description?: string; details: string[] }>
      headers?: string[]
    }

const SUMMARY_SECTION_HEADINGS = new Set([
  '概要', 'この会について', '対象', '会場', '持ち物', '参加費',
  'Slack', '情報共有', '最寄り駅', 'アクセス', '連絡先', '開催概要', 'プログラム',
])

const SUMMARY_SKIP_HEADINGS = new Set(['日時', '時間', '発表者', '内容', 'スケジュール', '備考', '項目'])
const SCHEDULE_HEADER_CANDIDATES = new Set(['時間', '発表者', '内容', '項目'])

function isTableHeaderLine(value: string): boolean {
  if (value.includes('\t')) return false
  const normalized = value.trim()
  return /^(時間|項目)(?:\s+発表者)?\s+内容/.test(normalized)
}

function normalizeHeadingText(text: string | undefined | null): string {
  return String(text ?? '').trim().replace(/[：:]+$/, '')
}

function isScheduleLine(value: string): boolean {
  return /^\d{1,2}:\d{2}/.test(value)
}

function normalizeScheduleLabel(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/[｜|]/g, ' ')
    .replace(/\s*[-〜–—]\s*/gu, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseScheduleLine(line: string): { time: string; description?: string } {
  const normalizedLine = line.replace(/[｜|]/g, ' ')
  const timePattern = /^(\d{1,2}:\d{2}(?:\s*[-〜–—]\s*\d{1,2}:\d{2})?)\s*/
  const match = timePattern.exec(normalizedLine)
  if (!match) return { time: normalizeScheduleLabel(normalizedLine) }
  const time = normalizeScheduleLabel(match[1])
  const rest = normalizedLine.slice(match[0].length).trim()
  return { time, description: rest || undefined }
}

function parseScheduleRange(value: string): { start: number; end: number } | null {
  const normalized = value.replace(/[｜|]/g, ' ')
  const match = /^(\d{1,2}):(\d{2})(?:\s*[-〜–—]\s*(\d{1,2}):(\d{2}))?/.exec(normalized)
  if (!match) return null
  const start = Number(match[1]) * 60 + Number(match[2])
  const end = match[3] && match[4] ? Number(match[3]) * 60 + Number(match[4]) : start
  return { start, end }
}

function isNestedSchedule(parentTime: string, childLine: string): boolean {
  const parent = parseScheduleRange(parentTime)
  const child = parseScheduleRange(childLine)
  if (!parent || !child) return false
  if (parent.start === child.start && parent.end === child.end) return false
  return child.start >= parent.start && child.end <= parent.end
}

function collectNestedScheduleDetail(segments: string[], startIndex: number): { text: string; nextIndex: number } {
  const lines = [normalizeScheduleLabel(segments[startIndex])]
  let index = startIndex + 1
  while (index < segments.length) {
    const peek = segments[index]
    const normalizedPeek = normalizeHeadingText(peek)
    if (SUMMARY_SECTION_HEADINGS.has(normalizedPeek) || SUMMARY_SKIP_HEADINGS.has(normalizedPeek) || isScheduleLine(peek) || peek.startsWith('## ')) break
    lines.push(peek)
    index += 1
  }
  return { text: lines.join('\n'), nextIndex: index }
}

function collectKeyValueRows(segments: string[], startIndex: number): { rows: Array<{ key: string; value: string }>; nextIndex: number } {
  const rows: Array<{ key: string; value: string }> = []
  let index = startIndex
  while (index < segments.length) {
    const key = segments[index]
    const normalizedKey = normalizeHeadingText(key)
    if (SUMMARY_SECTION_HEADINGS.has(normalizedKey) || isScheduleLine(key) || isBulletLine(key) || isLikelyUrl(key) || isNoteLine(key)) break
    if (SUMMARY_SKIP_HEADINGS.has(normalizedKey)) { index += 1; continue }
    const value = segments[index + 1]
    if (!value) break
    const normalizedValue = normalizeHeadingText(value)
    if (SUMMARY_SECTION_HEADINGS.has(normalizedValue) || SUMMARY_SKIP_HEADINGS.has(normalizedValue) || isScheduleLine(value)) break
    rows.push({ key, value })
    index += 2
  }
  return { rows, nextIndex: index }
}

function isBulletLine(value: string): boolean {
  return /^[-*・◆■●▶︎]\s*/.test(value)
}

function stripBullet(value: string | undefined | null): string {
  return String(value ?? '').replace(/^[-*・◆■●▶︎]\s*/, '').trim()
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function isNoteLine(value: string): boolean {
  return /^※/.test(value)
}

function isTabularLine(value: string): boolean {
  return value.includes('\t')
}

function collectTableBlock(segments: string[], startIndex: number): { headers: string[]; rows: string[][]; nextIndex: number } | null {
  const rows: string[][] = []
  let index = startIndex
  while (index < segments.length && isTabularLine(segments[index])) {
    const cells = segments[index].split('\t').map((cell) => cell.trim()).filter(Boolean)
    if (cells.length >= 2) rows.push(cells)
    index += 1
  }
  if (rows.length < 2) return null
  const [headers, ...body] = rows
  return { headers, rows: body, nextIndex: index }
}

function detectInlineHeaders(value: string): string[] | null {
  if (value.includes('\t')) return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized === '時間 発表者 内容') return ['時間', '発表者', '内容']
  if (normalized === '時間 内容') return ['時間', '内容']
  if (normalized === '項目 内容') return ['項目', '内容']
  return null
}

function buildSummaryBlocks(summary: string | undefined | null): SummaryBlock[] {
  const segments = String(summary ?? '').split(/\n+/).map((segment) => segment.trim()).filter(Boolean)
  const blocks: SummaryBlock[] = []
  let index = 0
  let pendingScheduleHeaders: string[] = []

  while (index < segments.length) {
    const current = segments[index]
    const headingText = normalizeHeadingText(current)

    // Markdown-style heading marker from stripHtml (## prefix)
    if (current.startsWith('## ')) {
      const text = normalizeHeadingText(current.slice(3))
      if (text && !SUMMARY_SKIP_HEADINGS.has(text)) {
        blocks.push({ type: 'heading', text })
        pendingScheduleHeaders = []
      }
      index += 1
      continue
    }

    if (SUMMARY_SKIP_HEADINGS.has(headingText)) {
      if (SCHEDULE_HEADER_CANDIDATES.has(headingText) && !pendingScheduleHeaders.includes(headingText)) {
        pendingScheduleHeaders.push(headingText)
      }
      index += 1
      continue
    }

    const inlineHeaders = detectInlineHeaders(current)
    if (inlineHeaders) {
      pendingScheduleHeaders = inlineHeaders
      index += 1
      continue
    }

    if (isTableHeaderLine(current)) {
      index += 1
      continue
    }

    if (isTabularLine(current)) {
      const table = collectTableBlock(segments, index)
      if (table) {
        blocks.push({ type: 'table', headers: table.headers, rows: table.rows })
        index = table.nextIndex
        pendingScheduleHeaders = []
        continue
      }
    }

    if (SUMMARY_SECTION_HEADINGS.has(headingText)) {
      blocks.push({ type: 'heading', text: headingText })
      pendingScheduleHeaders = []
      index += 1
      if (headingText === '開催概要') {
        const table = collectKeyValueRows(segments, index)
        if (table.rows.length > 0) {
          blocks.push({ type: 'keyValue', rows: table.rows })
          index = table.nextIndex
        }
      }
      continue
    }

    if (isScheduleLine(current)) {
      const entries: Array<{ time: string; speaker?: string; description?: string; details: string[] }> = []
      while (index < segments.length && isScheduleLine(segments[index])) {
        const parsed = parseScheduleLine(segments[index])
        index += 1
        const entry = { time: parsed.time, speaker: undefined as string | undefined, description: parsed.description, details: [] as string[] }

        while (index < segments.length) {
          const peek = segments[index]
          const normalizedPeek = normalizeHeadingText(peek)
          if (SUMMARY_SECTION_HEADINGS.has(normalizedPeek) || SUMMARY_SKIP_HEADINGS.has(normalizedPeek) || peek.startsWith('## ')) break
          if (isScheduleLine(peek)) {
            if (isNestedSchedule(entry.time, peek)) {
              const nested = collectNestedScheduleDetail(segments, index)
              entry.details.push(nested.text)
              index = nested.nextIndex
              continue
            }
            break
          }
          if (isBulletLine(peek)) { entry.details.push(stripBullet(peek)); index += 1; continue }
          if (isNoteLine(peek)) { entry.details.push(peek); index += 1; continue }
          if (!entry.description) { entry.description = peek; index += 1; continue }
          if (!entry.speaker && pendingScheduleHeaders.includes('発表者')) {
            entry.speaker = entry.description
            entry.description = peek
            index += 1
            continue
          }
          entry.details.push(peek)
          index += 1
        }
        entries.push(entry)
      }
      if (entries.length > 0) {
        blocks.push({ type: 'schedule', entries, headers: pendingScheduleHeaders.length > 0 ? pendingScheduleHeaders.slice(0, 3) : undefined })
      }
      pendingScheduleHeaders = []
      continue
    }

    if (isBulletLine(current)) {
      const items: string[] = []
      while (index < segments.length && isBulletLine(segments[index])) {
        items.push(stripBullet(segments[index]))
        index += 1
      }
      blocks.push({ type: 'list', items })
      pendingScheduleHeaders = []
      continue
    }

    if (isNoteLine(current)) {
      blocks.push({ type: 'note', text: current })
      pendingScheduleHeaders = []
      index += 1
      continue
    }

    if (isLikelyUrl(current)) {
      blocks.push({ type: 'link', href: current })
      pendingScheduleHeaders = []
      index += 1
      continue
    }

    blocks.push({ type: 'paragraph', text: current })
    pendingScheduleHeaders = []
    index += 1
  }

  return blocks
}

// --- Helpers ---

type ConnpassEvent = {
  id: number
  title: string
  catch: string
  description: string
  event_url: string
  image_url?: string
  hash_tag: string
  started_at: string
  ended_at: string
  limit?: number
  accepted: number
  waiting: number
  owner_nickname: string
  owner_display_name: string
  place?: string
  address?: string
  lat?: number
  lon?: number
  series?: { id?: number; title?: string; url?: string }
  updated_at: string
}

function resolveEnvPath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(currentDir, '../../../.env')
}

function readConnpassApiKey(envPath: string): string {
  const content = fs.readFileSync(envPath, 'utf8')
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith('CONNPASS_API_KEY='))
  if (!line) throw new Error(`CONNPASS_API_KEY is not set in ${envPath}`)
  return line.slice('CONNPASS_API_KEY='.length).trim()
}

function fetchJson(url: string, apiKey: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'X-API-Key': apiKey, 'User-Agent': 'connpass-ui-repro-format-event' },
    }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => { resolve({ status: res.statusCode ?? 0, body }) })
    })
    req.on('error', reject)
  })
}

async function fetchEvent(apiKey: string, eventId: string): Promise<ConnpassEvent> {
  const url = `https://connpass.com/api/v2/events/?${new URLSearchParams({ event_id: eventId, count: '1' }).toString()}`
  const response = await fetchJson(url, apiKey)
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
  const body = JSON.parse(response.body) as { events?: ConnpassEvent[] }
  const event = body.events?.[0]
  if (!event) throw new Error(`No event found for event_id=${eventId}`)
  return event
}

async function main(): Promise<void> {
  const envPath = resolveEnvPath()
  const apiKey = readConnpassApiKey(envPath)

  // Test with multiple event IDs
  const eventIds = process.argv.slice(2)
  if (eventIds.length === 0) {
    eventIds.push('388144') // LiveView JP event from screenshot
  }

  for (const eventId of eventIds) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Event ID: ${eventId}`)
    console.log('='.repeat(80))

    const event = await fetchEvent(apiKey, eventId)
    console.log(`Title: ${event.title}`)

    // Show raw HTML description (first 500 chars)
    console.log(`\n--- Raw HTML (first 2000 chars) ---`)
    console.log(event.description.slice(0, 2000))

    // Show sanitized text
    const sanitized = sanitizeRichText(event.description)
    console.log(`\n--- Sanitized text ---`)
    console.log(sanitized)

    // Show summary blocks
    const blocks = buildSummaryBlocks(sanitized)
    console.log(`\n--- Summary blocks (${blocks.length}) ---`)
    for (const [i, block] of blocks.entries()) {
      console.log(`\n[${i}] type=${block.type}`)
      if (block.type === 'heading') console.log(`  text: ${block.text}`)
      if (block.type === 'paragraph') console.log(`  text: ${block.text}`)
      if (block.type === 'list') block.items.forEach((item, j) => console.log(`  [${j}] ${item}`))
      if (block.type === 'link') console.log(`  href: ${block.href}`)
      if (block.type === 'note') console.log(`  text: ${block.text}`)
      if (block.type === 'keyValue') block.rows.forEach((row) => console.log(`  ${row.key}: ${row.value}`))
      if (block.type === 'table') {
        console.log(`  headers: ${JSON.stringify(block.headers)}`)
        block.rows.forEach((row) => console.log(`  row: ${JSON.stringify(row)}`))
      }
      if (block.type === 'schedule') {
        console.log(`  headers: ${JSON.stringify(block.headers)}`)
        block.entries.forEach((entry) => {
          console.log(`  ${entry.time} | speaker=${entry.speaker ?? '(none)'} | desc=${entry.description ?? '(none)'}`)
          entry.details.forEach((d) => console.log(`    detail: ${d}`))
        })
      }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
