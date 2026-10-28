// Fake-DOM harness for the key editor (top + Fn layer), sliced straight out of the driver page.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

const cut = (from, to) => {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a + from.length);
  if (a < 0 || b < 0) throw new Error('marker not found: ' + from + ' / ' + to);
  return html.slice(a, b);
};

const keysSrc = cut('const FACTORY_KEYS = [', '/* ---------- key editor');
const editorSrc = cut('/* ---------- key editor', '// Only one feature-transfer sequence');

const els = {};
function mkEl(id) {
  if (els[id]) return els[id];
  const classes = new Set();
  return els[id] = {
    id, style: {}, children: [], dataset: {}, value: '', disabled: false, options: [], attrs: {},
    _text: '', _html: '',
    classList: {
      toggle: (c, on) => { on ? classes.add(c) : classes.delete(c); },
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      _set: classes,
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    set textContent(v) { this._text = String(v); this.children = []; this.options = []; },
    get textContent() { return this._text; },
    set innerHTML(v) { this._html = String(v); if (v === '') this.options = []; },
    get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); this.options.push(c); return c; },
    querySelector() { return null; }, addEventListener() {},
  };
}
const document = { createElement: () => mkEl('el' + Math.random()), getElementById: mkEl };
const $ = (id) => mkEl(id);
const log = (m, l) => { if (process.env.VERBOSE) console.log('   [' + (l || 'log') + '] ' + m); };
const escapeHtml = (s) => String(s);
const hx = (b) => b.toString(16).toUpperCase().padStart(2, '0');
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const test = `
let kmBusy = false;
kmInit();
console.log('--- initial (top) ---');
console.log('board keys:', $('kmBoard').children.length);
console.log('mirror lines:', $('kmMap').value.split('\\n').length);
console.log('dirty:', JSON.stringify($('kmDirty').textContent));
console.log('upload label:', $('btnKmUpload').textContent);
console.log('restore label:', $('btnKmRestore').textContent);
console.log('layer note:', $('kmLayerNote').textContent);
const optsTop = usageOptionsHtml();
console.log('top option count:', (optsTop.match(/<option/g) || []).length, 'default option:', optsTop.includes('Firmware default'));
console.log('media options:', optsTop.includes('Media: Mute'), optsTop.includes('c:0x0224'), optsTop.includes('Media: Volume up'));
for (const probe of ['>CapsLock', 'value="41"', 'Left Shift', 'value="175"', '>A<', 'value="4"', 'PageDown'])
  console.log('  has', JSON.stringify(probe), optsTop.includes(probe));

kmSelect(55);
console.log('--- selected CapsLock ---');
console.log('title:', $('kmSelName').textContent, '| meta:', $('kmSelMeta').textContent);
console.log('raw:', $('kmRaw').value);
kmSetUsage(0x1B);
console.log('dirty after 0x1B:\\n' + $('kmDirty').textContent);
console.log('mirrored line:', JSON.stringify($('kmMap').value.split('\\n').find(l => l.trim().startsWith('55 '))));
console.log('board changed count:', $('kmBoard').children.filter(c => c.className.includes('changed')).length);
kmSetUsage(0x39);
console.log('after reset key dirty:', JSON.stringify($('kmDirty').textContent));
kmSetUsage(0x00);
console.log('top 0x00 refused (still 0x39):', kmState.find(k => k.idx === 55).usage);

console.log('--- media on the top layer ---');
kmSetUsage(0xE2, true);
console.log('media raw:', $('kmRaw').value);
console.log('media meta:', $('kmSelMeta').textContent);
console.log('media mirrored line:', JSON.stringify($('kmMap').value.split('\\n').find(l => l.trim().startsWith('55 '))));
console.log('media dirty:\\n' + $('kmDirty').textContent);
kmSetUsage(0xE2);
console.log('alt raw (no c:, keyboard page):', $('kmRaw').value);
kmSetUsage(0x39);
console.log('media cleared dirty:', JSON.stringify($('kmDirty').textContent));

console.log('--- switch to Fn layer ---');
kmSetLayer(1);
console.log('active layer:', kmLayer);
console.log('board keys:', $('kmBoard').children.length);
console.log('locked keys:', $('kmBoard').children.filter(c => c.disabled).length);
console.log('fn mirror first lines:', JSON.stringify($('kmMap').value.split('\\n').slice(0, 2)));
console.log('dirty:', JSON.stringify($('kmDirty').textContent));
console.log('restore label:', $('btnKmRestore').textContent, '| reset label:', $('btnKmResetKey').textContent);
console.log('layer note:', $('kmLayerNote').textContent);
console.log('btnLayerFn on:', $('btnLayerFn').classList.contains('on'), 'btnLayerTop on:', $('btnLayerTop').classList.contains('on'));
const optsFn = usageOptionsHtml();
console.log('fn option count:', (optsFn.match(/<option/g) || []).length, 'default option:', optsFn.includes('Firmware default'));

kmSelect(55);
console.log('fn sel:', $('kmSelName').textContent, '| meta:', $('kmSelMeta').textContent);
console.log('fn raw:', $('kmRaw').value);
kmSetUsage(0x1B);
console.log('fn dirty:\\n' + $('kmDirty').textContent);
console.log('fn upload label:', $('btnKmUpload').textContent);
console.log('fn mirrored line:', JSON.stringify($('kmMap').value.split('\\n').find(l => l.trim().startsWith('55 '))));
console.log('fn changed count:', $('kmBoard').children.filter(c => c.className.includes('changed')).length);

console.log('--- locked key on the Fn layer (Esc) ---');
kmSelect(1);
console.log('esc meta:', $('kmSelMeta').textContent);
console.log('esc controls disabled:', $('kmUsage').disabled, $('kmRaw').disabled, $('btnKmResetKey').disabled);
kmSetUsage(0x04);
console.log('esc usage after attempt:', kmState.find(k => k.idx === 1).usage);
console.log('dirty still:', JSON.stringify($('kmDirty').textContent));

console.log('--- reset Fn override back to default ---');
kmSelect(55);
kmSetUsage(0);
console.log('fn dirty:', JSON.stringify($('kmDirty').textContent));
console.log('fn mirror line:', JSON.stringify($('kmMap').value.split('\\n').find(l => l.trim().startsWith('55 '))));

console.log('--- kmApplyText on the Fn layer ---');
const lines = $('kmMap').value.split('\\n');
lines[0] = '  1  0x04  Esc';          // locked key, must be ignored
lines[1] = '  2  0x1B  F1';           // real override
$('kmMap').value = lines.join('\\n');
console.log('apply ok:', kmApplyText());
console.log('esc usage (locked):', kmState.find(k => k.idx === 1).usage);
console.log('f1 usage:', kmState.find(k => k.idx === 2).usage);
console.log('dirty:\\n' + $('kmDirty').textContent);

console.log('--- media on the Fn layer ---');
kmSelect(55);
kmSetUsage(0xE2, true);
console.log('fn media meta:', $('kmSelMeta').textContent);
console.log('fn media raw:', $('kmRaw').value);
console.log('fn media mirrored line:', JSON.stringify($('kmMap').value.split('\\n').find(l => l.trim().startsWith('55 '))));
console.log('fn media dirty:\\n' + $('kmDirty').textContent);
kmSetUsage(0);
console.log('fn media cleared dirty:', JSON.stringify($('kmDirty').textContent));

console.log('--- persistence ---');
kmSelect(3);
kmSetUsage(0xE2, true);                          // F2 -> Media: Mute, must survive a reload
for (const k of kmState) { k.applied = k.usage; k.appliedMedia = k.media; }   // pretend the upload succeeded
kmSaveFnOverrides();
console.log('stored:', localStorage.getItem('ak820.fn.overrides'));

console.log('--- back to top layer ---');
kmSetLayer(0);
console.log('active layer:', kmLayer);
console.log('top dirty:', JSON.stringify($('kmDirty').textContent));
console.log('top caps raw:', $('kmRaw').value, '| restore label:', $('btnKmRestore').textContent);
console.log('top board changed count:', $('kmBoard').children.filter(c => c.className.includes('changed')).length);
`;

new Function('document', '$', 'log', 'escapeHtml', 'localStorage',
  keysSrc + '\n' + editorSrc + '\n' + test)(document, $, log, escapeHtml, localStorage);

// re-init from persisted state, proving a reload keeps the Fn overrides
els['kmBoard'].children = [];
els['kmMap'].value = '';
const persistTest = `
let kmBusy = false;
kmInit();
kmSetLayer(1);
console.log('--- reload ---');
console.log('fn f1 usage from storage:', kmState.find(k => k.idx === 2).usage);
console.log('fn f2 media from storage:', kmState.find(k => k.idx === 3).media, kmState.find(k => k.idx === 3).usage);
console.log('dirty:', JSON.stringify($('kmDirty').textContent));
console.log('fn changed count:', $('kmBoard').children.filter(c => c.className.includes('changed')).length);
`;
new Function('document', '$', 'log', 'escapeHtml', 'localStorage',
  keysSrc + '\n' + editorSrc + '\n' + persistTest)(document, $, log, escapeHtml, localStorage);
