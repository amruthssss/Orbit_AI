/** Presentational seam for generated content. */
export function ContentEditor({ value = "" }: { value?: string }) {
  return <section aria-label="Content editor"><h2>Content studio</h2><p>{value}</p></section>;
}
