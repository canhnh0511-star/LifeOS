import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from './httpClient';
import { ApiError } from './errors';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try { await promise; } catch (e) { return e as ApiError; }
  throw new Error('expected promise to reject');
}

describe('httpClient errors', () => {
  it('turns an ApiError body into an ApiError with status, code and fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(422, { code: 'VALIDATION_FAILED', message: 'Sai dữ liệu', fields: { title: 'Bắt buộc' } })));
    const error = await failure(httpClient.createGoal({ title: '', category: 'CAREER', description: '' }));
    expect(error).toBeInstanceOf(ApiError);
    expect([error.status, error.code, error.message, error.fields]).toEqual([422, 'VALIDATION_FAILED', 'Sai dữ liệu', { title: 'Bắt buộc' }]);
  });
  it('maps 401 without a body to UNAUTHENTICATED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    const error = await failure(httpClient.getMe());
    expect([error.status, error.code]).toEqual([401, 'UNAUTHENTICATED']);
  });
  it('maps 429 to RATE_LIMITED and keeps the server wait message', async () => {
    const body = JSON.stringify({ code: 'RATE_LIMITED', message: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.', fields: {} });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 429, headers: { 'Retry-After': '900' } })));
    const error = await failure(httpClient.login({ email: 'a@b.co', password: 'x'.repeat(10) }));
    expect([error.status, error.code]).toEqual([429, 'RATE_LIMITED']);
    expect(error.message).toContain('15 phút');
  });
  it('maps a non-JSON failure to HTTP_ERROR and a network failure to NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));
    const bad = await failure(httpClient.getGoals());
    expect([bad.status, bad.code]).toEqual([502, 'HTTP_ERROR']);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const offline = await failure(httpClient.getGoals());
    expect([offline.status, offline.code]).toEqual([0, 'NETWORK_ERROR']);
  });
  it('aborts a hung request with REQUEST_TIMEOUT', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const pending = failure(httpClient.getGoals());
    await vi.advanceTimersByTimeAsync(20000);
    expect((await pending).code).toBe('REQUEST_TIMEOUT');
  });
});

describe('httpClient requests', () => {
  it('sends credentials, a JSON content type only with a body, and encodes dates', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json(200, {})));
    vi.stubGlobal('fetch', fetchMock);
    await httpClient.getDashboard('2026-10-14');
    await httpClient.completeQuest('h1', '2026-10-14');
    await httpClient.createGoal({ title: 't', category: 'CAREER', description: '' });
    const [dashboard, put, post] = fetchMock.mock.calls;
    expect(dashboard[0]).toBe('/api/v1/dashboard/today?date=2026-10-14');
    expect(dashboard[1].credentials).toBe('include');
    expect([put[0], put[1].method]).toEqual(['/api/v1/quests/h1/dates/2026-10-14/completion', 'PUT']);
    expect(put[1].headers['Content-Type']).toBeUndefined();
    expect(post[1].headers['Content-Type']).toBe('application/json');
  });
  it('keeps default headers when a caller passes extra ones', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    const { request } = await import('./httpClient');
    await request('/me', { headers: { 'X-Test': '1' } });
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ 'X-Test': '1' });
  });
  it('accepts an empty 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(httpClient.getMe()).resolves.toBeUndefined();
  });
});

describe('httpClient CSRF', () => {
  const cookie = (value: string) => vi.stubGlobal('document', { cookie: value });
  const lastHeaders = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls[0][1].headers as Record<string, string>;
  it('echoes the XSRF-TOKEN cookie in X-XSRF-TOKEN on mutations only', async () => {
    cookie('theme=dark; XSRF-TOKEN=abc%2B123');
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json(200, {})));
    vi.stubGlobal('fetch', fetchMock);
    await httpClient.login({ email: 'a@b.co', password: 'x' });
    expect(lastHeaders(fetchMock)['X-XSRF-TOKEN']).toBe('abc+123');
    fetchMock.mockClear();
    await httpClient.getMe();
    expect(lastHeaders(fetchMock)['X-XSRF-TOKEN']).toBeUndefined();
  });
  it('sends no CSRF header when the cookie is absent, and logout works with a 204', async () => {
    cookie('theme=dark');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(httpClient.logout()).resolves.toBeUndefined();
    expect(lastHeaders(fetchMock)['X-XSRF-TOKEN']).toBeUndefined();
  });
});
