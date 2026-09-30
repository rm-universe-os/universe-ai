#!/usr/bin/env python3
"""Tell the mascot when a film - or a song - is playing.

Watches the session bus for MPRIS players (`org.mpris.MediaPlayer2.*`) and
prints one JSON line whenever either answer changes: "is a film playing"
(`cinema`) and "is something playing that is not a film" (`music`).

    {"cinema": true, "music": false, "player": "vlc", "title": "Blade
     Runner", "artist": "", "why": "video"}
    {"cinema": false, "music": true, "player": "Spotify", "title": "Song",
     "artist": "Band", "why": "audio"}

MPRIS is the right hook because it is the one thing every player in the wild
agrees on: VLC, mpv (built in since 0.33), Celluloid, Totem, Parole, and both
Chrome and Firefox publish a player while a video is playing.  Nothing else
covers all of them - a window-title heuristic misses the browser, and the
screensaver-inhibit signal is also taken by music players and by anything that
merely keeps the screen awake.

Classification.  A player is only "cinema" when it is actually *playing* and
the media looks like a film rather than a song:

  * the URI has an audio extension -> never a film, and this is checked first
    so that a song playing in VLC does not count;
  * the URI has a video container extension, or
  * the player identifies itself as a video player (vlc, mpv, totem, ...), or
  * `mpris:length` is at least `--min-length` (a film is long).

Browsers are their own case, and they are why this file has two thresholds.
Chrome and Firefox publish a player with the *page* as the track: the URL has
no extension, and the length is whatever the site's media session declares.
Measured against a real Chrome (v0.3.29): a playing <video> publishes
`PlaybackStatus=Playing` with a correct `mpris:length` and `xesam:title`, and
publishes nothing at all while it is paused or stopped.  So the length is
trustworthy when it is there - it is just that `--min-length` (eight minutes,
which is right for "is this a film or a song in VLC") also threw away every
YouTube-length video, which is exactly what people watch in a browser.  A
browser therefore gets `--browser-min-length`, one minute by default, and a
browser whose site declares no length at all is believed once it has been
playing that long.

Music.  The `music` answer is deliberately the *complement* of the film one,
computed from the same classifier rather than from a second, weaker
heuristic, so the two can never disagree with each other: a song is music
whatever is playing it (a three-minute track in VLC has an audio extension,
a short length and no video container), and a browser playing audio-length
media is music too.  A player that is paused or stopped is neither - the
mascot only dresses up for something that is actually playing.

The one place this is optimistic is a browser whose page declares no length
at all: until `--browser-min-length` has passed it is genuinely unknown
whether that is a film or a song, and it is reported as music.  A site that
does declare a length - which is every video site worth the name - is
classified correctly from the first second.

`cinema` and `music` are not exclusive: a film in VLC and a song in Spotify
can both be playing, and both are reported.  Which prop the mascot ends up
wearing when that happens is the mascot's business, not this script's.

The process is a long-lived child of the Electron main process.  It never
writes anything but JSON to stdout, and it exits quietly when there is no
session bus, so a broken D-Bus can never keep the app from starting.
"""
import argparse
import json
import os
import sys
import time

MPRIS_PREFIX = "org.mpris.MediaPlayer2."
PLAYER_IFACE = "org.mpris.MediaPlayer2.Player"
PROPS_IFACE = "org.freedesktop.DBus.Properties"
PLAYER_PATH = "/org/mpris/MediaPlayer2"
BUS_NAME = "org.freedesktop.DBus"
BUS_PATH = "/org/freedesktop/DBus"

VIDEO_EXT = (
    ".mp4", ".m4v", ".mkv", ".webm", ".avi", ".mov", ".mpg", ".mpeg",
    ".wmv", ".flv", ".ogv", ".ogg", ".ts", ".m2ts", ".mts", ".3gp", ".vob",
    ".divx", ".rmvb", ".m3u8", ".mpd",
)

# A file we can name as audio is never a film, whatever is playing it.  This
# rule has to come *before* the video-player rule: VLC is a video player that
# also plays MP3s, and without this a song in VLC put the glasses on.
AUDIO_EXT = (
    ".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".oga", ".opus", ".wma",
    ".aiff", ".aif", ".alac", ".ape", ".mid", ".midi", ".mka",
)

VIDEO_PLAYERS = (
    "vlc", "mpv", "celluloid", "totem", "parole", "smplayer", "kmplayer",
    "mplayer", "dragon", "xine", "gst-play", "clapper", "showtime",
    "kaffeine", "baka", "mplayer2", "gnome-mplayer",
)

