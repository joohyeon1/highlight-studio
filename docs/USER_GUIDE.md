# Highlight Studio User Guide

Highlight Studio v1.0.0 is a Windows desktop app for creating Taekwondo highlight videos from photos. Photos, projects, and rendered videos are processed on the local PC.

## First Run

1. Install `Highlight Studio Setup 1.0.0.exe`.
2. Launch `Highlight Studio.exe` from the desktop shortcut or Start menu.
3. Wait for the loading screen to finish.
4. The editor opens in the app window without a browser address bar.

If the app cannot start, close any program using port `4000` and run Highlight Studio again.

## Create A New Project

1. Click `새 프로젝트`.
2. Enter a video title.
3. Choose the output ratio, FPS, quality, and rendering engine.
4. Use `프로젝트 저장` to save a `.hsp` project file.

`.hsp` files save the editing data. Original photo files are not embedded, so keep the source photos available.

## Add Photos

1. Drag JPG, PNG, or WEBP files into the upload area.
2. Check thumbnails, filenames, resolution, size, and total count.
3. Reorder photos by drag and drop or by the move buttons.
4. Delete unwanted photos before rendering.

If a photo is missing after loading a project, upload the original photo again.

## Choose A Template

1. Select a template in the AI one-click options.
2. Review the recommended caption tone, music style, color theme, and ratio.
3. Templates only set initial values. You can still edit captions, scene length, effects, transitions, and output settings manually.

## AI One-Click Creation

1. Upload photos.
2. Select a template and tone.
3. Click `AI 원클릭 제작`.
4. Highlight Studio analyzes photos locally, detects duplicates, recommends exclusions, creates scenes, applies captions, assigns transitions, and prepares the timeline.
5. Review the timeline before rendering.

No OpenAI, cloud AI, face recognition, student recognition, or automatic upload is used.

## Manual Editing

Use the timeline and property panel to edit:

- Photo order
- Student tags
- Photo effects
- Scene duration
- Captions
- Caption position/style/timing
- Transition type and duration
- Output ratio and quality

Manual edits remain available even after AI one-click generation.

## Create MP4

1. Confirm selected photos and output settings.
2. Choose rendering engine: `자동`, `CPU`, `NVIDIA`, `Intel`, or `AMD`.
3. Click the render button.
4. Watch progress, current photo, queue status, and FFmpeg logs.
5. If GPU encoding fails, Highlight Studio retries with CPU rendering automatically.

Rendered MP4 files are stored in the local outputs folder.

## Save And Load Projects

- `프로젝트 저장`: downloads a `.hsp` project file and creates a local backup.
- `다른 이름으로 저장`: saves with a new project filename.
- `프로젝트 열기`: loads an existing `.hsp`.
- `최근 작업 복원`: restores autosaved browser/server work.
- `백업 복원`: restores one of the recent local backups.

Backups are stored locally and limited to the configured backup count.

## Output Management

The output list supports:

- Preview video
- Open video file
- Open output folder
- Rename MP4 file
- Download MP4
- Copy share link
- Delete MP4
- Render current project again

Only `.mp4` files inside the outputs folder are managed.

## Common Problems

### FFmpeg Error

Use the packaged desktop app or reinstall dependencies. Check the render log for the exact error.

### File Permission Error

Choose another output folder in settings, or close any app currently using the MP4 file.

### Photo File Missing

Load the `.hsp` project, then upload the original photos again.

### Rendering Failed

Check skipped photos, FFmpeg logs, output folder permission, and available disk space.

### Project Save Or Load Failed

Confirm the file is a Highlight Studio `.hsp` JSON project.

### Port 4000 Conflict

Close the other local program using port `4000`, then restart Highlight Studio.

## Privacy And Storage

Highlight Studio works locally.

- No Firestore
- No Firebase
- No OpenAI API
- No Cloud AI
- No automatic upload
- No SportsLink photo, student, video, or project storage
