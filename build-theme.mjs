// build-theme.mjs
import fs   from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { formatHex, toGamut } from 'culori';

const mapToSrgb = toGamut('rgb', 'oklch');

// ── Helpers ────────────────────────────────────────────────────────────────

function opacityToHex(opacity) {
  if (opacity == null || opacity === '') return '';
  const num = Number(opacity);
  if (isNaN(num)) return '';
  const clamped = Math.max(0, Math.min(100, num));
  return Math.round(clamped * 255 / 100).toString(16).padStart(2, '0');
}

// ── 1. Build colorName -> hex map from palette ────────────────────────────
function buildColorMap(palette) {
  const map = {};
  for (const [name, def] of Object.entries(palette)) {
    if (def.hex) {
      map[name] = def.hex.slice(0, 7);
    } else if (def.oklch) {
      const [l, c, h] = def.oklch;
      map[name] = formatHex(mapToSrgb({ mode: 'oklch', l, c, h }));
    } else if (def.okhsl) {
      const [h, s, l] = def.okhsl;
      map[name] = formatHex({ mode: 'okhsl', h, s, l });
    } else if (def.hsl) {
      const [h, s, l] = def.hsl;
      map[name] = formatHex({ mode: 'hsl', h, s, l });
    } else {
      console.warn(`[WARN] color-palette: no color definition for "${name}"`);
    }
  }
  return map;
}

// ── 2. Load all ui/*.json files and build the uiColors object ─────────────
function buildUiColors(uiDir, colorMap) {
  const result = {};
  const unknownColors = new Set();

  const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const entries = JSON.parse(fs.readFileSync(path.join(uiDir, file), 'utf8'));
    for (const [key, { color, opacity }] of Object.entries(entries)) {
      const hex = colorMap[color];
      if (!hex) {
        unknownColors.add(`${color} (${file} > ${key})`);
        continue;
      }
      result[key] = hex + opacityToHex(opacity);
    }
  }

  if (unknownColors.size > 0) {
    console.warn(`\n[WARN] Unknown color name(s) not found in color-palette (${unknownColors.size}):`);
    unknownColors.forEach(c => console.warn(`    - ${c}`));
  }

  return result;
}

// ── 3. Load token-colors.json and build the token color array ─────────────
function buildTokenColors(tokenFile, colorMap) {
  const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  const result = [];
  for (const token of tokens) {
    const hex = colorMap[token.color];
    if (!hex) {
      console.warn(`[WARN] token-colors: undefined color "${token.color}"`);
      continue;
    }
    result.push({
      scope:    token.scopes,
      settings: { [token.setting]: hex + opacityToHex(token.opacity) },
    });
  }
  return result;
}

