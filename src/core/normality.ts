/**
 * Shapiro-Wilk normality test
 *
 * Proper implementation based on Royston (1992) algorithm.
 * simple-statistics doesn't have Shapiro-Wilk, so we implement it ourselves.
 */

import * as ss from 'simple-statistics';
import type { NormalityTestResult } from '../types.js';

/**
 * Shapiro-Wilk test for normality
 *
 * Tests H₀: data is normally distributed
 * If p < 0.05, reject normality assumption
 *
 * Valid for 3 ≤ n ≤ 5000. Uses Royston (1992) algorithm for p-value.
 *
 * @param samples - Array of numeric observations (minimum 3)
 * @returns NormalityTestResult with W statistic and p-value
 */
export function shapiroWilkTest(samples: number[]): NormalityTestResult {
  const n = samples.length;

  // Validation
  if (n < 3) {
    return {
      W: 1,
      pValue: 1,
      isNormal: true,
      interpretation: 'Insufficient data (n < 3) - cannot test normality',
      n,
    };
  }

  if (n > 5000) {
    return {
      W: 0,
      pValue: 0,
      isNormal: false,
      interpretation: 'Sample too large (n > 5000) - Shapiro-Wilk not applicable',
      n,
    };
  }

  // Sort samples
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = ss.mean(sorted);

  // Calculate denominator: sum of squared deviations
  const sumSquaredDev = sorted.reduce((sum, x) => sum + (x - mean) ** 2, 0);

  // Handle degenerate case (all values identical)
  if (sumSquaredDev < 1e-10) {
    return {
      W: 1,
      pValue: 1,
      isNormal: true,
      interpretation: 'All values identical - trivially normal',
      n,
    };
  }

  // Get Shapiro-Wilk coefficients from lookup table or approximation
  const a = getShapiroWilkCoefficients(n);

  // Calculate numerator: (sum of a[i] * (x[n-i] - x[i]))^2
  let b = 0;
  const halfN = Math.floor(n / 2);
  for (let i = 0; i < halfN; i++) {
    const ai = a[i];
    const xHigh = sorted[n - 1 - i];
    const xLow = sorted[i];
    if (ai !== undefined && xHigh !== undefined && xLow !== undefined) {
      b += ai * (xHigh - xLow);
    }
  }

  // W statistic = b² / S² where S² = sum of squared deviations
  let W = (b * b) / sumSquaredDev;

  // Clamp W to valid range [0, 1] - numerical errors can push it slightly outside
  W = Math.max(0, Math.min(1, W));

  // Calculate p-value using Royston approximation
  const pValue = shapiroWilkPValue(W, n);

  const isNormal = pValue >= 0.05;
  let interpretation: string;
  if (pValue >= 0.10) {
    interpretation = `Data appears normally distributed (W=${W.toFixed(4)}, p=${pValue.toFixed(4)})`;
  } else if (pValue >= 0.05) {
    interpretation = `Marginal normality (W=${W.toFixed(4)}, p=${pValue.toFixed(4)}) - proceed with caution`;
  } else if (pValue >= 0.01) {
    interpretation = `Non-normal distribution (W=${W.toFixed(4)}, p=${pValue.toFixed(4)}) - consider non-parametric test`;
  } else {
    interpretation = `Strongly non-normal (W=${W.toFixed(4)}, p=${pValue.toFixed(4)}) - use non-parametric test`;
  }

  return { W, pValue, isNormal, interpretation, n };
}

/**
 * Get Shapiro-Wilk coefficients
 *
 * For small n (3-11), use tabulated values from Shapiro-Wilk (1965)
 * For larger n, use Royston's approximation
 */
