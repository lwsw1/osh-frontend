export const BOOK_LEVEL_OPTIONS = Object.freeze([
  { label: '免费', value: 0 },
  { label: '小班专属', value: 1 },
  { label: '付费', value: 2 },
  { label: 'VIP', value: 3 },
  { label: '内部', value: 4 },
])

export const BOOK_LEVEL_FILTER_OPTIONS = Object.freeze([
  { label: '全部', value: 'all' },
  ...BOOK_LEVEL_OPTIONS,
])

const BOOK_LEVEL_LABELS = new Map(
  BOOK_LEVEL_OPTIONS.map((option) => [option.value, option.label])
)

export function bookLevelLabel(level) {
  const normalizedLevel = Number(level ?? 0)
  return BOOK_LEVEL_LABELS.get(normalizedLevel) || `等级 ${normalizedLevel}`
}
