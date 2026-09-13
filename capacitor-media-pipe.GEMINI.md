# Project Context: Capacitor MediaPipe Plugin

This document provides comprehensive context for the custom `CapacitorMediaPipe` plugin, which is a local Capacitor plugin used by the `lift-mate` application. It details its purpose, API, integration points, and essential setup for native development.

## Plugin Overview

`CapacitorMediaPipe` is a custom native plugin that wraps the native Google MediaPipe SDKs for iOS (Swift) and Android (Java/Kotlin). Its primary purpose is to provide high-performance, real-time pose estimation by leveraging native device capabilities, which is significantly more efficient than a pure JavaScript solution on mobile devices.

The plugin is responsible for:
1.  Initializing the native MediaPipe Holistic pipeline.
2.  Receiving video frame data (as Base64 encoded images) from the web view.
3.  Processing the frames using the native MediaPipe SDK.
4.  Emitting the resulting landmark data back to the web view as an event.

## Inferred API

Based on its usage in `src/features/pose/holistic.service.ts`, the plugin exposes the following methods and events:

### Methods

*   **`initialize()`**:
    *   **Description:** Sets up and initializes the native MediaPipe Holistic pipeline on the device. This must be called before any other method. It is responsible for loading the MediaPipe models internally.
    *   **Usage:** `await CapacitorMediaPipe.initialize();`

*   **`send(options: { image: string })`**:
    *   **Description:** Sends a single video frame to the native plugin for processing. The frame must be a Base64 encoded string of a JPEG image.
    *   **Usage:** `await CapacitorMediaPipe.send({ image: imageData });`

*   **`close()`**:
    *   **Description:** Shuts down the native MediaPipe pipeline and releases all associated resources.
    *   **Usage:** `await CapacitorMediaPipe.close();`

### Events

*   **`holisticResults`**:
    *   **Description:** An event emitted by the plugin whenever it has successfully processed a frame and has new landmark data. This event is emitted from the native side back to the web view.
    *   **Data Structure:** The event returns an object containing the detected landmarks, with arrays for `poseLandmarks`, `faceLandmarks`, `leftHandLandmarks`, and `rightHandLandmarks`. Each landmark is typically an object with `x`, `y`, `z` coordinates (normalized 0.0-1.0) and potentially `visibility`.
    *   **Usage (Web Side):** `CapacitorMediaPipe.addListener('holisticResults', (results: any) => { ... });`

## Architectural Role & Build Configuration

This plugin is a critical component of the application's architecture when running on a native mobile device. It serves as the "native implementation" for the `holistic.service.ts` abstraction. The service uses platform detection (`Capacitor.getPlatform()`) to decide whether to call this plugin (on mobile) or to use the web-based `@mediapipe/tasks-vision` library (on the web).

**Important Build Configurations:**

1.  **Dynamic Import:** The plugin must be imported dynamically within the native-specific code path in `holistic.service.ts` using `await import('capacitor-media-pipe');`. A static import at the top of the file will cause the web build to fail.
2.  **Vite Externalization:** The plugin must be explicitly externalized in the `vite.config.ts` file under `build.rollupOptions.external`. This tells the bundler to ignore the module during web builds.

This hybrid approach ensures the application achieves the highest possible performance on mobile while still providing a fully functional experience on the web.

## Building and Linking the Plugin

The `capacitor-media-pipe` plugin is a local dependency, meaning its source code is part of your development environment rather than being pulled from a public npm registry. This requires specific steps to build the plugin and link it correctly to the `lift-mate` application.

### 1. Clone/Locate the Plugin Source

Ensure the `capacitor-media-pipe` plugin's source code is available in a directory accessible by the `lift-mate` project. As per `package.json`, it's expected to be at `../../capacitor-media-pipe` relative to the `lift-mate` project root.

### 2. Build the Plugin

