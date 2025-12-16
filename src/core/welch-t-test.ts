/**
 * Welch's t-test for two independent samples with unequal variances
 *
 * Uses simple-statistics for basic computations, implements Welch's formula ourselves.
 */

import * as ss from 'simple-statistics';
import type { WelchTestResult, EffectSizeLabel } from '../types.js';

/**
 * Welch's t-test for two independent samples with unequal variances
 *
 * @param sampleA - First sample
 * @param sampleB - Second sample
 * @param alpha - Significance level (default: 0.05)
 * @returns WelchTestResult with t-statistic, p-value, effect size, and CI
 */
export function welchTTest(
  sampleA: number[],
  sampleB: number[],
  alpha = 0.05
): WelchTestResult {
  const n1 = sampleA.length;
  const n2 = sampleB.length;
  const m1 = ss.mean(sampleA);
  const m2 = ss.mean(sampleB);

  // CRITICAL: Must use sample variance (n-1 denominator), not population variance
  const v1 = ss.sampleVariance(sampleA);
  const v2 = ss.sampleVariance(sampleB);

  // Welch's t-statistic
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const num = Math.pow(v1 / n1 + v2 / n2, 2);
  const denom = Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
  const df = num / denom;

  // Two-tailed p-value using t-distribution CDF
  const pValue = 2 * (1 - tDistCDF(Math.abs(t), df));

  // Cohen's d effect size (pooled standard deviation)
  const pooledStd = Math.sqrt(
    ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
  );
  const effectSize = (m1 - m2) / pooledStd;

  // 95% CI for mean difference
  const tCrit = tDistQuantile(1 - alpha / 2, df);
  const meanDiff = m1 - m2;
  const ci95: [number, number] = [
    meanDiff - tCrit * se,
    meanDiff + tCrit * se,
  ];

  return {
    t,
    df,
    pValue,
    significant: pValue < alpha,
    effectSize,
    effectSizeLabel: getEffectSizeLabel(effectSize),
    meanDiff,
    ci95,
  };
}

/**
 * Get effect size label from Cohen's d value
 */
export function getEffectSizeLabel(d: number): EffectSizeLabel {
  const absD = Math.abs(d);
  if (absD < 0.2) return 'negligible';
  if (absD < 0.5) return 'small';
  if (absD < 0.8) return 'medium';
  return 'large';
}

// ============================================================================
// T-DISTRIBUTION FUNCTIONS
// ============================================================================

/**
 * t-distribution CDF approximation
 */
export function tDistCDF(t: number, df: number): number {
  // For large df, t-distribution approximates normal
  if (df > 200) {
    return normalCDF(t);
  }

  // Use regularized incomplete beta function approximation
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;

  const beta = incompleteBeta(x, a, b);

  if (t >= 0) {
    return 1 - beta / 2;
  } else {
    return beta / 2;
  }
}

/**
 * t-distribution quantile (inverse CDF) approximation
 */
export function tDistQuantile(p: number, df: number): number {
  // For large df, use normal approximation
  if (df > 200) {
    return normalQuantile(p);
  }

  // Newton-Raphson iteration starting from normal approximation
  let x = normalQuantile(p);
  for (let i = 0; i < 10; i++) {
    const cdf = tDistCDF(x, df);
    const pdf = tDistPDF(x, df);
    if (pdf < 1e-10) break;
    x = x - (cdf - p) / pdf;
  }
  return x;
}

function tDistPDF(t: number, df: number): number {
  const coef = Math.exp(
    logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI)
  );
  return coef * Math.pow(1 + (t * t) / df, -(df + 1) / 2);
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

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

function logGamma(x: number): number {
  const g = 7;
  const coefficients = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  x -= 1;
  let a = coefficients[0]!;
  for (let i = 1; i < g + 2; i++) {
    a += coefficients[i]! / (x + i);
  }
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;

  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  } else {
    return 1 - bt * betaCF(1 - x, b, a) / b;
  }
}

function betaCF(x: number, a: number, b: number): number {
  const maxIter = 100;
  const eps = 1e-10;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < eps) break;
  }

  return h;
}
