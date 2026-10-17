## ADDED Requirements

### Requirement: AASA excludes community paths

The AASA file SHALL declare exclusion components for `/community`, `/community/*`, `/*/community` and `/*/community/*` placed before the `/*` catch-all, so that community board links open in the browser instead of the app.

#### Scenario: Community exclusions are declared

- **WHEN** the AASA details are inspected
- **THEN** the `components` array SHALL contain `exclude: true` entries for the four community path patterns, each before the `"/" : "/*"` entry
