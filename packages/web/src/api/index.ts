export interface Source {
  id: string;
  name: string;
  content: string;
  nodeCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarningItem {
  code: string;
  message: string;
  context?: string;
}

export interface ValidationResult {
  valid: boolean;
  urlCount: number;
  nodeCount: number;
  totalCount: number;
  duplicateCount: number;
  warnings: WarningItem[];
}

export interface SubFormat {
  name: string;
  key: string;
  url: string;
}

export interface SubInfo {
  formats: SubFormat[];
  totalNodes: number;
  lastAggregateTime: string;
  cacheStatus: string;
  lastRefreshTime: string;
  lastRefreshError: string;
  warningCount: number;
}

export interface LogRecord {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

async function request<T>(url: string, options?: RequestInit & { skipAuthRedirect?: boolean }): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (response.status === 401 && !options?.skipAuthRedirect) {
    window.location.href = '/login';
  }
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<{ success: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuthRedirect: true
    }),
  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST'
    }),
  check: () => request<{ authenticated: boolean }>('/api/auth/check', { skipAuthRedirect: true })
};

export const sourcesApi = {
  getAll: () => request<{ sources: Source[]; lastSaveTime: string }>('/api/sources'),
  getById: (id: string) => request<Source>(`/api/sources/${id}`),
  validate: (content: string) =>
    request<ValidationResult>('/api/sources/validate', {
      method: 'POST',
      body: JSON.stringify({ content })
    }),
  create: (name: string, content: string) =>
    request<{ source: Source; lastSaveTime: string }>('/api/sources', {
      method: 'POST',
      body: JSON.stringify({ name, content })
    }),
  update: (id: string, data: { name?: string; content?: string }) =>
    request<{ source: Source; lastSaveTime: string }>(`/api/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: string) =>
    request<{ success: boolean; lastSaveTime: string }>(`/api/sources/${id}`, {
      method: 'DELETE'
    }),
  reorder: (ids: string[]) =>
    request<{ success: boolean; lastSaveTime: string }>('/api/sources/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids })
    }),
  refresh: () =>
    request<{ sources: Source[]; lastSaveTime: string }>('/api/sources/refresh', {
      method: 'POST'
    })
};

export const subApi = {
  getInfo: () => request<SubInfo>('/api/sub/info')
};

export const logsApi = {
  getRecent: (limit = 50) => request<{ logs: LogRecord[] }>(`/api/logs?limit=${limit}`)
};
