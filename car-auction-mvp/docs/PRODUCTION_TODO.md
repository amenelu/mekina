# Production TODO

This checklist tracks the work needed before Mekina is production-ready.

## Release Scope

- [ ] Use Expo web as the first webapp release target.
- [ ] Defer native app store release until after Expo web is stable.
- [ ] Treat the older Flask/Jinja pages as legacy/supporting pages unless explicitly included in launch scope.
- [ ] Define the first production launch scope: buyer flows, dealer flows, rental-company flows, admin flows.
- [ ] Identify which experimental, legacy, duplicate, or incomplete screens should be hidden before launch.
- [ ] Confirm supported platforms for launch: Expo web first, then Android/iOS later.
- [ ] Create a release owner and approval checklist.

## Expo Web Release Path

Work through this section first. It is ordered so each item can be implemented and verified before moving to the next.

### Release Phases

- [ ] Phase 1: Expo web code stabilization, shared API calling code, auth/routing fixes, web UX fixes, and release-critical loading/error states.
- [x] Phase 2: Backend release safety, authorization audits, backend tests, validation, and pagination for release-critical data.
- [ ] Phase 3: Staging and production preparation, environment configuration, database migrations, uploads, HTTPS, builds, and smoke tests.
- [ ] Phase 4: Native app release preparation after Expo web is stable, including EAS builds, store metadata, permissions, and native push setup.

### 1. Lock The Release Target

- [x] Confirm the first production release is the Expo webapp, not the Flask/Jinja web UI.
- [x] List the exact buyer screens included in the first Expo web release.
- [x] List the exact dealer screens included in the first Expo web release.
- [x] List the exact rental-company screens included in the first Expo web release.
- [x] List the exact admin screens included in the first Expo web release.
- [x] Hide any Expo routes that are not part of the first release.
- [x] Remove or hide duplicate route aliases that can send users to the wrong role area.
- [x] Verify role-based start routes after login for buyer, dealer, rental company, and admin.

First release target: Expo web. The Flask/Jinja web UI is legacy/supporting UI for this release and should not be used as the public launch webapp.

Buyer screens in scope:
- Home: `mobile/app/(tabs)/index.tsx`
- All listings: `mobile/app/(tabs)/all_listings.tsx`
- Rental listings: `mobile/app/(tabs)/rentals.tsx`
- Find a car: `mobile/app/(tabs)/request/**`
- My requests: `mobile/app/(tabs)/my-requests.tsx`
- Notifications: `mobile/app/(tabs)/notifications.tsx`
- Listing details: `mobile/app/(details)/listings/[id].tsx`
- Rental details: `mobile/app/(details)/rentals/[id].tsx`
- Request details and offers: `mobile/app/request/[id].tsx`
- Offer comparison: `mobile/app/compare-bids.tsx`
- Deal summary: `mobile/app/deal/[id].tsx`
- Messages: `mobile/app/messages/**`
- Trade-in: `mobile/app/trade-in/**`
- How it works: `mobile/app/how-it-works.tsx`
- Login and registration: `mobile/app/(auth)/login.tsx`, `mobile/app/(auth)/register.tsx`

Dealer screens in scope:
- Dashboard: `mobile/app/(dealer)/dealer-dashboard.tsx`
- Analytics: `mobile/app/(dealer)/dealer-analytics.tsx`
- Messages: `mobile/app/(dealer)/dealer-messages.tsx`
- Notifications: `mobile/app/(dealer)/dealer-notifications.tsx`
- Profile: `mobile/app/(dealer)/dealer-profile.tsx`
- Submit listing: `mobile/app/(dealer)/dealer-submit.tsx`
- Edit listing: `mobile/app/(dealer)/dealer-edit-listing.tsx`
- Place offer: `mobile/app/(dealer)/dealer-place-offer.tsx`
- Points: `mobile/app/(dealer)/dealer-points.tsx`

Rental-company screens in scope:
- Dashboard/fleet: `mobile/app/(rental)/rental-dashboard.tsx`
- Profile: `mobile/app/(rental)/rental-profile.tsx`
- Add rental: `mobile/app/(rental)/add-rental.tsx`
- Manage rental: `mobile/app/(rental)/manage-rental.tsx`
- Points: `mobile/app/(rental)/points.tsx`

