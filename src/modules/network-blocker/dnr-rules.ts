/**
 * DeclarativeNetRequest (DNR) Rule Helpers
 * Responsible for constructing, validating, and managing DNR rule structures.
 */

import { DnrRule } from '../../common/types';
import { hashDomainToId, normalizeDomain } from '../../common/url-utils';
import {
  WHITELIST_ALLOW_PRIORITY,
  DYNAMIC_RULE_FRAME_BASE_ID,
  DYNAMIC_RULE_ALLOW_BASE_ID,
} from '../../common/constants';

/**
 * Creates an 'allowAllRequests' dynamic rule for a whitelisted domain.
 * Per Chrome DNR specification, allowAllRequests is valid ONLY for main_frame and sub_frame.
 * When the frame matches this rule, Chrome prevents ANY declarative rule from matching
 * on requests originating from this frame or its descendant frames.
 */
export function createWhitelistFrameRule(domain: string): DnrRule {
  const normalized = normalizeDomain(domain);
  const ruleId = hashDomainToId(normalized, DYNAMIC_RULE_FRAME_BASE_ID);

  return {
    id: ruleId,
    priority: WHITELIST_ALLOW_PRIORITY,
    action: {
      type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType,
    },
    condition: {
      requestDomains: [normalized],
      resourceTypes: ['main_frame', 'sub_frame'] as chrome.declarativeNetRequest.ResourceType[],
    },
  };
}

/**
 * Creates an 'allow' dynamic rule for all requests where the initiator is the whitelisted domain.
 * Ensures any subresources (scripts, images, fetch, etc.) initiated by this domain are allowed.
 */
export function createWhitelistInitiatorRule(domain: string): DnrRule {
  const normalized = normalizeDomain(domain);
  const ruleId = hashDomainToId(normalized, DYNAMIC_RULE_ALLOW_BASE_ID);

  return {
    id: ruleId,
    priority: WHITELIST_ALLOW_PRIORITY,
    action: {
      type: 'allow' as chrome.declarativeNetRequest.RuleActionType,
    },
    condition: {
      initiatorDomains: [normalized],
    },
  };
}

/**
 * Creates the complete dynamic rule set for whitelisted domains.
 * Generates both:
 * 1. An 'allowAllRequests' frame navigation rule (requestDomains + main_frame/sub_frame)
 * 2. An 'allow' subresource rule (initiatorDomains)
 * strictly conforming to Chrome DNR specifications and preventing schema rejection.
 */
export function createWhitelistRules(domains: string[]): DnrRule[] {
  const seenIds = new Set<number>();
  const rules: DnrRule[] = [];

  for (const domain of domains) {
    const normalized = normalizeDomain(domain);
    if (!normalized) continue;

    // 1. Frame navigation allowAllRequests rule
    let frameId = hashDomainToId(normalized, DYNAMIC_RULE_FRAME_BASE_ID);
    while (seenIds.has(frameId)) frameId++;
    seenIds.add(frameId);

    rules.push({
      id: frameId,
      priority: WHITELIST_ALLOW_PRIORITY,
      action: {
        type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType,
      },
      condition: {
        requestDomains: [normalized],
        resourceTypes: ['main_frame', 'sub_frame'] as chrome.declarativeNetRequest.ResourceType[],
      },
    });

    // 2. Subresource initiator allow rule
    let initiatorId = hashDomainToId(normalized, DYNAMIC_RULE_ALLOW_BASE_ID);
    while (seenIds.has(initiatorId)) initiatorId++;
    seenIds.add(initiatorId);

    rules.push({
      id: initiatorId,
      priority: WHITELIST_ALLOW_PRIORITY,
      action: {
        type: 'allow' as chrome.declarativeNetRequest.RuleActionType,
      },
      condition: {
        initiatorDomains: [normalized],
      },
    });
  }

  return rules;
}

/**
 * Validates a DNR rule schema to ensure safety and avoid syntax errors
 * before submitting to chrome.declarativeNetRequest.
 */
export function isValidDnrRule(rule: Partial<DnrRule>): boolean {
  if (!rule || typeof rule !== 'object') return false;
  if (typeof rule.id !== 'number' || rule.id <= 0) return false;
  if (typeof rule.priority !== 'number' || rule.priority <= 0) return false;
  if (!rule.action || !rule.action.type) return false;
  if (!rule.condition || typeof rule.condition !== 'object') return false;

  // Enforce Chrome DNR specification constraint:
  // allowAllRequests rules may ONLY specify main_frame and/or sub_frame resourceTypes
  if (rule.action.type === 'allowAllRequests' && rule.condition.resourceTypes) {
    const invalidTypes = rule.condition.resourceTypes.filter(
      (t) => t !== 'main_frame' && t !== 'sub_frame'
    );
    if (invalidTypes.length > 0) {
      return false;
    }
  }

  return true;
}
