/**
 * Main comparison function - the primary API for evidence-gate
 */

import { welchTTest } from './core/welch-t-test.js';
import { mannWhitneyU } from './core/mann-whitney.js';
import { getSampleDiagnostics } from './diagnostics/sample-quality.js';
import type {
  CompareConfig,
  CompareResult,
  Verdict,
  Recommendation,
  DataQuality,
  Evidence,
  ComparisonDiagnostics,
} from './types.js';

/**
 * Compare two conditions with full statistical analysis and practical significance
 *
 * This is the main entry point for evidence-gate. It:
 * 1. Runs diagnostics on both samples (outliers, normality)
 * 2. Chooses appropriate test (t-test if normal, Mann-Whitney if not)
 * 3. Applies three-gate significance framework (p-value + effect size + practical threshold)
 * 4. Returns verdict with full evidence and interpretation
 *
 * @param sampleA - First sample (e.g., control or baseline)
 * @param sampleB - Second sample (e.g., treatment or new implementation)
 * @param config - Configuration including practical threshold
 * @returns CompareResult with verdict, evidence, diagnostics, and interpretation
 *
 * @example
 * ```typescript
 * const result = compareConditions(
 *   [101, 98, 105, 99, 102],  // old implementation timing
 *   [85, 82, 88, 84, 86],    // new implementation timing
 *   { practicalThreshold: 10 }  // 10ms is meaningful
 * );
 *
 * console.log(result.verdict);  // 'significant'
 * console.log(result.interpretation);  // Human-readable summary
 * ```
 */
export function compareConditions(
  sampleA: number[],
  sampleB: number[],
  config: CompareConfig
): CompareResult {
  // Merge config with defaults
  const fullConfig: Required<CompareConfig> = {
    practicalThreshold: config.practicalThreshold,
    alpha: config.alpha ?? 0.05,
    effectSizeMinimum: config.effectSizeMinimum ?? 0.5,
    outlierThreshold: config.outlierThreshold ?? 2.5,
    labels: config.labels ?? ['A', 'B'],
  };

  // Check for insufficient data
  if (sampleA.length < 3 || sampleB.length < 3) {
    return createInsufficientDataResult(sampleA, sampleB, fullConfig);
  }

  // Run diagnostics on both samples
  const diagA = getSampleDiagnostics(sampleA, fullConfig.outlierThreshold);
  const diagB = getSampleDiagnostics(sampleB, fullConfig.outlierThreshold);

  // Determine overall data quality and recommendation
  const { overallQuality, warnings, recommendation } = assessDataQuality(diagA, diagB, fullConfig.labels);

  // Choose test based on data quality
  const useNonParametric = recommendation === 'use-nonparametric';

  // Run appropriate statistical test
  let evidence: Evidence;
  let testVerdict: Verdict;

  if (useNonParametric) {
    // Mann-Whitney U test
    const result = mannWhitneyU(sampleA, sampleB, fullConfig.alpha);

    evidence = {
      meanA: diagA.mean,
      meanB: diagB.mean,
      difference: diagA.mean - diagB.mean,
      differencePercent: diagB.mean !== 0 ? ((diagA.mean - diagB.mean) / diagB.mean) * 100 : 0,
      pValue: result.pValue,
      testStatistic: result.U,
      degreesOfFreedom: NaN, // Not applicable for Mann-Whitney
      effectSize: result.effectSize,
      effectSizeLabel: result.effectSizeLabel,
      ci95: null, // Not available for Mann-Whitney
      testUsed: 'mann-whitney-u',
    };

    testVerdict = determineVerdict(
      result.significant,
      Math.abs(result.effectSize),
      Math.abs(diagA.mean - diagB.mean),
      fullConfig,
      true // For rank-biserial, thresholds are different
    );

    // Note: We still return significant/not-significant based on the test result.
    // The recommendation field indicates that data quality was poor and Mann-Whitney was used.
    // 'data-quality-issue' verdict is reserved for cases where we truly cannot determine.
  } else {
    // Welch's t-test
    const result = welchTTest(sampleA, sampleB, fullConfig.alpha);

    evidence = {
      meanA: diagA.mean,
      meanB: diagB.mean,
      difference: result.meanDiff,
      differencePercent: diagB.mean !== 0 ? (result.meanDiff / diagB.mean) * 100 : 0,
      pValue: result.pValue,
      testStatistic: result.t,
      degreesOfFreedom: result.df,
      effectSize: result.effectSize,
      effectSizeLabel: result.effectSizeLabel,
      ci95: result.ci95,
      testUsed: 'welch-t-test',
    };

    testVerdict = determineVerdict(
      result.significant,
      Math.abs(result.effectSize),
      Math.abs(result.meanDiff),
      fullConfig,
      false
    );
  }

  // Build diagnostics object
  const diagnostics: ComparisonDiagnostics = {
    sampleA: diagA,
    sampleB: diagB,
    overallQuality,
    warnings,
  };

  // Build interpretation
  const interpretation = buildInterpretation(
    evidence,
    testVerdict,
    recommendation,
    fullConfig
  );

  return {
    verdict: testVerdict,
    recommendation,
    evidence,
    diagnostics,
    interpretation,
    config: fullConfig,
  };
}

