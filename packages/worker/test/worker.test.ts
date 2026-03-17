import { beforeEach, describe, expect, it } from 'vitest';
import { app, type Env } from '../src/index';

class MemoryKv {
  private store = new Map<string, string>();

  async get(key: string, type?: 'text' | 'json') {
    const value = this.store.get(key);
    if (!value) {
      return null;
    }
    if (type === 'json') {
      return JSON.parse(value);
    }
    return value;
  }

  async put(key: string, value: string) {
    this.store.set(key, value);
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, '0')).join('');
}

async function login(env: Env): Promise<string> {
  const response = await app.request(
    'https://example.com/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'secret' }),
      headers: { 'content-type': 'application/json' }
    },
    env
  );
  return response.headers.get('set-cookie') || '';
}

describe('worker behaviors', () => {
  let env: Env;

  beforeEach(async () => {
    env = {
      APP_KV: new MemoryKv() as unknown as KVNamespace,
      CACHE_KV: new MemoryKv() as unknown as KVNamespace,
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD_HASH: await sha256Hex('secret'),
      SUB_TOKEN: 'token-123',
      AGGREGATE_TTL_SECONDS: '3600',
      MAX_LOG_ENTRIES: '200'
    };
  });

  it('redirects plain http requests to https', async () => {
    const response = await app.request('http://example.com/health', undefined, env);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://example.com/health');
  });

  it('keeps sub endpoint protected by token', async () => {
    const response = await app.request('https://example.com/sub?bad-token', undefined, env);
    expect(response.status).toBe(401);
  });

  it('returns https links from sub info', async () => {
    const cookie = await login(env);
    expect(cookie).toBeTruthy();

    const response = await app.request(
      'https://example.com/api/sub/info',
      {
        headers: { cookie: cookie || '' }
      },
      env
    );
    const data = (await response.json()) as { formats: Array<{ url: string }> };
    expect(response.status).toBe(200);
    expect(data.formats.every((format) => format.url.startsWith('https://'))).toBe(true);
  });

  it('reorders sources through the dedicated route', async () => {
    const cookie = await login(env);

    const createSource = async (name: string) =>
      app.request(
        'https://example.com/api/sources',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie
          },
          body: JSON.stringify({
            name,
            content: 'vmess://eyJ2IjoiMiIsInBzIjoiVGVzdCIsImFkZCI6ImV4YW1wbGUuY29tIiwicG9ydCI6IjQ0MyIsImlkIjoiMTExMTExMTEtMTExMS0xMTExLTExMTEtMTExMTExMTExMTExIiwiYWlkIjoiMCIsInNjeSI6ImF1dG8iLCJuZXQiOiJ3cyIsInR5cGUiOiJub25lIiwiaG9zdCI6ImV4YW1wbGUuY29tIiwicGF0aCI6Ii8iLCJ0bHMiOiJ0bHMiLCJzbmkiOiJleGFtcGxlLmNvbSJ9'
          })
        },
        env
      );

    const firstResponse = await createSource('源 A');
    const secondResponse = await createSource('源 B');
    const firstData = (await firstResponse.json()) as { source: { id: string } };
    const secondData = (await secondResponse.json()) as { source: { id: string } };

    const reorderResponse = await app.request(
      'https://example.com/api/sources/reorder',
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie
        },
        body: JSON.stringify({ ids: [secondData.source.id, firstData.source.id] })
      },
      env
    );

    expect(reorderResponse.status).toBe(200);

    const listResponse = await app.request(
      'https://example.com/api/sources',
      {
        headers: { cookie }
      },
      env
    );
    const listData = (await listResponse.json()) as { sources: Array<{ id: string }> };
    expect(listData.sources.map((source) => source.id)).toEqual([secondData.source.id, firstData.source.id]);
  });
});
