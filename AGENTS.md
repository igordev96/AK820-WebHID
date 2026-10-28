# Agent Instructions — AK820 WebHID

This project is owned by igordev96. Be a collaborator, not an autopilot.

The product is one file: `index.html`. It reprograms a physical keyboard, so a bad change is not
a failed build — it is a keyboard that types the wrong thing.

---

## Before you start

Read, in this order:

1. `README.md` — what the tool does and its limitations.
2. `docs/05-code-map.md` — the editor, transport and test markers.
3. `docs/03-hardware-tests.md` — what was actually verified on the board.
4. `docs/01-protocol.md` — the wire format.

The vendor binaries, layout XML, artwork and installer are **not** in this repository and must
not be added. The private research repository is the only place for them.

---

## Ask before acting

Stop and ask for approval before:

- rewriting git history, moving tags, pushing, or changing remotes;
- changing `FACTORY_KEYS`, `FN_LOCKED`, `encodeRecord`, `buildTable`, `sendTable`, `waitReply`,
  the 576-byte layout, the `AA 55` trailer, or the begin/announce/commit order;
- writing to a physical keyboard. State which layer and slot will be written and how to undo it;
- adding a dependency, a build step, a bundler, a framework, or a second HTML/JS file;
- publishing vendor material or adding anything from the private lab.

Read-only commands (`git status`, `log`, `diff`, reading files) need no approval.

---

## Checks

Node.js 22.5+ is needed only for the server and the checks. All three must pass before a commit:

```bat
node tools\check-js.js index.html
node tools\kmtest.js index.html
node tools\editortest2.js index.html
```

The harnesses slice `index.html` by banner comments; keep the markers described in `docs/05` §4.
A change that moves code across a marker must update both harnesses.

Run the page with `start.cmd` or `node serve.js`, then <http://localhost:8765/>.

---

## Invariants that break hardware

1. **One transfer at a time.** The page holds a busy lock; keep it.
2. **Abort on a refused begin or announce.** Send `04 F0` and stage nothing.
3. **Poll for a stamped reply.** `byte[1] == cmd && byte[3] != 0`; settle 220 ms, poll 60 ms.
4. **Always 576 bytes**, record at `idx * 4`, `AA 55` at 574–575, `idx <= 142`.
5. **Fn layer: zero = firmware default.** Never seed it with `FACTORY_KEYS`; `fnlayer_disable`
   keys are read-only there.
6. **The record page is explicit.** `media` selects record `0x03`; never infer it from the usage
   number (`0xE2` is Left Alt and Mute, `0xCD` is below `0xE7`). Raw text uses `c:0x…`.
7. **`applied`/`appliedMedia` move only on `commit 0x01`**, and persistence happens only after
   success.
8. **The mailbox is not behavioural evidence.** Only typing on the board proves a remap; record
   the user's confirmation in `docs/03`.

Full list: `docs/05` §3.

---

## Commit convention

Conventional Commits:

```
<type>(<scope>): <imperative summary, <=72 chars>

Why the change was needed, what it does, and what was verified on hardware.
Keep paragraphs at 72 columns.

Test: docs/03 Test N        (when behaviour was verified on the board)
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, `ci`, `style`, `perf`.
Scopes: `app`, `editor`, `keymap`, `media`, `transport`, `docs`, `tools`, `repo`.

- one logical change per commit; code, tests and the docs it invalidates belong together;
- no `wip`, `update`, `fix stuff`, or pasted file lists;
- never commit with a failing check;
- tags are annotated and need approval.

---

## Documentation duties

| File | Role |
|---|---|
| `README.md` | user-facing state, quick start, limits, recovery |
| `docs/03-hardware-tests.md` | dated evidence, Test N; append, do not rewrite |
| `docs/05-code-map.md` | structure, functions, state, harness markers |
| `docs/06-setup.md` | local setup, checks, troubleshooting |
| `docs/08-history.md` | milestones, lessons, open threads |

Never claim “works” from a `0x01` commit. Keep `docs/03` factual and dated.

---

## Reporting

When a checkpoint is done, state:

1. what changed;
2. what you verified (commands, output, and whether hardware confirmed it);
3. what you did **not** do or could not verify;
4. what you need next.
