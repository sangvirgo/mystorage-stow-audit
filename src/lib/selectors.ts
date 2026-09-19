import type { Locator, Page } from 'playwright';

/**
 * Chat selectors for Stow, taken from the recon ARIA snapshot (composer and
 * send button). `assistantMessages` is unset until a real reply has been
 * observed; while unset, `npm run audit` only allows a one-case discovery run.
 */
export interface ChatSelectors {
  composer: (page: Page) => Locator;
  sendButton: (page: Page) => Locator;
  /** Every assistant message bubble, in order. Unset until observed. */
  assistantMessages?: (page: Page) => Locator;
  /** Visible while the assistant is still replying ("Dừng" / stop). */
  busyIndicator: (page: Page) => Locator;
}

export const selectors: ChatSelectors = {
  composer: (page) => page.getByRole('textbox', { name: 'Hỏi về kho, kích thước, hoặc giá thuê…' }),
  sendButton: (page) => page.getByRole('button', { name: 'Gửi', exact: true }),
  // From the outer HTML of a real reply: the reply body is <div class="prose prose-sm …">
  // inside the bubble. User messages are a plain <div class="whitespace-pre-wrap …"> with
  // no "prose" class. These are Tailwind classes, not roles: the app exposes no ARIA
  // structure for messages, so a redesign could break this.
  assistantMessages: (page) => page.locator('div.prose'),
  // Observed in the T01 pilot: while a reply is in progress the send button is
  // replaced by a "Dừng" (stop) button and the page shows "STOW is thinking…".
  busyIndicator: (page) => page.getByRole('button', { name: 'Dừng', exact: true }),
};
