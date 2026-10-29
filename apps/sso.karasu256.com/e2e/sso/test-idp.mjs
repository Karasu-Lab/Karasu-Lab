/**
 * A minimal SAML 2.0 identity provider that exists only so the live
 * black-box test in `saml-roundtrip.spec.ts` can run a real SP-initiated
 * round-trip against the deployed api-auth worker without an external IdP.
 *
 * It is deliberately small and dependency-light: it parses the incoming
 * AuthnRequest (HTTP-Redirect or HTTP-POST binding), shows a plain login
 * form, and answers with a signed SAML response (response and assertion
 * both signed with the test-only key in `fixtures/`) posted to the SP's
 * assertion consumer service. Nothing here is used outside the test.
 *
 * Configuration comes from the environment, set by playwright.config.ts:
 * - IDP_PORT: port to listen on (default 7000)
 * - AUTH_API_URL: the SP's better-auth base URL (used to derive the SP
 *   entity ID and ACS URL); the local stack by default
 * - TEST_PROVIDER_ID: the provider ID the SP registered for this IdP
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { SignedXml } from 'xml-crypto';

const PORT = Number(process.env.IDP_PORT ?? 7000);
const AUTH_API_URL = (process.env.AUTH_API_URL ?? 'http://localhost:8790/api/auth').replace(/\/+$/, '');
const PROVIDER_ID = process.env.TEST_PROVIDER_ID ?? 'pw-saml-test';

const IDP_ENTITY_ID = `http://127.0.0.1:${PORT}/idp`;
const SSO_URL = `${IDP_ENTITY_ID}/sso`;
const SP_ENTITY_ID = `${AUTH_API_URL}/sso/saml2/sp/metadata`;
const ACS_URL = `${AUTH_API_URL}/sso/saml2/sp/acs/${PROVIDER_ID}`;

const privateKey = readFileSync(new URL('./fixtures/idp-key.pem', import.meta.url), 'utf8');
const certPem = readFileSync(new URL('./fixtures/idp-cert.pem', import.meta.url), 'utf8');
const certBody = certPem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g, '');

/** Pending AuthnRequests by login key, held between the SSO hit and the login POST. */
const pending = new Map();

const xmlEscape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const iso = (date) => date.toISOString().replace(/\.\d+Z$/, 'Z');

function signXml(xml, xpath, issuerXpath) {
  const sig = new SignedXml({
    privateKey,
    publicCert: certPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  });
  sig.addReference({
    xpath,
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });
  sig.computeSignature(xml, { prefix: 'ds', location: { reference: issuerXpath, action: 'after' } });
  return sig.getSignedXml();
}

function buildSamlResponse({ requestId, email, name }) {
  const now = new Date();
  const notBefore = new Date(now.getTime() - 2 * 60_000);
  const notOnOrAfter = new Date(now.getTime() + 10 * 60_000);
  const instant = iso(now);
  const assertionId = `_${randomUUID().replace(/-/g, '')}`;
  const responseId = `_${randomUUID().replace(/-/g, '')}`;
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || firstName;

  const attributes = [
    ['email', email],
    ['name', name],
    ['displayName', name],
    ['firstName', firstName],
    ['lastName', lastName],
  ]
    .map(
      ([attrName, value]) =>
        `<saml:Attribute Name="${attrName}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"><saml:AttributeValue xsi:type="xs:string">${xmlEscape(value)}</saml:AttributeValue></saml:Attribute>`
    )
    .join('');

  const assertion = [
    `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="${assertionId}" Version="2.0" IssueInstant="${instant}">`,
    `<saml:Issuer>${IDP_ENTITY_ID}</saml:Issuer>`,
    '<saml:Subject>',
    `<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${xmlEscape(email)}</saml:NameID>`,
    '<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">',
    `<saml:SubjectConfirmationData NotOnOrAfter="${iso(notOnOrAfter)}" Recipient="${ACS_URL}" InResponseTo="${requestId}"/>`,
    '</saml:SubjectConfirmation>',
    '</saml:Subject>',
    `<saml:Conditions NotBefore="${iso(notBefore)}" NotOnOrAfter="${iso(notOnOrAfter)}">`,
    `<saml:AudienceRestriction><saml:Audience>${SP_ENTITY_ID}</saml:Audience></saml:AudienceRestriction>`,
    '</saml:Conditions>',
    `<saml:AuthnStatement AuthnInstant="${instant}" SessionIndex="_${randomUUID().replace(/-/g, '')}">`,
    '<saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified</saml:AuthnContextClassRef></saml:AuthnContext>',
    '</saml:AuthnStatement>',
    `<saml:AttributeStatement>${attributes}</saml:AttributeStatement>`,
    '</saml:Assertion>',
  ].join('');

  const signedAssertion = signXml(assertion, '//*[local-name(.)="Assertion"]', '//*[local-name(.)="Assertion"]/*[local-name(.)="Issuer"]');

  const response = [
    `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${responseId}" Version="2.0" IssueInstant="${instant}" Destination="${ACS_URL}" InResponseTo="${requestId}">`,
    `<saml:Issuer>${IDP_ENTITY_ID}</saml:Issuer>`,
    '<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>',
    signedAssertion,
    '</samlp:Response>',
  ].join('');

  return signXml(response, '//*[local-name(.)="Response"]', '//*[local-name(.)="Response"]/*[local-name(.)="Issuer"]');
}

