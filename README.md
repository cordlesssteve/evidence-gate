# evidence-gate

> A framework that forces evidence-based claims by requiring statistical significance + effect size + practical threshold before declaring a difference meaningful.

**Status:** Planning/Design Phase (Level 0)

## The Problem

LLMs and humans frequently claim "X is faster than Y" without rigorous evidence. This leads to:
- Accepting noise as signal
- "Statistically significant" but practically meaningless conclusions
- Ignoring data quality issues that invalidate results

## The Solution

evidence-gate provides **three gates** that must ALL pass before a comparison is declared meaningful:

```
┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
│   GATE 1    │   │   GATE 2    │   │     GATE 3      │
│  p < 0.05   │ + │  |d| ≥ 0.5  │ + │ |Δ| ≥ threshold │ = MEANINGFUL
│ (significant)│   │(medium effect)│  │  (practical)    │
└─────────────┘   └─────────────┘   └─────────────────┘
```

Plus **data quality diagnostics** that warn about outliers, non-normality, and other issues before they corrupt your conclusions.

## Quick Example

```typescript
import { compareConditions } from 'evidence-gate';

const oldImpl = [101, 98, 105, 200, 99, 102, 97, 103, 100, 98];
const newImpl = [85, 82, 88, 84, 86, 83, 87, 85, 84, 86];

const result = compareConditions(oldImpl, newImpl, {
  practicalThreshold: 10,  // 10ms is meaningful in our context
});

console.log(result.verdict);        // 'significant'
console.log(result.interpretation); // Human-readable summary
console.log(result.diagnostics.warnings); // Data quality issues
```

## Origin

Extracted from [MonkeTree](../MonkeTree)'s benchmark suite, which implemented a full statistical testing framework with **24 verification tests** against known statistical table values.

## Documentation

- [PROJECT_CHARTER.md](./PROJECT_CHARTER.md) - Project vision and scope
- [API_DESIGN.md](./docs/reference/01-architecture/API_DESIGN.md) - Detailed API design
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - Current progress

## License

MIT (pending)
