/**
 * Turns ESLint's JSON output into a GitLab Code Quality report (Code Climate format), prints every
 * finding, and exits 1 if there are any errors or warnings (the codebase keeps zero warnings).
 *
 *   node scripts/ci/eslint-codequality.js <eslint-report.json> <gl-code-quality-report.json>
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/ci/eslint-codequality.js <eslint-report.json> <output.json>');
  process.exit(2);
}

let results;
try {
  results = JSON.parse(fs.readFileSync(input, 'utf8'));
} catch (error) {
  // ESLint crashed (bad config, parse failure of the config itself): fail loudly, never pass silently.
  console.error(`Could not read the ESLint report at ${input}: ${error.message}`);
  process.exit(2);
}

const fingerprint = (...parts) => crypto.createHash('sha256').update(parts.join('|')).digest('hex');
const issues = [];

for (const file of results) {
  const relativePath = path.relative(process.cwd(), file.filePath).split(path.sep).join('/');
  for (const message of file.messages) {
    const isError = message.fatal || message.severity === 2;
    const check = message.ruleId ?? (message.fatal ? 'parse-error' : 'eslint');
    const line = message.line ?? 1;
    issues.push({
      type: 'issue',
      check_name: check,
      description: message.message,
      categories: ['Style'],
      severity: isError ? 'major' : 'minor',
      fingerprint: fingerprint(relativePath, check, line, message.column ?? 0, message.message),
      location: { path: relativePath, lines: { begin: line, end: message.endLine ?? line } },
    });
    console.log(
      `${relativePath}:${line}:${message.column ?? 0}  ${isError ? 'error' : 'warning'}  ${message.message}  (${check})`,
    );
  }
}

fs.writeFileSync(output, JSON.stringify(issues, null, 2));
console.log(issues.length ? `\n✖ ${issues.length} ESLint problem(s)` : '✔ No ESLint problems');
process.exit(issues.length ? 1 : 0);
