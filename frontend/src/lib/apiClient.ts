// =========================================================================
// VyaraHR Native API Client
// Pure standard browser fetch client replacing @supabase/supabase-js
// Provides fluent query builder, JWT authentication, and local storage routing
// =========================================================================

export interface ApiUser {
  id: string;
  email: string;
  role?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at?: string;
}

export interface ApiSession {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user: ApiUser;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: ApiError | null;
  count?: number | null;
}

type AuthStateChangeCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: ApiSession | null) => void;

const authStateListeners: Set<AuthStateChangeCallback> = new Set();

export const notifyAuthStateChange = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: ApiSession | null) => {
  authStateListeners.forEach(cb => {
    try {
      cb(event, session);
    } catch (e) {
      console.error('Error in auth state listener:', e);
    }
  });
};

export class QueryBuilder<T = Record<string, any>[]> implements PromiseLike<ApiResponse<T>> {
  private url: string;
  private table: string;
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private headers: Record<string, string>;
  private bodyData: any = null;
  private isUpsert = false;
  private onConflictColumn?: string;
  private params: URLSearchParams = new URLSearchParams();
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(baseUrl: string, table: string, defaultHeaders: Record<string, string>) {
    this.url = `${baseUrl}/api/data/${table}`;
    this.table = table;
    this.headers = { ...defaultHeaders };
  }

  setHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this.params.set('select', columns);
    if (options?.count) {
      this.params.set('count', options.count);
    }
    if (options?.head) {
      this.params.set('head', 'true');
    }
    return this;
  }

  insert(values: any | any[]): this {
    this.method = 'POST';
    this.bodyData = values;
    this.isUpsert = false;
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string }): this {
    this.method = 'POST';
    this.bodyData = values;
    this.isUpsert = true;
    if (options?.onConflict) {
      this.onConflictColumn = options.onConflict;
    }
    return this;
  }

  update(values: any): this {
    this.method = 'PATCH';
    this.bodyData = values;
    return this;
  }

  delete(): this {
    this.method = 'DELETE';
    return this;
  }

  eq(column: string, value: any): this {
    this.params.append(`filter_${column}`, `eq.${value === null ? 'null' : value}`);
    return this;
  }

  neq(column: string, value: any): this {
    this.params.append(`filter_${column}`, `neq.${value === null ? 'null' : value}`);
    return this;
  }

  gt(column: string, value: any): this {
    this.params.append(`filter_${column}`, `gt.${value}`);
    return this;
  }

  gte(column: string, value: any): this {
    this.params.append(`filter_${column}`, `gte.${value}`);
    return this;
  }

  lt(column: string, value: any): this {
    this.params.append(`filter_${column}`, `lt.${value}`);
    return this;
  }

  lte(column: string, value: any): this {
    this.params.append(`filter_${column}`, `lte.${value}`);
    return this;
  }

  like(column: string, pattern: string): this {
    this.params.append(`filter_${column}`, `like.${pattern}`);
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.params.append(`filter_${column}`, `ilike.${pattern}`);
    return this;
  }

  is(column: string, value: any): this {
    this.params.append(`filter_${column}`, `is.${value === null ? 'null' : value}`);
    return this;
  }

  in(column: string, values: any[]): this {
    const list = values.join(',');
    this.params.append(`filter_${column}`, `in.(${list})`);
    return this;
  }

  not(column: string, operator: string, value: any): this {
    this.params.append(`filter_${column}`, `not.${operator}.${value}`);
    return this;
  }

  filter(column: string, operator: string, value: any): this {
    this.params.append(`filter_${column}`, `${operator}.${value}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.params.append('order', `${column}.${direction}`);
    return this;
  }

  limit(count: number): this {
    this.params.set('limit', String(count));
    return this;
  }

  range(from: number, to: number): this {
    this.params.set('offset', String(from));
    this.params.set('limit', String(to - from + 1));
    return this;
  }

  single<TResult = Record<string, any>>(): QueryBuilder<TResult> {
    this.isSingle = true;
    this.params.set('limit', '1');
    return this as unknown as QueryBuilder<TResult>;
  }

  maybeSingle<TResult = Record<string, any>>(): QueryBuilder<TResult> {
    this.isMaybeSingle = true;
    this.params.set('limit', '1');
    return this as unknown as QueryBuilder<TResult>;
  }

  async execute(): Promise<ApiResponse<T>> {
    try {
      if (this.isUpsert) {
        this.params.set('upsert', 'true');
        if (this.onConflictColumn) {
          this.params.set('on_conflict', this.onConflictColumn);
        }
      }

      const queryString = this.params.toString();
      const requestUrl = queryString ? `${this.url}?${queryString}` : this.url;

      const fetchOptions: RequestInit = {
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
      };

      if (this.bodyData !== null && (this.method === 'POST' || this.method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(this.bodyData);
      }

      const response = await fetch(requestUrl, fetchOptions);
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: json?.error || json?.message || `Request failed with status ${response.status}`,
            code: json?.code || String(response.status),
            status: response.status,
          },
        };
      }

      let data = json?.data !== undefined ? json.data : json;

      if (this.isSingle) {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116', status: 404 },
          };
        }
        if (Array.isArray(data)) {
          data = data[0];
        }
      } else if (this.isMaybeSingle) {
        if (Array.isArray(data)) {
          data = data.length > 0 ? data[0] : null;
        }
      }

      let count: number | null = null;
      if (json?.count !== undefined && json?.count !== null) {
        count = Number(json.count);
      } else if (Array.isArray(data)) {
        count = data.length;
      }

      return { data, error: null, count };
    } catch (err: any) {
      return {
        data: null,
        error: {
          message: err?.message || 'Network request failed',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  then<TResult1 = ApiResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export class NativeApiClient {
  private baseUrl: string;
  private defaultWorkspaceSlug: string | null;
  private isPlatformClient: boolean;

  constructor(options?: { baseUrl?: string; workspaceSlug?: string; isPlatform?: boolean }) {
    // Determine API Base URL
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    let url = options?.baseUrl || envApiUrl;

    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      const port = window.location.port;
      const isLocalDevServer = (hostname === 'localhost' || hostname === '127.0.0.1') && (port === '5173' || port === '5174');

      if (isLocalDevServer) {
        // Local Vite dev server routes to backend API port
        url = url || 'http://127.0.0.1:3000';
      } else {
        // Production / Hostinger: unified server serves API on the same domain and origin
        url = window.location.origin || '';
      }
    } else {
      url = url || '';
    }

    this.baseUrl = url ? url.replace(/\/$/, '') : '';
    this.defaultWorkspaceSlug = options?.workspaceSlug || null;
    this.isPlatformClient = !!options?.isPlatform;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vyara_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let slug = this.defaultWorkspaceSlug;
      if (!slug) {
        slug = localStorage.getItem('selected_tenant_slug');
      }
      if (slug) {
        headers['x-workspace-slug'] = slug.trim();
      }

      if (this.isPlatformClient) {
        headers['x-is-platform'] = 'true';
      }
    }

    return headers;
  }

  forTenant(slug: string): NativeApiClient {
    return new NativeApiClient({
      baseUrl: this.baseUrl,
      workspaceSlug: slug,
      isPlatform: false,
    });
  }

  from<T = Record<string, any>[]>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.baseUrl, table, this.getHeaders());
  }

  async rpc(functionName: string, params: Record<string, any> = {}): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(params),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: json?.error || json?.message || `RPC ${functionName} failed`,
            status: response.status,
          },
        };
      }

      return { data: json?.data !== undefined ? json.data : json, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: { message: err.message || 'RPC Network error' },
      };
    }
  }

  // Realtime channel stub (graceful replacement for Supabase WebSockets)
  channel(name: string) {
    const channelObj = {
      name,
      on(_event: string, _filter: any, _callback: (payload: any) => void) {
        return channelObj;
      },
      subscribe(statusCallback?: (status: string) => void) {
        if (statusCallback) statusCallback('SUBSCRIBED');
        return channelObj;
      },
      unsubscribe() {
        return channelObj;
      },
    };
    return channelObj;
  }

  removeChannel(_channel: any) {
    // No-op stub for native stack
    return true;
  }

  // Auth Subsystem
  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }): Promise<{ data: { user: ApiUser | null; session: ApiSession | null }; error: any }> => {
      try {
        const headers = this.getHeaders();
        const res = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.token) {
          return {
            data: { user: null, session: null },
            error: { message: json?.error || 'Invalid email or password' },
          };
        }

        const session: ApiSession = {
          access_token: json.token,
          token_type: 'bearer',
          user: json.user,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('vyara_auth_token', json.token);
          localStorage.setItem('vyara_auth_user', JSON.stringify(json.user));
          if (json.tenant_slug) {
            localStorage.setItem('selected_tenant_slug', json.tenant_slug);
          }
        }

        notifyAuthStateChange('SIGNED_IN', session);

        return {
          data: { user: json.user, session },
          error: null,
        };
      } catch (err: any) {
        return {
          data: { user: null, session: null },
          error: { message: err?.message || 'Authentication network error' },
        };
      }
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }): Promise<{ data: { user: ApiUser | null; session: ApiSession | null }; error: any }> => {
      try {
        const headers = this.getHeaders();
        const res = await fetch(`${this.baseUrl}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password, metadata: options?.data }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          return {
            data: { user: null, session: null },
            error: { message: json?.error || 'Signup failed' },
          };
        }

        const session: ApiSession | null = json.token
          ? { access_token: json.token, token_type: 'bearer', user: json.user }
          : null;

        if (session && typeof window !== 'undefined') {
          localStorage.setItem('vyara_auth_token', json.token);
          localStorage.setItem('vyara_auth_user', JSON.stringify(json.user));
        }

        return {
          data: { user: json.user, session },
          error: null,
        };
      } catch (err: any) {
        return {
          data: { user: null, session: null },
          error: { message: err?.message || 'Signup network error' },
        };
      }
    },

    signOut: async (_options?: { scope?: 'global' | 'local' | 'others' | string }): Promise<{ error: null }> => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vyara_auth_token');
        localStorage.removeItem('vyara_auth_user');
      }
      notifyAuthStateChange('SIGNED_OUT', null);
      return { error: null };
    },

    getSession: async (): Promise<{ data: { session: ApiSession | null }; error: null }> => {
      if (typeof window === 'undefined') {
        return { data: { session: null }, error: null };
      }

      const token = localStorage.getItem('vyara_auth_token');
      const userStr = localStorage.getItem('vyara_auth_user');

      if (!token) {
        return { data: { session: null }, error: null };
      }

      let user: ApiUser | null = null;
      try {
        user = userStr ? JSON.parse(userStr) : null;
      } catch {
        user = null;
      }

      if (!user) {
        // Token exists but user is missing, query /api/auth/user
        try {
          const res = await fetch(`${this.baseUrl}/api/auth/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            user = data.user;
            localStorage.setItem('vyara_auth_user', JSON.stringify(user));
          } else {
            localStorage.removeItem('vyara_auth_token');
            localStorage.removeItem('vyara_auth_user');
            return { data: { session: null }, error: null };
          }
        } catch {
          return { data: { session: null }, error: null };
        }
      }

      return {
        data: {
          session: {
            access_token: token,
            token_type: 'bearer',
            user: user!,
          },
        },
        error: null,
      };
    },

    getUser: async (): Promise<{ data: { user: ApiUser | null }; error: any }> => {
      const { data } = await this.auth.getSession();
      return { data: { user: data.session?.user || null }, error: null };
    },

    updateUser: async (attributes: { password?: string; data?: any }): Promise<{ data: { user: ApiUser | null }; error: any }> => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('vyara_auth_token') : null;
        const res = await fetch(`${this.baseUrl}/api/auth/update-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || ''}`,
            ...this.getHeaders(),
          },
          body: JSON.stringify(attributes),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          return { data: { user: null }, error: { message: json?.error || 'Failed to update user' } };
        }

        if (json?.user && typeof window !== 'undefined') {
          localStorage.setItem('vyara_auth_user', JSON.stringify(json.user));
          notifyAuthStateChange('USER_UPDATED', {
            access_token: token || '',
            token_type: 'bearer',
            user: json.user,
          });
        }

        return { data: { user: json?.user || null }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err?.message || 'Update user network error' } };
      }
    },

    resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }): Promise<{ error: any }> => {
      try {
        const res = await fetch(`${this.baseUrl}/api/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.getHeaders(),
          },
          body: JSON.stringify({ email, redirectTo: options?.redirectTo }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          return { error: { message: json?.error || 'Password reset request failed' } };
        }

        return { error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'Reset password network error' } };
      }
    },

    onAuthStateChange: (callback: AuthStateChangeCallback) => {
      authStateListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authStateListeners.delete(callback);
            },
          },
        },
      };
    },
  };

  // Storage Subsystem
  storage = {
    from: (bucket: string) => ({
      upload: async (filePath: string, file: File | Blob, options?: { upsert?: boolean; contentType?: string }): Promise<{ data: { path: string } | null; error: any }> => {
        try {
          const cleanPath = filePath.replace(/^\/+/, '');
          const formData = new FormData();
          formData.append('file', file);
          if (options?.upsert) formData.append('upsert', 'true');
          if (options?.contentType) formData.append('contentType', options.contentType);

          const res = await fetch(`${this.baseUrl}/api/storage/${bucket}/${cleanPath}`, {
            method: 'POST',
            headers: {
              ...this.getHeaders(),
            },
            body: formData,
          });

          const json = await res.json().catch(() => null);

          if (!res.ok) {
            return {
              data: null,
              error: { message: json?.error || `Upload to ${bucket} failed` },
            };
          }

          return { data: { path: cleanPath }, error: null };
        } catch (err: any) {
          return {
            data: null,
            error: { message: err?.message || 'Storage upload network error' },
          };
        }
      },

      getPublicUrl: (filePath: string): { data: { publicUrl: string } } => {
        const cleanPath = filePath.replace(/^\/+/, '');
        return {
          data: {
            publicUrl: `${this.baseUrl}/api/storage/${bucket}/${cleanPath}`,
          },
        };
      },

      createSignedUrl: async (filePath: string, expiresIn = 3600): Promise<{ data: { signedUrl: string } | null; error: any }> => {
        const cleanPath = filePath.replace(/^\/+/, '');
        return {
          data: {
            signedUrl: `${this.baseUrl}/api/storage/${bucket}/${cleanPath}?expires=${expiresIn}`,
          },
          error: null,
        };
      },
    }),
  };

  // Functions Subsystem
  functions = {
    invoke: async (functionName: string, options?: { body?: any; headers?: Record<string, string> }): Promise<ApiResponse<any>> => {
      try {
        const res = await fetch(`${this.baseUrl}/api/functions/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.getHeaders(),
            ...(options?.headers || {}),
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          return {
            data: null,
            error: { message: json?.error || `Function ${functionName} invocation failed` },
          };
        }

        return { data: json, error: null };
      } catch (err: any) {
        return {
          data: null,
          error: { message: err.message || 'Function invocation network error' },
        };
      }
    },
  };
}
