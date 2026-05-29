const BASE_URL = '/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.statusCode = statusCode;
    this.details = error.details;
  }
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    if (body?.error && typeof body.error.code === 'string') {
      return body.error as ApiError;
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: body?.message ?? response.statusText,
    };
  } catch {
    return {
      code: 'UNKNOWN_ERROR',
      message: response.statusText || 'An unexpected error occurred',
    };
  }
}

interface RequestOptions {
  signal?: AbortSignal;
}

async function sendRequest<T>(
  method: string,
  path: string,
  body?: BodyInit | null,
  headers: Record<string, string> = {},
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ?? null,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorResponse(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function json<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const hasBody = body !== undefined;
  return sendRequest<T>(
    method,
    path,
    hasBody ? JSON.stringify(body) : undefined,
    hasBody ? { 'Content-Type': 'application/json' } : {},
    options,
  );
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return json<T>('GET', path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return json<T>('POST', path, body, options);
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return json<T>('PATCH', path, body, options);
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return json<T>('PUT', path, body, options);
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return json<T>('DELETE', path, undefined, options);
  },

  upload<T>(
    path: string,
    formData: FormData,
    method: 'POST' | 'PATCH' | 'PUT' = 'POST',
    options?: RequestOptions,
  ): Promise<T> {
    return sendRequest<T>(method, path, formData, {}, options);
  },
};
