const request = require('supertest');
const app = require('../app');

describe('Task Manager API', () => {

  // Test 1: Check if the health endpoint is workingg
  it('GET /health should return 200 and status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  // Test 2: Check if the info endpoint returns the correct version
  it('GET /api/info should return application metadata', async () => {
    const res = await request(app).get('/api/info');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('message');
  });

  // Test 3: Check if tasks can be fetched
  it('GET /api/tasks should return a list of tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });
});
