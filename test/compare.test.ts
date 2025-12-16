/**
 * Tests for compareConditions - the main API
 */

import { describe, it, expect } from 'vitest';
import { compareConditions } from '../src/compare.js';

describe('compareConditions', () => {
  describe('significant differences', () => {
    it('detects clearly different samples', () => {
      // Two clearly different populations
      const sampleA = [100, 102, 98, 101, 99, 103, 97, 100, 101, 99];
      const sampleB = [150, 152, 148, 151, 149, 153, 147, 150, 151, 149];

      const result = compareConditions(sampleA, sampleB, {
        practicalThreshold: 10,
      });

      expect(result.verdict).toBe('significant');
      expect(result.evidence.pValue).toBeLessThan(0.05);
      expect(Math.abs(result.evidence.effectSize)).toBeGreaterThan(0.8); // Large effect
      expect(Math.abs(result.evidence.difference)).toBeGreaterThan(10);
    });

    it('reports correct direction of difference', () => {
      const faster = [85, 82, 88, 84, 86, 83, 87, 85, 84, 86];
      const slower = [101, 98, 105, 99, 102, 97, 103, 100, 101, 98];

      const result = compareConditions(faster, slower, {
        practicalThreshold: 10,
        labels: ['New', 'Old'],
      });

      expect(result.evidence.difference).toBeLessThan(0); // New is faster (lower)
      expect(result.evidence.meanA).toBeLessThan(result.evidence.meanB);
    });
  });

  describe('non-significant differences', () => {
    it('detects samples from same population', () => {
      // Same population, just random variation
      const sampleA = [100, 102, 98, 101, 99, 103, 97, 100, 101, 99];
      const sampleB = [101, 99, 103, 100, 98, 102, 100, 99, 101, 100];

      const result = compareConditions(sampleA, sampleB, {
        practicalThreshold: 10,
      });

      expect(result.verdict).toBe('not-significant');
    });

    it('rejects statistically significant but practically meaningless differences', () => {
      // Statistically significant (large n, consistent) but tiny difference
      const sampleA = Array(50).fill(100).map((v, i) => v + (i % 3 - 1)); // ~100
      const sampleB = Array(50).fill(102).map((v, i) => v + (i % 3 - 1)); // ~102

      const result = compareConditions(sampleA, sampleB, {
        practicalThreshold: 10, // 2-unit difference is below threshold
      });

      // May be statistically significant but should fail practical threshold
      if (result.evidence.pValue < 0.05) {
        expect(result.verdict).toBe('not-significant'); // Failed practical threshold gate
      }
    });
  });

  describe('data quality handling', () => {
    it('handles insufficient data', () => {
      const result = compareConditions([1, 2], [3, 4], {
        practicalThreshold: 1,
      });

      expect(result.verdict).toBe('insufficient-data');
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
    });

    it('uses Mann-Whitney for non-normal data', () => {
      // Highly skewed data (exponential-like)
      const skewedA = [1, 1, 2, 2, 2, 3, 3, 5, 10, 50];
      const skewedB = [100, 100, 101, 101, 102, 103, 105, 110, 150, 500];

      const result = compareConditions(skewedA, skewedB, {
        practicalThreshold: 10,
      });

      // Should switch to Mann-Whitney due to non-normality
      expect(result.evidence.testUsed).toBe('mann-whitney-u');
      expect(result.recommendation).toBe('use-nonparametric');
    });

    it('detects outliers and warns', () => {
      const withOutlier = [100, 101, 99, 102, 98, 100, 101, 99, 100, 500]; // 500 is outlier
      const normal = [100, 101, 99, 102, 98, 100, 101, 99, 100, 101];

      const result = compareConditions(withOutlier, normal, {
        practicalThreshold: 10,
      });

      expect(result.diagnostics.sampleA.outliers.count).toBeGreaterThan(0);
      expect(result.diagnostics.warnings.some(w => w.includes('outlier'))).toBe(true);
    });
  });

  describe('configuration', () => {
    it('respects custom labels', () => {
      const result = compareConditions([1, 2, 3, 4, 5], [6, 7, 8, 9, 10], {
        practicalThreshold: 1,
        labels: ['Control', 'Treatment'],
      });

      expect(result.interpretation).toContain('Control');
      expect(result.interpretation).toContain('Treatment');
    });

    it('respects custom alpha', () => {
      // Generate samples that would be significant at 0.05 but not at 0.01
      const sampleA = [100, 102, 98, 104, 96, 101, 99, 103, 97, 100];
      const sampleB = [105, 107, 103, 109, 101, 106, 104, 108, 102, 105];

      const result05 = compareConditions(sampleA, sampleB, {
        practicalThreshold: 1,
        alpha: 0.05,
      });

      const result01 = compareConditions(sampleA, sampleB, {
        practicalThreshold: 1,
        alpha: 0.01,
      });

      // Both use same p-value, but significance depends on alpha
      expect(result05.evidence.pValue).toBe(result01.evidence.pValue);
      expect(result05.config.alpha).toBe(0.05);
      expect(result01.config.alpha).toBe(0.01);
    });
  });
});
