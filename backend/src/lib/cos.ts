import { createHmac, createHash } from 'crypto';
import { config } from '../config.js';

/**
 * Tencent Cloud COS uploads. Ported from we-assistant/vps/src/cos.ts —
 * raw HMAC-SHA1 signature, no SDK dependency. Returns the public URL after
 * upload; use getSignedUrl() to mint a time-limited read URL for the client.
 */

function cosConfigured(): boolean {
  return !!(
    config.COS_SECRET_ID &&
    config.COS_SECRET_KEY &&
    config.COS_BUCKET &&
    config.COS_REGION
  );
}

export function isCosEnabled(): boolean {
  return cosConfigured();
}

function cosHost(): string {
  if (!cosConfigured()) {
    throw new Error('COS not configured');
  }
  return `${config.COS_BUCKET}.cos.${config.COS_REGION}.myqcloud.com`;
}

function cosBase(): string {
  return `https://${cosHost()}`;
}

function sign(method: string, path: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 600; // 10 min
  const keyTime = `${now};${exp}`;

  const signKey = createHmac('sha1', config.COS_SECRET_KEY!).update(keyTime).digest('hex');
  const httpString = `${method.toLowerCase()}\n${path}\n\n\n`;
  const sha1HttpString = createHash('sha1').update(httpString).digest('hex');
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`;
  const signature = createHmac('sha1', signKey).update(stringToSign).digest('hex');

  return `q-sign-algorithm=sha1&q-ak=${config.COS_SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=&q-url-param-list=&q-signature=${signature}`;
}

export async function uploadToCOS(
  data: Uint8Array,
  key: string,
  contentType = 'application/octet-stream',
): Promise<string> {
  const path = `/${key}`;
  const authorization = sign('PUT', path);
  const host = cosHost();
  const res = await fetch(`https://${host}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      'Content-Length': String(data.byteLength),
      Host: host,
    },
    body: Buffer.from(data),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`COS upload failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return `${cosBase()}${path}`;
}

/**
 * Mint a signed GET URL valid for ~10 minutes. Caller stores the canonical
 * URL (the upload result); resigning on read keeps the link short-lived.
 */
export function getSignedUrl(cosUrl: string): string {
  if (!cosConfigured()) return cosUrl;
  const url = new URL(cosUrl);
  const path = url.pathname;
  const authorization = sign('GET', path);
  return `${cosBase()}${path}?${authorization}`;
}

/**
 * Convenience for PDF imports: pdf/YYYY-MM-DD/{timestamp}_{rand}.pdf
 */
export async function uploadPdfToCOS(data: Uint8Array, originalName: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const id = Math.random().toString(36).slice(2, 8);
  const safeName = originalName.replace(/[^\w.-]+/g, '_').slice(-60);
  const key = `learn-or-die-lite/pdf/${date}/${Date.now()}_${id}_${safeName}`;
  return uploadToCOS(data, key, 'application/pdf');
}
