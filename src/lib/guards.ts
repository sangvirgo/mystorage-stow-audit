import type { Page } from 'playwright';

const MAX_5XX = 2;
const AUTH_PATH = /(^|\/)(login|log-in|signin|sign-in|auth|sso)(\/|$)/i;
const CAPTCHA_FRAME = /recaptcha|hcaptcha|turnstile|challenges\.cloudflare/i;
const CAPTCHA_TEXT = /verify you are (a )?human|are you a robot|captcha/i;

export interface NetworkEvent {
  time: string;
  method: string;
  host: string;
  path: string; // no query string
  status: number;
}

/** Thrown when a stop condition is hit. The run must end; never retry. */
export class StopRun extends Error {}

/**
 * Watches responses and page state. Records only status >= 400 and only
 * method, host, path and status. No headers, cookies, tokens or bodies.
 */
export class Guard {
  events: NetworkEvent[] = [];
  private serverErrors = 0;
  private tripped: string | null = null;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    page.on('response', (response) => {
      const status = response.status();
      if (status < 400) return;
      const url = new URL(response.url());
      this.events.push({
        time: new Date().toISOString(),
        method: response.request().method(),
        host: url.host,
        path: url.pathname,
        status,
      });
      const ownOrigin = url.hostname.endsWith('mystorage.vn');
      if (status === 429) this.tripped = `HTTP 429 from ${url.host}${url.pathname}`;
      else if (ownOrigin && (status === 401 || status === 403)) {
        this.tripped = `Unexpected auth response ${status} from ${url.host}${url.pathname}`;
      } else if (ownOrigin && status >= 500 && ++this.serverErrors >= MAX_5XX) {
        this.tripped = `${this.serverErrors} server errors (latest ${status} ${url.pathname})`;
      }
    });
  }

  /** Throws StopRun if any stop condition holds. Call often. */
  async check(): Promise<void> {
    if (this.tripped) throw new StopRun(this.tripped);
    const path = new URL(this.page.url()).pathname;
    if (AUTH_PATH.test(path)) throw new StopRun(`Redirected to an auth page: ${path}`);
    if (this.page.frames().some((f) => CAPTCHA_FRAME.test(f.url()))) {
      throw new StopRun('CAPTCHA / challenge frame detected');
    }
    const body = await this.page.locator('body').innerText({ timeout: 2_000 }).catch(() => '');
    if (CAPTCHA_TEXT.test(body)) throw new StopRun('CAPTCHA text detected on page');
  }

  drain(): NetworkEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
