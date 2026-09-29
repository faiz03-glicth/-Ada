# Streak: Project Technical Memory

> Snapshot: `main` @ `20ff7cc` (26 Sep 2026). Written from the source code, config, docs and git history
> of this repository. Re-check anything marked below before relying on it after the code has moved on.
>
> Companion docs: [SETUP.md](SETUP.md) (one-time console setup), [CI.md](CI.md) (pipeline),
> [MOTION.md](MOTION.md) (motion system in depth).

**Evidence labels used throughout**

| Label   | Meaning                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------- |
| **[C]** | Confirmed: read directly in code, config or git.                                                |
| **[I]** | Inferred: follows from the code or a library's documented behaviour, but not directly observed. |
| **[P]** | Planned: the code or docs say it arrives in a later phase; not implemented.                     |
| **[U]** | `UNKNOWN / NEEDS VERIFICATION`: can't be confirmed from the repository.                         |

**Health at snapshot [C]:** `npm run typecheck` passes, ESLint passes with 0 warnings, and Jest passes
(44 suites, 464 tests).

> **Uncommitted work seen while this was written (not described below as current).** The working tree had
> changes from another session. Once they're committed, update sections 4.4, 7, 11 and 12:
>
> - **Session restore time budget.** `SupabaseAuthRepository.restoreSession` gets a restore budget,
>   `SESSION_RESTORE_BUDGET_MS = 1000`, and a new `delay` dependency in `di.ts`. If Supabase hasn't
>   answered within 1 s, a returning user continues on their local profile while the restore finishes in
>   the background. The reason given: an expired token is refreshed over the network, and offline that
>   retries for ~25 s.
> - **Only `SIGNED_OUT` ends a session.** `authApi.onAuthStateChange` now calls back with `null` only for
>   `SIGNED_OUT`, so an empty `INITIAL_SESSION` (offline, token couldn't be refreshed) no longer signs
>   the person out.
> - **Per-icon Lucide imports.** `src/shared/ui/icons.ts` imports each icon from
>   `lucide-react-native/icons/<name>`, because Metro doesn't tree-shake. A new ESLint rule
>   (`ICON_BARREL`) forbids the package root, and Jest maps icons to `test/mocks/lucideIcon.tsx`. This is
>   a bundle-size optimization.

---

## Contents

1. [Project overview](#1-project-overview)
2. [Tech stack memory](#2-tech-stack-memory)
3. [Project architecture](#3-project-architecture)
4. [How this application works (flows)](#4-how-this-application-works)
5. [Database memory](#5-database-memory)
6. [Query memory](#6-query-memory)
7. [API memory](#7-api-memory)
8. [UI / frontend memory](#8-ui--frontend-memory)
9. [State management](#9-state-management)
10. [Authentication & security](#10-authentication--security)
11. [Bug database](#11-bug-database)
12. [Optimization memory](#12-optimization-memory)
13. [Build & development process](#13-build--development-process)
14. [Git & version control](#14-git--version-control)
15. [Deployment & hosting](#15-deployment--hosting)
16. [Configuration memory](#16-configuration-memory)
17. [Architectural decisions (ADR)](#17-architectural-decisions)
18. [Troubleshooting guide](#18-troubleshooting-guide)
19. ["Where do I find this?" index](#19-where-do-i-find-this-index)
20. ["I forgot how this works"](#20-i-forgot-how-this-works)
21. [Current project status](#21-current-project-status)
22. [Priority roadmap](#22-priority-roadmap)
23. [Final project cheat sheet](#23-final-project-cheat-sheet)

---

## 1. Project overview

### Simple explanation

**Streak** is a phone app for tracking how consistently you do things. You pick activities (Workout,
Deep work, Reading, Meditate, Walk, Water), tap **+** whenever you do one ("check in"), and each day on a
GitHub-style **heatmap** gets darker the more check-ins it has. The onboarding copy states the idea: "See
your consistency at a glance."

What works today:

- the first-launch flow: Welcome, then Intensity explained, then pick activities and a reminder
  preference;
- sign-in with Apple, Google, or an emailed 6-digit code, or **guest mode**, where data stays on the
  phone only;
- a basic Profile tab with your name, Appearance settings (theme, reduce motion, sound effects) and Log
  out;
- a lot of polish: the liquid tab bar, the press-and-hold heatmap that collapses and rebuilds with
  sound and haptics, the flipping logo, and smooth theme changes.

The core product isn't built yet. Home, check-ins, the real heatmap, Insights and History are
"Coming in Phase N" placeholder screens. **Phase 2 (activities and check-ins) is next.**

### Technical explanation

Streak is an **Expo SDK 57 / React Native 0.86 (New Architecture, Hermes)** app written in strict
TypeScript. Its main traits:

- **Offline-first, local-first.** On-device **SQLite (expo-sqlite) accessed through Drizzle ORM** is the
  source of truth.
- **Supabase is the remote backend.** It provides Auth (GoTrue) plus a Postgres `profiles` table exposed
  through PostgREST and protected by row-level security. There is no custom server code.
- **MVVM with repositories and a DI composition root.** Views, ViewModels, repositories and data sources
  are separate, and ESLint import-boundary rules enforce the separation.
- **Navigation:** Expo Router with typed routes. Two mutually exclusive route groups are switched by
  `Stack.Protected` guards.
- **State:** TanStack Query holds server state (in memory only). Zustand holds client state, persisted to
  a synchronous SQLite key/value store.
- **Styling and motion:** Unistyles 3 does theming from tokens. Reanimated 4 (CSS animations, layout
  animations, springs) drives the motion system.
- **Builds and CI:** EAS Build produces development, preview and production binaries. GitLab CI runs
  quality, test, health and bundle jobs.

### Facts

| Item                  | Value                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                  | Streak (`package.json` name `streak`; bundle/package ID `com.faiz.streak`) [C]                                                                                                                 |
| Purpose               | Log activities as check-ins and visualise consistency as a heatmap [C, from onboarding copy and domain]                                                                                        |
| Problem solved        | Seeing consistency at a glance rather than tracking a single streak count [I, from copy]                                                                                                       |
| Target users          | Individuals tracking personal habits [I]. Formal persona: [U]                                                                                                                                  |
| Status                | Phase 0 (foundation) and Phase 1 (auth, onboarding, placeholder profile) complete; Phases 2–6 planned [C, from commit titles and placeholders]                                                 |
| Platforms             | iOS (`supportsTablet: true`) and Android. A web favicon is configured, but web isn't a target (no web build in CI) [C]                                                                         |
| Deployment            | EAS Build (cloud). No store release confirmed [U]                                                                                                                                              |
| External services     | Supabase (Auth and Postgres), Google Sign-In (Google Cloud OAuth), Sign in with Apple, EAS (Expo), GitLab (git, CI), GitHub (mirror), a legal/help website at `EXPO_PUBLIC_LEGAL_BASE_URL` [C] |
| Analytics, monitoring | None. Three `TODO(Sentry)` comments mark where crash reporting should go [C]                                                                                                                   |

### Phase map (from placeholders and comments) [C]

| Phase | Scope (as referenced in code)                                                                                                         | State |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 0     | Scaffold, env, theme, fonts/splash, SQLite+Drizzle, Supabase, TanStack Query, DI, UI kit, actions and routes, intensity domain        | Done  |
| 1     | Auth data layer, auth state and guards, onboarding, login, profile placeholder, Maestro                                               | Done  |
| 2     | Home heatmap, check-ins, Day sheet, heatmap screen (year/month), activities and check-ins tables, guest data reassignment             | [P]   |
| 3     | Insights, History                                                                                                                     | [P]   |
| 4     | Full Profile, settings sections, activity editor, edit-field sheet, account linking, feedback, rating, account deletion Edge Function | [P]   |
| 5     | Sync engine (push dirty rows, pull with `last_pulled_at`)                                                                             | [P]   |
| 6     | Scheduled daily reminder notification                                                                                                 | [P]   |

---

## 2. Tech stack memory

### 2.1 Inventory

Versions are from `package.json` [C].

| Category            | Technology (version)                                                                                                                                                       | Purpose / where / why                                                                                                                                           | Important files / config                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Runtime / framework | **Expo SDK 57** (`expo ~57.0.25`), **React Native 0.86.3**, **React 19.2.3**                                                                                               | App runtime and native modules. Expo gives managed native config (CNG) and EAS builds.                                                                          | `app.config.ts`, `index.ts`, `package.json`                                                        |
| Language            | **TypeScript ~6.0.3** (strict, `noUncheckedIndexedAccess`)                                                                                                                 | All app code. JS only for Node scripts and configs. Python for the sound build script.                                                                          | `tsconfig.json` (paths `@/*` → `src/*`, `@test/*` → `test/*`)                                      |
| Navigation          | **Expo Router ~57.0.23** (typed routes)                                                                                                                                    | File-based routes in `app/`. `Stack.Protected` guards. Typed `Href` checked by `tsc`.                                                                           | `app/**`, `app.config.ts → experiments.typedRoutes`, `scripts/generate-route-types.js`             |
| Native navigation   | react-native-screens ~4.26, gesture-handler ~2.32, safe-area-context ~5.7                                                                                                  | Native stacks, form sheets, gestures, insets.                                                                                                                   | `app/(app)/_layout.tsx` (form sheets)                                                              |
| Styling             | **react-native-unistyles ^3.3.0** (+ `react-native-nitro-modules`)                                                                                                         | `StyleSheet.create((theme, rt) => …)`, theme switching, runtime insets. A Babel plugin rewrites components under `src/` only.                                   | `src/theme/unistyles.ts`, `babel.config.js`                                                        |
| Animation           | **react-native-reanimated 4.5.1**, **react-native-worklets 0.10.1**                                                                                                        | The whole motion system: CSS keyframe animations, layout animations, springs, shared values, `scheduleOnRN`/`scheduleOnUI`.                                     | `src/theme/tokens/motion.ts`, `src/theme/motion/*`, `package.json → reanimated.staticFeatureFlags` |
| Local database      | **expo-sqlite ~57.0.3**                                                                                                                                                    | Device DB `streak.db` (WAL, foreign keys on), plus the synchronous `kv-store` used by Zustand persist.                                                          | `src/core/db/client.ts`, `src/core/storage/persistStorage.ts`                                      |
| ORM                 | **drizzle-orm ^0.45.3**, **drizzle-kit ^0.31.11**                                                                                                                          | Typed schema, queries and migrations for SQLite.                                                                                                                | `src/core/db/schema/*`, `drizzle.config.ts`, `src/core/db/migrations/*`                            |
| Backend             | **@supabase/supabase-js ^2.117.1**                                                                                                                                         | Auth (ID token, email OTP, session refresh) and the `profiles` table via PostgREST. Created lazily.                                                             | `src/core/supabase/client.ts`, `supabase/migrations/0001_profiles.sql`                             |
| Auth providers      | `@react-native-google-signin/google-signin ^16.1.5`, `expo-apple-authentication ~57.0.2`, `expo-crypto`                                                                    | Native Google and Apple sign-in. Nonce generation and hashing. UUIDs.                                                                                           | `src/features/auth/data/services/*`                                                                |
| Secure storage      | `expo-secure-store`, `aes-js ^3.1.2`, `@react-native-async-storage/async-storage 2.2.0`                                                                                    | `LargeSecureStore`: the AES key goes in SecureStore; the encrypted session goes in AsyncStorage.                                                                | `src/core/supabase/LargeSecureStore.ts`                                                            |
| Server state        | **@tanstack/react-query ^5.103.2**                                                                                                                                         | Query cache (profile, Apple availability) and mutations (sign-in). In memory only.                                                                              | `src/core/query/*`, `src/features/*/hooks/*`                                                       |
| Client state        | **zustand ^5.0.15** (+ `persist`)                                                                                                                                          | Auth/session status, onboarding progress, theme, sound and system motion.                                                                                       | `src/features/auth/state/authStore.ts`, `src/theme/state/*`, `src/shared/state/*`                  |
| Validation          | **zod ^4.6.5**                                                                                                                                                             | Env vars, email format, Supabase response rows.                                                                                                                 | `src/core/config/env.ts`, `src/features/auth/domain/email.ts`, `profileApi.ts`                     |
| Network status      | `@react-native-community/netinfo 12.0.1`                                                                                                                                   | Drives TanStack Query's `onlineManager`.                                                                                                                        | `src/core/query/onlineManager.ts`                                                                  |
| Keyboard            | `react-native-keyboard-controller 1.21.9`                                                                                                                                  | `KeyboardAwareScrollView` in `Screen`.                                                                                                                          | `src/shared/ui/Screen.tsx`                                                                         |
| Toasts              | `sonner-native ^0.27.0`                                                                                                                                                    | Success/info toasts, keyed by title.                                                                                                                            | `src/shared/ui/toast.ts`, `AppToaster.tsx`                                                         |
| Icons / SVG         | `lucide-react-native ^1.48.0`, `react-native-svg 15.15.4`                                                                                                                  | Icon set (mapped by name in `icons.ts`). SVG for the Google "G".                                                                                                | `src/shared/ui/icons.ts`, `GoogleLogo.tsx`                                                         |
| Fonts               | `@expo-google-fonts/inter`, `@expo-google-fonts/roboto`, `expo-font`                                                                                                       | Inter 400/500/600/700 for the UI. Roboto 500 for Google's button label (brand rule).                                                                            | `src/core/bootstrap/fonts.ts`, `src/theme/tokens/typography.ts`                                    |
| Feedback            | `expo-haptics`, `expo-audio ~57.0.5`                                                                                                                                       | Haptic patterns (ticks, ramps, sequences). Four WAV sound effects.                                                                                              | `src/shared/lib/haptics.ts`, `src/shared/lib/sounds.ts`, `assets/sounds/*`                         |
| System UI           | `react-native-edge-to-edge`, `expo-status-bar`, `expo-system-ui`, `expo-splash-screen`                                                                                     | Status/nav bar styling (`SystemBars`), splash control, root background colour.                                                                                  | `ThemeRuntimeBridge.tsx`, `src/core/bootstrap/splash.ts`                                           |
| Browser             | `expo-web-browser`                                                                                                                                                         | Opens Terms, Privacy and Help in an in-app browser.                                                                                                             | `src/shared/actions/external.ts`                                                                   |
| Build tooling       | Metro (Expo default), Babel (`babel-preset-expo`, `babel-plugin-inline-import`, Unistyles plugin), `expo-build-properties`, `expo-dev-client`                              | Bundling. `.sql` imports inlined as strings. Android R8/shrink in release. Dev client builds.                                                                   | `metro.config.js`, `babel.config.js`, `app.config.ts`                                              |
| Package manager     | **npm** (`package-lock.json`; no `bun.lock`)                                                                                                                               | The AGENTS.md "use bunx" rule doesn't apply.                                                                                                                    | `package-lock.json`, `.nvmrc` (Node **24**)                                                        |
| Testing             | **Jest ~29.7** + **jest-expo ~57** (`jest-expo/ios` preset), **@testing-library/react-native 13.3.3**, **sql.js** (in-memory SQLite for DAO tests), **Maestro** (E2E YAML) | Unit, ViewModel, component and DAO tests. E2E flows in `.maestro/`.                                                                                             | `jest.config.js`, `jest.setup.ts`, `test/**`, `.maestro/*.yaml`                                    |
| Lint / format       | ESLint 9 (`eslint-config-expo/flat`, Prettier plugin), Prettier 3                                                                                                          | Enforces MVVM import boundaries and zero warnings.                                                                                                              | `eslint.config.js`, `.prettierrc`                                                                  |
| CI                  | **GitLab CI**                                                                                                                                                              | typecheck, lint (Code Quality report), format, unit-tests (JUnit + Cobertura), SAST, secret detection, expo-health, npm audit, bundle export, manual EAS build. | `.gitlab-ci.yml`, `scripts/ci/*`, [CI.md](CI.md)                                                   |
| Cloud builds        | **EAS Build** (project `384ea1bd-…`, owner `faiz-glitch`)                                                                                                                  | development / preview / production profiles.                                                                                                                    | `eas.json`, `app.config.ts → extra.eas`                                                            |
| Hosting / CDN       | None for the app itself. Supabase is hosted by Supabase [C]. Region and plan: [U]                                                                                          | No EAS Update (`expo-updates` isn't installed), so there are no over-the-air updates [C].                                                                       | —                                                                                                  |
| Image handling      | Only static assets (icons, splash) and a remote avatar URL rendered by `Avatar` [C]                                                                                        | No image upload, cache library or `expo-image` [C].                                                                                                             | `src/shared/ui/Avatar.tsx`, `assets/*`                                                             |

**Installed but not imported by any app source [C]:** `date-fns`, `expo-blur`, `expo-glass-effect`. The
last is only mocked in `jest.setup.ts`; `useGlassSupport` was removed in `6fb7a06`. Whether any of the
three is still needed: [U]. `expo-linking`, `expo-constants`, `expo-asset` and
`react-native-nitro-modules` are peers of other packages and must stay [I].

### 2.2 Technology glossary (term → how Streak uses it)

| Term                                    | What it means                                                                                             | How this project uses it / where                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expo / CNG**                          | Expo is the React Native toolkit. Continuous Native Generation creates `ios/` and `android/` from config. | `android/` and `ios/` are gitignored. Native config lives in `app.config.ts` plugins. The local `android/` folder is generated output.          |
| **Development build / dev client**      | A custom native app containing your native modules. It replaces Expo Go.                                  | Required: `expo-audio`, Google Sign-In and others aren't in Expo Go. `npm run start` = `expo start --dev-client`.                               |
| **EAS**                                 | Expo Application Services (cloud build, submit, env vars).                                                | `eas.json` profiles. EAS environments hold the `EXPO_PUBLIC_*` values.                                                                          |
| **Expo Router / typed routes**          | File-system routing. Generates `Href` types for every route.                                              | Every file in `app/` is a route. `.expo/types/router.d.ts` is regenerated by `scripts/generate-route-types.js`.                                 |
| **Route group `(name)`**                | A folder that groups routes without adding a URL segment.                                                 | `(auth)` = onboarding and login. `(app)` = signed-in app. `(tabs)` = tab navigator.                                                             |
| **`Stack.Protected`**                   | Expo Router guard. A screen group is reachable only while its `guard` is true.                            | `app/_layout.tsx`: `canEnterApp` / `canEnterAuth` from `routeGuards()`. Flipping auth state redirects automatically.                            |
| **Form sheet**                          | A native bottom-sheet presentation of a stack screen.                                                     | `check-in`, `day/[date]`, `activity-editor`, `edit-field` in `app/(app)/_layout.tsx`.                                                           |
| **MVVM**                                | Model–View–ViewModel. Views render; ViewModels hold logic; the Model is data.                             | `*Screen.tsx` (View) + `use*ViewModel.ts` (ViewModel) + repositories (Model). Boundaries enforced in `eslint.config.js`.                        |
| **Repository**                          | An object that hides where data comes from.                                                               | `AuthRepository` → `SupabaseAuthRepository`; `ProfileRepository` → `LocalFirstProfileRepository`.                                               |
| **DAO**                                 | Data Access Object: the functions that run the queries.                                                   | `createAppMetaDao`, `createProfileDao`, `createGuestDataDao` (SQLite only).                                                                     |
| **DI / composition root**               | Wiring concrete implementations in one place and passing them down.                                       | `createRepositories()` in `src/core/di.ts`, provided by `<DiProvider>`, read by `useRepositories()`. Tests pass fakes.                          |
| **ORM**                                 | Object-Relational Mapper: typed code instead of raw SQL.                                                  | **Drizzle**: `sqliteTable` schemas, `db.select()/insert()/update()`. The drivers are synchronous (`.get()`, `.run()`).                          |
| **Migration**                           | A versioned schema change script.                                                                         | Local: Drizzle SQL in `src/core/db/migrations/`, run at boot by `useMigrations`. Remote: `supabase/migrations/0001_profiles.sql`, run manually. |
| **WAL**                                 | SQLite Write-Ahead Logging (readers don't block writers).                                                 | `PRAGMA journal_mode = WAL` in `client.ts`.                                                                                                     |
| **Local-first / offline-first**         | The device DB is the truth; the network refreshes it.                                                     | Profile reads hit SQLite first. Remote refresh runs only when online. `dirty` flags unsynced edits.                                             |
| **Soft delete**                         | Mark a row as deleted (`deleted_at`) instead of removing it.                                              | `deleted_at` on synced tables. The guest profile is retired this way.                                                                           |
| **Dirty flag**                          | A local marker that a row has changes not yet pushed.                                                     | `profiles.dirty`. `updateDisplayName` sets it and clears it on a successful push.                                                               |
| **Supabase**                            | Hosted Postgres + Auth (GoTrue) + REST (PostgREST).                                                       | Auth for Apple, Google and email. `public.profiles` with RLS. A trigger creates profiles.                                                       |
| **RLS**                                 | Postgres Row Level Security: per-row access policies.                                                     | Owner-only select/insert/update on `profiles`, and no delete policy.                                                                            |
| **anon key**                            | Supabase's public client key. Safe to ship because RLS protects the data.                                 | `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The `service_role` key must never be in the app.                                                               |
| **JWT / access & refresh tokens**       | A signed token proving identity. The access token is short-lived; the refresh token renews it.            | Managed entirely by supabase-js. Stored encrypted via `LargeSecureStore`. Refreshed only in the foreground.                                     |
| **OTP**                                 | One-time password (here, a 6-digit email code).                                                           | `requestEmailOtp` / `verifyEmailOtp`. `OTP_LENGTH = 6`. `OtpInput` supports autofill.                                                           |
| **OIDC ID token / nonce**               | A provider-signed identity token. The nonce binds it to one request (replay protection).                  | Apple gets `sha256(rawNonce)`; Supabase gets `rawNonce`. Google: ID token only.                                                                 |
| **TanStack Query**                      | A server-state cache (fetch, dedupe, retry, refetch, invalidate).                                         | Profile and Apple-availability queries, sign-in mutations. `staleTime 30s`. Retries only network errors.                                        |
| **`staleTime` / invalidation**          | How long data counts as fresh / marking it stale to refetch.                                              | 30 s default. A sign-in invalidates `['profile', id]`. Sign-out calls `queryClient.clear()`.                                                    |
| **Zustand / `persist`**                 | A small store library; the middleware saves state to storage.                                             | Four stores (section 9). Persisted synchronously to `expo-sqlite/kv-store`.                                                                     |
| **Unistyles**                           | A styling library with themes, breakpoints and runtime values, applied natively.                          | `StyleSheet.create((theme, rt) => …)`. `UnistylesRuntime.setTheme/updateTheme`. The Babel plugin rewrites `src/` only.                          |
| **Design tokens**                       | Named design values (colour, spacing, motion).                                                            | `src/theme/tokens/*`, composed by `buildTheme()`.                                                                                               |
| **Liquid Glass / `glass` style**        | The app's translucent material look (not Apple's API): radial-gradient backdrop and translucent cards.    | `VisualStyle = 'glass' \| 'classic'`. The default is `glass`. `src/theme/materials/glass.ts`.                                                   |
| **Reanimated / worklet / shared value** | UI-thread animation. A worklet is JS that runs on the UI thread. A shared value is state readable there.  | All motion. `'worklet'` functions (e.g. `landedPage`). `useSharedValue` in Pager and the tab bar.                                               |
| **Reduce Motion**                       | OS accessibility setting to minimise motion.                                                              | The in-app override `system/on/off`. `MotionRuntimeBridge` sets Reanimated's global mode.                                                       |
| **Hermes**                              | React Native's JS engine.                                                                                 | Default. CI's `expo export` proves the Hermes bundle compiles.                                                                                  |
| **R8 / resource shrinking**             | Android code and resource minification.                                                                   | Release builds only, via `expo-build-properties`.                                                                                               |
| **Maestro**                             | A mobile E2E test runner using YAML flows.                                                                | `.maestro/onboarding_guest.yaml`, `.maestro/login_email_validation.yaml`.                                                                       |
| **Guest mode**                          | Using the app without an account; data stays local.                                                       | `continueAsGuest()`: `guest_id` + `guest_active` in `app_meta`; a local `profiles` row with `provider='guest'`, `user_id=NULL`.                 |
| **Intensity level**                     | Heatmap darkness bucket 0–4.                                                                              | `intensityLevel()`: 0 → 0; 1 → 1; 2–3 → 2; 4–5 → 3; 6+ → 4.                                                                                     |

---

## 3. Project architecture

### 3.1 Folder structure [C]

```text
-Ada/
├─ app/                          Expo Router routes (screens only mount feature screens)
│  ├─ _layout.tsx                Root: providers → BootGate → Repositories → SessionGate → Stack (guards)
│  ├─ (auth)/                    onboarding.tsx (?step=0|1|2), login.tsx (?intent=new|existing)
│  └─ (app)/                     signed-in (or guest) and onboarded
│     ├─ _layout.tsx             Stack + form sheets
│     ├─ (tabs)/                 index (Home), insights, history, profile + custom TabBar
│     ├─ check-in.tsx  day/[date].tsx  activity-editor.tsx  edit-field.tsx   (sheets, placeholders)
│     ├─ heatmap.tsx             (placeholder)
│     └─ settings/[section].tsx  (appearance real; the other 5 placeholders)
├─ src/
│  ├─ core/                      App-wide infrastructure (no UI features)
│  │  ├─ bootstrap/              BootGate, boot tasks (env, fonts, migrations), splash
│  │  ├─ config/env.ts           zod-validated EXPO_PUBLIC_* env
│  │  ├─ db/                     SQLite client, Drizzle schema, migrations, appMetaDao
│  │  ├─ errors/                 AppError, isNetworkError, errorCode
│  │  ├─ providers/AppProviders  Gesture/SafeArea/Keyboard/QueryClient + theme & motion bridges
│  │  ├─ query/                  QueryClient factory, online/focus managers
│  │  ├─ storage/                Zustand persist storage (sync kv-store)
│  │  ├─ supabase/               client, LargeSecureStore, foreground-only token refresh
│  │  ├─ di.ts, DiProvider.tsx, RepositoriesProvider.tsx   composition root
│  ├─ features/
│  │  ├─ auth/        config, data (repo, remote api, local dao, services), domain, hooks, state, ui/login
│  │  ├─ onboarding/  config (steps, hero pattern), ui (screen, VM, step components)
│  │  ├─ profile/     data (local-first repo, dao, api, mappers), domain, hooks/useProfile, ui
│  │  ├─ settings/    config (sections, appearance copy), ui/appearance
│  │  ├─ activities/  config/seedActivities, domain/Activity   (no data layer yet)
│  │  └─ heatmap/     domain (intensity, grid)                  (no data layer yet)
│  ├─ shared/
│  │  ├─ actions/     navigation (the only router user), routes, params parsers, session, external
│  │  ├─ config/tabs.ts
│  │  ├─ lib/         haptics, sounds, confirm, links, date, format, random, useCountdown
│  │  ├─ state/       soundPreferencesStore
│  │  └─ ui/          ~40 reusable components (index.ts barrel)
│  ├─ theme/          tokens, buildTheme, materials, motion presets, hooks, state stores, runtime bridges
│  └─ types/sql.d.ts  `*.sql` module declaration
├─ supabase/migrations/0001_profiles.sql     Remote schema, RLS, triggers (applied manually)
├─ test/                          Jest helpers: render/providers, fakes, mocks, sql.js test DB
├─ .maestro/                      E2E flows
├─ scripts/                       generate-route-types.js, ci/*, sounds/build-sounds.py
├─ assets/                        icons, splash, sounds (+ sources, sound-timings.json)
├─ docs/                          SETUP, CI, MOTION, this file
└─ app.config.ts eas.json babel.config.js metro.config.js jest.config.js eslint.config.js drizzle.config.ts
```

> **Conflict flag [C]:** `AGENTS.md` says routes live in `src/app/`. They actually live in **`app/`**. The
> Babel Unistyles plugin (`root: 'src'`) and `generate-route-types.js` both assume `app/`.

### 3.2 Layer diagram

```text
User
 ↓  touch / gestures
View  (src/features/*/ui/*Screen.tsx, src/shared/ui/*)          renders + forwards events only
 ↓
ViewModel  (use*ViewModel.ts)                                     screen logic, calls actions/hooks
 ↓                         ↘
Actions (src/shared/actions)      Hooks (useProfile, useAuthMutations, useAuthSession)
 │  navigation → expo-router         │  TanStack Query (server-state cache)
 │  session → repositories + store   │  Zustand stores (client state)
 ↓                                   ↓
Repositories (interfaces)  ← wired in src/core/di.ts, provided by DiProvider
 ├─ SupabaseAuthRepository      coordinates Apple/Google SDKs, Supabase Auth, local persistence
 └─ LocalFirstProfileRepository SQLite first, Supabase refresh
 ↓                                   ↓
Data sources
 ├─ local:  DAOs (Drizzle) ──► expo-sqlite  streak.db
 ├─ remote: authApi / profileApi (supabase-js) ──► Supabase (GoTrue Auth, PostgREST, Postgres + RLS)
 └─ services: Apple, Google, Crypto (native SDK wrappers)
```

### 3.3 Layers in plain language

- **Routes (`app/`).** Thin files. They parse URL params with the pure parsers in
  `src/shared/actions/params.ts` and render a feature screen or `PhasePlaceholder`. No styling lives here,
  because the Unistyles Babel plugin only processes `src/`.
- **Views.** Components with no business logic. ESLint forbids views from importing Zustand, stores,
  `@/core/*`, data layers, Supabase, Drizzle or `expo-router`.
- **ViewModels.** Hooks returning plain props and handlers, e.g. `useLoginViewModel`,
  `useOnboardingViewModel`, `useProfileViewModel`, `useAppearanceSettingsViewModel`.
- **Actions (`src/shared/actions`).** The **only** place `expo-router` is used from `src/`. `routes.ts`
  is the only place paths are written. `session.ts` does finish-onboarding and sign-out.
- **Repositories.** Interfaces owned by features. Concrete classes are constructed only in `di.ts`.
- **Data sources.** DAOs (SQLite only) and APIs (Supabase only), each isolated by lint rules.
- **Core.** Boot, config, DB, Supabase client, query client, providers.
- **Theme.** Tokens → `buildTheme()` → Unistyles. The motion system (`src/theme/motion`, `tokens/motion.ts`)
  and two runtime bridges (theme and motion) do the side effects.

### 3.4 Root component tree (`app/_layout.tsx`) [C]

```text
<AppProviders>                  GestureHandlerRoot → SafeArea → Keyboard → QueryClientProvider
  <MotionRuntimeBridge/>        Reduce Motion → Reanimated global mode
  <BootGate>                    env + fonts + migrations (splash held); error → BootErrorScreen
    <RepositoriesProvider>      createRepositories() once → <DiProvider>
      <SessionGate>             restoreSession() + onAuthStateChange; hides splash when ready
        <NavigationTheme>       React Navigation colours = app theme (no white flash)
          <RootNavigator>       useAuthAutoRefresh; Stack with Protected (app) / (auth)
        <AppToaster/>
  <ThemeRuntimeBridge/>         last child: theme veil sits above everything
```

Module-load side effects [C]:

- `index.ts` imports `expo-router/entry`, then `src/theme/unistyles.ts`, which calls
  `StyleSheet.configure`.
- `AppProviders.tsx` wires the online and focus managers and creates the `QueryClient`.
- `BootGate.tsx` calls `keepSplashVisible()`.
- `db/client.ts` opens the DB and runs the PRAGMAs.

---

## 4. How this application works

Only flows that exist are listed. Check-in create/edit/delete, search, filtering, pagination, file
uploads and notifications **don't exist yet** [C].

### 4.1 App launch / boot

1. `index.ts` loads the router entry, then `src/theme/unistyles.ts`. That reads persisted theme
   preferences **synchronously**, builds light and dark themes, and sets the initial scheme.
2. `BootGate.tsx` keeps the native splash up (`preventAutoHideAsync`, 250 ms fade).
3. `useAppBootstrap()` combines three tasks with `combineBootState()` (first failure wins):
   - `envTask`: `envResult` from zod. A failure shows "Streak is missing its configuration" and lists
     the bad **key names only**.
   - `useFontsTask`: `useFonts(APP_FONTS)`.
   - `useMigrationsTask`: Drizzle `useMigrations(db, migrations)`. A failure shows "Streak could not
     update its local database".
4. On an error, the splash hides and `BootErrorScreen` shows (system fonts, on purpose).
5. When ready, `RepositoriesProvider` runs `createRepositories()` once. That calls `requireEnv()` and
   `getSupabase()` and configures Google Sign-In.
6. `SessionGate` runs `useAuthSession()` (flow 4.4). When it resolves, the splash is hidden and the
   navigator renders.
7. The `Stack.Protected` guards pick the group: `(app)` if in a session and onboarded, otherwise `(auth)`.

### 4.2 Navigation rules

- The guards are pure: `routeGuards(status, hasCompletedOnboarding)` in
  `src/features/auth/domain/guards.ts`.
  - `canEnterApp = (signedIn || guest) && hasCompletedOnboarding`
  - `canEnterAuth = status !== 'booting' && !canEnterApp`
- Sign-in, sign-out and finishing onboarding **never call the router**. They change store state and the
  guard moves the person.
- The `(auth)` initial route is:
  - **first launch** → `onboarding?step=0` (Welcome);
  - **in a session but not onboarded** (e.g. the app was killed mid-setup) → `onboarding?step=1`;
  - **signed out after onboarding** → `login?intent=existing`.
- Onboarding steps change in place with `router.setParams({ step })` via `showOnboardingStep`. The pager
  shows all three pages side by side. The Android hardware back button goes back one page.
- Tabs: `goTab()` → `router.navigate`. The custom `TabBar` (liquid bubble, centre **+** FAB) calls
  `openCheckIn()`.
- Transitions come from `useNavigationMotion()`:
  - push: `ios_from_right`;
  - group switch and tabs: `fade`;
  - Reduce Motion makes everything a fade.

### 4.3 Registration and login (all providers)

The entry point is `LoginScreen` → `useLoginViewModel(intent)` → `useSignInAttempt(intent)` →
`useAuthMutations()` → `AuthRepository`.

**Common path (`useSignInAttempt.attempt`):**

1. A light haptic, and old feedback is cleared.
2. If `intent === 'new'`, `restartOnboarding()` runs, so a new account always goes through setup.
3. The mutation's `onMutate` sets `pendingProvider`. Every other control is disabled while it's set.
4. Repository call (per provider, below).
5. `completeSignIn(user)` [C, `SupabaseAuthRepository`]:
   1. `profiles.saveFromAuth(user)` upserts the local row (never clearing a name or avatar the provider
      didn't send).
   2. If `guest_id` exists, `guestData.reassignGuestData(guestId, user.id, now)` runs in a transaction.
   3. `guest_active` is removed.
   4. `last_user_id = user.id` is set.
6. The mutation's `onSuccess` runs `setUser(user)` (status becomes `signedIn` or `guest`) and invalidates
   `['profile', user.id]`.
7. `continueAfterSignIn`:
   1. A success haptic.
   2. If onboarding isn't complete and (intent is new or the user is a guest), it runs
      `openOnboarding(1, { replace: true })`.
   3. Otherwise it runs `finishOnboarding({ silent: true })` and shows "Signed in with X" (not for
      guests). The guard then opens Home.
8. On failure, `feedbackFor(error)`:
   - `Cancelled` → silent;
   - `InvalidOtp` → message under the code field;
   - `Network` / `ProviderUnavailable` / `Unknown` → a banner.

   Only the error _kind_ is logged (`TODO(Sentry)`).

**Per provider:**

| Provider                                                            | Steps [C]                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Apple** (iOS only; the button shows only if `isAppleAvailable()`) | 1. `crypto.randomNonce()` (32 random bytes, hex). 2. `AppleAuthentication.signInAsync({ nonce: sha256(raw), scopes: FULL_NAME, EMAIL })`. 3. `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce: raw })`. 4. Apple sends the name only on the first sign-in, so it's saved via `auth.updateUser({ data: { full_name } })` **and** `profiles.updateDisplayName` (failures are logged, never fatal). |
| **Google**                                                          | 1. On Android, `hasPlayServices`. 2. `GoogleSignin.signIn()` (a `cancelled` response throws `AuthError('Cancelled')`). 3. `signInWithIdToken({ provider: 'google', token: idToken })`. No nonce; Supabase's "Skip nonce check" must be on (see SETUP.md).                                                                                                                                                          |
| **Email OTP**                                                       | 1. Validate with zod (`normalizeEmail` = trim + lower-case). 2. `auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`. The step changes to `code` and a resend cooldown starts. 3. On the 6th digit, `auth.verifyOtp({ email, token, type: 'email' })`. `otp_expired` or HTTP 403 maps to `InvalidOtp`.                                                                                             |
| **Guest** ("Skip")                                                  | `continueAsGuest()`: reuses `guest_id` or creates a UUID; sets `guest_active='1'`; `ensureGuest` inserts a local profile (`provider='guest'`, `user_id NULL`) if missing. **No network.**                                                                                                                                                                                                                          |

On Supabase's side, the `on_auth_user_created` trigger inserts a `public.profiles` row for every new
auth user [C, SQL].

### 4.4 Session restoration (cold start)

`useAuthSession()` → `auth.restoreSession()` [C]:

1. `supabase.auth.getSession()`. supabase-js reads the encrypted session through `LargeSecureStore` and
   may refresh an expired access token [I].
2. If there's a session user, `saveFromAuth(user)` runs and the user is returned (`signedIn`).
3. If it throws a **network** error (offline with an expired token), `lastSignedInUser()` rebuilds the
   user from the local profile of `last_user_id`. The person stays signed in offline.
4. Otherwise, if `guest_id` exists **and** `guest_active === '1'`, the guest user is returned (`guest`).
5. Otherwise `null` (`signedOut`). Any other error is logged, and the app treats the person as signed
   out.
6. `ready = true`, the splash hides, and the guard routes.

In parallel, `auth.onAuthStateChange` feeds `applyRemoteSession()`. That only acts when `status ===
'signedIn'`: it updates the user, or signs out if the remote session ended. Sign-ins are applied by the
sign-in flow itself, not by this listener.

Token refresh: `useAuthAutoRefresh()` calls `startAutoRefresh()` when the app is `active` and
`stopAutoRefresh()` otherwise (Supabase's React Native guidance).

### 4.5 Logout

`useSessionActions().signOut()` in `src/shared/actions/session.ts` [C]:

1. A native confirm (`Alert`), with different copy for guests and members.
2. `auth.signOut()`:
   - **Guest:** remove `guest_active` only. Guest data and `guest_id` stay so the guest can resume later.
   - **Member:** `google.signOut()` (never throws), then `supabase.auth.signOut({ scope: 'local' })`
     (this device only), then remove `last_user_id`.
3. On failure: a toast, "You're offline" (network) or "Couldn't log out". The person stays signed in.
4. On success: `setUser(null)`, `queryClient.clear()`, and a "Signed out" toast. `useSessionScopedToasts`
   clears the old session's toasts first. The guard sends the person to Login (existing).

### 4.6 Onboarding

`OnboardingScreen` + `useOnboardingViewModel` [C]:

- **Step 0 (Welcome):**
  - the `HoldableHeatmap` hero (a deterministic 14×7 grid from `seededRandom(7)`);
  - "Get started" → `openLogin('new')`;
  - "I already have an account" → `openLogin('existing')`.
- **Step 1 (Intensity):** explains the levels (`IntensityGuide`, staggered in).
- **Step 2 (Setup):**
  - toggles activities from `SEED_ACTIVITIES` (defaults: workout, deep-work, reading);
  - the reminder toggle is saved to the draft only (scheduling is Phase 6 [P]);
  - "Start tracking" is disabled with 0 activities.
- **Finish (Start tracking / Skip):** `finishOnboarding()`. If signed out, it first runs
  `continueAsGuest()` and `setUser`. Then `completeOnboarding()`, a success haptic and the "You're all
  set" toast. The guard fades to Home.
- The draft (`selectedActivityIds`, `reminderEnabled`) is **persisted in `streak.auth` but not yet
  written to any table** [C]. Phase 2 needs to consume it [P].

### 4.7 Profile tab (the only real app screen)

`useProfileViewModel` → `useProfile(user)` [C]:

1. The local query `['profile', id]` reads SQLite (`networkMode: 'always'`), so it works offline.
2. For members, the remote query `['profile', id, 'remote']` runs `refreshFromRemote`. That fetches from
   Supabase, skips the update if the local row is dirty, otherwise writes SQLite, then calls
   `setQueryData` on the local key.
3. The screen shows `profileTitle()` (guest → "Guest"; else display name, email, or "Streak member"),
   the avatar, Appearance, and Log out.

### 4.8 Appearance settings / theme change

`AppearanceSettingsScreen`: Theme (System/Light/Dark), Reduce Motion (System/On/Off), Sound effects
(toggle). Changing the theme [C]:

1. The store updates (persisted synchronously).
2. `ThemeRuntimeBridge` resolves the scheme and calls `Appearance.setColorScheme`, so native controls
   follow.
3. A veil in the _current_ canvas colour fades in (100 ms). The Unistyles themes are swapped underneath,
   along with the root background and the system bar style.
4. After a 2-frame hold the veil lifts (220 ms).
5. The veil is skipped at launch, with Reduce Motion, and when the app isn't active.

### 4.9 Caching flow (what is cached where)

See also [section 9](#9-state-management) and [section 12](#12-optimization-memory).

| Data                    | Where it's cached                                                       | Fresh / invalidated                                                                       |
| ----------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Profile                 | SQLite `profiles` (durable) + TanStack `['profile', id]` (memory)       | `staleTime 30s`. Refetch on focus/reconnect. Invalidated on sign-in. Cleared on sign-out. |
| Remote profile fetch    | TanStack `['profile', id, 'remote']`                                    | Same. Online only (`networkMode: 'online'`). Guests are skipped.                          |
| Apple availability      | TanStack `['auth', 'apple-available']`                                  | `staleTime: Infinity`.                                                                    |
| Supabase session        | `LargeSecureStore` (AES key in SecureStore, ciphertext in AsyncStorage) | Managed by supabase-js. Refresh only in the foreground.                                   |
| Preferences, onboarding | `expo-sqlite/kv-store` via Zustand persist                              | Written synchronously on every change.                                                    |
| Device bookkeeping      | SQLite `app_meta`                                                       | Written by the auth repository.                                                           |
| Sound players           | In-memory `Map` in `sounds.ts`                                          | Created once and kept for the app's lifetime.                                             |

### 4.10 Error handling

- **Boot:** `BootErrorScreen` for bad env, fonts or migrations.
- **Errors as types:** `AppError(code, message, underlying)` → `AuthError` codes. `isNetworkError()`
  recognises `AppError('Network')` and React Native's `TypeError: Network request failed`.
- **Supabase errors:** mapped at the data-source edge (`toAuthError` in `authApi.ts`, `toAppError` in
  `profileApi.ts`). Server rows are validated with zod and never cast.
- **Retries:** queries retry network errors only (≤2); mutations never retry.
- **Feedback is best-effort:** haptics and sounds swallow all errors.
- **Logging:** `console.error` with error kind only, never tokens, codes or emails. `TODO(Sentry)` marks
  where reporting goes.

---

## 5. Database memory

There are two databases. The device **SQLite** is the source of truth for the app. The remote **Supabase
Postgres** receives and serves the signed-in user's profile.

### 5.1 Local SQLite (`streak.db`) [C]

- **Technology:** expo-sqlite, `openDatabaseSync('streak.db', { enableChangeListener: true })`, then
  `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`.
- **ORM:** Drizzle (`drizzle-orm/expo-sqlite`). The shared DAO type is
  `AppDatabase = BaseSQLiteDatabase<'sync', …>`, so the same DAOs run against sql.js in tests.
- **Migrations:** generated by `npm run db:generate` (`drizzle-kit generate`) into
  `src/core/db/migrations/`. They're bundled as strings (the Metro `sql` extension plus
  `babel-plugin-inline-import`) and run at boot by `useMigrations`. There is one migration: `0000_init`.
- **Seed data:** none in the DB. `SEED_ACTIVITIES` is an in-code template list (onboarding only).
- **Transactions:** `reassignGuestData` (the only one).

#### Table `app_meta`

| Field   | Type                                                                              | Notes                    |
| ------- | --------------------------------------------------------------------------------- | ------------------------ |
| `key`   | TEXT **PK**; TS enum `guest_id \| guest_active \| last_user_id \| last_pulled_at` | enum not enforced in SQL |
| `value` | TEXT NOT NULL                                                                     |                          |

- **Purpose:** local-only device bookkeeping. Never synced.
- **Keys:**
  - `guest_id`: the guest profile's id, kept after a guest logs out so their data can be resumed.
  - `guest_active`: `'1'` while a guest session is in progress.
  - `last_user_id`: the most recent member, used for offline restore.
  - `last_pulled_at`: the sync watermark, **unused** [P, Phase 5].
- **Used by:** `createAppMetaDao` (`get/set/remove`), `createGuestDataDao` (deletes the guest keys).
- **Foreign keys and indexes:** none beyond the PK.

#### Table `profiles`

| Field          | Type                                                 | Notes                                                    |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `id`           | TEXT **PK**                                          | Auth user id for members; a device UUID for guests       |
| `user_id`      | TEXT NULL                                            | NULL for the guest profile; set to the user id otherwise |
| `created_at`   | TEXT NOT NULL                                        | ISO-8601 UTC                                             |
| `updated_at`   | TEXT NOT NULL                                        | ISO-8601 UTC                                             |
| `deleted_at`   | TEXT NULL                                            | Soft delete (a retired guest profile)                    |
| `dirty`        | INTEGER (boolean) NOT NULL DEFAULT false             | Local-only: unsynced edits                               |
| `email`        | TEXT NULL                                            |                                                          |
| `display_name` | TEXT NULL                                            |                                                          |
| `username`     | TEXT NULL                                            | (unique remotely, not locally)                           |
| `avatar_url`   | TEXT NULL                                            |                                                          |
| `provider`     | TEXT NOT NULL; TS enum `apple\|google\|email\|guest` | enum not enforced in SQL                                 |
| `time_zone`    | TEXT NOT NULL                                        | IANA zone from `Intl` (fallback `UTC`)                   |

- **Common columns:** the first six come from `syncColumns()` in `src/core/db/schema/columns.ts`, the
  shape every synced table will carry.
- **Constraints:** PK only. No foreign keys, no indexes, no CHECK constraints.
- **Used by:** `createProfileDao`, `createGuestDataDao`.

#### Relationships (logical; **not** enforced by foreign keys)

```text
app_meta[last_user_id] ──► profiles.id   (member)
app_meta[guest_id]     ──► profiles.id   (guest profile, user_id NULL)
profiles.id == Supabase auth.users.id    (members only)
Planned [P]: profiles 1 ─── N activities 1 ─── N check_ins   (via user_id; NULL for guest rows)
```

### 5.2 Remote Supabase Postgres (`supabase/migrations/0001_profiles.sql`) [C]

`public.profiles` fields and constraints:

| Field          | Type        | Constraint / default                                                   |
| -------------- | ----------- | ---------------------------------------------------------------------- |
| `id`           | uuid        | **PK**, **FK → `auth.users(id)` ON DELETE CASCADE**                    |
| `email`        | text        |                                                                        |
| `display_name` | text        |                                                                        |
| `username`     | text        | **UNIQUE**                                                             |
| `avatar_url`   | text        |                                                                        |
| `provider`     | text        | NOT NULL, default `'email'`, **CHECK in (`apple`, `google`, `email`)** |
| `time_zone`    | text        | NULL until the device reports it                                       |
| `created_at`   | timestamptz | NOT NULL, default `now()`                                              |
| `updated_at`   | timestamptz | NOT NULL, default `now()`                                              |
| `deleted_at`   | timestamptz | Soft delete                                                            |

**RLS:**

- enabled;
- policies for **select, insert and update** where `auth.uid() = id`, for the `authenticated` role;
- **no delete policy**;
- `GRANT select, insert, update … TO authenticated`.

**Triggers:**

- `on_auth_user_created` (AFTER INSERT on `auth.users`) → `handle_new_user()`. This `SECURITY DEFINER`
  function (with `search_path=''`) inserts id, email, name (`full_name` or `name`), avatar and provider
  from the user metadata, `ON CONFLICT DO NOTHING`.
- `profiles_set_updated_at` (BEFORE UPDATE) → `set_updated_at()`.

**Indexes:** the PK plus the implicit unique index on `username`.

**Local vs remote schema differences [C]** (flag these when building sync):

| Aspect      | Local SQLite   | Remote Postgres |
| ----------- | -------------- | --------------- |
| `user_id`   | Yes            | No              |
| `dirty`     | Yes            | No              |
| `provider`  | Allows `guest` | Doesn't         |
| `time_zone` | NOT NULL       | Nullable        |
| `username`  | Not unique     | Unique          |
| Timestamps  | TEXT           | `timestamptz`   |

Applied to the live project? The docs say it's run manually in the SQL editor: [U].

---

## 6. Query memory

All local queries are Drizzle on a **synchronous** driver: `.get()` returns one row, `.run()` executes,
and both run on the JS thread. The SQL shown is the equivalent [I, Drizzle-generated SQL isn't logged].

| #   | Query (file → function)                                                  | Equivalent SQL / meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Why written this way / concerns                                                                                                |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `appMetaDao.get(key)`                                                    | `SELECT value FROM app_meta WHERE key = ?` → the value or null.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Tiny table keyed by PK: instant.                                                                                               |
| 2   | `appMetaDao.set(key, value)`                                             | `INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`. **Meaning:** create or overwrite one setting.                                                                                                                                                                                                                                                                                                                                                                           | Upsert avoids read-then-write.                                                                                                 |
| 3   | `appMetaDao.remove(key)`                                                 | `DELETE FROM app_meta WHERE key = ?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                                                                                              |
| 4   | `profileDao.getById(id)`                                                 | `SELECT * FROM profiles WHERE id = ?`. Doesn't filter `deleted_at`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 | PK lookup.                                                                                                                     |
| 5   | `profileDao.saveAuthIdentity(identity, now)`                             | `INSERT INTO profiles (id, user_id=id, email, display_name, avatar_url, provider, time_zone, created_at, updated_at, dirty=0) … ON CONFLICT(id) DO UPDATE SET email = coalesce(excluded.email, email), display_name = coalesce(excluded.display_name, display_name), avatar_url = coalesce(excluded.avatar_url, avatar_url), provider = ?, deleted_at = NULL, updated_at = ?`. **Meaning:** record who just signed in without wiping a name or photo the provider didn't send this time; revive a soft-deleted row. | `coalesce` preserves data (e.g. Apple's name only arrives once). **Doesn't** update `time_zone` or `dirty` on conflict.        |
| 6   | `profileDao.insertGuestIfMissing(guestId, tz, now)`                      | `INSERT … (provider='guest', user_id=NULL) ON CONFLICT(id) DO NOTHING`                                                                                                                                                                                                                                                                                                                                                                                                                                              | Idempotent: a guest who resumes keeps their row.                                                                               |
| 7   | `profileDao.replaceFromRemote(row)`                                      | Upsert of the whole server row with `user_id = id, dirty = 0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The **caller** must skip this while the row is dirty (`LocalFirstProfileRepository.refreshFromRemote`).                        |
| 8   | `profileDao.setDisplayName(id, name, now, dirty)`                        | `UPDATE profiles SET display_name = ?, updated_at = ?, dirty = ? WHERE id = ?`                                                                                                                                                                                                                                                                                                                                                                                                                                      | Local write first; then a push.                                                                                                |
| 9   | `profileDao.markClean(id)`                                               | `UPDATE profiles SET dirty = 0 WHERE id = ?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | After a successful push.                                                                                                       |
| 10  | `guestDataDao.reassignGuestData(guestId, userId, now)` (**transaction**) | `BEGIN; UPDATE profiles SET user_id = :userId, deleted_at = :now, updated_at = :now WHERE id = :guestId AND user_id IS NULL; DELETE FROM app_meta WHERE key IN ('guest_id', 'guest_active'); COMMIT;` **Meaning:** hand the guest's data to the new account, retire the guest profile, forget guest mode, all or nothing.                                                                                                                                                                                           | Phase 2 adds the same `UPDATE … SET user_id, dirty=1 WHERE user_id IS NULL` for activities and check-ins [P, comment in file]. |

**Remote (supabase-js → PostgREST)** in `src/features/profile/data/remote/profileApi.ts`:

| #   | Call                                                                                                                                                  | Meaning                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `from('profiles').select('id,email,display_name,username,avatar_url,provider,time_zone,created_at,updated_at,deleted_at').eq('id', id).maybeSingle()` | Get my profile row (0 or 1). Validated by the zod `remoteProfileSchema`; an unknown `provider` becomes `'email'` (`.catch`). RLS restricts it to the caller's row anyway. |
| R2  | `from('profiles').update({ display_name }).eq('id', id)`                                                                                              | Rename me. The server trigger bumps `updated_at`.                                                                                                                         |

**Server-side SQL (Postgres):**

- `handle_new_user()`: "When someone signs up, create their profile from the provider's metadata, and do
  nothing if it already exists."
- `set_updated_at()`: "Stamp `updated_at` on every profile update."

**Not present [C]:** search, filtering, sorting, pagination, joins, aggregation. The heatmap
aggregation will be the first performance-sensitive query (Phase 2) [P]. See
[section 12](#12-optimization-memory) for index recommendations.

---

## 7. API memory

There is **no custom backend or REST API** in this repo [C]. Every remote call goes through
**supabase-js** to the Supabase project at `EXPO_PUBLIC_SUPABASE_URL`. The HTTP endpoints below are what
supabase-js uses internally [I, library behaviour, not written in project code].

| Method → endpoint [I]                                            | App function [C]                                              | Auth required | Request                           | Response / errors [C]                                                    | DB effect                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------- | ------------- | --------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `POST /auth/v1/token?grant_type=id_token`                        | `authApi.signInWithIdToken('apple'\|'google', token, nonce?)` | No (anon key) | provider, ID token, nonce (Apple) | session + user → `mapAuthUser`. Errors → `AuthError` (Network / Unknown) | Creates the `auth.users` row on first sign-in → trigger creates `profiles` |
| `POST /auth/v1/otp`                                              | `authApi.requestEmailOtp(email)`                              | No            | email, `create_user: true`        | void. Errors → `AuthError`                                               | May create the auth user                                                   |
| `POST /auth/v1/verify`                                           | `authApi.verifyEmailOtp(email, code)`                         | No            | email, token, type `email`        | session + user. `otp_expired` or 403 → `InvalidOtp`                      | —                                                                          |
| `PUT /auth/v1/user`                                              | `authApi.updateFullName(fullName)`                            | Yes (Bearer)  | `data.full_name`                  | void                                                                     | `auth.users.raw_user_meta_data`                                            |
| (local read; may `POST /auth/v1/token?grant_type=refresh_token`) | `authApi.getSessionUser()`                                    | Refresh token | —                                 | user or null. Network errors → offline restore                           | —                                                                          |
| `POST /auth/v1/logout?scope=local`                               | `authApi.signOut()`                                           | Yes           | —                                 | void. Offline → error shown as a toast                                   | Revokes this device's session                                              |
| `GET /rest/v1/profiles?select=…&id=eq.{id}`                      | `profileApi.fetch(id)`                                        | Yes (RLS)     | —                                 | `RemoteProfile \| null` (zod-validated)                                  | read `public.profiles`                                                     |
| `PATCH /rest/v1/profiles?id=eq.{id}`                             | `profileApi.updateDisplayName(id, name)`                      | Yes (RLS)     | `{ display_name }`                | void                                                                     | update `public.profiles`                                                   |
| realtime auth events (in-process)                                | `authApi.onAuthStateChange(cb)`                               | —             | —                                 | `AuthUser \| null`                                                       | —                                                                          |

- **Base URL / environments:** one variable, `EXPO_PUBLIC_SUPABASE_URL`, per EAS environment
  (`development` / `preview` / `production`). Whether these point to different Supabase projects: [U].
- **Headers [I]:** supabase-js sends `apikey: <anon key>`, plus `Authorization: Bearer <access token>`
  once signed in.
- **Validation:**
  - client side: zod on email and on response rows;
  - server side: RLS, the `provider` CHECK, and `username` UNIQUE.
- **Response format:** supabase-js `{ data, error }`. It's wrapped by `run()` in `authApi.ts` and the
  `if (error) throw` checks in `profileApi.ts`.
- **Retry:** TanStack retries network errors (≤2) for queries. Auth mutations are never retried.
  supabase-js has its own internal refresh retries [I].
- **Rate limiting:** Supabase's platform limits (e.g. OTP sends) [I]. Exact values: [U]. The app adds
  `RESEND_COOLDOWN_SECONDS` on the resend button [C].
- **Other external URLs:** `${EXPO_PUBLIC_LEGAL_BASE_URL}/{terms|privacy|acknowledgements}` and `/help`,
  opened in the in-app browser (`src/shared/lib/links.ts`). Hosting of that site: [U].

---

## 8. UI / frontend memory

### 8.1 Screens [C]

| Route                                                            | Screen                                                                                                          | State                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------- |
| `/(auth)/onboarding?step=0\|1\|2`                                | `OnboardingScreen` (pager: Welcome, Intensity, Setup)                                                           | Real                  |
| `/(auth)/login?intent=new\|existing`                             | `LoginScreen` (providers → email → code)                                                                        | Real                  |
| `/(app)/(tabs)/` (Home)                                          | `PhasePlaceholder` (phase 2)                                                                                    | Placeholder           |
| `/insights`, `/history`                                          | `PhasePlaceholder` (phase 3)                                                                                    | Placeholder           |
| `/profile`                                                       | `ProfileScreen`                                                                                                 | Real (Phase 1 subset) |
| `/settings/[section]`                                            | `AppearanceSettingsScreen` for `appearance`; placeholder for account, notifications, activities, privacy, about | Partial               |
| `/heatmap?view=&year=&month=`                                    | placeholder (phase 2)                                                                                           | Placeholder           |
| `/check-in?date=&logId=` (sheet 0.92)                            | placeholder (phase 2)                                                                                           | Placeholder           |
| `/day/[date]` (sheet 0.6/0.95)                                   | placeholder (phase 2)                                                                                           | Placeholder           |
| `/activity-editor?id=` (sheet)                                   | placeholder (phase 4)                                                                                           | Placeholder           |
| `/edit-field?field=name\|username\|email\|timezone` (sheet, fit) | placeholder (phase 4)                                                                                           | Placeholder           |

Every route param is untrusted, deep links included. They're parsed by pure functions in
`src/shared/actions/params.ts` with safe fallbacks.

### 8.2 Reusable components (`src/shared/ui`, exported via `index.ts`) [C]

- **Layout:**
  - `Screen`: SafeArea + `Backdrop` + optional `KeyboardAwareScrollView`, a `withTabBar` clearance of
    104 pt, and `inset` of `default` (16) or `wide` (24).
  - `NavBar`, `Card` (`tight`, `divided`, `accentSoft`), `ListRow` (icon, chevron or toggle trailing,
    danger), `EmptyState`, `PhasePlaceholder`, `OrDivider`.
- **Text and inputs:** `Text` (typography variants and tones), `TextField`, `OtpInput` (one hidden real
  `TextInput` for autofill and accessibility), `Toggle` (native switch), `SegmentedControl` (radio
  group).
- **Buttons:**
  - `Button` (primary / secondary / ghost / quiet / danger; `sm`/`md`; loading label cross-fade);
  - `IconButton` (a 44 pt touch target);
  - `PressableScale` (the base press feedback for everything; respects `PressDelay`);
  - `SsoButton` (native Apple button; Google "G" in Roboto; a "Connecting…" overlay).
- **Feedback:** `Banner` (inline error, fadeUp), `AppToaster` + `showSuccess` / `showInfo` (keyed by
  title to de-duplicate), `ContentSwap` (fade content in place), `Crossfade` (two renderings, e.g. a
  font weight change; internal).
- **Domain visuals:**
  - `Heatmap` (weeks mode; `animateIn`; `cellMotion`) and `HeatCell` (memo; levels 0–4; today, selected
    and future states; pulse);
  - `HoldableHeatmap` (press-hold → collapse and rebuild with sound and haptics);
  - `LogoMark` (a 3×3 heatmap mark; hold → flip);
  - `IntensityGuide`, `ActivityGrid` + `SelectableTile`, `ActivityBadge`, `IconBadge`, `Avatar`,
    `GoogleLogo`.
- **Navigation chrome:** `TabBar` (custom floating bar + centre FAB), `TabBarItem`, `LiquidBubble`,
  plus the hooks `useLiquidTabBar`, `useLiquidDrag` and `useTabBarLayout`, and the pure geometry in
  `tabSlots.ts`.
- **Paging:** `Pager` (a native horizontal paging ScrollView; UI-thread `progress`) and `PageDots`.
  `ScreenTransition` does in-screen page changes with a direction.

Forms, modals, tables, pagination and search components don't exist [C]. Form sheets are native stack
presentations.

### 8.3 Patterns to reproduce

1. **New screen:**
   1. Create `src/features/<f>/ui/<Name>Screen.tsx` (a View) and `use<Name>ViewModel.ts`.
   2. Add a route file in `app/` that parses params and renders the screen.
   3. Add a path builder in `routes.ts` and an action in `navigation.ts`.
   4. Don't import `expo-router`, stores or data from the View; ESLint will fail.
2. **Styling:** `StyleSheet.create((theme, rt) => ({ … }))` from `react-native-unistyles`. Use
   functions for dynamic styles (`styles.card(tight, tone)`). Use tokens only (`theme.spacing.*`,
   `theme.radii.*`, `theme.colors.*`). Glass variants use `theme.glass?.… ?? theme.colors.…`.
3. **Motion:** ask the motion system by meaning (`useMotion()`, `usePressMotion`, `layoutMotion.*`,
   `motion.timing(...)`). Never write raw durations in components. Animate transform and opacity only
   for continuous motion. See [MOTION.md](MOTION.md).
4. **Feedback:** `haptics.*` and `sounds.play(name)`. Both are fire-and-forget and never throw.
5. **Loading / empty / error states:**
   - `Button loading` (content cross-fade);
   - `SsoButton` overlay;
   - `EmptyState` / `PhasePlaceholder`;
   - `Banner` for inline errors;
   - toasts for outcomes;
   - `BootErrorScreen` for fatal boot errors.

### 8.4 Theme system [C]

- **Preferences** (`useThemePreferencesStore`): `preference` (system/light/dark, default system),
  `paletteId` (meadow/ocean/violet/amber, default meadow), `style` (glass/classic, default **glass**),
  `reduceMotion` (system/on/off, default system).
- **No UI sets `paletteId` or `style` yet [C].** Only the store's own setters and tests reference them,
  so every user gets glass + meadow.
- **`buildTheme(scheme, paletteId, style)`** is pure and composes the tokens:
  - `colors`, `activity`, `heat` (5 steps), `brand`, `elevation`;
  - `glass` (material or null), `typography`, `fonts`;
  - `spacing` (4-pt scale; gutter 16; stack 14);
  - `radii` (card 20, sheet 28, pill 999).
- **Breakpoints:** `xs: 0`, `md: 600`.
- **Brand green** is identical in both schemes (`tokens/brand.ts`).
- **Light-mode contrast** is WCAG-AA (commit `3a28839`; `contrast.test.ts`).
- The splash background colours match the canvas (`#F2F5F1` light, `#0D100E` dark) so there's no shift
  when it fades.

### 8.5 Motion system (summary; the full spec is in [MOTION.md](MOTION.md))

- **One timing source:** `src/theme/tokens/motion.ts`.
  - **Curves:** standard, emphasis, enter, exit.
  - **Durations:** quick 100, fast 140, normal 220, emphasis 320.
  - **Distances:** 6, 12, 40. **Staggers:** 15, 40, 70.
  - **One press spring.**
- **Presets:** push, fade, fadeUp, staggerIn, heatmapReveal, hold, heatmapRebuild, selection, press,
  pulse, themeTransition, navigation, liquid.
- **Sound–animation sync:** `scripts/sounds/build-sounds.py` builds the WAVs from the same numbers.
  `heatmapRebuild.test.ts` checks `assets/sounds/sound-timings.json` against the tokens.

---

## 9. State management

| State                                                       | Purpose                                                                                                                       | Source / updated by                                                                                                               | Consumed by                                                                             | Persisted                                                                                         | Cached     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| **`useAuthStore`** (`src/features/auth/state/authStore.ts`) | `status` (booting/signedOut/guest/signedIn), `user`, `intent`, `pendingProvider`, `hasCompletedOnboarding`, `onboardingDraft` | `setUser` (session restore, sign-in mutations, sign-out, finishOnboarding); `applyRemoteSession` (Supabase events); onboarding VM | guards, login and onboarding VMs, profile VM, session actions, `useSessionScopedToasts` | **Only** `hasCompletedOnboarding` + `onboardingDraft` → kv key `streak.auth` (v1)                 | —          |
| **`useThemePreferencesStore`** (`src/theme/state`)          | Appearance choices                                                                                                            | Appearance VM                                                                                                                     | `unistyles.ts` (initial), `ThemeRuntimeBridge`, `useReduceMotion`                       | Yes → `streak.theme-preferences` (v1). New fields merge over defaults, so there are no migrations | —          |
| **`useSystemMotionStore`**                                  | Live OS Reduce Motion (null until known)                                                                                      | `MotionRuntimeBridge` (events + re-check on foreground)                                                                           | `useSystemReduceMotion`                                                                 | No                                                                                                | —          |
| **`useSoundPreferencesStore`** (`src/shared/state`)         | `soundEffects` on/off                                                                                                         | Appearance VM                                                                                                                     | `sounds.play()` (read via `getState()`)                                                 | Yes → `streak.sound-preferences` (v1)                                                             | —          |
| **TanStack `['profile', id]`**                              | Local profile                                                                                                                 | `profile.getLocal`; `setQueryData` from the remote query                                                                          | `useProfileViewModel`                                                                   | No (SQLite is the durable copy)                                                                   | 30 s stale |
| **TanStack `['profile', id, 'remote']`**                    | Remote refresh side effect                                                                                                    | `refreshFromRemote`                                                                                                               | (result unused except to write the local key)                                           | No                                                                                                | 30 s stale |
| **TanStack `['auth', 'apple-available']`**                  | Apple button visibility                                                                                                       | `auth.isAppleAvailable()`                                                                                                         | Login VM                                                                                | No                                                                                                | Infinite   |
| **TanStack mutations**                                      | apple, google, requestOtp, verifyOtp, guest                                                                                   | `useAuthMutations`                                                                                                                | Login VM via `useSignInAttempt`                                                         | —                                                                                                 | —          |
| **DI context**                                              | `Repositories { auth, profile }`                                                                                              | `RepositoriesProvider` (once)                                                                                                     | VMs, hooks, actions via `useRepositories()`                                             | —                                                                                                 | —          |
| **Unistyles runtime**                                       | Current theme                                                                                                                 | `ThemeRuntimeBridge.apply()`                                                                                                      | every `StyleSheet.create`, `useUnistyles()`                                             | —                                                                                                 | —          |
| **Local component state**                                   | login `step/email/code`, resend countdown, onboarding `finishing`, Pager `seen`, heatmap `phase`                              | the component                                                                                                                     | the component                                                                           | No                                                                                                | —          |
| **Reanimated shared values**                                | pager `progress`, liquid tab bar ends, theme veil                                                                             | UI-thread worklets                                                                                                                | animated styles                                                                         | No                                                                                                | —          |

**Synchronisation rules [C]:**

- Auth state flows **Repository → store** (via `setUser`). Navigation reacts to the store through
  guards.
- Profile flows **Supabase → SQLite → query cache**. Local dirty edits block server overwrites.
- **Invalidation:**
  - a sign-in invalidates the profile query;
  - sign-out calls `queryClient.clear()`;
  - returning to the foreground refetches stale queries (`focusManager`);
  - reconnecting resumes paused queries (`onlineManager`, where `isConnected !== false` counts as
    online).
- Toasts are session-scoped: a user-id change dismisses all toasts, and so does the app going to the
  background.

---

## 10. Authentication & security

- **Methods:** Apple (iOS), Google, email OTP, guest. There are no passwords anywhere [C].
- **Registration:** implicit. The first successful sign-in creates the Supabase auth user, and the
  trigger creates the profile.
- **Session storage:**
  - supabase-js with `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`;
  - storage is `LargeSecureStore`: each write generates a new 256-bit key (stored in **SecureStore**,
    i.e. Keychain/Keystore) and AES-CTR-encrypts the session into **AsyncStorage**.
- **Tokens:** a JWT access token and a refresh token, both managed by supabase-js [I]. No cookies (native
  app) [C].
- **Refresh:** foreground only (`registerAuthAutoRefresh`).
- **Authorization:** Supabase RLS, owner-only. There are no roles or permissions in the app [C].
- **Protected routes:** `Stack.Protected` guards (`canEnterApp` / `canEnterAuth`).
- **Input validation:**
  - zod for the env, email and server rows;
  - `isCompleteOtp` requires exactly 6 digits;
  - route params go through the pure parsers.
- **Replay protection:** an Apple nonce (SHA-256 to Apple, raw to Supabase). Google uses "Skip nonce
  check" in Supabase (documented in SETUP.md).
- **Logging hygiene:** `AppError` messages never contain tokens, codes or emails. Logs record error
  _kinds_ only.
- **Security tooling in CI:** GitLab SAST, Secret Detection, `npm audit --audit-level=high`.
- **Sign-out scope:** `'local'`, so other devices stay signed in [C].

### Secrets and config values (no values recorded here)

| SECRET / value                     | Location                                                                                         | Purpose                                            | How loaded                                                | Required in                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`         | `.env` (gitignored; exists locally, header says "Environment: preview"), EAS env, GitLab CI vars | Supabase project URL                               | Inlined at build time; parsed by `src/core/config/env.ts` | All builds                        |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`    | same                                                                                             | Public anon key (RLS protects the data)            | same                                                      | All builds                        |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | same                                                                                             | Google OAuth web client (used as `webClientId`)    | same; regex `*.apps.googleusercontent.com`                | All builds                        |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | same                                                                                             | iOS client + reversed URL scheme                   | same; also read by `app.config.ts` (warns if missing)     | iOS builds (validated everywhere) |
| `EXPO_PUBLIC_LEGAL_BASE_URL`       | same                                                                                             | Terms / Privacy / Help site                        | same; trailing slashes stripped                           | All builds                        |
| `EXPO_TOKEN`                       | GitLab CI/CD variables (masked, protected)                                                       | EAS CLI auth for `eas-build` and `sync-eas-env.js` | CI env                                                    | CI only                           |
| Supabase `service_role` key        | **Must never be in the app, `.env`, EAS or CI app vars** (SETUP.md)                              | Future Phase 4 Edge Function                       | —                                                         | Server only [P]                   |
| Android signing keystore / SHA-1   | EAS credentials                                                                                  | Signing; Google Android OAuth client               | `eas credentials`                                         | Builds                            |

`EXPO_PUBLIC_*` values are **public by design** (compiled into the app). `.gitignore` excludes `.env`,
`.env*.local`, `*.jks`, `*.p8`, `*.p12`, `*.key` and `*.pem` [C].

---

## 11. Bug database

Severity scale: Critical (data loss or security), High (core flow broken), Medium (degraded behaviour
with a workaround), Low (cosmetic or housekeeping). Unless a device reproduction is noted, findings come
from reading code; **none were reproduced on a device for this document**.

### 11.1 Confirmed issues (the code makes the behaviour certain)

**B1: dirty profile rows are never retried, and they block server updates**

- **Status:** open. **Severity:** Medium (becomes High once more fields are editable).
- **Where:** `src/features/profile/data/LocalFirstProfileRepository.ts` (`updateDisplayName`,
  `refreshFromRemote`).
- **Symptoms:** a name change made offline never reaches Supabase. Later changes made on the server or
  another device never appear on this phone.
- **Root cause:** a network failure leaves `dirty = 1`. Nothing re-pushes dirty rows, because the sync
  engine is Phase 5. `refreshFromRemote` returns the local row unchanged while it's dirty.
- **How to reproduce:** needs an offline `updateDisplayName`. Today only the Apple first-sign-in name
  path calls it, so reproduce by signing in with Apple (first time) while connectivity drops mid-flow.
- **Current workaround:** none in the app.
- **Fix:** a push-dirty step, either on reconnect/foreground or in the Phase 5 sync engine.
- **Files:** the repository above, `profileDao.ts`.
- **Related systems:** sync, TanStack remote query.
- **Regression risk:** medium. Must respect `updated_at` conflict rules.

**B2: GitHub mirror is behind GitLab**

- **Status:** open. **Severity:** Low.
- **Where:** git remotes.
- **Symptoms:** `github/main` is at `ae08324`; `origin/main` (GitLab) is at `20ff7cc`, 7 commits ahead.
- **Root cause:** the planned `git sync` alias / mirroring isn't set up.
- **Fix:** run the mirror push (see [section 14](#14-git--version-control)).

**B3: AGENTS.md route location is wrong**

- **Status:** open. **Severity:** Low (documentation).
- **Where:** `AGENTS.md` (gitignored, local).
- **Symptoms:** it says `src/app/`; the routes are in `app/`. An agent or developer following it would
  create routes in the wrong place, and they wouldn't be styled (the Unistyles plugin root is `src`) or
  routed.
- **Fix:** edit AGENTS.md.

**B4: `onboardingDraft` is collected but never stored as data**

- **Status:** open by design until Phase 2. **Severity:** Medium (product gap).
- **Where:** `authStore.ts`, `useOnboardingViewModel.ts`.
- **Symptoms:** the chosen activities and reminder preference exist only in the persisted Zustand
  state. No activities table exists.
- **Fix:** Phase 2 must create activity rows from the draft on finish [P].

**B5: palette and visual style can't be changed**

- **Status:** open (no UI). **Severity:** Low.
- **Where:** `themePreferencesStore.ts`; no caller of `setPaletteId` or `setStyle`.
- **Symptoms:** everyone gets `glass` + `meadow`. `classic` and the other 3 palettes are unreachable
  except in tests.
- **Fix:** add controls to the Appearance screen, or remove the options.

### 11.2 Partially investigated

**P1: logging out while offline is impossible, and a failed logout clears Google state**

- **Severity:** Medium.
- **Where:** `SupabaseAuthRepository.signOut`, `shared/actions/session.ts`.
- **Symptoms:** offline, "Log out" shows "You're offline" and the person stays signed in. Google's
  account choice has already been cleared.
- **Root cause (partially confirmed):** the app deliberately treats a network failure as a failed
  logout (there's `COPY.offline`). Whether `supabase.auth.signOut({ scope: 'local' })` actually returns
  an error when offline depends on the supabase-js version [I].
- **How to reproduce:** airplane mode → Profile → Log out.
- **Fix options:** clear the local session regardless (local scope), or call `google.signOut()` after
  the Supabase sign-out succeeds.

**P2: database open failures bypass the boot error screen**

- **Severity:** Medium (rare).
- **Where:** `src/core/db/client.ts`.
- **Root cause:** `openDatabaseSync` and `execSync(PRAGMA …)` run at **module import**, before `BootGate`
  renders. A throw there (corrupt file, full disk) would be an uncaught exception at startup instead of
  "Streak could not update its local database" [I].
- **Fix:** open the DB lazily inside the migrations task, or wrap it in `try`.

### 11.3 Suspected (worth checking; not proven)

**S1: session can be lost if the app dies between two writes**

- **Severity:** Low–Medium.
- **Where:** `LargeSecureStore.setItem` / `getItem`.
- **Suspicion:** `setItem` writes the new key, _then_ the ciphertext. If the app is killed in between,
  the next read decrypts old ciphertext with the new key and gets garbage. AES-CTR has no integrity
  check. The session JSON parse would fail, supabase-js drops the session, and the person must sign in
  again. `getItem` doesn't catch decrypt/parse errors.
- **Fix:** write the ciphertext under a versioned key, or add a MAC/GCM, and treat a decrypt failure as
  "no session".

**S2: haptic beats can drift from the animation**

- **Severity:** Low.
- **Where:** `haptics.sequence` / `haptics.ramp` (JS `setTimeout`).
- **Suspicion:** the animations run on the UI thread, but the haptic timers run on the JS thread. Heavy
  JS work (e.g. future synchronous heatmap queries) would delay the haptics.

**S3: local profile lookups don't exclude soft-deleted rows**

- **Severity:** Low.
- **Where:** `profileDao.getById`.
- **Suspicion:** it returns soft-deleted (retired guest) rows. Harmless today because the guest id is
  forgotten after reassignment.

**S4: no fallback when the server has no profile row**

- **Severity:** Low.
- **Where:** `refreshFromRemote` returns `null`.
- **Suspicion:** if the Supabase trigger ever failed, there's no client-side insert, so the remote row
  never exists and the profile is local-only forever.

### 11.4 Resolved bugs (the fix is visible in code, a comment, or a commit)

| Bug                                                                                                                                                               | Fix (where)                                                                                                                                          | Evidence                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Typed routes broke on Windows (the Expo CLI treats `..\` paths as routes, dropping every real route)                                                              | `scripts/generate-route-types.js` regenerates them without Metro. `npm run typecheck` always runs it first                                           | [C] script header                                    |
| Blank tabs when toggling Reduce Motion (switching the tab animation to `'none'` remounted the native container on iOS)                                            | Tabs always cross-fade (`motion.navigation.*.tabs = 'fade'`)                                                                                         | [C] token comment, commit `3a28839`                  |
| Light mode looked static: the heatmap reveal grew cells in the empty colour, the theme veil washed white, the splash colour mismatched, and step pages overlapped | Reveal animates opacity and scale in the cell's own colour; the veil uses the current canvas; splash `#F2F5F1`; the arriving page waits (`revealAt`) | [C] MOTION.md, `app.config.ts`, `ThemeRuntimeBridge` |
| White/grey flash behind screens during transitions                                                                                                                | `NavigationTheme` in `app/_layout.tsx` feeds app colours to React Navigation; `contentStyle`/`sceneStyle` use the canvas                             | [C] comment                                          |
| Pager jumped when the index changed mid-drag                                                                                                                      | `contentOffset` set once; slides via `scrollTo` on the UI thread; the logical page only changes on landing                                           | [C] `Pager.tsx`                                      |
| A swipe starting on a button or tile pressed it (haptic, squeeze)                                                                                                 | `PressDelay` context (`pager.pressDelayMs`) + `unstable_pressDelay`                                                                                  | [C] `pressDelay.tsx`, commit `20ff7cc`               |
| Toasts lingered across sessions or after reopening the app                                                                                                        | `useSessionScopedToasts` (a user change dismisses all); `AppToaster` dismisses on background                                                         | [C]                                                  |
| Old dev builds without expo-audio crashed on import                                                                                                               | `requireOptionalNativeModule('ExpoAudio')` lazy load in `sounds.ts`                                                                                  | [C]                                                  |
| Darker seams in the translucent liquid tab pill                                                                                                                   | Opaque `glass.pill` colour                                                                                                                           | [C] `glass.ts`                                       |
| Glass backdrop gradient not applied from a stylesheet                                                                                                             | Passed as an inline `experimental_backgroundImage` style (`Backdrop.tsx`)                                                                            | [C]                                                  |
| Collapse → rebuild flashed a frame                                                                                                                                | `heatmapRebuild.handoverMs`: each phase holds its last frame during the hand-over                                                                    | [C] token comment                                    |
| Sound and animation drifting apart                                                                                                                                | Sounds built from the motion tokens; `audioLeadMs = 60`; a Jest test compares `sound-timings.json`                                                   | [C]                                                  |
| GitHub/GitLab `main` diverged (merged on both)                                                                                                                    | Decision: GitLab is the source of truth; GitHub is a mirror (still needs the sync, see B2)                                                           | [C] project memory / git                             |

### 11.5 Technical debt

- **No crash reporting.** Three `TODO(Sentry)` sites: `useAuthSession.ts`, `SupabaseAuthRepository.ts`,
  `useSignInAttempt.ts`.
- **Unused dependencies:** `date-fns`, `expo-blur`, `expo-glass-effect`.
- **Unused feature:** `enableChangeListener: true` is on, but nothing uses live queries (`useLiveQuery`
  isn't used).
- **Two key/value engines** (AsyncStorage for the session, the expo-sqlite kv-store for Zustand), plus
  SecureStore.
- **Local schema:** no indexes or CHECK constraints. The TS enums (`provider`, `app_meta.key`) aren't
  enforced in SQL.
- **Local/remote schema drift:** `time_zone` nullability, `username` uniqueness, `provider` `guest`.
- **Remote schema is applied by hand:** no Supabase CLI config or `supabase/config.toml` in the repo;
  the migration is run in the SQL editor.
- **Tests run on the iOS preset only** (`jest-expo/ios`). Android-specific branches (`Platform.OS ===
'android'`, `BackHandler`) aren't exercised by Jest.
- **`unstable_pressDelay`** is an unstable React Native API (it may change between RN versions).
- **Local `android/` folder** is generated output. It's gitignored but present, and goes stale when
  `app.config.ts` changes.
- **No OTA updates** (`expo-updates` isn't installed), so every JS fix needs a new binary.
- **Commit messages** are often just "commit", which makes history hard to search.

---

## 12. Optimization memory

### 12.1 IMPLEMENTED [C]

| #   | Problem → solution                                                                                                                                           | Files                                                                              | Benefit / trade-off                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| O1  | **Startup:** wrong-screen flash on launch → synchronous persisted state (kv-store) plus the splash held until the session is restored                        | `persistStorage.ts`, `SessionGate.tsx`, `BootGate.tsx`                             | No flicker. Trade-off: synchronous reads on the JS thread (small data).                                           |
| O2  | **Startup:** boot work in parallel → env, fonts and migrations as independent tasks                                                                          | `useAppBootstrap.ts`, `bootState.ts`                                               | Faster boot. Measured: [U].                                                                                       |
| O3  | **Bundle:** only 5 font weights imported (per-weight imports)                                                                                                | `fonts.ts`                                                                         | Smaller bundle.                                                                                                   |
| O4  | **Binary size:** preview APK is arm64-only; R8 minify and resource shrinking in release builds                                                               | `app.config.ts` (`expo-build-properties`), `eas.json` (`buildType: apk`)           | Smaller APK (commit `c818fa4`). Trade-off: the preview APK won't install on 32-bit or x86 devices. Measured: [U]. |
| O5  | **Assets:** icons and splash re-exported smaller (`icon.png` 393 KB → 41 KB, etc.)                                                                           | `assets/*` (commit `f4b144b`)                                                      | Smaller app.                                                                                                      |
| O6  | **Rendering:** all animation on the UI thread (shared values, CSS animations); no per-frame React state                                                      | `src/theme/motion/*`, `Pager.tsx`, `useLiquidTabBar.ts`                            | Smooth 60 fps motion. Trade-off: complexity.                                                                      |
| O7  | **Rendering:** continuous motion animates only transform and opacity (no layout props)                                                                       | `PageDots.tsx`, `LiquidBubble.tsx`, `TabBarItem.tsx`                               | No per-frame relayout.                                                                                            |
| O8  | **Rendering:** memoised pages and cells (`memo(Heatmap)`, `memo(HeatCell)`, `useCallback` in the onboarding VM); the logical page changes only after landing | `Heatmap.tsx`, `HeatCell.tsx`, `OnboardingScreen.tsx`, `useOnboardingViewModel.ts` | Swipes don't re-render heavy children.                                                                            |
| O9  | **Rendering:** the heatmap reveal is resolved once per grid (cells don't each subscribe to Reduce Motion); only pulsing cells subscribe                      | `Heatmap.tsx`, `HeatCell.tsx`                                                      | Fewer subscriptions.                                                                                              |
| O10 | **Rendering:** zustand `useShallow` selectors and fine-grained selectors                                                                                     | `ThemeRuntimeBridge.tsx`, VMs                                                      | Fewer re-renders.                                                                                                 |
| O11 | **Theme change:** one opacity animation (veil); the theme is swapped while hidden                                                                            | `ThemeRuntimeBridge.tsx`                                                           | No half-themed frames. Nothing re-renders per frame.                                                              |
| O12 | **Worklet memory:** worklets read destructured constants instead of the whole `motion` object                                                                | `TabBar.tsx` (`footerStretch`), `Pager.tsx`                                        | Avoids copying the token object to the UI thread.                                                                 |
| O13 | **Audio:** players created once, preloaded before the first use, kept for the app's lifetime; `mixWithOthers`; silent mode respected                         | `sounds.ts`                                                                        | Sounds play on cue. Trade-off: ~336 KB of decoded WAVs held.                                                      |
| O14 | **Network:** retry only network errors (≤2); never retry mutations; refetch on focus and reconnect instead of polling; online-only remote queries            | `queryClient.ts`, `onlineManager.ts`, `focusManager.ts`, `useProfile.ts`           | Less wasted traffic.                                                                                              |
| O15 | **Network:** local-first profile; guests never hit the network                                                                                               | `useProfile.ts`, `LocalFirstProfileRepository.ts`                                  | Instant, offline UI.                                                                                              |
| O16 | **Battery:** token auto-refresh only in the foreground                                                                                                       | `appStateRefresh.ts`                                                               | No background refresh timers.                                                                                     |
| O17 | **Database:** WAL journal mode                                                                                                                               | `db/client.ts`                                                                     | Concurrent reads and writes.                                                                                      |
| O18 | **Laziness:** Supabase client and repositories created on first use; expo-audio loaded lazily                                                                | `supabase/client.ts`, `RepositoriesProvider.tsx`, `sounds.ts`                      | Clean errors on a bad env; no crash on old builds.                                                                |
| O19 | **API payload:** explicit column list in the profile select                                                                                                  | `profileApi.ts` (`COLUMNS`)                                                        | Only the needed fields.                                                                                           |
| O20 | **Toasts:** de-duplicated by title id                                                                                                                        | `toast.ts`                                                                         | No stacking on double taps.                                                                                       |
| O21 | **Theme:** transition skipped at launch, with Reduce Motion, or in the background                                                                            | `ThemeRuntimeBridge.tsx`                                                           | No wasted animation.                                                                                              |

No image optimization, CDN, pagination or background processing exists yet [C].

### 12.2 PLANNED (by the code or docs) [P]

- **Phase 5 sync engine:** push dirty rows; pull with the `last_pulled_at` watermark (`app_meta`).
- **Phase 2 heatmap:** a months mode for `Heatmap`; guest reassignment for activities and check-ins.

### 12.3 RECOMMENDED (not implemented)

| #   | Problem                                               | Solution                                                                                                                       | Expected benefit                           | Trade-off                                  |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| R1  | Phase 2 queries will scan unindexed tables            | Add indexes with the new tables, e.g. check-ins on `(user_id, date)` and a partial index `WHERE deleted_at IS NULL`            | Fast heatmap and day queries               | Slightly slower writes                     |
| R2  | Synchronous Drizzle queries block the JS thread       | Aggregate in SQL (`GROUP BY date` → counts → `intensityLevel`), fetch only the visible range, keep result sets small           | No jank; accurate haptic timing (S2)       | —                                          |
| R3  | `enableChangeListener` is paid for but unused         | Use Drizzle `useLiveQuery` for local reads, or turn it off                                                                     | Either reactive UI or less overhead        | —                                          |
| R4  | Two KV engines                                        | Use `expo-sqlite/kv-store` as `LargeSecureStore.dataStore` and drop AsyncStorage (existing sessions need a one-time migration) | One fewer native module and storage engine | Existing sessions need migrating           |
| R5  | ~336 KB of WAV sound effects                          | Encode to AAC/m4a                                                                                                              | Smaller binary                             | Re-verify the timing sync                  |
| R6  | Remote profile refetch on every foreground after 30 s | Longer `staleTime` for `['profile', id, 'remote']` (e.g. 5–10 min)                                                             | Fewer Supabase calls                       | Slightly staler cross-device data          |
| R7  | Unused dependencies                                   | Remove `date-fns`, `expo-blur` and `expo-glass-effect` after checking nothing needs them                                       | Smaller install and binary                 | —                                          |
| R8  | No production visibility                              | Add Sentry (or similar) at the `TODO(Sentry)` sites                                                                            | Real crash and performance data            | SDK size, privacy review                   |
| R9  | Every JS fix needs a new binary                       | Add `expo-updates` / EAS Update                                                                                                | Faster fixes                               | Release discipline, runtime-version policy |

---

## 13. Build & development process

**Runtime and tools [C]:**

- Node **24** (`.nvmrc`; CI uses `node:24-bookworm`); **npm**.
- EAS CLI ≥ 24.7.0 (CI pins `eas-cli@24.7.0`).
- Maestro (optional, E2E).
- Python + `miniaudio` + `numpy` (only to rebuild sounds).
- Windows is the dev OS (PowerShell). iOS builds must run on EAS.

### Quick start

```text
1. Install:    npm ci
2. Configure:  create .env with the 5 EXPO_PUBLIC_* names (docs/SETUP.md §5), or
               npx eas-cli@latest env:pull development   (writes .env.local)
3. Build once: npx eas-cli@latest build --profile development --platform android
               (install the APK on the phone; iOS: register device first)
               or locally: npx expo run:android
4. Run:        npm run start          (expo start --dev-client) → open from the dev client
5. Verify:     npm run verify         (typecheck → lint → prettier check → jest)
```

### Commands (from `package.json` and the docs) [C]

| Task                         | Command                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server                   | `npm run start` (= `expo start --dev-client`)                                                                                                               |
| Local native build + run     | `npm run android` / `npm run ios` (= `expo run:*`)                                                                                                          |
| Local variant "Streak Local" | set `APP_VARIANT=local` before `npx expo run:android` (PowerShell: `$env:APP_VARIANT='local'`) [I on exact invocation; the behaviour is in `app.config.ts`] |
| Typecheck                    | `npm run typecheck` (regenerates typed routes, then `tsc --noEmit`)                                                                                         |
| Typed routes only            | `npm run routes:types`                                                                                                                                      |
| Lint                         | `npm run lint` (`eslint . --max-warnings 0`)                                                                                                                |
| Format / check               | `npm run format` / `npm run format:check`                                                                                                                   |
| Tests                        | `npm test` (Jest); CI: `npx jest --ci --coverage`                                                                                                           |
| All checks                   | `npm run verify`                                                                                                                                            |
| E2E                          | `maestro test .maestro` (needs a dev build with valid env)                                                                                                  |
| Expo health                  | `npx expo install --check`, `npx expo-doctor`, `npx expo install --fix`                                                                                     |
| Add a dependency             | `npx expo install <pkg>` (never plain `npm install <pkg>` for Expo/RN packages; AGENTS.md)                                                                  |
| Local DB migration           | Edit `src/core/db/schema/*`, then `npm run db:generate` (drizzle-kit writes SQL + journal + `migrations.js`). It runs automatically on the next app launch  |
| Remote DB migration          | Run `supabase/migrations/*.sql` in the Supabase SQL editor, or `supabase db push` with a linked CLI (SETUP.md §1)                                           |
| Seeds                        | None                                                                                                                                                        |
| Rebuild sounds               | `python -m pip install miniaudio numpy` then `python scripts/sounds/build-sounds.py`                                                                        |
| JS bundle check              | `npx expo export --platform android --output-dir dist/android`                                                                                              |
| Cloud build                  | `npx eas-cli@latest build --profile <development\|preview\|production> --platform <android\|ios>`                                                           |
| Submit                       | `npx eas-cli@latest submit` (`submit.production` is empty in `eas.json`; store credentials: [U])                                                            |

**Coverage floor [C]:** statements 70, branches 70, functions 65, lines 70 (`jest.config.js`).

---

## 14. Git & version control

- **Remotes [C]:**
  - `origin` = GitLab `git@gitlab.com:faiz03-glicth/streak.git`: **the source of truth** (merge
    requests, CI, protected `main`);
  - `github` = `https://github.com/faiz03-glicth/-Ada.git`: **the mirror**.
- **Branches [C]** (all topic branches are fully merged into `main`; none has commits `main` lacks):

| Branch      | Tip                | Role                                                         |
| ----------- | ------------------ | ------------------------------------------------------------ |
| `main`      | `20ff7cc` (26 Sep) | Default, protected on GitLab. All work lands here            |
| `login`     | `4b9516d`          | Phase 1 login work (merged; stale)                           |
| `motion`    | `f5e58ed`          | Motion system (merged; stale)                                |
| `ci`        | `c8c13b0`          | GitLab CI (merged via MR !2; local only, not on the remotes) |
| `ux-polish` | `a768c93`          | Liquid tab bar, Reduce Motion fix, AA contrast (MRs !4, !5)  |
| `testing`   | `ae08324`          | Scratch branch for trying things out (created 25 Sep)        |

- **Conventions:**
  - branch per topic, merged through **GitLab MRs only** (a GitHub merge would be overwritten by the
    mirror);
  - no enforced naming scheme [C];
  - early history used "Phase N step M: …" messages; recent commits are mostly "commit".
- **Milestones:**
  - `80c880d` Phase 0 scaffold → `c280338`/`b499264` end of Phase 0;
  - `7230971`…`e6915e2` Phase 1;
  - `c8c13b0` CI;
  - `5b2d119`/`3a28839` liquid tab bar and fixes;
  - `f4b144b` sounds + haptics;
  - `c818fa4` slim APK;
  - 37 commits total.
- **Commit ownership:** the developer makes all commits, with **no Claude / co-author trailers**.
- **Release process / tags:** none (no tags) [C]. Deployment branch: `main` (the `eas-build` job runs
  only on the default branch).
- **Mirror sync:** GitHub is 7 commits behind (B2). The intended flow is push to GitLab, then push all
  `origin/*` refs and tags to `github`. The developer runs this themselves; a `git sync` alias was
  planned.

---

## 15. Deployment & hosting

```text
Local development (Windows, dev client on an Android phone)
       ↓  git push (GitLab origin)
GitLab MR  →  CI: typecheck · lint · format · unit-tests · SAST · secrets · expo-health · audit · bundle
       ↓  merge to main (protected)
Manual "eas-build" job (main only, needs EXPO_TOKEN)
       ↓  sync-eas-env.js copies EXPO_PUBLIC_* → EAS "preview" env
EAS Build (cloud) → preview APK (arm64, internal distribution)
       ↓
Side-loaded onto test phones          (store release: not set up / UNKNOWN)
```

- **App hosting:** none; it's a native binary.
- **Backend:** Supabase (managed Postgres + Auth). Project region, plan and whether separate projects
  exist per environment: [U].
- **Legal and help site:** `EXPO_PUBLIC_LEGAL_BASE_URL`. Hosting: [U].
- **CDN / domains:** none in the repo [C].
- **EAS profiles [C]:**

| Profile       | Distribution    | Environment   | Notes                                                                |
| ------------- | --------------- | ------------- | -------------------------------------------------------------------- |
| `development` | internal        | `development` | `developmentClient: true`                                            |
| `preview`     | internal        | `preview`     | Android `apk`; arm64-only via `EAS_BUILD_PROFILE` in `app.config.ts` |
| `production`  | store (default) | `production`  | `autoIncrement: true`; `appVersionSource: remote`                    |

- **Defaults:** the CI job's defaults are `EAS_PROFILE=preview`, `EAS_PLATFORM=android`,
  `--no-wait`. iOS needs credentials set up once with `eas credentials`, then `EAS_PLATFORM=all`.
- **Rollback:** there's no documented procedure and no OTA updates [C]. The practical options are to
  reinstall a previous EAS build artifact, or rebuild from an earlier commit [I].
- **Remote DB changes:** applied manually. There's no rollback script [C].

---

## 16. Configuration memory

| File                                           | What it controls [C]                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.config.ts`                                | name/slug/scheme; `APP_VARIANT=local` → "Streak Local", `com.faiz.streak.local`, scheme `streak-local`; EAS owner/projectId; iOS `usesAppleSignIn`, tablet; Android adaptive icon, `predictiveBackGestureEnabled: false`; splash (light `#F2F5F1`, dark `#0D100E`); plugins (router, status-bar, splash, font, sqlite, secure-store, web-browser, apple-auth, google-signin with the reversed iOS URL scheme, edge-to-edge, build-properties); `experiments.typedRoutes` |
| `eas.json`                                     | Build profiles → EAS environments; `appVersionSource: remote`; preview APK                                                                                                                                                                                                                                                                                                                                                                                               |
| `.env` (gitignored)                            | The five `EXPO_PUBLIC_*` keys. The local file is labelled "Environment: preview"                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/core/config/env.ts`                       | zod schema for those keys; `envResult` (boot check) and `requireEnv()`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `package.json → reanimated.staticFeatureFlags` | `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS: false`, `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: false`. Why they're set: [U] (no comment)                                                                                                                                                                                                                                                                                                                                   |
| `babel.config.js`                              | `babel-preset-expo`; `inline-import` for `.sql`; Unistyles plugin with `root: 'src'` (skipped under Jest)                                                                                                                                                                                                                                                                                                                                                                |
| `metro.config.js`                              | Adds the `sql` source extension                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `tsconfig.json`                                | Strict + `noUncheckedIndexedAccess` + path aliases                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `drizzle.config.ts`                            | dialect sqlite, driver expo, schema and out paths                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `eslint.config.js`                             | Layer import restrictions (`DATA_SDKS`, `ROUTER`, `VIEW_ONLY`), strict TS rules                                                                                                                                                                                                                                                                                                                                                                                          |
| `jest.config.js` / `jest.setup.ts`             | iOS preset, worklets resolver, transformIgnorePatterns, coverage floor; native module mocks                                                                                                                                                                                                                                                                                                                                                                              |
| `.prettierrc`                                  | single quotes, trailing commas, width 110                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `.gitattributes`                               | LF line endings; PNG/TTF binary                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `.gitlab-ci.yml`                               | Pipeline (see [CI.md](CI.md))                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Theme / feature flags                          | No feature-flag system. Theme defaults live in `DEFAULT_THEME_PREFERENCES` (system / meadow / glass / system). The settings registry is in `src/features/settings/config/sections.ts`                                                                                                                                                                                                                                                                                    |

---

## 17. Architectural decisions

**ADR-1: local-first data (SQLite is the source of truth)**

- **Chosen:** reads come from SQLite; Supabase refreshes it; `dirty` rows win until pushed.
- **Alternatives:** Supabase as the primary store with a query cache.
- **Why:** the app must work offline and guests have no server at all.
- **Trade-offs:** a sync engine is needed (Phase 5), and there's a conflict window (B1).
- **Where:** `LocalFirstProfileRepository`, `columns.ts`.
- **Don't change casually:** guest mode and offline restore depend on it.

**ADR-2: TanStack Query cache is not persisted**

- **Chosen:** memory only.
- **Why:** SQLite already persists the data, so persisting the cache would duplicate it.
- **Where:** `queryClient.ts`.
- **Don't change casually:** it would create two sources of truth.

**ADR-3: synchronous kv-store for Zustand persist**

- **Chosen:** `expo-sqlite/kv-store` `getItemSync` / `setItemSync`.
- **Alternative:** AsyncStorage (async).
- **Why:** state is hydrated before the first render, so the guards never flash the wrong group.
- **Where:** `persistStorage.ts`.
- **Don't change casually:** async hydration reintroduces the flash.

**ADR-4: `LargeSecureStore` for the Supabase session**

- **Chosen:** AES key in SecureStore, ciphertext in AsyncStorage (Supabase's official Expo pattern).
- **Why:** SecureStore has a ~2 KB value limit, and sessions are larger.
- **Trade-off:** no integrity check (S1).
- **Where:** `LargeSecureStore.ts`.

**ADR-5: route guards instead of imperative redirects**

- **Chosen:** `Stack.Protected` with mutually exclusive groups, driven by the pure `routeGuards()`.
- **Why:** sign-in, sign-out and onboarding never race with navigation calls.
- **Where:** `app/_layout.tsx`, `guards.ts`.
- **Don't change casually:** adding `router.replace` calls in auth flows would compete with the guards.

**ADR-6: all navigation goes through `src/shared/actions`**

- **Chosen:** only `navigation.ts` imports `expo-router` inside `src/`; `routes.ts` is the only place
  paths are written. ESLint enforces it.
- **Why:** refactor-safe paths and testable navigation (`test/mocks/navigationActions.ts`).

**ADR-7: MVVM with lint-enforced boundaries and DI**

- **Chosen:** Views can't import stores, data or core; data sources can't import the router; only
  `core/` and `data/` touch Supabase and SQLite.
- **Why:** testability (fake repositories in `test/fakes`) and a clear place for each concern.
- **Where:** `eslint.config.js`, `di.ts`.

**ADR-8: DAOs written against a sync `BaseSQLiteDatabase`**

- **Chosen:** the same DAO code runs on expo-sqlite (app) and sql.js (tests).
- **Why:** real SQL is tested in Jest.
- **Trade-off:** the synchronous API blocks the JS thread (R2).
- **Where:** `src/core/db/types.ts`, `test/db/createTestDatabase.ts`.

**ADR-9: migrations bundled and run at boot**

- **Chosen:** Drizzle SQL inlined via Babel and `useMigrations` inside `BootGate`.
- **Why:** the DB is always current before any screen.
- **Don't change casually:** don't edit applied migration files; generate new ones.

**ADR-10: Supabase client and repositories created lazily**

- **Chosen:** they're created after the boot checks.
- **Why:** a bad `.env` shows a readable screen instead of crashing at import time.
- **Where:** `supabase/client.ts`, `RepositoriesProvider.tsx`.

**ADR-11: token refresh only in the foreground; sign-out scope `local`**

- **Why:** Supabase's React Native guidance, and signing out of one phone shouldn't sign out every
  device.
- **Where:** `appStateRefresh.ts`, `authApi.ts`.

**ADR-12: a single motion token source; no raw values in components**

- **Chosen:** `tokens/motion.ts` plus presets by meaning. Motion never reads colour, so every theme moves
  identically.
- **Why:** consistency, Reduce Motion handled once, and themes can't change timing.
- **Where:** `src/theme/motion/*`, [MOTION.md](MOTION.md).
- **Don't change casually:** a raw `withTiming(…, { duration: 300 })` in a component breaks Reduce
  Motion and consistency.

**ADR-13: tabs always cross-fade (never `animation: 'none'`)**

- **Why:** switching the tab navigator's animation at runtime remounts the native container on iOS, which
  caused blank tabs.
- **Where:** `motion.navigation`.

**ADR-14: theme change via a veil in the current canvas colour**

- **Why:** no half-themed frames and no white/black wash.
- **Where:** `ThemeRuntimeBridge.tsx`.

**ADR-15: sounds generated from the motion tokens, checked by a test**

- **Why:** audio, haptics and pictures land together (`audioLeadMs` compensates for speaker latency).
- **Where:** `build-sounds.py`, `sound-timings.json`, `heatmapRebuild.test.ts`.
- **Don't change casually:** changing `heatmapRebuild` or `hold` tokens requires rebuilding the sounds.

**ADR-16: expo-audio loaded lazily and optionally**

- **Why:** dev builds made before expo-audio was added would crash on import.
- **Where:** `sounds.ts`.

**ADR-17: Pager: native paging ScrollView, `contentOffset` set once, logical page changes on landing**

- **Why:** changing `contentOffset` makes the native view jump mid-drag, and changing the page mid-drag
  causes re-render jank.
- **Where:** `Pager.tsx`.

**ADR-18: Liquid Glass is the app's own material (standard views), not Apple's API**

- **Why:** it looks the same on iOS and Android. `expo-glass-effect` isn't used by source anymore.
- **Where:** `materials/glass.ts`, `Backdrop.tsx`.

**ADR-19: route files contain no styles**

- **Why:** the Unistyles Babel plugin processes `src/` only.
- **Where:** `babel.config.js`.
- **Don't change casually:** styles in `app/` wouldn't react to theme changes as expected [I].

**ADR-20: GitLab is the source of truth; GitHub mirrors it**

- **Why:** CI and MRs live on GitLab, and dual merges had diverged `main`.
- **Where:** git remotes; developer workflow.

**ADR-21: `APP_VARIANT=local` builds a separate app ID**

- **Why:** a locally signed build can install next to the EAS build (the two are signed with different
  keys).
- **Where:** `app.config.ts`.

---

## 18. Troubleshooting guide

**App opens on "Streak is missing its configuration"**

- **Cause:** an `EXPO_PUBLIC_*` value is missing or malformed (a Google ID must end in
  `.apps.googleusercontent.com`; URLs must be valid).
- **Verify:** the screen lists the bad key names.
- **Fix:** fix `.env`, `.env.local` or the EAS env, then restart Metro with `-c`. EAS builds need the
  value set on EAS.
- **Files:** `src/core/config/env.ts`, `envTask.ts`.

**"Streak could not update its local database"**

- **Cause:** a migration failed: an edited old migration, or a schema conflict.
- **Verify:** the message detail; `migrations.js` and `_journal.json` match the SQL files.
- **Fix:** never edit applied migrations; generate a new one. For a dev device, clear the app data.
- **Files:** `src/core/db/migrations/*`, `useMigrationsTask.ts`.

**App doesn't start / red screen about a native module**

- **Cause:** a dependency with native code was added after the dev client was built.
- **Fix:** rebuild the dev client (`eas build --profile development` or `npx expo run:android`); run
  `npx expo install --check`.

**No sound effects**

- **Causes:** the dev client predates expo-audio (sounds silently off); the Sound effects toggle is off;
  the phone is on silent (`playsInSilentMode: false`).
- **Files:** `sounds.ts`, `soundPreferencesStore.ts`.

**Google sign-in fails on Android (DEVELOPER_ERROR / Unknown banner)**

- **Cause:** the SHA-1 of the signing key isn't on the Android OAuth client (the EAS keystore and the
  local debug keystore differ).
- **Verify:** `npx eas-cli@latest credentials`.
- **Fix:** add the SHA-1 in Google Cloud (SETUP.md §3). The "Streak Local" variant has a different
  package ID and needs its own client [I].

**Google sign-in fails on iOS**

- **Causes:** the reversed-client-ID URL scheme is missing (`app.config.ts` warns at config time), or
  Supabase isn't set to "Skip nonce check".

**Apple button missing**

- **Expected:** Android, or iOS without Sign in with Apple available (`isAppleAvailable()`).

**Email code "wrong or expired"**

- **Causes:** the code is not 6 digits, or the Supabase template doesn't send `{{ .Token }}`
  (SETUP.md §2).
- **Files:** `authApi.ts` (`InvalidOtp` mapping).

**Supabase 401/403 or an empty profile**

- **Causes:** session expired or RLS denies access (the caller isn't the row owner); migration `0001`
  not applied; the trigger didn't create the row.
- **Verify:** Supabase dashboard → Auth users and `profiles`.

**Profile shows old data**

- **Causes:** the local row is `dirty` (B1); offline; the 30 s `staleTime`.
- **Verify:** check `dirty` in the local `profiles` row.
- **Fix:** until Phase 5, clear app data or fix connectivity.

**Stuck signed in while offline**

- **Explanation:** by design, logout needs the network (P1).

**Typecheck complains about routes / `Href`**

- **Cause:** broken typed-route declarations (the Windows Expo CLI bug).
- **Fix:** `npm run typecheck` or `npm run routes:types`.

**Styles or theme don't apply in a new component**

- **Cause:** the file is outside `src/` (the Unistyles plugin root), or it uses React Native's
  `StyleSheet` instead of Unistyles.

**Wrong theme after a change / flash**

- **Check:** `ThemeRuntimeBridge` is still the last child in `AppProviders`; `Appearance.setColorScheme`
  is being called.

**Animation laggy**

- **Causes:** JS thread busy (synchronous DB queries, heavy renders); per-frame React state; animating
  layout props.
- **Verify:** use the perf monitor; check Reduce Motion; follow the MOTION.md rules.

**Blank tabs after toggling Reduce Motion**

- **Cause:** someone set the tab `animation` to `'none'` (see ADR-13).

**Maestro flow lands on the config error screen**

- **Cause:** the dev build has no valid env.
- **Fix:** install a build made with env values.

**CI `lint` red but local green**

- **Cause:** a warning (CI fails on any warning) or a Prettier difference.
- **Fix:** `npm run lint`, `npm run format`.

**CI `expo-health` yellow**

- **Cause:** a patch version is behind.
- **Fix:** `npx expo install --fix`. It's allowed to fail.

**`eas-build` job missing**

- **Cause:** `EXPO_TOKEN` isn't set, or the branch isn't `main`.

**Dependency conflict**

- **Fix:** `npx expo install --fix`, `npx expo-doctor`, then `npm ci`.

**Two "Streak" apps on the phone**

- **Explanation:** expected. "Streak Local" (`APP_VARIANT=local`) sits next to the EAS "Streak".

---

## 19. "Where do I find this?" index

```text
App entry / boot order          → index.ts, app/_layout.tsx, src/core/bootstrap/
Routes (screens)                → app/   (NOT src/app)
Route guards                    → src/features/auth/domain/guards.ts, app/_layout.tsx
Navigation functions / paths    → src/shared/actions/navigation.ts, routes.ts, params.ts
Authentication                  → src/features/auth/ (data/SupabaseAuthRepository.ts is the hub)
Supabase client & session store → src/core/supabase/
Auth state store                → src/features/auth/state/authStore.ts
Login UI                        → src/features/auth/ui/login/
Onboarding                      → src/features/onboarding/
Profile (local-first)           → src/features/profile/
Settings                        → src/features/settings/, app/(app)/settings/[section].tsx
Heatmap domain (levels, grid)   → src/features/heatmap/domain/
Seed activities                 → src/features/activities/config/seedActivities.ts
Local DB client / schema        → src/core/db/client.ts, src/core/db/schema/
Local migrations                → src/core/db/migrations/  (generate: npm run db:generate)
Local queries (DAOs)            → src/core/db/appMetaDao.ts, src/features/*/data/local/
Remote API calls                → src/features/*/data/remote/
Remote DB schema, RLS, triggers → supabase/migrations/0001_profiles.sql
DI / composition root           → src/core/di.ts, DiProvider.tsx, RepositoriesProvider.tsx
Query client / caching          → src/core/query/, src/features/profile/hooks/useProfile.ts
Persisted state storage         → src/core/storage/persistStorage.ts
Env / configuration             → .env (local), src/core/config/env.ts, app.config.ts, eas.json
Global theme / tokens           → src/theme/tokens/, src/theme/buildTheme.ts, src/theme/unistyles.ts
Glass material                  → src/theme/materials/glass.ts
Motion system                   → src/theme/tokens/motion.ts, src/theme/motion/, docs/MOTION.md
Theme & motion side effects     → src/theme/sync/
Reusable UI components          → src/shared/ui/ (barrel: index.ts)
Tab bar                         → src/shared/ui/TabBar.tsx (+ useLiquidTabBar, tabSlots, LiquidBubble)
Toasts                          → src/shared/ui/toast.ts, AppToaster.tsx
Haptics / sounds                → src/shared/lib/haptics.ts, sounds.ts, assets/sounds/, scripts/sounds/
Errors                          → src/core/errors/, src/features/auth/domain/AuthError.ts
Tests helpers / fakes / mocks   → test/, jest.setup.ts
E2E                             → .maestro/
CI                              → .gitlab-ci.yml, scripts/ci/, docs/CI.md
Build / deploy                  → eas.json, app.config.ts, docs/SETUP.md
Lint architecture rules         → eslint.config.js
```

---

## 20. "I forgot how this works"

**If I forget how authentication works:**

- **Read, in order:**
  1. `features/auth/domain/types.ts`
  2. `data/AuthRepository.ts` (the contract)
  3. `data/SupabaseAuthRepository.ts` (the hub)
  4. `data/remote/authApi.ts`
  5. `hooks/useAuthSession.ts` (restore)
  6. `hooks/useAuthMutations.ts` + `ui/login/useSignInAttempt.ts` (sign-in)
  7. `shared/actions/session.ts` (sign-out)
  8. `domain/guards.ts` + `app/_layout.tsx` (routing)
- **Flow:** provider SDK → Supabase ID token / OTP → `completeSignIn` (local profile, guest handover,
  `last_user_id`) → `setUser` → the guard routes.
- **Terms:** ID token, nonce, OTP, RLS, `LargeSecureStore`, guest (`guest_id`, `guest_active`), offline
  restore (`last_user_id`).

**If I forget how the database works:**

- **Read:** `core/db/client.ts`, `schema/columns.ts`, `schema/profiles.ts`, `schema/appMeta.ts`, the DAOs,
  and `supabase/migrations/0001_profiles.sql`.
- **Models:** `profiles`, `app_meta` (local); `public.profiles` (remote).
- **Migrations:** `npm run db:generate` (local, runs at boot); the SQL editor (remote).

**If I forget how the frontend talks to the backend:**

- **Read:** `core/supabase/client.ts` → `features/*/data/remote/*Api.ts` → repositories → hooks
  (`useProfile`, `useAuthMutations`).
- **Endpoints:** there's no custom API; everything is supabase-js (section 7).

**If I forget how caching works:**

- SQLite (durable) → TanStack Query (memory, 30 s stale, refetch on focus and reconnect) → UI.
- Preferences: Zustand → kv-store (sync).
- Session: `LargeSecureStore`.

**If I forget how styling and motion work:**

- **Read:** `theme/buildTheme.ts`, `theme/unistyles.ts`, `theme/tokens/*`, `theme/sync/*`,
  `docs/MOTION.md`.
- **Rule:** tokens only, presets by meaning, transform and opacity only for continuous motion.

**If I forget how deployment works:**

- **Read:** `docs/SETUP.md`, `docs/CI.md`, `eas.json`, `.gitlab-ci.yml`.
- **Commands:** `npm run verify` → push to GitLab → MR → merge → manual `eas-build` job (or run
  `npx eas-cli@latest build --profile preview --platform android` directly).

**If I forget how to add a feature (Phase 2 recipe):**

1. Add the schema in `core/db/schema/` using `syncColumns()`, then `npm run db:generate`.
2. Add a DAO in `features/<f>/data/local/` and test it with `test/db/createTestDatabase.ts`.
3. Add a repository interface + implementation, and register it in `core/di.ts` (`Repositories`).
4. Add hooks with TanStack Query (or `useLiveQuery`).
5. Add a ViewModel + View under `features/<f>/ui/`.
6. Replace the `PhasePlaceholder` route in `app/`.
7. Extend `reassignGuestData` so guest rows are handed over too.
8. Run `npm run verify`.

---

## 21. Current project status

```text
CORE FEATURES
✅ Boot (env/fonts/migrations, splash, error screen)
✅ Theme system (light/dark/system, glass, WCAG-AA light), theme veil transition
✅ Motion system, Reduce Motion override, haptics, sound effects (+ toggle)
✅ Onboarding (3-page pager, activity picks, reminder preference saved to draft)
✅ Sign-in: Apple (iOS), Google, email OTP, guest; offline session restore; logout
✅ Guest → account data handover (profiles only)
✅ Local-first profile with Supabase refresh
✅ Liquid tab bar + FAB, route skeleton for every planned screen
✅ CI (quality, tests, SAST, secrets, health, bundles, manual EAS build)
⚠️ Profile tab (identity + Appearance + Log out only)
⚠️ Settings (Appearance only; 5 sections placeholder)
⚠️ Heatmap component (weeks mode only; no real data)
⚠️ Palette / visual style (implemented in theme, no UI to choose)
⚠️ Git mirror (GitHub 7 commits behind)
❌ Activities & check-ins data, Home heatmap, Day sheet, Check-in sheet   (Phase 2)
❌ Insights, History                                                     (Phase 3)
❌ Account settings, activity editor, edit fields, feedback, rating, account deletion (Phase 4)
❌ Sync engine                                                            (Phase 5)
❌ Reminder notifications                                                 (Phase 6)
❌ Crash reporting / analytics, OTA updates, store release

BUGS
Critical: none found
High:     none found
Medium:   B1 dirty rows never retried · P1 offline logout impossible · P2 DB open outside BootGate ·
          B4 onboarding draft not persisted as data
Low:      B2 mirror behind · B3 AGENTS.md path · B5 palette/style unreachable · S1–S4 suspected

OPTIMIZATION
Implemented: O1–O21 (section 12.1)
In progress: none visible in code
Recommended: R1–R9 (indexes, SQL aggregation, live queries or no change listener, one KV engine,
             compressed audio, longer remote staleTime, unused deps, Sentry, EAS Update)

TECHNICAL DEBT
TODO(Sentry)×3 · unused deps (date-fns, expo-blur, expo-glass-effect) · unused change listener ·
no SQL indexes/CHECKs · local/remote schema drift · manual remote migrations · iOS-only Jest preset ·
unstable_pressDelay · no OTA · vague commit messages

DOCUMENTATION GAPS
AGENTS.md route path wrong · no Phase 2+ spec in repo (the "spec §7.1" cited in columns.ts is not in
the repo) · reanimated staticFeatureFlags undocumented · no release/rollback doc

UNKNOWN / NEEDS VERIFICATION
Supabase project region/plan and whether dev/preview/prod use separate projects · whether 0001 is
applied to every Supabase project · legal site hosting · store listings / submit credentials ·
target audience definition · exact supabase-js offline signOut behaviour · measured size/perf gains ·
why the reanimated static feature flags are set · whether date-fns/expo-blur/expo-glass-effect are
still intended
```

---

## 22. Priority roadmap

Grouped by evidence, not by feature preference.

**Critical** (stability, security, data integrity, core functionality)

1. **Build Phase 2 data (activities and check-ins) and consume `onboardingDraft`.** The app's core
   function (checking in, the heatmap) doesn't exist yet. Every tab except Profile is a placeholder (B4).
2. **Extend `reassignGuestData` to the new tables in the same transaction.** Without it, guest check-ins
   are orphaned when a guest signs in. The comment in `guestDataDao.ts` requires it.
3. **Push dirty rows (at least on reconnect or foreground) before adding more editable data.** Edits
   made offline are otherwise never saved remotely, and they block server updates (B1). The risk grows
   with every synced table.

**Important** (maintainability or performance)

4. **Add indexes and SQL-side aggregation with the Phase 2 tables (R1, R2).** The queries are
   synchronous on the JS thread, and the heatmap will be the heaviest query.
5. **Move the DB open inside the boot tasks, or guard it (P2).** Startup failures should reach the
   existing error screen.
6. **Decide the offline logout behaviour and reorder `google.signOut()` (P1).** Offline logout currently
   fails, after already changing some state.
7. **Harden `LargeSecureStore` against partial writes and decrypt errors (S1).** A failure means a
   silent logout.
8. **Add crash reporting (R8).** There's no visibility into device failures; three TODOs mark the spots.

**Maintenance**

9. **Sync the GitHub mirror and set up the `git sync` alias (B2).** The mirror is 7 commits behind.
10. **Fix the AGENTS.md route path (B3).** It conflicts with the codebase.
11. **Remove or justify the unused dependencies; drop `enableChangeListener` or use it (R3, R7).** They
    aren't imported in source.
12. **Align the local and remote profile schemas before sync.** Nullability, uniqueness and enum
    differences will surface as sync errors.
13. **Record the Supabase setup as CLI-managed migrations.** Remote changes are manual today.
14. **Use descriptive commit messages.** History is hard to search.

**Optional**

15. **Palette and style picker UI (B5).** The code exists but can't be reached.
16. **AAC sounds, one KV engine, longer remote `staleTime` (R4–R6).** Small gains.
17. **EAS Update for OTA fixes (R9).** Convenience.
18. **An Android Jest preset or project.** Android-only branches are untested.

---

## 23. Final project cheat sheet

```text
APPLICATION:  Streak (com.faiz.streak) — Expo SDK 57 / RN 0.86 mobile app, iOS + Android
PURPOSE:      Log activities as check-ins; see consistency on a GitHub-style heatmap (levels 0–4)

FRONTEND:     React 19 + Expo Router (typed routes) + Unistyles 3 + Reanimated 4; MVVM + DI
BACKEND:      No custom server. Supabase (Auth + Postgres/PostgREST + RLS)
DATABASE:     Device SQLite streak.db via Drizzle (source of truth) + Supabase public.profiles
AUTH:         Apple (iOS), Google, email 6-digit OTP, guest (local only); session encrypted
              (AES key in SecureStore, ciphertext in AsyncStorage); refresh in foreground only
API:          supabase-js calls in src/features/*/data/remote/ (auth + profiles select/update)
HOSTING:      Supabase (managed). App = native binary. No CDN, no OTA
DEPLOYMENT:   GitLab CI → manual eas-build (preview APK, arm64) → side-load
PACKAGE MGR:  npm (Node 24)

MAIN ENTRY POINT:  index.ts → app/_layout.tsx
MAIN UI:           app/ (routes) + src/features/*/ui + src/shared/ui
MAIN API:          src/features/auth/data/remote/authApi.ts, src/features/profile/data/remote/profileApi.ts
MAIN DATABASE:     src/core/db/ (client, schema, migrations) + supabase/migrations/0001_profiles.sql

IMPORTANT COMMANDS:
  npm ci · npm run start · npm run android · npm run verify · npm run typecheck · npm run lint
  npm test · npm run format · npm run db:generate · npx expo install <pkg> · npx expo install --fix
  npx expo-doctor · maestro test .maestro · python scripts/sounds/build-sounds.py
  npx eas-cli@latest build --profile development|preview|production --platform android|ios

IMPORTANT FILES:
  app/_layout.tsx · src/core/di.ts · src/core/config/env.ts · src/core/db/client.ts
  src/features/auth/data/SupabaseAuthRepository.ts · src/features/auth/state/authStore.ts
  src/features/auth/domain/guards.ts · src/features/profile/data/LocalFirstProfileRepository.ts
  src/core/supabase/LargeSecureStore.ts · src/core/query/queryClient.ts · src/shared/actions/*
  src/theme/tokens/motion.ts · src/theme/sync/ThemeRuntimeBridge.tsx · eslint.config.js
  app.config.ts · eas.json · .gitlab-ci.yml · docs/{SETUP,CI,MOTION}.md

KNOWN BUGS:
  B1 dirty profile rows never retried & block server updates · P1 can't log out offline
  (Google state cleared first) · P2 DB opened at import (bypasses boot error screen)
  B4 onboarding draft not saved as data · B5 palette/style no UI · B2 GitHub mirror behind
  S1 session can be lost on interrupted write (suspected)

CURRENT OPTIMIZATIONS:
  sync persisted state + splash held (no flash) · parallel boot tasks · per-weight fonts ·
  arm64 preview + R8/shrink · UI-thread motion, transform/opacity only, memoised pages/cells ·
  one-opacity theme veil · preloaded audio players · network-only retries, focus/reconnect refetch ·
  local-first reads · foreground-only token refresh · WAL

CURRENT LIMITATIONS:
  Phases 2–6 not built (no check-ins, heatmap data, insights, history, sync, reminders) ·
  no crash reporting · no OTA · no store release · remote migrations manual · Jest iOS preset only

IMPORTANT TERMINOLOGY:
  local-first · dirty flag · soft delete (deleted_at) · syncColumns · app_meta (guest_id,
  guest_active, last_user_id, last_pulled_at) · Stack.Protected guards · MVVM/ViewModel ·
  repository/DAO · composition root (di.ts) · RLS · anon key · ID token + nonce · OTP ·
  LargeSecureStore · staleTime/invalidate · Unistyles theme/tokens · glass/classic · motion presets ·
  Reduce Motion (system/on/off) · dev client · EAS profile/environment · APP_VARIANT=local

COMMON TROUBLESHOOTING:
  Config error screen → fix EXPO_PUBLIC_* (.env / EAS) · DB error screen → don't edit old migrations
  Native module error → rebuild dev client · Google fails on Android → SHA-1 in Google Cloud
  Route type errors → npm run typecheck · No sound → old dev client / toggle / silent mode
  Stale profile → dirty row or offline · Blank tabs → never set tab animation to 'none'
  CI lint red → any warning fails; run npm run lint + npm run format
```
