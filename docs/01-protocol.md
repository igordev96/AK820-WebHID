# 01 · Wire protocol

Everything here was decoded for interoperability from the vendor application and confirmed on the
keyboard. Addresses refer to the vendor disassembly, which is kept in the private research
repository and is **not** part of this project.

---

## 1. Device and interface

| Item | Value |
|---|---|
| VID | `0x0C45` (Sonix) |
| PIDs accepted by the page | `0x8009` (tested), `0x800A`, `0xFDFD` |
| Config collection | usage page **`0xFF13`**, usage **`0x0001`** |
| Report | **feature**, 65 bytes on the wire (report id `0` + 64 data bytes) |
| Input reports | not used for configuration |

The board exposes several HID collections (keyboard `0x0001/0x0006`, consumer, vendor
`0xFFFF`, `0xFF13`, `0xFF68`). Chrome blocks the keyboard/consumer ones for WebHID; only
`0xFF13` is needed. The knob and all normal keys keep working through their own collections.

Requirements: Chromium **desktop** (Chrome, Edge, Opera) on Windows/macOS/Linux, page served
over HTTPS or `http://localhost`. Bluetooth mode does not expose the config collection.

---

## 2. Report framing

The vendor's `Device::Write` (`0x44EED0`) builds a **65-byte** buffer:

```
byte 0      = 0x00            report id
byte 1..64  = payload         zero-padded
HidD_SetFeature(handle, buf, 65)
```

WebHID's `device.sendFeatureReport(0, new Uint8Array(64))` produces exactly the same bytes, so
the payload is always described below **without** the leading report id.

* payload ≤ 64 bytes → one report
* payload > 64 bytes → the first 64 bytes carry the command header, then
  `floor(len / 64)` **bare 64-byte chunks** follow with no per-chunk header
  (`0x44EFD5`). A 576-byte table is therefore `9` chunks.

Reads use `GET_FEATURE` (`0x4514E0`) and return the same 64-byte buffer with the report id
stripped. For payloads > 64 bytes the vendor **skips** its read-back entirely; that is why the
table chunks must be written blind and paced.

---

## 3. The mailbox (and why a read right after a write lies)

There is a single 64-byte feature buffer. `SET_FEATURE` copies the command into it; the
firmware processes it asynchronously and stamps the result. A read issued immediately returns
**our own frame** with the status byte still `0x00` (the 0–1 ms "status 0x00" entries in old
logs).

A real reply satisfies both:

* `byte[1] == command` — the reply echoes the command byte
* `byte[3] != 0x00` — a status has been stamped

Reply layout:

```
04 <cmd> 00 <status> [extra...]
```

| status | meaning |
|---|---|
| `0x01` | accepted |
| `0xFF` | rejected (firmware read the data and refused it) |
| other | unknown — treat as failure |

The commit reply occasionally carries `0x77` in `byte[4]` (seen as `04 02 00 01 77`). Its
meaning is unknown; it does not affect the verdict and was not present on every run.

`index.html` implements this as `waitReply(cmd, label)`:
settle **220 ms**, then poll every **60 ms** for up to **6 s**, accepting only a stamped frame.
Never replace it with a single immediate read.

---

## 4. Writing a layer (the only write path)

There is **no single-key command**. Any change uploads a full 576-byte table.

```
SEND  04 18                                    begin / open staging
      ← 04 18 00 01 00                         status must be 0x01
SEND  04 11 00 00 00 00 00 00 09               top layer, 9 chunks
  or  04 27 00 00 00 00 00 00 09               Fn layer,  9 chunks
      ← 04 11 00 01 00  /  04 27 00 01 00
      (pause ~120 ms while the firmware enters the data phase)
SEND  9 × 64-byte chunks                        no reply, 12 ms apart
SEND  04 02                                    commit
      ← 04 02 00 01 00                         validates the table (see §5)
SEND  04 F0                                    end
      ← 04 F0 00 01 00
```

Byte `8` of the announce is the chunk count (`0x09`). Bytes `2..7` are zero.

Rules that matter (each was learned the hard way):

1. **One transfer at a time.** The mailbox has a single reply slot. Two overlapping uploads
   corrupt staging and steal each other's replies (observed: second `04 18` → `0xFF`, first
   commit poll consumed the second commit's answer). The page holds a `kmBusy` lock and
   disables every action while a sequence runs.
2. **Abort on a refused begin or announce.** If `04 18`, or the `04 11`/`04 27` announce, is not
   `0x01` (or gets no stamped reply), send `04 F0` and stop — never stage chunks into a
   half-open session.
3. **Pace the chunks.** Chromium queues feature writes asynchronously; the vendor used
   synchronous `HidD_SetFeature`. 12 ms between chunks works; a 9-frame burst can outrun the
   firmware.
4. **Retry a chunk** up to 4 times with a 250 ms backoff. A refused chunk after all retries
   means the transfer is dead: `04 F0` and report "nothing changed".
5. A `0xFF` **commit** is not a transport failure — it means the firmware read the data and
   refused it (usually a bad trailer or bad record).

Observed timings on the tested board: begin reply ~1 ms after the 220 ms settle, each chunk
0–2 ms, whole 9-chunk body ~115 ms, commit ~1 ms. A full upload takes ~1.3 s wall clock.

---

## 5. The 576-byte table

