# LIFE OS — PRODUCT REFOCUS & IMPLEMENTATION BRIEF

> Agent execution brief | Priority: P0 | Language: Vietnamese for user-facing UI | Status: proposed requirements; validate against source and deployed app before implementation.

## 0. One-sentence product direction

**Life OS v1 is a beginner-friendly gym training app with a Solo Leveling–inspired progression loop.** The user opens the app, immediately knows today's workout, follows understandable exercises, records sets, finishes a quest, and earns meaningful progress. Do NOT expand into generic life management in this phase.

Target user: returning gym beginner after a break (~1 month of prior gym experience; low familiarity with movement names). Tone/style: dark fantasy RPG, emerald green accent consistent with existing visual identity, 2D character/avatar with companion dragon if existing art available. Inspired by RPG mechanics, NOT a copyright-copy of Solo Leveling UI/assets/names.

## 1. First, inspect reality; do not assume

1. Examine the live URL `https://mylife-os.up.railway.app/#today` at mobile (390x844) and desktop (1440x900), using a browser that executes JS. Capture screenshots for `Today`, exercise library, workout detail, active workout, progress/rewards, including onboarding and empty states when accessible.
2. Read the codebase to inventory routes, state, data model, seed exercises, existing screens, tests, UX patterns, current gamification logic and deployment setup. Keep an evidence table: **observed issue / screenshot or file:line / user impact / fix / priority**. Do not claim that an issue exists until verified.
3. Map the actual end-to-end path: open app → today workout → exercise instruction → start session → set-by-set logging → finish → XP/progress. Identify dead ends, unclear terminology, redundant clicks, misleading controls, missing images, bad empty states, mobile overflow, persistence errors.
4. Keep working features, data, and integrations if they support this loop. No unrequested wholesale rewrite.

## 2. Product pillars and what NOT to build

### Core pillars
- **Clarity before fantasy:** A first-time gym user understands what to do without guessing.
- **One obvious next action:** The Today screen should orient the user within 5 seconds.
- **Gameplay = real training:** XP follows actual logged action; animations reinforce (never replace) utility.
- **Low-friction logging:** Fewer taps between sets; recover from accidental navigation, reloads, interruptions.
- **Progress is truthful:** Rank reflects consistency and completed work, not pseudo-medical strength claims.

### Explicitly out of scope for v1
Habit trackers unrelated to gym, productivity tasks, finance, calendar, self-improvement dashboards, marketplace, social guilds, chat, multiplayer, in-app purchases, advanced diet tracking, AI-generated plans without validation, huge skill trees, daily punishments, vague attributes without meaning. Keep these as one short `FUTURE_IDEAS.md` note only if useful; not active scope.

## 3. Information architecture (mobile first)

Limit primary navigation to 3–4 destinations:
1. **Hôm nay (Quest)**: today's workout and obvious `Bắt đầu tập` or `Tiếp tục buổi tập` CTA.
2. **Bài tập (Codex)**: searchable exercise library with clear how-to.
3. **Tiến độ (Progress)**: sessions, weekly consistency, selected exercise history and XP trend.
4. **Nhân vật (Hunter)** (optional if not too many tabs): avatar, level, rank, earned achievements.

No separate top-level tabs for secondary life domains. Consolidate or hide obsolete navigation without destroying user data.

## 4. Required user flows and screens

### A. Today: Primary quest
**Above the fold on iPhone:** day/date, level and small XP meter, clearly named today's focus (e.g. `Ngực + Tay sau`), workout state, duration estimate, exercise count, and ONE prominent CTA. Below: ordered exercise previews with human-readable Vietnamese name, equipment, sets × reps, target muscle, and thumbnail.

States: `Ngày tập`, `Ngày nghỉ / phục hồi`, `Chưa có lịch tập`, `Buổi tập đang diễn ra`, `Đã hoàn thành`. A rest day is not failure; offer next workout and optional recovery tip. A user with no plan gets `Tạo lịch tập mẫu` or `Chọn lịch` (not an empty dashboard).

### B. Exercise Codex: Make the library understandable
Each card must display:
- Vietnamese movement name FIRST; optionally English secondary name (e.g. `Đẩy ngực với máy — Chest Press Machine`).
- Recognizable equipment icon or image/illustration; primary muscle in plain Vietnamese; difficulty (`Người mới` etc.).
- 1-sentence purpose or motion cue; tags: machine / dumbbell / barbell / bodyweight.
- Tap opens an exercise detail that actually teaches movement.

Each detail must include:
1. Picture or short clip illustrating **the correct movement** (image must match equipment and variant; no decorative generic fitness stock in place of an instructional visual). Always render descriptive alt text and a fallback if unavailable. Verify image licensing/attribution where applicable.
2. `Chuẩn bị`: seat/bench height or stance, grip, initial position.
3. `Cách tập`: 3–5 short numbered steps in beginner Vietnamese.
4. `Hít thở`: simple cue, avoid overclaiming.
5. `Lỗi thường gặp`: 2–3 common errors and safety hints.
6. Recommended sets/reps/rest **if applicable to the user's plan**, adjustable in the workout.
7. `Dùng trong buổi tập` / `Thêm vào lịch` action where applicable.

