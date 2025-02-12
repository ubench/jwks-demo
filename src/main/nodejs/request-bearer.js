import fs from 'fs';
import jose from 'node-jose';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const argv = yargs(hideBin(process.argv))
    .option('auth-host', {
        describe: 'UBench authentication server host',
        type: 'string',
        demandOption: true
    })
    .option('realm', {
        describe: 'UBench api realm',
        type: 'string',
        demandOption: true
    })
    .option('client-id', {
        describe: 'UBench client-id',
        type: 'string',
        demandOption: true
    })
    .option('key-path', {
        describe: 'Path to private PEM key file',
        type: 'string',
        demandOption: true
    })
    .option('no-self-hosted', {
        describe: 'Disable key ID in JWT header',
        type: 'boolean',
        default: false
    })
    .argv;

const { authHost, realm, clientId, keyPath, noSelfHosted } = argv;
const authUrl = `${authHost}/auth/realms/${realm}`;
const tokenEndpoint = `${authUrl}/protocol/openid-connect/token`;

if (!fs.existsSync(keyPath)) {
    console.error(`Private PEM key not found in ${keyPath}`);
    console.error(`Please generate one with: openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out ${keyPath}`);
    process.exit(1);
}

async function generateSignedJwt(key, clientId) {
    const now = Math.floor(Date.now() / 1000);
    
    const header = {
        alg: 'RS256',
        kid: noSelfHosted ? undefined : key.kid
    };

    const claims = {
        jti: uuidv4(),
        iss: clientId,
        sub: clientId,
        aud: tokenEndpoint,
        iat: now,
        exp: now + 600
    };

    const token = await jose.JWS.createSign({ format: 'compact', fields: header }, key)
        .update(JSON.stringify(claims))
        .final();
    
    return token;
}

async function requestAccessToken(clientId) {
    try {
        const pemData = fs.readFileSync(keyPath, 'utf8');
        const keystore = await jose.JWK.createKeyStore();
        const key = await keystore.add(Buffer.from(pemData), 'pem');
        
        const signedJwt = await generateSignedJwt(key, clientId);
        
        const data = new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': clientId,
            'client_assertion_type': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            'client_assertion': signedJwt
        });

        console.log(chalk.yellow('Requesting access token using this message:'));
        console.log(JSON.stringify({
            ...Object.fromEntries(data),
            __client_assertion_content: JSON.parse(
                Buffer.from(signedJwt.split('.')[1], 'base64').toString()
            )
        }, null, 2));

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            body: data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.log(chalk.red('Failed to get access token'));
            console.log(JSON.stringify(responseData, null, 2));
            return null;
        }

        // Add decoded token content
        responseData.__access_token_content = JSON.parse(
            Buffer.from(responseData.access_token.split('.')[1], 'base64').toString()
        );

        return responseData;
    } catch (error) {
        console.error(chalk.red('Error:', error.message));
        return null;
    }
}

const result = await requestAccessToken(clientId);
if (result) {
    console.log(chalk.yellow('\nSuccessfully got access token'));
    console.log(JSON.stringify(result, null, 2));
} else {
    console.log(chalk.red('Failed to get access token'));
}
