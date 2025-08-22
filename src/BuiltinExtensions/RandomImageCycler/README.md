# Random Image Cycler Extension for SwarmUI

## Overview

The Random Image Cycler is a powerful extension for SwarmUI that automatically cycles through images from a specified folder during batch generation. It injects these images as init images, enabling consistent style transfer, pose reference, or composition guidance across multiple generations.

## Features

- **Automatic Image Cycling**: Automatically loads and cycles through images during batch generation
- **Multiple Cycling Modes**:
  - **Sequential**: Goes through images in order
  - **Random**: Picks random images each time
  - **Shuffle**: Randomizes the order once then cycles through
- **Interactive UI Controls**:
  - Manual image loading with preview
  - Reset counter functionality
  - Visual feedback with image thumbnails
  - Path display for loaded images
- **Smart Path Resolution**: Automatically resolves both relative and absolute paths
- **Session Persistence**: Maintains cycling state across multiple generations
- **Detailed Logging**: Comprehensive logs for debugging and monitoring

## Installation

The extension is built into SwarmUI and automatically loads on startup. No additional installation required.

## Usage

### Basic Setup

1. **Enable the Extension**:
   - Navigate to the generation parameters
   - Find the "Random Image Cycler" group (under Advanced settings)
   - Toggle "Enable Random Cycler" to ON

2. **Configure Folder Path**:
   - Enter the path to your image folder
   - Can be:
     - Relative path (e.g., `random_init_images`)
     - Absolute path (e.g., `D:\Images\InitImages`)
   - The extension will automatically resolve paths relative to your output directory

3. **Select Cycle Mode**:
   - **Sequential**: Images are used in alphabetical order
   - **Random**: A random image is selected each time
   - **Shuffle**: Images are shuffled once, then used in that order

### Interactive Controls

The extension adds a UI panel with:

- **🎲 Load Random Image**: Manually load and preview the next image in the cycle
- **🔄 Reset Counter**: Reset the cycling sequence to start over
- **Image Preview**: Shows a thumbnail of the currently loaded image
- **Path Display**: Shows the full path of the selected image

### Automatic Operation

When enabled during batch generation or "render forever" mode:
1. The extension automatically injects a new image for each generation
2. Images are cycled according to the selected mode
3. Logs show which image is being used for each generation
4. The init image creativity is automatically set if not specified

## Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Enable Random Cycler** | Activates the automatic image cycling | `false` |
| **Image Folder Path** | Path to folder containing images | `""` |
| **Cycle Mode** | How images are selected (Sequential/Random/Shuffle) | `Sequential` |
| **Cycle Count** | Number of images to cycle through (0 = all) | `0` |
| **Shuffle on Start** | Reshuffle images when starting a new batch | `true` |

## Supported Image Formats

- PNG (.png)
- JPEG (.jpg, .jpeg)
- WebP (.webp)
- BMP (.bmp)
- GIF (.gif)

## Path Resolution Logic

The extension uses intelligent path resolution:

1. **For relative paths** (e.g., `random_init_images`):
   - First tries: `{User Output Directory}\{folder path}`
   - If not found, tries: `{Parent of Output Directory}\{folder path}`

2. **For absolute paths** (e.g., `D:\Images`):
   - Uses the exact path specified

## API Endpoints

The extension exposes several API endpoints for programmatic control:

- `GetNextImage`: Retrieves the next image in the cycle
- `ResetCycler`: Resets the cycling state
- `GetFolderImages`: Lists all images in the specified folder
- `GetImageData`: Returns image data as base64 for preview

## Technical Details

### Architecture

- **C# Backend**: Handles image selection, caching, and injection
- **JavaScript Frontend**: Provides interactive UI controls and preview
- **Event-Driven**: Uses SwarmUI's PreGenerateEvent for automatic injection

### Performance Optimizations

- Images are cached in memory after first folder scan
- Shuffled lists are maintained per session
- Efficient index tracking for sequential and shuffle modes

### Security

- Path validation ensures access only to allowed directories
- Base64 encoding for secure image data transfer
- Proper error handling for missing or invalid files

## Troubleshooting

### Images Not Loading

1. **Check folder path**: Ensure the path exists and contains supported image formats
2. **Check logs**: Look for "RandomImageCycler" entries in the console
3. **Verify permissions**: Ensure SwarmUI has read access to the folder

### Preview Not Showing

1. **Clear browser cache**: Force refresh with Ctrl+F5
2. **Check console**: Look for JavaScript errors in browser console
3. **Verify extension loaded**: Check if the UI buttons appear

### Wrong Images Being Used

1. **Reset the counter**: Use the Reset Counter button
2. **Check cycle mode**: Ensure you have the intended mode selected
3. **Refresh folder cache**: Change folders and change back

## Examples

### Example 1: Style Transfer

Use a folder of artistic style references:
```
Folder: styles/impressionist
Mode: Shuffle
Enable: ON
```

### Example 2: Pose Library

Cycle through pose references:
```
Folder: poses/standing
Mode: Sequential
Enable: ON
```

### Example 3: Random Backgrounds

Use random background images:
```
Folder: backgrounds/nature
Mode: Random
Enable: ON
```

## Version History

### Version 2.0 (Current)
- Added GetImageData API for improved preview functionality
- Enhanced JavaScript UI with base64 image loading
- Improved error handling and fallback mechanisms
- Better path resolution with detailed logging

### Version 1.0
- Initial release with basic cycling functionality
- Manual load button and reset counter
- Preview display in extension UI
- Support for sequential, random, and shuffle modes

## License

This extension is part of SwarmUI and follows the same license terms.

## Support

For issues or feature requests, please report them in the SwarmUI GitHub repository with the tag `[RandomImageCycler]`.
