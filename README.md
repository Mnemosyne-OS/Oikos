<img src="docs/logo.svg" alt="" width="88" align="left" hspace="16" vspace="4">

# Oikos, your home remembered

A [Mnemosyne OS](https://github.com/Mnemosyne-OS/Mnemosyne-Neural-OS) cartridge that
reads what your Home Assistant already knows (temperatures, doors, motion, who is
home) and can save camera stills into your own memory so you can search them later.

**It only ever reads.** It cannot switch anything on or off, and that is not a
setting: the only door it holds is a GET, and there is no other one for it to call.

*Oikos* (οἶκος) is the Greek word for the household, the root of both "economy" and
"ecology". It names the home itself rather than the deity who guards it.

> [!WARNING]
> **This has never been run against a real Home Assistant.**
>
> It is written, typed, linted and covered by 76 tests, and it has been driven end
> to end against fixtures. But the author has no Home Assistant box. Nobody has yet
> watched it read a real thermostat, and nobody has watched it save a real camera
> still.
>
> So this is a request for help rather than a product announcement. If you run Home
> Assistant and Mnemosyne OS, **please break it and tell me where**. See
> [What would help most](#what-would-help-most). Version 0.1.0 means what it says.

---

## What it does

- **Reads your sensors.** Everything Home Assistant reports that Oikos can only
  read: temperatures, humidity, doors and windows, motion, device trackers, people,
  weather. Grouped by kind, never dumped as a list of entity ids.
- **Keeps watching while its window is closed.** Optional. It tells you what moved
  while you were away, with the actual reading rather than just "something changed".
- **Saves camera stills into your memory.** One click, or on a rhythm. The pictures
  land in Oikos's own vault folder as real files, where Mnemosyne indexes them, so
  months later you can ask which days it snowed, or when the gate was left open.

## What it deliberately does not do

- **It cannot control anything.** Reading a sensor and switching a device are
  different acts needing different consent, and only the first one is built.
- **No live video.** RTSP does not play in a browser, and transcoding it is a
  server's job. A still is the better trade anyway: a still is what your memory can
  search a year later.
- **No device drivers.** Home Assistant already speaks to a thousand brands. Oikos
  reads one endpoint, `/api/states`, and nothing else.
- **Nothing runs when Mnemosyne OS is closed.** The background watch is a timer
  inside the app rather than a service. A home monitor that quietly stopped when you
  quit would be the one lie this cannot afford.

## What you need

1. **Mnemosyne OS**, new enough to carry local-network access
   ([latest release](https://github.com/Mnemosyne-OS/Mnemosyne-Neural-OS/releases/latest)).
   Oikos asks the app what it can do and says so plainly if the answer is no. It
   never renders an empty dashboard and leaves you guessing.
2. **Home Assistant** on the same network.
3. **A long-lived access token.** In Home Assistant, click your profile, scroll to
   the bottom, "Create token".

Then: address (`192.168.1.8:8123` is fine, no scheme needed), token, Connect.
Mnemosyne asks you before Oikos touches the device, and asks again for any other one.

## Permissions, and what they actually grant

| Manifest | What it means in practice |
|---|---|
| `net:lan` | The right to **ask** about a device. Mnemosyne then asks *you* about each `host:port` separately and remembers your answer. Approving your Home Assistant says nothing about your camera, and a different port on the same box is a different door. |
| `watch:background` | Keep reading while the window is closed, and notify you when a reading moves. Only while Mnemosyne OS itself is running. |
| `vault:write` | Save camera stills into **Oikos's own vault** and nowhere else. Mnemosyne derives that folder from the app id, so Oikos never passes a path and cannot get one wrong. |

All three are revocable. Local-network grants live in **Settings → Governance**, and
revoking one stops the background watch on its next pass, because the permission is
re-read every time instead of being cached when you granted it.

## Cameras

Capture by hand, one click per camera, or start a rhythm. **The rhythm only runs
while this window is open**, and the panel says so where the switch is: a folder that
quietly stopped filling is worse than one that never started, because someone goes
looking for a particular day and finds a gap nobody told them about.

The panel also states how big the archive really gets before you start it. "One an
hour" sounds small; a year of it is 8,760 files. They are real files in your vault
folder, so you can open it, look at them, and delete any of them.

## Where your token is kept

In Oikos's own settings blob on your machine: a plain local file, not a vault, and
not encrypted. The interface says so where you paste it. A Home Assistant long-lived
token is revocable from Home Assistant itself, which is the real protection and the
one worth telling you about instead of implying secrecy that is not there.

## The rules the code keeps

These have tests behind them, and they are the part worth reviewing:

- **A device that is not answering never becomes a number.** Home Assistant says
  `unavailable` and `unknown` all day, and in JavaScript `Number('')` is `0`, so a
  dead battery would render as a room at zero degrees. It shows `—` instead.
- **An unreadable device keeps its tile.** Hiding it would shrink your house a little
  every time a battery died.
- **An empty answer from Home Assistant reads differently from a failure to reach
  it.** Those are different statements and the code keeps them apart.
- **A truncated response shows nothing at all.** Half a house presented as the whole
  one is worse than saying so, and half a JPEG is a corrupt file rather than a small
  one.
- **A still that came back as text is refused instead of stored.** Otherwise a login
  page ends up in your archive under a `.jpg` name, as though it were that day's
  picture.
- **Every capture writes an outcome, good or bad.** A snapshot that went nowhere must
  not look like one that was saved.
- **An older Mnemosyne gets a named reason and an offer to update**, never an empty
  grid. An empty grid is indistinguishable from a broken app.

## What would help most

In rough order of usefulness:

1. **Does it read your box at all?** Address, token, Connect. If it fails, the
   message it shows is the useful part, so please paste it.
2. **Does anything show a wrong number?** Especially a sensor that is offline,
   unavailable, or reporting something unusual. A fabricated reading is the bug I
   care about most.
3. **Camera stills.** Do they save? Do they look right? Some Home Assistant camera
   integrations behave differently behind `/api/camera_proxy/`, and I have tested
   none of them.
4. **The background watch.** Turn it on, close the window, come back. Does what it
   reports match what actually happened?
5. **Anything that says something untrue.** If a screen claims something the app did
   not do, that is a bug at the top of the list regardless of severity.

Open an issue with what you did, what you expected, and what the screen said.
Screenshots of a wrong number are worth a lot.

There are no screenshots in this README for the same reason as the warning at the
top: the only ones that could be taken honestly are of an app that cannot reach
anything.

## Development

```bash
pnpm install
pnpm dev        # port 5216
pnpm test
pnpm lint
pnpm build
```

Run it standalone in a browser and you will get the "this OS cannot reach your local
network" screen. Outside the Mnemosyne frame there is no capability list to ask, and
that is the correct answer rather than a bug.

## License

MIT. See [LICENSE](LICENSE).

## The mark

A house in terracotta, the colour this project uses for the human's own things.
Above it the same roofline again, lighter, in the teal it uses for memory: the
same house, remembered. The doorway is lit, because a home you can still see into
is the whole point.

[`docs/logo.svg`](docs/logo.svg) is the full mark and
[`docs/logo-small.svg`](docs/logo-small.svg) drops the echo for sizes where it
would only muddy the silhouette. [`docs/social-preview.png`](docs/social-preview.png) is the
1280x640 banner, with [its source](docs/social-preview.svg) beside it.