Admin screens in scope:
- Dashboard: `mobile/app/(admin)/admin-dashboard.tsx`
- Users: `mobile/app/(admin)/admin-users.tsx`
- Listings: `mobile/app/(admin)/admin-listings.tsx`
- Dealers and rental companies: `mobile/app/(admin)/admin-dealers.tsx`
- Rental listings: `mobile/app/(admin)/admin-rentals.tsx`
- Point requests: `mobile/app/(admin)/admin-point-requests.tsx`
- Notifications: `mobile/app/(admin)/admin-notifications.tsx`

Route hygiene notes:
- Native route aliases remain hidden from Expo web tab bars through `href: null`.
- Web role start routes are centralized in `mobile/lib/roleRoutes.ts`.
- Protected role layouts are guarded by `mobile/components/_components/AuthGate.tsx`; admins, dealers, and rental companies now stay in their own role areas after auth hydration.

### 2. Centralize API Calling Code

- [x] Keep `mobile/lib/api/client.ts` as the single shared HTTP client for Expo web and native.
- [x] Add shared auth API methods in `mobile/lib/api/auth.ts`.
- [x] Add shared listing API methods in `mobile/lib/api/listings.ts`.
- [x] Add shared buyer request API methods in `mobile/lib/api/requests.ts`.
- [x] Add shared dealer API methods in `mobile/lib/api/dealer.ts`.
- [x] Add shared admin API methods in `mobile/lib/api/admin.ts`.
- [x] Add shared rental-company API methods in `mobile/lib/api/rentals.ts`.
- [x] Add shared messaging API methods in `mobile/lib/api/messages.ts`.
- [x] Add shared notification API methods in `mobile/lib/api/notifications.ts`.
- [x] Add shared trade-in API methods in `mobile/lib/api/tradeIn.ts`.
- [x] Add shared response/request types in `mobile/lib/api/types.ts`.
- [x] Replace direct `axios` calls in Expo screens with shared API methods.
- [x] Replace direct backend `fetch` API calls in Expo screens with shared API methods.
- [x] Normalize API error handling in the shared client.
- [x] Normalize auth token attachment in the shared client.
- [x] Normalize image URL handling in one shared helper.

Audit note: the remaining `fetch(...)` calls in Expo screens are local file URI to `Blob` conversions for image uploads, not backend API calls. The remaining direct Axios imports are `isAxiosError` type/error helpers.

### 3. Stabilize Auth And Role Routing

- [x] Verify persisted auth loads before protected Expo routes redirect.
- [x] Verify buyer reload behavior on home, listings, requests, messages, notifications, and profile.
- [x] Verify dealer reload behavior on dashboard, analytics, messages, notifications, profile, submit, edit listing, offer, and points.
- [x] Verify rental-company reload behavior on dashboard, add rental, manage rental, and profile.
- [x] Verify admin reload behavior on dashboard, users, listings, dealers, rentals, notifications, and point requests.
- [x] Verify admin users cannot land in buyer rental tabs.
- [x] Verify buyer users cannot enter admin, dealer, or rental-company tabs.
- [x] Verify dealer users cannot enter admin or rental-company tabs.
- [x] Verify rental-company users cannot enter admin or dealer tabs.

Code check: protected layouts wait for auth hydration in `AuthGate` before redirecting. Buyer tabs now redirect logged-in admin, dealer, and rental-company users back to their role start route after hydration.

Reload pass: Playwright reload-smoked local Expo web with QA accounts for buyer home/listings/request/messages/notifications/profile/my requests; dealer dashboard/analytics/messages/notifications/profile/submit/edit listing/place offer/points; rental dashboard/add rental/manage rental/profile; and admin dashboard/users/listings/dealers/rentals/notifications/point requests. Role-isolation checks also passed after adding a legacy `/rentals` redirect for admins and non-buyer roles.

### 4. Stabilize Release-Critical Flows

- [x] Verify buyer browse/search/filter listing flow.
- [x] Verify buyer listing detail flow.
- [x] Verify buyer favorite/unfavorite flow.
- [x] Verify buyer compare flow.
- [x] Verify buyer vehicle request creation flow.
- [x] Verify buyer uploaded request creation flow.
- [x] Verify buyer request detail and offer comparison flow.
- [x] Verify buyer offer acceptance and deal summary flow.
- [x] Verify buyer trade-in request flow.
- [x] Verify buyer messages and notifications flow.
- [x] Verify dealer dashboard data loading.
- [x] Verify dealer offer creation flow.
- [x] Verify dealer listing submit/edit flow.
- [x] Verify dealer points request flow without browser password/autofill prompts.
- [x] Verify dealer analytics flow and locked/unlocked states.
- [x] Verify rental-company dashboard data loading.
- [x] Verify rental-company add/edit/toggle rental listing flow.
- [x] Verify admin dashboard counters.
- [x] Verify admin listing approve/edit/delete flow.
- [x] Verify admin user/dealer/rental management flow.
- [x] Verify admin point request accept/deny flow from dealer and rental cards.
- [x] Verify admin notifications flow.

