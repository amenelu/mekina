# Mobile E2E Smoke Tests

This folder contains `Maestro` smoke flows for the highest-value mobile journeys:

- buyer login and role-aware landing
- request entry flow
- saved request draft resume
- request upload auth guard
- trade-in auth guard

## Prerequisites

1. Install the `Maestro` CLI.
2. Start an Android emulator or iOS simulator.
3. Run the Expo app on that device.
4. Provide the installed app id as `MAESTRO_APP_ID`.

## Important note about app ids

The Expo config currently does not set a permanent native app id in `app.json`.
For stable E2E runs, you should eventually add:

- `expo.android.package`
- `expo.ios.bundleIdentifier`

Until then, run these flows against the actual installed id for the build you are using.

## Environment variables

- `MAESTRO_APP_ID`: installed app id, for example `com.example.mobile`
- `E2E_LOGIN`: test username or email
- `E2E_PASSWORD`: test password

## Run the smoke pack

```bash
maestro test mobile/e2e/smoke.yaml
```

## Run a single flow

```bash
maestro test mobile/e2e/flows/auth/login-buyer.yaml
```

## Recommended seed account

Use a non-admin, non-dealer buyer account so the login flow lands on the tabs layout.
