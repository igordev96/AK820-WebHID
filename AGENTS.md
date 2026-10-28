# Agent instructions: AK820 WebHID

This project is owned by igordev96. Be a collaborator, not an autopilot.

The product is a Vite, React and TypeScript app in `src/`, deployed from `main` to Netlify. It
reprograms a physical keyboard, so a bad change can leave the keyboard typing the wrong thing.
Read the safety rules before editing anything that reaches the device.

Vendor binaries, layout XML, artwork and the installer are not in this repository. The private
research repository is the only place for them.

## Before you start

Read these before touching the code:

1. `README.md`: what the tool does and what it cannot do.
2. `src/App.tsx` and the feature folders: how the UI is arranged.
3. `docs/01-protocol.md`: the wire format.
4. `docs/02-hardware-tests.md`: what was actually verified on the board.

`docs/README.md` lists the full documentation order. `docs/04-code-map.md` still describes the v1
single-file page and is being rewritten for the React layout. Until that lands, treat it as
history, not as a guide to `src/`.

## Stack

Vite, React, TypeScript, Tailwind v4, shadcn/ui primitives, lucide-react and self-hosted IBM Plex
through Fontsource. Netlify runs `npm run build` and publishes `dist/`. `dist/` is never committed.
The page makes no analytics, telemetry or external asset requests.

## Ask before acting

Stop and ask for approval before:

- changing the protocol constants, `FACTORY_KEYS`, `FN_LOCKED`, the keymap encoding,
  `buildTable`, `sendTable`, `waitReply` or the transfer sequence;
- writing to a physical keyboard. Say which layer and slot will be written and how to undo it;
- adding a dependency or replacing a core library;
- changing `netlify.toml`, the build output or deployment settings;
- rewriting git history, moving tags, pushing or changing remotes;
- publishing vendor material.

Read-only commands such as `git status`, `git log`, `git diff` and reading files need no approval.

## Checks

Node.js 22.12+ is required for development and the build. Node 24 is recommended.

```bat
npm install
npm run dev
npm run verify
```

`npm run verify` runs typecheck, lint, format check, tests and the production build. All five must
pass before a commit. Use `npm run format` to apply oxfmt.

Tests use Vitest and React Testing Library. HID tests use a fake device, so they run without a
keyboard. The production build runs `tsc --noEmit` first, so a type error fails the build.

## Architecture rules

- `src/lib/keymap` and `src/lib/hid` are framework-free. They do not import React.
- React components render and dispatch. They do not call WebHID.
- HID writes happen in event handlers or the transport service, never in `useEffect` or render.
  StrictMode double-invokes effects in development, and a double upload is a hardware failure.
- One transfer at a time. The busy lock lives in the transport service, not only in disabled
  buttons.
- The 576-byte table, `AA 55` at 574-575, `idx <= 142`, the begin/announce/commit order, the
  220 ms settle and the 60 ms poll do not change.
- On the Fn layer, zero means firmware default. Never seed it with factory keys.
  `fnlayer_disable` keys are read-only there.
- The record page is explicit. `media` selects record `0x03`; never infer it from the usage
  number. `0xE2` is Left Alt and Mute, and `0xCD` is below `0xE7`. Raw text uses `c:0x...`.
- `applied` and `appliedMedia` move only on `commit 0x01`, and persistence happens only after
  success.
- The mailbox is not behavioural evidence. Only typing on the board proves a remap. Record the
  user's confirmation in `docs/02-hardware-tests.md`.
- WebHID needs HTTPS or localhost. The deployed Netlify origin and the local dev origin are
  separate permissions.

## Public text

Everything in this repository is public. Before you commit prose a reader will see, run it through
the `humanizer` skill and apply the result. This is the humanize pass. It covers the README, docs,
UI copy, commit messages and release notes. The rule applies to new text and to sections you
rewrite.

Leave code, commands, paths, byte sequences and quoted material as written. Humanize the prose
around them. The existing documentation predates this rule, so run the pass on any page you edit.

## Commit convention

Conventional Commits:

```
<type>(<scope>): <imperative summary, <=72 chars>

Why the change was needed, what it does and what was verified on hardware.
Keep paragraphs at 72 columns.

Test: docs/02-hardware-tests.md Test N    (when verified on the board)
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, `ci`, `style`, `perf`.

Scopes: `app`, `editor`, `keymap`, `media`, `transport`, `styles`, `docs`, `tools`, `repo`.

- one logical change per commit; code, tests and the docs it invalidates belong together;
- no `wip`, `update`, `fix stuff` or pasted file lists;
- never commit with a failing check;
- public text has had the humanizer pass;
- tags are annotated and need approval.

## Documentation duties

| File | Role |
|---|---|
| `README.md` | user-facing state, quick start, limits, recovery |
| `docs/01-protocol.md` | wire format; update when the bytes or commands change |
| `docs/02-hardware-tests.md` | dated evidence, Test N; append, do not rewrite |
| `docs/03-media-keys.md` | consumer records and the media result |
| `docs/04-code-map.md` | module map and test layout; rewrite for `src/` |
| `docs/05-setup.md` | install, dev server, checks, Netlify |
| `docs/06-history.md` | milestones, lessons, open threads |

Never claim "works" from a `0x01` commit. Keep `docs/02-hardware-tests.md` factual and dated.

## Refactor state

Phases 1 to 5 are complete on `refactor/react`, based on tag `v1.0.1`. `main` still holds the v1
release. The toolchain, keymap, HID transport and transfer service, editor state/persistence, the
React editor and the advanced drawer are ported. Connection, editing, upload, restore, the log
drawer, diagnostics, the deep probe, the mailbox probe, the raw command card and the responsive
board are wired against the fake device.

Next is the visual polish pass, then the v1 docs rewrite and hardware Test 9. No hardware has
confirmed the React build yet.

The v1 files `index.html` (old product), `serve.js`, `start.cmd`, `tools/check-js.js`,
`tools/kmtest.js` and `tools/editortest2.js` are legacy. Do not use them as the test path. They
will be removed in Phase 7. The npm scripts are the current checks. `README.md`,
`docs/04-code-map.md` and `docs/05-setup.md` still describe the v1 app and are updated in Phase 7.

Keep the protocol behaviour identical through the refactor. Do not mix feature work into this
branch.

## Reporting

When a checkpoint is done, state:

1. what changed;
2. what you verified, including commands, output and whether hardware confirmed it;
3. what you did not do or could not verify;
4. what you need next.
