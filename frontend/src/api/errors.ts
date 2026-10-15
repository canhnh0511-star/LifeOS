/** Error codes shared by the mock and HTTP adapters. See docs/API_CONTRACT.md. */
export const ErrorCode = {
  validation: 'VALIDATION_FAILED',
  notFound: 'NOT_FOUND',
  questInFuture: 'QUEST_IN_FUTURE',
  questTooOld: 'QUEST_TOO_OLD',
  questOutsideSchedule: 'QUEST_OUTSIDE_SCHEDULE',
  questNotActive: 'QUEST_NOT_ACTIVE',
  bossLocked: 'BOSS_LOCKED',
  unauthenticated: 'UNAUTHENTICATED',
  http: 'HTTP_ERROR',
  network: 'NETWORK_ERROR',
  timeout: 'REQUEST_TIMEOUT'
} as const;

/** `status` is the HTTP status (0 when no response was received). `fields` maps request field names to messages. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
  }
}
