# Notter iOS Development Guide

This technical guide explains how the iOS version of Notter is implemented using Tauri 2.0's mobile capabilities.

## Architecture Overview

The iOS version of Notter follows the same architecture as the desktop version, with some platform-specific adaptations:

```
┌─────────────────────────────────────┐
│            iOS Application          │
├─────────────┬───────────────────────┤
│ Tauri Core  │  WebView (Frontend)   │
│ (Rust)      │  (React/TypeScript)   │
├─────────────┼───────────────────────┤
│ File System │  UI Adaptations       │
│ Access      │  (Mobile Layout)      │
└─────────────┴───────────────────────┘
```

## Key Components

### 1. iOS Configuration

The iOS-specific configuration is defined in `src-tauri/tauri.conf.json`:

```json
{
  "mobile": {
    "ios": {
      "developmentTeam": "YOUR_TEAM_ID",
      "infoPlist": {
        "NSDocumentsFolderUsageDescription": "This app needs access to your documents to read and save notes.",
        "UIFileSharingEnabled": true,
        "UISupportsDocumentBrowser": true,
        "LSSupportsOpeningDocumentsInPlace": true
      }
    }
  }
}
```

### 2. iOS-Specific Rust Code

The iOS-specific Rust code is implemented using conditional compilation with `#[cfg(target_os = "ios")]`:

```rust
#[cfg(target_os = "ios")]
fn ios_init(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // iOS-specific initialization
    // ...
}
```

### 3. Responsive UI Components

The mobile UI is implemented using responsive React components:

- `MobileLayout.tsx`: Provides a responsive container that adapts to iOS devices
- `mobile.css`: Contains iOS-specific styles and adaptations

## iOS-Specific Adaptations

### File System Access

On iOS, file access is restricted to the app's sandbox. We handle this by:

1. Using the iOS document picker for folder selection
2. Storing notes in the app's Documents directory
3. Supporting iCloud Drive for cross-device syncing

```rust
#[cfg(target_os = "ios")]
fn ios_init(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Get the app's documents directory on iOS
    let documents_dir = tauri::api::path::document_dir()
        .ok_or("Failed to get documents directory")?;
    
    // Set up notes directory in the Documents folder
    let notes_dir = documents_dir.join("Notes");
    
    // Create the directory if it doesn't exist
    if !notes_dir.exists() {
        std::fs::create_dir_all(&notes_dir)?;
    }
    
    // Update configuration to use this directory
    // ...
}
```

### UI Adaptations

The UI is adapted for iOS using:

1. Responsive layouts that adjust to screen size and orientation
2. Touch-friendly controls with appropriate sizing
3. iOS-specific gestures and interactions

```tsx
// MobileLayout.tsx
const mobileStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: orientation === 'portrait' ? 'column' : 'row',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  touchAction: 'manipulation', // Optimize for touch
};
```

### iOS Safe Areas

We handle iOS safe areas (notches, home indicator) using CSS environment variables:

```css
/* iOS-specific adjustments */
@supports (-webkit-touch-callout: none) {
  .app {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}
```

## Build Process

### Development Build

For development and testing in the iOS Simulator:

```bash
npm run ios:dev
```

This command:
1. Builds the React frontend
2. Compiles the Rust backend for iOS
3. Generates an Xcode project
4. Builds and runs the app in the iOS Simulator

### Production Build

For production builds:

```bash
npm run ios:build
```

This command:
1. Builds the React frontend in production mode
2. Compiles the Rust backend for iOS with optimizations
3. Generates an Xcode project
4. Creates an archive suitable for App Store submission

## Testing on iOS

### Simulator Testing

Test the app on various iOS device simulators:
- iPhone (various sizes)
- iPad (various sizes)
- Different iOS versions (13.0+)

### Physical Device Testing

For testing on physical devices:
1. Ensure your Apple Developer account is set up
2. Update the development team ID in `tauri.conf.json`
3. Connect your iOS device to your Mac
4. Select your device in Xcode
5. Build and run the app

## App Store Submission

### Preparing for Submission

1. Update app metadata in `tauri.conf.json`
2. Create app screenshots for various device sizes
3. Prepare app description, keywords, and privacy policy

### Submission Process

1. Build the production version using `npm run ios:build`
2. Open the generated Xcode project
3. Use Xcode's Archive functionality to create an app archive
4. Submit the archive to App Store Connect
5. Complete the submission process in App Store Connect

## Troubleshooting

### Common Issues

1. **Code Signing Issues**
   - Ensure your Apple Developer account is active
   - Verify the development team ID in `tauri.conf.json`
   - Check provisioning profiles in Xcode

2. **File Access Issues**
   - Verify Info.plist permissions are correctly configured
   - Test file access in the iOS Simulator
   - Check for sandbox violations in device logs

3. **UI Layout Issues**
   - Test on multiple device sizes and orientations
   - Verify CSS media queries are working correctly
   - Check for overflow issues on smaller screens

## Resources

- [Tauri Mobile Documentation](https://tauri.app/v2/guides/mobile/ios/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/overview/themes/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
