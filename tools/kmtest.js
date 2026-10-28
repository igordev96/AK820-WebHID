const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const a = html.indexOf('const FACTORY_KEYS = [');
const b = html.indexOf('];', a) + 2;
const factory = html.slice(a, b);
const e0 = html.indexOf('const SLOT_MAGIC_AT');
const d = html.indexOf('/* ---------- key editor');
const logic = html.slice(e0, d);
const src = factory + '\n' + logic + '\nmodule.exports = { FACTORY_KEYS, parseMapText, buildTable, encodeRecord };\n';
const mod = { exports: {} };
new Function('module', 'exports', src)(mod, mod.exports);
const { FACTORY_KEYS, buildTable, parseMapText } = mod.exports;
const hexAt = (buf, off, n) => Array.from(buf.slice(off, off + n)).map(x => x.toString(16).padStart(2, '0')).join(' ');

console.log('factory keys:', FACTORY_KEYS.length);
const full = buildTable(FACTORY_KEYS.map(([idx, usage]) => ({ idx, usage })));
console.log('table size:', full.length);
console.log('slot 0 (offset 0):', hexAt(full, 0, 4), '<- must be 00 00 00 00');
console.log('Esc idx1  @4  :', hexAt(full, 4, 4), '<- 02 00 29 00');
console.log('A   idx56 @224:', hexAt(full, 56 * 4, 4), '<- 02 00 04 00');
console.log('Caps idx55@220:', hexAt(full, 55 * 4, 4), '<- 02 00 39 00');
console.log('LSh idx73 @292:', hexAt(full, 73 * 4, 4), '<- 02 02 00 00');
console.log('LCt idx91 @364:', hexAt(full, 91 * 4, 4), '<- 02 01 00 00');
console.log('PgDn idx121@484:', hexAt(full, 121 * 4, 4), '<- 02 00 4E 00');
console.log('tail 16:', hexAt(full, 560, 16));
console.log('slot143 bytes:', hexAt(full, 572, 4), '<- 00 00 AA 55');
const nonzero = Array.from(full).filter(x => x !== 0).length;
console.log('non-zero bytes:', nonzero, 'of', full.length);
const shifted = buildTable([{ idx: 55, usage: 0x1b }]);
console.log('remap test Caps@220:', hexAt(shifted, 220, 4), '<- 02 00 1B 00');
const bad = buildTable(FACTORY_KEYS.map(([idx, usage]) => ({ idx, usage })), true);
console.log('corrupt trailer:', hexAt(bad, 572, 4));
const txt = FACTORY_KEYS.map(([i, u]) => `${i} 0x${u.toString(16)}`).join('\n');
console.log('parse roundtrip:', parseMapText(txt).length);
console.log('idx0 accepted?', parseMapText('0 0x29 x').length, ' idx143 rejected?', parseMapText('143 0x29 x').length === 0);


// ---- Fn layer: a zero slot means "no override", not a record ----
const { FN_LOCKED } = mod.exports || {};
const fnEmpty = buildTable(FACTORY_KEYS.map(([idx]) => ({ idx, usage: 0 })), false, true);
const fnNonZero = Array.from(fnEmpty.slice(0, 574)).filter(x => x !== 0).length;
console.log('fn all-default: non-zero payload bytes =', fnNonZero, '<- 0');
console.log('fn all-default trailer:', hexAt(fnEmpty, 572, 4), '<- 00 00 AA 55');
const fnOne = buildTable([
  { idx: 55, usage: 0x1B },   // ordinary key -> override
  { idx: 1,  usage: 0x04 },   // fnlayer_disable -> must be ignored
  { idx: 56, usage: 0x00 },   // default -> slot stays zero
], false, true);
console.log('fn CapsLock @220:', hexAt(fnOne, 220, 4), '<- 02 00 1B 00');
console.log('fn Esc (locked) @4:', hexAt(fnOne, 4, 4), '<- 00 00 00 00');
console.log('fn A (default) @224:', hexAt(fnOne, 224, 4), '<- 00 00 00 00');
console.log('fn trailer:', hexAt(fnOne, 572, 4), '<- 00 00 AA 55');
console.log('fn slots written:', Array.from(fnOne.slice(0, 574)).filter(x => x !== 0).length, '<- 2 non-zero bytes in one 4-byte record');

// ---- media / consumer records (type 03) ----
const mediaAt = (usage, fn = false) => buildTable([{ idx: 55, usage, media: true }], false, fn);
console.log('media Mute    @220:', hexAt(mediaAt(0xE2), 220, 4), '<- 03 E2 00 00');
console.log('media VolUp   @220:', hexAt(mediaAt(0xE9), 220, 4), '<- 03 E9 00 00');
console.log('media Play    @220:', hexAt(mediaAt(0xCD), 220, 4), '<- 03 CD 00 00');
console.log('media 16-bit  @220:', hexAt(mediaAt(0x0224), 220, 4), '<- 03 24 02 00');
console.log('fn media Next @220:', hexAt(mediaAt(0xB5, true), 220, 4), '<- 03 B5 00 00');
console.log('fn media Mute @220:', hexAt(mediaAt(0xE2, true), 220, 4), '<- 03 E2 00 00');
const alt = buildTable([{ idx: 55, usage: 0xE2 }]);
console.log('kbd LeftAlt   @220:', hexAt(alt, 220, 4), '<- 02 04 00 00');

const pMedia = parseMapText('55 c:0xE2 Mute')[0];
const pAlt = parseMapText('55 0xE2 Alt')[0];
const p16 = parseMapText('55 c:0x0224 Back')[0];
const pPlay = parseMapText('55 c:0xCD Play')[0];
const pBare = parseMapText('55 0xCD Play')[0];
console.log('parse c:0xE2  ->', pMedia.media, pMedia.usage, '<- true 226');
console.log('parse 0xE2    ->', pAlt.media, pAlt.usage, '<- false 226');
console.log('parse c:0x0224->', p16.media, p16.usage, '<- true 548');
console.log('parse c:0xCD  ->', pPlay.media, pPlay.usage, '<- true 205');
console.log('parse 0xCD    ->', pBare.media, pBare.usage, '<- false 205 (needs c:)');
