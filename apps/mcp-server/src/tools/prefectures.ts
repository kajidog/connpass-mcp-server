import { getAllPrefectures, normalizePrefecture } from '@kajidog/connpass-api-client'
import { z } from 'zod'
import type { ToolDeps } from './utils/types.js'
import { registerAppToolIfEnabled } from './utils/registration.js'

const EmptyInputSchema = z.object({})

function buildPrefectureListResult(invalid: string[] = []) {
  const prefectures = getAllPrefectures()
  const payload = {
    invalid,
    prefectures,
  }

  const invalidText = invalid.length > 0
    ? `指定された都道府県が見つかりません: ${invalid.join(', ')}\n`
    : ''

  return {
    content: [
      {
        type: 'text' as const,
        text: `${invalidText}利用可能な都道府県一覧: ${prefectures.map((item) => `${item.name} (${item.code})`).join(', ')}`,
      },
    ],
    structuredContent: {
      kind: 'prefectures',
      data: payload,
    },
  }
}

export function resolvePrefectureInputs(
  values?: string | string[],
): { prefectures?: string[] } | { response: ReturnType<typeof buildPrefectureListResult> } {
  if (!values) return {}

  const inputs = Array.isArray(values) ? values : [values]
  const prefectures: string[] = []
  const invalid: string[] = []

  for (const value of inputs) {
    const normalized = normalizePrefecture(value)
    if (!normalized) {
      invalid.push(value)
      continue
    }
    prefectures.push(normalized)
  }

  if (invalid.length > 0) {
    return { response: buildPrefectureListResult(invalid) }
  }

  return { prefectures }
}

export function registerPrefectureTools(deps: ToolDeps): void {
  const { server } = deps

  registerAppToolIfEnabled(server, 'list_prefectures', {
    title: 'List Prefectures',
    description: 'List supported prefectures and region codes for filtering',
    inputSchema: EmptyInputSchema,
  }, async () => buildPrefectureListResult())

  registerAppToolIfEnabled(server, '_get_prefectures', {
    title: 'Get Prefectures (UI)',
    description: 'Internal: list supported prefectures for the UI',
    inputSchema: EmptyInputSchema,
    _meta: {
      ui: {
        visibility: ['app'],
      },
    },
  }, async () => buildPrefectureListResult())
}
