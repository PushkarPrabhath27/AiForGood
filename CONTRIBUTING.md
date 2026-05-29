# 🤝 Contributing to RaktaSetu NOOR

Welcome to the RaktaSetu NOOR development team! To maintain high code quality, prevent merge conflicts, and ensure frictionless collaboration, all developers must adhere to these guidelines.

---

## 🗺️ Git Strategy & Workflow

We employ a strict **branch segregation strategy** to keep product engineering (frontend) and platform engineering (backend) isolated until integration checkpoints.

### Branch Structure

- **`main`**: Production-ready code. Protected branch. Direct pushes are disabled. Merges only occur via Pull Requests.
- **`dev/person1-frontend`**: Main staging branch for frontend developments.
- **`dev/person2-backend`**: Main staging branch for backend, ML, and integration services.
- **`feat/` or `fix/`**: Short-lived feature/bugfix branches branching off and merging back into their respective `dev/` branch.

```
main (Production)
 └── dev/person1-frontend (Frontend Staging)
 │    └── feat/guardian-constellation ──▶ merged via PR
 │
 └── dev/person2-backend (Backend Staging)
      └── feat/ortools-optimizer ────────▶ merged via PR
```

### Commit Message Standards

We use the **Conventional Commits** specification. This allows automated changelog generation and maintains a clean, structured git log.

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature (e.g., `feat(ml): implement Prophet forecasting pipeline`).
- `fix`: A bug fix (e.g., `fix(api): handle missing Hb readings in forecast gracefully`).
- `docs`: Documentation-only changes (e.g., `docs(readme): add setup instructions for SQLite`).
- `style`: Changes that do not affect the meaning of the code (formatting, white-space, semi-colons).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance (e.g., `perf(grid): batch inventory queries to solve N+1`).
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Changes to the build process, dependency tools, or workflows.

---

## 💻 Coding Standards

### Backend (Python 3.11+)
- **Formatting:** Code must be compatible with `ruff`. Limit line lengths to 100 characters.
- **Type Hints:** Standard Python 3.11+ type hints are **mandatory** on all function signatures.
- **Documentation:** Every public function, class, and module must have a clean docstring detailing arguments, returns, and raised exceptions.
- **Exceptions:** Catch specific exceptions and return clean, user-safe API envelopes (using the `ApiResponse` schemas). Never bubble up raw stack traces.

### Frontend (TypeScript / React)
- **Formatting:** Enforced via `Prettier` and `ESLint`.
- **TypeScript:** Enforce `strict: true`. Avoid using `any` at all costs. Utilize discriminated unions for complex statuses.
- **Components:** Maintain separation of concerns. Keep components small, modular, and focused.

---

## 📥 Pull Request (PR) Workflow

1. **Keep it Small:** A PR should focus on a single task, containing no more than **400 lines** of changes. Large PRs are hard to review and invite bugs.
2. **Local Validation:** Before opening a PR:
   - Ensure all backend unit tests pass by running `pytest`.
   - Ensure the code lints cleanly without errors.
3. **Open the PR:** Fill out the Pull Request Template completely. Link the relevant issues or blueprint sections.
4. **Code Review:** At least one team member must approve the PR before it is merged. Address all review comments constructively.
5. **No Orphan Commits:** Clean up temporary commits by utilizing a **Squash and Merge** strategy when completing a PR.
