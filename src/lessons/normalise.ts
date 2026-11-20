/** Compares printed output loosely: trailing spaces and blank lines don't matter. */
export const normaliseOutput = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim()
