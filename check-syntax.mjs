import { readFileSync } from 'fs';
import * as acorn from 'acorn';
const html = readFileSync('approval-flow.html', 'utf8');
const matches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
if (!matches.length) { console.log('NO SCRIPT FOUND'); process.exit(1); }
const code = matches[matches.length - 1][1];
try {
  acorn.parse(code, { ecmaVersion: 2022 });
  console.log('OK');
} catch (e) {
  console.log('SYNTAX ERROR:', e.message);
  const lines = code.split('\n');
  const ln = e.loc ? e.loc.line : 0;
  for (let i = Math.max(0, ln - 3); i < Math.min(lines.length, ln + 2); i++) console.log((i + 1) + ': ' + lines[i]);
  process.exit(1);
}
