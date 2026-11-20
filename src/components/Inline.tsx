/** Renders text with `backtick` spans as inline code. Used for stems, titles and rationales. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <code key={i} className="rounded bg-slate-100 px-1 font-mono text-[0.9em] normal-case">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}

/** A read-only block of Python. */
export function CodeBlock({ code, children }: { code?: string; children?: React.ReactNode }) {
  return (
    <pre className="rounded-lg bg-code p-4 font-mono text-sm leading-relaxed text-[#e6edf3]">
      {children ?? code}
    </pre>
  )
}
