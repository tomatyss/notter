# Release Guide for Notter

This document outlines the process for creating and publishing new releases of Notter.

## Automated Release Process

Notter uses GitHub Actions to automate the build and release process. When a new tag is pushed to the repository, the workflow automatically:

1. Builds the application for Windows, macOS, and Linux
2. Creates a GitHub release with the built artifacts
3. Generates release notes from commit history

## Creating a New Release

To create a new release, follow these steps:

### 1. Update Version Numbers

Update the version number in the following files:

- `package.json`:
  ```json
  {
    "version": "x.y.z"
  }
  ```

- `src-tauri/Cargo.toml`:
  ```toml
  [package]
  version = "x.y.z"
  ```

- `src-tauri/tauri.conf.json`:
  ```json
  {
    "version": "x.y.z"
  }
  ```

### 2. Commit Version Changes

Commit the version changes to the repository:

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "Bump version to x.y.z"
git push origin main
```

### 3. Create and Push a Tag

Create a new tag with the version number and push it to GitHub:

```bash
git tag vx.y.z
git push origin vx.y.z
```

For example, for version 0.1.5:

```bash
git tag v0.1.5
git push origin v0.1.5
```

### 4. Monitor the Release Process

After pushing the tag, you can monitor the build and release process in the "Actions" tab of your GitHub repository. Once the workflow completes successfully, a new release will be available in the "Releases" section of your repository.

## Release Artifacts

The automated release process creates the following artifacts:

- **Windows**: MSI installer (`.msi`)
- **macOS**: DMG file (`.dmg`)
- **Linux**: AppImage (`.AppImage`)

## iOS Releases

iOS releases are not included in the automated process as they require an Apple Developer account and must be built and submitted through Xcode. Follow these steps for iOS releases:

1. Update the version numbers as described above
2. Run the iOS build script:
   ```bash
   ./ios-build.sh
   ```
3. Open the generated Xcode project
4. Configure your signing certificates and provisioning profiles
5. Build and submit to the App Store using Xcode

## Troubleshooting

If the automated release process fails, check the workflow logs in the GitHub Actions tab for error messages. Common issues include:

- Missing dependencies
- Build errors
- Incorrect version numbers

If you need to make changes, fix the issues, update the version numbers again if necessary, and create a new tag.
