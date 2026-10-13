import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const PROJECT_DIRECTORY = fileURLToPath(new URL('../..', import.meta.url));

export function runScript(script, args) {
    const child = startScript(script, args);
    return new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', (exitCode) => resolve({ exitCode, output: child.output() }));
    });
}

export function startServerScript(script, args, readyMessage) {
    const child = startScript(script, args);
    return new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', (exitCode) => reject(new Error(`${script} exited with ${exitCode}:\n${child.output()}`)));
        child.stdout.on('data', () => {
            if (child.output().includes(readyMessage)) {
                child.removeAllListeners('close');
                resolve({ stop: () => stopProcess(child) });
            }
        });
    });
}

function startScript(script, args) {
    const child = spawn(process.execPath, [script, ...args], { cwd: PROJECT_DIRECTORY });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.output = () => stripVTControlCharacters(output);
    return child;
}

function stopProcess(child) {
    return new Promise((resolve) => {
        child.on('close', resolve);
        child.kill();
    });
}
