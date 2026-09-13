# Project Context: Lift-Mate

This document provides context for the `lift-mate` application, focusing on the real-time pose estimation feature. It is designed to be easily digestible by an AI agent for seamless continuation of development.

## Application Overview

`lift-mate` is a mobile-first fitness tracking application built with Ionic and Mithril. Its primary goal is to assist users with their workouts, potentially offering features like exercise tracking, form analysis, and progress monitoring.

## Feature Focus: Real-time Pose Estimation

The current development focus is on implementing a real-time pose estimation feature, located under `src/features/pose/`. This feature utilizes Google's MediaPipe solutions to detect and render human pose, hand, and face landmarks on a live video feed.

### Key Technologies Used:

- **Mithril.js:latest verison** A minimalist JavaScript framework for building single-page applications.
- **ionic:latest verison** A minimalist JavaScript framework for building cross platform applications.
- **Capacitor:latest verison** An open-source native runtime that allows web apps to run natively on iOS, Android, and the web.
- **`@mediapipe/tasks-vision`:latest verison** The official MediaPipe JavaScript library for performing computer vision tasks on the web.
- **`CapacitorMediaPipe`:latest verison** A custom native Capacitor plugin that wraps the native MediaPipe SDKs for high-performance pose estimation on mobile devices.

### Current State and Recent Development:

The real-time pose estimation feature is functional on both web and native mobile platforms.

**Recent Changes and Resolved Issues:**

1.  **`holistic.service.ts` - Platform-Aware Refactoring:**

    - **Problem:** The service was attempting to use the native-only `CapacitorMediaPipe` plugin on all platforms, causing web builds to fail.
    - **Resolution:** Refactored `holistic.service.ts` to be platform-aware. It now functions as a facade that abstracts the underlying implementation.
      - **On Native (iOS/Android):** It uses the `CapacitorMediaPipe` plugin for high-performance native processing.
      - **On Web:** It uses the `@mediapipe/tasks-vision` library as a fallback. It initializes and runs three separate landmarker tasks (`PoseLandmarker`, `FaceLandmarker`, `HandLandmarker`) and combines their results to provide the complete holistic data.
    - **Build Fix:** Resolved the web build failures by:
      1.  Switching to a **dynamic import** (`await import(...)`) for the native plugin within the native-only code path.
          i
      2.  **Externalizing** the `capacitor-media-pipe` package in `vite.config.ts` to prevent the bundler from trying to include it in the web build.

2.  **`render.service.ts` - `elements.context is not a function`:**

    - **Problem:** Initial implementation incorrectly assumed `elements.context` was a function, leading to a `TypeError`.
    - **Resolution:** Modified `src/features/pose/store.ts` to include a `context` stream within the `elements` object. Updated `src/features/pose/render.service.ts` to correctly retrieve the 2D rendering context from the canvas element and store it in the `elements.context` stream.

3.  **No Landmarks Displayed:**

    - **Problem:** Although the `holistic.service` was initialized, video frames were not being continuously sent to the MediaPipe model for processing, resulting in no landmark data.
    - **Resolution:**
      - Added a `sendFrames` asynchronous function to `src/features/pose/holistic.service.ts`. This function continuously sends video frames to the appropriate MediaPipe instance (native or web) for processing using `requestAnimationFrame`.
      - Integrated the `holisticService.sendFrames()` call into `src/features/pose/PoseViewer.ts` when streaming begins.

4.  **Tiny Landmarks / Aspect Ratio Issues:**

    - **Problem:** Landmarks were appearing very small or distorted due to incorrect scaling.
    - **Resolution:**
      - Modified the `draw` loop in `src/features/pose/render.service.ts` to dynamically set the canvas's `width` and `height` to match its `clientWidth` and `clientHeight`.
      - Implemented logic to correctly transform landmark coordinates to account for the `object-fit: cover` styling of the video feed.

5.  **"Selfie Mode" Mirroring:**

    - **Problem:** The front camera feed was mirrored by default on native platforms.
    - **Resolution:** Set `selfieMode: false` in the native plugin's configuration (assumed) to disable mirroring.

6.  **Missing Connection Lines:**
    - **Problem:** Only individual landmarks were drawn, without lines connecting them.
    - **Resolution:**
      - Added a `drawConnectors` function to `src/features/pose/render.service.ts`.
      - Integrated calls to `drawConnectors` for both pose and hand landmarks within the `draw` loop.

### Next Steps / Future Work:

The core real-time pose estimation and rendering are now in place. Potential next steps could include:

- Implementing exercise-specific logic based on landmark data (e.g., rep counting, form correction).
- Improving UI/UX for the pose viewer.
- Optimizing performance for different devices.
- Adding recording playback functionality.

## Instructions for AI Agent:

You are an AI assistant tasked with continuing development on the `lift-mate` project. Your current focus is on the real-time pose estimation feature.

- **Familiarize yourself with the project structure and the `src/features/pose/` directory.**
- **Understand the roles of `render.service.ts`, `holistic.service.ts`, `store.ts`, and `PoseViewer.ts`.**
- **Refer to the "Current State and Recent Development" section for a summary of recent changes and resolved issues.**
- **When making changes, adhere to the existing coding style, conventions, and architectural patterns.**
- **Prioritize user experience and performance.**
- **If you encounter new issues or need further clarification, ask targeted questions.**
- **Your goal is to build upon the existing functionality, potentially addressing items listed under "Next Steps / Future Work".**
