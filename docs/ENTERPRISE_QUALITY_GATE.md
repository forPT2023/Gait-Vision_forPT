# Enterprise Quality Gate

## Purpose
This document defines the minimum quality bar required before Gait VISION forPT can be treated as an enterprise-provided product instead of a prototype.

## Release tiers

### Tier 0 — Prototype
- Manual validation only
- Metrics may be exploratory
- UI/reporting may be approximate
- No regression guarantee

### Tier 1 — Internal evaluation build
- Deterministic build and release notes
- Core features exercised by repeatable checks
- Known limitations documented
- Metrics clearly labeled as validated, estimated, or unsupported

### Tier 2 — Enterprise candidate
- Architecture split into testable modules
- Metric definitions and applicability documented
- Sample video regression suite available
- Browser support matrix documented
- Report contents traceable to calculation logic
- Privacy/storage behavior aligned with user-facing disclosure

### Tier 3 — Enterprise release
- Automated unit/integration/E2E checks in CI
- Release checklist completed and archived
- Report output and calculation thresholds versioned
- Unsupported usage patterns blocked or explicitly marked in-product
- Incident triage / diagnostic logging flow documented

## Hard gates for enterprise release

### 1. Product definition
- The product scope must explicitly state intended use and non-intended use.
- Each analysis metric must have a written definition, applicability plane, failure conditions, and interpretation note.
- Any heuristic or approximate metric must be labeled as such in UI and report output.

### 2. Architecture
- UI, analysis, report generation, storage, and runtime/device orchestration must be separated into modules.
- Analysis code must be executable without the DOM.
- Report aggregation must be executable without direct DOM access.
- Configuration for thresholds, graph ranges, and plane-specific enablement must be centralized.

### 3. Verification
- Unit tests cover deterministic analysis helpers.
- Integration checks cover session lifecycle, export, and report generation.
- E2E checks cover the supported browsers and both camera/video workflows.
- A fixed sample-video regression pack must exist.

### 4. Analysis reliability
- Plane-specific metrics must only appear when the capture plane supports them.
- "Not computed" must be represented separately from a real numeric zero.
- Metric thresholds shown in reports must be versioned and documented.
- Quality indicators (missing data rate, valid frame ratio, capture mode) must be available to the report layer.

### 5. Reporting
- Reports must show session timestamp, capture mode, plane, and data quality summary.
- Auto-comments must be traceable to documented rules.
- Report sections must hide unsupported metrics rather than defaulting to misleading values.

### 6. Privacy and storage
- Stored fields must be enumerated in documentation.
- User-facing privacy text must match actual storage behavior.
- Export behavior, retention behavior, and deletion behavior must be documented.

## Exit criteria for the current codebase
The current codebase should be considered ready to move beyond prototype status only after:
1. The inline monolith is decomposed into modules.
2. Metric definitions and plane applicability are documented.
3. Report templates are split by plane and show quality metadata.
4. A regression suite exists for representative gait videos.
5. README, consent text, and storage behavior are aligned.
