/**
 * Core type definitions for LMH FocusBlock extension
 */

export interface ExtensionSettings {
  /** Enable cosmetic element hiding in DOM */
  blockCosmetic: boolean;
  /** Guard against window.open abuse and unwanted popups */
  blockPopups: boolean;
}

export interface ExtensionState {
  globalEnabled: boolean;
  whitelistedDomains: string[];
  settings: ExtensionSettings;
  activeRulesetIds: string[];
  currentDomain?: string;
  isCurrentDomainWhitelisted?: boolean;
  stats: {
    staticRuleCount: number;
    dynamicRuleCount: number;
    whitelistedCount: number;
  };
}

export type MessageType =
  | 'GET_STATE'
  | 'TOGGLE_GLOBAL'
  | 'TOGGLE_DOMAIN'
  | 'ADD_WHITELIST'
  | 'REMOVE_WHITELIST'
  | 'UPDATE_SETTINGS'
  | 'CHECK_SITE_STATUS';

export interface BaseMessage {
  type: MessageType;
}

export interface GetStateMessage extends BaseMessage {
  type: 'GET_STATE';
  currentDomain?: string;
}

export interface ToggleGlobalMessage extends BaseMessage {
  type: 'TOGGLE_GLOBAL';
  enabled: boolean;
}

export interface ToggleDomainMessage extends BaseMessage {
  type: 'TOGGLE_DOMAIN';
  domain: string;
  enabled: boolean;
}

export interface AddWhitelistMessage extends BaseMessage {
  type: 'ADD_WHITELIST';
  domain: string;
}

export interface RemoveWhitelistMessage extends BaseMessage {
  type: 'REMOVE_WHITELIST';
  domain: string;
}

export interface UpdateSettingsMessage extends BaseMessage {
  type: 'UPDATE_SETTINGS';
  settings: Partial<ExtensionSettings>;
}

export interface CheckSiteStatusMessage extends BaseMessage {
  type: 'CHECK_SITE_STATUS';
  domain: string;
}

export type ExtensionRequest =
  | GetStateMessage
  | ToggleGlobalMessage
  | ToggleDomainMessage
  | AddWhitelistMessage
  | RemoveWhitelistMessage
  | UpdateSettingsMessage
  | CheckSiteStatusMessage;

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** DeclarativeNetRequest Rule interfaces */
export interface DnrRule {
  id: number;
  priority: number;
  action: {
    type: chrome.declarativeNetRequest.RuleActionType;
    redirect?: chrome.declarativeNetRequest.Redirect;
  };
  condition: {
    urlFilter?: string;
    regexFilter?: string;
    initiatorDomains?: string[];
    excludedInitiatorDomains?: string[];
    requestDomains?: string[];
    excludedRequestDomains?: string[];
    resourceTypes?: chrome.declarativeNetRequest.ResourceType[];
    isUrlFilterCaseSensitive?: boolean;
  };
}
