/**
 * evidence-gate
 *
 * A framework forcing evidence-based claims via statistical significance +
 * effect size + practical threshold.
 *
 * @packageDocumentation
 */

// Main API
export { compareConditions } from './compare.js';

// Core statistical functions
export {
  welchTTest,
  getEffectSizeLabel,
  tDistCDF,
  tDistQuantile,
} from './core/welch-t-test.js';
export { mannWhitneyU } from './core/mann-whitney.js';
export { shapiroWilkTest } from './core/normality.js';
export { detectOutliers, detectOutliersIQR, detectOutliersCombined } from './core/outliers.js';
export type { IQROutlierResult, CombinedOutlierResult } from './core/outliers.js';

// Diagnostics
export { runDiagnostics, getSampleDiagnostics } from './diagnostics/sample-quality.js';

// Types
export type {
  // Configuration
  CompareConfig,
  DiagnosticsConfig,

  // Verdicts and recommendations
  Verdict,
  Recommendation,
  EffectSizeLabel,
  DataQuality,

  // Test results
  WelchTestResult,
  MannWhitneyResult,
  NormalityTestResult,
  OutlierResult,

  // Diagnostics
  SampleDiagnostics,
  DiagnosticsResult,

  // Comparison result
  Evidence,
  ComparisonDiagnostics,
  CompareResult,
} from './types.js';
