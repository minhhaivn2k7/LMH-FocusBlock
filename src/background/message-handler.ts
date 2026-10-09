/**
 * Background Message Handler
 * Dispatches popup and content script requests to Storage and RulesetManager.
 */

import { StorageService } from '../common/storage';
import { RulesetManager } from './ruleset-manager';
import { isDomainWhitelisted, normalizeDomain } from '../common/url-utils';
import type {
  ExtensionRequest,
  MessageResponse,
  ExtensionState,
} from '../common/types';

export async function handleExtensionMessage(
  message: ExtensionRequest,
  _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  const rulesetManager = RulesetManager.getInstance();

  switch (message.type) {
    case 'GET_STATE': {
      const fullState = await StorageService.getFullState();
      const stats = await rulesetManager.getRuleStats();

      let isCurrentDomainWhitelisted = false;
      const normalizedCurrent = message.currentDomain
        ? normalizeDomain(message.currentDomain)
        : undefined;

      if (normalizedCurrent) {
        isCurrentDomainWhitelisted = isDomainWhitelisted(
          normalizedCurrent,
          fullState.whitelistedDomains
        );
      }

      const responseData: ExtensionState = {
        ...fullState,
        currentDomain: normalizedCurrent,
        isCurrentDomainWhitelisted,
        stats: {
          staticRuleCount: stats.staticRuleCount,
          dynamicRuleCount: stats.dynamicRuleCount,
          whitelistedCount: fullState.whitelistedDomains.length,
        },
      };

      return { success: true, data: responseData };
    }

    case 'TOGGLE_GLOBAL': {
      await StorageService.setGlobalEnabled(message.enabled);
      await rulesetManager.setGlobalProtection(message.enabled);

      // Notify open tabs of global state change
      notifyAllTabs({ type: 'TOGGLE_GLOBAL', enabled: message.enabled });

      return { success: true };
    }

    case 'TOGGLE_DOMAIN': {
      const targetDomain = normalizeDomain(message.domain);
      if (!targetDomain) {
        return { success: false, error: 'Tên miền không hợp lệ' };
      }

      let updatedWhitelist: string[];
      if (message.enabled) {
        // "Enabled blocking on site" means remove from whitelist
        updatedWhitelist = await StorageService.removeWhitelistDomain(targetDomain);
      } else {
        // "Disabled blocking on site" means add to whitelist
        updatedWhitelist = await StorageService.addWhitelistDomain(targetDomain);
      }

      // Sync network rules via DNR dynamic rules
      await rulesetManager.syncWhitelistRules(updatedWhitelist);

      // Notify open tabs
      notifyAllTabs({
        type: 'TOGGLE_DOMAIN',
        domain: targetDomain,
        enabled: message.enabled,
      });

      return { success: true, data: { whitelistedDomains: updatedWhitelist } };
    }

    case 'ADD_WHITELIST': {
      const domain = normalizeDomain(message.domain);
      if (!domain) {
        return { success: false, error: 'Tên miền không hợp lệ' };
      }

      const updated = await StorageService.addWhitelistDomain(domain);
      await rulesetManager.syncWhitelistRules(updated);

      notifyAllTabs({ type: 'TOGGLE_DOMAIN', domain, enabled: false });

      return { success: true, data: { whitelistedDomains: updated } };
    }

    case 'REMOVE_WHITELIST': {
      const domain = normalizeDomain(message.domain);
      const updated = await StorageService.removeWhitelistDomain(domain);
      await rulesetManager.syncWhitelistRules(updated);

      notifyAllTabs({ type: 'TOGGLE_DOMAIN', domain, enabled: true });

      return { success: true, data: { whitelistedDomains: updated } };
    }

    case 'UPDATE_SETTINGS': {
      const updated = await StorageService.updateSettings(message.settings);
      notifyAllTabs({ type: 'UPDATE_SETTINGS', settings: updated });
      return { success: true, data: updated };
    }

    case 'CHECK_SITE_STATUS': {
      const domain = normalizeDomain(message.domain);
      const isGlobalEnabled = await StorageService.isGlobalEnabled();
      const whitelist = await StorageService.getWhitelist();
      const settings = await StorageService.getSettings();

      const isWhitelisted = isDomainWhitelisted(domain, whitelist);
      const isBlocked = isGlobalEnabled && !isWhitelisted;

      return {
        success: true,
        data: {
          isBlocked,
          isWhitelisted,
          settings,
        },
      };
    }

    default:
      return { success: false, error: 'Yêu cầu không xác định' };
  }
}

/**
 * Dispatches state updates to all active content script tabs.
 */
function notifyAllTabs(message: unknown): void {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab might not have content script running
        });
      }
    }
  });
}