Navigate to the plugin's root directory (e.g., `/path/to/your/capacitor-media-pipe`) and build its web assets and native components.

```bash
cd /path/to/your/capacitor-media-pipe
npm install
npm run build
npx cap sync
```
*   `npm install`: Installs the plugin's own dependencies.
*   `npm run build`: Compiles the TypeScript code to JavaScript and prepares the web assets.
*   `npx cap sync`: Syncs the plugin's web assets and native code with its own internal Capacitor project structure.

### 3. Link the Plugin to `lift-mate`

The `lift-mate` project's `package.json` already references the plugin using a `file:` protocol, which creates a symlink. This means `npm install` in the `lift-mate` project should handle the linking automatically.

```bash
# From the lift-mate project root
npm install
```
This command will ensure the `capacitor-media-pipe` entry in `node_modules` is a symlink to your local plugin source.

### 4. Sync Capacitor in `lift-mate`

After building the plugin and ensuring it's linked, you must sync the `lift-mate` Capacitor project to pick up the plugin's native code.

```bash
# From the lift-mate project root
npx cap sync ios
npx cap sync android # If targeting Android
```
This command will:
*   Copy the plugin's web assets into `lift-mate`'s `webDir` (e.g., `docs`).
*   Update the native iOS/Android projects to include the plugin's native code.

### 5. Install Native Dependencies (iOS Specific)

For iOS, after `npx cap sync ios`, you *must* install the CocoaPods dependencies from within the iOS project directory.

```bash
# From the lift-mate project root
cd ios/App
pod install
```
This step is crucial for linking the native MediaPipe SDKs and other iOS dependencies that the plugin relies on.

### 6. Open and Build in Native IDE

Finally, open the native project in its respective IDE and build/run it on a device or emulator.

*   **iOS:** Open `ios/App/App.xcworkspace` in Xcode.
*   **Android:** Open the `android` folder in Android Studio.

This ensures that the native code is compiled and integrated correctly.

## Native Integration Details

### Native Code Location

The source code for the `capacitor-media-pipe` plugin is located as a local dependency, typically symlinked from `../../capacitor-media-pipe` relative to the project root. This means the actual native project files (Xcode for iOS, Android Studio project for Android) reside outside the `lift-mate` project's `node_modules` or `ios`/`android` folders.

### Platform-Specific Setup

To ensure the plugin builds and runs correctly on native platforms, specific configurations are required in the respective native project files.

#### iOS Setup (Xcode / `ios/App/App`)

1.  **`Podfile` (`ios/App/Podfile`):
    *   Ensure the `CapacitorMediaPipe` pod is correctly referenced. It should point to the local path of the plugin.
    *   MediaPipe's iOS SDKs are typically distributed via CocoaPods. The plugin's `podspec` should handle these dependencies. Verify that `use_frameworks!` is present and the platform target is sufficient (e.g., `platform :ios, '13.0'`).
    *   **Example `Podfile` snippet (verify path):**
        ```ruby
        # ... other pods
        pod 'CapacitorMediaPipe', :path => '../../../capacitor-media-pipe/capacitor-media-pipe'
        # Ensure this path is correct relative to your Podfile
        # ...
        ```
    *   After modifying `Podfile`, always run `npx cap sync ios` followed by `pod install` from `ios/App`.

2.  **`Info.plist` (`ios/App/App/Info.plist`):
    *   **Camera Usage Description:** Add a privacy description for camera access.
        ```xml
        <key>NSCameraUsageDescription</key>
        <string>This app needs camera access for real-time pose estimation.</string>
        ```
    *   **Microphone Usage Description (if video recording with audio is planned):**
        ```xml
        <key>NSMicrophoneUsageDescription</key>
        <string>This app needs microphone access to record video for pose estimation.</string>
        ```

3.  **Xcode Project Settings:**
    *   Ensure the project's `Build Settings` (e.g., `Swift Language Version`, `Architectures`) are compatible with the MediaPipe iOS SDK and the plugin's Swift code.

