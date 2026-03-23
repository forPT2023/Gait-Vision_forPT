# Metric and Report Specification Baseline

## Purpose
This document establishes the first enterprise-oriented baseline for what should be measured, when it is valid, and how it should be presented in reports.

## Metric policy
Every metric must declare:
- Source landmarks or derived events
- Applicable capture plane
- Minimum data quality assumptions
- Failure / unsupported conditions
- Product label: `validated`, `estimated`, or `unsupported`

## Plane policy

### Frontal plane
Recommended metrics:
- Left/right symmetry indicators
- Pelvic obliquity or left/right pelvic tilt
- Lateral trunk deviation
- Cadence (only when step events are confidently detected)

Avoid or downgrade:
- Forward trunk lean
- Sagittal joint kinematics interpreted as clinical flexion/extension
- Absolute walking speed unless the capture setup is calibrated

### Sagittal plane
Recommended metrics:
- Knee angle trend
- Hip angle trend
- Ankle angle trend
- Forward trunk lean
- Cadence (if event quality passes threshold)

Conditionally allowed:
- Walking speed as `estimated` unless calibration policy is satisfied

## Data quality fields required for reporting
Every completed session summary should include at least:
- session timestamp
- capture mode (`camera` / `video`)
- analysis plane
- total processed frames
- valid frames used for metric aggregation
- valid frame ratio
- missing-landmark ratio
- event-detection confidence or availability flag
- whether speed is calibrated or estimated

## Report structure requirements

### Common header
- patient id
- session id
- session timestamp
- app/report version
- capture mode
- analysis plane
- duration
- data quality summary

### Frontal report sections
- symmetry summary
- pelvic/trunk frontal indicators
- cadence summary
- unsupported metric notice for sagittal-only indicators

### Sagittal report sections
- knee/hip/ankle trend summary
- forward trunk summary
- cadence summary
- speed summary with explicit policy label (`estimated` or `calibrated`)

## Rule design principles
- No unsupported metric should silently appear as zero.
- Auto-comments must cite the rule family that generated them.
- Threshold values must live in versioned config.
- Reports should distinguish:
  - `value`
  - `not computed`
  - `not supported in this plane`
  - `low confidence / review recommended`

## Current implementation gaps this spec addresses
- A single report layout currently mixes plane-specific content.
- Report comments rely heavily on simple averages.
- Some metrics are shown without enough plane-policy context.
- Product messaging needs a clear distinction between estimated and validated outputs.
