import type { Question } from './types'

/**
 * Stratified random selection: equal draw between available COs.
 * If only one CO exists, draw entirely from it.
 */
export function generatePaper(
  questions: Question[],
  totalNeeded: number
): Question[] {
  // Group by CO
  const byCO = new Map<string, Question[]>()
  for (const q of questions) {
    const co = q.co || 'DEFAULT'
    if (!byCO.has(co)) byCO.set(co, [])
    byCO.get(co)!.push(q)
  }

  const cos = [...byCO.keys()]
  const perCO = Math.floor(totalNeeded / cos.length)
  const remainder = totalNeeded % cos.length

  const selected: Question[] = []

  for (let i = 0; i < cos.length; i++) {
    const pool = shuffle([...byCO.get(cos[i])!])
    const take = perCO + (i < remainder ? 1 : 0)
    selected.push(...pool.slice(0, take))
  }

  // If we still need more (pool was smaller than quota), fill from remaining
  if (selected.length < totalNeeded) {
    const selectedIds = new Set(selected.map(q => q.id))
    const remaining = shuffle(questions.filter(q => !selectedIds.has(q.id)))
    selected.push(...remaining.slice(0, totalNeeded - selected.length))
  }

  return shuffle(selected).slice(0, totalNeeded)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
