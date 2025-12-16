/**
 * Data quality diagnostics
 *
 * Combines outlier detection and normality testing to provide
 * actionable recommendations on whether parametric tests are appropriate.
 */

import * as ss from 'simple-statistics';
import { detectOutliers } from '../core/outliers.js';
import { shapiroWilkTest } from '../core/normality.js';
import type {
  SampleDiagnostics,
  DiagnosticsResult,
  Recommendation,
  DiagnosticsConfig,
} from '../types.js';

/**
 * Run full diagnostics on a single sample
 *
 * @param samples - Array of numeric observations
 * @param config - Diagnostic configuration
 * @returns DiagnosticsResult with sample stats, outliers, normality, and recommendation
 */
export function runDiagnostics(
  samples: number[],
  config: DiagnosticsConfig = {}
): DiagnosticsResult {
  const { outlierThreshold = 2.5 } = config;

  // Basic stats
  const n = samples.length;

  if (n < 3) {
    return {
      sample: {
        n,
        mean: n > 0 ? ss.mean(samples) : 0,
        stdDev: n > 1 ? ss.sampleStandardDeviation(samples) : 0,
        min: n > 0 ? ss.min(samples) : 0,
        max: n > 0 ? ss.max(samples) : 0,
        outliers: {
          indices: [],
          values: [],
          cleaned: [...samples],
          count: 0,
          tooMany: false,
          zScores: [],
        },
        normality: {
          W: 1,
          pValue: 1,
          isNormal: true,
          interpretation: 'Insufficient data (n < 3)',
          n,
        },
      },
      recommendation: 'caution',
      summary: `Insufficient data (n=${n}). Need at least 3 observations for meaningful analysis.`,
    };
  }

  const mean = ss.mean(samples);
  const stdDev = ss.sampleStandardDeviation(samples);
  const min = ss.min(samples);
  const max = ss.max(samples);

  // Outlier detection
  const outliers = detectOutliers(samples, outlierThreshold);

  // Normality test
  const normality = shapiroWilkTest(samples);

  // Determine recommendation
  const recommendation = determineRecommendation(outliers.tooMany, normality.isNormal);

  // Build summary
  const summary = buildSummary(outliers, normality, recommendation);

  return {
    sample: {
      n,
      mean,
      stdDev,
      min,
      max,
      outliers,
      normality,
    },
    recommendation,
    summary,
  };
}

/**
 * Determine recommendation based on outliers and normality
 */
function determineRecommendation(
  tooManyOutliers: boolean,
  isNormal: boolean
): Recommendation {
  if (tooManyOutliers) {
    return 'use-nonparametric';
  }

  if (!isNormal) {
    return 'use-nonparametric';
  }

  return 'proceed';
}

/**
 * Build human-readable summary
 */
function buildSummary(
  outliers: SampleDiagnostics['outliers'],
  normality: SampleDiagnostics['normality'],
  recommendation: Recommendation
): string {
  const parts: string[] = [];

  // Outlier summary
  if (outliers.count === 0) {
    parts.push('No outliers detected.');
  } else if (outliers.tooMany) {
    parts.push(`Warning: ${outliers.count} outliers detected (>10% of data).`);
  } else {
    parts.push(`${outliers.count} outlier(s) detected: [${outliers.values.map(v => v.toFixed(1)).join(', ')}].`);
  }

  // Normality summary
  if (normality.isNormal) {
    parts.push('Data appears normally distributed.');
  } else {
    parts.push(`Data deviates from normality (W=${normality.W.toFixed(3)}, p=${normality.pValue.toFixed(4)}).`);
  }

  // Recommendation
  switch (recommendation) {
    case 'proceed':
      parts.push('Recommendation: Proceed with parametric test (t-test).');
      break;
    case 'caution':
      parts.push('Recommendation: Proceed with caution, interpret results carefully.');
      break;
    case 'use-nonparametric':
      parts.push('Recommendation: Use non-parametric test (Mann-Whitney U).');
      break;
  }

  return parts.join(' ');
}

/**
 * Get sample diagnostics (without recommendation logic)
 */
export function getSampleDiagnostics(
  samples: number[],
  outlierThreshold = 2.5
): SampleDiagnostics {
  const n = samples.length;

  if (n === 0) {
    return {
      n: 0,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      outliers: {
        indices: [],
        values: [],
        cleaned: [],
        count: 0,
        tooMany: false,
        zScores: [],
      },
      normality: {
        W: 1,
        pValue: 1,
        isNormal: true,
        interpretation: 'No data',
        n: 0,
      },
    };
  }

  return {
    n,
    mean: ss.mean(samples),
    stdDev: n > 1 ? ss.sampleStandardDeviation(samples) : 0,
    min: ss.min(samples),
    max: ss.max(samples),
    outliers: detectOutliers(samples, outlierThreshold),
    normality: shapiroWilkTest(samples),
  };
}