Verification note: release-critical flows are covered by backend contract/release-safety tests, mobile unit tests, TypeScript checks, and local Expo web Playwright reload/role-routing smoke. Added coverage in this pass for buyer favorite/unfavorite and dealer analytics locked/unlocked states.

### 5. Fix Known Expo Web Release Issues

- [x] Fix Expo Router warnings caused by component files inside `mobile/app`.
- [x] Remove or hide unused Expo route files from the release build.
- [x] Verify pinned header/tab/footer behavior on desktop browser.
- [x] Verify pinned header/tab/footer behavior on mobile browser.
- [x] Verify pull-to-refresh still works where expected.
- [x] Verify all visible forms have correct autocomplete behavior.
- [x] Add missing empty states to release-critical screens.
- [x] Add missing loading states to release-critical screens.
- [x] Add missing error and retry states to release-critical screens.
- [x] Remove debug logs and noisy console output.
- [x] Run responsive checks at 360px, 390px, 430px, 768px, 1024px, and desktop widths.

Verification note: browser checks passed for pinned tab/header visibility after scroll on 390px and desktop widths; pull-to-refresh indicator appears on mobile-width touch pull; home, all listings, rentals, dealer dashboard, rental dashboard, and admin dashboard had no horizontal overflow at 360px, 390px, 430px, 768px, 1024px, and 1366px. Code audit confirmed release-critical screens have loading/empty/error states. Removed noisy debug logging and fixed the rental-company web points route collision by adding `/rental-points`.

### 6. Prepare Staging

- [ ] Choose staging backend host.
- [ ] Choose staging Expo web host.
- [x] Add first-class backend `APP_ENV=staging` config.
- [x] Document staging environment variables and deployment runbook.
- [x] Document no-card Cloudflare Pages + PythonAnywhere deploy path.
- [x] Remove tracked root `node_modules` files from Git.
- [x] Configure staging API base URL for Expo web.
- [x] Configure staging CORS origins.
- [x] Choose SQLite on persistent disk as the current staging database path.
- [x] Keep PostgreSQL integration easy through `DATABASE_URL` and the Postgres driver.
- [ ] Configure staging database.
- [ ] Run all database migrations on staging.
- [ ] Configure staging upload/media storage.
- [x] Configure staging secret values outside git.
- [ ] Verify staging HTTPS.
- [ ] Verify Socket.IO works on staging if notifications/chat require it.
- [ ] Configure SMTP for public password reset emails before production.
- [x] Add admin-assisted password reset fallback for no-SMTP launch.
- [x] Add user change-password flow in buyer, dealer, and rental profiles.

Staging prep note: repo-level staging support is implemented in `config.py`, `app.py`, `.env.example`, and `docs/STAGING_SETUP.md`. The remaining unchecked items require an actual staging provider, domain, database, and persistent upload storage.

### 7. Run Web Release Verification

- [x] Run backend test suite.
- [x] Run Expo TypeScript check.
- [x] Build Expo web production bundle.
- [ ] Smoke test buyer flow on staging from a fresh browser session.
- [ ] Smoke test dealer flow on staging from a fresh browser session.
- [ ] Smoke test rental-company flow on staging from a fresh browser session.
- [ ] Smoke test admin flow on staging from a fresh browser session.
- [ ] Repeat smoke tests after closing and reopening the browser.
- [ ] Repeat core smoke tests on a phone browser using the staging URL.
- [ ] Verify no production-blocking errors appear in backend logs.
- [ ] Verify no production-blocking errors appear in browser console.

### 8. Deploy Expo Web Production

- [ ] Configure production backend host.
- [ ] Configure production Expo web host.
- [ ] Configure production API base URL.
- [ ] Configure production CORS origins.
- [ ] Configure production database.
- [ ] Run production migrations.
- [ ] Deploy production backend.
- [ ] Deploy production Expo web build.
- [ ] Run production buyer smoke test.
- [ ] Run production dealer smoke test.
- [ ] Run production rental-company smoke test.
- [ ] Run production admin smoke test.
- [ ] Monitor backend logs after launch.
- [ ] Monitor frontend errors after launch.

