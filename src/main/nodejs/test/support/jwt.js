import crypto from 'node:crypto';

// Deliberately independent of any JOSE library, so the tests keep verifying
// behaviour while the library behind the scripts is replaced.
export function decodeJwt(token) {
    const [header, payload, signature] = token.split('.');
    return {
        header: decodeSegment(header),
        claims: decodeSegment(payload),
        signingInput: `${header}.${payload}`,
        signature: Buffer.from(signature, 'base64url'),
    };
}

export function hasValidRs256Signature(token, publicJwk) {
    const { signingInput, signature } = decodeJwt(token);
    const publicKey = crypto.createPublicKey({ key: publicJwk, format: 'jwk' });
    return crypto.verify('RSA-SHA256', Buffer.from(signingInput), publicKey, signature);
}

function decodeSegment(segment) {
    return JSON.parse(Buffer.from(segment, 'base64url').toString());
}
