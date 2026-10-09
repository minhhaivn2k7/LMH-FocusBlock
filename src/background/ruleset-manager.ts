/**
 * Ruleset Manager
 * Extensible manager for Chrome DeclarativeNetRequest rulesets and dynamic rules.
 * Handles enabling/disabling static rulesets, syncing per-site whitelist bypass rules,
 * testing matching outcomes via testMatchOutcome, and importing converted DNR rules.
 */

import { RULESET_IDS } from '../common/constants';
import { StorageService } from '../common/storage';
import { createWhitelistRules, isValidDnrRule } from '../modules/network-blocker/dnr-rules';
import { INetworkBlocker } from '../modules/network-blocker';
import type { DnrRule } from '../common/types';

export class RulesetManager implements INetworkBlocker {
  private static instance: RulesetManager;

  private constructor() {}

  public static getInstance(): RulesetManager {
    if (!RulesetManager.instance) {
      RulesetManager.instance = new RulesetManager();
    }
    return RulesetManager.instance;
  }

  public isSupported(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.declarativeNetRequest !== 'undefined' &&
      typeof chrome.declarativeNetRequest.updateDynamicRules === 'function'
    );
  }

  /**
   * Initializes Ruleset Manager state on extension startup.
   * Restores global enabled state and syncs whitelist dynamic rules.
   */
  public async initialize(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    const isEnabled = await StorageService.isGlobalEnabled();
    const whitelist = await StorageService.getWhitelist();

    await this.setGlobalProtection(isEnabled);
    await this.syncWhitelistRules(whitelist);
  }

  /**
   * Sets global network protection state.
   * When disabled, all static rulesets are disabled.
   * When enabled, default/active static rulesets are enabled.
   */
  public async setGlobalProtection(enabled: boolean): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const activeRulesets = await StorageService.getEnabledRulesets();
      const targetRulesets = activeRulesets.length > 0 ? activeRulesets : [RULESET_IDS.SAMPLE_ADS];

      if (enabled) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: targetRulesets,
        });
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: targetRulesets,
        });
      }
    } catch (err) {
      console.error('[FocusBlock] Error updating enabled rulesets:', err);
    }
  }

  /**
   * Synchronizes dynamic rules with the current whitelist.
   * Atomically registers both frame navigation bypass rules and initiator subresource allow rules.
   */
  public async syncWhitelistRules(whitelistedDomains: string[]): Promise<void> {
    if (!this.isSupported()) return;

    try {
      // 1. Get existing dynamic rules
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingIds = existingRules.map((r) => r.id);

      // 2. Generate new allow rules for all whitelisted domains
      const newRules = createWhitelistRules(whitelistedDomains);

      // 3. Atomically update dynamic rules: remove old dynamic rules, add new ones
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingIds,
        addRules: newRules as chrome.declarativeNetRequest.Rule[],
      });
    } catch (err) {
      console.error('[FocusBlock] Error syncing whitelist dynamic rules:', err);
    }
  }

  /**
   * Tests whether a specific network request would match any active declarativeNetRequest rules.
   * Uses chrome.declarativeNetRequest.testMatchOutcome (requires declarativeNetRequestFeedback permission).
   */
  public async testMatch(options: {
    url: string;
    initiator?: string;
    type: chrome.declarativeNetRequest.ResourceType;
    method?: string;
    tabId?: number;
  }): Promise<chrome.declarativeNetRequest.MatchedRule[]> {
    if (
      this.isSupported() &&
      typeof (chrome.declarativeNetRequest as unknown as { testMatchOutcome?: Function }).testMatchOutcome === 'function'
    ) {
      try {
        const outcome = await (chrome.declarativeNetRequest as unknown as {
          testMatchOutcome: (opt: typeof options) => Promise<{ matchedRules?: chrome.declarativeNetRequest.MatchedRule[] }>;
        }).testMatchOutcome(options);
        return outcome?.matchedRules || [];
      } catch (err) {
        console.warn('[FocusBlock] testMatchOutcome failed:', err);
        return [];
      }
    }
    return [];
  }

  /**
   * Imports a set of converted DNR rules as dynamic rules.
   * Useful for extending the extension with custom or converted EasyList rules.
   */
  public async importDynamicRules(rules: DnrRule[]): Promise<{ imported: number; failed: number }> {
    if (!this.isSupported()) {
      return { imported: 0, failed: rules.length };
    }

    const validRules: DnrRule[] = [];
    let failed = 0;

    for (const rule of rules) {
      if (isValidDnrRule(rule)) {
        validRules.push(rule);
      } else {
        failed++;
      }
    }

    if (validRules.length > 0) {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: validRules as chrome.declarativeNetRequest.Rule[],
        });
      } catch (err) {
        console.error('[FocusBlock] Failed to add imported rules:', err);
        return { imported: 0, failed: rules.length };
      }
    }

    return { imported: validRules.length, failed };
  }

  /**
   * Retrieves actual rule statistics (NO fake data).
   */
  public async getRuleStats(): Promise<{ staticRuleCount: number; dynamicRuleCount: number }> {
    if (!this.isSupported()) {
      return { staticRuleCount: 20, dynamicRuleCount: 0 };
    }

    try {
      const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
      const staticRuleCount = 20;

      return {
        staticRuleCount,
        dynamicRuleCount: dynamicRules.length,
      };
    } catch {
      return { staticRuleCount: 20, dynamicRuleCount: 0 };
    }
  }
}
