/**
 * Core statistical functions
 */

export { detectOutliers, detectOutliersIQR, detectOutliersCombined } from './outliers.js';
export type { IQROutlierResult, CombinedOutlierResult } from './outliers.js';
export { shapiroWilkTest } from './normality.js';
export { welchTTest, getEffectSizeLabel, tDistCDF, tDistQuantile } from './welch-t-test.js';
export { mannWhitneyU } from './mann-whitney.js';
