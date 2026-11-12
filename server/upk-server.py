#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UPK SERVER — upakofka tizimi uchun kichik server (v22)
======================================================
Faqat Python 3.7+ standart kutubxonasi. Hech narsa o'rnatish kerak emas.

Nima qiladi
  1) Tizimni tarmoqqa beradi:  http://SERVER:8080/  (dist/upakofka-tizimi.html).
     Kompyuter, planshet, Smart TV — istalgan brauzer shu manzil bilan ochadi.
  2) Postlar o'rtasida REJA va SARALASH HOLATINI almashadi — fayl tashish kerak
     emas (Smart TV da faylni ochib ham bo'lmaydi):

       GET  /api/ping                     server bormi
       GET  /api/plans                    rejalar ro'yxati, eng yangisi birinchi
       GET  /api/plans/<ID>               reja («upk-reja», P/M saqlagan)
       PUT  /api/plans/<ID>[?sort=1]      rejani joylash; sort=1 — saralashga yuborish
       GET  /api/current                  {"sort": ID, "name": ...} — hozir qaysi reja saralanadi
       GET  /api/state/<ID>/sort          saralash holati {"rev", "data", "dev", "ts"}
       PUT  /api/state/<ID>/sort          {"base": rev, "dev": "...", "data": {...}}
                                          base eskirgan bo'lsa — 409 (boshqa qurilma yozgan)

     <ID> — reja raqami: 6 ta 16-lik belgi (masalan 7CAF3A).

Ishga tushirish
  python server/upk-server.py                        # 0.0.0.0:8080, ma'lumot server/data
  python server/upk-server.py --port 9000 --data D:\\upk-data

Xavfsizlik
  Login yo'q — faqat sexning ICHKI tarmog'i uchun. Internetga ochmang.
"""
import argparse
import json
import os
import re
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

VERSION = 1
ID_RE = re.compile(r"^[0-9A-F]{6}$")
KINDS = ("sort",)
KEEP_PLANS = 300          # eng yangi shuncha reja saqlanadi, eskisi o'chadi


def now_ms():
    return int(time.time() * 1000)


class Store(object):
    """Papkadagi JSON fayllar. Yozish atomar (vaqtinchalik fayl + os.replace),
    o'qish-o'zgartirish-yozish bitta qulf ostida."""

    def __init__(self, root):
        self.root = os.path.abspath(root)
        self.lock = threading.Lock()
        for d in ("plans", "state"):
            os.makedirs(os.path.join(self.root, d), exist_ok=True)

    def _p(self, *parts):
        return os.path.join(self.root, *parts)

    @staticmethod
    def _read(path, default=None):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return default

    @staticmethod
    def _write(path, obj):
        d = os.path.dirname(path)
        fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, path)
        except BaseException:
            try:
                os.remove(tmp)
            except OSError:
                pass
            raise

    # ---- rejalar ----
    def plans(self):
        out = []
        for fn in os.listdir(self._p("plans")):
            if fn.endswith(".meta.json"):
                m = self._read(self._p("plans", fn))
                if isinstance(m, dict) and ID_RE.match(str(m.get("id", ""))):
                    out.append(m)
        out.sort(key=lambda m: m.get("ts", 0), reverse=True)
        return out

    def plan_get(self, pid):
        return self._read(self._p("plans", pid + ".json"))

    def plan_put(self, pid, obj, make_current):
        snap = obj.get("snapshot") or {}
        proj = snap.get("project") if isinstance(snap, dict) else None
        meta = {
            "id": pid,
            "name": str(obj.get("name") or "")[:200],
            "order": str(obj.get("order") or (proj or {}).get("mesOrder") or "")[:40],
            "proj": str(obj.get("proj") or "")[:40],
            "packs": obj.get("packs") if isinstance(obj.get("packs"), int) else None,
            "app": str(obj.get("app") or "")[:40],
            "ts": now_ms(),
        }
        with self.lock:
            self._write(self._p("plans", pid + ".json"), obj)
            self._write(self._p("plans", pid + ".meta.json"), meta)
            if make_current:
                self._write(self._p("current.json"), {"sort": pid, "ts": now_ms()})
            self._prune()
        return meta

    def _prune(self):
        metas = self.plans()
        cur = (self._read(self._p("current.json"), {}) or {}).get("sort")
        for m in metas[KEEP_PLANS:]:
            if m["id"] == cur:
                continue
            for fn in (m["id"] + ".json", m["id"] + ".meta.json"):
                try:
                    os.remove(self._p("plans", fn))
                except OSError:
                    pass
            for k in KINDS:
                try:
                    os.remove(self._p("state", m["id"] + "." + k + ".json"))
                except OSError:
                    pass

    # ---- joriy reja ----
    def current(self):
        c = self._read(self._p("current.json"), {}) or {}
        pid = c.get("sort")
        if pid and ID_RE.match(pid):
            m = self._read(self._p("plans", pid + ".meta.json"), {}) or {}
            return {"sort": pid, "name": m.get("name", ""), "order": m.get("order", ""), "ts": c.get("ts", 0)}
        return {"sort": None, "name": "", "order": "", "ts": 0}

    # ---- holat ----
    def state_get(self, pid, kind):
        s = self._read(self._p("state", pid + "." + kind + ".json"))
        return s if isinstance(s, dict) else {"rev": 0, "data": None, "dev": "", "ts": 0}

    def state_put(self, pid, kind, base, data, dev):
        path = self._p("state", pid + "." + kind + ".json")
        with self.lock:
            cur = self._read(path)
            rev = int(cur.get("rev", 0)) if isinstance(cur, dict) else 0
            if base != rev:
                return False, rev
            rev += 1
            self._write(path, {"rev": rev, "ts": now_ms(), "dev": str(dev or "")[:40], "data": data})
            # saralayotgan qurilma qaysi rejada bo'lsa — TV ham, postlar ham o'shanga ergashadi
            c = self._read(self._p("current.json"), {}) or {}
            if kind == "sort" and c.get("sort") != pid and os.path.exists(self._p("plans", pid + ".json")):
                self._write(self._p("current.json"), {"sort": pid, "ts": now_ms()})
            return True, rev


class Handler(BaseHTTPRequestHandler):
    server_version = "UPK/" + str(VERSION)
    store = None
    app_path = None
    max_body = 32 * 1024 * 1024
    quiet = False

    # ---- javob yordamchilari ----
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _err(self, code, msg):
        self._json(code, {"ok": False, "error": msg})

    def _body(self):
        """(True, obj) yoki (False, None) — ikkinchisida xato javobi allaqachon yuborilgan."""
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = -1
        if n < 0:
            self._err(400, "Content-Length noto'g'ri")
            return False, None
        if n > self.max_body:
            # Tana o'qilmasa mijoz javobni emas, «ulanish uzildi» ni ko'radi. Oqilona
            # hajmgacha o'qib tashlanadi; undan kattasida ulanish yopiladi.
            if n <= 4 * self.max_body:
                left = n
                while left > 0:
                    chunk = self.rfile.read(min(left, 1 << 16))
                    if not chunk:
                        break
                    left -= len(chunk)
            else:
                self.close_connection = True
            self._err(413, "juda katta (%d MB dan ortiq)" % (self.max_body // (1024 * 1024)))
            return False, None
        raw = self.rfile.read(n) if n else b""
        try:
            return True, json.loads(raw.decode("utf-8-sig") or "null")
        except (UnicodeDecodeError, ValueError):
            self._err(400, "JSON buzilgan")
            return False, None

    def log_message(self, fmt, *args):
        if not self.quiet:
            sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    # ---- marshrutlar ----
    def _route(self):
        u = urlsplit(self.path)
        parts = [p for p in u.path.split("/") if p]
        return parts, parse_qs(u.query)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parts, _q = self._route()
        if not parts or parts == ["index.html"]:
            return self._app()
        if parts == ["favicon.ico"]:
            self.send_response(204)
            self.end_headers()
            return None
        if parts[0] != "api":
            return self._err(404, "topilmadi")
        api = parts[1:]
        if api == ["ping"]:
            return self._json(200, {"ok": True, "server": "upk", "v": VERSION, "time": now_ms()})
        if api == ["plans"]:
            return self._json(200, {"ok": True, "plans": self.store.plans()[:100]})
        if api == ["current"]:
            return self._json(200, dict(self.store.current(), ok=True))
        if len(api) == 2 and api[0] == "plans" and ID_RE.match(api[1]):
            obj = self.store.plan_get(api[1])
            return self._json(200, obj) if obj is not None else self._err(404, "bunday reja yo'q")
        if len(api) == 3 and api[0] == "state" and ID_RE.match(api[1]) and api[2] in KINDS:
            return self._json(200, dict(self.store.state_get(api[1], api[2]), ok=True))
        return self._err(404, "topilmadi")

    def do_PUT(self):
        parts, q = self._route()
        api = parts[1:] if parts and parts[0] == "api" else None
        if api and len(api) == 2 and api[0] == "plans" and ID_RE.match(api[1]):
            ok, obj = self._body()
            if not ok:
                return None
            if not isinstance(obj, dict) or obj.get("format") != "upk-reja" or not isinstance(obj.get("snapshot"), dict):
                return self._err(400, "bu upakofka reja fayli emas")
            if obj.get("planId") != api[1]:
                return self._err(400, "reja raqami manzildagi bilan mos emas")
            meta = self.store.plan_put(api[1], obj, (q.get("sort") or [""])[0] == "1")
            return self._json(200, {"ok": True, "plan": meta})
        if api and len(api) == 3 and api[0] == "state" and ID_RE.match(api[1]) and api[2] in KINDS:
            ok, obj = self._body()
            if not ok:
                return None
            if not isinstance(obj, dict) or not isinstance(obj.get("data"), dict):
                return self._err(400, "holat: {base, data} kutilgan edi")
            try:
                base = int(obj.get("base") or 0)
            except (TypeError, ValueError):
                return self._err(400, "base butun son bo'lishi kerak")
            ok, rev = self.store.state_put(api[1], api[2], base, obj["data"], obj.get("dev"))
            if not ok:
                return self._json(409, {"ok": False, "conflict": True, "rev": rev,
                                        "error": "holat boshqa qurilmada o'zgargan"})
            return self._json(200, {"ok": True, "rev": rev})
        return self._err(404, "topilmadi")

    def _app(self):
        try:
            with open(self.app_path, "rb") as f:
                body = f.read()
        except OSError:
            return self._err(500, "tizim fayli topilmadi: %s (avval build.ps1)" % self.app_path)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        return None


def main(argv=None):
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description="UPK server — upakofka tizimi postlari uchun")
    ap.add_argument("--host", default="0.0.0.0", help="tinglash manzili (standart: hamma tarmoq)")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--data", default=os.path.join(here, "data"), help="ma'lumot papkasi")
    ap.add_argument("--app", default=os.path.join(here, "..", "dist", "upakofka-tizimi.html"),
                    help="beriladigan tizim fayli")
    ap.add_argument("--max-mb", type=int, default=32, help="bitta so'rovning eng katta hajmi, MB")
    ap.add_argument("--quiet", action="store_true", help="so'rovlarni yozmaslik")
    a = ap.parse_args(argv)

    Handler.store = Store(a.data)
    Handler.app_path = os.path.abspath(a.app)
    Handler.max_body = max(1, a.max_mb) * 1024 * 1024
    Handler.quiet = a.quiet
    if not os.path.exists(Handler.app_path):
        sys.stderr.write("OGOHLANTIRISH: tizim fayli yo'q: %s — avval build.ps1\n" % Handler.app_path)
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    srv.daemon_threads = True
    sys.stderr.write("UPK server: http://%s:%d/  ma'lumot: %s\n" % (
        "localhost" if a.host in ("0.0.0.0", "") else a.host, a.port, Handler.store.root))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
