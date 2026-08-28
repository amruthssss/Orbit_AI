/** Presentational knowledge document list. */
export interface DocumentSummary {
  id: string;
  name: string;
}

export function DocumentList({ documents }: { documents: DocumentSummary[] }) {
  return <ul>{documents.map((document) => <li key={document.id}>{document.name}</li>)}</ul>;
}
