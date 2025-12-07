import type { SuggestionItem } from '../core/prompts';

export function buildJqlFromQuery(q: string): string {
  let s = (q || '').trim().replace(/^(issue(key|type|id|number)?\s*:)\s*/i, '');
  if (!s) {return 'ORDER BY updated DESC';}

  const up = s.toUpperCase();

  const mExact = up.match(/^([A-Z][A-Z0-9]+)-(\d+)$/);
  if (mExact) {
    return `issueKey = ${mExact[1]}-${mExact[2]} ORDER BY updated DESC`;
  }

  const mPrefixNum = up.match(/^([A-Z][A-Z0-9]+)-(\d*)$/);
  if (mPrefixNum) {
    const proj = mPrefixNum[1];
    const digits = mPrefixNum[2];
    if (digits === '') {return `project = ${proj} ORDER BY updated DESC`;}
    const n = Number(digits);
    const next = (n + 1).toString();
    return `issueKey >= ${proj}-${n} AND issueKey < ${proj}-${next} ORDER BY issueKey ASC`;
  }

  const mProjOnly = up.match(/^([A-Z][A-Z0-9]+)$/);
  if (mProjOnly) {return `project = ${mProjOnly[1]} ORDER BY updated DESC`;}

  return `text ~ "${up.replace(/"/g, '\\"')}" ORDER BY updated DESC`;
}

export const searchForIssue = async ({
  query, cursor, options, fetchFn, authHeader, signal,
}: {
  query: string;
  cursor?: string;
  options: Record<string, unknown>;
  fetchFn: (input: string | URL, init?: RequestInit) => Promise<Response>;
  authHeader: () => string;
  signal?: AbortSignal;
}): Promise<{ items: SuggestionItem[]; nextCursor?: string }> => {
  const raw = (options['jira.domain'] || '').toString().trim();
  const host = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const url = `https://${host}/rest/api/3/search/jql`;

  const jql = buildJqlFromQuery(query);
  const body: any = {
    jql,
    fields: ['key', 'summary', 'issuetype', 'project'],
  };
  if (cursor) {body.cursor = cursor;}

  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {return { items: [], nextCursor: undefined };}

  const data = await res.json() as {
    issues?: Array<{ key: string; fields: { summary?: string } }>;
    nextPage?: string;
    isLast?: boolean;
  };

  const items: SuggestionItem[] = (data.issues || []).map(iss => ({
    id: iss.key,
    title: iss.key,
    description: iss.fields?.summary ?? '(no summary)',
    raw: iss,
  }));

  return { items, nextCursor: data.nextPage };
};