# Chrome and Firefox publish MPRIS too; they play both music and video, so
# they are classified purely on the media, never on the player name.
BROWSERS = ("chrome", "chromium", "firefox", "brave", "vivaldi", "opera",
            "epiphany", "edge")

DEFAULT_MIN_LENGTH = 8 * 60  # seconds; a film is longer than a song

# A browser is not a film library: everything worth putting the glasses on for
# is at least a minute long, and the sites that report no length at all get
# believed after that long.  See the note in the module docstring.
DEFAULT_BROWSER_MIN_LENGTH = 60


def log(*parts):
    print(*parts, file=sys.stderr, flush=True)


class Watcher:
    def __init__(self, min_length, browser_min_length=DEFAULT_BROWSER_MIN_LENGTH,
                 verbose=False):
        import gi

        gi.require_version("Gio", "2.0")
        from gi.repository import Gio, GLib

        self.Gio = Gio
        self.GLib = GLib
        self.min_length = min_length
        self.browser_min = browser_min_length
        self.verbose = verbose
        self.bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
        self.players = {}          # bus name -> last known dict
        self.playing_since = {}    # bus name -> monotonic time it started
        self.state = None          # last emitted answer
        self.interval = 1.0

    # -- bus helpers ------------------------------------------------------
    def call(self, name, path, iface, method, params=None, timeout=800):
        return self.bus.call_sync(
            name, path, iface, method, params,
            None, self.Gio.DBusCallFlags.NONE, timeout, None)

    def list_players(self):
        try:
            reply = self.call(BUS_NAME, BUS_PATH, BUS_NAME,
                              "ListNames", None)
            names = reply.unpack()[0]
        except Exception as exc:            # pragma: no cover - bus trouble
            if self.verbose:
                log("ListNames failed:", exc)
            return []
        return [n for n in names if n.startswith(MPRIS_PREFIX)]

    def read_player(self, name):
        """Everything we need about one player, or None if it went away."""
        try:
            status = self.call(
                name, PLAYER_PATH, PROPS_IFACE, "Get",
                self.GLib.Variant("(ss)", (PLAYER_IFACE, "PlaybackStatus")),
            ).unpack()[0]
            meta = self.call(
                name, PLAYER_PATH, PROPS_IFACE, "Get",
                self.GLib.Variant("(ss)", (PLAYER_IFACE, "Metadata")),
            ).unpack()[0]
        except Exception:
            return None
        try:
            identity = self.call(
                name, PLAYER_PATH, PROPS_IFACE, "Get",
                self.GLib.Variant("(ss)",
                                  ("org.mpris.MediaPlayer2", "Identity")),
            ).unpack()[0]
        except Exception:
            identity = name[len(MPRIS_PREFIX):]

        url = ""
        title = ""
        length = 0
        artists = []
        try:
            url = meta.get("xesam:url", "") or ""
            title = meta.get("xesam:title", "") or ""
            length = int(meta.get("mpris:length", 0) or 0) // 1000000
            artists = [str(a) for a in (meta.get("xesam:artist") or [])]
        except Exception:
            pass
        return {
            "status": str(status),
            "identity": str(identity),
            "url": str(url),
            "title": str(title),
            "length": length,
            "artists": artists,
        }

    # -- classification ---------------------------------------------------
    def is_cinema(self, name, info):
        if info.get("status") != "Playing":
            return False, "paused"
        url = (info.get("url") or "").split("?", 1)[0].lower()
        if url.endswith(VIDEO_EXT):
            return True, "video"
        if url.endswith(AUDIO_EXT):
            return False, "audio"
        identity = (info.get("identity") or "").lower()
        if any(b in identity for b in BROWSERS):
            # A browser plays whatever the page gives it.  The length it
            # declares is the site's own duration, so it is trusted - but
            # against the browser threshold, not the film one.  A site that
            # declares nothing is believed once it has been playing a while.
            length = info.get("length", 0)
            if length >= self.browser_min:
                return True, "browser-long"
            if length <= 0 and info.get("played_for", 0) >= self.browser_min:
                return True, "browser-unknown"
            return False, "browser-short"
        if any(p in identity for p in VIDEO_PLAYERS):
            return True, "player"
        if info.get("length", 0) >= self.min_length:
            return True, "long"
        return False, "music"

    def is_music(self, name, info):
        """Is this player playing something that is not a film?

        The sibling question, and the reason it is answered *from* `is_cinema`
        rather than next to it: one classifier means the headphones and the
        glasses can never both be wrong at once.  Everything `is_cinema` has
        already worked out is reused here; all this adds is the "and it is
        playing" part, which is why a paused player is neither.

        `why` is passed straight through, so a line reads `"why": "audio"`
        for a song in VLC and `"why": "music"` for a short track in a player
        that is not a video one - see the note on browsers in the docstring.
        """
        if info.get("status") != "Playing":
            return False, "paused"
        cinema, why = self.is_cinema(name, info)
        if cinema:
            return False, why
        return True, why

    def poll(self):
        """Return the current answer, or None when nothing changed."""
        live = set(self.list_players())
        for gone in list(self.players):
            if gone not in live:
                del self.players[gone]
        for gone in list(self.playing_since):
            if gone not in live:
                del self.playing_since[gone]

        now = time.monotonic()
        best = None
        best_music = None
        for name in sorted(live):
            info = self.read_player(name)
            if info is None:
                self.players.pop(name, None)
                continue
            # How long this player has been playing, for the sites that report
            # no length at all.  Reset the moment it stops.
            if info.get("status") == "Playing":
                self.playing_since.setdefault(name, now)
            else:
                self.playing_since.pop(name, None)
            info["played_for"] = now - self.playing_since.get(name, now)
            self.players[name] = info
            identity = info["identity"]
            browser = any(b in identity.lower() for b in BROWSERS)
            cinema, why = self.is_cinema(name, info)
            if cinema:
                candidate = {
                    "cinema": True,
                    "player": identity,
                    "title": info["title"],
                    "artist": ", ".join(info["artists"]),
                    "why": why,
                }
                # Prefer a real video player over a browser when both play.
                if best is None or candidate["why"] in ("video", "player"):
                    best = candidate
                continue
            music, why = self.is_music(name, info)
            if music:
                candidate = {
                    "cinema": False,
                    "music": True,
                    "player": identity,
                    "title": info["title"],
                    "artist": ", ".join(info["artists"]),
                    "why": why,
                    "browser": browser,
                }
                # And a dedicated music player over a browser, for the same
                # reason: Spotify should win over the tab that is streaming
                # a radio station.
                if best_music is None or (best_music["browser"] and not browser):
                    best_music = candidate

        # The player/title/artist on the line describe the film when there is
        # one and the song otherwise, so the common case needs no second set
        # of keys.  Both booleans are always present and always independent.
        if best is not None:
            out = dict(best)
            out["music"] = best_music is not None
        elif best_music is not None:
            out = dict(best_music)
        else:
            out = {
                "cinema": False,
                "music": False,
                "player": "",
                "title": "",
                "artist": "",
                "why": "idle",
            }
        out.pop("browser", None)
        return out

    def run(self):
        self.emit(self.poll(), force=True)
        while True:
            time.sleep(self.interval)
            try:
                now = self.poll()
            except Exception as exc:        # pragma: no cover - bus trouble
                if self.verbose:
                    log("poll failed:", exc)
                continue
            self.emit(now)

    def emit(self, now, force=False):
        """Print one line, unless nothing the mascot cares about changed.

        Both answers are in the key: a song starting while a film plays is
        still a change worth reporting, even though the film's own fields did
        not move.  The artist is in there too, so a radio stream that rolls
        into the next track tells the pet what is on now.
        """
        key = (now.get("cinema"), now.get("music"), now.get("title"),
               now.get("player"), now.get("artist"))
        last = self.state
        if not force and last is not None and \
                (last.get("cinema"), last.get("music"), last.get("title"),
                 last.get("player"), last.get("artist")) == key:
            return
        self.state = now
        if self.verbose:
            log("emit:", json.dumps(now, ensure_ascii=False))
        sys.stdout.write(json.dumps(now, ensure_ascii=False) + "\n")
        sys.stdout.flush()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--min-length", type=int, default=DEFAULT_MIN_LENGTH,
                    help="seconds of media that count as a film in a video "
                         "player (default: %(default)s)")
    ap.add_argument("--browser-min-length", type=int,
                    default=DEFAULT_BROWSER_MIN_LENGTH,
                    help="seconds of media that count as a film in a browser "
                         "(default: %(default)s)")
    ap.add_argument("--verbose", action="store_true",
                    help="also log to stderr")
    ap.add_argument("--once", action="store_true",
                    help="print the current answer and exit (for tests)")
    args = ap.parse_args()

    if not os.environ.get("DBUS_SESSION_BUS_ADDRESS"):
        log("cinema-watch: no session bus; nothing to watch")
        return 0
    try:
        watcher = Watcher(args.min_length, args.browser_min_length,
                          verbose=args.verbose)
    except Exception as exc:
        log("cinema-watch: cannot reach the session bus:", exc)
        return 0
    if args.once:
        watcher.emit(watcher.poll(), force=True)
        return 0
    try:
        watcher.run()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