function getShapiroWilkCoefficients(n: number): number[] {
  // Tabulated coefficients for small samples (Shapiro & Wilk, 1965)
  // These are exact values from the original paper
  const tables: Record<number, number[]> = {
    3: [0.7071],
    4: [0.6872, 0.1677],
    5: [0.6646, 0.2413],
    6: [0.6431, 0.2806, 0.0875],
    7: [0.6233, 0.3031, 0.1401],
    8: [0.6052, 0.3164, 0.1743, 0.0561],
    9: [0.5888, 0.3244, 0.1976, 0.0947],
    10: [0.5739, 0.3291, 0.2141, 0.1224, 0.0399],
    11: [0.5601, 0.3315, 0.2260, 0.1429, 0.0695],
  };

  if (n <= 11 && tables[n]) {
    return tables[n]!;
  }

  // For n > 11, use Royston's approximation
  return approximateCoefficients(n);
}

/**
 * Approximate Shapiro-Wilk coefficients using Royston (1992) algorithm
 */
function approximateCoefficients(n: number): number[] {
  const halfN = Math.floor(n / 2);
  const a: number[] = [];

  // Calculate expected values of order statistics (Blom's approximation)
  const m: number[] = [];
  for (let i = 1; i <= n; i++) {
    m.push(normalQuantile((i - 0.375) / (n + 0.25)));
  }

  // Calculate ||m||²
  const mSumSq = m.reduce((sum, mi) => sum + mi * mi, 0);
  const mNorm = Math.sqrt(mSumSq);

  // Calculate coefficients normalized to ||a|| = 1
  // a_i proportional to m_(n+1-i) - m_i for the paired differences
  for (let i = 0; i < halfN; i++) {
    const mLow = m[i];
    const mHigh = m[n - 1 - i];
    if (mLow !== undefined && mHigh !== undefined) {
      // Coefficient for the i-th pair
      a.push((mHigh - mLow) / (2 * mNorm));
    }
  }

  // Normalize so sum(a²) relates properly to the test
  const aSumSq = a.reduce((sum, ai) => sum + ai * ai, 0);
  const aNorm = Math.sqrt(aSumSq);

  if (aNorm > 0) {
    for (let i = 0; i < a.length; i++) {
      a[i] = a[i]! / aNorm;
    }
  }

  return a;
}

/**
 * Calculate p-value for Shapiro-Wilk W statistic using Royston (1992) approximation
 */
function shapiroWilkPValue(W: number, n: number): number {
  // Handle edge cases
  if (W >= 1) return 1;
  if (W <= 0) return 0;

  let z: number;

  if (n <= 11) {
    // Small sample approximation (Royston, 1992)
    const gamma = 0.459 * n - 2.273;

    // Protect against invalid log arguments
    const inner = gamma - Math.log(1 - W);
    if (inner <= 0) return 0;

    const w = -Math.log(inner);
    const mu = -0.0006714 * n ** 3 + 0.025054 * n ** 2 - 0.39978 * n + 0.5440;
    const sigma = Math.exp(-0.0020322 * n ** 3 + 0.062767 * n ** 2 - 0.77857 * n + 1.3822);
    z = (w - mu) / sigma;
  } else {
    // Large sample approximation (n > 11)
    const logN = Math.log(n);

    // Protect against log(0)
    if (W >= 1) return 1;

    const w = Math.log(1 - W);
    const mu = 0.0038915 * logN ** 3 - 0.083751 * logN ** 2 - 0.31082 * logN - 1.5861;
    const sigma = Math.exp(0.0030302 * logN ** 2 - 0.082676 * logN - 0.4803);
    z = (w - mu) / sigma;
  }

  // Convert z-score to p-value (one-tailed, upper)
  const pValue = 1 - normalCDF(z);

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, pValue));
}

/**
 * Standard normal CDF using error function approximation
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Standard normal quantile (inverse CDF) using rational approximation
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  if (p > 0.5) {
    return -normalQuantile(1 - p);
  }

  const t = Math.sqrt(-2 * Math.log(p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  return -(t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
}

/**
 * Error function approximation (Abramowitz and Stegun)
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}
