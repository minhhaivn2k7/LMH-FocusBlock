/**
 * LMH FocusBlock - Main World Popup Guard (Manifest V3)
 * Runs directly in the web page's execution environment at document_start.
 * Intercepts window.open abuse while preserving all legitimate authentication
 * (Google, Apple, Microsoft, GitHub) and payment gateways (PayPal, Stripe, MoMo, VNPay).
 */

import { isLegitimatePopup, isKnownAdPopup } from './window-guard';

(function () {
  if (typeof window === 'undefined') return;

  const originalOpen = window.open;

  window.open = function (url?: string | URL, _target?: string, _features?: string): WindowProxy | null {
    const urlStr = url ? url.toString() : '';

    // 1. Preserved: Google login, OAuth, payment gateways, and same-origin windows
    if (isLegitimatePopup(urlStr)) {
      return originalOpen.apply(this, arguments as unknown as [string, string, string]);
    }

    // 2. Blocked: Known popup/popunder ad networks
    if (isKnownAdPopup(urlStr)) {
      console.warn('[FocusBlock PopupGuard] Blocked intrusive ad popup:', urlStr);
      return null;
    }

    // 3. Permitted default user interactions
    return originalOpen.apply(this, arguments as unknown as [string, string, string]);
  };
})();
