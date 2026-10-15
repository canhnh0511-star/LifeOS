# UI-00 — Frontend build + approval gate

## Objective

Review and validate the supplied frontend (`frontend/`) on desktop and iPhone-sized browser. **Backend work is forbidden in this ticket.**

## Acceptance

1. `npm install`, `npm run build`, `npm test` all succeed.
2. `npm run dev`: Today, Journey, Insights, Settings all render without console errors.
3. Create goal, create habit, complete quest, undo, re-complete; reload and inspect state.
4. Verify 7/30-day analytics and date navigation.
5. PWA manifest, 192/512 icons and service worker in production build.
6. Review at 1440x900 and 390x844, including modal scroll, keyboard, no horizontal overflow.
7. Deliver screenshot or preview for owner sign-off; list issues and obtain explicit approval.

## Out of scope

Database, Spring Boot, login, AI coach, device sync, push notifications.
