# AK820 Pro WebHID key remapper

An unofficial browser tool for remapping the AJAZZ AK820 Pro. It uses WebHID to talk to the
keyboard's configuration interface, so there is nothing to install and no admin rights to ask
for. It runs in Chrome, Edge or Opera on desktop.

Current release: 1.0.1.

AK820 Pro is a trademark of its owner. This project is not affiliated with AJAZZ. The tool writes
the key table, so keep the vendor application available for recovery.

## What it does

- Remaps any of the 81 keys on the top layer.
- Sets Fn-layer overrides. Keys you leave alone keep the firmware default.
- Assigns consumer keys: mute, volume, play/pause, track skip, browser back and forward,
  calculator and email.
- Restores the factory top map or clears every Fn override.

Top-layer and Fn-layer remapping and both restore actions were tested on an AK820 Pro
(VID `0C45`, PID `8009`). Media testing covered Mute, Volume up and Volume down. The other
consumer functions use the same record format but were not each tested.

## Supported devices

VID `0C45` with PID `8009` (tested), `800A` or `FDFD`. Only the `8009` board has been used on
hardware. Other AK820 variants may share the protocol, but they have not been tested.

## What it cannot do

The firmware has no read-back command, so the page cannot show the layout stored on the keyboard.
It assumes the top layer is factory and treats an all-zero Fn table as the default. Fn overrides
are saved in this browser.

The knob is input-only, so it cannot be remapped. Bluetooth mode does not expose the
configuration interface.

## Requirements

- Chrome, Edge or Opera on desktop. Firefox, Safari and mobile browsers do not support WebHID.
- A USB connection. Bluetooth mode does not expose the interface.
- Close the AJAZZ desktop app while this page is connected.
- Serve the page from `http://localhost` or HTTPS. WebHID needs a secure context.

## Quick start

1. Run `start.cmd` on Windows, or `node serve.js` on any OS with Node.js 22.5 or newer.
2. Open <http://localhost:8765/>.
3. Click **Connect keyboard** and choose the AK820 in the browser chooser.
4. Pick a key, choose a function, and click **Upload changes**.

`serve.js` only serves the files. The tool itself is `index.html`, with no build step and no
dependencies.

This repository is source-only. Run it locally; there is no hosted copy.

## Using the editor

The top layer is the table the keyboard types without Fn. Click a key, choose the new function
under **Sends**, then upload. Every upload sends the full 576-byte table because the firmware has
no single-key command.

The Fn layer tab edits what each key does while Fn is held. Only the keys you change are written;
every other slot stays zero, which means the firmware handles that combination. Six keys marked
`fnlayer_disable` by the vendor layout are read-only there.

The Media group assigns consumer functions. Their records use a different type, and the raw box
shows the `c:` prefix, for example `c:0xE2` for Mute. The prefix is required because `0xE2` is
also keyboard Left Alt.

**Reset this key** restores one top-layer key. **Restore factory map** rewrites the whole top
layer. On the Fn layer, **Back to firmware default** clears one override and **Clear all Fn
overrides** clears the layer.

## The missing read-back

If you remapped keys in the vendor app, this page cannot see that layout. Uploading the factory
map will overwrite it. Restore the vendor app's defaults first if you need to keep it.

Fn overrides are stored in `localStorage` under `ak820.fn.overrides` in this browser profile.
Clearing site data forgets them. They do not travel to another browser or machine.

## Recovery

Undo a single change with **Reset this key** on the top layer or **Back to firmware default** on
the Fn layer, then upload.

Undo a whole layer with **Restore factory map** or **Clear all Fn overrides**.

If the page refuses a transfer, it stops before staging data, so the keyboard is unchanged.
Unplug and replug the keyboard, then try again. Close any other program that may hold the
interface.

If the keyboard stops responding or types the wrong keys, unplug and replug it, upload the factory
map again, or use the vendor application's restore function.

Do not start two uploads at once. The page locks the controls during a transfer; leave that lock
in place.

## Documentation

The full reading order is in [docs/README.md](docs/README.md).

| Page | Contents |
|---|---|
| [docs/01-protocol.md](docs/01-protocol.md) | device, report framing, mailbox, table format, layers |
| [docs/02-hardware-tests.md](docs/02-hardware-tests.md) | hardware runs and what they proved |
| [docs/03-media-keys.md](docs/03-media-keys.md) | consumer records and the explicit page marker |
| [docs/04-code-map.md](docs/04-code-map.md) | how `index.html` is organised |
| [docs/05-setup.md](docs/05-setup.md) | local setup, checks and troubleshooting |
| [docs/06-history.md](docs/06-history.md) | decisions, dead ends and lessons |
| [docs/key-index-table.md](docs/key-index-table.md) | key index, usage, Fn lock and geometry |

The protocol notes were written for interoperability. Vendor binaries, layout XML, artwork and
the installer are not distributed here. A few documents mention the private research material
they were derived from.

## Development

The driver is one file: `index.html`. There are no dependencies and no build step.

```bat
node tools/check-js.js index.html
node tools/kmtest.js index.html
node tools/editortest2.js index.html
```

All three must pass before a commit. `npm test` runs the same checks. `tools/kmtest.js` asserts
the 576-byte table byte for byte. `tools/editortest2.js` tests the editor with a fake DOM.
`tools/hidwatch.cs` and `tools/hidcaps.cs` are optional HID probes; they need the .NET Framework
compiler and are not needed to use the page.

`index.html` is sliced by `tools/kmtest.js` and `tools/editortest2.js` using banner comments. Keep
those markers in place; [docs/04-code-map.md](docs/04-code-map.md) lists them.

## Privacy

The page makes no network requests and has no telemetry. The only stored data is the Fn overrides
in `localStorage` under `ak820.fn.overrides`.

## License

MIT. See [LICENSE](LICENSE). The documentation uses the same license.
