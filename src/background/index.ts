/**
 * LMH FocusBlock - Background Service Worker (Manifest V3)
 * Pure local execution, no telemetry, zero remote dependencies.
 */

import { RulesetManager } from './ruleset-manager';
import { handleExtensionMessage } from './message-handler';
import { StorageService } from '../common/storage';
import { DEFAULT_SETTINGS } from '../common/constants';
import type { ExtensionRequest } from '../common/types';

const rulesetManager = RulesetManager.getInstance();

// 1. Initialize on extension installation / update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.info(`[LMH FocusBlock] Extension installed/updated. Reason: ${details.reason}`);

  if (details.reason === 'install') {
    // Set initial defaults
    await StorageService.setGlobalEnabled(true);
    await StorageService.setWhitelist([]);
    await StorageService.updateSettings(DEFAULT_SETTINGS);
  }

  // Initialize and synchronize DNR rulesets
  await rulesetManager.initialize();
});

// 2. Initialize on service worker startup / wake
rulesetManager.initialize().catch((err) => {
  console.error('[LMH FocusBlock] Error during startup initialization:', err);
});

// 3. Central message dispatcher
chrome.runtime.onMessage.addListener((message: ExtensionRequest, sender, sendResponse) => {
  handleExtensionMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((err) => {
      console.error('[LMH FocusBlock] Message handler failure:', err);
      sendResponse({ success: false, error: (err as Error).message });
    });

  return true; // Keep message channel open for async response
});
