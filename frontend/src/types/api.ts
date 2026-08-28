/** Small API contracts kept independent from page components. */
export interface HealthResponse {
  status: string;
  environment?: string;
}

export interface ApiError {
  detail?: string;
}
