/** Presentation helpers that do not depend on React. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}
