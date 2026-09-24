# Streak: CI/CD (GitLab)

`.gitlab-ci.yml` runs on every merge request and every branch push (never twice for the same commit).
Each job has a single purpose, so a red job tells you exactly what broke.

| Stage   | Job                      | What it checks                                                                            | Fails when                                                                                               |
| ------- | ------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| quality | `typecheck`              | Regenerates Expo Router typed routes, then `tsc --noEmit` in strict mode                  | Any type error, including a link to a route that doesn't exist                                           |
| quality | `lint`                   | ESLint (Expo rules, MVVM import boundaries, Prettier) → **Code Quality** report in the MR | Any error **or warning**                                                                                 |
| quality | `format`                 | `prettier --check .`                                                                      | A file isn't formatted (run `npm run format`)                                                            |
| test    | `unit-tests`             | Jest: unit, ViewModel and component tests → **test report** and **coverage** in the MR    | A test fails, or coverage drops below the floor in `jest.config.js`                                      |
| test    | `semgrep-sast`           | GitLab SAST (static security analysis)                                                    | Findings appear in the MR security widget                                                                |
| test    | `secret_detection`       | Committed secrets (keys, tokens)                                                          | Findings appear in the MR security widget                                                                |
| health  | `expo-health`            | `expo install --check` (native deps match the SDK) and `expo-doctor`                      | Version drift or config problems (a warning; it doesn't block the MR; fix with `npx expo install --fix`) |
| health  | `dependency-audit`       | `npm audit`                                                                               | A **high** or **critical** advisory                                                                      |
| build   | `bundle: [android, ios]` | `expo export`: the whole app compiles to a Hermes bundle                                  | Metro, Babel or import errors                                                                            |
| build   | `eas-build`              | Manual cloud build (default branch, once `EXPO_TOKEN` is set)                             | Only when you run it                                                                                     |

Quality, test and health jobs start immediately (`needs: []`), so feedback usually arrives in a few minutes.

## Running the same checks locally

```bash
npm run verify
npx prettier --check .
npx expo-doctor
```

## Settings in GitLab

**Settings → CI/CD → Variables** (nothing is needed for the checks themselves; these are only for
`eas-build`):

| Key                                | Value                                           | Flags             |
| ---------------------------------- | ----------------------------------------------- | ----------------- |
| `EXPO_TOKEN`                       | expo.dev → Account settings → Access tokens     | Masked, Protected |
| `EXPO_PUBLIC_SUPABASE_URL`         | Supabase → Project Settings → API               | Protected         |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`    | Supabase → Project Settings → API → anon public | Masked, Protected |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Cloud → Web client                       | Protected         |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Cloud → iOS client                       | Protected         |
| `EXPO_PUBLIC_LEGAL_BASE_URL`       | Your site                                       | Protected         |

`eas-build` copies whichever of these are set into the EAS environment (`scripts/ci/sync-eas-env.js`)
and then queues the build, so no `.env` file is ever needed. `EXPO_PUBLIC_*` values are compiled into
the app, so they are public by design; never add the Supabase `service_role` key here.

Before the first `eas-build`:

1. The EAS project is already linked: `app.config.ts` sets `owner: 'faiz-glitch'` and
   `extra.eas.projectId` (expo.dev/accounts/faiz-glitch/projects/streak).
2. `eas.json` maps each build profile to its EAS environment (`development`, `preview`, `production`).
3. For iOS, set up credentials once with `npx eas-cli@latest credentials` (non-interactive builds can't
   create them), then run the job with `EAS_PLATFORM=all`.

**Settings → Repository → Protected branches:** protect `main`.
**Settings → Merge requests:** turn on **Pipelines must succeed** so a red pipeline blocks merging.
