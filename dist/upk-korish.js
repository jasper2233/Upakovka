/* ============================================================
   UPK-KORISH — qadoqlash terminali uchun 3D + 2D koʻruvchi (U5)
   ============================================================
   Upakofka (MIT) — https://github.com/jasper2233/Upakovka
   Kelishuv: docs/mes-kelishuv.md §3.5–3.6. MES qadoqlash terminalida pochka
   ekranning 2/3 qismida 3D, 1/3 qismida joriy qavat 2D (ustdan) koʻrinadi:
   qadoqchi pochkani upakofka qogʻoziga qayta terib yopadi va har detal qayerga
   yotishini koʻrishi kerak.

   MUSTAQIL FAYL: upakofka sahifasiga bogʻliq emas, tashqi kutubxona yoʻq.
   Kirish — MES rejasining (format `upakofka-plan`, versiya 2) BITTA pochkasi.
   MES uni `frontend/public/upakofka/` ga oʻzgarishsiz nusxalaydi.

   ISHLATISH
     var v = UpkKorish.create(div);             // div ichiga ikki kanvas chiziladi
     v.setPack(reja.packs[2]);                  // P03
     v.setState({ done:[...ID], next:ID, wrong:ID, changed:[...ID] });
     v.destroy();

     UpkKorish.tekshir(pack, doneIds, scanId)   // tartib qoidasi (§3.5)
       -> { ok:true } | { ok:false, sabab:"...", matn:"..." }
       sabab: boshqa_pochka | takror | avval_tag | qopqoq_oxirida
     UpkKorish.keyingi(pack, doneIds)           // reja tartibidagi keyingi qadam

   ID lar MES chekidagi satr (`B-2026-001_100301_001_1`) yoki prefikssiz
   (`100301_001_1`) — ikkalasi bir xil hisoblanadi.

   RANGLAR (kanvasda CSS oʻzgaruvchisi ishlamaydi — shu yerda):
     qoʻyilgan        — yogʻoch rangi (tag — toʻq)
     keyingi (next)   — sariq
     notoʻgʻri (wrong)— QIZIL, miltillaydi (skan rad etildi)
     almashgan        — toʻq sariq, xira miltillaydi (qayta rejada pochkasi oʻzgargan)
     kutilmoqda       — xira punktir
   ============================================================ */
