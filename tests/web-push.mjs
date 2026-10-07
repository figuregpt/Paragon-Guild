import assert from 'node:assert/strict';
import { createDecipheriv, diffieHellman, createPrivateKey, createPublicKey, hkdfSync } from 'node:crypto';
import { encryptPush, createVapidAuthorization, sendPush, validatePushEndpoint, validatePushSubscription } from '../lib/web-push.ts';

// Run with Node 24 (native TypeScript stripping), no test dependencies required.
const unbase = (s) => Buffer.from(s, 'base64url');
const base = (s) => Buffer.from(s).toString('base64url');
const encoder = new TextEncoder();
const receiverPublic = unbase('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4');
const senderPublic = unbase('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
const jwk = (pub, priv) => ({ kty:'EC', crv:'P-256', x:base(pub.subarray(1,33)), y:base(pub.subarray(33)), ...(priv ? {d:priv} : {}) });
const receiverPrivate = 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94';
const senderPrivate = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
const subscription = { endpoint:'https://web.push.apple.com/QMockEndpoint', p256dh:base(receiverPublic), auth:'BTBZMqHH6r4Tts7J_aSIgg' };
const keyPair = {
  privateKey: await crypto.subtle.importKey('jwk', jwk(senderPublic, senderPrivate), {name:'ECDH',namedCurve:'P-256'}, true, ['deriveBits']),
  publicKey: await crypto.subtle.importKey('raw', senderPublic, {name:'ECDH',namedCurve:'P-256'}, true, []),
};
const plaintext = encoder.encode('When I grow up, I want to be a watermelon');
const known = 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';
const actual = await encryptPush(subscription, plaintext, {salt:new Uint8Array(unbase('DGv6ra1nlYgDCS1FRnbzlw')),keyPair});
assert.equal(base(actual), known, 'matches the published RFC 8291 test vector byte for byte');

// Independent receiver implementation uses Node crypto and hkdfSync rather than helper internals.
function decrypt(body) {
  body = Buffer.from(body);
  assert.equal(body.readUInt32BE(16),4096);
  assert.equal(body[20],65);
  const sender = body.subarray(21,86);
  const shared = diffieHellman({
    privateKey:createPrivateKey({key:jwk(receiverPublic,receiverPrivate),format:'jwk'}),
    publicKey:createPublicKey({key:jwk(sender),format:'jwk'}),
  });
  const ikm = Buffer.from(hkdfSync('sha256',shared,unbase(subscription.auth),Buffer.concat([Buffer.from('WebPush: info\0'),receiverPublic,sender]),32));
  const cek = Buffer.from(hkdfSync('sha256',ikm,body.subarray(0,16),Buffer.from('Content-Encoding: aes128gcm\0'),16));
  const nonce = Buffer.from(hkdfSync('sha256',ikm,body.subarray(0,16),Buffer.from('Content-Encoding: nonce\0'),12));
  const decipher = createDecipheriv('aes-128-gcm',cek,nonce);
  decipher.setAuthTag(body.subarray(body.length-16));
  const message = Buffer.concat([decipher.update(body.subarray(86,body.length-16)),decipher.final()]);
  assert.equal(message.at(-1),2);
  return message.subarray(0,-1);
}
assert.equal(decrypt(actual).toString(),Buffer.from(plaintext).toString());
const payload = encoder.encode(JSON.stringify({title:'Paragon',body:'Demon Tower starts in 15 minutes. ⚔️',url:'/events'}));
const [one,two] = await Promise.all([encryptPush(subscription,payload),encryptPush(subscription,payload)]);
assert.deepEqual(decrypt(one),Buffer.from(payload));
assert.notDeepEqual(one,two,'fresh salt and sender key pair per message');
const corrupted = one.slice(); corrupted[100] ^= 1;
assert.throws(()=>decrypt(corrupted),'tampering is rejected');
assert.equal((await encryptPush(subscription,new Uint8Array(3993))).length,4096);
await assert.rejects(encryptPush(subscription,new Uint8Array(3994)),/3993/);

const vapid = {publicKey:base(senderPublic),privateKey:senderPrivate,subject:'mailto:guild@example.com'};
const now = 1700000000000;
const authorization = await createVapidAuthorization(subscription.endpoint,vapid,now);
const match = authorization.match(/^vapid t=([^,]+),k=(.+)$/);
assert.ok(match);
assert.equal(match[2],vapid.publicKey);
const [header,claims,signature] = match[1].split('.');
assert.deepEqual(JSON.parse(unbase(header)),{typ:'JWT',alg:'ES256'});
assert.deepEqual(JSON.parse(unbase(claims)),{aud:'https://web.push.apple.com',exp:now/1000+12*3600,sub:vapid.subject});
const publicSigningKey = await crypto.subtle.importKey('raw',senderPublic,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicSigningKey,unbase(signature),encoder.encode(`${header}.${claims}`)),true);
await assert.rejects(createVapidAuthorization(subscription.endpoint,{...vapid,subject:'http://localhost'}),/contact/);
await validatePushSubscription(subscription);
for(const endpoint of ['https://fcm.googleapis.com/fcm/send/token','https://updates.push.services.mozilla.com/wpush/v2/token','https://wns2-bl2p.notify.windows.com/w/?token=x']) validatePushEndpoint(endpoint);
for(const endpoint of ['http://web.push.apple.com/p','https://localhost/p','https://127.0.0.1/p','https://fcm.googleapis.com.attacker.test/p','https://attacker.push.apple.com.evil.test/p','https://user@web.push.apple.com/p','https://web.push.apple.com:8443/p','https://web.push.apple.com/p#token']) {
  assert.throws(()=>validatePushEndpoint(endpoint));
}
await assert.rejects(validatePushSubscription({...subscription,p256dh:base(new Uint8Array(65))}));
await assert.rejects(validatePushSubscription({...subscription,auth:'invalid'}));

const savedFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async (endpoint,options) => {
  requests++;
  assert.equal(endpoint,subscription.endpoint);
  assert.equal(options.redirect,'error');
  assert.equal(options.method,'POST');
  assert.equal(options.headers['Content-Encoding'],'aes128gcm');
  assert.equal(options.headers.TTL,'300');
  assert.deepEqual(JSON.parse(decrypt(options.body)),{title:'Guild event'});
  return new Response(null,{status:410});
};
try {
  assert.equal(await sendPush(subscription,{title:'Guild event'},vapid),410);
  assert.equal(requests,1);
  await assert.rejects(sendPush({...subscription,endpoint:'https://127.0.0.1/p'},{title:'No request'},vapid));
  assert.equal(requests,1,'rejected endpoint never causes a request');
} finally { globalThis.fetch = savedFetch; }
console.log('Web Push: RFC vector, independent decryption, tampering, payload limit, fresh keys, VAPID signature/claims, endpoint validation and delivery contract passed.');
