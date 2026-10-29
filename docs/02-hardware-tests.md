# 02 · Hardware tests (what was actually run)

Board: **AJAZZ AK820 Pro**, VID/PID `0C45:8009`, US layout, 81 keys, firmware as shipped in
`..._RGB_V1.0.0.5`. Host: Windows, Chrome (WebHID). Every write below was accepted with
`commit 0x01`, and the *keyboard behaviour* was checked by the person at the keyboard — the
mailbox alone is not evidence (see docs/01-protocol.md §3).

Tests 1 to 8 ran on the v1 single-file app. The v2 rewrite sends the same bytes in the same order;
the byte checks now live in `src/lib/keymap/table.test.ts` and the transport checks in
`src/lib/hid/transfer.test.ts`. Test 9 records the React build on the board.

---

## Test 1 — connect, enumerate, mailbox

* Chrome exposes 3 previously authorised devices; the config collection is
  `usagePage 0xFF13 / usage 0x0001` with 65-byte in/out/feature reports.
* The keyboard and consumer collections are blocked by Chrome and are not needed.
* A read immediately after a write returns our own frame with status `0x00`; a stamped reply
  appears only after the firmware has processed the command.
* Probe result: `04 18` → `04 18 00 01 00`; `04 F5` → version reply; `04 19` echoed.

Conclusion: `SET_FEATURE` + polled `GET_FEATURE` is enough; no input reports are required.

---

## Test 2 — first write is a no-op (trailer + factory table)

Uploading the factory table unchanged (`FACTORY_KEYS`, 164 non-zero bytes) was accepted and the
keyboard kept typing normally. This proved the 576-byte layout, the trailer and the chunking
before any key was changed.

---

## Test 3 — validation probe (why `AA 55` matters)

The in-page probe sends the same table twice: **A** with bytes 574–575 zeroed, **B** with
`AA 55`.

```
A · trailer zeroed   → commit 0xFF   (rejected)
B · trailer present  → commit 0x01   (accepted)
```

So the firmware genuinely validates the packet, and a rejected commit does not mean the
transport failed. The page distinguishes "transport failed" (`04 18` refused, chunk refused,
aborted) from "firmware rejected the commit" (`0xFF`).

---

## Test 4 — top-layer remap and restore

Changes made with the editor and confirmed by typing:

| # | key_index | change | result |
|---|---|---|---|
| 1 | 55 | CapsLock `0x39` → `A` `0x04` | CapsLock types `a`, no longer toggles |
| 2 | 1 | Esc `0x29` → CapsLock `0x39` | Esc toggles caps |
| 3 | restore | both back to factory | stock behaviour |

Representative log (trimmed):

```
──── top layer upload (81 keys, 1 changed) ────
  #55 CapsLock: CapsLock 0x39 → A 0x04
SEND  04 18
begin 04 18: status 0x01 OK (1 ms after settle, 1 read)
SEND  04 11 00 00 00 00 00 00 09
announce 04 11: status 0x01 OK (1 ms)
chunk 1/9 ok in 1 ms  00 00 00 00
...
chunk 9/9 ok in 1 ms  00 00 00 00
SENT  9 x 64-byte chunks (576 bytes) in 115 ms
SEND  04 02
commit 04 02: status 0x01 OK (1 ms)
SEND  04 F0
end 04 F0: status 0x01 OK (1 ms)
⇒ Upload accepted (commit 0x01) — the top layer is now live on the keyboard.
```

Note the per-chunk preview only prints the **first 4 bytes** of each 64-byte chunk, so the
CapsLock record (offset 220, chunk 4, byte 28) never shows in the log. `tools/kmtest.js` is the
byte-level check.

---

## Test 5 — Fn layer (`04 27`)

Sequence: switch to the Fn tab, set `Fn + CapsLock` to `A`, upload, press `Fn+CapsLock`, then
clear it.

```
──── Fn layer upload (1 override, 1 changed) ────
  #55 Fn+CapsLock: default → A 0x04
SEND  04 18                     → 0x01
SEND  04 27 00 00 00 00 00 00 09 → 0x01
9 chunks (all 00 except the record slot)
SEND  04 02                     → 0x01
SEND  04 F0                     → 0x01
```

Verified by the user:

* `Fn+CapsLock` produced `a`; plain CapsLock still toggled caps → the layers are independent.
* The change was later switched to `T` and then removed with **Back to firmware default**;
  every upload committed `0x01` and the default behaviour returned.
* Several other Fn combinations were exercised before and after a zero-table write; behaviour
  was unchanged, confirming **zero slot = firmware default** and that an all-zero Fn table is a
  true no-op on a stock board.

---