Search must match Vietnamese accents/without accents and English aliases; filters should be simple (nhóm cơ / dụng cụ / trình độ). Do not show developer IDs, raw muscle enums, or unclear icons. A small, **curated, accurate** beginner library beats 100 vague entries. Seed a useful catalog of common chest/back/legs/shoulders/arms/core exercises with distinct verified instructions and visuals. Clearly flag incomplete entries for editorial work instead of inventing incorrect biomechanical instructions.

### C. Active workout = battle mode
- Compact top: `Buổi tập hôm nay`, completed `x/y` exercises, elapsed time (not mandatory), visible `Kết thúc` and `Tạm dừng` controls.
- Main card is the **current exercise** with image, name, readable 1-line instruction, sets target, rest recommendation and previous performance if available.
- Each set has editable weight (kg, with bodyweight option), reps, completed state; `Hoàn thành hiệp` acts immediately and saves.
- Lightweight rest timer with `Bỏ qua`, user control, accessible textual feedback.
- Next exercise navigation, ability to skip and return; avoid mandatory modal spam.
- Partial progress persists after refresh and across navigation; duplicate XP prevention.
- Finishing is explicit; log partial work accurately and never falsely count skipped items as done.

### D. Completion reward
- Clear summary: exercises completed, sets recorded, training duration if reliably measured, XP earned, changed level/progress, next quest.
- Celebrate with restrained emerald-green 2D RPG animation; honor reduced-motion preferences.
- XP based on actual logged training, with capped and transparent rewards to discourage spamming. Simple deterministic rules documented and tested; idempotent awarding by session ID.
- No guilt/shaming penalty for rest days, missed days, or beginner-level workouts.

### E. Player status / progress
- 2D avatar in current green visual style, optional dragon companion if art rights and asset exist, compact character stats.
- Level / XP / next threshold / rank; achievement badges tied to verifiable accomplishments (first completed workout, 3 workouts in a week, 10 sessions etc.).
- Useful real progress: adherence sessions/week, total completed workouts, estimated total sets, history of weights/reps for a selected lift; avoid fake stats like 'Strength +999' presented as fact.
- Character view must never bury the primary `Bắt đầu tập` CTA.

## 5. Visual direction (not a cosmetic-only reskin)

- Preserve emerald-green primary accent and dark background from current design, with legible contrast and accessible controls. Use RPG touches: quest card, progress bar, reward moment, player panel, codex label. Use plain gym language alongside fantasy language (`Nhiệm vụ hôm nay — Ngực + Tay sau`).
- 2D character; **not** 3D. Dragon beside character only where it improves the status screen; do not crowd Today and Workout.
- Prioritize typography hierarchy, large touch targets (~44px), comfortable spacing, clear disabled/loading/empty/error states, no excess neon glow or tiny decorative type.
- Localized Vietnamese throughout UI; English exercise names as secondary aliases. Icons never stand alone as meaning.

## 6. Schedule/data rules

- Preserve existing user plans and logged sessions through migrations.
- Model distinctions: `ExerciseDefinition` (teaching content), `WorkoutPlan` / `PlanDay`, `WorkoutSession`, `PerformedSet`, `XPEvent`, `Achievement` (map onto current schema before changing anything).
- Seed plan for beginner/returning gym user if current plan is absent. Training load and days must be customizable; do not hardcode an aggressive 6-day regimen. Recovery/rest days allowed.
- Record `exerciseId`, order, set index, reps, optional weight/unit, completion timestamp. Maintain separate planned and performed values.
- If images/media cannot be obtained responsibly, use accurate first-party simple diagrams or clear textual teaching and mark pending asset work; no incorrect substitute.
- Verify persistence and eventual backend consistency; prevent accidental overwriting of current data.

## 7. Required clean-up of misleading prior decisions and docs (before implementation)

**Do NOT run a blind `rm -rf`, delete git history, erase database tables, wipe user progress, or remove docs required to operate/deploy the app.** Treat cleanup as part of controlled scope refactoring.

### Inventory
- Search the repository for `README*`, `docs/**`, `spec*`, `plan*`, `decision*`, `ADR*`, agent instructions (`AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.agents/**`, `.cursor/**`, etc.), backlog and task files. Identify overlapping/contradictory specifications or broad Life OS requirements.
- Classify each item `KEEP`, `REWRITE`, `ARCHIVE`, `DELETE` with a one-line reason. Never delete without checking references/imports and git status.
- **Do not edit or delete third-party instructions, secrets/config, migrations, licences or deployment runbooks as a generic cleanup step.**

