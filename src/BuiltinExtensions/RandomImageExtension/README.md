# Random Image Extension

A SwarmUI extension that adds random image selection functionality directly to the Generate tab interface.

## Features

- **🎲 Random Image Button**: Adds a "Random Image" button to the Init Image section
- **⚙️ Configurable Folder**: Settings dialog to choose which folder to select images from
- **🔄 Generate Forever Compatible**: Works perfectly with SwarmUI's "Generate Forever" mode
- **📁 Smart Path Detection**: Automatically finds your image folder in multiple locations
- **🎯 One-Click Selection**: Instant random image selection with visual feedback

## Installation

The extension is already included in your SwarmUI fork. Simply restart SwarmUI to activate it.

## Usage

1. **Open SwarmUI** and go to the Generate tab
2. **Expand the Init Image section** (if collapsed)
3. **Click the "🎲 Random Image" button** to select a random image
4. **Click the "⚙️" button** to configure which folder to use (default: `random_init_images`)

## Perfect for Generate Forever

This extension shines when used with SwarmUI's "Generate Forever" mode:

1. Set up your prompt with wildcards: `{characters} in a {cinematic_look} style`
2. Click "🎲 Random Image" to select an initial random image
3. Enable "Generate Forever" 
4. For each new generation, click the Random Image button again for variety

## Folder Configuration

- Default folder: `random_init_images` (in your SwarmUI project root)
- Supported formats: PNG, JPG, JPEG, BMP, TIFF, WEBP
- Use the settings button (⚙️) to change the folder path
- Relative paths are recommended (e.g., `my_images/portraits`)

## API

The extension provides an API endpoint at `/API/SelectRandomImageAPI` with parameters:
- `folder`: Image folder path (default: "random_init_images")
- `seed`: Random seed (-1 for truly random)
- `imageExtensions`: Comma-separated list of allowed extensions

## File Structure

```
random_init_images/           # Your random images
├── portrait_01.jpg
├── concept_02.png
└── reference_03.jpg
```

## Permissions

The extension requires the `randimg_use_random_image` permission, which is granted to all users by default.

## Troubleshooting

- **Button not appearing**: Check that the Init Image section is expanded
- **"Folder not found" error**: Verify your folder path in settings
- **"No images found" error**: Add supported image files to your folder
- **API errors**: Check the SwarmUI console for detailed error messages

## License

MIT License - Feel free to modify and redistribute.
