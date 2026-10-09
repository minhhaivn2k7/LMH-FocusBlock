import { describe, it, expect } from 'vitest';
import { CosmeticFilter, DEFAULT_AD_SELECTORS } from '../src/modules/content-blocker/cosmetic-filter';
import {
  PopupGuard,
  isLegitimatePopup,
  isKnownAdPopup,
  LEGITIMATE_POPUP_DOMAINS,
} from '../src/modules/popup-guard/window-guard';
import { YouTubeModule } from '../src/modules/youtube';

describe('Content Blocker & Modules', () => {
  describe('CosmeticFilter', () => {
    it('generates valid CSS with !important rules', () => {
      const filter = new CosmeticFilter();
      const css = filter.generateCss(['.test-ad', '#ad-banner']);

      expect(css).toContain('.test-ad');
      expect(css).toContain('#ad-banner');
      expect(css).toContain('display: none !important');
      expect(css).toContain('visibility: hidden !important');
    });

    it('contains essential ad networks in default selectors', () => {
      expect(DEFAULT_AD_SELECTORS).toContain('.adsbygoogle');
      expect(DEFAULT_AD_SELECTORS).toContain('[data-ad-client]');
    });

    it('manages filter lifecycle status', () => {
      const filter = new CosmeticFilter();
      expect(filter.getStatus()).toBe(false);
      filter.stop();
      expect(filter.getStatus()).toBe(false);
    });
  });

  describe('PopupGuard & Auth/Payment Preservation', () => {
    it('allows legitimate OAuth providers like Google and Apple', () => {
      expect(isLegitimatePopup('https://accounts.google.com/o/oauth2/v2/auth?scope=email')).toBe(true);
      expect(isLegitimatePopup('https://appleid.apple.com/auth/authorize')).toBe(true);
      expect(isLegitimatePopup('https://github.com/login/oauth/authorize')).toBe(true);
      expect(isLegitimatePopup('https://login.microsoftonline.com/common/oauth2')).toBe(true);
    });

    it('allows legitimate payment gateways like PayPal, Stripe, and MoMo', () => {
      expect(isLegitimatePopup('https://www.paypal.com/checkoutnow?token=EC-123')).toBe(true);
      expect(isLegitimatePopup('https://checkout.stripe.com/pay/cs_test_123')).toBe(true);
      expect(isLegitimatePopup('https://payment.momo.vn/v2/gateway/api/create')).toBe(true);
      expect(isLegitimatePopup('https://sandbox.vnpay.vn/paymentv2/vpcpay.html')).toBe(true);
    });

    it('allows relative URLs and internal paths', () => {
      expect(isLegitimatePopup('/checkout/summary')).toBe(true);
      expect(isLegitimatePopup('./preview.pdf')).toBe(true);
      expect(isLegitimatePopup('')).toBe(true);
      expect(isLegitimatePopup('about:blank')).toBe(true);
    });

    it('identifies known abusive ad popunder domains', () => {
      expect(isKnownAdPopup('https://popads.net/serve/popunder.php')).toBe(true);
      expect(isKnownAdPopup('https://cdn.popcash.net/show.js')).toBe(true);
      expect(isKnownAdPopup('https://adtrue.com/click/track')).toBe(true);
      expect(isKnownAdPopup('https://accounts.google.com')).toBe(false);
    });

    it('maintains list of essential OAuth/Payment providers', () => {
      expect(LEGITIMATE_POPUP_DOMAINS).toContain('accounts.google.com');
      expect(LEGITIMATE_POPUP_DOMAINS).toContain('paypal.com');
      expect(LEGITIMATE_POPUP_DOMAINS).toContain('stripe.com');
    });

    it('manages guard status safely', () => {
      const guard = new PopupGuard();
      expect(guard.getStatus()).toBe(false);
      guard.stop();
      expect(guard.getStatus()).toBe(false);
    });
  });

  describe('YouTubeModule', () => {
    it('initializes and destroys cleanly', () => {
      const yt = new YouTubeModule();
      expect(yt.isReady).toBe(false);
      yt.initialize();
      expect(yt.isReady).toBe(true);
      yt.destroy();
      expect(yt.isReady).toBe(false);
    });
  });
});
