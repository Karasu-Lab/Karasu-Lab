import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';

/**
 * Black-box verification that api-auth works as a SAML 2.0 service
 * provider, end to end, against the LOCAL stack (the servers in
 * playwright.config.ts). It never talks to the deployed services: every
 * account and provider it creates exists only in the local development
 * database and only for the duration of the test.
 *
 * 1. A throwaway "registrar" account registers a test SSO provider whose
 *    IdP is the local test IdP (`test-idp.mjs`, also started by the
 *    config), pointing at a domain no real user has.
 * 2. The SP metadata the worker serves for that provider is checked.
 * 3. A real browser runs the SP-initiated flow: sign-in initiation by
 *    email (domain routing), the IdP login form, the signed response
 *    posted back to the ACS, and finally a session on api-auth for the
 *    just-in-time-provisioned user.
 * 4. Cleanup is part of the test, not an afterthought: the provisioned
 *    user deletes itself, the registrar deletes the provider and then
 *    itself, and the test asserts that none of the three can be found
 *    afterwards. A failure of the main flow still runs the cleanup.
 *
 * If a run is killed mid-flow, the provisioned user can be left behind
 * in the local database and will block the next run (the SP refuses to
 * link it: `account_not_linked`). Delete that row (`saml-user@…` below)
 * from the local database before re-running.
 */

const AUTH_API_URL = process.env.AUTH_API_URL ?? 'http://localhost:8790/api/auth';
const SSO_UI_URL = process.env.SSO_UI_URL ?? 'http://localhost:3007';
const IDP_BASE = 'http://127.0.0.1:7000/idp';

const PROVIDER_ID = 'pw-saml-test';
const IDP_ENTITY_ID = IDP_BASE;
const IDP_SSO_URL = `${IDP_BASE}/sso`;
const SP_ENTITY_ID = `${AUTH_API_URL}/sso/saml2/sp/metadata`;
const ACS_URL = `${AUTH_API_URL}/sso/saml2/sp/acs/${PROVIDER_ID}`;
const AUTH_ORIGIN = AUTH_API_URL.replace(/\/api\/auth$/, '');

const ROUTE_DOMAIN = 'pw-sso-check.example';
const SAML_EMAIL = `saml-user@${ROUTE_DOMAIN}`;
const SAML_NAME = 'SAML Test User';

const REGISTRAR_EMAIL = 'pw-registrar-2@example.test';
const REGISTRAR_NAME = 'Playwright Registrar';
// A fixed password for the throwaway registrar account: it exists only for
// the duration of the test, and a fixed value lets a later run sign in to a
// registrar left behind by an interrupted run and remove it (see the
// pre-clean step), instead of being locked out by an unrecoverable random
// password.
const nonce = 'playwright-registrar-test-only';

const idpCert = readFileSync(join(__dirname, 'fixtures', 'idp-cert.pem'), 'utf8');

