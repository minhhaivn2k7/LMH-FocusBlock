/**
 * Content Blocker Module
 */

export * from './cosmetic-filter';

export interface IContentBlocker {
  start(): void;
  stop(): void;
  getStatus(): boolean;
}
