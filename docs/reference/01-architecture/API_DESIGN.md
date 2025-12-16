# evidence-gate API Design

**Status:** DRAFT
**Created:** 2025-12-16
**Last Updated:** 2025-12-16

---

## Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DESIGN PRINCIPLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. ACTIONABLE OVER RAW                                                      │
│     Return recommendations, not just numbers                                 │
│                                                                              │
│  2. SAFE BY DEFAULT                                                          │
│     Warn about data quality issues before they corrupt conclusions           │
│                                                                              │
│  3. THREE-GATE SIGNIFICANCE                                                  │
│     Require p-value + effect size + practical threshold                      │
│                                                                              │
│  4. ZERO DEPENDENCIES (core)                                                 │
│     Pure TypeScript, no external math libraries required                     │
│                                                                              │
│  5. TYPESCRIPT-FIRST                                                         │
│     Full type safety, excellent IDE support                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary API

### `compareConditions()` - Main Entry Point

```typescript
import { compareConditions } from 'evidence-gate';

const result = compareConditions(sampleA, sampleB, {
  // What's the minimum difference that matters in your domain?
  practicalThreshold: 50,  // e.g., 50ms for timing, 5% for conversion rates

  // Optional: customize statistical thresholds
  alpha: 0.05,              // significance level (default: 0.05)
  effectSizeMinimum: 0.5,   // minimum Cohen's d to care about (default: 0.5 = medium)
});

// Returns:
{
  verdict: 'significant' | 'not-significant' | 'insufficient-data' | 'data-quality-issue',

  recommendation: 'proceed' | 'caution' | 'use-nonparametric',

  evidence: {
    meanA: number,
    meanB: number,
    difference: number,          // meanA - meanB
    differencePercent: number,   // relative to meanB

    pValue: number,
    tStatistic: number,
    degreesOfFreedom: number,

    effectSize: number,          // Cohen's d
    effectSizeLabel: 'negligible' | 'small' | 'medium' | 'large',

    ci95: [number, number],      // 95% confidence interval for difference
  },

  diagnostics: {
    sampleA: {
      n: number,
      outliers: { count: number, values: number[], indices: number[] },
      normality: { W: number, pValue: number, isNormal: boolean },
    },
    sampleB: { /* same structure */ },

    overallQuality: 'good' | 'acceptable' | 'poor',
    warnings: string[],          // Human-readable issues
  },

  interpretation: string,        // Plain English summary
}
```

### Usage Example

```typescript
import { compareConditions } from 'evidence-gate';

// Timing measurements from two implementations
const oldImplementation = [101, 98, 105, 200, 99, 102, 97, 103, 100, 98];
const newImplementation = [85, 82, 88, 84, 86, 83, 87, 85, 84, 86];

const result = compareConditions(oldImplementation, newImplementation, {
  practicalThreshold: 10,  // 10ms is meaningful in our context
});

console.log(result.verdict);
// => 'significant'

console.log(result.interpretation);
// => "New is 15.2ms faster than Old (p=0.0023, d=-1.24 large effect).
//     Difference exceeds practical threshold of 10ms.
//     Recommendation: Accept that New is meaningfully faster."

console.log(result.diagnostics.warnings);
// => ["Sample A has 1 outlier (200) which may inflate variance"]
```

---

## Secondary APIs

### `runDiagnostics()` - Data Quality Check Only

```typescript
import { runDiagnostics } from 'evidence-gate';

const diagnostics = runDiagnostics(samples, {
  outlierThreshold: 2.5,  // SD threshold for outlier detection
});

// Returns:
{
  n: number,
  mean: number,
  stdDev: number,

  outliers: {
    count: number,
    values: number[],
    indices: number[],
    tooMany: boolean,        // >10% are outliers
  },

  normality: {
    W: number,               // Shapiro-Wilk statistic
    pValue: number,
    isNormal: boolean,       // p >= 0.05
    interpretation: string,
  },

  recommendation: 'proceed' | 'caution' | 'use-nonparametric',
  summary: string,
}
```

### `welchTTest()` - Raw Statistical Test

```typescript
import { welchTTest } from 'evidence-gate';

const result = welchTTest(sampleA, sampleB);

// Returns:
{
  t: number,                 // t-statistic
  df: number,                // degrees of freedom (Welch-Satterthwaite)
  pValue: number,            // two-tailed p-value
  significant: boolean,      // p < 0.05
  effectSize: number,        // Cohen's d
  meanDiff: number,          // mean(A) - mean(B)
  ci95: [number, number],    // 95% CI for mean difference
}
```

### `shapiroWilkTest()` - Normality Test

