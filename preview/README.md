# Life OS — Zero-dependency visual preview

This directory is an **additional lightweight preview**, not the React production source.

It reuses compiled modules from `frontend/src/api/mockClient.ts` and `frontend/src/domain/rules.ts` so its interactive demo follows the *same mocked business engine*. UI is written with vanilla HTML and JavaScript to work without npm.

From repository root:

```bash
python -m http.server 4173
# open http://localhost:4173/preview/
```

Complete/undo quests, create goals/habits, navigate Today/Journey/Insights, export and reset demo. Demo data is localStorage only. The installable manifest and simple app-shell service worker support standalone PWA preview over localhost or HTTPS.

For source implementation and backend handoff, use `frontend/` and `docs/` as source of truth. After changing mock rules, regenerate `preview/api/mockClient.js` and `preview/domain/rules.js` from the TypeScript sources.
