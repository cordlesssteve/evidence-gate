/**
 * Outlier detection methods
 *
 * Provides two approaches:
 * 1. Z-score method (assumes normal distribution)
 * 2. IQR method (robust, works with any distribution)
 */

import * as ss from 'simple-statistics';
import type { OutlierResult } from '../types.js';

/**
 * Detect outliers using the z-score (standard deviation) method
 *
 * An observation is flagged as an outlier if |z-score| > threshold (default 2.5)
 *
 * Note: Default is 2.5 SD (not 3 SD) because outliers inflate the SD, causing
 * "masking" where moderate outliers escape detection. 2.5 SD is more practical.
 *
 * WARNING: This method assumes approximately normal distribution. For skewed
 * data or when outliers are extreme, use detectOutliersIQR() instead.
 *
 * @param samples - Array of numeric observations
 * @param threshold - Number of SDs from mean to flag (default: 2.5)
 * @returns OutlierResult with indices, values, and cleaned samples
 */
export function detectOutliers(samples: number[], threshold = 2.5): OutlierResult {
  if (samples.length < 3) {
    return {
      indices: [],
      values: [],
      cleaned: [...samples],
      count: 0,
      tooMany: false,
      zScores: samples.map(() => 0),
    };
  }

  const mean = ss.mean(samples);
  const stdDev = ss.sampleStandardDeviation(samples);

  // Handle zero/tiny stdDev (all values identical or nearly so)
  if (stdDev < 1e-10) {
    return {
      indices: [],
      values: [],
      cleaned: [...samples],
      count: 0,
      tooMany: false,
      zScores: samples.map(() => 0),
    };
  }

  const zScores = samples.map(s => (s - mean) / stdDev);
  const indices: number[] = [];
  const values: number[] = [];
  const cleaned: number[] = [];

  samples.forEach((sample, index) => {
    const z = zScores[index];
    if (z !== undefined && Math.abs(z) > threshold) {
      indices.push(index);
      values.push(sample);
    } else {
      cleaned.push(sample);
    }
  });

  return {
    indices,
    values,
    cleaned,
    count: indices.length,
    tooMany: indices.length / samples.length > 0.1,
    zScores,
  };
}

/**
 * IQR-based outlier result (extends base with IQR-specific info)
 */
export interface IQROutlierResult extends Omit<OutlierResult, 'zScores'> {
  /** First quartile (25th percentile) */
  Q1: number;
  /** Third quartile (75th percentile) */
  Q3: number;
  /** Interquartile range (Q3 - Q1) */
  IQR: number;
  /** Lower fence (Q1 - multiplier * IQR) */
  lowerFence: number;
  /** Upper fence (Q3 + multiplier * IQR) */
  upperFence: number;
}

/**
 * Detect outliers using the IQR (Interquartile Range) method
 *
 * This method is more robust than z-score because:
 * 1. It doesn't assume normal distribution
 * 2. Extreme outliers don't inflate the IQR (unlike SD)
 * 3. Works well with skewed data
 *
 * Standard fences:
 * - multiplier = 1.5: "mild" outliers (default, Tukey's method)
 * - multiplier = 3.0: "extreme" outliers
 *
 * @param samples - Array of numeric observations
 * @param multiplier - IQR multiplier for fences (default: 1.5)
 * @returns IQROutlierResult with quartiles, fences, and outlier info
 */
export function detectOutliersIQR(samples: number[], multiplier = 1.5): IQROutlierResult {
  if (samples.length < 4) {
    return {
      indices: [],
      values: [],
      cleaned: [...samples],
      count: 0,
      tooMany: false,
      Q1: samples.length > 0 ? samples[0]! : 0,
      Q3: samples.length > 0 ? samples[samples.length - 1]! : 0,
      IQR: 0,
      lowerFence: -Infinity,
      upperFence: Infinity,
    };
  }

  // Calculate quartiles
  const sorted = [...samples].sort((a, b) => a - b);
  const Q1 = ss.quantile(sorted, 0.25);
  const Q3 = ss.quantile(sorted, 0.75);
  const IQR = Q3 - Q1;

  // Calculate fences
  const lowerFence = Q1 - multiplier * IQR;
  const upperFence = Q3 + multiplier * IQR;

  // Find outliers
  const indices: number[] = [];
  const values: number[] = [];
  const cleaned: number[] = [];

  samples.forEach((sample, index) => {
    if (sample < lowerFence || sample > upperFence) {
      indices.push(index);
      values.push(sample);
    } else {
      cleaned.push(sample);
    }
  });

  return {
    indices,
    values,
    cleaned,
    count: indices.length,
    tooMany: indices.length / samples.length > 0.1,
    Q1,
    Q3,
    IQR,
    lowerFence,
    upperFence,
  };
}

/**
 * Combined outlier detection using both methods
 *
 * Returns a recommendation on which method's results to trust based on
 * data characteristics.
 */
export interface CombinedOutlierResult {
  /** Z-score method results */
  zScore: OutlierResult;
  /** IQR method results */
  iqr: IQROutlierResult;
  /** Recommended method based on data characteristics */
  recommended: 'z-score' | 'iqr';
  /** Reason for recommendation */
  reason: string;
  /** Outliers detected by recommended method */
  outliers: number[];
}

/**
 * Detect outliers using both z-score and IQR methods, with recommendation
 *
 * Use IQR when:
 * - Data may be non-normal
 * - Extreme outliers are present (which inflate SD)
 * - Sample size is small
 *
 * Use z-score when:
 * - Data is approximately normal
 * - You need a parametric approach
 *
 * @param samples - Array of numeric observations
 * @param zThreshold - Z-score threshold (default: 2.5)
 * @param iqrMultiplier - IQR multiplier (default: 1.5)
 */
export function detectOutliersCombined(
  samples: number[],
  zThreshold = 2.5,
  iqrMultiplier = 1.5
): CombinedOutlierResult {
  const zScore = detectOutliers(samples, zThreshold);
  const iqr = detectOutliersIQR(samples, iqrMultiplier);

  // Determine recommendation
  let recommended: 'z-score' | 'iqr';
  let reason: string;

  // If z-score finds no outliers but IQR does, outliers may be masking
  if (zScore.count === 0 && iqr.count > 0) {
    recommended = 'iqr';
    reason = 'Z-score method found no outliers but IQR did - possible masking effect';
  }
  // If z-score finds many more outliers, data may be non-normal
  else if (zScore.count > iqr.count * 2 && iqr.count > 0) {
    recommended = 'iqr';
    reason = 'Z-score flagged many more values - data may be non-normal';
  }
  // Small sample sizes favor IQR (more robust)
  else if (samples.length < 20) {
    recommended = 'iqr';
    reason = 'Small sample size (n < 20) - IQR is more robust';
  }
  // Default to z-score for larger, well-behaved samples
  else {
    recommended = 'z-score';
    reason = 'Standard recommendation for larger samples';
  }

  return {
    zScore,
    iqr,
    recommended,
    reason,
    outliers: recommended === 'z-score' ? zScore.values : iqr.values,
  };
}
