/**
 * Network Blocker Module
 * Exposes core network blocking capabilities powered by Declarative Net Request.
 */

export * from './dnr-rules';

export interface INetworkBlocker {
  isSupported(): boolean;
  syncWhitelistRules(whitelistedDomains: string[]): Promise<void>;
  setGlobalProtection(enabled: boolean): Promise<void>;
  getRuleStats(): Promise<{ staticRuleCount: number; dynamicRuleCount: number }>;
  testMatch?(options: {
    url: string;
    initiator?: string;
    type: chrome.declarativeNetRequest.ResourceType;
    method?: string;
    tabId?: number;
  }): Promise<chrome.declarativeNetRequest.MatchedRule[]>;
}
