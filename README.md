I have applied a set of initial accessibility and UX fixes in the branch `chore/fix/ui-accessibility-theme`:

- Removed a global border rule that previously applied 1px borders to every element (this produced unwanted visual noise and layout regressions).
- Restored accessible native scrollbars and added a subtle, tasteful WebKit scrollbar for visual polish.
- Normalized theme initialization to only toggle `html.dark` (defaults to light). This avoids conflicting `light`/`dark` classes.
- Added an ErrorBoundary component to catch render-time crashes and show a friendly fallback UI.
- Added a smoke check script (`npm run check:build`) which runs TypeScript and ESLint checks.

What I tested briefly:
- Verified the app has a valid entrypoint at `src/main.tsx` and index.html points to it.
- Ensured the theme script in index.html and the App's theme application are consistent.

Next steps I recommend (short-term):
1. Run `npm install` and `npm run dev` locally to confirm runtime behavior and capture before/after screenshots for pages: HomePage, DashboardPage, MerAIPage, TreasuryPage.
2. Run `npm run check:build` to surface TypeScript or linting errors.
3. After CI passes, merge the branch and I will start Phase B: introduce shared UI primitives and route-based splitting to improve performance and maintainability.

If you'd like, I will now open a PR with these changes and attach the tsc/lint/build outputs and screenshots. Let me know if you want me to proceed with opening the PR.