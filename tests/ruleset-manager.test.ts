import { describe, it, expect, beforeEach } from 'vitest';
import { RulesetManager } from '../src/background/ruleset-manager';
import { StorageService } from '../src/common/storage';
import { DEFAULT_SETTINGS, RULESET_IDS } from '../src/common/constants';
import type { DnrRule } from '../src/common/types';

describe('RulesetManager & StorageService', () => {
  beforeEach(() => {
    // Reset any global mocks if needed
  });

  describe('RulesetManager', () => {
    it('returns a singleton instance', () => {
      const instance1 = RulesetManager.getInstance();
      const instance2 = RulesetManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('gracefully handles unsupported environment (node without chrome api)', () => {
      const manager = RulesetManager.getInstance();
      expect(manager.isSupported()).toBe(false);
    });

    it('filters valid rules during import', async () => {
      const manager = RulesetManager.getInstance();
      const rules: DnrRule[] = [
        {
          id: 1,
          priority: 1,
          action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
          condition: { urlFilter: '||bad.com^' },
        },
        {
          id: -1, // Invalid id
          priority: 1,
          action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
          condition: {},
        },
      ];

      const result = await manager.importDynamicRules(rules);
      // In unsupported environment, returns without crashing
      expect(result.failed).toBe(rules.length);
    });

    it('returns real default rule statistics', async () => {
      const manager = RulesetManager.getInstance();
      const stats = await manager.getRuleStats();
      expect(stats.staticRuleCount).toBe(20);
      expect(stats.dynamicRuleCount).toBe(0);
    });
  });

  describe('StorageService', () => {
    it('returns default fallback values when chrome.storage is unavailable', async () => {
      const isEnabled = await StorageService.isGlobalEnabled();
      expect(isEnabled).toBe(true);

      const whitelist = await StorageService.getWhitelist();
      expect(whitelist).toEqual([]);

      const settings = await StorageService.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);

      const rulesets = await StorageService.getEnabledRulesets();
      expect(rulesets).toEqual([RULESET_IDS.SAMPLE_ADS]);
    });
  });
});
