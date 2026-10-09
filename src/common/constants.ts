/**
 * Constants used across LMH FocusBlock
 */

export const STORAGE_KEYS = {
  GLOBAL_ENABLED: 'focusblock_global_enabled',
  WHITELIST: 'focusblock_whitelist',
  SETTINGS: 'focusblock_settings',
  ENABLED_RULESETS: 'focusblock_enabled_rulesets',
} as const;

export const RULESET_IDS = {
  SAMPLE_ADS: 'ruleset_sample_ads',
} as const;

export const DEFAULT_SETTINGS = {
  blockCosmetic: true,
  blockPopups: true,
};

/** Brand Color: Required #0033CC */
export const BRAND_COLOR = '#0033CC';

/** Base dynamic rule ID for whitelist frame rules (allowAllRequests) */
export const DYNAMIC_RULE_FRAME_BASE_ID = 200000;

/** Base dynamic rule ID for whitelist subresource rules (allow) */
export const DYNAMIC_RULE_ALLOW_BASE_ID = 300000;

/** High priority for allow rules to override any static blocking rules */
export const WHITELIST_ALLOW_PRIORITY = 9999;
