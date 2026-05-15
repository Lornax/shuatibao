import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

describe('POST /api/profiles', () => {
  it('rejects unauth', async () => {
    const res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    expect(res.status).toBe(401);
  });

  it('creates profile with examName only', async () => {
    const res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.examName).toBe('NPDP');
    expect(body.dailyMinutes).toBe(60);
    expect(body.status).toBe('active');
  });

  it('rejects empty examName', async () => {
    const res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/profiles', () => {
  it('returns empty list initially', async () => {
    const res = await app.request('/api/profiles', { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns created profiles', async () => {
    await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const res = await app.request('/api/profiles', { headers: authHeaders() });
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].examName).toBe('NPDP');
  });
});

describe('GET /api/profiles/:id', () => {
  it('returns profile by id', async () => {
    const createRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const created = await createRes.json();

    const res = await app.request(`/api/profiles/${created.id}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(created.id);
  });

  it('returns 404 for missing id', async () => {
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000', {
      headers: authHeaders(),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/profiles/:id', () => {
  it('updates examName + target + dailyMinutes', async () => {
    const createRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const created = await createRes.json();

    const res = await app.request(`/api/profiles/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP 2.0', target: '70 分', dailyMinutes: 90 }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.examName).toBe('NPDP 2.0');
    expect(updated.target).toBe('70 分');
    expect(updated.dailyMinutes).toBe(90);
  });

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects invalid body', async () => {
    const createRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'X' }),
    });
    const { id } = await createRes.json();
    const res = await app.request(`/api/profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ dailyMinutes: 9999 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/profiles/:id', () => {
  it('deletes the profile and cascades', async () => {
    const createRes = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'X' }),
    });
    const { id } = await createRes.json();
    const res = await app.request(`/api/profiles/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const after = await app.request(`/api/profiles/${id}`, { headers: authHeaders() });
    expect(after.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(res.status).toBe(404);
  });
});
