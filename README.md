# R.K Pumps & Motors — POS System

Internal point-of-sale system for billing, inventory, and motor/pump sales management.

---

## Production Pipeline

### 1. Planning a Feature

Before writing any code:
- Describe the feature in a GitHub Issue (what it does, who it helps, edge cases)
- Assign it to a milestone or sprint
- Label it: `feature`, `bug`, `ui`, `security`, or `chore`
- Get sign-off before starting if it touches billing, inventory, or auth

---

### 2. UI & Design Decisions

- All new screens must follow the existing color palette and component patterns (shadcn/ui)
- Mobile-first: test on small screen before desktop
- Forms must have clear labels, error states, and loading indicators
- No new fonts, icon sets, or animation libraries without discussion
- If a screen is complex, sketch it out (even a rough wireframe or description) before building

---

### 3. Adding a New Feature

```bash
# Create a branch from main
git checkout -b feature/feature-name

# Work in small, focused commits
git add <specific files>
git commit -m "feat: short description of what changed"
```

Branch naming:
- `feature/` — new functionality
- `fix/` — bug fixes
- `security/` — auth, data access, input validation
- `chore/` — refactors, config, deps

---

### 4. Testing

Before opening a PR, manually verify:

- [ ] Golden path works end-to-end (create, read, update, delete)
- [ ] Edge cases: empty state, invalid input, network error
- [ ] No console errors in browser dev tools
- [ ] Firestore rules allow only what they should (test with a different user account)
- [ ] Tested on mobile viewport (375px wide)

For billing changes specifically:
- [ ] Invoice totals are correct
- [ ] PDF/print layout is not broken
- [ ] Past records are unaffected

---

### 5. Security

Every change that touches user data, auth, or Firestore must:

- Enforce Firestore security rules — never rely on UI guards alone
- Validate all inputs on write (type, range, required fields)
- Never expose raw Firebase config or service account keys in code
- Auth state must be checked server-side for protected routes
- No `dangerouslySetInnerHTML` without explicit review

Firestore rules live in `firestore.rules`. Any change to rules requires a separate review before deploy.

---

### 6. GitHub Commit & PR Workflow

**Commit messages** follow this format:
```
type: short description (under 72 chars)

Optional longer explanation if the why isn't obvious.
```

Types: `feat`, `fix`, `security`, `chore`, `ui`, `docs`

**Opening a PR:**
- Target branch: `main`
- Title matches the commit style
- Description explains: what changed, why, and how to test it
- Attach screenshots for any UI change
- Tag related Issue number (`Closes #12`)

**Merging:**
- Squash merge preferred for feature branches
- Never force-push to `main`
- Deploy only after manual smoke test on the staging/preview URL

---

### 7. Deploying

- Hosting: Vercel (auto-deploys on merge to `main`)
- Environment variables are set in Vercel dashboard — never in `.env` committed to git
- After deploy, verify: login, billing, inventory, and print flow work
- Rollback via Vercel dashboard if anything is broken
