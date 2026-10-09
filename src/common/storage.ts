/**
 * Typed storage wrapper for chrome.storage.local
 */
import { STORAGE_KEYS, DEFAULT_SETTINGS, RULESET_IDS } from './constants';
import type { ExtensionSettings, ExtensionState } from './types';

export class StorageService {
  /**
   * Reads global enabled status
   */
  public static async isGlobalEnabled(): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return true;
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.GLOBAL_ENABLED);
    return result[STORAGE_KEYS.GLOBAL_ENABLED] ?? true;
  }

  /**
   * Sets global enabled status
   */
  public static async setGlobalEnabled(enabled: boolean): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [STORAGE_KEYS.GLOBAL_ENABLED]: enabled });
  }

  /**
   * Reads whitelisted domains list
   */
  public static async getWhitelist(): Promise<string[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return [];
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.WHITELIST);
    const list = result[STORAGE_KEYS.WHITELIST];
    return Array.isArray(list) ? list : [];
  }

  /**
   * Sets entire whitelisted domains list
   */
  public static async setWhitelist(domains: string[]): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: domains });
  }

  /**
   * Adds a domain to whitelist
   */
  public static async addWhitelistDomain(domain: string): Promise<string[]> {
    const list = await this.getWhitelist();
    if (!list.includes(domain)) {
      const updated = [...list, domain];
      await this.setWhitelist(updated);
      return updated;
    }
    return list;
  }

  /**
   * Removes a domain from whitelist
   */
  public static async removeWhitelistDomain(domain: string): Promise<string[]> {
    const list = await this.getWhitelist();
    const updated = list.filter((item) => item !== domain);
    await this.setWhitelist(updated);
    return updated;
  }

  /**
   * Reads extension settings
   */
  public static async getSettings(): Promise<ExtensionSettings> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return DEFAULT_SETTINGS;
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...(result[STORAGE_KEYS.SETTINGS] || {}),
    };
  }

  /**
   * Updates extension settings
   */
  public static async updateSettings(
    newSettings: Partial<ExtensionSettings>
  ): Promise<ExtensionSettings> {
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });
    }
    return merged;
  }

  /**
   * Reads enabled ruleset IDs
   */
  public static async getEnabledRulesets(): Promise<string[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return [RULESET_IDS.SAMPLE_ADS];
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.ENABLED_RULESETS);
    const list = result[STORAGE_KEYS.ENABLED_RULESETS];
    return Array.isArray(list) ? list : [RULESET_IDS.SAMPLE_ADS];
  }

  /**
   * Sets enabled ruleset IDs
   */
  public static async setEnabledRulesets(rulesetIds: string[]): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED_RULESETS]: rulesetIds });
  }

  /**
   * Retrieves full snapshot of state
   */
  public static async getFullState(): Promise<Omit<ExtensionState, 'stats'>> {
    const [globalEnabled, whitelistedDomains, settings, activeRulesetIds] =
      await Promise.all([
        this.isGlobalEnabled(),
        this.getWhitelist(),
        this.getSettings(),
        this.getEnabledRulesets(),
      ]);

    return {
      globalEnabled,
      whitelistedDomains,
      settings,
      activeRulesetIds,
    };
  }
}
