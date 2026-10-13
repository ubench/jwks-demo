import http from 'node:http';

export const REALM = 'test-realm';
export const TOKEN_PATH = `/auth/realms/${REALM}/protocol/openid-connect/token`;
export const ACCESS_TOKEN_CLAIMS = { sub: 'test-client', scope: 'demo' };

// Stands in for the UBench authorization server: records every token request
// and answers with an unsigned access token whose payload the script decodes.
export async function startFakeTokenEndpoint() {
    const receivedRequests = [];
    const server = http.createServer(async (request, response) => {
        receivedRequests.push({
            method: request.method,
            path: request.url,
            contentType: request.headers['content-type'],
            form: Object.fromEntries(new URLSearchParams(await readBody(request))),
        });
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ access_token: fakeAccessToken(), token_type: 'Bearer' }));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    return {
        host: `http://127.0.0.1:${server.address().port}`,
        receivedRequests,
        stop: () => new Promise((resolve) => server.close(resolve)),
    };
}

function fakeAccessToken() {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'none' })}.${encode(ACCESS_TOKEN_CLAIMS)}.`;
}

async function readBody(request) {
    let body = '';
    for await (const chunk of request) body += chunk;
    return body;
}
