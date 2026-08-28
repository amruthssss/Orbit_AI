/** Presentational seam for evaluation summaries. */
export function EvaluationSummary({ score }: { score: number }) {
  return <section aria-label="Evaluation summary"><h2>Evaluations</h2><p>{score.toFixed(2)}</p></section>;
}
