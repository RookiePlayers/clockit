import { NotionSink } from '../src/sinks/notion.sink';
import type { TimeSinkConfig } from '../src/core/sink';
import type { Session } from '../src/core/types';

type MockResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json?: () => Promise<any>;
};

function okJson(obj: any = {}): MockResponse {
  return { ok: true, status: 200, text: async () => JSON.stringify(obj), json: async () => obj };
}
function createdJson(obj: any = {}): MockResponse {
  return { ok: true, status: 200, text: async () => JSON.stringify(obj), json: async () => obj };
}
function fail(status = 401, body = 'Unauthorized'): MockResponse {
  return { ok: false, status, text: async () => body };
}

/** Queue-style fetch: first call returns first response, etc. */
function makeFetch(...responses: MockResponse[]) {
  const fn = jest.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  return fn as jest.Mock;
}

function makeCfg(overrides?: Partial<TimeSinkConfig['options']>): TimeSinkConfig {
  return {
    kind: 'notion',
    enabled: true,
    options: {
      'notion.apiToken': 'secret_test_token',
      'notion.destination': 'database:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      ...overrides,
    },
  };
}

function makeSession(overrides?: Partial<Session>): Session {
  return {
    startedIso: '2025-01-01T00:00:00.000Z',
    endedIso: '2025-01-01T00:15:00.000Z',
    durationSeconds: 900,
    workspace: 'ws',
    repoPath: '/repo',
    branch: 'feature/TP-123',
    issueKey: 'TP-123',
    comment: 'Worked on login',
    meta: {},
    ...overrides,
  };
}

describe('NotionSink', () => {
  test('database → creates page with properties (happy path)', async () => {
    // 1) GET database schema
    const dbSchema = okJson({
      properties: {
        Name: { type: 'title' },
        Duration: { type: 'number' },
      },
    });
    // 2) PATCH ensure properties
    const ensured = okJson({});
    // 3) POST /v1/pages create
    const created = createdJson({ id: 'new-page-id' });

    const fetch = makeFetch(dbSchema, ensured, created);
    const sink = new NotionSink(makeCfg(), fetch as any);

    const res = await sink.export(makeSession({ durationSeconds: 2700, comment: 'Big chunk' }));
    expect(res.ok).toBe(true);
    expect(String(res.message)).toMatch(/Notion/i);

    // call 1: GET database schema
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/https:\/\/api\.notion\.com\/v1\/databases\/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/),
      expect.objectContaining({ method: 'GET' })
    );

    // call 2: PATCH properties
    const [, initPatch] = (fetch as jest.Mock).mock.calls[1];
    expect(initPatch.method).toBe('PATCH');

    // call 3: POST page
    const [, init2] = (fetch as jest.Mock).mock.calls[2];
    expect(init2.method).toBe('POST');
    const body2 = JSON.parse(String(init2.body));
    expect(body2.parent.database_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(body2.properties).toBeTruthy();
    // Title should be under "Name"
    expect(body2.properties.Name.title[0].text.content).toBe('Big chunk');
    // Duration mapped from seconds
    expect(body2.properties.Duration.number).toBe(2700);
  });

  test('database → uses custom title property when schema title ≠ "Name"', async () => {
    const dbSchema = okJson({
      properties: {
        TitleX: { type: 'title' },
        SomethingElse: { type: 'number' },
      },
    });
    const ensured = okJson({});
    const created = createdJson({ id: 'page2' });
    const fetch = makeFetch(dbSchema, ensured, created);

    const sink = new NotionSink(makeCfg(), fetch as any);
    await sink.export(makeSession({ comment: 'Hello TitleX' }));

    const [, init2] = (fetch as jest.Mock).mock.calls[2];
    const body = JSON.parse(String(init2.body));
    expect(body.properties.TitleX.title[0].text.content).toBe('Hello TitleX');
  });

  test('page → appends blocks (happy path)', async () => {
    const cfg = makeCfg({ 'notion.destination': 'page:pppppppp-1111-2222-3333-444444444444' });

    // 1) GET page preflight
    const pagePre = okJson({ id: 'pppp' });
    // 2) PATCH children
    const appended = okJson({});

    const fetch = makeFetch(pagePre, appended);
    const sink = new NotionSink(cfg, fetch as any);

    const res = await sink.export(makeSession({ durationSeconds: 600, comment: 'Append test' }));
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);

    // PATCH children body contains our sentence
    const [, init2] = (fetch as jest.Mock).mock.calls[1];
    expect(init2.method).toBe('PATCH');
    const body = JSON.parse(String(init2.body));
    const txt = body.children?.[0]?.paragraph?.rich_text?.[0]?.text?.content || '';
    expect(txt).toMatch(/Append test/);
    expect(txt).toMatch(/10m/); // 600s → 10m
  });

  test('auth error → retryable (database preflight 401)', async () => {
    const fetch = makeFetch(fail(401, 'Nope'));
    const sink = new NotionSink(makeCfg(), fetch as any);

    const res = await sink.export(makeSession());
    expect(res.ok).toBe(false);
    expect(res.code).toBe('auth_error');
    expect(res.retryable).toBe(true);
    expect(res.field).toBe('notion.apiToken');
  });

  test('invalid destination → retryable (database preflight 404)', async () => {
    const fetch = makeFetch(fail(404, 'Missing'));
    const sink = new NotionSink(makeCfg(), fetch as any);

    const res = await sink.export(makeSession());
    expect(res.ok).toBe(false);
    expect(res.code).toBe('invalid_field');
    expect(res.retryable).toBe(true);
    expect(res.field).toBe('notion.destination');
  });

  test('missing token → retryable missing_field', async () => {
    const cfg = makeCfg({ 'notion.apiToken': '' });
    const fetch = makeFetch(); // should not be called
    const sink = new NotionSink(cfg, fetch as any);

    const res = await sink.export(makeSession());
    expect(res.ok).toBe(false);
    expect(res.code).toBe('missing_field');
    expect(res.field).toBe('notion.apiToken');
    expect(res.retryable).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('missing destination → retryable missing_field', async () => {
    const cfg = makeCfg({ 'notion.destination': '' });
    const fetch = makeFetch();
    const sink = new NotionSink(cfg, fetch as any);

    const res = await sink.export(makeSession());
    expect(res.ok).toBe(false);
    expect(res.code).toBe('missing_field');
    expect(res.field).toBe('notion.destination');
    expect(res.retryable).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('network error → graceful failure', async () => {
    const dbSchema = okJson({ properties: { Name: { type: 'title' } } });
    const ensured = okJson({});
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(dbSchema) // preflight ok
      .mockResolvedValueOnce(ensured)  // ensure properties ok
      .mockRejectedValueOnce(new Error('boom')); // POST fails

    const sink = new NotionSink(makeCfg(), fetch as any);
    const res = await sink.export(makeSession());
    expect(res.ok).toBe(false);
    expect(res.code).toBe('network_error');
  });
});
