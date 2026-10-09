/**
 * LMH FocusBlock - Popup Logic (Pure TypeScript, No UI Framework)
 * Brand Color: #0033CC | White Background
 */

import { extractHostname, normalizeDomain } from '../common/url-utils';
import type {
  ExtensionState,
  MessageResponse,
  ToggleGlobalMessage,
  ToggleDomainMessage,
  AddWhitelistMessage,
  RemoveWhitelistMessage,
  UpdateSettingsMessage,
  GetStateMessage,
} from '../common/types';

class PopupController {
  private currentDomain: string | null = null;
  private state: ExtensionState | null = null;

  // DOM Elements
  private globalToggle!: HTMLInputElement;
  private statusBanner!: HTMLElement;
  private statusText!: HTMLElement;
  private currentDomainEl!: HTMLElement;
  private siteStatusBadge!: HTMLElement;
  private siteToggle!: HTMLInputElement;
  private siteActionRow!: HTMLElement;
  private statRulesEl!: HTMLElement;
  private statWhitelistEl!: HTMLElement;
  private domainInput!: HTMLInputElement;
  private domainForm!: HTMLFormElement;
  private domainErrorEl!: HTMLElement;
  private whitelistItemsEl!: HTMLUListElement;
  private whitelistEmptyEl!: HTMLElement;
  private cosmeticToggle!: HTMLInputElement;
  private popupGuardToggle!: HTMLInputElement;

  public async init(): Promise<void> {
    this.cacheDomElements();
    this.bindEvents();
    await this.loadActiveTabAndState();
  }

  private cacheDomElements(): void {
    this.globalToggle = document.getElementById('global-toggle') as HTMLInputElement;
    this.statusBanner = document.getElementById('status-banner') as HTMLElement;
    this.statusText = document.getElementById('status-text') as HTMLElement;
    this.currentDomainEl = document.getElementById('current-domain') as HTMLElement;
    this.siteStatusBadge = document.getElementById('site-status-badge') as HTMLElement;
    this.siteToggle = document.getElementById('site-toggle') as HTMLInputElement;
    this.siteActionRow = document.querySelector('.site-action-row') as HTMLElement;
    this.statRulesEl = document.getElementById('stat-rules') as HTMLElement;
    this.statWhitelistEl = document.getElementById('stat-whitelist') as HTMLElement;
    this.domainInput = document.getElementById('domain-input') as HTMLInputElement;
    this.domainForm = document.getElementById('add-domain-form') as HTMLFormElement;
    this.domainErrorEl = document.getElementById('domain-input-error') as HTMLElement;
    this.whitelistItemsEl = document.getElementById('whitelist-items') as HTMLUListElement;
    this.whitelistEmptyEl = document.getElementById('whitelist-empty') as HTMLElement;
    this.cosmeticToggle = document.getElementById('cosmetic-toggle') as HTMLInputElement;
    this.popupGuardToggle = document.getElementById('popup-guard-toggle') as HTMLInputElement;
  }