## Test 6 — the double-upload race (why there is a lock)

Two overlapping "restore factory" clicks produced:

```
SEND 04 02                      ← upload #1 commit
──── keymap upload (81 keys, 1 changed) ────   ← upload #2 starts
begin 04 18: status 0xFF REJECTED              ← device still busy
commit 04 02: status 0x01 OK (726 ms, 12 reads) ← #1 consumed #2's reply
commit 04 02: no stamped reply within 6000 ms   ← #2 waited forever
⇒ Upload rejected (commit no reply)
```

Nothing was corrupted (both payloads were the factory map), but the verdict was wrong and two
sequences were interleaved. Fixes now in the page:

* `kmBusy` lock; every action button (including the layer tabs) is disabled for the duration.
* `sendTable` aborts with `04 F0` if `04 18` is not `0x01`.
* transport failures are reported separately from a `0xFF` commit.

If a future change removes one of those, expect this bug to come back.

---

## Test 7 — revalidation on the main PC (28 Oct 2026)

Same board, new machine: Windows + Chrome 156, no vendor app installed or running, fresh WebHID
authorisation. The page was the post-hardening build (announce abort, top-layer `0x00` guard);
the normal upload path is unchanged, so this run also confirms the hardening did not alter it.

* Diagnostics: all PASS. `04 19` → `04 19 00 01`, `04 F5` → `04 F5 00 01`. No input reports on
  the config collection, as expected.
* Raw `04 F0` closed the staging session diagnostics leaves open → `04 F0 00 01` (three reads).
* **Top layer, factory table, 0 changed**: every step `0x01`. Chunks 4–7 began with
  `02 00 2F 00` (idx 48 `[{`), `02 00 0F 00` (idx 64 L), `02 00 10 00` (idx 80 M) and
  `02 00 AF 00` (idx 96 Fn) — the expected `FACTORY_KEYS` records at `idx × 4`. 9 chunks in
  123 ms; commit and end `0x01`.
* **Fn layer, 0 overrides**: all-zero body, every step `0x01`; 9 chunks in 122 ms.
* The user confirmed by typing: normal keys, CapsLock, Esc, arrows and the Fn combinations all
  behaved exactly as before.

This re-establishes the baseline the page assumes: top layer = factory, Fn layer = all zeros.
It did **not** exercise the new abort path (refused/missing announce), which still needs a
deliberate failure to test.

---

## Test 8 — media keys on the Fn layer (28 Oct 2026)

Same board and PC as Test 7, media build (`03` records + the explicit `c:` page marker). Key used:
CapsLock, `key_index 55`, Fn layer only, so the top layer was never touched. Each change was one
full Fn-table upload (`04 27`, zero body except slot 220 and the trailer).

| setting | record at offset 220 | commit | observed at the keyboard |
|---|---|---|---|
| Media: Mute | `03 E2 00 00` | `0x01` | Fn+CapsLock muted / showed the Windows OSD |
| Media: Volume up | `03 E9 00 00` | `0x01` | volume raised |
| Media: Volume down | `03 EA 00 00` | `0x01` | volume lowered |
| Back to firmware default | slot zeroed | `0x01` | Fn+CapsLock returned to stock behaviour |

All four sequences: begin/announce/commit/end `0x01`, 9 chunks in 119–127 ms, no `0xFF` anywhere.
The log's per-chunk preview prints only the first four bytes of each chunk, so the record (chunk 4,
byte 28) never appears in it; `tools/kmtest.js` asserts those four bytes directly.

The user confirmed by testing at the keyboard: plain CapsLock kept toggling caps throughout, and
after the final zero upload the Fn combination stopped doing anything special.

Conclusion: record type `0x03` is accepted on the Fn layer and produces real consumer reports. The
`07 …` fallback (vendor type `0x0D`) is not needed. The 0xE2 / 0xCD / 0xB5 number collisions are
handled by the explicit `media` flag, not by a numeric range.

## Observed timings (useful for sanity checks)

| step | time |
|---|---|
| begin reply | ~1 ms after the 220 ms settle |
| announce reply | ~1 ms after settle |
| each 64-byte chunk | 0–2 ms |
| 9 chunks with 12 ms pacing | 110–120 ms |
| commit reply | 0–1 ms (occasionally hundreds of ms under load) |
| whole upload | ~1.3 s including settles |

## How to reproduce (v1)

```
start.cmd                  → http://localhost:8765
```

1. Close the AJAZZ desktop app (only one program can hold the interface).
2. Connect → **6 · Key editor**.
3. Change one key, upload, test by typing. Restore with **Restore factory map**.
4. Fn tab: upload with no edits first (writes zeros) and check that Fn behaviour is unchanged;
   then add one override and test it.