```
size            576 bytes = 144 slots × 4
record address  key_index × 4          (0x4185E9: `[ebp + ebx*4 - 360h]`)
slot 0          never written by the vendor (its key list starts at 1)
slot 143        574..577 — overlaps the trailer, so key_index ≤ 142
bytes 574..575  AA 55 trailer, required
```

The buffer is zero-filled first (`0x4184B1`, `memset(0x30C)`), so every slot not written stays
`00 00 00 00`. The trailer is validated by the commit: a table with `574..575 = 00 00` is
rejected with `0xFF`, the identical table with `AA 55` is accepted (`0x01`). This was proven by
the in-page "validation probe".

### Record encodings

Four bytes per slot. The first byte selects the record type. "Vendor type" is the value the
vendor's key object carries at `[key+0x18]` (which comes from the DB column `macro_type`).

| byte 0 | layout | meaning | vendor type / address |
|---|---|---|---|
| `0x02` | `02 <mod> <usage> 00` | keyboard usage on the keyboard page | 2 (`0x418600`) and 7 (`0x418908`) |
| `0x03` | `03 <lo> <hi> 00` | **consumer/media usage**, little-endian | 6 (`0x418866`) and 12 (`0x4189F4`) |
| `0x05` | `05 03 00 00` | key explicitly disabled | 1 (`0x4185F1`) |
| `0x05` | `05 02 <arg> 00` | unknown special function | 8..11 (`0x418A56`) |
| `0x01` | `01 <a> <b> 00` | OS shortcut family (not decoded) | 5 (`0x4187AB`) |
| `0x06` | `06 <macro-id> <m2> <m3>` | macro reference (not decoded) | 3 (`0x418733`) |
| `0x07` | `07 <b1> <b2> <b3>` | unknown, unused by this layout | 0x0D (`0x41866F`) |

Modifier bits for record `0x02` (`0x451CA0`): `0x01` Ctrl, `0x02` Shift, `0x04` Alt, `0x08` Win,
for both left and right versions. A key that *is* a modifier is encoded as
`02 <bit> 00 00` — the usage byte stays zero (confirmed: LShift idx 73 = `02 02 00 00`,
LCtrl idx 91 = `02 01 00 00`). The vendor rewrites byte 2 back to 0 for usages `0xE0..0xE7`
(`0x418648` / `0x418662`).

The driver only emits `0x02` records today. Media keys are the next step and need `0x03`;
see `docs/04-media-keys.md`.

---

## 6. Layers

Both layers use the same table, the same record layout and the same transport. They differ in
one announce byte and in what a zero slot means.

| Layer | Announce | Baseline | Zero slot means |
|---|---|---|---|
| Top | `04 11` | the 81 factory keys (`FACTORY_KEYS`) | that index has no key |
| Fn | `04 27` | **all zeros** | *no override — the firmware handles this combination* |

The Fn layer is an **override table**. The vendor builds it from
`SELECT * FROM t_key_macro_data WHERE profile = ? AND fn_layer = ?` (vendor application internals
are kept in the private research repository);
with no rows for `fn_layer = 1` it writes a table that is zero everywhere except the trailer.
That is exactly what a fresh vendor profile produces, so writing all-zero is the Fn-layer
"factory restore".

Six keys are **never written** on the Fn layer because the vendor layout marks them
`fnlayer_disable="1"`; the encoder skips them and leaves zeros (`0x4185BA`):

```
Esc #1   \| #67   LWin #92   Fn #96   Backspace #103   Home #117
```

The firmware owns those combinations. Writing a value there has no effect (the vendor never
does), so the editor greys them out.

Do **not** fill the Fn layer with `FACTORY_KEYS`: that would rebind `Fn+key` to the plain key
function instead of leaving it to the firmware. This is the single easiest way to break the
layer.

---

## 7. Worked example — CapsLock (idx 55) → A on the top layer

```
offset = 55 × 4 = 220
slot   = 02 00 04 00                  (type 2, no modifier, usage 0x04 = A)
trailer= AA 55 at 574..575
everything else = 00
```

Wire sequence:

```
04 18
04 11 00 00 00 00 00 00 09
chunk 1  offsets   0.. 63   all 00
chunk 2  offsets  64..127   all 00
chunk 3  offsets 128..191   all 00
chunk 4  offsets 192..255   ... 00 00 02 00 04 00 ...   (record at byte 28 of the chunk)
chunk 5  offsets 256..319   all 00
chunk 6  offsets 320..383   all 00
chunk 7  offsets 384..447   all 00
chunk 8  offsets 448..511   all 00
chunk 9  offsets 512..575   ... 00 AA 55
04 02
04 F0
```

The same change on the Fn layer uses `04 27` and leaves every other slot zero — that table is
`00` everywhere except `02 00 04 00` at 220 and `AA 55` at 574.

The stock top-layer table has **164 non-zero bytes** (81 records, some of which are
modifier-only). `tools/kmtest.js` asserts that.

---

## 8. Other commands seen

| Payload | Purpose | Notes |
|---|---|---|
| `04 18` | open staging | status `0x01` |
| `04 11` | announce top-layer table | byte 8 = chunk count |
| `04 27` | announce Fn-layer table | byte 8 = chunk count |
| `04 02` | commit staged table | validates the `AA 55` trailer |
| `04 F0` | end / abort | also used to abandon a transfer |
| `04 19` | generic read | used by the mailbox probes |
| `04 F5` | firmware version | probe only |

The LED path (`0x418CC0`) is a different encoder and is **not** the key table; do not confuse
the two when reading the disassembly.
