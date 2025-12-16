**Status:** ACTIVE
**Created:** 2025-12-16
**Last Updated:** 2025-12-16

---

## Current State

**Project Maturity:** Level 0 (Concept/Planning)

This project exists as documentation and API design only. No code has been written yet.

### What Exists
- [x] PROJECT_CHARTER.md - Foundational vision document
- [x] CURRENT_STATUS.md - This file
- [x] API_DESIGN.md - Initial API sketch
- [x] Directory structure created

### What Doesn't Exist Yet
- [ ] Any source code
- [ ] package.json / TypeScript config
- [ ] Test suite
- [ ] Extracted code from MonkeTree

---

## Source Material

The code to extract lives in MonkeTree:

| Source File | Lines | What to Extract |
|-------------|-------|-----------------|
| `MonkeTree/src/benchmark/utils.ts` | ~700 | Statistical tests, diagnostics |
| `MonkeTree/src/benchmark/types.ts` | ~100 | Statistical type definitions |
| `MonkeTree/src/benchmark/test-statistics.ts` | 284 | Verification test suite |

**Estimated extraction effort:** 4-5 hours

---

## Next Steps

1. **Initialize npm project** - package.json, tsconfig.json, eslint
2. **Extract core statistics** - Pure functions from MonkeTree utils.ts
3. **Extract types** - Statistical interfaces only (not experiment types)
4. **Port test suite** - test-statistics.ts verification tests
5. **Create public API** - Clean `compareConditions()` entry point
6. **Add Mann-Whitney U** - Non-parametric alternative

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-16 | Create as separate project | Reusability across projects, clean separation of concerns |
| 2025-12-16 | Focus on diagnostic framework | Raw stats are commodity; actionable recommendations are the value-add |
| 2025-12-16 | Minimal dependencies | Reduce maintenance burden, improve portability |
