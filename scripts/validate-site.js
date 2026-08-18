'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rootIndexPath = path.join(root, 'index.html');
const portfolioPath = path.join(root, 'portfolio', 'index.html');
const demoSlidesPath = path.join(root, 'portfolio', 'demo-slides.html');
const videoPath = path.join(root, 'portfolio', 'assets', 'opsflow-demo-90s.mp4');
const captionPath = path.join(root, 'portfolio', 'assets', 'opsflow-demo-90s-ja.vtt');
const findings = [];

function check(condition, message) {
  if (!condition) findings.push(message);
}

function localReferences(html, filePath) {
  const results = [];
  for (const match of html.matchAll(/\b(?:href|poster|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:#|https?:|mailto:|tel:|data:)/i.test(reference)) continue;
    const clean = reference.split(/[?#]/, 1)[0];
    const resolved = path.resolve(path.dirname(filePath), clean);
    results.push(clean.endsWith('/') ? path.join(resolved, 'index.html') : resolved);
  }
  return results;
}

check(fs.existsSync(rootIndexPath), 'root index.html is missing');
check(fs.existsSync(portfolioPath), 'portfolio/index.html is missing');
check(fs.existsSync(demoSlidesPath), 'portfolio/demo-slides.html is missing');

const rootIndex = fs.existsSync(rootIndexPath) ? fs.readFileSync(rootIndexPath, 'utf8') : '';
const portfolio = fs.existsSync(portfolioPath) ? fs.readFileSync(portfolioPath, 'utf8') : '';

check(/content="0; url=\.\/portfolio\/"/i.test(rootIndex), 'root redirect must target ./portfolio/');
check(/<video\b[^>]*\bcontrols\b[^>]*\bplaysinline\b[^>]*\bpreload="metadata"/is.test(portfolio), 'demo video must use controls, playsinline and preload="metadata"');
check(!/<video\b[^>]*\bautoplay\b/is.test(portfolio), 'demo video must not autoplay');
check(!/\b(?:href|poster|src)="\/(?!\/)/i.test(rootIndex + portfolio), 'project Pages must not use root-absolute asset paths');

for (const filePath of [rootIndexPath, portfolioPath, demoSlidesPath]) {
  if (!fs.existsSync(filePath)) continue;
  const html = fs.readFileSync(filePath, 'utf8');
  for (const referencedPath of localReferences(html, filePath)) {
    check(referencedPath.startsWith(root + path.sep), `local reference escapes the repository: ${referencedPath}`);
    check(fs.existsSync(referencedPath), `referenced file is missing: ${path.relative(root, referencedPath)}`);
  }
}

if (fs.existsSync(videoPath)) {
  const video = fs.readFileSync(videoPath);
  check(video.length > 0, 'demo video is empty');
  check(video.length <= 20 * 1024 * 1024, 'demo video exceeds the 20 MiB project limit');
  check(video.subarray(4, 8).toString('ascii') === 'ftyp', 'demo video is not an MP4 file');
} else {
  findings.push('demo video is missing');
}

if (fs.existsSync(captionPath)) {
  check(fs.readFileSync(captionPath, 'utf8').startsWith('WEBVTT'), 'caption file must start with WEBVTT');
} else {
  findings.push('caption file is missing');
}

const result = {
  status: findings.length === 0 ? 'ok' : 'blocked',
  checkedPages: 3,
  videoBytes: fs.existsSync(videoPath) ? fs.statSync(videoPath).size : 0,
  findings
};

console.log(JSON.stringify(result, null, 2));
if (findings.length) process.exitCode = 1;
