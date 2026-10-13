import express from 'express';
import fs from 'fs';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadRsaKey } from './keys.js';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('read-key', {
        describe: 'Path to private PEM key file',
        type: 'string',
        demandOption: true
    })
    .parse();

const keyPath = argv['read-key'];

// Verify key file exists
if (!fs.existsSync(keyPath)) {
    console.error(`Private PEM key not found in ${keyPath}`);
    console.error('You could generate one with: openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem');
    process.exit(1);
}

const app = express();

// Add logging middleware
app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress;
    console.log(chalk.blue(`[${new Date().toISOString()}]`) + ` ` + chalk.magenta(`${clientIp}`) + ` => ` + chalk.green(`${req.method}`) +` ${req.path}`);
    next();
});

// Define JWKS endpoint
app.get('/.well-known/jwks.json', async (req, res) => {
    const { publicJwk } = await loadRsaKey(keyPath);
    res.json({ keys: [{ ...publicJwk, alg: 'RS256', use: 'sig' }] });
});

// Start server
const PORT = 8085;
app.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.red.bold('This server is for demo purposes only. Do not use as is in production'));
    console.log(`Server running on port ${PORT}`);
});
