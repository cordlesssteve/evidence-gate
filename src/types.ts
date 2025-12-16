/**
 * Core type definitions for evidence-gate
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CompareConfig {
  /** Minimum absolute difference that matters in your domain */
  practicalThreshold: number;

  /** Significance level (default: 0.05) */
  alpha?: number;

  /** Minimum effect size to consider meaningful (default: 0.5 = medium) */
  effectSizeMinimum?: number;

  /** SD threshold for outlier detection (default: 2.5) */
  outlierThreshold?: number;

  /** Labels for the two samples (default: ['A', 'B']) */
  labels?: [string, string];
}

export interface DiagnosticsConfig {
  /** SD threshold for outlier detection (default: 2.5) */
  outlierThreshold?: number;
}

// ============================================================================
// VERDICTS AND RECOMMENDATIONS
// ============================================================================

export type Verdict =
  | 'significant'         // All three gates passed
  | 'not-significant'     // Failed one or more gates
  | 'insufficient-data'   // n < 3 or other data issues
  | 'data-quality-issue'; // Diagnostics recommend non-parametric (used Mann-Whitney)

export type Recommendation =
  | 'proceed'             // Data quality good, results trustworthy
  | 'caution'             // Minor issues, interpret carefully
  | 'use-nonparametric';  // Data violates parametric assumptions

export type EffectSizeLabel =
  | 'negligible'          // |d| < 0.2
  | 'small'               // 0.2 <= |d| < 0.5
  | 'medium'              // 0.5 <= |d| < 0.8
  | 'large';              // |d| >= 0.8

export type DataQuality =
  | 'good'                // No issues
  | 'acceptable'          // Minor issues
  | 'poor';               // Major issues

// ============================================================================
// STATISTICAL TEST RESULTS
// ============================================================================

export interface WelchTestResult {
  /** t-statistic */
  t: number;
  /** Degrees of freedom (Welch-Satterthwaite) */
  df: number;
  /** Two-tailed p-value */
  pValue: number;
  /** Whether p < alpha */
  significant: boolean;
  /** Cohen's d effect size */
  effectSize: number;
  /** Effect size interpretation */
  effectSizeLabel: EffectSizeLabel;
  /** Difference of means (meanA - meanB) */
  meanDiff: number;
  /** 95% confidence interval for mean difference */
  ci95: [number, number];
}

export interface MannWhitneyResult {
  /** U statistic */
  U: number;
  /** Two-tailed p-value */
  pValue: number;
  /** Whether p < alpha */
  significant: boolean;
  /** Rank-biserial correlation (effect size for non-parametric) */
  effectSize: number;
  /** Effect size interpretation */
  effectSizeLabel: EffectSizeLabel;
}

export interface NormalityTestResult {
  /** Shapiro-Wilk W statistic (closer to 1 = more normal) */
  W: number;
  /** p-value (< 0.05 suggests non-normality) */
  pValue: number;
  /** Whether normality assumption holds (p >= 0.05) */
  isNormal: boolean;
  /** Human-readable interpretation */
  interpretation: string;
  /** Sample size */
  n: number;
}

export interface OutlierResult {
  /** Indices of outlier samples (0-based) */
  indices: number[];
  /** The outlier values themselves */
  values: number[];
  /** Samples with outliers removed */
  cleaned: number[];
  /** Number of outliers found */
  count: number;
  /** Whether >10% of data are outliers */
  tooMany: boolean;
  /** Z-scores for all samples */
  zScores: number[];
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

export interface SampleDiagnostics {
  /** Sample size */
  n: number;
  /** Mean */
  mean: number;
  /** Standard deviation */
  stdDev: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Outlier analysis */
  outliers: OutlierResult;
  /** Normality test result */
  normality: NormalityTestResult;
}

export interface DiagnosticsResult {
  /** Full sample diagnostics */
  sample: SampleDiagnostics;
  /** Overall recommendation */
  recommendation: Recommendation;
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// COMPARISON RESULT
// ============================================================================

export interface Evidence {
  /** Mean of sample A */
  meanA: number;
  /** Mean of sample B */
  meanB: number;
  /** Difference (meanA - meanB) */
  difference: number;
  /** Relative difference as percentage */
  differencePercent: number;
  /** p-value from statistical test */
  pValue: number;
  /** Test statistic (t or U depending on test used) */
  testStatistic: number;
  /** Degrees of freedom (for t-test) or NaN (for Mann-Whitney) */
  degreesOfFreedom: number;
  /** Effect size (Cohen's d or rank-biserial) */
  effectSize: number;
  /** Effect size interpretation */
  effectSizeLabel: EffectSizeLabel;
  /** 95% confidence interval for difference (only for t-test) */
  ci95: [number, number] | null;
  /** Which test was used */
  testUsed: 'welch-t-test' | 'mann-whitney-u';
}

export interface ComparisonDiagnostics {
  /** Diagnostics for sample A */
  sampleA: SampleDiagnostics;
  /** Diagnostics for sample B */
  sampleB: SampleDiagnostics;
  /** Overall data quality assessment */
  overallQuality: DataQuality;
  /** Human-readable warnings */
  warnings: string[];
}

export interface CompareResult {
  /** Final verdict */
  verdict: Verdict;
  /** Recommendation based on data quality */
  recommendation: Recommendation;
  /** Statistical evidence */
  evidence: Evidence;
  /** Data quality diagnostics */
  diagnostics: ComparisonDiagnostics;
  /** Plain English interpretation */
  interpretation: string;
  /** Configuration used */
  config: Required<CompareConfig>;
}
