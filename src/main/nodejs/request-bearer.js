import fs from 'fs';
import jose from 'node-jose';
import chalk from 'chalk';
import {colorize} from 'json-colorizer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { loadRsaKey } from './keys.js';

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
    .option('self-hosted', {
        describe: 'Include key ID in JWT header',
        type: 'boolean',
        default: true
    })
    .argv;

const { authHost, realm, clientId, keyPath, selfHosted } = argv;
const authUrl = `${authHost}/auth/realms/${realm}`;
const tokenEndpoint = `${authUrl}/protocol/openid-connect/token`;

if (!fs.existsSync(keyPath)) {
    console.error(`Private PEM key not found in ${keyPath}`);
    console.error(`Please generate one with: openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out ${keyPath}`);
    process.exit(1);
}

async function generateSignedJwt({ kid, privateKey }, clientId) {
    const now = Math.floor(Date.now() / 1000);
    
    const header = {
        alg: 'RS256',
        kid: selfHosted ? kid : undefined
    };

    const claims = {
        jti: uuidv4(),
        iss: clientId,
        sub: clientId,
        aud: tokenEndpoint,
        iat: now,
        exp: now + 600
    };

    const token = await jose.JWS.createSign({ format: 'compact', fields: header }, privateKey)
        .update(JSON.stringify(claims))
        .final();
    
    return token;
}

async function requestAccessToken(clientId) {
    try {
        const signedJwt = await generateSignedJwt(await loadRsaKey(keyPath), clientId);
        
        const data = new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': clientId,
            'client_assertion_type': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            'client_assertion': signedJwt
        });

        console.log(chalk.cyan('Requesting access token using this message:'));
        console.log(colorize(JSON.stringify({
            ...Object.fromEntries(data),
            __client_assertion_human_readable: {
                header: JSON.parse(
                    Buffer.from(signedJwt.split('.')[0], 'base64').toString()
                ),
                content: JSON.parse(
                    Buffer.from(signedJwt.split('.')[1], 'base64').toString()
                )
            },
        }, null, 2)));

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            body: data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.log(chalk.red('Failed to get access token'));
            console.log(colorize(JSON.stringify(responseData, null, 2)));
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
    console.log(chalk.cyan('\nSuccessfully got access token'));
    console.log(colorize(JSON.stringify(result, null, 2)));
}
