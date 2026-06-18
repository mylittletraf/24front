/** Normalized API error carrying the HTTP status and parsed body. */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly retryAfter?: number;

  constructor(status: number, message: string, data: unknown = null, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

/** Pull a human-readable message out of a DRF error body. */
export function extractApiMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return null;
}