// ── Build single theme → returns { theme, config } ────────────────────────
function buildTheme(themeDir) {
  const configPath = path.join(themeDir, 'theme-config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`[ERROR] theme-config.json not found in ${themeDir}`);
    return null;
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Building: ${config.theme.displayName}`);
  console.log('='.repeat(50));

  const primaryJson  = fs.readFileSync(path.join(themeDir, 'color-palette', "primary.json"), 'utf8');
  const semanticJson = fs.readFileSync(path.join(themeDir, 'color-palette', "semantic.json"), 'utf8');
  const palette = { ...JSON.parse(primaryJson), ...JSON.parse(semanticJson) };

  const colorMap    = buildColorMap(palette);
  const uiColors    = buildUiColors(path.join(themeDir, 'ui'), colorMap);
  const tokenColors = buildTokenColors(path.join(themeDir, 'token-color', 'token-color.json'), colorMap);

  return {
    config,
    theme: {
      name: config.theme.name,
      type: config.theme.type,
      colors: uiColors,
      tokenColors,
    },
  };
}

// ── Main ───────────────────────────────────────────────────────────────────
function main() {
  const themesRootDir = path.join('.', 'themes');
  const distDir       = path.join('.', 'dist');
  const vsixDir       = path.join(distDir, 'vsix');
  const vsixThemesDir = path.join(vsixDir, 'themes');

  // Load extension-config.json (required)
  const extConfigPath = 'extension-config.json';
  if (!fs.existsSync(extConfigPath)) {
    console.error('[ERROR] extension-config.json not found.');
    process.exit(1);
  }
  const extConfig = JSON.parse(fs.readFileSync(extConfigPath, 'utf8'));

  if (!fs.existsSync(themesRootDir)) {
    console.error('[ERROR] themes/ directory not found.');
    process.exit(1);
  }

  const themeDirs = fs.readdirSync(themesRootDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(themesRootDir, d.name));

  if (themeDirs.length === 0) {
    console.error('[ERROR] No theme folders found in themes/');
    process.exit(1);
  }

  // Build all themes
  const results = themeDirs.map(buildTheme).filter(Boolean);

  // Write each theme JSON and collect contributes.themes entries
  fs.mkdirSync(vsixThemesDir, { recursive: true });

  const uiThemeMap = { dark: 'vs-dark', light: 'vs', 'hc-black': 'hc-black', 'hc-light': 'hc-light' };
  const themeContributes = [];

  for (const { config, theme } of results) {
    const fileName = `${config.theme.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    const filePath = path.join(vsixThemesDir, fileName);

    // dist/vsix/themes/<theme>.json
    fs.writeFileSync(filePath, JSON.stringify(theme, null, 2), 'utf8');

    // dist/<themeName>-generated.json (intermediate artifact for inspection)
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(distDir, `${config.theme.name.replace(/\s+/g, '-').toLowerCase()}-generated.json`),
      JSON.stringify(theme, null, 2),
      'utf8'
    );

    themeContributes.push({
      label:   config.theme.displayName,
      uiTheme: uiThemeMap[config.theme.type],
      path:    `./themes/${fileName}`,
    });
  }

  // dist/vsix/package.json
  const pkg = {
    name:        extConfig.name,
    displayName: extConfig.displayName,
    description: 'Custom theme',
    version:     extConfig.version,
    publisher:   extConfig.publisher,
    engines:     { vscode: '^1.60.0' },
    categories:  ['Themes'],
    contributes: { themes: themeContributes },
  };
  fs.writeFileSync(path.join(vsixDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
  fs.writeFileSync(path.join(vsixDir, '.vscodeignore'), 'themes/generated-theme.json\n', 'utf8');

  // Package with vsce
  console.log('\n[INFO] Building vsix package...');
  try {
    execSync('vsce package --allow-missing-repository --no-dependencies', {
      cwd: vsixDir, stdio: 'inherit',
    });
  } catch {
    console.error('[ERROR] vsce package failed. Make sure @vscode/vsce is installed: npm install -g @vscode/vsce');
    return;
  }

  const vsixFileName = `${pkg.name}-${pkg.version}.vsix`;
  const vsixFile = path.resolve(vsixDir, vsixFileName);
  if (!fs.existsSync(vsixFile)) {
    console.error('[ERROR] vsix file not found after packaging.');
    return;
  }

  // Install into each IDE
  const ideMap = {
    code:        { name: 'VS Code',     cmd: 'code' },
    cursor:      { name: 'Cursor',      cmd: 'cursor' },
    windsurf:    { name: 'Windsurf',    cmd: 'windsurf' },
    kiro:        { name: 'Kiro',        cmd: 'kiro' },
    trae:        { name: 'Trae',        cmd: 'trae' },
    codium:      { name: 'VSCodium',    cmd: 'codium' },
    openvscode:  { name: 'OpenVSCode',  cmd: 'openvscode-server' },
    antigravity: { name: 'Antigravity', cmd: 'antigravity-ide' },
  };

  const ides = extConfig.ides.map(ide => ideMap[ide]).filter(Boolean);

  console.log('\n[INFO] Installing extension into IDEs...');
  for (const { name, cmd } of ides) {
    try {
      try {
        execSync(`${cmd} --uninstall-extension ${pkg.publisher}.${pkg.name}`, { stdio: 'pipe' });
      } catch {
        // Not installed yet — that's fine, continue
      }
      execSync(`${cmd} --install-extension "${vsixFile}"`, { stdio: 'inherit' });
      console.log(`[OK] ${name}: done`);
    } catch {
      console.log(`[SKIP] ${name}: command not found`);
    }
  }

  console.log('\n[ALL DONE] Select your theme via `Ctrl+Shift+P` → `Preferences: Color Theme`.');
}

main();
