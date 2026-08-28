/** Presentational seam for operational metrics. */
export function MetricsPanel({ metrics }: { metrics: Record<string, number> }) {
  return <section aria-label="Metrics"><h2>Analytics</h2>{Object.entries(metrics).map(([name, value]) => <p key={name}>{name}: {value}</p>)}</section>;
}
