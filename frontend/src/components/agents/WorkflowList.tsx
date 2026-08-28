/** Presentational seam for agent workflows. */
export function WorkflowList({ workflows }: { workflows: string[] }) {
  return <section aria-label="Workflows"><h2>Agents and workflows</h2><ul>{workflows.map((workflow) => <li key={workflow}>{workflow}</li>)}</ul></section>;
}
