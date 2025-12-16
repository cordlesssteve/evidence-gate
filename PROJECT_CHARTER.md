# PROJECT CHARTER

**Status:** FOUNDATIONAL
**Created:** 2025-12-16
**Project Type:** Single-Branch
**Charter Version:** 1.0 (ORIGINAL)
**Revisions:** None

> IMMUTABILITY NOTICE: This charter preserves original project vision.
> Only edit for typos/formatting (log in CHARTER_CHANGELOG.md).
> For scope changes, create CHARTER_REVISION document.

---

## 1. Project Purpose

**Why does this exist?**

To provide a reusable framework that **forces evidence-based claims** by requiring:
1. Statistical significance (p-value)
2. Effect size (Cohen's d)
3. Practical threshold (domain-specific minimum meaningful difference)

Before any comparison can be declared "meaningful."

**The Problem It Solves:**

LLMs (and humans) frequently make claims like "X is faster than Y" without rigorous evidence. This library provides programmatic guardrails that:
- Reject comparisons with poor data quality (outliers, non-normality)
- Require all three significance gates before declaring a winner
- Provide actionable recommendations instead of just p-values

**Origin:**

Extracted from MonkeTree's benchmark suite (`src/benchmark/utils.ts`), which implemented a full statistical testing framework with 24 verified tests against known statistical table values.

---

## 2. Success Criteria

**What does "done" look like?**

### MVP (v0.1.0)
- [ ] Clean public API: `compareConditions(sampleA, sampleB, config)`
- [ ] Core statistical tests: Welch's t-test, Shapiro-Wilk, outlier detection
- [ ] Diagnostic framework: proceed/caution/use-nonparametric recommendations
- [ ] Practical significance gates: p-value + effect size + absolute threshold
- [ ] Test suite ported from MonkeTree (24 verified tests)
- [ ] Zero external dependencies for core stats (optional simple-statistics wrapper)

### v1.0.0
- [ ] Non-parametric alternative: Mann-Whitney U test
- [ ] Markdown report generation
- [ ] JSON export for CI integration
- [ ] Published to npm (scoped or public)

### Future (v2.0+)
- [ ] ANOVA for 3+ groups
- [ ] Correlation tests (Pearson, Spearman)
- [ ] Multiple comparison corrections (Bonferroni)
- [ ] Time series comparison utilities

---

## 3. Scope Boundaries

### In Scope
- Two-sample comparison (A/B testing)
- Data quality diagnostics (normality, outliers)
- Effect size calculation
- Practical significance framework
- Actionable recommendations
- TypeScript-first with ESM exports

### Out of Scope
- Visualization/charting (use external libraries)
- Data collection/timing utilities (domain-specific)
- Machine learning / predictive modeling
- Bayesian statistics (frequentist only for v1)
- Browser-specific measurement (stays in MonkeTree)

---

## 4. Key Stakeholders

| Role | Who | Interest |
|------|-----|----------|
| Creator/Maintainer | @cordlesssteve | Primary user, quality control |
| Primary Consumer | MonkeTree | Benchmark analysis |
| Secondary Consumer | Catzen tests | Test result validation |
| Future Consumers | Any project needing A/B comparison | General utility |

---

## 5. Constraints

### Technical
- **Language:** TypeScript (ESM, Node 18+)
- **Dependencies:** Minimal - prefer zero deps for core, optional wrappers
- **Bundle Size:** < 50KB minified for core
- **Accuracy:** Statistical functions must match published tables within 0.02

### Process
- **Testing:** All statistical functions verified against known values
- **Documentation:** API must include examples and interpretation guidance
- **Versioning:** Semantic versioning, breaking changes only in major versions

---

## 6. Assumptions

- Users understand basic statistics (p-values, effect sizes)
- Input data is numeric arrays (no data cleaning utilities)
- Sample sizes are reasonable (3-5000 for Shapiro-Wilk)
- Two-tailed tests are the default use case

---

## 7. Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Statistical errors in implementation | Low | High | Extensive verification tests against known values |
| Scope creep into full stats library | Medium | Medium | Clear scope boundaries in charter |
| Maintenance burden | Low | Low | Minimal dependencies, stable math |
| Misuse by users who don't understand stats | Medium | Medium | Clear documentation with interpretation guidance |

---

## 8. Relationship to MonkeTree

evidence-gate is **extracted from** MonkeTree but **independent of** it.

```
MonkeTree (consumer)
    │
    └──▶ evidence-gate (library)
              │
              ├── Core stats (from MonkeTree utils.ts)
              ├── Diagnostics (from MonkeTree utils.ts)
              └── NEW: Clean public API
```

MonkeTree will become a consumer of evidence-gate, replacing its current inline statistical code.

---

## Appendix: Original Discussion Context

This project originated from a session analyzing MonkeTree's benchmark infrastructure on 2025-12-16. Key observation:

> "The unique value isn't the t-test math (that's commodity). It's the diagnostic framework that produces actionable recommendations and the practical significance gates that prevent 'statistically significant but meaningless' conclusions."

The goal is to make this framework reusable across any project that needs to make evidence-based comparisons.