/**
 * Create result for insufficient data
 */
function createInsufficientDataResult(
  sampleA: number[],
  sampleB: number[],
  config: Required<CompareConfig>
): CompareResult {
  const diagA = getSampleDiagnostics(sampleA, config.outlierThreshold);
  const diagB = getSampleDiagnostics(sampleB, config.outlierThreshold);

  return {
    verdict: 'insufficient-data',
    recommendation: 'caution',
    evidence: {
      meanA: diagA.mean,
      meanB: diagB.mean,
      difference: diagA.mean - diagB.mean,
      differencePercent: 0,
      pValue: 1,
      testStatistic: 0,
      degreesOfFreedom: 0,
      effectSize: 0,
      effectSizeLabel: 'negligible',
      ci95: null,
      testUsed: 'welch-t-test',
    },
    diagnostics: {
      sampleA: diagA,
      sampleB: diagB,
      overallQuality: 'poor',
      warnings: [`Insufficient data: ${config.labels[0]} has ${sampleA.length} samples, ${config.labels[1]} has ${sampleB.length} samples. Need at least 3 each.`],
    },
    interpretation: `Cannot perform comparison: need at least 3 samples per condition. ${config.labels[0]} has ${sampleA.length}, ${config.labels[1]} has ${sampleB.length}.`,
    config,
  };
}

/**
 * Assess overall data quality from both samples
 */
function assessDataQuality(
  diagA: ReturnType<typeof getSampleDiagnostics>,
  diagB: ReturnType<typeof getSampleDiagnostics>,
  labels: [string, string]
): { overallQuality: DataQuality; warnings: string[]; recommendation: Recommendation } {
  const warnings: string[] = [];
  let recommendation: Recommendation = 'proceed';

  // Check outliers
  if (diagA.outliers.tooMany) {
    warnings.push(`${labels[0]} has >10% outliers (${diagA.outliers.count}/${diagA.n}).`);
    recommendation = 'use-nonparametric';
  } else if (diagA.outliers.count > 0) {
    warnings.push(`${labels[0]} has ${diagA.outliers.count} outlier(s): [${diagA.outliers.values.map(v => v.toFixed(1)).join(', ')}].`);
    if (recommendation === 'proceed') recommendation = 'caution';
  }

  if (diagB.outliers.tooMany) {
    warnings.push(`${labels[1]} has >10% outliers (${diagB.outliers.count}/${diagB.n}).`);
    recommendation = 'use-nonparametric';
  } else if (diagB.outliers.count > 0) {
    warnings.push(`${labels[1]} has ${diagB.outliers.count} outlier(s): [${diagB.outliers.values.map(v => v.toFixed(1)).join(', ')}].`);
    if (recommendation === 'proceed') recommendation = 'caution';
  }

  // Check normality
  if (!diagA.normality.isNormal) {
    warnings.push(`${labels[0]} deviates from normality (W=${diagA.normality.W.toFixed(3)}, p=${diagA.normality.pValue.toFixed(4)}).`);
    recommendation = 'use-nonparametric';
  }

  if (!diagB.normality.isNormal) {
    warnings.push(`${labels[1]} deviates from normality (W=${diagB.normality.W.toFixed(3)}, p=${diagB.normality.pValue.toFixed(4)}).`);
    recommendation = 'use-nonparametric';
  }

  // Determine overall quality
  let overallQuality: DataQuality;
  if (recommendation === 'use-nonparametric') {
    overallQuality = 'poor';
  } else if (recommendation === 'caution') {
    overallQuality = 'acceptable';
  } else {
    overallQuality = 'good';
  }

  return { overallQuality, warnings, recommendation };
}

