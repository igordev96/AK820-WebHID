# 06 · Local setup

The driver installs nothing. Node.js is only needed for the local static server and the checks.

---

## 1. Requirements

| Need | Why | Notes |
|---|---|---|
| Chrome, Edge or Opera (desktop) | WebHID | Firefox, Safari and mobile do not support it |
| USB (wired) connection | the configuration collection | Bluetooth does not expose it |
| A local static server | WebHID needs a secure context | `http://localhost` counts |
| Node.js **22.5+** (optional) | serve.js and the checks | the page itself needs no Node |
| No administrator rights | everything is per-user | nothing is installed |

---

## 2. Run the driver

```bat
start.cmd
```

On any OS you can run it directly:

```bash
node serve.js
```

This starts a static server on `127.0.0.1:8765` and opens <http://localhost:8765/>.

- Port already in use? Stop the old server (`netstat -ano | findstr :8765`) or change `PORT` in
  `serve.js`.
- The server sends `Cache-Control: no-store`, so a normal reload always picks up edits.
- The first **Connect keyboard** shows Chrome's device chooser. The keyboard appears as `AK820`
  (VID `0C45`). After that, Chrome remembers the origin and lists it as previously authorised.

### Before connecting

- **Close the AJAZZ desktop app.** Windows allows one program to hold the config interface.
  Symptom if not: `device.open()` fails, or every command returns `0xFF`.
- Use **USB**, not Bluetooth.
- **Disconnect in the page before opening the vendor app again.**

---

## 3. Verify the checkout

```bat
node tools\check-js.js index.html
node tools\kmtest.js index.html
node tools\editortest2.js index.html
```

`npm test` runs the same three checks (there are no dependencies to install), and `npm start`
runs `serve.js`.

Expected highlights:

```
JS syntax OK

factory keys: 81
non-zero bytes: 164 of 576
slot143 bytes: 00 00 aa 55 <- 00 00 AA 55
fn all-default: non-zero payload bytes = 0 <- 0
fn CapsLock @220: 02 00 1b 00
media Mute @220: 03 e2 00 00

board keys: 81        locked keys: 6
fn option count: 128 default option: true
media options: true true true
fn f1 usage from storage: 27
fn f2 media from storage: true 226
```

The harnesses have no DOM and no device: they slice the relevant code out of `index.html` by
marker comments (see `docs/05` §4).

---

## 4. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `device.open()` fails or no device in the chooser | vendor app still running, or Bluetooth mode |
| `04 18` answers `0xFF` | another transfer is still in flight, or another program holds the interface |
| chunk refused 4× (each attempt ~5 s) | firmware is not in the data phase — usually a previous aborted transfer; replug USB and retry |
| commit `0xFF` | the staged table is invalid (trailer, slot > 142, bad record) |
| upload accepted but nothing changed | wrong layer, `fnlayer_disable` key, or a record type the firmware ignores |
| Fn overrides disappear after reload | expected: there is no read-back; the page restores them from `localStorage` |
| `localStorage` errors | the page was opened as `file://`; use the localhost server |
| everything looks fine but keys do not type | restore the factory map, or use the vendor app's reset |

The vendor application is the last-resort recovery path. Keep it available, and do not run it at
the same time as this page.

---

## 5. Optional hardware probes

`tools/hidwatch.cs` enumerates every HID collection and prints input reports with timestamps;
`tools/hidcaps.cs` prints capabilities only. They are plain C# compiled with the .NET Framework
compiler (`csc.exe`) and need no installation. They are useful for checking what the firmware
emits for a key, but they are not needed to use or test the driver.