(function (root) {
  "use strict";

  var PREFIX = /^B-\d{4}-\d+_/;
  function key(s) { return String(s == null ? "" : s).trim().replace(PREFIX, ""); }
  function stepKey(st) { return key(st && (st.mes_id || st.mes_key)); }

  var COL = {
    base: "#a5714c", done: "#c9a46c", next: "#ffc629", wrong: "#e5484d",
    changed: "#f08a24", floor0: "#20242b", floor1: "#171a1f", ink: "#8a92a0"
  };

  /* ---------- tartib qoidasi (kelishuv §3.5) ----------
     tag (0-qavat) — birinchi; qavat va quyruq — erkin, lekin qopqoqdan (ust)
     oldin; ust — oxirgi; nostandart pochka (bogʻ) — erkin. */
  function tekshir(pack, doneIds, scanId) {
    var steps = (pack && pack.steps) || [];
    var k = key(scanId), done = {};
    (doneIds || []).forEach(function (d) { done[key(d)] = 1; });
    var st = null;
    for (var i = 0; i < steps.length; i++) if (stepKey(steps[i]) === k) { st = steps[i]; break; }
    if (!st) return { ok: false, sabab: "boshqa_pochka", matn: "Bu detal " + (pack && pack.code || "bu") + " pochkaniki emas" };
    if (done[k]) return { ok: false, sabab: "takror", matn: "Bu detal allaqachon qoʻyilgan" };
    if (pack.kind === "nostandart") return { ok: true };
    var qolgan = function (pred) {
      return steps.filter(function (s) { return pred(s) && !done[stepKey(s)]; });
    };
    if (st.role !== "tag" && qolgan(function (s) { return s.role === "tag"; }).length)
      return { ok: false, sabab: "avval_tag", matn: "Avval tag detalni qoʻying" };
    if (st.role === "ust" && qolgan(function (s) { return s.role !== "ust" && s.role !== "tag"; }).length)
      return { ok: false, sabab: "qopqoq_oxirida", matn: "Qopqoq — oxirida: avval qolgan qavatlarni tering" };
    return { ok: true };
  }

  /* Reja tartibida keyingi qoʻyilishi mumkin boʻlgan qadam (yoki null — tayyor) */
  function keyingi(pack, doneIds) {
    var steps = (pack && pack.steps) || [], done = {};
    (doneIds || []).forEach(function (d) { done[key(d)] = 1; });
    for (var i = 0; i < steps.length; i++) {
      var k = stepKey(steps[i]);
      if (k && !done[k] && tekshir(pack, doneIds, k).ok) return steps[i];
    }
    return null;
  }

  /* ---------- geometriya ---------- */
  function boxFaces(x, y, z, a, b, h) {
    var X = [x, x + a], Y = [y, y + b], Z = [z, z + h];
    var v = [[X[0], Y[0], Z[0]], [X[1], Y[0], Z[0]], [X[1], Y[1], Z[0]], [X[0], Y[1], Z[0]],
             [X[0], Y[0], Z[1]], [X[1], Y[0], Z[1]], [X[1], Y[1], Z[1]], [X[0], Y[1], Z[1]]];
    return [{ i: [4, 5, 6, 7], s: 1.00, n: [0, 0, 1] }, { i: [0, 3, 2, 1], s: 0.40, n: [0, 0, -1] },
            { i: [0, 1, 5, 4], s: 0.62, n: [0, -1, 0] }, { i: [2, 3, 7, 6], s: 0.62, n: [0, 1, 0] },
            { i: [1, 2, 6, 5], s: 0.80, n: [1, 0, 0] }, { i: [3, 0, 4, 7], s: 0.68, n: [-1, 0, 0] }]
      .map(function (f) { return { pts: f.i.map(function (q) { return v[q]; }), s: f.s, n: f.n }; });
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.round(r * k) + "," + Math.round(g * k) + "," + Math.round(b * k) + ")";
  }
  function fit(cv) {
    var d = root.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    var g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    return { g: g, w: r.width, h: r.height };
  }

  function Korish(el, opts) {
    this.el = el; this.opts = opts || {};
    this.cam = { az: -0.68, el: 0.40, zoom: 1 };
    this.pack = null; this.st = { done: {}, next: "", wrong: "", changed: {} };
    this.phase = 0; this.timer = null;
    this._build();
  }
  Korish.prototype._build = function () {
    var self = this, d = document;
    this.el.innerHTML = "";
    var w = d.createElement("div");
    w.style.cssText = "display:flex;width:100%;height:100%;gap:8px;background:#14171c;color:#d7dbe2;" +
                      "font:13px system-ui,Segoe UI,Arial,sans-serif;box-sizing:border-box";
    var left = d.createElement("div"); left.style.cssText = "flex:2 1 0;min-width:0;position:relative";
    var right = d.createElement("div"); right.style.cssText = "flex:1 1 0;min-width:0;display:flex;flex-direction:column";
    this.c3 = d.createElement("canvas"); this.c3.style.cssText = "width:100%;height:100%;display:block;cursor:grab;touch-action:none";
    this.hud = d.createElement("div"); this.hud.style.cssText = "position:absolute;left:10px;top:8px;line-height:1.5;pointer-events:none";
    this.lg = d.createElement("div"); this.lg.style.cssText = "padding:6px 4px;font-weight:600";
    this.c2 = d.createElement("canvas"); this.c2.style.cssText = "flex:1 1 auto;width:100%;min-height:0;display:block";
    left.appendChild(this.c3); left.appendChild(this.hud);
    right.appendChild(this.lg); right.appendChild(this.c2);
    w.appendChild(left); w.appendChild(right); this.el.appendChild(w);

    var drag = false, lx = 0, ly = 0;
    this.c3.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; ly = e.clientY; try { self.c3.setPointerCapture(e.pointerId); } catch (x) {} });
    this.c3.addEventListener("pointermove", function (e) {
      if (!drag) return;
      self.cam.az += (e.clientX - lx) * 0.008; self.cam.el += (e.clientY - ly) * 0.006;
      self.cam.el = Math.max(0.06, Math.min(1.45, self.cam.el));
      lx = e.clientX; ly = e.clientY; self.draw3D();
    });
    this.c3.addEventListener("pointerup", function () { drag = false; });
    this.c3.addEventListener("wheel", function (e) {
      e.preventDefault();
      self.cam.zoom = Math.max(0.4, Math.min(4, self.cam.zoom * (e.deltaY > 0 ? 0.92 : 1.09))); self.draw3D();
    }, { passive: false });
    this._onResize = function () { self.draw(); };
    if (root.ResizeObserver) { this.ro = new ResizeObserver(this._onResize); this.ro.observe(this.el); }
    else root.addEventListener("resize", this._onResize);
  };
  Korish.prototype.destroy = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.ro) this.ro.disconnect(); else root.removeEventListener("resize", this._onResize);
    this.el.innerHTML = "";
  };
  Korish.prototype.setPack = function (pack) { this.pack = pack || null; this.draw(); };
  Korish.prototype.setState = function (s) {
    s = s || {};
    var done = {}, ch = {};
    (s.done || []).forEach(function (d) { done[key(d)] = 1; });
    (s.changed || []).forEach(function (d) { ch[key(d)] = 1; });
    this.st = { done: done, next: key(s.next), wrong: key(s.wrong), changed: ch };
    var blink = !!this.st.wrong || Object.keys(ch).length > 0, self = this;
    if (blink && !this.timer) this.timer = setInterval(function () { self.phase ^= 1; self.draw(); }, 450);
    if (!blink && this.timer) { clearInterval(this.timer); this.timer = null; this.phase = 0; }
    this.draw();
  };
  Korish.prototype.draw = function () { this.draw3D(); this.draw2D(); };

  /* qadam holati */
  Korish.prototype._state = function (st) {
    var k = stepKey(st), s = this.st;
    if (k && k === s.wrong) return "wrong";
    if (k && s.changed[k]) return "changed";
    if (k && s.done[k]) return st.layer === 0 ? "base" : "done";
    if (k && k === s.next) return "next";
    return "wait";
  };
  /* joriy qavat: keyingi detalniki, boʻlmasa — eng pastki tugamagani */
  Korish.prototype._curLayer = function () {
    var p = this.pack, s = this.st; if (!p) return -1;
    var steps = p.steps || [], i;
    for (i = 0; i < steps.length; i++) if (s.next && stepKey(steps[i]) === s.next) return steps[i].layer;
    for (i = 0; i < steps.length; i++) if (!s.done[stepKey(steps[i])]) return steps[i].layer;
    return -1;
  };
  /* qadam qutilari — markazlashtirilgan: y aks ettiriladi (x/y tagning ORQA
     chetidan, kamera esa oldidan koʻradi — upakofkaning draw3D() bilan bir xil) */
  Korish.prototype._boxes = function () {
    var p = this.pack, out = [];
    var bL = p.base_mm ? p.base_mm[0] : 0, bW = p.base_mm ? p.base_mm[1] : 0;
    (p.steps || []).forEach(function (st) {
      var q = st.place, T = (st.size_mm && st.size_mm[2]) || 16;
      if (!q) return;
      if (!p.base_mm) { bL = Math.max(bL, q.a); bW = Math.max(bW, q.b); }
      out.push({ st: st, q: q, T: T });
    });
    var cx = bL / 2, cy = bW / 2;
    return out.map(function (o) {
      var q = o.q;
      if (!p.base_mm) return { st: o.st, x: -q.a / 2, y: -q.b / 2, z: q.z, a: q.a, b: q.b, h: o.T };
      return { st: o.st, x: q.x - cx, y: cy - q.y - q.b, z: q.z, a: q.a, b: q.b, h: o.T };
    });
  };

  Korish.prototype.draw3D = function () {
    var f = fit(this.c3); if (!f) return;
    var G = f.g, w = f.w, h = f.h, cam = this.cam, self = this, p = this.pack;
    G.clearRect(0, 0, w, h);
    if (!p) {
      G.fillStyle = COL.ink; G.font = "14px system-ui,Arial"; G.textAlign = "center";
      G.fillText("Pochka tanlanmagan", w / 2, h / 2); this.hud.innerHTML = ""; return;
    }
    var ca = Math.cos(cam.az), sa = Math.sin(cam.az), ce = Math.cos(cam.el), se = Math.sin(cam.el);
    function proj(v) {
      var x = v[0] * ca - v[1] * sa, y = v[0] * sa + v[1] * ca;
      return { x: x, y: -(y * se + v[2] * ce), d: (-y * ce + v[2] * se) };
    }
    var cd = [-ce * sa, -ce * ca, se];
    function up(n) { return n[0] * cd[0] + n[1] * cd[1] + n[2] * cd[2] > 0.02; }
    var boxes = this._boxes();
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    boxes.forEach(function (b) {
      boxFaces(b.x, b.y, b.z, b.a, b.b, b.h).forEach(function (fc) {
        fc.pts.forEach(function (v) {
          var s = proj(v);
          if (s.x < minx) minx = s.x; if (s.x > maxx) maxx = s.x; if (s.y < miny) miny = s.y; if (s.y > maxy) maxy = s.y;
        });
      });
    });
    if (!boxes.length) return;
    var sc = Math.min(w * 0.86 / Math.max(1, maxx - minx), h * 0.80 / Math.max(1, maxy - miny)) * cam.zoom;
    var ox = w / 2 - (minx + maxx) / 2 * sc, oy = h / 2 - (miny + maxy) / 2 * sc;
    function S3(v) { var s = proj(v); return { X: ox + s.x * sc, Y: oy + s.y * sc, d: s.d }; }

    // pol
    var pL = (p.base_mm ? p.base_mm[0] : maxx - minx), pW = (p.base_mm ? p.base_mm[1] : 600);
    var fx = pL * 1.5, fy = pW * 2.2;
    var fl = [[-fx, -fy, 0], [fx, -fy, 0], [fx, fy, 0], [-fx, fy, 0]].map(S3);
    var fg = G.createLinearGradient(fl[0].X, fl[0].Y, fl[2].X, fl[2].Y);
    fg.addColorStop(0, COL.floor0); fg.addColorStop(1, COL.floor1);
    G.beginPath(); fl.forEach(function (q, i) { i ? G.lineTo(q.X, q.Y) : G.moveTo(q.X, q.Y); });
    G.closePath(); G.fillStyle = fg; G.fill();

    var cur = this._curLayer(), faces = [];
    boxes.forEach(function (b) {
      var state = self._state(b.st);
      var solid = state === "base" || state === "done" || state === "wrong" || state === "changed";
      if (state === "wait" && b.st.layer === cur) state = "soon";
      boxFaces(b.x, b.y, b.z, b.a, b.b, b.h).forEach(function (fc, fi) {
        if (solid && !up(fc.n)) return;
        var P2 = fc.pts.map(S3);
        faces.push({ d: (P2[0].d + P2[1].d + P2[2].d + P2[3].d) / 4, P2: P2, s: fc.s, state: state, solid: solid, top: fi === 0 });
      });
    });
    faces.sort(function (a, b) { return a.d - b.d; });
    var ph = this.phase;
    faces.forEach(function (fc) {
      var P2 = fc.P2;
      G.beginPath(); P2.forEach(function (q, i) { i ? G.lineTo(q.X, q.Y) : G.moveTo(q.X, q.Y); }); G.closePath();
      if (fc.state === "wrong" || fc.state === "changed") {
        var c = fc.state === "wrong" ? COL.wrong : COL.changed;
        var k = fc.state === "wrong" ? (ph ? 1.05 : 0.55) : (ph ? 0.85 : 0.45);   // almashgan — xira
        G.fillStyle = shade(c, fc.s * k); G.fill();
        G.strokeStyle = c; G.lineWidth = 1.6; G.stroke(); return;
      }
      if (fc.solid) {
        var col = fc.state === "base" ? COL.base : COL.done;
        var g = G.createLinearGradient(P2[0].X, P2[0].Y, P2[2].X, P2[2].Y);
        g.addColorStop(0, shade(col, Math.min(1.08, fc.s * 1.05))); g.addColorStop(1, shade(col, fc.s * 0.84));
        G.fillStyle = g; G.fill();
        G.strokeStyle = "rgba(28,18,6,.42)"; G.lineWidth = 0.9; G.stroke(); return;
      }
      if (fc.state === "next") {
        G.fillStyle = "rgba(255,198,41," + (0.20 * fc.s + 0.10) + ")"; G.fill();
        G.strokeStyle = COL.next; G.lineWidth = 1.9; G.stroke(); return;
      }
      if (fc.state === "soon") {
        G.fillStyle = "rgba(255,198,41,.05)"; G.fill();
        G.strokeStyle = "rgba(255,198,41,.40)"; G.lineWidth = 1; G.setLineDash([4, 3]); G.stroke(); G.setLineDash([]); return;
      }
      G.strokeStyle = "rgba(152,160,173,.15)"; G.lineWidth = 0.7; G.setLineDash([2, 4]); G.stroke(); G.setLineDash([]);
    });

    var steps = p.steps || [], nd = 0, kg = 0;
    steps.forEach(function (s) { if (self.st.done[stepKey(s)]) { nd++; kg += +s.kg || 0; } });
    var layers = (p.layers || []).length;
    this.hud.innerHTML = "<b>" + esc(p.code || "") + "</b> · " + nd + " / " + steps.length + " detal<br>" +
      (p.kind === "nostandart" ? "nostandart — tartib erkin" :
        (cur >= 0 ? "qavat <b>" + cur + "</b> / " + Math.max(0, layers - 1) : "<b>tayyor</b>")) +
      "<br>massa <b>" + kg.toFixed(1) + "</b> / " + (+p.net_kg || 0).toFixed(1) + " kg";
  };

  Korish.prototype.draw2D = function () {
    var f = fit(this.c2); if (!f) return;
    var G = f.g, W = f.w, H = f.h, p = this.pack, self = this;
    G.clearRect(0, 0, W, H);
    var FS = Math.max(10, Math.min(16, Math.round(H / 21)));
    G.font = FS + "px monospace"; G.textAlign = "center"; G.textBaseline = "middle";
    if (!p || p.kind === "nostandart" || !p.base_mm) {
      this.lg.textContent = p ? "Nostandart pochka — qavat rejasi yoʻq" : "";
      G.fillStyle = COL.ink; G.fillText(p ? "detallar ustma-ust, tartib erkin" : "", W / 2, H / 2); return;
    }
    var cur = this._curLayer();
    if (cur < 0) cur = Math.max(0, (p.layers || []).length - 1);
    var env = p.env_mm || { l: p.base_mm[0], w: p.base_mm[1], off: 0 }, off = env.off || 0;
    var pad = 14, sc = Math.min((W - pad * 2) / env.l, (H - pad * 2) / env.w);
    var ox = (W - env.l * sc) / 2, oy = (H - env.w * sc) / 2;
    function R(x, y, a, b) { return [ox + (x + off) * sc, oy + (y + off) * sc, a * sc, b * sc]; }
    var lay = (p.layers || [])[cur] || {};
    var nm = cur === 0 ? "tag" : lay.role === "ust" ? "qopqoq" : lay.role === "quyruq" ? "quyruq (qopqoq ostida)" : cur + "-qavat";
    this.lg.textContent = nm + " · " + (lay.n || 0) + " detal" + (lay.fill ? " · " + Math.round(lay.fill * 100) + "%" : "");

    G.setLineDash([4, 3]); G.strokeStyle = COL.next; G.lineWidth = 1;
    var e = R(-off, -off, env.l, env.w); G.strokeRect(e[0], e[1], e[2], e[3]); G.setLineDash([]);
    var bs = R(0, 0, p.base_mm[0], p.base_mm[1]);
    G.strokeStyle = COL.ink; G.strokeRect(bs[0], bs[1], bs[2], bs[3]);
    var ph = this.phase;
    (p.steps || []).forEach(function (st) {
      if (st.layer !== cur || !st.place) return;
      var q = st.place, r = R(q.x, q.y, q.a, q.b), s = self._state(st), txt = COL.ink;
      if (s === "base" || s === "done") { G.fillStyle = "rgba(79,174,138,.45)"; G.strokeStyle = "#4fae8a"; txt = "#8ee0bb"; }
      else if (s === "next") { G.fillStyle = "rgba(255,198,41,.28)"; G.strokeStyle = COL.next; txt = COL.next; }
      else if (s === "wrong") { G.fillStyle = ph ? "rgba(229,72,77,.75)" : "rgba(229,72,77,.25)"; G.strokeStyle = COL.wrong; txt = "#fff"; }
      else if (s === "changed") { G.fillStyle = ph ? "rgba(240,138,36,.50)" : "rgba(240,138,36,.15)"; G.strokeStyle = COL.changed; txt = "#ffd7ad"; }
      else { G.fillStyle = "rgba(0,0,0,0)"; G.strokeStyle = "rgba(152,160,173,.45)"; }
      G.fillRect(r[0], r[1], r[2], r[3]);
      if (s === "wait") G.setLineDash([3, 3]);
      G.lineWidth = s === "next" || s === "wrong" ? 2 : 1.2; G.strokeRect(r[0], r[1], r[2], r[3]); G.setLineDash([]);
      var code = String(st.code || ""), dim = st.size_mm ? st.size_mm[0] + "×" + st.size_mm[1] : "";
      G.fillStyle = txt; G.font = (s === "next" ? "700 " : "") + FS + "px monospace";
      if (r[2] < G.measureText(code).width + 6 || r[3] < FS * 1.4) return;
      var cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, f2 = Math.max(8, Math.round(FS * 0.78));
      G.font = f2 + "px monospace";
      var okDim = r[2] >= G.measureText(dim).width + 6 && r[3] >= FS * 1.2 + f2 * 1.4;
      G.font = (s === "next" ? "700 " : "") + FS + "px monospace";
      if (!okDim) { G.fillText(code, cx, cy); return; }
      G.fillText(code, cx, cy - f2 * 0.6);
      G.font = f2 + "px monospace"; G.fillText(dim, cx, cy + FS * 0.58);
    });
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  root.UpkKorish = {
    version: 1,
    create: function (el, opts) { return new Korish(el, opts); },
    tekshir: tekshir,
    keyingi: keyingi,
    key: key
  };
})(window);
