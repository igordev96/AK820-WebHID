# AK820 Pro — WebHID key remapper

An unofficial, install-free key remapper for the **AJAZZ AK820 Pro**, running entirely in the
browser over WebHID. No driver, no admin rights, no build step — just a local page and a
Chromium browser.

> **Unofficial community project.** Not affiliated with AJAZZ. This page writes the keyboard's
> configuration table, so use it at your own risk. The vendor application remains the recovery
> path. `AK820 Pro` is a trademark of its owner; it is used here only to describe compatibility.

---

## What it does

| Feature | Status |
|---|---|
| Connect and inspect the configuration interface (`0xFF13/0x0001`) | working |
| Remap any of the 81 keys on the **top layer** | verified on hardware |
| Remap keys on the **Fn layer** (overrides, firmware default = zero) | verified on hardware |
| **Media / consumer keys** (mute, volume, play/pause, tracks, browser, …) | Mute and volume verified on hardware; other consumer usages use the same record type |
| Restore the factory top-layer map | verified on hardware |
| Clear all Fn overrides | verified on hardware |
| Read the current layout back from the keyboard | **impossible** — the firmware has no read-back |
| Knob remapping | out of scope (rotation/press are input-only reports) |
| Bluetooth mode | not supported by this interface |

Supported device ids: VID `0x0C45`, PIDs `0x8009` (tested), `0x800A`, `0xFDFD` (untested).
Only the configuration collection is used; normal typing, the knob and media input keep working.

---

## Requirements

- **Chrome, Edge or Opera on desktop** (WebHID is unavailable in Firefox, Safari and on mobile).
- **USB (wired) mode** — Bluetooth does not expose the configuration collection.
- **Close the AJAZZ desktop app** while using this page. Only one program can hold the interface.
- The page must be served from `http://localhost` or HTTPS. WebHID needs a secure context.

---

## Quick start

```bat
:: Windows
start.cmd
```

That starts a local server on <http://localhost:8765/> and opens it. On any OS you can instead run:

```bash
node serve.js
```

Then open <http://localhost:8765/>, click **Connect keyboard**, and pick the device in Chrome's
chooser. No installation is involved; `serve.js` is only a static file server.

> This repository is source-only. Serve it yourself; there is no hosted copy to trust.

---

## Using the editor

1. **Top layer** — click a key, choose the function in **Sends**, then **Upload changes**.
   The whole 576-byte table is re-sent each time; the firmware has no single-key command.
2. **Fn layer** — the same board, but it edits what each key does while Fn is held. Only the keys
   you set are written; every other slot stays zero, which means “firmware default”.
   Six keys marked `fnlayer_disable` by the vendor layout are read-only there.
3. **Media** — the **Media** group assigns consumer functions such as Mute, Volume up/down,
   Play/Pause, tracks, browser back/forward, calculator and email. Media records use a different
   record type, so the raw box shows a `c:` prefix (for example `c:0xE2` for Mute). The prefix is
   required because `0xE2` is also keyboard Left Alt.
4. **Restore** — **Reset this key** / **Restore factory map** on the top layer, and
   **Back to firmware default** / **Clear all Fn overrides** on the Fn layer.

### The one limitation that shapes everything

The keyboard cannot report its configuration back. The page therefore:

- assumes the **top layer is the factory map** unless you changed it elsewhere;
- treats an **all-zero Fn table** as the firmware default;
- remembers the Fn overrides it wrote in `localStorage` for this browser profile.

If you remapped keys with the vendor app before using this page, the page cannot see that layout,
and uploading the factory map will overwrite it. Restore the vendor app's defaults first if you
need to keep it.

---

## Recovery

- **Undo one change:** select the key → **Reset this key** (top) or **Back to firmware default**
  (Fn) → **Upload changes**.
- **Undo a layer:** **Restore factory map** (top) or **Clear all Fn overrides** (Fn).
- **If the page refuses a transfer:** it aborts before staging data; nothing changed. Replug the
  keyboard and try again. Close any program that may hold the interface.
- **If the keyboard misbehaves:** unplug/replug it, upload the factory map again, or use the
  vendor application's restore function. The vendor app is the last-resort recovery path.
- **Never run two uploads at once.** The page has a lock; do not work around it.

---

## Development

The product is one self-contained file: `index.html`. No dependencies and no build step.

```bat
:: checks (Node.js 22.5+; all must pass)
node tools\check-js.js index.html
node tools\kmtest.js index.html
node tools\editortest2.js index.html
```

There are no dependencies to install; `npm test` runs the same three checks, and `npm start` runs
`serve.js`.

- `tools/kmtest.js` asserts the 576-byte table byte for byte (keyboard, modifiers, media, trailer).
- `tools/editortest2.js` is a fake-DOM test of the editor for both layers.
- `tools/hidwatch.cs` / `hidcaps.cs` are optional HID probes, compiled with the .NET Framework
  compiler; they are not needed to use the page.

```
index.html            the driver (single file)
serve.js, start.cmd   local static server and launcher
docs/                 protocol, hardware log, code map, setup, history, key table
tools/                checks and example HID probes
```

Documentation:

| Page | What it covers |
|---|---|
| `docs/01-protocol.md` | the wire protocol, byte for byte |
| `docs/03-hardware-tests.md` | what was actually run on hardware, and what it proved |
| `docs/04-media-keys.md` | consumer-key encoding and why the page marker is explicit |
| `docs/05-code-map.md` | how `index.html` is put together |
| `docs/06-setup.md` | local setup, checks, troubleshooting |
| `docs/08-history.md` | decisions, dead ends and lessons |
| `docs/key-index-table.md` | generated index → key → usage → geometry table |

The protocol was recovered for interoperability. Vendor binaries, layout XML, artwork and the
vendor installer are **not** distributed here; only the original driver, tests and documentation
are. Some documents mention the private research material they were derived from.

---

## Privacy

The page makes no network requests and has no telemetry. The only stored data is the Fn overrides
in this browser's `localStorage` (`ak820.fn.overrides`); clearing site data forgets them.

---

## License

MIT — see [LICENSE](LICENSE). The documentation is covered by the same license.
This project is not affiliated with or endorsed by AJAZZ.
