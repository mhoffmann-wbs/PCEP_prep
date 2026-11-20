import { EXAM_PROFILES, type ExamId, PCEP_30_02_SUNSET } from '../content/blueprint'
import { setExtras, setTrack, useProgress } from '../progress/store'

type Part = 'track' | 'practice' | 'mock'

const TRACK_NOTES: Record<ExamId, string> = {
  '30-03': 'The current exam. Recommended unless you already booked PCEP-30-02.',
  '30-02': `The previous exam, available until ${PCEP_30_02_SUNSET}. Adds six topics the new exam dropped, and leaves out sets, f-strings, *args/**kwargs and files and modules.`,
}

/**
 * The exam-track switch and the two "include 30-02 topics" toggles. Each screen
 * shows the parts that matter there; all of them change the same stored settings.
 */
export function ExamSettings({ parts }: { parts: Part[] }) {
  const { track, extrasInPractice, extrasInMock } = useProgress()
  const mockForced = track === '30-02'
  return (
    <div className="space-y-3">
      {parts.includes('track') && (
        <fieldset className="space-y-2">
          <legend className="font-semibold">Which exam are you preparing for?</legend>
          {(['30-03', '30-02'] as const).map((id) => (
            <label key={id} className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 ${track === id ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name="track" checked={track === id} onChange={() => setTrack(id)} className="mt-1 accent-brand" />
              <span>
                <span className="font-medium">{EXAM_PROFILES[id].name}</span>
                <span className="block text-sm text-slate-600">{TRACK_NOTES[id]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {parts.includes('practice') && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={extrasInPractice} onChange={(e) => setExtras('extrasInPractice', e.target.checked)} className="mt-1 accent-brand" />
          <span>
            Include PCEP-30-02 topics in practice
            <span className="block text-xs text-slate-500">Numeral systems, bitwise operators, loop else, list comprehensions, recursion and generators, the exception hierarchy.</span>
          </span>
        </label>
      )}
      {parts.includes('mock') && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={mockForced || extrasInMock}
            disabled={mockForced}
            onChange={(e) => setExtras('extrasInMock', e.target.checked)}
            className="mt-1 accent-brand"
          />
          <span>
            Include PCEP-30-02 topics in the mock exam
            <span className="block text-xs text-slate-500">
              {mockForced
                ? 'Always included in the PCEP-30-02 mock: these topics are part of that exam.'
                : 'Adds one question per extra topic, scored separately, with the time scaled to the real pace.'}
            </span>
          </span>
        </label>
      )}
    </div>
  )
}
