import crypto from 'crypto';
import fs from 'fs';
import { calculateJwkThumbprint, exportJWK } from 'jose';

// Loads an RSA private key from a PEM file (PKCS#8 or PKCS#1).
// `kid` is the RFC 7638 thumbprint of the public key; `publicJwk` carries it.
export async function loadRsaKey(pemPath) {
    // node:crypto instead of jose's importPKCS8, which would reject PKCS#1 keys.
    const privateKey = crypto.createPrivateKey(fs.readFileSync(pemPath, 'utf8'));
    const publicJwk = await exportJWK(crypto.createPublicKey(privateKey));
    const kid = await calculateJwkThumbprint(publicJwk);

    return {
        kid,
        publicJwk: { ...publicJwk, kid },
        privateKey,
    };
}
