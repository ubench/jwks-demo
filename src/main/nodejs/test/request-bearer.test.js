import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
    ACCESS_TOKEN_CLAIMS,
    REALM,
    TOKEN_PATH,
    startFakeTokenEndpoint,
} from './support/fake-token-endpoint.js';
import { decodeJwt, hasValidRs256Signature } from './support/jwt.js';
import { createKeyFixtures } from './support/key-fixtures.js';
import { runScript } from './support/scripts.js';

const CLIENT_ID = 'test-client';
const ASSERTION_LIFETIME_SECONDS = 600;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const keys = createKeyFixtures();
let tokenEndpoint;
before(async () => { tokenEndpoint = await startFakeTokenEndpoint(); });
after(async () => {
    await tokenEndpoint.stop();
    keys.cleanUp();
});

async function requestBearer(pemPath, extraArgs = []) {
    const requestsBefore = tokenEndpoint.receivedRequests.length;
    const result = await runScript('request-bearer.js', [
        '--auth-host', tokenEndpoint.host,
        '--realm', REALM,
        '--client-id', CLIENT_ID,
        '--key-path', pemPath,
        ...extraArgs,
    ]);
    return { ...result, tokenRequests: tokenEndpoint.receivedRequests.slice(requestsBefore) };
}

for (const [encoding, pemPath] of Object.entries(keys.pemPaths)) {
    describe(`request-bearer.js with a ${encoding} private key`, () => {
        let run;
        let assertion;
        before(async () => {
            run = await requestBearer(pemPath);
            assertion = run.tokenRequests[0]?.form.client_assertion;
        });

        it('posts one client-credentials request to the realm token endpoint', () => {
            assert.equal(run.exitCode, 0, run.output);
            assert.equal(run.tokenRequests.length, 1);

            const [request] = run.tokenRequests;
            assert.equal(request.method, 'POST');
            assert.equal(request.path, TOKEN_PATH);
            assert.equal(request.contentType, 'application/x-www-form-urlencoded');
            assert.deepEqual(Object.keys(request.form).sort(),
                ['client_assertion', 'client_assertion_type', 'client_id', 'grant_type']);
            assert.equal(request.form.grant_type, 'client_credentials');
            assert.equal(request.form.client_id, CLIENT_ID);
            assert.equal(request.form.client_assertion_type, 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        });

        it('signs the client assertion with the private key using RS256', () => {
            assert.ok(hasValidRs256Signature(assertion, keys.publicJwk));
        });

        it('includes the key id in the assertion header by default', () => {
            assert.deepEqual(decodeJwt(assertion).header, { alg: 'RS256', kid: keys.expectedKid });
        });

        it('identifies the client towards the token endpoint for ten minutes', () => {
            const { claims } = decodeJwt(assertion);
            const now = Math.floor(Date.now() / 1000);

            assert.deepEqual(Object.keys(claims).sort(), ['aud', 'exp', 'iat', 'iss', 'jti', 'sub']);
            assert.equal(claims.iss, CLIENT_ID);
            assert.equal(claims.sub, CLIENT_ID);
            assert.equal(claims.aud, `${tokenEndpoint.host}${TOKEN_PATH}`);
            assert.match(claims.jti, UUID_V4);
            assert.ok(Math.abs(now - claims.iat) < 60, `iat ${claims.iat} is not close to now (${now})`);
            assert.equal(claims.exp - claims.iat, ASSERTION_LIFETIME_SECONDS);
        });

        it('prints the request and the received token with its decoded content', () => {
            assert.match(run.output, /Requesting access token using this message:/);
            assert.match(run.output, /"__client_assertion_human_readable"/);
            assert.match(run.output, /Successfully got access token/);
            assert.match(run.output, /"__access_token_content"/);
            assert.match(run.output, new RegExp(`"scope": "${ACCESS_TOKEN_CLAIMS.scope}"`));
        });
    });
}

describe('request-bearer.js with --no-self-hosted', () => {
    it('leaves the key id out of the assertion header', async () => {
        const run = await requestBearer(keys.pemPaths.pkcs8, ['--no-self-hosted']);
        const assertion = run.tokenRequests[0].form.client_assertion;

        assert.equal(run.exitCode, 0, run.output);
        assert.deepEqual(decodeJwt(assertion).header, { alg: 'RS256' });
        assert.ok(hasValidRs256Signature(assertion, keys.publicJwk));
    });
});

describe('request-bearer.js run repeatedly', () => {
    it('generates a unique jti for every assertion', async () => {
        // Sequential on purpose: requestBearer attributes requests by arrival order.
        const first = await requestBearer(keys.pemPaths.pkcs8);
        const second = await requestBearer(keys.pemPaths.pkcs8);
        const jtiOf = (run) => decodeJwt(run.tokenRequests[0].form.client_assertion).claims.jti;

        assert.notEqual(jtiOf(first), jtiOf(second));
    });
});

describe('request-bearer.js without a usable key', () => {
    it('exits with an error and sends no request when the key file does not exist', async () => {
        const run = await requestBearer('/nonexistent/key.pem');

        assert.equal(run.exitCode, 1);
        assert.match(run.output, /Private PEM key not found in \/nonexistent\/key\.pem/);
        assert.equal(run.tokenRequests.length, 0);
    });
});
