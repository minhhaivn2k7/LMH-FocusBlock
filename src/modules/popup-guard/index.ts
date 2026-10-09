/**
 * Popup Guard Module
 */

export * from './window-guard';

export interface IPopupGuard {
  start(): void;
  stop(): void;
  getStatus(): boolean;
}
