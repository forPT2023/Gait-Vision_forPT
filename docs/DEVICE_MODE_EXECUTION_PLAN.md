# Device Mode Execution Plan

## Product split locked for implementation

### Phone mode
- iPhone / Android phone focused PWA experience
- Post-capture analysis only
- Step-by-step flow: capture → analysis → results → export
- Report export must complete on device
- Camera selection is mandatory

### Tablet mode
- Primary clinical experience
- Real-time analysis supported
- Simultaneous video + metrics workflow
- Camera selection is mandatory

## Phase order
1. Phase 0 — lock device-mode scope and acceptance criteria
2. Phase 1 — fix rotation, stretch, viewport-height instability
3. Phase 2 — introduce runtime device-mode branching
4. Phase 3 — add explicit camera selection
5. Phase 4 — rebuild phone UX as step-by-step flow
6. Phase 5 — optimize tablet clinical workflow
7. Phase 6 — harden reports, data-quality labels, and exports
8. Phase 7 — complete architecture/test/release hardening

## Acceptance criteria tracked from user-reported issues
- Portrait capture must not appear sideways on phones or tablets
- Rotation must not stretch the preview or analysis canvas
- iPhone Safari/PWA must preserve a usable capture viewport
- Phone mode must avoid the dense single-screen tablet layout
- Users must be able to choose front or rear camera explicitly
- Same URL must adapt safely to phone mode or tablet mode
