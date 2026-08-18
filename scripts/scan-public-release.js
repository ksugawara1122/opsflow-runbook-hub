'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const textExtensions = new Set([
  '', '.csv', '.css', '.gitignore', '.gs', '.html', '.js', '.json', '.md', '.txt'
]);
const skippedDirectories = new Set(['.git', 'coverage', 'node_modules']);
const self = path.resolve(__filename);

const checks = [
  ['private Google/AppSheet asset URL', /https?:\/\/(?:docs\.google\.com\/(?:spreadsheets|document|presentation)\/d\/|www\.appsheet\.com\/(?:template\/appdef|start\/))/i],
  ['email address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ['Google API key shape', /\bAIza[0-9A-Za-z_-]{20,}\b/],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Windows user path', /\b[A-Z]:\\Users\\/i],
  ['private Vault path', /(?:40_AI\/Shared|03_Personal)/],
  ['private identity marker', /(?:ksugawara1122|Kento Sugawara|contact@k-sugawara\.com)/i]
];

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (skippedDirectories.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

const findings = [];
for (const file of filesUnder(root)) {
  if (path.resolve(file) === self) continue;
  const extension = path.extname(file).toLowerCase();
  if (!textExtensions.has(extension) && path.basename(file) !== '.gitignore') continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of checks) {
    const match = content.match(pattern);
    if (!match) continue;
    if (label === 'email address' && match[0].toLowerCase().endsWith('@example.invalid')) continue;
    const line = content.slice(0, match.index).split(/\r?\n/).length;
    findings.push({ file: path.relative(root, file), line, label });
  }
}

const result = {
  status: findings.length === 0 ? 'ok' : 'blocked',
  scannedFiles: filesUnder(root).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return path.resolve(file) !== self && (textExtensions.has(ext) || path.basename(file) === '.gitignore');
  }).length,
  findings
};

console.log(JSON.stringify(result, null, 2));
if (findings.length) process.exitCode = 1;
