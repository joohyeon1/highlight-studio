# Highlight Studio v1.0.0 Release Notes

## 1. Release Information

| Item | Value |
| --- | --- |
| Product | Highlight Studio |
| Version | v1.0.0 |
| Release Date | 2026-07-16 |
| Release Type | Initial Stable Release |
| Status | Release Candidate |

## 2. Overview

Highlight Studio v1.0.0 is the first stable release candidate of the local-first highlight video production tool.

Core capabilities:

- Local AI-assisted video creation
- Browser-based editing experience
- Electron desktop app support
- Project save, load, autosave, and backup workflows
- Template-based video production
- Timeline and caption editing
- Queue-based rendering
- FFmpeg-based MP4 encoding
- CPU/GPU render engine selection and CPU fallback
- Output listing, download, rename, delete, and share metadata
- Legacy API compatibility for older `POST /api/videos` integrations
- Idempotent shutdown manager for Node and Electron execution

Highlight Studio keeps media processing local to the user's PC. Core workflows do not require Firestore, Firebase, OpenAI, Cloud AI, or cloud rendering.

## 3. Major Features

### Project Management

- Create and manage Highlight Studio project payloads.
- Save and load `.hsp` project data.
- Maintain recent project state in the running local process.
- Support autosave and backup listing/restore workflows.
- Store backups locally under the configured data directory.

### Template System

- Built-in default templates for common video styles.
- User template create, update, and delete APIs.
- Template selection for production presets.
- Template helper modules separated from server bootstrap.

### Timeline

- Photo-based scene structure.
- Captions, transitions, effects, and duration settings.
- Manual editing remains available after AI-assisted generation.
- Output settings are retained as part of the project structure.

### Rendering

- FFmpeg-based MP4 rendering.
- Local render executor for project-based rendering.
- CPU baseline through `libx264`.
- GPU-capable encoder detection and selection where supported.
- CPU fallback remains the stable render path.

### Queue

- Render jobs are queued and exposed through render status APIs.
- Job state, queue state, and active job state are managed through dedicated modules.
- Render cancel support is available for queued and active jobs.
- Public job status includes progress, encoder information, errors, logs, and output metadata.

### Output Management

- List generated MP4 files.
- Download outputs.
- Rename and delete outputs.
- Open files or output folder from the local app.
- Generate share metadata for local MP4 outputs.

### Electron

- Desktop app runtime with BrowserWindow.
- Local server startup or reuse.
- `highlightstudio://open` protocol preparation.
- Desktop settings and logs under Electron userData.
- Shared shutdown path through the shutdown manager.

### Browser

- Browser UI served from the local Express server.
- Main app is available at `http://localhost:4000`.
- Actual server binding remains loopback-only.
- Static UI and API are served from the same local app.

### Shutdown Manager

- Shared shutdown path for Node direct execution and Electron.
- Duplicate shutdown calls are guarded by one shutdown Promise.
- Existing render job cancellation is called before server close.
- HTTP server close is observed and logged.
- Electron `before-quit` uses the same shutdown API.

## 4. Architecture

Highlight Studio v1.0.0 uses a modular local architecture.

### Thin Server Entrypoint

- `server.js` is a small entrypoint.
- It loads local environment variables, creates the app, starts the server, wires shutdown signals, and exports the public server API.

### Bootstrap

- `server/bootstrap.js` creates the Express application.
- It wires middleware, directories, services, helpers, render modules, and routes.

### Route Modules

Routes are grouped by responsibility:

- system routes
- AI routes
- template routes
- project read/load/save routes
- render read/write routes
- output read/write routes
- legacy video route

### Helper Modules

Feature-specific helpers are separated:

- default templates
- local AI rules
- license status helpers
- output helpers
- project helpers
- template helpers
- upload filename helpers
- upload middleware

### Render Queue

Render queue responsibilities are split into:

- render job store
- render job utilities
- render queue operations
- render queue controller

### FFmpeg Engine

The FFmpeg engine owns:

- FFmpeg path/check logic
- process spawning
- encoder detection
- encoder argument selection
- progress/error handling

### Shutdown Manager

The shutdown manager owns:

- idempotent shutdown guard
- render job cancellation call
- HTTP server close observation
- shared Node/Electron shutdown API

## 5. Stability

### Phase 1

Restricted server exposure to local loopback and stabilized Electron startup issues.

### Phase 2

Investigated legacy `/api/videos` compatibility and retained the route safely.

### Phase 3

Continued stability and structure checks around routes, local-only behavior, and modularization boundaries.

### Phase 4A

Surveyed Node and Electron shutdown flows before implementation.

### Phase 4B

Added the idempotent shutdown manager and connected Node/Electron shutdown flows.

### Phase 5

Ran final release regression under no-user-data-change rules. The result was blocked by test constraints, not a confirmed code defect.

### Phase 5A

Mapped actual API routes and designed a disposable regression strategy.

### Phase 5B

Executed disposable API, project, render, output, legacy, and Electron shutdown regression checks. Core disposable flows passed, with remaining environment verification gaps documented.

## 6. Breaking Changes

None.

## 7. Deprecated

### `POST /api/videos`

`POST /api/videos` remains available as a legacy compatibility route.

New integrations should use:

```text
POST /api/render
```

The legacy route returns deprecated metadata and points callers to `/api/render`.

## 8. Known Limitations

These are release verification environment limitations, not known code defects.

- Browser file chooser upload was not fully automated through visible UI controls because the available browser automation surface did not expose a safe file chooser workflow.
- `Ctrl+C` shutdown could not be automatically verified in the execution backend used during regression.
- Electron visible UI shutdown was verified through a window close message and shutdown logs, but should still be confirmed once in a normal installed/user runtime.
- Electron storage path isolation should be verified once in the final installed environment when using custom settings paths.

## 9. Future Plan

Planned v1.1 directions:

- Expand built-in template presets.
- Improve AI editing and storyboard assistance.
- Add more local AI quality and composition rules.
- Improve UI polish and responsive layouts.
- Add more render options.
- Improve performance for larger photo sets.
- Add a cleaner automated disposable regression harness.
- Improve Electron settings and storage path clarity.

## 10. Final Decision

Highlight Studio v1.0.0 is currently:

**Release Candidate**

It can be promoted to:

**Release Ready**

after confirming the following once in a real user environment:

1. Browser upload through the real file picker.
2. `Ctrl+C` shutdown in a normal terminal.
3. Electron UI close in the normal desktop runtime.

No code-level release blocker is documented in the current v1.0.0 baseline.
