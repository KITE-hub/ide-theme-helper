# VS Code Theme Builder

A build tool that generates and installs a custom VS Code theme from color configuration files.

## Requirements

- Node.js
- `@vscode/vsce` (`npm install -g @vscode/vsce`)

## Setup

1. Clone this repository
2. Install dependencies

```bash
npm install
```

3. Edit `theme-config.json` to configure your theme

```json
{
  "theme": {
    "name": "My Theme",
    "displayName": "My Theme",
    "type": "dark"
  },
  "extension": {
    "name": "my-theme",
    "publisher": "local-dev",
    "version": "1.0.0"
  },
  "primaryJson": "primary.json",
  "semanticJson": "semantic.json",
  "ides": ["code", "cursor"]
}
```

4. Edit the color files in `color-config/` to define your colors

## Usage

```bash
npm run build
```

This will generate a `.vsix` file and install it into the IDEs specified in `theme-config.json`. After the build, select your theme via `Ctrl+Shift+P` → `Preferences: Color Theme`.

## File Structure

```
├── build-theme.mjs          # Build script
├── theme-config.json        # Theme metadata and settings
└── color-config/
    ├── color-palette/
    │   ├── primary.json     # Base colors
    │   └── semantic.json    # Semantic colors (text, background, border, etc.)
    ├── ui/                  # UI color definitions
    └── token-color/
        └── token-color.json # Syntax highlighting colors
```
