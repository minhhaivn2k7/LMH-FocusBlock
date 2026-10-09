/**
 * LMH FocusBlock - Comprehensive Real Chromium E2E Verification Suite
 * Executes inside genuine Chromium engine (Edge/Chromium 130+) with unpacked extension loaded via CDP.
 */

import { spawn } from 'child_process';
import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';
import http from 'http';

// Select genuine Chromium engine that permits CLI unpacked extension loading
const CHROMIUM_BIN = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EXTENSION_DIST = path.resolve('dist');
const TEST_PROFILE = path.resolve('tmp-chromium-e2e-profile');

if (fs.existsSync(TEST_PROFILE)) {
  try { fs.rmSync(TEST_PROFILE, { recursive: true, force: true }); } catch {}
}

async function runChromiumE2ETests() {
  console.log('================================================================');
  console.log('  LMH FocusBlock - Real Chromium E2E Verification Suite        ');
  console.log('================================================================\n');

  // 1. Setup local mock test server for web page tests
  const server = http.createServer((req, res) => {
    if (req.url === '/test-study-page.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trang Học Tập Mẫu</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .study-box { border: 1px solid #ccc; padding: 16px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <header><h1>Trường Đại Học Khoa Học Tự Nhiên - Khóa Học Trực Tuyến</h1></header>
  <main>
    <article id="main-content" class="study-box">
      <h2>Bài 1: Giới hạn và Hàm số</h2>
      <p id="lesson-text">Nội dung bài học cốt lõi không được phép bị ẩn hoặc làm hỏng bố cục.</p>
    </article>
    <!-- Ad elements that MUST be hidden by Cosmetic Filter -->
    <div id="ad-unit-1" class="adsbygoogle" style="height: 90px; width: 728px;">Banner AdSense Giả Lập</div>
    <div id="ad-unit-2" class="ad-placeholder" style="height: 250px;">Khung Chứa Banner Tài Trợ</div>
    <ins id="ad-unit-3" class="adsbygoogle" style="display:block">Google AdSense Unit</ins>
  </main>
</body>
</html>`);
      return;
    }

    if (req.url === '/test-auth-page.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Trang Đăng Nhập & Kiểm Thử Popup</title></head>
<body>
  <h1>Đăng Nhập Khóa Học</h1>
  <button id="google-login-btn">Đăng nhập bằng Google</button>
  <button id="ad-popup-btn">Mở Popup Quảng Cáo</button>
  <script>
    document.getElementById('google-login-btn').addEventListener('click', () => {
      window.__last_opened = window.open('https://accounts.google.com/o/oauth2/v2/auth', 'google_login', 'width=500,height=600');
    });
    document.getElementById('ad-popup-btn').addEventListener('click', () => {
      window.__last_opened = window.open('https://popads.net/serve/popunder.php', '_blank');
    });
  </script>
</body>
</html>`);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const PORT = 8899;
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✓ Mock Test Server running on http://127.0.0.1:${PORT}\n`);

  // 2. Spawn Chromium process with remote debugging & extension
  const CDP_PORT = 9666;
  console.log('Spawning Chromium with LMH FocusBlock unpacked extension...');
  const chromeProcess = spawn(CHROMIUM_BIN, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEST_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--load-extension=${EXTENSION_DIST}`,
    `--disable-extensions-except=${EXTENSION_DIST}`,
    '--headless=new',
  ]);

  // Wait 2.5s for browser startup
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const testResults = [];
  function record(title, passed, detail = '') {
    if (passed) {
      console.log(`  [PASS] ${title} ${detail ? '(' + detail + ')' : ''}`);
      testResults.push({ title, pass: true });
    } else {
      console.error(`  [FAIL] ${title} ${detail ? '(' + detail + ')' : ''}`);
      testResults.push({ title, pass: false, error: detail });
    }
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
    console.log('✓ Successfully connected to Chromium via CDP!\n');

    const context = browser.contexts()[0];
    const serviceWorkers = context.serviceWorkers();
    record('Chromium spawned with context', !!context);

    // Identify LMH FocusBlock Service Worker among any browser workers
    const focusBlockSw = serviceWorkers.find((s) => s.url().includes('background.js'));
    record('LMH FocusBlock Service Worker active', !!focusBlockSw);

    if (!focusBlockSw) {
      throw new Error('FocusBlock Service Worker not found in context.');
    }

    const swUrl = focusBlockSw.url();
    const extensionId = new URL(swUrl).hostname;
    console.log(`  -> Extension ID: ${extensionId}\n`);

    // --- 1. Network Blocker & testMatchOutcome Verification ---
    console.log('--- 1. Testing Network Blocker & DNR Rule Matching (testMatchOutcome) ---');
    const dnrResults = await focusBlockSw.evaluate(async () => {
      const out = {};
      if (typeof chrome.declarativeNetRequest.testMatchOutcome === 'function') {
        // Rule 1: doubleclick.net
        const r1 = await chrome.declarativeNetRequest.testMatchOutcome({
          url: 'https://googleads.g.doubleclick.net/pagead/ads?client=ca-pub-123',
          type: 'script',
        });
        out.doubleClick = r1.matchedRules;

        // Rule 2 & 16: googlesyndication.com & adsbygoogle.js
        const r2 = await chrome.declarativeNetRequest.testMatchOutcome({
          url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
          type: 'script',
        });
        out.syndication = r2.matchedRules;

        // Rule 8: popads.net
        const r8 = await chrome.declarativeNetRequest.testMatchOutcome({
          url: 'https://serve.popads.net/serve/popunder.php',
          type: 'script',
        });
        out.popads = r8.matchedRules;

        // Subdomain & trackers: adservice.google.com
        const r3 = await chrome.declarativeNetRequest.testMatchOutcome({
          url: 'https://adservice.google.com/adsid/integrator.js',
          type: 'script',
        });
        out.adservice = r3.matchedRules;

        // Educational resource: Khan Academy - MUST NOT MATCH
        const legit = await chrome.declarativeNetRequest.testMatchOutcome({
          url: 'https://cdn.khanacademy.org/math/calculus.js',
          type: 'script',
        });
        out.khan = legit.matchedRules;

        // Test Whitelist dynamic rule: allowAllRequests & allow
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [200002, 300002],
          addRules: [
            {
              id: 200002,
              priority: 9999,
              action: { type: 'allowAllRequests' },
              condition: { requestDomains: ['hcmus.edu.vn'], resourceTypes: ['main_frame', 'sub_frame'] },
            },
            {
              id: 300002,
              priority: 9999,
              action: { type: 'allow' },
              condition: { initiatorDomains: ['hcmus.edu.vn'] },
            },
          ],
        });

        // Test subresource with initiator
        const whitelistedInitiator = await chrome.declarativeNetRequest.testMatchOutcome({
          url: 'https://googleads.g.doubleclick.net/pagead/ads',
          initiator: 'https://hcmus.edu.vn',
          type: 'script',
        });
        out.whitelisted = whitelistedInitiator.matchedRules;

        // Cleanup dynamic test rule
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [200002, 300002],
        });
      }
      return out;
    });

    record('DNR matched doubleclick.net', dnrResults.doubleClick?.length > 0, `Rule ID: ${dnrResults.doubleClick?.[0]?.ruleId}`);
    record('DNR matched googlesyndication.com', dnrResults.syndication?.length > 0, `Rule ID: ${dnrResults.syndication?.[0]?.ruleId}`);
    record('DNR matched popads.net popup script', dnrResults.popads?.length > 0, `Rule ID: ${dnrResults.popads?.[0]?.ruleId}`);
    record('DNR matched adservice.google.com subdomain', dnrResults.adservice?.length > 0, `Rule ID: ${dnrResults.adservice?.[0]?.ruleId}`);
    record('DNR did NOT block genuine academic resources', (!dnrResults.khan || dnrResults.khan.length === 0));
    record('DNR Whitelist rule successfully overrides ad blocking with allow action', dnrResults.whitelisted?.[0]?.ruleId === 300002);

    // --- 2. Popup UI & Whitelist Management Verification ---
    console.log('\n--- 2. Testing Popup Interface & Whitelist Management ---');
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    const popupTitle = await popupPage.title();
    record('Popup page loads successfully', popupTitle === 'LMH FocusBlock');

    // Brand color check #0033CC
    const titleColor = await popupPage.$eval('.title', (el) => window.getComputedStyle(el).color);
    record('Brand color #0033CC used on title', titleColor === 'rgb(0, 51, 204)');

    // Verify Real Stats displayed
    const statRulesText = await popupPage.$eval('#stat-rules', (el) => el.textContent.trim());
    record('Displays real static rules count (20)', statRulesText === '20');

    // Add Domain to Whitelist
    await popupPage.fill('#domain-input', 'hcmus.edu.vn');
    await popupPage.click('#add-domain-btn');
    await popupPage.waitForTimeout(400);

    const whitelistItems = await popupPage.$$eval('.whitelist-item .whitelist-domain-name', (els) => els.map((e) => e.textContent));
    record('Domain hcmus.edu.vn added to Whitelist', whitelistItems.includes('hcmus.edu.vn'));

    const statWhitelistText = await popupPage.$eval('#stat-whitelist', (el) => el.textContent.trim());
    record('Whitelist counter accurately reflects 1 domain', statWhitelistText === '1');

    // Remove Domain from Whitelist
    await popupPage.click('.btn-remove');
    await popupPage.waitForTimeout(400);
    const countAfterRemove = await popupPage.$$eval('.whitelist-item', (els) => els.length);
    record('Domain removed from Whitelist', countAfterRemove === 0);

    // Global Toggle test
    await popupPage.evaluate(() => document.getElementById('global-toggle').click());
    await popupPage.waitForTimeout(400);
    const statusTextPaused = await popupPage.$eval('#status-text', (el) => el.textContent.trim());
    record('Global toggle disables protection with clear status', statusTextPaused === 'Đã tạm dừng bảo vệ');

    await popupPage.evaluate(() => document.getElementById('global-toggle').click());
    await popupPage.waitForTimeout(400);
    const statusTextActive = await popupPage.$eval('#status-text', (el) => el.textContent.trim());
    record('Global toggle re-enables protection', statusTextActive === 'Đang bảo vệ toàn hệ thống');
    await popupPage.close();

    // --- 3. Cosmetic Filter Verification on Web Page ---
    console.log('\n--- 3. Testing Cosmetic Filter on Web Page ---');
    const studyPage = await context.newPage();
    await studyPage.goto(`http://127.0.0.1:${PORT}/test-study-page.html`);
    await studyPage.waitForLoadState('domcontentloaded');
    await studyPage.waitForTimeout(500);

    const styleInjected = await studyPage.$eval('#lmh-focusblock-cosmetic', (el) => !!el).catch(() => false);
    record('Cosmetic stylesheet injected into webpage', styleInjected);

    const ad1Display = await studyPage.$eval('#ad-unit-1', (el) => window.getComputedStyle(el).display);
    const ad2Display = await studyPage.$eval('#ad-unit-2', (el) => window.getComputedStyle(el).display);
    record('AdSense banner #ad-unit-1 is hidden (display: none)', ad1Display === 'none');
    record('Ad placeholder #ad-unit-2 is hidden (display: none)', ad2Display === 'none');

    const lessonDisplay = await studyPage.$eval('#lesson-text', (el) => window.getComputedStyle(el).display);
    const lessonText = await studyPage.$eval('#lesson-text', (el) => el.textContent);
    record('Genuine study article content is completely untouched', lessonDisplay === 'block' && lessonText.includes('cốt lõi'));
    await studyPage.close();

    // --- 4. Popup Guard & Auth Preservation Verification ---
    console.log('\n--- 4. Testing Popup Guard & Preserving Auth/Payments ---');
    const authPage = await context.newPage();
    await authPage.goto(`http://127.0.0.1:${PORT}/test-auth-page.html`);
    await authPage.waitForLoadState('domcontentloaded');

    const googleLoginAllowed = await authPage.evaluate(() => {
      const legitUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const result = window.open(legitUrl, 'test_oauth', 'width=500,height=600');
      return !!result;
    });
    record('Legitimate Google Login popup is PRESERVED and allowed', googleLoginAllowed);

    const adPopupBlocked = await authPage.evaluate(() => {
      const adUrl = 'https://popads.net/serve/popunder.php';
      const result = window.open(adUrl, '_blank');
      return result === null;
    });
    record('Known intrusive ad popup (popads.net) is BLOCKED', adPopupBlocked);
    await authPage.close();

  } catch (err) {
    console.error('Test Execution Error:', err);
    testResults.push({ title: 'Test execution failed', pass: false, error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
    try { chromeProcess.kill(); } catch {}
    try { server.close(); } catch {}
  }

  // --- Summary ---
  console.log('\n================================================================');
  const failed = testResults.filter((t) => !t.pass);
  if (failed.length === 0) {
    console.log(`  ALL ${testResults.length} REAL CHROMIUM E2E VERIFICATION TESTS PASSED! 🎉`);
    console.log('================================================================\n');
  } else {
    console.error(`  ${failed.length} / ${testResults.length} TESTS FAILED.`);
    console.log('================================================================\n');
    process.exit(1);
  }
}

runChromiumE2ETests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
