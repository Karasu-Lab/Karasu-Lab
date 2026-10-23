import { test, expect, type APIRequestContext } from '@playwright/test';

const ACCOUNTS_URL = 'http://localhost:3001';
const AUTH_URL = 'http://localhost:3004';
const AUTH_API_URL = 'http://localhost:8790';

interface GrantablePermission {
  publicId: string;
  resource: string;
  action: string;
}

async function signUp(request: APIRequestContext): Promise<string> {
  const email = `e2e-api-key-${Date.now()}-${crypto.randomUUID()}@example.test`;
  const res = await request.post(`${AUTH_API_URL}/api/auth/sign-up/email`, {
    headers: { Origin: AUTH_URL },
    data: { email, password: `pw-${crypto.randomUUID()}`, name: email },
  });
  expect(res.ok()).toBeTruthy();
  const { user } = (await res.json()) as { user: { id: string } };
  return user.id;
}

async function findPermission(request: APIRequestContext, resource: string, action: string): Promise<string> {
  const res = await request.get(`${ACCOUNTS_URL}/api/permissions`);
  expect(res.ok()).toBeTruthy();
  const permissions = (await res.json()) as GrantablePermission[];
  const permission = permissions.find((p) => p.resource === resource && p.action === action);
  expect(permission, `permission ${resource}:${action} should be grantable`).toBeDefined();
  return permission!.publicId;
}

async function issueApiKey(request: APIRequestContext, permissionPublicIds: string[]): Promise<string> {
  const res = await request.post(`${ACCOUNTS_URL}/api/api-keys`, {
    data: { name: 'e2e', permissions: permissionPublicIds },
  });
  expect(res.status()).toBe(201);
  const { key } = (await res.json()) as { key: string };
  return key;
}

test('an API key without permissions is refused the profile', async ({ request }) => {
  await signUp(request);
  const key = await issueApiKey(request, []);

  const res = await request.get('/api/profile', { headers: { Authorization: `Bearer ${key}` } });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ error: 'insufficient_scope' });
});

test('an API key with profile:read can read the profile', async ({ request }) => {
  const userId = await signUp(request);
  const key = await issueApiKey(request, [await findPermission(request, 'profile', 'read')]);

  const res = await request.get('/api/profile', { headers: { Authorization: `Bearer ${key}` } });
  expect(res.status()).toBe(200);
  expect(((await res.json()) as { id: string }).id).toBe(userId);
});