  private bindEvents(): void {
    // Global Toggle
    this.globalToggle.addEventListener('change', async () => {
      const enabled = this.globalToggle.checked;
      await this.sendBackgroundMessage<ToggleGlobalMessage>({
        type: 'TOGGLE_GLOBAL',
        enabled,
      });
      await this.refreshState();
    });

    // Site Toggle
    this.siteToggle.addEventListener('change', async () => {
      if (!this.currentDomain) return;
      const isBlockingActive = this.siteToggle.checked;

      await this.sendBackgroundMessage<ToggleDomainMessage>({
        type: 'TOGGLE_DOMAIN',
        domain: this.currentDomain,
        enabled: isBlockingActive,
      });
      await this.refreshState();
    });

    // Add Domain Form
    this.domainForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleAddDomain();
    });

    // Cosmetic Filter Toggle
    this.cosmeticToggle.addEventListener('change', async () => {
      await this.sendBackgroundMessage<UpdateSettingsMessage>({
        type: 'UPDATE_SETTINGS',
        settings: { blockCosmetic: this.cosmeticToggle.checked },
      });
    });

    // Popup Guard Toggle
    this.popupGuardToggle.addEventListener('change', async () => {
      await this.sendBackgroundMessage<UpdateSettingsMessage>({
        type: 'UPDATE_SETTINGS',
        settings: { blockPopups: this.popupGuardToggle.checked },
      });
    });
  }

  private async loadActiveTabAndState(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.url) {
          this.currentDomain = extractHostname(activeTab.url);
        }
      }
    } catch {
      this.currentDomain = null;
    }

    await this.refreshState();
  }

  private async refreshState(): Promise<void> {
    const response = await this.sendBackgroundMessage<GetStateMessage, ExtensionState>({
      type: 'GET_STATE',
      currentDomain: this.currentDomain || undefined,
    });

    if (response?.success && response.data) {
      this.state = response.data;
      this.render();
    }
  }

  private render(): void {
    if (!this.state) return;

    const { globalEnabled, whitelistedDomains, settings, isCurrentDomainWhitelisted, stats } = this.state;

    // 1. Render Global Switch & Banner
    this.globalToggle.checked = globalEnabled;
    if (globalEnabled) {
      this.statusBanner.className = 'status-banner status-active';
      this.statusText.textContent = 'Đang bảo vệ toàn hệ thống';
    } else {
      this.statusBanner.className = 'status-banner status-paused';
      this.statusText.textContent = 'Đã tạm dừng bảo vệ';
    }

    // 2. Render Current Site
    if (this.currentDomain) {
      this.currentDomainEl.textContent = this.currentDomain;
      this.siteActionRow.style.display = 'flex';

      if (!globalEnabled) {
        this.siteStatusBadge.className = 'badge badge-disabled';
        this.siteStatusBadge.textContent = 'Đang tắt';
        this.siteToggle.disabled = true;
      } else if (isCurrentDomainWhitelisted) {
        this.siteStatusBadge.className = 'badge badge-whitelisted';
        this.siteStatusBadge.textContent = 'Đã cho phép';
        this.siteToggle.checked = false;
        this.siteToggle.disabled = false;
      } else {
        this.siteStatusBadge.className = 'badge badge-active';
        this.siteStatusBadge.textContent = 'Đang chặn';
        this.siteToggle.checked = true;
        this.siteToggle.disabled = false;
      }
    } else {
      this.currentDomainEl.textContent = 'Trang nội bộ / Không hỗ trợ';
      this.siteStatusBadge.className = 'badge badge-disabled';
      this.siteStatusBadge.textContent = 'Không áp dụng';
      this.siteActionRow.style.display = 'none';
    }

    // 3. Render Real Stats (Strictly real data)
    this.statRulesEl.textContent = String(stats.staticRuleCount + stats.dynamicRuleCount);
    this.statWhitelistEl.textContent = String(whitelistedDomains.length);

    // 4. Render Settings
    this.cosmeticToggle.checked = settings.blockCosmetic;
    this.popupGuardToggle.checked = settings.blockPopups;

    // 5. Render Whitelist List
    this.renderWhitelist(whitelistedDomains);
  }

  private renderWhitelist(domains: string[]): void {
    this.whitelistItemsEl.innerHTML = '';

    if (domains.length === 0) {
      this.whitelistEmptyEl.style.display = 'block';
      return;
    }

    this.whitelistEmptyEl.style.display = 'none';

    for (const domain of domains) {
      const li = document.createElement('li');
      li.className = 'whitelist-item';

      const span = document.createElement('span');
      span.className = 'whitelist-domain-name';
      span.textContent = domain;
      span.title = domain;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = 'Xóa';
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', async () => {
        await this.handleRemoveDomain(domain);
      });

      li.appendChild(span);
      li.appendChild(removeBtn);
      this.whitelistItemsEl.appendChild(li);
    }
  }

  private async handleAddDomain(): Promise<void> {
    this.hideError();
    const rawInput = this.domainInput.value.trim();
    const normalized = normalizeDomain(rawInput);

    if (!normalized || !normalized.includes('.')) {
      this.showError('Vui lòng nhập tên miền hợp lệ (vd: edu.vn hoặc example.com)');
      return;
    }

    if (this.state?.whitelistedDomains.includes(normalized)) {
      this.showError('Tên miền này đã có trong danh sách');
      return;
    }

    const response = await this.sendBackgroundMessage<AddWhitelistMessage>({
      type: 'ADD_WHITELIST',
      domain: normalized,
    });

    if (response?.success) {
      this.domainInput.value = '';
      await this.refreshState();
    } else {
      this.showError(response?.error || 'Có lỗi xảy ra khi thêm tên miền');
    }
  }

  private async handleRemoveDomain(domain: string): Promise<void> {
    await this.sendBackgroundMessage<RemoveWhitelistMessage>({
      type: 'REMOVE_WHITELIST',
      domain,
    });
    await this.refreshState();
  }

  private showError(msg: string): void {
    this.domainErrorEl.textContent = msg;
    this.domainErrorEl.classList.remove('hidden');
  }

  private hideError(): void {
    this.domainErrorEl.textContent = '';
    this.domainErrorEl.classList.add('hidden');
  }

  private async sendBackgroundMessage<TReq, TRes = unknown>(
    message: TReq
  ): Promise<MessageResponse<TRes> | null> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return null;
    }
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (err) {
      console.error('[Popup] Message error:', err);
      return null;
    }
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupController();
  popup.init();
});
