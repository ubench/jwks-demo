import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The demo has always accepted both PEM encodings and must keep doing so.
const PEM_ENCODINGS = {
    pkcs8: { type: 'pkcs8', format: 'pem' },
    pkcs1: { type: 'pkcs1', format: 'pem' },
};

export function createKeyFixtures() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jwks-demo-test-'));

    const pemPaths = Object.fromEntries(
        Object.entries(PEM_ENCODINGS).map(([name, encoding]) => {
            const pemPath = path.join(directory, `${name}.pem`);
            fs.writeFileSync(pemPath, privateKey.export(encoding));
            return [name, pemPath];
        })
    );

    const publicJwk = publicKey.export({ format: 'jwk' });

    return {
        pemPaths,
        publicJwk,
        expectedKid: rfc7638Thumbprint(publicJwk),
        cleanUp: () => fs.rmSync(directory, { recursive: true, force: true }),
    };
}

function rfc7638Thumbprint({ e, kty, n }) {
    return crypto.createHash('sha256').update(JSON.stringify({ e, kty, n })).digest('base64url');
}
