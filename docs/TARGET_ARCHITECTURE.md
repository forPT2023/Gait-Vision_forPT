# Target Architecture

## Objective
Transform the current single-file application into a maintainable, testable, enterprise-oriented web app without breaking the existing end-user flow.

## Current risks
- UI, analysis, storage, and report logic are tightly coupled.
- Most business logic is embedded in the HTML inline module.
- Metric configuration is hard-coded near rendering code.
- The current `npm test` command validates syntax only.

## Proposed module layout

```text
src/
  app/
    bootstrap.js          # app startup and dependency wiring
    state.js              # shared state container / session state
  ui/
    screens.js            # consent/patient/main screen transitions
    controls.js           # button wiring and UI state transitions
    notifications.js      # toast/message helpers
    charts.js             # chart lifecycle and graph rendering
    reportModal.js        # report modal and print/PDF entry points
  analysis/
    constants.js          # landmark ids and shared enums
    metrics/
      angles.js           # joint angle helpers
      trunk.js            # trunk / pelvis metrics
      gaitEvents.js       # event detection and cadence helpers
      speed.js            # speed estimation/calibration policy
      symmetry.js         # symmetry calculations
      quality.js          # valid-frame ratio / missing-data metrics
    pipeline/
      frameProcessor.js   # per-frame orchestration
      planePolicy.js      # plane-specific metric enablement
      smoothing.js        # EMA / filter helpers
  video/
    camera.js             # camera acquisition and teardown
    videoFile.js          # file loading and playback lifecycle
    recording.js          # MediaRecorder lifecycle
  report/
    aggregate.js          # session summary generation
    rules.js              # documented report evaluation rules
    templates/
      frontal.js          # frontal report sections
      sagittal.js         # sagittal report sections
  storage/
    db.js                 # IndexedDB access
    crypto.js             # encryption key lifecycle
    export.js             # CSV/JSON export helpers
  config/
    metrics.js            # thresholds and display labels
    charts.js             # graph ranges and render settings
    privacy.js            # disclosure text / storage metadata
  pwa/
    serviceWorker.js      # registration wrapper
```

## Dependency rules
1. `ui/` must not directly implement analysis math.
2. `analysis/` must not reference DOM globals.
3. `report/aggregate.js` may consume analysis/session summaries, but not raw DOM nodes.
4. `storage/` exposes clean interfaces used by `app/` orchestration.
5. `config/` is the only source of thresholds and graph defaults.

## Migration strategy

### Phase A — Safe extraction
- Extract constants and pure functions first.
- Keep behavior stable.
- Add unit tests for extracted logic.

### Phase B — Session/report split
- Move report aggregation out of DOM rendering.
- Introduce plane-specific report templates.
- Add quality metadata to summary objects.

### Phase C — Runtime split
- Separate camera/video/recording lifecycle code.
- Replace implicit globals with session state object.
- Add integration tests around start/stop/export flows.

### Phase D — Delivery hardening
- Add browser matrix E2E checks.
- Replace heuristic-only indicators with documented policy labels.
- Gate releases on the enterprise quality checklist.

## Definition of done for architecture migration
- No business-critical analysis logic remains embedded only in HTML.
- The app can be tested at the analysis/report layer without browser UI fixtures.
- The UI becomes a thin shell over imported modules.
- Threshold changes require editing config files, not scattered inline constants.
