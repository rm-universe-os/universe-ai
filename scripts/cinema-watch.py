#!/usr/bin/env python3
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

AUDIO_EXT = (
    ".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".oga", ".opus", ".wma",
    ".aiff", ".aif", ".alac", ".ape", ".mid", ".midi", ".mka",
)

VIDEO_PLAYERS = (
    "vlc", "mpv", "celluloid", "totem", "parole", "smplayer", "kmplayer",
    "mplayer", "dragon", "xine", "gst-play", "clapper", "showtime",
    "kaffeine", "baka", "mplayer2", "gnome-mplayer",
)

BROWSERS = ("chrome", "chromium", "firefox", "brave", "vivaldi", "opera",
            "epiphany", "edge")

DEFAULT_MIN_LENGTH = 8 * 60

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
        self.players = {}
        self.playing_since = {}
        self.state = None
        self.interval = 1.0

    def call(self, name, path, iface, method, params=None, timeout=800):
        return self.bus.call_sync(
            name, path, iface, method, params,
            None, self.Gio.DBusCallFlags.NONE, timeout, None)

    def list_players(self):
        try:
            reply = self.call(BUS_NAME, BUS_PATH, BUS_NAME,
                              "ListNames", None)
            names = reply.unpack()[0]
        except Exception as exc:
            if self.verbose:
                log("ListNames failed:", exc)
            return []
        return [n for n in names if n.startswith(MPRIS_PREFIX)]

    def read_player(self, name):
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

    def poll(self):
        live = set(self.list_players())
        for gone in list(self.players):
            if gone not in live:
                del self.players[gone]
        for gone in list(self.playing_since):
            if gone not in live:
                del self.playing_since[gone]

        now = time.monotonic()
        best = None
        for name in sorted(live):
            info = self.read_player(name)
            if info is None:
                self.players.pop(name, None)
                continue

            if info.get("status") == "Playing":
                self.playing_since.setdefault(name, now)
            else:
                self.playing_since.pop(name, None)
            info["played_for"] = now - self.playing_since.get(name, now)
            self.players[name] = info
            cinema, why = self.is_cinema(name, info)
            if cinema:
                candidate = {
                    "cinema": True,
                    "player": info["identity"],
                    "title": info["title"],
                    "artist": ", ".join(info["artists"]),
                    "why": why,
                }

                if best is None or candidate["why"] in ("video", "player"):
                    best = candidate

        if best is None:
            best = {"cinema": False, "player": "", "title": "", "why": "idle"}
        return best

    def run(self):
        self.emit(self.poll(), force=True)
        while True:
            time.sleep(self.interval)
            try:
                now = self.poll()
            except Exception as exc:
                if self.verbose:
                    log("poll failed:", exc)
                continue
            self.emit(now)

    def emit(self, now, force=False):
        key = (now.get("cinema"), now.get("title"), now.get("player"))
        last = self.state
        if not force and last is not None and \
                (last.get("cinema"), last.get("title"), last.get("player")) == key:
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
