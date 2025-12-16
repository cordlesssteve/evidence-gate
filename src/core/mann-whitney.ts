/**
 * Mann-Whitney U test (non-parametric alternative to t-test)
 *
 * Use when normality assumption is violated.
 */

import type { MannWhitneyResult, EffectSizeLabel } from '../types.js';

/**
 * Mann-Whitney U test for two independent samples
 *
 * Non-parametric test that compares ranks rather than means.
 * Use when data is not normally distributed.
 *
 * @param sampleA - First sample
 * @param sampleB - Second sample
 * @param alpha - Significance level (default: 0.05)
 * @returns MannWhitneyResult with U statistic, p-value, and effect size
 */
export function mannWhitneyU(
  sampleA: number[],
  sampleB: number[],
  alpha = 0.05
): MannWhitneyResult {
  const n1 = sampleA.length;
  const n2 = sampleB.length;

  // Combine samples and track which group each value came from
  const combined: Array<{ value: number; group: 'A' | 'B' }> = [
    ...sampleA.map(value => ({ value, group: 'A' as const })),
    ...sampleB.map(value => ({ value, group: 'B' as const })),
  ];

  // Sort by value
  combined.sort((a, b) => a.value - b.value);

  // Assign ranks (handle ties by averaging)
  const ranks = assignRanks(combined.map(c => c.value));

  // Calculate rank sums for each group
  let R1 = 0; // Rank sum for group A
  let R2 = 0; // Rank sum for group B

  combined.forEach((item, index) => {
    const rank = ranks[index];
    if (rank !== undefined) {
      if (item.group === 'A') {
        R1 += rank;
      } else {
        R2 += rank;
      }
    }
  });

  // Calculate U statistics
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = R2 - (n2 * (n2 + 1)) / 2;
  const U = Math.min(U1, U2);

  // Calculate p-value using normal approximation (valid for n1, n2 >= 8)
  // For smaller samples, this is an approximation
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);

  // Apply continuity correction
  const z = (U - meanU + 0.5) / stdU;
  const pValue = 2 * normalCDF(-Math.abs(z)); // Two-tailed

  // Calculate rank-biserial correlation as effect size
  // r = 1 - (2U)/(n1*n2) where U is the smaller U value
  const effectSize = 1 - (2 * U) / (n1 * n2);

  return {
    U,
    pValue,
    significant: pValue < alpha,
    effectSize,
    effectSizeLabel: getEffectSizeLabelRankBiserial(effectSize),
  };
}

/**
 * Assign ranks to values, averaging ties
 */
function assignRanks(values: number[]): number[] {
  const n = values.length;
  const ranks: number[] = new Array(n);

  let i = 0;
  while (i < n) {
    // Find all values equal to current
    const currentValue = values[i];
    let j = i;
    while (j < n && values[j] === currentValue) {
      j++;
    }

    // Average rank for tied values
    // Ranks are 1-indexed: positions i to j-1 get ranks i+1 to j
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }

    i = j;
  }

  return ranks;
}

/**
 * Get effect size label for rank-biserial correlation
 * Thresholds adapted for rank-biserial (ranges -1 to 1)
 */
function getEffectSizeLabelRankBiserial(r: number): EffectSizeLabel {
  const absR = Math.abs(r);
  if (absR < 0.1) return 'negligible';
  if (absR < 0.3) return 'small';
  if (absR < 0.5) return 'medium';
  return 'large';
}

/**
 * Standard normal CDF
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
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