```typescript
import { shapiroWilkTest } from 'evidence-gate';

const result = shapiroWilkTest(samples);

// Returns:
{
  W: number,                 // W statistic (closer to 1 = more normal)
  pValue: number,            // p < 0.05 suggests non-normality
  isNormal: boolean,
  interpretation: string,
  n: number,
}
```

### `detectOutliers()` - Outlier Detection

```typescript
import { detectOutliers } from 'evidence-gate';

const result = detectOutliers(samples, { threshold: 2.5 });

// Returns:
{
  outlierIndices: number[],
  outlierValues: number[],
  cleanedSamples: number[],  // Original minus outliers
  count: number,
  tooManyOutliers: boolean,  // >10% are outliers
  zScores: number[],
}
```

### `mannWhitneyU()` - Non-Parametric Alternative (v1.0)

```typescript
import { mannWhitneyU } from 'evidence-gate';

// Use when normality assumption is violated
const result = mannWhitneyU(sampleA, sampleB);

// Returns:
{
  U: number,                 // U statistic
  pValue: number,
  significant: boolean,
  effectSize: number,        // rank-biserial correlation
}
```

---

## Type Definitions

```typescript
// ============================================================================
// CONFIGURATION
// ============================================================================

interface CompareConfig {
  /** Minimum absolute difference that matters in your domain */
  practicalThreshold: number;

  /** Significance level (default: 0.05) */
  alpha?: number;

  /** Minimum effect size to consider meaningful (default: 0.5 = medium) */
  effectSizeMinimum?: number;

  /** SD threshold for outlier detection (default: 2.5) */
  outlierThreshold?: number;

  /** Labels for the two samples (default: 'A', 'B') */
  labels?: [string, string];
}

// ============================================================================
// RESULTS
// ============================================================================

type Verdict =
  | 'significant'           // All three gates passed
  | 'not-significant'       // Failed one or more gates
  | 'insufficient-data'     // n < 3 or other data issues
  | 'data-quality-issue';   // Diagnostics recommend non-parametric

type Recommendation =
  | 'proceed'               // Data quality good, results trustworthy
  | 'caution'               // Minor issues, interpret carefully
  | 'use-nonparametric';    // Data violates parametric assumptions

type EffectSizeLabel =
  | 'negligible'            // |d| < 0.2
  | 'small'                 // 0.2 <= |d| < 0.5
  | 'medium'                // 0.5 <= |d| < 0.8
  | 'large';                // |d| >= 0.8

type DataQuality =
  | 'good'                  // No issues
  | 'acceptable'            // Minor issues
  | 'poor';                 // Major issues

// ============================================================================
// FULL RESULT INTERFACE
// ============================================================================

interface CompareResult {
  verdict: Verdict;
  recommendation: Recommendation;

  evidence: {
    meanA: number;
    meanB: number;
    difference: number;
    differencePercent: number;

    pValue: number;
    tStatistic: number;
    degreesOfFreedom: number;

    effectSize: number;
    effectSizeLabel: EffectSizeLabel;

    ci95: [number, number];
  };

  diagnostics: {
    sampleA: SampleDiagnostics;
    sampleB: SampleDiagnostics;
    overallQuality: DataQuality;
    warnings: string[];
  };

  interpretation: string;
}

interface SampleDiagnostics {
  n: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;

  outliers: {
    count: number;
    values: number[];
    indices: number[];
    tooMany: boolean;
  };

  normality: {
    W: number;
    pValue: number;
    isNormal: boolean;
    interpretation: string;
  };
}
```

---

## Decision Framework Visualization