## Environment And Secrets

- [ ] Create separate production, staging, and local environment configurations.
- [ ] Remove real secrets from checked-in `.env` files and rotate any exposed secrets.
- [ ] Store production secrets in the hosting provider secret manager.
- [ ] Set strong production `SECRET_KEY`.
- [ ] Set production database URL through environment variables.
- [ ] Set production API base URL for Expo web/native builds.
- [ ] Configure allowed CORS origins for production only.
- [ ] Disable Flask debug mode in production.
- [ ] Document required environment variables.

## Database

- [ ] Choose production database provider, preferably PostgreSQL.
- [ ] Run all migrations against staging.
- [x] Verify migration chain from an empty database.
- [ ] Add backup and restore procedures.
- [ ] Add recurring automated backups.
- [ ] Test restoring a backup into staging.
- [ ] Add indexes for high-traffic queries: listings, requests, messages, notifications, users.
- [ ] Review SQLite-only assumptions and replace them before production.
- [ ] Seed only safe production bootstrap data, such as initial admin user creation.

## Authentication And Authorization

- [ ] Audit every API endpoint for required auth decorators.
- [x] Verify admin-only endpoints reject buyers, dealers, and rental companies.
- [x] Verify dealer-only endpoints reject buyers and rental companies.
- [x] Verify rental-company endpoints reject buyers and dealers.
- [ ] Add token expiry and refresh strategy, or define explicit re-login behavior.
- [ ] Add password reset flow.
- [ ] Add email verification if accounts are self-service.
- [ ] Add rate limiting for login and registration.
- [ ] Add account lockout or abuse detection for repeated failed login attempts.
- [ ] Confirm "Remember me" behavior is intentional on web and native.
- [x] Add server-side checks for point request approval/denial.

## Admin And Moderation

- [ ] Add a durable admin workflow for point requests: pending, accepted, denied, audit history.
- [ ] Add filters for point requests by status and dealer.
- [ ] Add confirmation UX for accepting and denying point requests.
- [ ] Add audit logging for admin actions: user edits, point changes, listing approval, deletion.
- [ ] Add admin notifications or dashboard alerts for critical pending tasks.
- [x] Add pagination to admin lists.
- [x] Add search and filters to admin lists where missing.

## Payments And Points

- [ ] Define the business rules for dealer points and pricing.
- [ ] Decide whether points are purchased, manually granted, or both.
- [ ] Integrate payment provider if points are paid.
- [ ] Add payment success/failure webhooks.
- [ ] Make point transactions fully auditable.
- [x] Prevent duplicate point deductions on retries.
- [ ] Prevent negative point balances.
- [x] Add tests for point deduction, point grants, and request approval.

## Listings, Requests, Auctions, And Rentals

- [ ] Define lifecycle states for listings: draft, pending, approved, rejected, active, inactive, deleted.
- [ ] Define lifecycle states for buyer requests and trade-ins.
- [ ] Define auction start/end behavior and what happens after auction close.
- [ ] Add server-side validation for all listing and request forms.
- [ ] Add image upload limits: file count, size, type, dimensions.
- [ ] Add virus/malware scanning or use a managed media service.
- [ ] Move uploaded files to durable object storage.
- [ ] Add cleanup for orphaned uploads.
- [x] Confirm rental availability logic is correct.
- [x] Add tests for listing approval, rejection, edit, delete, and rental toggle flows.

## Messaging And Notifications

- [ ] Verify Socket.IO works behind the production reverse proxy.
- [ ] Configure sticky sessions or a Socket.IO-compatible scaling strategy.
- [ ] Add notification persistence for every important event.
- [x] Add unread count consistency tests.
- [ ] Add push notification provider setup for native apps if required.
- [ ] Add notification preferences if needed.
- [ ] Ensure opening notifications routes to the correct screen for each role.

## Frontend Web

- [ ] Fix known Expo Router warnings, including route files without default exports.
- [ ] Verify web reload behavior for admin, dealer, rental-company, and buyer routes.
- [ ] Verify auth hydration after closing and reopening the browser.
- [ ] Verify pinned headers and tab bars across mobile browser and desktop browser.
- [ ] Verify pull-to-refresh still works on supported web screens.
- [ ] Remove console noise and debug logs from production builds.
- [ ] Run responsive QA on common phone widths, tablet widths, and desktop widths.
- [ ] Check all forms for correct autocomplete behavior.
- [ ] Add empty, loading, error, and retry states to every data screen.

