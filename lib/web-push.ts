/** RFC 8291 encryption and RFC 8292 VAPID, implemented with Worker WebCrypto. */
export type PushSubscriptionData = { endpoint: string; p256dh: string; auth: string };
export type VapidConfig = { publicKey: string; privateKey: string; subject: string };

const text = new TextEncoder();
const MAX_PAYLOAD_BYTES = 3993; // 4096 minus the 86-byte header, delimiter and GCM tag.

function bytes(value: string, size: number): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) throw new Error("Invalid push key encoding.");
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  if (raw.length !== size) throw new Error("Invalid push key length.");
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function base64url(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...values: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(values.reduce((sum, value) => sum + value.length, 0));
  let offset = 0;
  for (const value of values) { result.set(value, offset); offset += value.length; }
  return result;
}

async function hmac(key: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
}

/** Restrict user-supplied subscription URLs to browser push services. */
export function validatePushEndpoint(endpoint: string): URL {
  if (typeof endpoint !== "string" || endpoint.length > 4096) throw new Error("Invalid push endpoint.");
  const url = new URL(endpoint);
  const hostname = url.hostname.toLowerCase();
  const knownProvider = hostname === "fcm.googleapis.com"
    || hostname === "updates.push.services.mozilla.com"
    || /^[a-z0-9-]+\.push\.apple\.com$/.test(hostname)
    || /^[a-z0-9-]+\.notify\.windows\.com$/.test(hostname);
  if (url.protocol !== "https:" || !knownProvider || url.username || url.password || url.hash
    || (url.port && url.port !== "443")) throw new Error("Unsupported push endpoint.");
  return url;
}

export async function validatePushSubscription(subscription: PushSubscriptionData): Promise<void> {
  validatePushEndpoint(subscription.endpoint);
  const publicKey = bytes(subscription.p256dh, 65);
  if (publicKey[0] !== 4) throw new Error("Invalid push public key.");
  bytes(subscription.auth, 16);
  // importKey verifies that the received uncompressed point is on P-256.
  await crypto.subtle.importKey("raw", publicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
}

/** Produce one aes128gcm record. Test materials permit verification against RFC vectors. */
export async function encryptPush(
  subscription: PushSubscriptionData,
  plaintext: Uint8Array,
  materials?: { salt: Uint8Array<ArrayBuffer>; keyPair: CryptoKeyPair },
): Promise<Uint8Array<ArrayBuffer>> {
  validatePushEndpoint(subscription.endpoint);
  if (plaintext.length > MAX_PAYLOAD_BYTES) throw new Error("Push payload exceeds 3993 bytes.");
  const receiverPublic = bytes(subscription.p256dh, 65);
  if (receiverPublic[0] !== 4) throw new Error("Invalid push public key.");
  const auth = bytes(subscription.auth, 16);
  const receiverKey = await crypto.subtle.importKey("raw", receiverPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sender = materials?.keyPair ?? await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey("raw", sender.publicKey));
  const salt = materials?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  if (salt.length !== 16 || senderPublic.length !== 65) throw new Error("Invalid push encryption materials.");
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: receiverKey }, sender.privateKey, 256));
  const authPrk = await hmac(auth, shared);
  const ikm = await hmac(authPrk, concat(text.encode("WebPush: info\0"), receiverPublic, senderPublic, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(text.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(text.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, key, concat(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = senderPublic.length;
  return concat(header, senderPublic, encrypted);
}

export async function createVapidAuthorization(endpoint: string, config: VapidConfig, now = Date.now()): Promise<string> {
  const url = validatePushEndpoint(endpoint);
  const publicKey = bytes(config.publicKey, 65);
  const privateKey = bytes(config.privateKey, 32);
  if (publicKey[0] !== 4) throw new Error("Invalid VAPID public key.");
  let subject: URL;
  try { subject = new URL(config.subject); } catch { throw new Error("VAPID contact must be an HTTPS URL or mailto address."); }
  if ((subject.protocol !== "https:" && subject.protocol !== "mailto:") || /\s/.test(config.subject)) {
    throw new Error("VAPID contact must be an HTTPS URL or mailto address.");
  }
  const header = base64url(text.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = base64url(text.encode(JSON.stringify({ aud: url.origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: config.subject })));
  const signingKey = await crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256", x: base64url(publicKey.slice(1, 33)), y: base64url(publicKey.slice(33)),
    d: base64url(privateKey), ext: true, key_ops: ["sign"],
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, concat(text.encode(`${header}.${claims}`))));
  if (signature.length !== 64) throw new Error("Unsupported ECDSA signature encoding.");
  return `vapid t=${header}.${claims}.${base64url(signature)},k=${base64url(publicKey)}`;
}

/** Return service status; callers can remove 404/410 subscriptions and retry 429/5xx. */
export async function sendPush(subscription: PushSubscriptionData, payload: unknown, config: VapidConfig): Promise<number> {
  const serialized = JSON.stringify(payload);
  if (serialized === undefined) throw new Error("Push payload must be JSON serializable.");
  const body = await encryptPush(subscription, text.encode(serialized));
  const authorization = await createVapidAuthorization(subscription.endpoint, config);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST", redirect: "error", signal: abort.signal,
      headers: { Authorization: authorization, "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "300", Urgency: "normal" },
      body,
    });
    await response.body?.cancel();
    return response.status;
  } finally { clearTimeout(timer); }
}