```
                     ┌─────────────────────────────────────┐
                     │         INPUT: Two Samples          │
                     │     sampleA: number[]               │
                     │     sampleB: number[]               │
                     └─────────────────┬───────────────────┘
                                       │
                                       ▼
              ┌────────────────────────────────────────────────┐
              │              STAGE 1: DIAGNOSTICS              │
              │  ┌──────────────────┐  ┌──────────────────┐   │
              │  │  Outlier Check   │  │  Normality Test  │   │
              │  │  (z > 2.5 SD?)   │  │  (Shapiro-Wilk)  │   │
              │  └────────┬─────────┘  └────────┬─────────┘   │
              └───────────┼─────────────────────┼─────────────┘
                          │                     │
                          ▼                     ▼
                   ┌──────────────────────────────────┐
                   │        RECOMMENDATION            │
                   │  ┌─────────┬─────────┬────────┐  │
                   │  │ proceed │ caution │ nonpar │  │
                   │  └─────────┴─────────┴────────┘  │
                   └───────────────┬──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
              recommendation               recommendation
              != nonparametric             == nonparametric
                    │                             │
                    ▼                             ▼
         ┌─────────────────────┐      ┌─────────────────────┐
         │  STAGE 2: t-TEST    │      │  verdict:           │
         │  Welch's t-test     │      │  'data-quality-issue'│
         │  (unequal variance) │      │  (suggest Mann-Whitney)│
         └──────────┬──────────┘      └─────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────────────────┐
         │            STAGE 3: THREE-GATE CHECK            │
         │                                                 │
         │   GATE 1          GATE 2          GATE 3        │
         │   ══════          ══════          ══════        │
         │   p < alpha?      |d| >= min?     |Δ| >= thresh?│
         │   (0.05)          (0.5)           (user-defined)│
         │                                                 │
         │        │              │               │         │
         │        ▼              ▼               ▼         │
         │   ┌─────────┐   ┌─────────┐   ┌─────────────┐   │
         │   │ p=0.002 │   │ d=-1.24 │   │ Δ=15.2ms    │   │
         │   │   ✓     │   │   ✓     │   │   ✓         │   │
         │   └─────────┘   └─────────┘   └─────────────┘   │
         │                                                 │
         │        ALL THREE PASS?                          │
         │              │                                  │
         │      ┌───────┴───────┐                          │
         │      │               │                          │
         │     YES             NO                          │
         │      │               │                          │
         │      ▼               ▼                          │
         │  'significant'  'not-significant'               │
         │                                                 │
         └─────────────────────────────────────────────────┘
                              │
                              ▼
         ┌─────────────────────────────────────────────────┐
         │          STAGE 4: INTERPRETATION                │
         │                                                 │
         │  "New is 15.2ms faster than Old                 │
         │   (p=0.0023, d=-1.24 large effect).             │
         │   Difference exceeds practical threshold        │
         │   of 10ms.                                      │
         │   Recommendation: Accept that New is            │
         │   meaningfully faster."                         │
         │                                                 │
         └─────────────────────────────────────────────────┘
```

---

## File Structure

```
evidence-gate/
├── src/
│   ├── index.ts                 # Public API exports
│   │
│   ├── core/
│   │   ├── welch-t-test.ts      # Welch's t-test implementation
│   │   ├── shapiro-wilk.ts      # Normality test
│   │   ├── outliers.ts          # Outlier detection
│   │   ├── effect-size.ts       # Cohen's d calculation
│   │   └── mann-whitney.ts      # Non-parametric alternative (v1.0)
│   │
│   ├── math/
│   │   ├── distributions.ts     # t-dist, normal CDF/quantile
│   │   ├── gamma.ts             # Log-gamma, incomplete beta
│   │   └── error-function.ts    # erf approximation
│   │
│   ├── diagnostics/
│   │   ├── sample-quality.ts    # Combined outlier + normality
│   │   ├── practical-sig.ts     # Three-gate framework
│   │   └── recommendations.ts   # proceed/caution/nonparametric
│   │
│   ├── compare.ts               # Main compareConditions() function
│   │
│   └── types.ts                 # All TypeScript interfaces
│
├── test/
│   ├── verify-statistics.test.ts   # Verification against known values
│   ├── compare.test.ts             # Integration tests
│   └── edge-cases.test.ts          # Boundary conditions
│
├── package.json
├── tsconfig.json
├── PROJECT_CHARTER.md
├── CURRENT_STATUS.md
└── README.md
```

---

## Migration Path from MonkeTree

| MonkeTree Source | evidence-gate Destination | Notes |
|------------------|---------------------------|-------|
| `utils.ts` lines 15-73 | `core/welch-t-test.ts` | WelchTestResult + welchTTest() |
| `utils.ts` lines 75-270 | `math/distributions.ts` | tDistCDF, tDistQuantile, normalCDF, etc |
| `utils.ts` lines 275-460 | `core/shapiro-wilk.ts` | NormalityTestResult + shapiroWilkTest() |
| `utils.ts` lines 463-566 | `core/outliers.ts` | OutlierResult + detectOutliers() |
| `utils.ts` lines 568-650 | `diagnostics/sample-quality.ts` | DiagnosticResult + runDiagnostics() |
| `types.ts` statistical types | `types.ts` | Clean extraction of stats-only types |
| `test-statistics.ts` | `test/verify-statistics.test.ts` | Port to Jest/Vitest |

**Browser-specific code (stays in MonkeTree):**
- getJSHeapSize()
- getTotalProcessMemory()
- Timer class
- saveResults()
- formatBytes(), formatMs()

---

## Open Questions

1. **Dependency strategy:** Pure TypeScript vs optional simple-statistics wrapper?
2. **Test framework:** Jest vs Vitest?
3. **Package scope:** `@cordlesssteve/evidence-gate` vs unscoped `evidence-gate`?
4. **Mann-Whitney priority:** Include in v0.1 or defer to v1.0?
