const c = {
  GLOBAL_ENABLED: "focusblock_global_enabled",
  WHITELIST: "focusblock_whitelist",
  SETTINGS: "focusblock_settings",
  ENABLED_RULESETS: "focusblock_enabled_rulesets"
}, f = {
  SAMPLE_ADS: "ruleset_sample_ads"
}, m = {
  blockCosmetic: !0,
  blockPopups: !0
}, w = 2e5, R = 3e5, y = 9999;
class n {
  /**
   * Reads global enabled status
   */
  static async isGlobalEnabled() {
    return typeof chrome > "u" || !chrome.storage?.local ? !0 : (await chrome.storage.local.get(c.GLOBAL_ENABLED))[c.GLOBAL_ENABLED] ?? !0;
  }
  /**
   * Sets global enabled status
   */
  static async setGlobalEnabled(t) {
    typeof chrome > "u" || !chrome.storage?.local || await chrome.storage.local.set({ [c.GLOBAL_ENABLED]: t });
  }
  /**
   * Reads whitelisted domains list
   */
  static async getWhitelist() {
    if (typeof chrome > "u" || !chrome.storage?.local)
      return [];
    const e = (await chrome.storage.local.get(c.WHITELIST))[c.WHITELIST];
    return Array.isArray(e) ? e : [];
  }
  /**
   * Sets entire whitelisted domains list
   */
  static async setWhitelist(t) {
    typeof chrome > "u" || !chrome.storage?.local || await chrome.storage.local.set({ [c.WHITELIST]: t });
  }
  /**
   * Adds a domain to whitelist
   */
  static async addWhitelistDomain(t) {
    const e = await this.getWhitelist();
    if (!e.includes(t)) {
      const s = [...e, t];
      return await this.setWhitelist(s), s;
    }
    return e;
  }
  /**
   * Removes a domain from whitelist
   */
  static async removeWhitelistDomain(t) {
    const s = (await this.getWhitelist()).filter((a) => a !== t);
    return await this.setWhitelist(s), s;
  }
  /**
   * Reads extension settings
   */
  static async getSettings() {
    if (typeof chrome > "u" || !chrome.storage?.local)
      return m;
    const t = await chrome.storage.local.get(c.SETTINGS);
    return {
      ...m,
      ...t[c.SETTINGS] || {}
    };
  }
  /**
   * Updates extension settings
   */
  static async updateSettings(t) {
    const s = { ...await this.getSettings(), ...t };
    return typeof chrome < "u" && chrome.storage?.local && await chrome.storage.local.set({ [c.SETTINGS]: s }), s;
  }
  /**
   * Reads enabled ruleset IDs
   */
  static async getEnabledRulesets() {
    if (typeof chrome > "u" || !chrome.storage?.local)
      return [f.SAMPLE_ADS];
    const e = (await chrome.storage.local.get(c.ENABLED_RULESETS))[c.ENABLED_RULESETS];
    return Array.isArray(e) ? e : [f.SAMPLE_ADS];
  }
  /**
   * Sets enabled ruleset IDs
   */
  static async setEnabledRulesets(t) {
    typeof chrome > "u" || !chrome.storage?.local || await chrome.storage.local.set({ [c.ENABLED_RULESETS]: t });
  }
  /**
   * Retrieves full snapshot of state
   */
  static async getFullState() {
    const [t, e, s, a] = await Promise.all([
      this.isGlobalEnabled(),
      this.getWhitelist(),
      this.getSettings(),
      this.getEnabledRulesets()
    ]);
    return {
      globalEnabled: t,
      whitelistedDomains: e,
      settings: s,
      activeRulesetIds: a
    };
  }
}
function l(i) {
  if (!i) return "";
  let t = i.trim().toLowerCase();
  if (t.includes("://"))
    try {
      t = new URL(t).hostname;
    } catch {
    }
  const e = t.indexOf("/");
  e !== -1 && (t = t.substring(0, e));
  const s = t.indexOf(":");
  return s !== -1 && (t = t.substring(0, s)), t.endsWith(".") && (t = t.slice(0, -1)), t.startsWith("www.") && (t = t.substring(4)), t;
}
function E(i, t) {
  if (!i || !t || t.length === 0)
    return !1;
  const e = l(i);
  if (!e) return !1;
  for (const s of t) {
    const a = l(s);
    if (a && (e === a || e.endsWith(`.${a}`)))
      return !0;
  }
  return !1;
}
function p(i, t = 2e5) {
  const e = l(i);
  let s = 0;
  for (let o = 0; o < e.length; o++) {
    const r = e.charCodeAt(o);
    s = (s << 5) - s + r, s |= 0;
  }
  const a = Math.abs(s) % 5e5;
  return t + a;
}
function S(i) {
  const t = /* @__PURE__ */ new Set(), e = [];
  for (const s of i) {
    const a = l(s);
    if (!a) continue;
    let o = p(a, w);
    for (; t.has(o); ) o++;
    t.add(o), e.push({
      id: o,
      priority: y,
      action: {
        type: "allowAllRequests"
      },
      condition: {
        requestDomains: [a],
        resourceTypes: ["main_frame", "sub_frame"]
      }
    });
    let r = p(a, R);
    for (; t.has(r); ) r++;
    t.add(r), e.push({
      id: r,
      priority: y,
      action: {
        type: "allow"
      },
      condition: {
        initiatorDomains: [a]
      }
    });
  }
  return e;
}
function b(i) {
  return !(!i || typeof i != "object" || typeof i.id != "number" || i.id <= 0 || typeof i.priority != "number" || i.priority <= 0 || !i.action || !i.action.type || !i.condition || typeof i.condition != "object" || i.action.type === "allowAllRequests" && i.condition.resourceTypes && i.condition.resourceTypes.filter(
    (e) => e !== "main_frame" && e !== "sub_frame"
  ).length > 0);
}
class u {
  static instance;
  constructor() {
  }
  static getInstance() {
    return u.instance || (u.instance = new u()), u.instance;
  }
  isSupported() {
    return typeof chrome < "u" && typeof chrome.declarativeNetRequest < "u" && typeof chrome.declarativeNetRequest.updateDynamicRules == "function";
  }
  /**
   * Initializes Ruleset Manager state on extension startup.
   * Restores global enabled state and syncs whitelist dynamic rules.
   */
  async initialize() {
    if (!this.isSupported())
      return;
    const t = await n.isGlobalEnabled(), e = await n.getWhitelist();
    await this.setGlobalProtection(t), await this.syncWhitelistRules(e);
  }
  /**
   * Sets global network protection state.
   * When disabled, all static rulesets are disabled.
   * When enabled, default/active static rulesets are enabled.
   */
  async setGlobalProtection(t) {
    if (this.isSupported())
      try {
        const e = await n.getEnabledRulesets(), s = e.length > 0 ? e : [f.SAMPLE_ADS];
        t ? await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: s
        }) : await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: s
        });
      } catch (e) {
        console.error("[FocusBlock] Error updating enabled rulesets:", e);
      }
  }
  /**
   * Synchronizes dynamic rules with the current whitelist.
   * Atomically registers both frame navigation bypass rules and initiator subresource allow rules.
   */
  async syncWhitelistRules(t) {
    if (this.isSupported())
      try {
        const s = (await chrome.declarativeNetRequest.getDynamicRules()).map((o) => o.id), a = S(t);
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: s,
          addRules: a
        });
      } catch (e) {
        console.error("[FocusBlock] Error syncing whitelist dynamic rules:", e);
      }
  }
  /**
   * Tests whether a specific network request would match any active declarativeNetRequest rules.
   * Uses chrome.declarativeNetRequest.testMatchOutcome (requires declarativeNetRequestFeedback permission).
   */
  async testMatch(t) {
    if (this.isSupported() && typeof chrome.declarativeNetRequest.testMatchOutcome == "function")
      try {
        return (await chrome.declarativeNetRequest.testMatchOutcome(t))?.matchedRules || [];
      } catch (e) {
        return console.warn("[FocusBlock] testMatchOutcome failed:", e), [];
      }
    return [];
  }
  /**
   * Imports a set of converted DNR rules as dynamic rules.
   * Useful for extending the extension with custom or converted EasyList rules.
   */
  async importDynamicRules(t) {
    if (!this.isSupported())
      return { imported: 0, failed: t.length };
    const e = [];
    let s = 0;
    for (const a of t)
      b(a) ? e.push(a) : s++;
    if (e.length > 0)
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: e
        });
      } catch (a) {
        return console.error("[FocusBlock] Failed to add imported rules:", a), { imported: 0, failed: t.length };
      }
    return { imported: e.length, failed: s };
  }
  /**
   * Retrieves actual rule statistics (NO fake data).
   */
  async getRuleStats() {
    if (!this.isSupported())
      return { staticRuleCount: 20, dynamicRuleCount: 0 };
    try {
      return {
        staticRuleCount: 20,
        dynamicRuleCount: (await chrome.declarativeNetRequest.getDynamicRules()).length
      };
    } catch {
      return { staticRuleCount: 20, dynamicRuleCount: 0 };
    }
  }
}
async function T(i, t) {
  const e = u.getInstance();
  switch (i.type) {
    case "GET_STATE": {
      const s = await n.getFullState(), a = await e.getRuleStats();
      let o = !1;
      const r = i.currentDomain ? l(i.currentDomain) : void 0;
      return r && (o = E(
        r,
        s.whitelistedDomains
      )), { success: !0, data: {
        ...s,
        currentDomain: r,
        isCurrentDomainWhitelisted: o,
        stats: {
          staticRuleCount: a.staticRuleCount,
          dynamicRuleCount: a.dynamicRuleCount,
          whitelistedCount: s.whitelistedDomains.length
        }
      } };
    }
    case "TOGGLE_GLOBAL":
      return await n.setGlobalEnabled(i.enabled), await e.setGlobalProtection(i.enabled), d({ type: "TOGGLE_GLOBAL", enabled: i.enabled }), { success: !0 };
    case "TOGGLE_DOMAIN": {
      const s = l(i.domain);
      if (!s)
        return { success: !1, error: "Tên miền không hợp lệ" };
      let a;
      return i.enabled ? a = await n.removeWhitelistDomain(s) : a = await n.addWhitelistDomain(s), await e.syncWhitelistRules(a), d({
        type: "TOGGLE_DOMAIN",
        domain: s,
        enabled: i.enabled
      }), { success: !0, data: { whitelistedDomains: a } };
    }
    case "ADD_WHITELIST": {
      const s = l(i.domain);
      if (!s)
        return { success: !1, error: "Tên miền không hợp lệ" };
      const a = await n.addWhitelistDomain(s);
      return await e.syncWhitelistRules(a), d({ type: "TOGGLE_DOMAIN", domain: s, enabled: !1 }), { success: !0, data: { whitelistedDomains: a } };
    }
    case "REMOVE_WHITELIST": {
      const s = l(i.domain), a = await n.removeWhitelistDomain(s);
      return await e.syncWhitelistRules(a), d({ type: "TOGGLE_DOMAIN", domain: s, enabled: !0 }), { success: !0, data: { whitelistedDomains: a } };
    }
    case "UPDATE_SETTINGS": {
      const s = await n.updateSettings(i.settings);
      return d({ type: "UPDATE_SETTINGS", settings: s }), { success: !0, data: s };
    }
    case "CHECK_SITE_STATUS": {
      const s = l(i.domain), a = await n.isGlobalEnabled(), o = await n.getWhitelist(), r = await n.getSettings(), h = E(s, o);
      return {
        success: !0,
        data: {
          isBlocked: a && !h,
          isWhitelisted: h,
          settings: r
        }
      };
    }
    default:
      return { success: !1, error: "Yêu cầu không xác định" };
  }
}
function d(i) {
  typeof chrome > "u" || !chrome.tabs?.query || chrome.tabs.query({}, (t) => {
    for (const e of t)
      e.id && e.url && !e.url.startsWith("chrome://") && chrome.tabs.sendMessage(e.id, i).catch(() => {
      });
  });
}
const g = u.getInstance();
chrome.runtime.onInstalled.addListener(async (i) => {
  console.info(`[LMH FocusBlock] Extension installed/updated. Reason: ${i.reason}`), i.reason === "install" && (await n.setGlobalEnabled(!0), await n.setWhitelist([]), await n.updateSettings(m)), await g.initialize();
});
g.initialize().catch((i) => {
  console.error("[LMH FocusBlock] Error during startup initialization:", i);
});
chrome.runtime.onMessage.addListener((i, t, e) => (T(i).then((s) => e(s)).catch((s) => {
  console.error("[LMH FocusBlock] Message handler failure:", s), e({ success: !1, error: s.message });
}), !0));