function decodeAuthnRequest(raw, binding) {
  const buffer = Buffer.from(raw, 'base64');
  const xml = binding === 'redirect' ? inflateRawSync(buffer).toString('utf8') : buffer.toString('utf8');
  const id = /\bID="([^"]+)"/.exec(xml)?.[1];
  if (!id) throw new Error('AuthnRequest has no ID');
  return { id, xml };
}

function metadataXml() {
  return [
    `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${IDP_ENTITY_ID}">`,
    '<md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">',
    '<md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data>',
    `<ds:X509Certificate>${certBody}</ds:X509Certificate>`,
    '</ds:X509Data></ds:KeyInfo></md:KeyDescriptor>',
    '<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>',
    `<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${SSO_URL}"/>`,
    `<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${SSO_URL}"/>`,
    '</md:IDPSSODescriptor>',
    '</md:EntityDescriptor>',
  ].join('');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
      return;
    }

    if (url.pathname === '/idp/metadata') {
      res.writeHead(200, { 'Content-Type': 'application/samlmetadata+xml' }).end(metadataXml());
      return;
    }

    if (url.pathname === '/idp/sso') {
      let samlRequest;
      let relayState;
      let binding;
      if (req.method === 'GET') {
        samlRequest = url.searchParams.get('SAMLRequest');
        relayState = url.searchParams.get('RelayState') ?? undefined;
        binding = 'redirect';
      } else {
        const params = new URLSearchParams(await readBody(req));
        samlRequest = params.get('SAMLRequest');
        relayState = params.get('RelayState') ?? undefined;
        binding = 'post';
      }
      if (!samlRequest) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end('missing SAMLRequest');
        return;
      }
      const { id } = decodeAuthnRequest(samlRequest, binding);
      const key = randomUUID();
      pending.set(key, { requestId: id, relayState });
      res.writeHead(302, { Location: `/idp/login?key=${key}` }).end();
      return;
    }

    if (url.pathname === '/idp/login' && req.method === 'GET') {
      const key = url.searchParams.get('key') ?? '';
      res
        .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(
          `<!doctype html><html><head><title>Playwright test IdP</title></head><body>` +
            `<h1>Playwright test IdP</h1><form method="POST" action="/idp/login">` +
            `<input type="hidden" name="key" value="${xmlEscape(key)}"/>` +
            `<label>Email <input name="email" type="email" required/></label>` +
            `<label>Name <input name="name" type="text" required/></label>` +
            `<button type="submit">Sign in</button></form></body></html>`
        );
      return;
    }

    if (url.pathname === '/idp/login' && req.method === 'POST') {
      const params = new URLSearchParams(await readBody(req));
      const entry = pending.get(params.get('key') ?? '');
      if (!entry) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end('unknown or expired login key');
        return;
      }
      pending.delete(params.get('key') ?? '');
      const email = params.get('email') ?? '';
      const name = params.get('name') ?? email;
      const samlResponse = buildSamlResponse({ requestId: entry.requestId, email, name });
      const encoded = Buffer.from(samlResponse, 'utf8').toString('base64');
      const relayField = entry.relayState ? `<input type="hidden" name="RelayState" value="${xmlEscape(entry.relayState)}"/>` : '';
      res
        .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(
          `<!doctype html><html><body onload="document.forms[0].submit()">` +
            `<form method="POST" action="${ACS_URL}">` +
            `<input type="hidden" name="SAMLResponse" value="${encoded}"/>${relayField}` +
            `<button type="submit">Continue</button></form></body></html>`
        );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end(`test IdP error: ${error.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`test IdP listening on ${IDP_ENTITY_ID} (SP: ${SP_ENTITY_ID}, ACS: ${ACS_URL})`);
});