#### Android Setup (Android Studio / `android/app`)

1.  **`build.gradle` (`android/app/build.gradle`):
    *   **Dependencies:** The plugin's `build.gradle` (within its own source directory) should declare MediaPipe Android SDK dependencies. Ensure your app's `build.gradle` is compatible.
    *   **`minSdkVersion`:** Verify that your app's `minSdkVersion` meets MediaPipe's requirements (typically API 21 or higher).
    *   **`targetSdkVersion`:** Ensure `targetSdkVersion` is up-to-date.
    *   **Example `build.gradle` snippet (app level):**
        ```gradle
        android {
            defaultConfig {
                minSdkVersion 21 // Or higher, as required by MediaPipe
                targetSdkVersion 34 // Or latest stable
                // ...
            }
            // ...
        }
        // ...
        ```

2.  **`AndroidManifest.xml` (`android/app/src/main/AndroidManifest.xml`):
    *   **Permissions:** Declare necessary permissions.
        ```xml
        <uses-permission android:name="android.permission.CAMERA" />
        <uses-permission android:name="android.permission.RECORD_AUDIO" /> <!-- If recording audio -->
        ```

3.  **ProGuard/R8 Rules:**
    *   If ProGuard or R8 is enabled for release builds, you might need to add specific rules to prevent MediaPipe classes from being obfuscated or removed. These are usually provided in MediaPipe's documentation or the plugin's source.

### MediaPipe Model Handling on Native

The `CapacitorMediaPipe` plugin is designed to handle the loading of MediaPipe's `.task` or `.tflite` model files internally. When `initialize()` is called, the plugin should manage the download or access of these models from its bundled assets or a specified URL. This offloads the model management from the web layer to the native layer, where it can be optimized for the device's file system and network.

### Native-to-Web Communication

The plugin communicates results back to the web view using Capacitor's event system.
*   Native code emits events (e.g., `holisticResults`) with the processed landmark data.
*   The web view (in `holistic.service.ts`) listens for these events using `CapacitorMediaPipe.addListener()`.
This mechanism ensures efficient, asynchronous data transfer without blocking the UI thread.

## Common Issues & Troubleshooting

*   **Permissions:** Ensure all required camera and microphone permissions are correctly declared in `Info.plist` (iOS) and `AndroidManifest.xml` (Android) and are granted by the user at runtime.
*   **Native Build Failures:** Check Xcode (iOS) or Android Studio (Android) for detailed build errors. Common causes include incorrect SDK versions, missing dependencies (e.g., `pod install` not run), or syntax errors in native code.
*   **Runtime Crashes:** If the app crashes on startup or when the camera/MediaPipe is initialized, check native device logs (Xcode console, Android Studio Logcat) for native stack traces. This often indicates issues with MediaPipe model loading or native camera access.
*   **No Landmarks/Poor Performance:**
    *   Verify the `send()` method is being called continuously with valid image data.
    *   Ensure the native MediaPipe models are correctly loaded and initialized.
    *   Check for `selfieMode` configuration if the camera feed appears mirrored.
    *   Performance can be affected by image resolution sent to the plugin; consider downscaling if necessary.

## Development Workflow for Native Integration

1.  **Make Changes in Web Code:** Modify `src/` files as needed.
2.  **Sync Capacitor:** Run `npx cap sync [ios|android]` to copy web assets and update native project files.
    *   For iOS, after `npx cap sync ios`, navigate to `ios/App` and run `pod install` if `Podfile` changes were made.
3.  **Open Native IDE:** Open the native project in Xcode (`ios/App/App.xcworkspace`) or Android Studio (`android`).
4.  **Build and Run:** Build and run the application from the native IDE onto a device or emulator.
5.  **Debug:** Use the native IDE's debugging tools (console logs, breakpoints) to troubleshoot native-specific issues.
