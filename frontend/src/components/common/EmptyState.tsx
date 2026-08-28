/** Reusable empty-state presentation component. */
interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return <div role="status"><strong>{title}</strong>{description && <p>{description}</p>}</div>;
}
