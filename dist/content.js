(function(){"use strict";const r=[".adsbygoogle","ins.adsbygoogle","[data-ad-client]","[data-ad-slot]",'[id^="google_ads_"]','[id^="div-gpt-ad-"]','iframe[src*="doubleclick.net"]','iframe[src*="adnxs.com"]','iframe[src*="criteo.com"]','iframe[src*="rubiconproject.com"]','iframe[src*="smartadserver.com"]','iframe[src*="popads.net"]','iframe[src*="popcash.net"]','[class*="ad-placeholder"]','[class*="ads-wrapper"]'];class l{styleElement=null;observer=null;isRunning=!1;isThrottled=!1;generateCss(t=r){return`${t.join(`,
`)} {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}`}start(t=r){if(this.isRunning||typeof document>"u")return;this.isRunning=!0;const e=document.createElement("style");e.id="lmh-focusblock-cosmetic",e.textContent=this.generateCss(t);const i=document.head||document.documentElement;i&&(i.appendChild(e),this.styleElement=e),this.setupObserver(t)}setupObserver(t){if(typeof MutationObserver>"u")return;const e=t.join(",");this.observer=new MutationObserver(()=>{this.isThrottled||(this.isThrottled=!0,window.requestAnimationFrame(()=>{if(this.isThrottled=!1,!!this.isRunning)try{document.querySelectorAll(e).forEach(o=>{o instanceof HTMLElement&&o.style.display!=="none"&&(o.style.setProperty("display","none","important"),o.style.setProperty("height","0px","important"),o.style.setProperty("min-height","0px","important"))})}catch{}}))});const i=document.body||document.documentElement;i&&this.observer.observe(i,{childList:!0,subtree:!0})}stop(){this.isRunning=!1,this.isThrottled=!1,this.styleElement&&this.styleElement.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null),this.observer&&(this.observer.disconnect(),this.observer=null)}getStatus(){return this.isRunning}}const c=["accounts.google.com","appleid.apple.com","login.microsoftonline.com","login.live.com","github.com","facebook.com","twitter.com","x.com","paypal.com","stripe.com","checkout.stripe.com","vnpay.vn","momo.vn","zalopay.vn"],u=["popads.net","popcash.net","adtrue.com","propellerads.com","exoclick.com","adsterra.com","trafficstars.com","clickadu.com","bet365","1xbet"];function d(n){if(!n||n==="about:blank"||n==="")return!0;const t=n.trim().toLowerCase();if(t.startsWith("/")||t.startsWith("./")||t.startsWith("#"))return!0;try{const i=new URL(t,typeof window<"u"?window.location.href:"https://example.com").hostname.toLowerCase();if(typeof window<"u"&&i===window.location.hostname.toLowerCase())return!0;for(const s of c)if(i===s||i.endsWith(`.${s}`))return!0}catch{return!1}return!1}function p(n){if(!n)return!1;const t=n.toLowerCase();for(const e of u)if(t.includes(e))return!0;return!1}class h{isRunning=!1;clickListener=null;injectedScript=null;start(){this.isRunning||typeof window>"u"||(this.isRunning=!0,this.clickListener=t=>{if(!t.isTrusted){const i=t.target?.closest("a");if(i){const s=i.getAttribute("href")||"";!d(s)&&(p(s)||i.getAttribute("target")==="_blank")&&(t.preventDefault(),t.stopPropagation(),console.debug("[FocusBlock PopupGuard] Blocked untrusted synthetic click to:",s))}}const e=t.target;if(e&&e!==document.body&&e!==document.documentElement){const i=window.getComputedStyle(e),s=i.position==="fixed"||i.position==="absolute",o=parseFloat(i.opacity)<.1||i.visibility==="hidden",g=e.offsetWidth>=window.innerWidth*.9&&e.offsetHeight>=window.innerHeight*.9;s&&o&&g&&(t.preventDefault(),t.stopPropagation(),e.remove(),console.debug("[FocusBlock PopupGuard] Blocked and removed full-screen clickjacking overlay."))}},window.addEventListener("click",this.clickListener,!0),this.injectMainWorldInterceptor())}injectMainWorldInterceptor(){if(!(typeof document>"u"))try{const t=document.createElement("script");t.id="lmh-focusblock-window-guard",t.textContent=`
(function() {
  if (window.__LMH_POPUP_GUARD_ACTIVE__) return;
  window.__LMH_POPUP_GUARD_ACTIVE__ = true;

  const originalOpen = window.open;
  const legitDomains = ${JSON.stringify(c)};
  const adDomains = ${JSON.stringify(u)};

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
`,(document.head||document.documentElement).appendChild(t),this.injectedScript=t}catch{}}stop(){this.isRunning=!1,this.clickListener&&typeof window<"u"&&(window.removeEventListener("click",this.clickListener,!0),this.clickListener=null),this.injectedScript&&this.injectedScript.parentNode&&(this.injectedScript.parentNode.removeChild(this.injectedScript),this.injectedScript=null)}getStatus(){return this.isRunning}}class f{name="YouTubeModule";isReady=!1;initialize(){this.isReady=!0,console.debug("[FocusBlock YouTubeModule] Initialized placeholder foundation.")}destroy(){this.isReady=!1}}function m(n){if(!n||typeof n!="string")return null;const t=n.trim();if(t.startsWith("chrome://")||t.startsWith("chrome-extension://")||t.startsWith("edge://")||t.startsWith("about:")||t.startsWith("devtools://")||t.startsWith("view-source:"))return null;try{const e=new URL(t);return["http:","https:"].includes(e.protocol)?a(e.hostname):null}catch{try{const e=new URL(`https://${t}`);return a(e.hostname)}catch{return null}}}function a(n){if(!n)return"";let t=n.trim().toLowerCase();if(t.includes("://"))try{t=new URL(t).hostname}catch{}const e=t.indexOf("/");e!==-1&&(t=t.substring(0,e));const i=t.indexOf(":");return i!==-1&&(t=t.substring(0,i)),t.endsWith(".")&&(t=t.slice(0,-1)),t.startsWith("www.")&&(t=t.substring(4)),t}class y{cosmeticFilter=new l;popupGuard=new h;youtubeModule=new f;currentDomain=null;isProtectionActive=!1;async init(){typeof window>"u"||(this.currentDomain=m(window.location.href),this.currentDomain&&(this.setupMessageListener(),await this.evaluateProtectionStatus()))}setupMessageListener(){typeof chrome>"u"||!chrome.runtime?.onMessage||chrome.runtime.onMessage.addListener((t,e,i)=>t.type==="TOGGLE_GLOBAL"||t.type==="TOGGLE_DOMAIN"||t.type==="UPDATE_SETTINGS"?(this.evaluateProtectionStatus().then(()=>{i({success:!0,isProtectionActive:this.isProtectionActive})}),!0):!1)}async evaluateProtectionStatus(){if(!(!this.currentDomain||typeof chrome>"u"||!chrome.runtime?.sendMessage))try{const t={type:"CHECK_SITE_STATUS",domain:this.currentDomain},e=await chrome.runtime.sendMessage(t);if(e&&e.success){const{isBlocked:i,settings:s}=e.data;i?this.applyProtection(s):this.removeProtection()}}catch{}}applyProtection(t){this.isProtectionActive=!0,t.blockCosmetic?this.cosmeticFilter.start():this.cosmeticFilter.stop(),t.blockPopups?this.popupGuard.start():this.popupGuard.stop(),this.currentDomain?.includes("youtube.com")&&this.youtubeModule.initialize()}removeProtection(){this.isProtectionActive=!1,this.cosmeticFilter.stop(),this.popupGuard.stop(),this.youtubeModule.isReady&&this.youtubeModule.destroy()}}new y().init()})();