## Native Apps

- [ ] Configure production Expo/EAS project.
- [ ] Configure app icons, splash screens, app name, bundle id, and package name.
- [ ] Configure native API URL for production.
- [ ] Test Android production build.
- [ ] Test iOS production build if iOS is in scope.
- [ ] Add app permissions review for camera, media library, and notifications.
- [ ] Prepare Play Store and App Store metadata if native launch is in scope.

## Backend Deployment

- [ ] Choose hosting platform.
- [ ] Add production WSGI/ASGI server configuration.
- [ ] Add reverse proxy configuration.
- [ ] Enforce HTTPS.
- [ ] Configure trusted proxy headers.
- [ ] Configure static file serving strategy.
- [ ] Configure upload storage strategy.
- [ ] Add health check endpoint.
- [ ] Add deployment scripts or CI/CD pipeline.
- [ ] Document rollback procedure.

## Security

- [ ] Run dependency vulnerability scans for Python and npm packages.
- [ ] Pin production dependency versions.
- [ ] Add security headers.
- [ ] Add CSRF protection review for web form routes.
- [ ] Audit CORS behavior.
- [ ] Audit file upload security.
- [ ] Audit authorization on object access: users cannot access other users' private requests, deals, messages, or listings.
- [ ] Add input validation and output encoding review.
- [ ] Remove or protect debug/test endpoints.
- [ ] Review logs to avoid leaking tokens, passwords, or private user data.

## Testing

- [x] Add backend tests for admin point request accept/deny.
- [x] Add backend tests for role-based authorization.
- [x] Add backend tests for notifications and unread counts.
- [ ] Add mobile/web tests for login persistence after browser reopen.
- [x] Add tests for admin dashboard counters.
- [x] Add tests for dealer dashboard data loading.
- [x] Add tests for rental-company dashboard data loading.
- [ ] Add end-to-end smoke tests for buyer, dealer, rental-company, and admin flows.
- [ ] Add production build smoke test.
- [ ] Add manual QA checklist for release candidates.

## Observability

- [ ] Add structured server logging.
- [ ] Add error tracking for backend and frontend.
- [ ] Add uptime monitoring.
- [ ] Add database monitoring.
- [ ] Add alerting for failed deployments, high error rates, and database failures.
- [ ] Add audit logs for high-risk admin actions.
- [ ] Add basic business metrics: registrations, listings, requests, offers, accepted deals.

## Performance

- [ ] Profile slow API endpoints.
- [ ] Add pagination to large list endpoints.
- [ ] Add image optimization and thumbnails.
- [ ] Add caching where appropriate.
- [ ] Optimize initial Expo web bundle size.
- [ ] Remove unused route files from Expo Router.
- [ ] Test on low-end Android devices and slow networks.

## Data Privacy And Legal

- [ ] Create privacy policy.
- [ ] Create terms of service.
- [ ] Define data retention policy.
- [ ] Define account deletion process.
- [ ] Define user data export process if required.
- [ ] Review local legal requirements for vehicle marketplace, auctions, payments, and rentals.
- [ ] Add consent language for notifications and contact sharing.

## Content And Support

- [ ] Add production-ready support contact.
- [ ] Add help/FAQ content for buyers, dealers, rental companies, and admins.
- [ ] Add clear user-facing copy for errors and pending approval states.
- [ ] Add moderation process for fraudulent listings.
- [ ] Add internal runbook for common support issues.

## Launch Process

- [ ] Create staging environment.
- [ ] Deploy latest code to staging.
- [ ] Run migrations on staging.
- [ ] Run smoke tests on staging.
- [ ] Complete manual QA on staging.
- [ ] Freeze release branch.
- [ ] Tag release.
- [ ] Deploy production backend.
- [ ] Run production migrations.
- [ ] Deploy production web/native builds.
- [ ] Run production smoke tests.
- [ ] Monitor logs and metrics after launch.

## Post-Launch

- [ ] Schedule first production backup restore drill.
- [ ] Review first-week errors and crashes.
- [ ] Review user feedback.
- [ ] Prioritize production bug fixes.
- [ ] Create recurring release cadence.