Every run logs the full 64-byte frames; copy the log with **Copy report** before closing.

## How to reproduce (v2)

```bat
npm install
npm run dev
```

1. Close the AJAZZ desktop app.
2. Open <http://localhost:5173/>, click **Connect keyboard**, choose the AK820.
3. Change one key, upload, test by typing. Restore with **Restore factory map**.
4. Fn tab: upload with no edits first (writes zeros) and check that Fn behaviour is unchanged;
   then add one override and test it.

The log drawer has **Copy**. The app has no numbered cards.

## Test 9 — v2 React build on the board (29 Oct 2026)

Build: `refactor/react` at `220169a`, dev server on `http://localhost:5173`, Chrome on Windows.
The board was in USB mode and the AJAZZ desktop app was closed. The user ran the app and typed at
the keyboard.

### 9A — top layer, slot 55 (CapsLock) to A

Change: key 55 (CapsLock, offset 220) from `02 00 39 00` to `02 00 04 00`, inside the full
576-byte factory table. Upload, then **Reset this key** and upload the factory table back.

The log showed the same sequence twice, with every reply status `0x01`:

```
begin 04 18: status 0x01 OK  (2 ms after settle, 1 read)
announce 04 11: status 0x01 OK  (2 ms after settle, 1 read)
chunk 1/9 ... chunk 9/9 ok in 2–3 ms
SENT 9 x 64-byte chunks (576 bytes) in 118 ms
commit 04 02: status 0x01 OK  (2 ms after settle, 1 read)
end 04 F0: status 0x01 OK  (2 ms after settle, 1 read)
Upload accepted. The top layer is live.
```

The second run took 116 ms for the chunks, and its commit and end replies were also `0x01`.

Behaviour: after the first upload, CapsLock typed `a`. After the reset upload, CapsLock toggled
caps as before. The user confirmed both by typing.

The per-chunk preview prints only the first four bytes, so the slot 55 record at offset 220 does
not appear in the log. The byte-level check is `src/lib/keymap/table.test.ts`.

Conclusion: the React build writes the top layer and restores it. The full sequence, the commit
gate and the rollback by re-upload behave as on v1.

### 9B — Fn layer, slot 55 (Fn+CapsLock) to Media: Mute

Change: key 55 on the Fn layer from zero to `03 E2 00 00`. Every other Fn slot stayed zero and the
trailer stayed `AA 55`. This writes the Fn table with `04 27`, not the top layer.

```
begin 04 18: status 0x01 OK  (2 ms after settle, 1 read)
announce 04 27: status 0x01 OK  (2 ms after settle, 1 read)
chunk 1/9 ... chunk 9/9 ok in 1–2 ms
SENT 9 x 64-byte chunks (576 bytes) in 119 ms
commit 04 02: status 0x01 OK  (2 ms after settle, 1 read)
end 04 F0: status 0x01 OK  (3 ms after settle, 1 read)
Upload accepted. The Fn layer is live.
```

Behaviour: Fn+CapsLock showed the Windows mute OSD. Plain CapsLock still toggled caps. After a page
reload and a new connect, the override was still listed on the Fn layer, which confirms the
`localStorage` copy. The user cleared it with **Back to firmware default** and an upload; after
that, Fn+CapsLock returned to its stock behaviour.

Conclusion: the React build writes the Fn layer, the firmware accepts the consumer record on this
build, and clearing the override restores the firmware combination. Persistence works across a
reload.

### 9C — restore actions and the upload lock

Top layer: **Restore factory map** wrote the full factory table with `04 11`. The chunks took
116 ms, and begin, announce, commit and end were all `0x01`. The keyboard kept typing normally.

Fn layer: **Clear all Fn overrides** wrote the all-zero Fn table with `04 27`. The chunks took
120 ms, and every reply was `0x01`. Fn combinations stayed stock.

Lock: the top layer was set to CapsLock → A, then Upload was clicked twice in quick succession.
The log contains one sequence for that burst, starting at `00:29:11` (begin `0x01`, 117 ms of
chunks, commit and end `0x01`). The next top-layer sequence starts at `00:29:21`, which is the
reset upload, ten seconds later. No second begin appeared inside the first transfer.

The reset upload put the factory record back. CapsLock typed normally afterwards, and the user
confirmed that everything worked.

### Test 9 conclusion

The React build writes the top layer and the Fn layer, writes and persists a media override, clears
it, runs both restore actions and keeps one transfer at a time. Every reply was the expected
`0x01`, and each change was confirmed by typing or by the Windows OSD at the keyboard, not by the
mailbox alone.