test('api-auth serves as a SAML service provider (register, round-trip, cleanup)', async ({ page }) => {
  test.setTimeout(180_000);
  // The Origin header matters: better-auth refuses some session-scoped
  // POSTs (notably delete-user) with 403 MISSING_OR_NULL_ORIGIN when it is
  // absent, and a bare APIRequestContext does not send one on its own.
  const api: APIRequestContext = await playwrightRequest.newContext({
    extraHTTPHeaders: { Origin: SSO_UI_URL },
  });
  const browserApi = page.context().request;

  let mainError: unknown;
  let cleanupError: unknown;
  let providerRegistered = false;
  let jitSessionLive = false;

  try {
    // -- Pre-clean: remove a registrar left behind by an interrupted run. ---
    const staleSignIn = await api.post(`${AUTH_API_URL}/sign-in/email`, { data: { email: REGISTRAR_EMAIL, password: nonce } }).catch(() => null);
    if (staleSignIn?.ok()) {
      await api.post(`${AUTH_API_URL}/delete-user`, { data: { password: nonce } }).catch(() => null);
    }

    // -- Setup: a registrar account, used only to own the test provider. ----
    const signUp = await api.post(`${AUTH_API_URL}/sign-up/email`, {
      data: { email: REGISTRAR_EMAIL, password: nonce, name: REGISTRAR_NAME },
    });
    expect(signUp.ok(), `registrar sign-up failed: ${signUp.status()}`).toBeTruthy();

    const signIn = await api.post(`${AUTH_API_URL}/sign-in/email`, {
      data: { email: REGISTRAR_EMAIL, password: nonce },
    });
    expect(signIn.ok(), `registrar sign-in failed: ${signIn.status()}`).toBeTruthy();

    // -- Register the test provider against the local test IdP. --------------
    const register = await api.post(`${AUTH_API_URL}/sso/register`, {
      data: {
        providerId: PROVIDER_ID,
        domain: ROUTE_DOMAIN,
        issuer: IDP_ENTITY_ID,
        samlConfig: {
          issuer: SP_ENTITY_ID,
          // Both fields below are load-bearing. Without them the provider
          // ends up with the IdP's issuer as its SP entity ID (visible as
          // the entityID in the served SP metadata), and the ACS then
          // rejects every SAML response on the audience check. Setting
          // them explicitly makes the SP identify as SP_ENTITY_ID.
          audience: SP_ENTITY_ID,
          spMetadata: { entityID: SP_ENTITY_ID },
          entryPoint: IDP_SSO_URL,
          cert: idpCert,
          idpMetadata: {
            entityID: IDP_ENTITY_ID,
            cert: idpCert,
            singleSignOnService: [{ Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect', Location: IDP_SSO_URL }],
          },
        },
      },
    });
    expect(register.ok(), `provider registration failed: ${register.status()} ${await register.text()}`).toBeTruthy();
    providerRegistered = true;

    // -- The SP metadata must name this provider's ACS and the SP entity. ----
    const metadata = await api.get(`${AUTH_API_URL}/sso/saml2/sp/metadata?providerId=${PROVIDER_ID}`);
    expect(metadata.ok(), `SP metadata failed: ${metadata.status()}`).toBeTruthy();
    const metadataXml = await metadata.text();
    // The entityID attribute specifically: a bare substring match would
    // also pass on the ACS location alone, which is how a wrong entity ID
    // (the IdP's issuer) once slipped through this check.
    expect(metadataXml).toContain(`entityID="${SP_ENTITY_ID}"`);
    expect(metadataXml).toContain(ACS_URL);

    // -- Initiate sign-in by email; the domain routes to the test IdP. -------
    // Done through the browser context so any flow state the SP sets is
    // carried by the same cookie store that will receive the response.
    const initiation = await browserApi.post(`${AUTH_API_URL}/sign-in/sso`, {
      data: { email: SAML_EMAIL, callbackURL: `${SSO_UI_URL}/sign-in` },
      maxRedirects: 0,
    });
    // The endpoint answers API callers with a JSON { url } and browser
    // navigations with a redirect; accept either shape.
    let idpUrl: string | undefined;
    if (initiation.status() >= 300 && initiation.status() < 400) {
      idpUrl = initiation.headers()['location'];
    } else {
      expect(initiation.ok(), `sign-in initiation failed: ${initiation.status()} ${await initiation.text()}`).toBeTruthy();
      idpUrl = ((await initiation.json()) as { url?: string }).url;
    }
    expect(idpUrl, 'initiation did not return an IdP URL').toBeTruthy();
    expect(idpUrl!).toContain(IDP_SSO_URL);
    expect(idpUrl!).toContain('SAMLRequest=');

    // -- The browser round-trip: IdP form in, signed response back to ACS. ---
    await page.goto(idpUrl!);
    await expect(page.getByLabel('Email')).toBeVisible();
    await page.getByLabel('Email').fill(SAML_EMAIL);
    await page.getByLabel('Name').fill(SAML_NAME);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The ACS answers with a redirect to the callback URL on success.
    await page.waitForURL((url) => url.href.startsWith(SSO_UI_URL), { timeout: 30_000 });
    expect(page.url(), `flow returned with an error: ${page.url()}`).not.toContain('error=');

    // -- A session for the just-in-time-provisioned user must now exist. -----
    const sessionResponse = await browserApi.get(`${AUTH_API_URL}/get-session`);
    expect(sessionResponse.ok(), `get-session failed: ${sessionResponse.status()}`).toBeTruthy();
    const session = (await sessionResponse.json()) as { user?: { email?: string; name?: string } } | null;
    expect(session?.user?.email).toBe(SAML_EMAIL);
    expect(session?.user?.name).toBe(SAML_NAME);
    jitSessionLive = true;
  } catch (error) {
    mainError = error;
  } finally {
    // Cleanup problems are collected, not thrown from here: a throw inside
    // `finally` would mask the main flow's own failure, which is the more
    // important signal. Both are rethrown after the block, main error first.
    try {
      // -- Cleanup (mandatory): provisioned user, provider, registrar. -------
      // Each step is attempted even if an earlier one fails; the statuses
      // are asserted below so a cleanup failure fails the test loudly.
      let jitDeleteStatus = 0;
      if (jitSessionLive) {
        const jitDelete = await browserApi.post(`${AUTH_API_URL}/delete-user`, { data: {}, headers: { Origin: SSO_UI_URL } }).catch(() => null);
        jitDeleteStatus = jitDelete?.status() ?? 0;
      }

      let providerDeleteStatus = 0;
      if (providerRegistered) {
        const providerDelete = await api.post(`${AUTH_API_URL}/sso/delete-provider`, { data: { providerId: PROVIDER_ID } }).catch(() => null);
        providerDeleteStatus = providerDelete?.status() ?? 0;
      }

      // Deleting an account that has a password requires the password in
      // the body (a passwordless SSO-provisioned account, above, does not).
      // If the first attempt is refused, sign in again for a fresh session
      // and try once more.
      let registrarDelete = await api.post(`${AUTH_API_URL}/delete-user`, { data: { password: nonce } }).catch(() => null);
      if (registrarDelete?.status() !== 200) {
        await api.post(`${AUTH_API_URL}/sign-in/email`, { data: { email: REGISTRAR_EMAIL, password: nonce } }).catch(() => null);
        registrarDelete = await api.post(`${AUTH_API_URL}/delete-user`, { data: { password: nonce } }).catch(() => null);
      }

      // -- Verify nothing the test created is left behind. -------------------
      if (jitSessionLive) expect(jitDeleteStatus, 'provisioned user could not delete itself').toBe(200);
      if (providerRegistered) {
        expect(providerDeleteStatus, 'test provider could not be deleted').toBe(200);
        const metadataAfter = await api.get(`${AUTH_API_URL}/sso/saml2/sp/metadata?providerId=${PROVIDER_ID}`);
        expect(metadataAfter.status(), 'SP metadata still served after provider deletion').toBe(404);
        const initiationAfter = await api.post(`${AUTH_API_URL}/sign-in/sso`, {
          data: { email: SAML_EMAIL, callbackURL: `${SSO_UI_URL}/sign-in` },
        });
        expect(initiationAfter.status(), 'sign-in initiation still routed after provider deletion').toBe(404);
      }
      expect(registrarDelete?.status() ?? 0, 'registrar account could not be deleted').toBe(200);
      const registrarSignInAfter = await api.post(`${AUTH_API_URL}/sign-in/email`, {
        data: { email: REGISTRAR_EMAIL, password: nonce },
      });
      expect(registrarSignInAfter.status(), 'registrar can still sign in after deletion').toBe(401);

      // The lookup answers by status code: no account and no SSO provider
      // for the address is a 404, which is what must remain after cleanup.
      const lookupAfter = await api.get(`${AUTH_ORIGIN}/api/sign-in/lookup?email=${encodeURIComponent(SAML_EMAIL)}`);
      expect(lookupAfter.status(), 'lookup still finds the test identity after cleanup').toBe(404);
      expect(await lookupAfter.json()).toMatchObject({ code: 'account_not_found' });
    } catch (error) {
      cleanupError = error;
    }
    await api.dispose();
  }

  if (mainError) throw mainError;
  if (cleanupError) throw cleanupError;
});
