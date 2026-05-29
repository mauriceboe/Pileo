import { describe, it, expect } from 'vitest';
import { apiClient, ApiRequestError } from './client';
import { server, http, HttpResponse } from '../test/msw-server';

describe('apiClient', () => {
  it('GET returns parsed body on 200', async () => {
    server.use(
      http.get('/api/v1/foo', () => HttpResponse.json({ data: { value: 42 } })),
    );
    const result = await apiClient.get<{ data: { value: number } }>('/foo');
    expect(result.data.value).toBe(42);
  });

  it('GET returns undefined for 204 No Content', async () => {
    server.use(http.get('/api/v1/empty', () => new HttpResponse(null, { status: 204 })));
    const result = await apiClient.get<undefined>('/empty');
    expect(result).toBeUndefined();
  });

  it('throws ApiRequestError with code + statusCode on error response', async () => {
    server.use(
      http.get('/api/v1/forbidden', () =>
        HttpResponse.json(
          { error: { code: 'FORBIDDEN', message: 'No access', details: { reason: 'role' } } },
          { status: 403 },
        ),
      ),
    );

    let caught: unknown;
    try {
      await apiClient.get('/forbidden');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiRequestError);
    const err = caught as ApiRequestError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('No access');
    expect(err.details).toEqual({ reason: 'role' });
  });

  it('falls back to UNKNOWN_ERROR for non-JSON error bodies', async () => {
    server.use(
      http.get('/api/v1/broken', () => new HttpResponse('not json', { status: 500 })),
    );

    await expect(apiClient.get('/broken')).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    });
  });

  it('POST serialises JSON body with content-type header', async () => {
    let captured: { contentType: string | null; body: unknown } | null = null;
    server.use(
      http.post('/api/v1/items', async ({ request }) => {
        captured = {
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        };
        return HttpResponse.json({ data: { id: 'x' } }, { status: 201 });
      }),
    );

    await apiClient.post<{ data: { id: string } }>('/items', { name: 'A' });
    expect(captured!.contentType).toContain('application/json');
    expect(captured!.body).toEqual({ name: 'A' });
  });

  it('upload sends FormData with multipart content-type (not JSON)', async () => {
    let receivedContentType: string | null = null;
    let hasFileField = false;
    server.use(
      http.post('/api/v1/uploads', async ({ request }) => {
        receivedContentType = request.headers.get('content-type');
        const form = await request.formData();
        hasFileField = form.has('file');
        return HttpResponse.json({ data: { id: 'u1' } }, { status: 201 });
      }),
    );

    const formData = new FormData();
    formData.append('file', new File(['hello'], 'a.txt', { type: 'text/plain' }));
    const result = await apiClient.upload<{ data: { id: string } }>('/uploads', formData);

    expect(result.data.id).toBe('u1');
    expect(hasFileField).toBe(true);
    // The client must NOT override content-type to application/json on upload;
    // fetch sets multipart/form-data with the right boundary itself.
    expect(receivedContentType).toMatch(/multipart\/form-data/);
  });

  it('honours AbortSignal', async () => {
    server.use(
      http.get('/api/v1/slow', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({ data: {} });
      }),
    );

    const controller = new AbortController();
    const promise = apiClient.get('/slow', { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toThrow();
  });
});
