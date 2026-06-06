/**
 * VITALS_THRESHOLDS
 * MUST stay in sync with Backend/src/constants/vitalsThresholds.js
 */
export const VITALS_THRESHOLDS = {
  hr:   { warnLow: 50, warnHigh: 110, critLow: 40,  critHigh: 130 },
  spo2: { warnLow: 94, critLow: 90 },
  temp: { warnLow: 36, warnHigh: 38, critLow: 35,   critHigh: 40  },
  sbp:  { warnLow: 90, warnHigh: 160, critLow: 80,  critHigh: 180 },
  rr:   { warnLow: 10, warnHigh: 24,  critLow: 8,   critHigh: 30  },
  gcs:  { warnAt: 14,  critAt: 9 }
};
