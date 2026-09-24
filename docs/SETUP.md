# Streak: setup

Everything here is done once, by a person, in web consoles. The app code never needs changing for it.

> **About the keys.** Every `EXPO_PUBLIC_*` value is compiled into the app, so anyone who unpacks the
> app can read it. That is expected: the Supabase **anon** key and Google **client IDs** are designed to
> be public, and your data is protected by Row Level Security (see `supabase/migrations`).
> **Never** put the Supabase `service_role` key (or any real secret) in an `EXPO_PUBLIC_*` variable,
> `.env`, EAS or the app. It belongs only in server code such as the Phase 4 Edge Function.

## 1. Supabase project and database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/migrations/0001_profiles.sql`
   (or, with the Supabase CLI linked to the project: `supabase db push`).
3. Check **Authentication → Policies**: `public.profiles` has RLS enabled with select / insert / update
   policies for the owner only and no delete policy.
4. From **Project Settings → API**, note the **Project URL** and the **anon public** key.

## 2. Auth providers

In **Authentication → Sign In / Providers**:

- **Email**: enable it. In **Authentication → Emails → Magic Link / OTP** edit the template so it
  shows the code with `{{ .Token }}` (for example `Your Streak code is {{ .Token }}`).
  Set the email OTP length to **6** digits to match the app.
- **Apple**: enable it and add the bundle ID `com.faiz.streak` to the allowed client IDs (step 4).
- **Google**: enable it and add both the **Web** and **iOS** client IDs to **Client IDs**
  (comma-separated), then turn on **Skip nonce check** (the native iOS SDK sends a nonce Supabase can't verify).

## 3. Google Cloud OAuth clients

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**, create:

| Client type         | Settings                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| **Web application** | No redirect URIs needed. Its ID is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.     |
| **iOS**             | Bundle ID `com.faiz.streak`. Its ID is `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. |
| **Android**         | Package `com.faiz.streak` plus the **SHA-1** of your signing key (below).  |

Android SHA-1: run `npx eas-cli@latest credentials`, choose Android → your build profile, and copy the
SHA-1 of the keystore. For local `npx expo run:android` builds, also add the debug keystore's SHA-1.
Configure the **OAuth consent screen** (app name, support email, `email` and `profile` scopes).

## 4. Apple Developer (iOS; paid account required)

1. **Certificates, Identifiers & Profiles → Identifiers →** `com.faiz.streak` → enable **Sign in with Apple**.
2. In Supabase's Apple provider, add `com.faiz.streak` as a client ID.

## 5. Environment values

The app reads five values (validated in `src/core/config/env.ts`). A missing or malformed value shows
the "Streak is missing its configuration" screen instead of the app.

| Name                               | Where it comes from                                                         |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`         | Supabase → Project Settings → API → Project URL                             |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`    | Supabase → Project Settings → API → anon public                             |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Cloud → Web client                                                   |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Cloud → iOS client                                                   |
| `EXPO_PUBLIC_LEGAL_BASE_URL`       | Your site; the app opens `/terms`, `/privacy`, `/acknowledgements`, `/help` |

Pick **one** of these:

**A. EAS environment variables (no files).** Values live on Expo's servers and are injected into
builds. `eas.json` maps each build profile to an environment (`development`, `preview`, `production`).

```bash
npx eas-cli@latest env:set development --name EXPO_PUBLIC_SUPABASE_URL --value "https://<ref>.supabase.co" --visibility plaintext
npx eas-cli@latest env:set development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>" --visibility sensitive
```

Repeat for the other three names and for `preview` / `production`. (`EXPO_PUBLIC_*` values end up in
the app, so use `plaintext` or `sensitive`, not `secret`.) For a local dev server, either set them in
the terminal before `npm run start` (PowerShell: `$env:EXPO_PUBLIC_SUPABASE_URL = "https://…"`), or run
`npx eas-cli@latest env:pull development`, which writes a gitignored `.env.local`.

**B. CI variables (GitLab).** Under **Settings → CI/CD → Variables**, add the five values plus
`EXPO_TOKEN` (expo.dev → Account settings → Access tokens), marked **Protected**, and **Masked** where
GitLab allows it. A pipeline job can push them to EAS with `eas env:set … --non-interactive`
(it creates or updates) before running `eas build --non-interactive`.

**C. A local `.env` file.** Copy `.env.example` to `.env` and fill it in. It is gitignored and never
uploaded to EAS.

## 6. Development builds

Streak uses native modules, so it runs in a **development build**, not Expo Go.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

Install the result on a device (Android: open the APK link; iOS: register the device with
`eas device:create` first), then run `npm run start` and open the project from the dev client.
On Windows, iOS builds must run on EAS; Android can also build locally with Android Studio
(`npx expo run:android`).

## 7. Checks and end-to-end tests

```bash
npm run verify
```

`verify` regenerates typed routes, then runs `tsc`, `expo lint` and Jest. On Windows, `npm run start`
can write broken typed-route declarations (an Expo CLI path bug), and `npm run typecheck` always
regenerates them first.

Maestro flows live in `.maestro/`. With a development build that has valid environment values
installed on an emulator or device:

```bash
maestro test .maestro
```
