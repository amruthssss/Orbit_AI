/** React hook for one-shot API requests. */
import { useCallback, useState } from "react";

export function useApi<T>(operation: () => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const execute = useCallback(async (): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      const next = caught instanceof Error ? caught : new Error("Request failed");
      setError(next);
      throw next;
    } finally {
      setLoading(false);
    }
  }, [operation]);
  return { execute, loading, error };
}