### Make one source of truth
Suggested minimal docs:
- `README.md`: how to run, test, deploy and what v1 is.
- `docs/PRODUCT_V1.md`: 1-page product goal, audience, boundaries, primary loop, navigation.
- `docs/UX_FLOWS.md`: Today → Exercise → Workout → Reward + states, screenshots, acceptance.
- `docs/TECH_NOTES.md`: actual architecture and essential schema/API invariants only.
- `docs/DECISIONS.md`: very short *current* decisions (date, trade-off, status); superseded decisions marked `Superseded`.
- `docs/NEXT_STEPS.md`: prioritized next deliverables with testable outcomes.

For obsolete decisions: keep necessary history in git; when audit/history value exists, archive in `docs/archive/` with `SUPERSEDED.md` banner, otherwise delete tracked obsolete files in an explicit commit after documenting why. Remove cross-links to superseded specs; make `README` point to current docs only. Do not copy all obsolete content to archive indiscriminately. Agent-specific instructions should be a concise pointer to new source-of-truth, not competing specs.

### Clean agent context
- Close or update obsolete TODOs, issue notes and contradictory agent prompts within repo scope; do not change external services or unrelated projects.
- Stop making implementation decisions from chat context when contradicted by current `PRODUCT_V1.md`.
- Produce `docs/DOC_CLEANUP_REPORT.md` with before/after list, retained items, archived/deleted files and rationale. **Do not modify hidden or untracked user files without approval.**

## 8. Execution sequence (deliver functional increments)

**Phase 0 — audit + cleanup (P0):** Current screenshots, UI/flow findings, source inventory, documentation cleanup plan, create source-of-truth docs, baseline tests. Cleanup only after confirming important history and scope.

**Phase 1 — make workouts usable (P0):** Today empty/day/rest/in-progress states; beginner-readable exercise library cards/detail; clear pictures/how-to; active logging of sets; persisted progress and resume. Deliver usable vertical slice before decorative redesign.

**Phase 2 — RPG reward loop (P1):** XP event/level/rank rules, session completion animation, achievements, 2D status avatar and dragon companion, training progress summary.

**Phase 3 — polish (P2):** Responsive/mobile QA, error/loading/offline messaging, accessibility, performance and asset consistency; small UX improvements based on end-to-end testing.

Do not spend phase 1 on a grand RPG dashboard, giant asset pack or framework migration. Small, reviewed commits by phase; no unnecessary dependency churn.

## 9. Definition of Done / acceptance tests

A test user unfamiliar with gym exercise names should be able to:
1. Open on iPhone and identify within 5 seconds whether today is a gym/rest day and what to do next.
2. Open one exercise and learn what equipment it uses, what it works, how to position and move, and what common errors to avoid.
3. Start a workout with one tap from Today, record/edit at least 3 sets, move to another exercise, navigate away/refresh and resume without data loss.
4. Finish once, receive exactly one XP reward, see a session summary and progress that persists after reload/login.
5. View a coherent player level/avatar/rank but never confuse RPG status with health diagnostics.
6. Search exercises in Vietnamese with/without accents; use on 390px mobile without horizontal clipping; buttons readable and keyboard accessible.
7. Preserve any already existing plans, history and accounts; test migrations and backups appropriately.
8. Verify edge cases: no plan, rest day, unfinished session, accidental double-tap, missing image, loading error, backend unavailable, offline/reconnect as supported.
9. Have no active documents instructing agents to prioritize generalized Life OS features over gym v1.

Tests: unit tests for XP/idempotency and progression, integration or mocked persistence checks for active session, smoke/e2e mobile checks for primary flow. Provide screenshots from actual running build, not generated mockups labeled as implementation.

## 10. Agent report format and constraints

When done with each phase, report:
- **Observed** (evidence and URL/screenshots/code refs) vs **assumed** clearly distinguished.
- Main UX issues, severity, and what was fixed.
- Files changed, migrations, tests run and results.
- Docs kept/rewritten/archived/deleted, why, and any user approval needed.
- Remaining high-priority issues and exact manual testing instructions.

**Never** claim deployed changes unless actually deployed and verified. Do not modify production data or production infrastructure without explicit authorization. Request approval before irreversible operations; regular code/docs edits inside repo are in scope.

## 11. Immediate instruction to coding agent

> Inspect the deployed Life OS and source code first. Refocus **v1 solely on beginner gym training with Solo Leveling–inspired progression**. Fix the core user journey `Today → Understand exercise → Perform and log workout → Quest completion and XP → View progress`. Before building, inventory and consolidate conflicting prior docs/agent decisions into a small maintained source of truth; archive/delete superseded tracked documents safely, without destroying records, user data, migrations, credentials or deployment guidance. Deliver small working changes with tested persistence and mobile screenshots. Prioritize clarity of the exercise library and daily workout experience over fantasy decorations or broader life tracking. Use this document as the baseline; report actual audit evidence and decisions instead of assuming what the current deployed UI shows.
