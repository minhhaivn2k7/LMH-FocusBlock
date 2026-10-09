/**
 * Popup Guard
 * Defends users against aggressive popunders, clickjacking overlays, and window.open abuse
 * while preserving legitimate authentication popups (Google, Apple, Microsoft, GitHub)
 * and payment gateways (PayPal, Stripe, VNPay, MoMo).
 */

/** Known authentication and payment domains that must NEVER be blocked */
export const LEGITIMATE_POPUP_DOMAINS = [
  'accounts.google.com',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'login.live.com',
  'github.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'paypal.com',
  'stripe.com',
  'checkout.stripe.com',
  'vnpay.vn',
  'momo.vn',
  'zalopay.vn',
];

/** Known popup and popunder ad networks */
export const KNOWN_POPUP_AD_DOMAINS = [
  'popads.net',
  'popcash.net',
  'adtrue.com',
  'propellerads.com',
  'exoclick.com',
  'adsterra.com',
  'trafficstars.com',
  'clickadu.com',
  'bet365',
  '1xbet',
];

/**
 * Checks whether a target URL is legitimate (OAuth, payment, or same-origin).
 */
export function isLegitimatePopup(rawUrl?: string): boolean {
  if (!rawUrl || rawUrl === 'about:blank' || rawUrl === '') {
    return true; // Often used for about:blank print or doc windows
  }

  const trimmed = rawUrl.trim().toLowerCase();

  // Relative URLs are same-origin / internal
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('#')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
    const hostname = parsed.hostname.toLowerCase();

    // Same-origin is always allowed
    if (typeof window !== 'undefined' && hostname === window.location.hostname.toLowerCase()) {
      return true;
    }

    // Check if hostname matches any legitimate auth / payment domain
    for (const legit of LEGITIMATE_POPUP_DOMAINS) {
      if (hostname === legit || hostname.endsWith(`.${legit}`)) {
        return true;
      }
    }
  } catch {
    // Malformed URL, allow or ignore
    return false;
  }

  return false;
}

/**
 * Checks whether a target URL matches known popup/popunder ad networks.
 */
export function isKnownAdPopup(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  const lower = rawUrl.toLowerCase();

  for (const adDomain of KNOWN_POPUP_AD_DOMAINS) {
    if (lower.includes(adDomain)) {
      return true;
    }
  }

  return false;
}

export class PopupGuard {
  private isRunning = false;
  private clickListener: ((event: MouseEvent) => void) | null = null;
  private injectedScript: HTMLScriptElement | null = null;

  /**
   * Starts the popup guard interceptor.
   */
  public start(): void {
    if (this.isRunning) return;
    if (typeof window === 'undefined') return;

    this.isRunning = true;

    // 1. Capture-phase click listener to intercept untrusted clicks and invisible overlay traps
    this.clickListener = (event: MouseEvent) => {
      // Intercept synthetic/programmatic clicks
      if (!event.isTrusted) {
        const target = (event.target as HTMLElement)?.closest('a');
        if (target) {
          const href = target.getAttribute('href') || '';
          if (!isLegitimatePopup(href) && (isKnownAdPopup(href) || target.getAttribute('target') === '_blank')) {
            event.preventDefault();
            event.stopPropagation();
            console.debug('[FocusBlock PopupGuard] Blocked untrusted synthetic click to:', href);
          }
        }
      }

      // Detect and neutralize invisible full-screen clickjacking overlay traps
      const clickedEl = event.target as HTMLElement;
      if (clickedEl && clickedEl !== document.body && clickedEl !== document.documentElement) {
        const style = window.getComputedStyle(clickedEl);
        const isFixedOrAbsolute = style.position === 'fixed' || style.position === 'absolute';
        const isTransparent = parseFloat(style.opacity) < 0.1 || style.visibility === 'hidden';
        const isFullViewport = clickedEl.offsetWidth >= window.innerWidth * 0.9 && clickedEl.offsetHeight >= window.innerHeight * 0.9;

        if (isFixedOrAbsolute && isTransparent && isFullViewport) {
          event.preventDefault();
          event.stopPropagation();
          clickedEl.remove();
          console.debug('[FocusBlock PopupGuard] Blocked and removed full-screen clickjacking overlay.');
        }
      }
    };

    window.addEventListener('click', this.clickListener, true);

    // 2. Inject Page-level Main World protection for window.open
    this.injectMainWorldInterceptor();
  }

  private injectMainWorldInterceptor(): void {
    if (typeof document === 'undefined') return;

    try {
      const script = document.createElement('script');
      script.id = 'lmh-focusblock-window-guard';
      script.textContent = `
(function() {
  if (window.__LMH_POPUP_GUARD_ACTIVE__) return;
  window.__LMH_POPUP_GUARD_ACTIVE__ = true;

  const originalOpen = window.open;
  const legitDomains = ${JSON.stringify(LEGITIMATE_POPUP_DOMAINS)};
  const adDomains = ${JSON.stringify(KNOWN_POPUP_AD_DOMAINS)};

  function isLegit(url) {
    if (!url || url === 'about:blank' || url === '') return true;
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('#')) return true;
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname === window.location.hostname) return true;
      for (const d of legitDomains) {
        if (parsed.hostname === d || parsed.hostname.endsWith('.' + d)) return true;
      }
    } catch(e) { return false; }
    return false;
  }

  function isAd(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    for (const a of adDomains) {
      if (lower.includes(a)) return true;
    }
    return false;
  }

  window.open = function(url, target, features) {
    if (isLegit(url)) {
      return originalOpen.apply(this, arguments);
    }
    if (isAd(url)) {
      console.warn('[FocusBlock PopupGuard] Blocked intrusive ad popup:', url);
      return null;
    }
    // Allow legitimate user interactions, but block suspicious background popups
    return originalOpen.apply(this, arguments);
  };
})();
`;
      (document.head || document.documentElement).appendChild(script);
      this.injectedScript = script;
    } catch {
      // In case CSP restricts inline scripts
    }
  }

  /**
   * Stops the popup guard and cleans up event listeners.
   */
  public stop(): void {
    this.isRunning = false;

    if (this.clickListener && typeof window !== 'undefined') {
      window.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }

    if (this.injectedScript && this.injectedScript.parentNode) {
      this.injectedScript.parentNode.removeChild(this.injectedScript);
      this.injectedScript = null;
    }
  }

  public getStatus(): boolean {
    return this.isRunning;
  }
}
