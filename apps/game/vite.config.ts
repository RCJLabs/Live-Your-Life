import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Where the built game is served from. GitHub Pages serves this repo under /Live-Your-Life/
 * until it has a domain of its own (ROADMAP.md, open questions), and CI sets LYL_BASE to that
 * path. Asset URLs, the manifest's scope and start_url, and the service worker's navigation
 * fallback all derive from this one value. Engine-Builder's editor does the same with EB_BASE.
 */
const BASE = process.env.LYL_BASE ?? '/';

const repoRoot = resolve(import.meta.dirname, '../..');
// The root package.json is the one place the version is written down.
const { version } = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as { version: string };

function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const build = { version, sha: commitSha(), built: new Date().toISOString() };

/**
 * `version.json` lets CI prove the live site serves this exact commit: the deploy waits for it.
 * It stays out of the precache, so it always comes from the network.
 */
function versionFile(): Plugin {
  return {
    name: 'lyl-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify(build, null, 2)}\n` });
    },
  };
}

export default defineConfig(({ command, isPreview }) => ({
  // Dev serves from `/`; the build and `vite preview` (which serves the build) use BASE.
  base: command === 'build' || isPreview ? BASE : '/',
  define: { __LYL_BUILD__: JSON.stringify(build) },
  plugins: [
    versionFile(),
    VitePWA({
      // Prompt, never auto-update: a game reloading under the player loses their moment.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: 'Live Your Life',
        short_name: 'Live Your Life',
        description: 'A life sim in a fictional Rust Belt city. Design phase: the clock runs, nothing to play yet.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#1d2433',
        theme_color: '#1d2433',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // rcjlabs.github.io is one origin shared by every RCJ Labs project site, so this game's
        // caches carry a prefix of their own and never touch another game's.
        cacheId: 'lyl-game',
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/\/version\.json$/],
      },
    }),
  ],
}));
