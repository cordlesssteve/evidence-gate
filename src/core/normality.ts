/**
 * Shapiro-Wilk normality test
 *
 * simple-statistics doesn't have Shapiro-Wilk, so we implement it ourselves.
 * This is adapted from the verified MonkeTree implementation.
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

  // Calculate Shapiro-Wilk coefficients
  const a = shapiroWilkCoefficients(n);

  // Calculate numerator: (sum of a[i] * (x[n-i] - x[i]))^2
  let numerator = 0;
  const halfN = Math.floor(n / 2);
  for (let i = 0; i < halfN; i++) {
    const coef = a[i];
    const high = sorted[n - 1 - i];
    const low = sorted[i];
    if (coef !== undefined && high !== undefined && low !== undefined) {
      numerator += coef * (high - low);
    }
  }
  numerator = numerator ** 2;

  // W statistic
  const W = numerator / sumSquaredDev;

  // Calculate p-value using Royston approximation
  const pValue = shapiroWilkPValue(W, n);

  const isNormal = pValue >= 0.05;
  let interpretation: string;
  if (isNormal) {
    interpretation = `Data appears normally distributed (W=${W.toFixed(4)}, p=${pValue.toFixed(4)})`;
  } else {
    interpretation = `Data deviates from normality (W=${W.toFixed(4)}, p=${pValue.toFixed(4)}) - consider non-parametric test`;
  }

  return { W, pValue, isNormal, interpretation, n };
}

/**
 * Calculate Shapiro-Wilk coefficients using Royston's approximation
 */
function shapiroWilkCoefficients(n: number): number[] {
  const a: number[] = [];
  const halfN = Math.floor(n / 2);

  // Calculate expected values of order statistics from standard normal
  const m: number[] = [];
  for (let i = 1; i <= n; i++) {
    m.push(normalQuantile((i - 0.375) / (n + 0.25)));
  }

  // Calculate sum of squared m values
  const mSumSq = m.reduce((sum, mi) => sum + mi * mi, 0);

  // Calculate coefficients
  for (let i = 0; i < halfN; i++) {
    const mLow = m[i];
    const mHigh = m[n - 1 - i];
    if (mLow !== undefined && mHigh !== undefined) {
      a.push((mHigh - mLow) / Math.sqrt(mSumSq));
    }
  }

  return a;
}

/**
 * Calculate p-value for Shapiro-Wilk W statistic using Royston (1992) approximation
 */
function shapiroWilkPValue(W: number, n: number): number {
  // Transformation to approximate normality
  let z: number;

  if (n <= 11) {
    // Small sample approximation
    const gamma = 0.459 * n - 2.273;
    const w = -Math.log(gamma - Math.log(1 - W));
    const mu = -0.0006714 * n ** 3 + 0.025054 * n ** 2 - 0.39978 * n + 0.5440;
    const sigma = Math.exp(-0.0020322 * n ** 3 + 0.062767 * n ** 2 - 0.77857 * n + 1.3822);
    z = (w - mu) / sigma;
  } else {
    // Large sample approximation (n > 11)
    const logN = Math.log(n);
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
