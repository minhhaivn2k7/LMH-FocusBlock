/**
 * LMH FocusBlock Content Script
 * Coordinates DOM cosmetic filtering, popup protection, and modular features
 * strictly adhering to per-site whitelist and global toggle settings.
 */

import { CosmeticFilter } from '../modules/content-blocker/cosmetic-filter';
import { PopupGuard } from '../modules/popup-guard/window-guard';
import { YouTubeModule } from '../modules/youtube';
import { extractHostname } from '../common/url-utils';
import type { CheckSiteStatusMessage, ExtensionRequest } from '../common/types';

class ContentController {
  private cosmeticFilter = new CosmeticFilter();
  private popupGuard = new PopupGuard();
  private youtubeModule = new YouTubeModule();
  private currentDomain: string | null = null;
  private isProtectionActive = false;

  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    this.currentDomain = extractHostname(window.location.href);
    if (!this.currentDomain) return;

    // Listen for live update messages from popup or background
    this.setupMessageListener();

    // Query status for current website
    await this.evaluateProtectionStatus();
  }

  private setupMessageListener(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener((message: ExtensionRequest, _sender, sendResponse) => {
      if (message.type === 'TOGGLE_GLOBAL' || message.type === 'TOGGLE_DOMAIN' || message.type === 'UPDATE_SETTINGS') {
        this.evaluateProtectionStatus().then(() => {
          sendResponse({ success: true, isProtectionActive: this.isProtectionActive });
        });
        return true; // async response
      }
      return false;
    });
  }

  public async evaluateProtectionStatus(): Promise<void> {
    if (!this.currentDomain || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return;
    }

    try {
      const message: CheckSiteStatusMessage = {
        type: 'CHECK_SITE_STATUS',
        domain: this.currentDomain,
      };

      const response = await chrome.runtime.sendMessage(message);

      if (response && response.success) {
        const { isBlocked, settings } = response.data as {
          isBlocked: boolean;
          settings: { blockCosmetic: boolean; blockPopups: boolean };
        };

        if (isBlocked) {
          this.applyProtection(settings);
        } else {
          this.removeProtection();
        }
      }
    } catch {
      // In case background is temporarily sleeping or reloaded
    }
  }

  private applyProtection(settings: { blockCosmetic: boolean; blockPopups: boolean }): void {
    this.isProtectionActive = true;

    // Apply cosmetic DOM filtering if enabled
    if (settings.blockCosmetic) {
      this.cosmeticFilter.start();
    } else {
      this.cosmeticFilter.stop();
    }

    // Apply popup guard if enabled
    if (settings.blockPopups) {
      this.popupGuard.start();
    } else {
      this.popupGuard.stop();
    }

    // Initialize YouTube foundation if on YouTube
    if (this.currentDomain?.includes('youtube.com')) {
      this.youtubeModule.initialize();
    }
  }

  private removeProtection(): void {
    this.isProtectionActive = false;
    this.cosmeticFilter.stop();
    this.popupGuard.stop();
    if (this.youtubeModule.isReady) {
      this.youtubeModule.destroy();
    }
  }
}

// Initialize on page load
const controller = new ContentController();
controller.init();
