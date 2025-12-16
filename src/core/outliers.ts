/**
 * Outlier detection using z-score method
 */

import * as ss from 'simple-statistics';
import type { OutlierResult } from '../types.js';

/**
 * Detect outliers using the standard deviation rule
 *
 * An observation is flagged as an outlier if |z-score| > threshold (default 2.5)
 *
 * Note: Default is 2.5 SD (not 3 SD) because outliers inflate the SD, causing
 * "masking" where moderate outliers escape detection. 2.5 SD is more practical.
 *
 * From statistician review: "If >10% of data are outliers → consider non-parametric test"
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
