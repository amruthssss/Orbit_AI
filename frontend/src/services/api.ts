/** Typed fetch boundary for browser-to-backend calls. */
import type { ApiError } from "../types";

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.detail ?? "Request failed");
  }
  return (await response.json()) as T;
}
