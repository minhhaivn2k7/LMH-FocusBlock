/**
 * LMH FocusBlock - Multi-Target Extension Builder
 * Ensures content scripts are standalone IIFE bundles (zero external chunk imports),
 * background service worker is a standalone bundle, and popup is built with HTML/CSS.
 */

import { build } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

async function runBuild() {
  console.log('--- Starting LMH FocusBlock Build ---');

  // 1. Build Popup (HTML + CSS + TS)
  console.log('Building Popup UI...');
  await build({
    base: './',
    configFile: false,
    publicDir: resolve('public'),
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      rollupOptions: {
        input: {
          popup: resolve('popup.html'),
        },
        output: {
          entryFileNames: 'popup.js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'popup.css';
            }
            return 'assets/[name][extname]';
          },
        },
      },
    },
  });

  // 2. Build Background Service Worker (Standalone bundle)
  console.log('Building Background Service Worker...');
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2022',
      lib: {
        entry: resolve('src/background/index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 3. Build Content Script (Isolated World Standalone IIFE)
  console.log('Building Content Script (Isolated World IIFE)...');
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2022',
      lib: {
        entry: resolve('src/content/index.ts'),
        name: 'LMHFocusBlockContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 4. Build Popup Guard Main World Script (Main World Standalone IIFE)
  console.log('Building Popup Guard Main World Script...');
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2022',
      lib: {
        entry: resolve('src/modules/popup-guard/main-world.ts'),
        name: 'LMHFocusBlockMainWorldGuard',
        formats: ['iife'],
        fileName: () => 'popup-guard-main.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 5. Verify output files
  const requiredFiles = [
    'manifest.json',
    'popup.html',
    'popup.js',
    'popup.css',
    'background.js',
    'content.js',
    'popup-guard-main.js',
    'rules/sample-ads.json',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png',
  ];

  console.log('\nChecking built artifacts in dist/:');
  let allExist = true;
  for (const file of requiredFiles) {
    const fullPath = resolve('dist', file);
    const exists = fs.existsSync(fullPath);
    console.log(`  [${exists ? 'OK' : 'MISSING'}] dist/${file}`);
    if (!exists) allExist = false;
  }

  if (!allExist) {
    throw new Error('Build failed: Some required artifacts are missing in dist/');
  }

  console.log('\n--- Build Completed Successfully! ---');
}

runBuild().catch((err) => {
  console.error('Build script failed:', err);
  process.exit(1);
});
