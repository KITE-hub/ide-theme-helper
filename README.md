# ide-theme-helper

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

3. Edit `extension-config.json` to configure your overall extension

```json
{
  "name": "my-theme",
  "displayName": "My Theme",
  "publisher": "local-dev",
  "version": "1.0.0",
  "ides": ["code", "cursor"]
}
```

4. Set up each theme folder under `themes/`

**`themes/<ThemeName>/theme-config.json`** — Theme metadata

```json
{
  "theme": {
    "name": "My Theme Cyan",
    "displayName": "My Theme Cyan",
    "type": "dark"
  }
}
```

**`themes/<ThemeName>/color-palette/primary.json`** — Base colors (red, yellow, green, etc.)

**`themes/<ThemeName>/color-palette/semantic.json`** — Semantic colors (text, background, border, accent, etc.)

**`themes/<ThemeName>/ui/`** — UI color definitions (one JSON file per category)

**`themes/<ThemeName>/token-color/token-color.json`** — Syntax highlighting colors

## Usage

```bash
npm run build
```

This will generate a `.vsix` file and install it into the IDEs specified in `theme-config.json`. After the build, select your theme via `Ctrl+Shift+P` → `Preferences: Color Theme`.

## File Structure

```
├── build-theme.mjs           # Build script
├── extension-config.json     # Extension metadata and IDE settings
└── themes/
    ├── Cyan/
    │   ├── theme-config.json # Theme metadata
    │   ├── color-palette/
    │   │   ├── primary.json  # Base colors
    │   │   └── semantic.json # Semantic colors (text, background, border, etc.)
    │   ├── ui/               # UI color definitions
    │   └── token-color/
    │       └── token-color.json # Syntax highlighting colors
    └── Purple/
        ├── theme-config.json
        ├── color-palette/
        │   ├── primary.json
        │   └── semantic.json
        ├── ui/
        └── token-color/
            └── token-color.json
```