# Test plan / Acceptance checklist

## Existing code tests
`frontend/src/domain/rules.test.ts` covers level thresholds, weekend exclusion, missed scheduled date, year boundary. Run `npm test` after dependency installation.

## Additional cases to implement

### XP ledger
- First PUT awards reward; second PUT awards 0.
- Two concurrent PUT requests award exactly once and persist one completion event.
- DELETE after PUT reverses exact snapshotted reward; repeated DELETE = 0.
- Re-PUT after DELETE awards once in new cycle; sum matches expected.
- Crash between quest status and ledger write must roll back both.
- Changing XP reward later cannot change older transactions.

### Schedule and streak
- Mon-Fri habit with Fri and Mon completed, weekend off => streak 2.
- Missing Friday causes streak to stop on Monday unless Monday completed (then streak 1).
- Today's pending task should not break yesterday's streak until local midnight.
- Sunday to Monday boundary for Asia/Ho_Chi_Minh.
- Pause on a valid effective date does not count as missed; resume restores schedule.
- Historic schedule remains stable after schedule edited to take effect tomorrow.
- Leap-year day, end-of-year, timezone conversion.

### API/security
- 401 for unauthenticated, 403/404 for cross-user access.
- Validation: blank title, duration<=0, XP>100, weekdays empty, future completion, backdate>7.
- All GET response DTOs match `frontend/src/api/types.ts`.
- Refresh and browser history don't duplicate XP.
- Duplicate parallel requests are serializable/idempotent.

### UI/PWA
- Desktop 1440x900, tablet 768x1024, iPhone 390x844 and 320x568 no horizontal overflow.
- Navigate three tabs; create goal; create habit; toggle completion; reload persists.
- Keyboard tab order; Escape closes modal; focus visible; action labels.
- Initial/empty/error/loading/disabled states present.
- Production manifest includes 192/512 and maskable icons; service worker precaches built assets.
- After first successful online load, shell reopens offline; **API writes offline are not supported**.

## Release checklist
- [ ] UI reviewed and approved by user
- [ ] Dependencies installed and `npm run build` passes
- [ ] `npm test` passes
- [ ] Manual mobile Safari PWA install verified
- [ ] Backend tests pass (after backend phase)
- [ ] Backup/restore rehearsal done (after backend phase)
- [ ] HTTPS/security review complete (after backend phase)
