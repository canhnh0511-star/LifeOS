# UI Spec — Life OS 0.1

## Visual language
- Dark productivity/RPG. Background `#0b1018`, cards `#151e2a`, accent lime `#c6fa55`, supporting cyan/blue/purple/emerald by category.
- Desktop: left sidebar 253px, main header, primary/secondary dashboard columns. Narrow desktop: compact sidebar.
- Mobile <690px: bottom 3-tab navigation, stacked Today, mobile-safe-area padding, installable PWA.
- Typography system font stack; accessible focus ring, meaningful button labels, prefers-reduced-motion support.

## Today `/`
**Header**: title, add habit button, mock mode, date.
**Level hero**: XP and level progression, decorative electric symbol.
**Metric row**: streak sessions, % quest completion, XP earned for selected date.
**Daily quests**: previous/today/next date controls, progress, list, completion CTA, XP reward. Disable future navigation. Backend rejects >7-day history mutations.
**Right column**: circular daily score, activity chart, 66-day journey teaser.
Empty list includes action to create habit; network error offers reload.

## Journey
Dual metrics: (elapsed journey calendar days / duration) and (completed scheduled tasks / scheduled tasks to date). Goals grid: category, description, 7-day percentage, linked habits, pause/resume actions. Modal create goal. Modal create habit: select goal, time target, fixed XP presets, ISO weekday choices, starts today.

## Insights
Period selector 7d/30d. Summary metrics, scheduled/completed chart, category bars, heuristic reflection (NOT an AI response). Data from `AnalyticsDto`.

## Settings
Show mock / real mode; timezone; export JSON; reset demo (confirm required). No claims of cloud sync.

## Interactive states
- `loading`: initial spinner while Promise.all loads mock/HTTP data.
- `error`: banner with retry.
- `updating`: disable same quest while mutation is pending.
- `success`: toast message; refetch dashboard/analytics.
- `offline`: app shell can reopen after successful first load; mutation not guaranteed offline.
- `modal`: cancel by Escape, close, or outside backdrop.

## Review script (UX acceptance)
1. Open iPhone-sized viewport, navigate all 3 tabs, verify no horizontal scrolling.
2. On Today, finish pending quest; verify XP, progress and chart update.
3. Undo task then complete again, verify XP returns to same total.
4. Create Career goal, then habit for today; verify task appears.
5. Pause habit; verify it disappears from today's future scheduled view; resume.
6. Reload; verify saved local state.
7. Switch Insights 7d/30d and verify counts differ appropriately.
8. Settings export mock JSON; then reset and verify sample restored.
9. Run production build and verify manifest/icons present; install via Safari/Chrome.

## Known demo deviations from final backend
- Streak shown on Today is max current per-habit scheduled-session streak, not a global all-habits daily streak.
- Pause/resume and schedule status may change historical aggregates; fix with schedule effective dates and quest instances at B-03.
- Demo user is a seeded mock; sign-in screen is intentionally deferred to B-01.
