/**
 * Copies the app's EXPO_PUBLIC_* values from the CI environment (GitLab CI/CD variables) into an
 * EAS environment, so EAS cloud builds get them without any .env file.
 *
 *   node scripts/ci/sync-eas-env.js <development|preview|production>
 *
 * Needs EXPO_TOKEN. Values are passed as arguments (never printed). Variables that aren't set in CI
 * are skipped, so values already stored on EAS are left alone.
 */
const { execFileSync } = require('node:child_process');

const environment = process.argv[2];
if (!['development', 'preview', 'production'].includes(environment)) {
  console.error('Usage: node scripts/ci/sync-eas-env.js <development|preview|production>');
  process.exit(2);
}
if (!process.env.EXPO_TOKEN) {
  console.error('EXPO_TOKEN is not set; add it under Settings → CI/CD → Variables.');
  process.exit(2);
}

/** EXPO_PUBLIC_* values are compiled into the app, so they are "sensitive" (hidden in logs), never "secret". */
const VARIABLES = {
  EXPO_PUBLIC_SUPABASE_URL: 'plaintext',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sensitive',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'plaintext',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'plaintext',
  EXPO_PUBLIC_LEGAL_BASE_URL: 'plaintext',
};

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

for (const [name, visibility] of Object.entries(VARIABLES)) {
  const value = process.env[name];
  if (!value) {
    console.log(`- ${name}: not set in CI, leaving the EAS value unchanged`);
    continue;
  }
  execFileSync(
    npx,
    [
      'eas-cli@24.7.0',
      'env:set',
      environment,
      '--name',
      name,
      '--value',
      value,
      '--visibility',
      visibility,
      '--non-interactive',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  console.log(`✔ ${name} → EAS ${environment} (${visibility})`);
}
