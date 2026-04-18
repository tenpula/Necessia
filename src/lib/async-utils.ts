export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getExponentialBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number = Number.POSITIVE_INFINITY
): number {
  return Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
}
