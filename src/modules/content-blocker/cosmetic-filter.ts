/**
 * Content Blocker - Cosmetic Filter
 * Hides visual ad elements, sponsored placeholders, and empty ad boxes in the DOM.
 * Optimized for minimal CPU overhead using native CSS injection and throttled observer.
 */

export const DEFAULT_AD_SELECTORS = [
  '.adsbygoogle',
  'ins.adsbygoogle',
  '[data-ad-client]',
  '[data-ad-slot]',
  '[id^="google_ads_"]',
  '[id^="div-gpt-ad-"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="adnxs.com"]',
  'iframe[src*="criteo.com"]',
  'iframe[src*="rubiconproject.com"]',
  'iframe[src*="smartadserver.com"]',
  'iframe[src*="popads.net"]',
  'iframe[src*="popcash.net"]',
  '[class*="ad-placeholder"]',
  '[class*="ads-wrapper"]',
];

export class CosmeticFilter {
  private styleElement: HTMLStyleElement | null = null;
  private observer: MutationObserver | null = null;
  private isRunning = false;
  private isThrottled = false;

  /**
   * Generates the CSS rule string to hide ad selectors cleanly.
   */
  public generateCss(selectors: string[] = DEFAULT_AD_SELECTORS): string {
    return `${selectors.join(',\n')} {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}`;
  }

  /**
   * Injects cosmetic hiding styles into the document.
   */
  public start(selectors: string[] = DEFAULT_AD_SELECTORS): void {
    if (this.isRunning) return;
    if (typeof document === 'undefined') return;

    this.isRunning = true;

    // 1. Inject Style tag early into head or documentElement for zero-delay CSS matching
    const style = document.createElement('style');
    style.id = 'lmh-focusblock-cosmetic';
    style.textContent = this.generateCss(selectors);

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
      this.styleElement = style;
    }

    // 2. Setup Throttled MutationObserver to collapse dynamic containers safely
    this.setupObserver(selectors);
  }

  private setupObserver(selectors: string[]): void {
    if (typeof MutationObserver === 'undefined') return;

    const selectorQuery = selectors.join(',');

    this.observer = new MutationObserver(() => {
      // Throttle DOM queries to run at most once per animation frame
      if (this.isThrottled) return;
      this.isThrottled = true;

      window.requestAnimationFrame(() => {
        this.isThrottled = false;
        if (!this.isRunning) return;

        try {
          const matches = document.querySelectorAll(selectorQuery);
          matches.forEach((el) => {
            if (el instanceof HTMLElement && el.style.display !== 'none') {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('height', '0px', 'important');
              el.style.setProperty('min-height', '0px', 'important');
            }
          });
        } catch {
          // Suppress any selector query errors
        }
      });
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      this.observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Stops cosmetic filtering and cleanly removes injected styles and observers.
   */
  public stop(): void {
    this.isRunning = false;
    this.isThrottled = false;

    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  public getStatus(): boolean {
    return this.isRunning;
  }
}
