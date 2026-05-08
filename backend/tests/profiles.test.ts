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
    const created = await app
      .request('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ examName: 'NPDP' }),
      })
      .then((r) => r.json());

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
