// Prints question-bank coverage per objective against the PLAN.md targets, with
// the mix of item kinds. Run: npm run content:status
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { OBJECTIVES, questionTarget } from '../src/content/blueprint.ts'

const dir = join(import.meta.dirname, '../src/content/questions')
const kinds = new Map<string, Record<string, number>>()
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  for (const item of JSON.parse(readFileSync(join(dir, file), 'utf8')) as { objectiveId: string; kind: string }[]) {
    const k = kinds.get(item.objectiveId) ?? {}
    k[item.kind] = (k[item.kind] ?? 0) + 1
    kinds.set(item.objectiveId, k)
  }
}

let have = 0
let want = 0
let section = ''
for (const o of OBJECTIVES) {
  if (o.sectionId !== section) {
    section = o.sectionId
    console.log(`\n${section === 'x' ? 'PCEP-30-02 extras' : `Section ${section}`}`)
  }
  const k = kinds.get(o.id) ?? {}
  const n = Object.values(k).reduce((a, b) => a + b, 0)
  const target = questionTarget(o)
  have += Math.min(n, target)
  want += target
  const mix = Object.entries(k)
    .map(([kind, c]) => `${kind} ${c}`)
    .join(', ')
  console.log(`  ${n >= target ? '✓' : ' '} ${o.id.padEnd(6)} ${String(n).padStart(2)} / ${target}  ${mix}`)
}
console.log(`\nQuestions: ${have} / ${want} (${Math.round((have / want) * 100)}%)`)
