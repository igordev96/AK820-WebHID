# 04 · Code map: `index.html`

One file, no dependencies, no build step. Open it from `http://localhost:8765` (WebHID requires
a secure context; `localhost` counts). Line numbers below drift as the file changes — the
**section banners and marker comments** are the stable anchors.

```
<head>   CSS for the page, the board (.km-*) and the layer tabs
<body>   cards 1..6 + log
<script> one IIFE, 'use strict'
```

---

## 1. Sections

| Banner / marker | What lives there |
|---|---|
| `/* ---------- logging ---------- */` | `ts`, `log`, `escapeHtml`, `hex`, `parseHex` |
| `/* ---------- collection helper ---------- */` | `flatten`, `findConfigCollection` (looks for `0xFF13/0x0001`) |
| `/* ---------- device rendering ---------- */` | `renderDevice` — the collection table in card 1 |
| `/* ---------- sending ---------- */` | `send` (one 64-byte payload), `sendChunked` (mirrors `Device::Write`) |
| `/* ---------- reading ---------- */` | `startInputCapture` / `stopInputCapture`, `tryFeatureRead` |
| `/* ---------- connect ---------- */` | `connect`, `setConnected`, `disconnect` |
| `/* ---------- diagnostics ---------- */` | `diagnose` — collection + mailbox sanity, fills card 2 |
| `/* ---------- deep probe ---------- */` | `deepProbe`, `frame`, `sameBytes` — echo/stream experiments |
| `/* ---------- mailbox test ---------- */` | `mailboxProbe` — proves replies are generated, not echoed |
| `/* ---------- keymap ---------- */` | `FACTORY_KEYS`, `modBit`, `encodeRecord`, `parseMapText`, `buildTable` |
| `/* ---------- key editor ---------- */` | state, board, inspector, dirty list, layer tabs, upload UI |
| `/* ---------- send + listen ---------- */` | `sendAndListen` (card 4's "Send + listen") |
| `/* ---------- wiring ---------- */` | all `addEventListener` calls, `kmInit()` at the bottom |

---

## 2. Key functions

### Transport

```
send(payload)                 payload ≤ 64 → one feature report, zero-padded
sendChunked(payload)          > 64 → floor(len/64) bare 64-byte reports
tryFeatureRead(timeout)       GET_FEATURE; returns { ok, bytes } or { ok:false, reason }
waitReply(cmd, label)         220 ms settle, then poll 60 ms up to 6 s
                              accepts only byte[1]==cmd && byte[3]!=0
sendChunk(buf, i, chunks)     one chunk, 4 attempts, 250 ms backoff
sendTable(buf, layerFn)       the full sequence + step list
kmTransportFailed(steps)      chunks/aborted/begin≠0x01 → transport failure
```

`sendTable` returns an array of `[stepName, { status, ms, raw }]`; the UI renders it with
`stepTable`. A `0xFF` commit is **not** a transport failure.

### Table building

```
modBit(usage)                 0xE0..0xE7 → 1,2,4,8,1,2,4,8
encodeRecord(usage, media?)   → 4 bytes: 02 <mod> <usage> 00 (keyboard)
                                         03 <lo> <hi> 00   (consumer, media=true)
parseMapText(text)            "idx [c:]usage name" per line, # comments
                              c: marks a consumer usage; bare = keyboard
buildTable(entries, corruptTrailer?, layerFn?)
                              zero-fills 576, writes at idx*4,
                              skips usage 0 / fnlayer_disable on the Fn layer,
                              AA 55 at 574..575
```

### Editor state

```
kmTop[]      top-layer rows: { idx, usage, media, name, x,y,w,h,
                               factory, factoryMedia, applied, appliedMedia }
kmFn[]       Fn-layer rows:  same shape; factory = 0, factoryMedia = false,
                             applied/appliedMedia = what we last wrote
kmState      points at the active array (kmTop or kmFn)
kmLayer      0 = top, 1 = Fn
kmSel        selected key_index or null
```

Every row carries:

* `usage` — what the editor says now
* `media` — consumer page (record `0x03`) when true, keyboard page (record `0x02`) when false
* `applied` / `appliedMedia` — what the keyboard is believed to run (updated only after `commit 0x01`)
* `factory` / `factoryMedia` — top layer: the XML usage (keyboard); Fn layer: 0 / false

`kmPending()` is `usage !== applied || media !== appliedMedia`; that is what the dirty list and the
upload button show. The page is compared too, because 0xE2 Left Alt → 0xE2 Mute changes only `media`.

```
kmInit()            builds both arrays, loads persisted Fn overrides, renders
kmSetLayer(n)       swaps kmState, clears selection, re-renders (blocked while kmBusy)
renderLayer()       tab classes, note text, restore/reset button labels
renderBoard()       one <button> per key, absolute-positioned from x/y/w/h;
                    Fn layer: fnlayer_disable keys get disabled + .fnlock
renderInspector()   name/meta, usage <select>, raw usage, controls disabled for locked keys
renderDirty()       pending list + upload button label
kmSetUsage(u, media?)  validates, refuses locked keys, refuses bare keyboard usages >0xE7,
                      0 = default on the Fn layer; returns false on refusal
kmApplyText()       pulls the textarea back into the active array
kmMirror()          writes the textarea from the active array (c: for media)
```

`usageLabel/usageToken/usageFull` are the only place that formats a usage for the UI; they take
the `media` flag so a value is never displayed without its page. `MEDIA_NAMES` is the picker's
media list; `hxu()` prints 2 or 4 hex digits.

### Actions

```
kmUpload() / kmUploadNow()    lock → apply text → build → sendTable → verdict → persist Fn
kmProbe() / kmProbeNow()      A: no trailer, B: trailer → proves the firmware validates
kmPreview()                   builds the packet, prints slot 0 + first/last 16 bytes
kmRemapTest()                 CapsLock (or Fn+CapsLock) → x, upload, tell the user to type
kmSetBusy(on)                 disables KM_ACTIONS while a transfer runs
```

`KM_ACTIONS` must contain **every** button that can start a transfer, including the layer tabs.

---

## 3. Invariants (break these and the keyboard misbehaves)

1. **One transfer at a time.** `kmBusy` + `kmSetBusy` + the guard in `kmSetLayer`.
2. **Never stage after a bad begin or announce.** `sendTable` sends `04 F0` and returns.
3. **Poll for a stamped reply.** Never replace `waitReply` with a single read.
4. **Table is always 576 bytes**, records at `idx*4`, trailer `AA 55`, `idx ≤ 142`.
5. **Fn layer: zero = default.** Never seed it with `FACTORY_KEYS`.
6. **`fnlayer_disable` keys are read-only on the Fn layer.** Refuse the edit and grey the key.
7. **`applied`/`appliedMedia` only move on `commit 0x01`.**
8. **Persist only after success** (`kmSaveFnOverrides` is called inside the `ok` branch).
9. **The record page is explicit.** `media` selects `0x03`; never infer it from the usage number
   (0xE2 is Left Alt/Mute, 0xCD is a reserved keyboard usage and Play/Pause). The raw-text form
   for media is `c:0x…`.

---

## 4. Harness markers (do not remove)

Both Node harnesses extract code from the HTML by string slicing:

| Harness | Slice | Markers |
|---|---|---|
| `tools/kmtest.js` | packet logic | `const FACTORY_KEYS = [` … `];` and `const SLOT_MAGIC_AT` … `/* ---------- key editor` |
| `tools/editortest2.js` | keys + editor | `const FACTORY_KEYS = [` … `/* ---------- key editor` and `/* ---------- key editor` … `// Only one feature-transfer sequence` |

Practical rules:

* keep the two banner comments exactly as they are;
* keep `FACTORY_KEYS`, `modBit`, `encodeRecord`, `parseMapText`, `buildTable`,
  `FN_LOCKED`, `SLOT_MAGIC_AT` above the first marker (they are inside the slice);
* keep the editor functions above the transport marker;
* the harness supplies `document`, `$`, `log`, `escapeHtml`, `localStorage` and declares
  `kmBusy`, so do not move editor code below the transport marker without updating the slice.

Run both after any edit:

```bat
node tools\kmtest.js index.html
node tools\editortest2.js index.html
```

`kmtest.js` prints the expected value after `<-` on each line; `editortest2.js` prints the
editor's state transitions for both layers. Also check the script parses:

```bat
node tools\check-js.js index.html
```

---

## 5. Common changes

### Add a usage to the picker

`USAGE_NAMES` (map) and `USAGE_GROUPS` (ranges) drive `usageOptionsHtml()`. A usage outside the
listed ranges needs either a wider group or an explicit entry.

### Add a media function

Add it to `MEDIA_NAMES` (`usage → label`). The Media optgroup and the `c:0x…` token follow
automatically; the encoder already writes `03 <lo> <hi> 00`. Nothing else in the transport changes.

### Add a record type

Change `encodeRecord`, widen validation in `kmSetUsage`, extend `parseMapText` if the value no
longer fits its page, and add cases to `kmtest.js`. `buildTable` writes whatever `encodeRecord`
returns.

### Change the board

The board is data-driven from `FACTORY_KEYS` (`idx, usage, name, x, y, w, h`). The geometry was
derived from the vendor layout (`x = rect_left − 95`, `y = rect_top − 22`) but is baked into those
numbers; the vendor XML itself is not distributed. Update `docs/key-index-table.md` alongside any
change to `FACTORY_KEYS`.

### Add a layer

Only two exist on this board (`0x11`, `0x27`). Both are dispatched by the byte in `sendTable`
and by `kmLayer` in the UI; a third would need new evidence from the firmware.
