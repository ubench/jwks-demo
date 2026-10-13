import fs from 'fs';
import jose from 'node-jose';

// Loads an RSA private key from a PEM file (PKCS#8 or PKCS#1).
// `kid` is the RFC 7638 thumbprint of the public key; `publicJwk` carries it.
export async function loadRsaKey(pemPath) {
    const pemData = fs.readFileSync(pemPath, 'utf8');
    const keystore = await jose.JWK.createKeyStore();
    const key = await keystore.add(Buffer.from(pemData), 'pem');

    return {
        kid: key.kid,
        publicJwk: key.toJSON(false),
        privateKey: key,
    };
}
