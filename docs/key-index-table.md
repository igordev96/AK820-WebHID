# Key index table (AK820 Pro, 81 physical keys)

Generated from `FACTORY_KEYS` in `index.html` and the vendor layout data used to derive it.
Do not hand-edit.

* keys: **81**
* lowest key_index: **1**, highest: **121**
* slots usable by the protocol: **0..142** (143 overlaps the `AA 55` trailer)
* `fnlayer_disable="1"` (firmware-owned on the Fn layer): **#1, #67, #92, #96, #103, #117**

Record address: `offset = key_index ├ù 4` in the 576-byte table.
Board position: `x = rect_left ΓêÆ 95`, `y = rect_top ΓêÆ 22`, `w = rect_width`, `h = rect_height`
(the editor board is 624 ├ù 250 px).

| key_index | key | factory usage | Fn layer | x | y | w | h |
|---:|---|---|---|---:|---:|---:|---:|
| 1 | Esc | `0x29` Esc | **locked** | 0 | 0 | 28 | 28 |
| 2 | F1 | `0x3A` F1 | overridable | 46 | 0 | 28 | 28 |
| 3 | F2 | `0x3B` F2 | overridable | 84 | 0 | 28 | 28 |
| 4 | F3 | `0x3C` F3 | overridable | 122 | 0 | 28 | 28 |
| 5 | F4 | `0x3D` F4 | overridable | 160 | 0 | 28 | 28 |
| 6 | F5 | `0x3E` F5 | overridable | 207 | 0 | 28 | 28 |
| 7 | F6 | `0x3F` F6 | overridable | 244 | 0 | 28 | 28 |
| 8 | F7 | `0x40` F7 | overridable | 282 | 0 | 28 | 28 |
| 9 | F8 | `0x41` F8 | overridable | 320 | 0 | 28 | 28 |
| 10 | F9 | `0x42` F9 | overridable | 367 | 0 | 28 | 28 |
| 11 | F10 | `0x43` F10 | overridable | 405 | 0 | 28 | 28 |
| 12 | F11 | `0x44` F11 | overridable | 443 | 0 | 28 | 28 |
| 13 | F12 | `0x45` F12 | overridable | 481 | 0 | 28 | 28 |
| 19 | ~` | `0x35` ` | overridable | 0 | 47 | 28 | 28 |
| 20 | !1 | `0x1E` 1 | overridable | 37 | 47 | 28 | 28 |
| 21 | @2 | `0x1F` 2 | overridable | 75 | 47 | 28 | 28 |
| 22 | #3 | `0x20` 3 | overridable | 113 | 47 | 28 | 28 |
| 23 | $4 | `0x21` 4 | overridable | 151 | 47 | 28 | 28 |
| 24 | %5 | `0x22` 5 | overridable | 188 | 47 | 28 | 28 |
| 25 | ^6 | `0x23` 6 | overridable | 226 | 47 | 28 | 28 |
| 26 | &7 | `0x24` 7 | overridable | 264 | 47 | 28 | 28 |
| 27 | *8 | `0x25` 8 | overridable | 302 | 47 | 28 | 28 |
| 28 | (9 | `0x26` 9 | overridable | 339 | 47 | 28 | 28 |
| 29 | )0 | `0x27` 0 | overridable | 377 | 47 | 28 | 28 |
| 30 | _- | `0x2D` - | overridable | 415 | 47 | 28 | 28 |
| 31 | += | `0x2E` = | overridable | 452 | 47 | 28 | 28 |
| 37 | Tab | `0x2B` Tab | overridable | 0 | 86 | 46 | 28 |
| 38 | Q | `0x14` Q | overridable | 56 | 86 | 28 | 28 |
| 39 | W | `0x1A` W | overridable | 94 | 86 | 28 | 28 |
| 40 | E | `0x08` E | overridable | 132 | 86 | 28 | 28 |
| 41 | R | `0x15` R | overridable | 170 | 86 | 28 | 28 |
| 42 | T | `0x17` T | overridable | 207 | 86 | 28 | 28 |
| 43 | Y | `0x1C` Y | overridable | 245 | 86 | 28 | 28 |
| 44 | U | `0x18` U | overridable | 283 | 86 | 28 | 28 |
| 45 | I | `0x0C` I | overridable | 321 | 86 | 28 | 28 |
| 46 | O | `0x12` O | overridable | 358 | 86 | 28 | 28 |
| 47 | P | `0x13` P | overridable | 396 | 86 | 28 | 28 |
| 48 | {[ | `0x2F` [ | overridable | 434 | 86 | 28 | 28 |
| 49 | }} | `0x30` ] | overridable | 471 | 86 | 28 | 28 |
| 55 | CapsLock | `0x39` CapsLock | overridable | 0 | 123 | 55 | 28 |
| 56 | A | `0x04` A | overridable | 65 | 123 | 28 | 28 |
| 57 | S | `0x16` S | overridable | 103 | 123 | 28 | 28 |
| 58 | D | `0x07` D | overridable | 141 | 123 | 28 | 28 |
| 59 | F | `0x09` F | overridable | 179 | 123 | 28 | 28 |
| 60 | G | `0x0A` G | overridable | 217 | 123 | 28 | 28 |
| 61 | H | `0x0B` H | overridable | 255 | 123 | 28 | 28 |
| 62 | J | `0x0D` J | overridable | 292 | 123 | 28 | 28 |
| 63 | K | `0x0E` K | overridable | 330 | 123 | 28 | 28 |
| 64 | L | `0x0F` L | overridable | 367 | 123 | 28 | 28 |
| 65 | :; | `0x33` ; | overridable | 405 | 123 | 28 | 28 |
| 66 | "' | `0x34` ' | overridable | 443 | 123 | 28 | 28 |
| 67 | |\\ | `0x31` \ | **locked** | 509 | 86 | 47 | 28 |
| 73 | Shift_L | `0xE1` Left Shift | overridable | 0 | 161 | 75 | 28 |
| 74 | Z | `0x1D` Z | overridable | 84 | 161 | 28 | 28 |
| 75 | X | `0x1B` X | overridable | 122 | 161 | 28 | 28 |
| 76 | C | `0x06` C | overridable | 160 | 161 | 28 | 28 |
| 77 | V | `0x19` V | overridable | 197 | 161 | 28 | 28 |
| 78 | B | `0x05` B | overridable | 235 | 161 | 28 | 28 |
| 79 | N | `0x11` N | overridable | 273 | 161 | 28 | 28 |
| 80 | M | `0x10` M | overridable | 311 | 161 | 28 | 28 |
| 81 | ,< | `0x36` , | overridable | 348 | 161 | 28 | 28 |
| 82 | .> | `0x37` . | overridable | 386 | 161 | 28 | 28 |
| 83 | /? | `0x38` / | overridable | 424 | 161 | 28 | 28 |
| 84 | Shift_R | `0xE5` Right Shift | overridable | 462 | 161 | 55 | 28 |
| 85 | Enter | `0x28` Enter | overridable | 481 | 123 | 75 | 28 |
| 91 | Ctrl_L | `0xE0` Left Ctrl | overridable | 0 | 199 | 37 | 28 |
| 92 | Win_L | `0xE3` Left Win | **locked** | 47 | 199 | 37 | 28 |
| 93 | Alt_L | `0xE2` Left Alt | overridable | 94 | 199 | 37 | 28 |
| 94 | Space | `0x2C` Space | overridable | 141 | 199 | 225 | 28 |
| 95 | Alt_R | `0xE6` Right Alt | overridable | 377 | 199 | 28 | 28 |
| 96 | Fn | `0xAF` Fn | **locked** | 415 | 199 | 28 | 28 |
| 98 | Ctrl_R | `0xE4` Right Ctrl | overridable | 453 | 199 | 28 | 28 |
| 99 | ΓåÉ | `0x50` Left | overridable | 499 | 208 | 28 | 28 |
| 100 | Γåô | `0x51` Down | overridable | 536 | 208 | 28 | 28 |
| 101 | Γåæ | `0x52` Up | overridable | 536 | 170 | 28 | 28 |
| 102 | ΓåÆ | `0x4F` Right | overridable | 574 | 208 | 28 | 28 |
| 103 | Backspace | `0x2A` Backspace | **locked** | 490 | 47 | 66 | 28 |
| 117 | home | `0x4A` Home | **locked** | 582 | 47 | 28 | 28 |
| 118 | PgUp | `0x4B` PageUp | overridable | 582 | 86 | 28 | 28 |
| 119 | Delete | `0x4C` Delete | overridable | 528 | 0 | 28 | 28 |
| 121 | PgDn | `0x4E` PageDown | overridable | 582 | 123 | 28 | 28 |

## Notes

* `FACTORY_KEYS` is the **top layer** baseline; the Fn layer has no factory table in
  software ΓÇö an all-zero table is what the vendor app writes for an untouched profile.
* `key_index` is not the HID usage. `idx 55` is CapsLock (usage `0x39`), `idx 56` is A
  (usage `0x04`). Lighting tables (`t_customrgb_data.keycode`) use the *usage*, not the index.
* `light_index` equals `key_index` for every key in this layout.
