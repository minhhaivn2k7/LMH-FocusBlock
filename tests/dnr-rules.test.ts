import { describe, it, expect } from 'vitest';
import {
  createWhitelistFrameRule,
  createWhitelistInitiatorRule,
  createWhitelistRules,
  isValidDnrRule,
} from '../src/modules/network-blocker/dnr-rules';
import { WHITELIST_ALLOW_PRIORITY } from '../src/common/constants';

describe('dnr-rules', () => {
  describe('createWhitelistFrameRule', () => {
    it('creates an allowAllRequests rule with strictly frame resourceTypes', () => {
      const rule = createWhitelistFrameRule('coursera.org');

      expect(rule.id).toBeGreaterThan(0);
      expect(rule.priority).toBe(WHITELIST_ALLOW_PRIORITY);
      expect(rule.action.type).toBe('allowAllRequests');
      expect(rule.condition.requestDomains).toEqual(['coursera.org']);
      expect(rule.condition.resourceTypes).toEqual(['main_frame', 'sub_frame']);
    });

    it('normalizes domain before generating frame rule', () => {
      const rule = createWhitelistFrameRule('https://www.coursera.org/learn');
      expect(rule.condition.requestDomains).toEqual(['coursera.org']);
    });
  });

  describe('createWhitelistInitiatorRule', () => {
    it('creates an allow rule with initiatorDomains', () => {
      const rule = createWhitelistInitiatorRule('coursera.org');

      expect(rule.id).toBeGreaterThan(0);
      expect(rule.priority).toBe(WHITELIST_ALLOW_PRIORITY);
      expect(rule.action.type).toBe('allow');
      expect(rule.condition.initiatorDomains).toEqual(['coursera.org']);
    });
  });

  describe('createWhitelistRules', () => {
    it('creates dual rules (frame + initiator) for each domain with distinct IDs', () => {
      const domains = ['coursera.org', 'edx.org'];
      const rules = createWhitelistRules(domains);

      // 2 rules per domain
      expect(rules).toHaveLength(4);

      const ids = rules.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(4);

      const frameRules = rules.filter((r) => r.action.type === 'allowAllRequests');
      const initiatorRules = rules.filter((r) => r.action.type === 'allow');

      expect(frameRules).toHaveLength(2);
      expect(initiatorRules).toHaveLength(2);

      for (const r of frameRules) {
        expect(r.condition.resourceTypes).toEqual(['main_frame', 'sub_frame']);
      }
    });

    it('handles empty domain array', () => {
      expect(createWhitelistRules([])).toEqual([]);
    });
  });

  describe('isValidDnrRule', () => {
    it('validates proper DNR rule', () => {
      const validRule = {
        id: 1,
        priority: 1,
        action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
        condition: { urlFilter: '||ads.example.com^' },
      };
      expect(isValidDnrRule(validRule)).toBe(true);
    });

    it('rejects allowAllRequests rule with invalid resourceTypes (like script or image)', () => {
      const invalidRule = {
        id: 10,
        priority: 1,
        action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
        condition: {
          resourceTypes: ['script', 'image'] as chrome.declarativeNetRequest.ResourceType[],
        },
      };
      expect(isValidDnrRule(invalidRule)).toBe(false);
    });

    it('rejects rules with missing or invalid fields', () => {
      expect(isValidDnrRule(null as unknown as Record<string, unknown>)).toBe(false);
      expect(isValidDnrRule({ id: 0, priority: 1, action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType } })).toBe(false);
      expect(isValidDnrRule({ id: 1, priority: 0 })).toBe(false);
      expect(isValidDnrRule({ id: 1, priority: 1, condition: {} })).toBe(false);
    });
  });
});