/**
 * Determine verdict using three-gate framework
 */
function determineVerdict(
  isStatisticallySignificant: boolean,
  absEffectSize: number,
  absDifference: number,
  config: Required<CompareConfig>,
  isRankBiserial: boolean
): Verdict {
  // Gate 1: Statistical significance
  if (!isStatisticallySignificant) {
    return 'not-significant';
  }

  // Gate 2: Effect size (different thresholds for Cohen's d vs rank-biserial)
  const effectThreshold = isRankBiserial ? 0.3 : config.effectSizeMinimum; // 0.3 = medium for rank-biserial
  if (absEffectSize < effectThreshold) {
    return 'not-significant';
  }

  // Gate 3: Practical significance
  if (absDifference < config.practicalThreshold) {
    return 'not-significant';
  }

  // All gates passed
  return 'significant';
}

/**
 * Build human-readable interpretation
 */
function buildInterpretation(
  evidence: Evidence,
  verdict: Verdict,
  recommendation: Recommendation,
  config: Required<CompareConfig>
): string {
  const [labelA, labelB] = config.labels;
  const diff = evidence.difference;
  const absDiff = Math.abs(diff);
  const direction = diff > 0 ? 'higher' : 'lower';
  const pct = Math.abs(evidence.differencePercent).toFixed(1);

  const parts: string[] = [];

  // Main finding
  parts.push(
    `${labelA} is ${absDiff.toFixed(1)} ${direction} than ${labelB} (${pct}% difference).`
  );

  // Statistical details
  if (evidence.testUsed === 'welch-t-test') {
    parts.push(
      `Welch's t-test: t=${evidence.testStatistic.toFixed(3)}, p=${evidence.pValue.toFixed(4)}, Cohen's d=${evidence.effectSize.toFixed(2)} (${evidence.effectSizeLabel}).`
    );
    if (evidence.ci95) {
      parts.push(`95% CI: [${evidence.ci95[0].toFixed(1)}, ${evidence.ci95[1].toFixed(1)}].`);
    }
  } else {
    parts.push(
      `Mann-Whitney U: U=${evidence.testStatistic.toFixed(1)}, p=${evidence.pValue.toFixed(4)}, r=${evidence.effectSize.toFixed(2)} (${evidence.effectSizeLabel}).`
    );
  }

  // Verdict explanation
  switch (verdict) {
    case 'significant':
      parts.push(
        `VERDICT: Significant difference. All three gates passed (p < ${config.alpha}, effect ≥ ${config.effectSizeMinimum}, Δ ≥ ${config.practicalThreshold}).`
      );
      break;
    case 'not-significant':
      parts.push(
        `VERDICT: Not significant. Failed one or more gates (threshold: p < ${config.alpha}, effect ≥ ${config.effectSizeMinimum}, Δ ≥ ${config.practicalThreshold}).`
      );
      break;
    case 'data-quality-issue':
      parts.push(
        `VERDICT: Used non-parametric test due to data quality issues. Interpret with caution.`
      );
      break;
    case 'insufficient-data':
      parts.push(`VERDICT: Cannot determine - insufficient data.`);
      break;
  }

  // Recommendation
  if (recommendation !== 'proceed') {
    parts.push(`Note: Data quality is ${recommendation === 'caution' ? 'acceptable but with warnings' : 'poor'}.`);
  }

  return parts.join(' ');
}
