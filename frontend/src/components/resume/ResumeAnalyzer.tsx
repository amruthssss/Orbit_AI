/** Presentational seam for resume analysis results. */
export function ResumeAnalyzer({ score }: { score?: number }) {
  return <section aria-label="Resume analyzer"><h2>Resume lab</h2>{score !== undefined && <p>Score: {score}</p>}</section>;
}
