import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createKeyFixtures } from './support/key-fixtures.js';
import { runScript, startServerScript } from './support/scripts.js';

const JWKS_URL = 'http://127.0.0.1:8085/.well-known/jwks.json';

const keys = createKeyFixtures();
after(() => keys.cleanUp());

for (const [encoding, pemPath] of Object.entries(keys.pemPaths)) {
    describe(`serve.js with a ${encoding} private key`, () => {
        let server;
        before(async () => {
            server = await startServerScript('serve.js', ['--read-key', pemPath], 'Server running on port 8085');
        });
        after(() => server.stop());

        it('serves the public key as the only key in the JWKS', async () => {
            const response = await fetch(JWKS_URL);

            assert.equal(response.status, 200);
            assert.match(response.headers.get('content-type'), /^application\/json/);
            assert.deepEqual(await response.json(), {
                keys: [{
                    kty: 'RSA',
                    n: keys.publicJwk.n,
                    e: keys.publicJwk.e,
                    kid: keys.expectedKid,
                    alg: 'RS256',
                    use: 'sig',
                }],
            });
        });
    });
}

describe('serve.js without a usable key', () => {
    it('exits with an error when the key file does not exist', async () => {
        const { exitCode, output } = await runScript('serve.js', ['--read-key', '/nonexistent/key.pem']);

        assert.equal(exitCode, 1);
        assert.match(output, /Private PEM key not found in \/nonexistent\/key\.pem/);
    });
});
