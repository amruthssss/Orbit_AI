/** Presentational seam for research output. */
export function ResearchBrief({ question }: { question: string }) {
  return <section aria-label="Research brief"><h2>Research</h2><p>{question}</p></section>;
}
