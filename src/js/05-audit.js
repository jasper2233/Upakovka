/* ============================================================
   3.10 AUDIT — pochkalash natijasi invariantlarini tekshirish
   Sabab: qoʻlda koʻchirish (moveDetail) va chiqishni yoqib-oʻchirish
   (togglePackOvh) natijani buzishi mumkin, lekin hech kim tekshirmaydi.
   Sexda bu — yoʻqolgan detal yoki tarqab ketadigan pochka demakdir.
   auditPacks() — SOF funksiya: DOM ga tegmaydi, faqat S sozlamasini oʻqiydi.
   ============================================================ */

/* 3.10.1 kichik yordamchilar — S yoki maydonlar boʻsh boʻlsa ham yiqilmaslik uchun */
function audNum(v, d){
  if (v === null || v === undefined || v === "") return d;
  v = +v;
  return isFinite(v) ? v : d;
}
function audCfg(){
  var c = (typeof S === "object" && S) ? S : {};
  return {
    maxKg:     audNum(c.maxKg, 35),
    ovh:       audNum(c.ovh, 0),
    minBase:   audNum(c.minBase, 0),
    maxLen:    audNum(c.maxLen, 1e9),
    minFill:   audNum(c.minFill, 0),
    maxLayers: audNum(c.maxLayers, 0),
    byThick:   !!c.byThick,
    // v12: pochkalash qoidasi — qaysi oʻq boʻyicha ajratilgani. GURUH tekshiruvi
    // shunga tayanadi. Rejim yoʻq, qoida bitta.
    rule:      (c.split && typeof c.split === "object") ? c.split : { prod:true, mat:false }
  };
}
function audPno(p, i){                    // pochka yorligʻi: P01, P07...
  var n = (p && p.no != null) ? p.no : (i + 1);
  return "P" + (n < 10 ? "0" : "") + n;
}
/* natija obyekti chala boʻlishi mumkin (masalan JSON dan qayta tiklangan) —
   massiv oʻrniga undefined kelsa hisobot yiqilmasligi kerak */
function audArr(v){ return (v && typeof v.length === "number") ? v : []; }
/* toza lugʻat — kalit "toString"/"__proto__" boʻlsa ham meros xossa qaytmasin */
function audMap(){ return Object.create ? Object.create(null) : {}; }
function audCode(it){ return it ? String(it.code || it.uid || "?") : "?"; }
function audDim(it){  return it ? (it.L + "×" + it.W + "×" + it.T + " mm") : "—"; }
function audEsc(s){                       // 08-labels.js dagi esc(), boʻlmasa oʻrnini bosuvchi
  if (typeof esc === "function") return esc(s);
  return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
  });
}
/* ikki toʻrtburchak kesishmasi: [x, x+a) × [y, y+b) */
function audOverlap(q1, q2){
  var ox = Math.min(q1.x + q1.a, q2.x + q2.a) - Math.max(q1.x, q2.x);
  var oy = Math.min(q1.y + q1.b, q2.y + q2.b) - Math.max(q1.y, q2.y);
  if (!(ox > 0) || !(oy > 0)) return null;
  return { x:ox, y:oy, area:ox * oy };
}

/* ============================================================
   3.10.2 AUDITPACKS — asosiy tekshirgich
   packs — PACKS massivi, items — buildItems() natijasi (kutilgan roʻyxat)
   qaytaradi: {ok, errors:[{code,pack,msg}], warnings:[...], stats:{...}}
   ============================================================ */
function auditPacks(packs, items){
  var cfg  = audCfg();
  var list = (packs && packs.length) ? packs : [];
  var want = (items && items.length) ? items : [];
  var errG = [], errP = [], warn = [];      // errG — umumiy (yoʻqolgan/takror), errP — pochka boʻyicha
  // uid -> {n, packs:[], it}. Object.create(null): uid "toString"/"__proto__" boʻlib qolsa
  // oddiy {} da meros olingan xossa qaytib, hisob buzilardi.
  var placed = audMap();
  var placedN = 0, oddPacks = 0, totalKg = 0;
  var fillSum = 0, fillN = 0, maxLayerUsed = 0;

  function err(code, pack, msg){ errP.push({ code:code, pack:pack, msg:msg }); }
  function wrn(code, pack, msg){ warn.push({ code:code, pack:pack, msg:msg }); }
  function mark(it, lab){                   // detalni "joylashgan" deb belgilaymiz
    if (!it) return;
    var uid = it.uid || ("?" + audCode(it));
    var r = placed[uid] || (placed[uid] = { n:0, packs:[], it:it });
    r.n++;
    if (r.packs.indexOf(lab) < 0) r.packs.push(lab);
    placedN++;
  }

  list.forEach(function(p, pi){
    if (!p) return;
    var lab = audPno(p, pi), kg = audNum(p.kg, 0);
    totalKg += kg;

    /* ---------- NOODATIY POCHKA ---------- */
    if (p.odd){
      oddPacks++;
      var its = p.items || [], heavy = null;
      its.forEach(function(it){
        mark(it, lab);
        if (it && audNum(it.kg, 0) > cfg.maxKg + 0.001 &&
            (!heavy || audNum(it.kg, 0) > audNum(heavy.kg, 0))) heavy = it;
      });
      if (kg > cfg.maxKg + 0.001){
        // bitta detalning oʻzi limitdan ogʻir boʻlsa — buni boʻlib boʻlmaydi, xato emas
        if (heavy){
          wrn("MASSA_NOODATIY", lab, audCode(heavy) + " bitta oʻzi " +
              audNum(heavy.kg, 0).toFixed(1) + " kg — " + cfg.maxKg + " kg limitidan ogʻir, boʻlinmaydi");
          // AMMO ogʻir detalni chiqarib tashlaganda ham qolgani limitdan oshsa —
          // bu boshqa detallar shu pochkaga notoʻgʻri qoʻshilgani, yaʼni haqiqiy xato
          var rest = kg - audNum(heavy.kg, 0);
          if (rest > cfg.maxKg + 0.001)
            err("MASSA", lab, "ogʻir detaldan tashqari yana " + rest.toFixed(2) +
                " kg — " + cfg.maxKg + " kg limitidan oshdi");
        }
        else err("MASSA", lab, kg.toFixed(2) + " kg > " + cfg.maxKg + " kg limit");
      }
      var sqO = p.seq ? p.seq.length : 0;
      if (sqO !== its.length)
        err("SEQ", lab, "yigʻish ketma-ketligi " + sqO + " ta, detal " + its.length + " ta");
      return;
    }

    /* ---------- ODDIY POCHKA ---------- */
    var base = p.base, layers = p.layers || [];
    if (!base) err("TUZILMA", lab, "pochkada tag detal yoʻq");
    else mark(base, lab);
    var bL  = base ? audNum(base.L, 0) : 0;
    var bW  = base ? audNum(base.W, 0) : 0;
    var bT  = base ? audNum(base.T, 0) : 0;
    var off = audNum(p.off, p.allowOvh ? cfg.ovh : 0);
    var nLay = 0;

    /* v12: GURUH — pochkadagi hamma detal tag detal bilan bir xil pochkalash
       guruhiga tegishli boʻlishi shart. Bu invariant ilgari umuman tekshirilmasdi:
       qoʻlda koʻchirish konveyrda materialni, individualda modulni aralashtirib
       yuborar, audit esa yashil turaverardi. Qalinlik bu yerda tekshirilmaydi —
       uni QALINLIK kodi ushlaydi, ikki marta xabar bermaymiz. */
    function grpWhy(it){
      if (!base || !it) return null;
      if (cfg.rule.prod){
        var mg = (typeof modGroupOf === "function") ? modGroupOf : function(){ return null; };
        var a = mg(it.unit) || it.unit, b = mg(base.unit) || base.unit;
        if (a !== b) return "modul " + (it.unitName || it.unit) +
                            " — tag detal " + (base.unitName || base.unit);
      }
      if (cfg.rule.mat && it.matId !== base.matId)
        return "material " + ((it.mat && it.mat.name) || it.matId) +
               " — tag detal " + ((base.mat && base.mat.name) || base.matId);
      if (typeof clsKeyOf === "function" && clsKeyOf(it.cls) !== clsKeyOf(base.cls))
        return "klass " + it.cls + " — tag detal " + base.cls;
      return null;
    }

    layers.forEach(function(L, li){
      var qs = (L && L.items) ? L.items : [];
      nLay += qs.length;
      qs.forEach(function(q, qi){
        var it = q ? q.it : null;
        // buzilgan slot: joylashuv bor, detal yoʻq — jimgina oʻtkazib yuborsak detal
        // yoʻqolgani bilinmay qoladi, shu sabab aniq xato beramiz
        if (!it){
          err("TUZILMA", lab, (li + 1) + "-qavatning " + (qi + 1) +
              "-oʻrnida detal yoʻq (buzilgan joylashuv)");
          return;
        }
        mark(it, lab);

        if (base){
          /* CHEGARA — joylashuv konvertdan chiqib ketgan */
          var bad = [];
          if (q.x < -off - 0.5)          bad.push("chapga " + Math.round(-q.x - off) + " mm");
          if (q.y < -off - 0.5)          bad.push("orqaga " + Math.round(-q.y - off) + " mm");
          if (q.x + q.a > bL + off + 0.5) bad.push("oʻngga " + Math.round(q.x + q.a - bL - off) + " mm");
          if (q.y + q.b > bW + off + 0.5) bad.push("oldga "  + Math.round(q.y + q.b - bW - off) + " mm");
          if (bad.length)
            err("CHEGARA", lab, (li + 1) + "-qavat · " + audCode(it) + " konvertdan chiqdi: " +
                bad.join(", ") + " (tag " + bL + "×" + bW + ", ruxsat etilgan chiqish " + off + " mm)");

          /* QALINLIK — qavat detali tag detal bilan bir xil qalinlikda boʻlishi shart */
          if (cfg.byThick && it && Math.abs(audNum(it.T, 0) - bT) > 0.001)
            err("QALINLIK", lab, (li + 1) + "-qavat · " + audCode(it) + " " + audNum(it.T, 0) +
                " mm — tag detal " + bT + " mm");

          /* GURUH — modul / material / klass chegarasi buzilganmi */
          var gw = grpWhy(it);
          if (gw) err("GURUH", lab, (li + 1) + "-qavat · " + audCode(it) + " " + gw);
        }

        /* USTMA_UST — bitta qavatda ikki detal kesishmasi > 1 mm² */
        for (var k = qi + 1; k < qs.length; k++){
          if (!qs[k]) continue;
          var o = audOverlap(q, qs[k]);
          if (o && o.area > 1)
            err("USTMA_UST", lab, (li + 1) + "-qavat · " + audCode(it) + " va " + audCode(qs[k].it) +
                " ustma-ust tushdi — kesishma " + o.x.toFixed(0) + "×" + o.y.toFixed(0) + " mm");
        }
      });

      /* TOLDIRISH — qopqoq va toʻliqsizga ruxsat berilgan (weak) qavatlar tekshirilmaydi */
      if (L && qs.length && !L.lid && !L.weak && audNum(L.fill, 0) < cfg.minFill / 100 - 0.005)
        wrn("TOLDIRISH", lab, (li + 1) + "-qavat toʻldirish " +
            Math.round(audNum(L.fill, 0) * 100) + "% < " + cfg.minFill + "%");
      // oʻrtachaga faqat detal turgan qavatlar kiradi — boʻsh qavat oʻrtachani soxta pasaytiradi
      if (L && qs.length){ fillSum += audNum(L.fill, 0); fillN++; }
    });

    /* MASSA / QAVAT / SEQ */
    if (kg > cfg.maxKg + 0.001)
      err("MASSA", lab, kg.toFixed(2) + " kg > " + cfg.maxKg + " kg limit");
    if (cfg.maxLayers > 0 && (layers.length + 1) > cfg.maxLayers)
      err("QAVAT", lab, (layers.length + 1) + " qavat (tag + " + layers.length + ") > " +
          cfg.maxLayers + " limit");
    var sqN = p.seq ? p.seq.length : 0;
    if (sqN !== 1 + nLay)
      err("SEQ", lab, "yigʻish ketma-ketligi " + sqN + " ta, kutilgan " + (1 + nLay) +
          " ta (tag + " + nLay + " qavat detali)");

    /* ogohlantirishlar */
    if (base && (bW < cfg.minBase || bL > cfg.maxLen))
      wrn("TAG_OLCHAM", lab, "tag " + bL + "×" + bW + " mm — meʼyor: eni ≥ " + cfg.minBase +
          ", uzunlik ≤ " + cfg.maxLen);
    if (!layers.length)
      wrn("BOSH_POCHKA", lab, "faqat tag detaldan iborat — ustida qavat yoʻq");
    if (kg < cfg.maxKg * 0.5)
      wrn("YENGIL", lab, kg.toFixed(1) + " kg — limitning yarmidan kam (" + cfg.maxKg + " kg)");

    if (layers.length + 1 > maxLayerUsed) maxLayerUsed = layers.length + 1;
  });

  /* ---------- YOQOLGAN / TAKROR / BEGONA (uid boʻyicha) ---------- */
  var wantMap = audMap();
  want.forEach(function(it){
    var uid = (it && it.uid) ? it.uid : null;
    if (!uid) return;
    wantMap[uid] = it;
    if (!placed[uid])
      errG.push({ code:"YOQOLGAN", pack:"—",
        msg: audCode(it) + " · " + audDim(it) + " — hech bir pochkaga joylashmagan" });
  });
  Object.keys(placed).forEach(function(uid){
    var r = placed[uid];
    if (r.n > 1)
      errG.push({ code:"TAKROR", pack:r.packs[0],
        msg: audCode(r.it) + " · " + audDim(r.it) + " — " + r.n + " marta joylashgan: " + r.packs.join(", ") });
    if (want.length && !wantMap[uid])
      warn.push({ code:"BEGONA", pack:r.packs[0],
        msg: audCode(r.it) + " · " + audDim(r.it) + " — kutilgan roʻyxatda yoʻq (natija eskirgan?)" });
  });

  var errors = errG.concat(errP);
  return {
    ok: errors.length === 0,
    errors: errors,
    warnings: warn,
    stats: {
      packs:         list.length,
      oddPacks:      oddPacks,
      itemsExpected: want.length,
      itemsPlaced:   placedN,
      totalKg:       totalKg,
      avgKg:         list.length ? totalKg / list.length : 0,
      avgFill:       fillN ? fillSum / fillN : 0,
      maxLayerUsed:  maxLayerUsed,
      errN:          errors.length,
      warnN:         warn.length
    }
  };
}

/* ============================================================
   3.10.3 BADGE — shapka/tugma yonidagi qisqa holat belgisi
   ============================================================ */
function auditBadgeHTML(res){
  var st = "display:inline-block;font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;" +
           "padding:2px 7px;border-radius:3px;white-space:nowrap;";
  if (!res || !res.stats)
    return '<span style="' + st + 'background:rgba(102,110,124,.18);color:var(--ink3)">audit yoʻq</span>';
  var eN = audArr(res.errors).length, wN = audArr(res.warnings).length;
  if (eN)
    return '<span style="' + st + 'background:rgba(255,107,67,.16);color:var(--alert)">⚠ ' +
           eN + ' xato</span>';
  // Xato boʻlmasa — YASHIL. Ogohlantirish (yarim boʻsh pochka va h.k.) deyarli har
  // buyurtmada uchraydi; shapkani doim sariq qilib turish «signal koʻrligi»ga olib keladi,
  // shuning uchun ular yonida xira raqam boʻlib turadi, tafsiloti Diagnostikada.
  var ok = '<span style="' + st + 'background:rgba(78,203,142,.14);color:var(--ok)">✓ toza</span>';
  if (wN)
    return ok + '<span style="font-family:var(--mono);font-size:10px;color:var(--ink3);margin-left:6px">' +
           wN + ' ogoh.</span>';
  return ok;
}

/* ============================================================
   3.10.4 TOʻLIQ HISOBOT (HTML) — stats + xatolar + ogohlantirishlar
   ============================================================ */
var AUD_CAP = 200;                          // bitta jadvalda koʻrsatiladigan maksimal qator
function audTable(rowsIn, empty){
  var rows = audArr(rowsIn);
  var out = ['<div style="overflow:auto;margin-bottom:6px"><table class="dt">' +
             '<tr><th style="width:70px">Pochka</th><th style="width:140px">Kod</th><th>Tavsif</th></tr>'];
  if (!rows.length){
    out.push('<tr><td class="m">—</td><td class="m">—</td><td>' + audEsc(empty) + '</td></tr>');
  } else {
    for (var i = 0; i < rows.length && i < AUD_CAP; i++){
      var rw = rows[i] || {};
      out.push('<tr><td class="m">' + audEsc(rw.pack) + '</td>' +
               '<td class="m">' + audEsc(rw.code) + '</td>' +
               '<td style="white-space:normal">' + audEsc(rw.msg) + '</td></tr>');
    }
    if (rows.length > AUD_CAP)
      out.push('<tr><td class="m">…</td><td class="m">—</td>' +
               '<td style="white-space:normal">yana ' + (rows.length - AUD_CAP) +
               ' ta koʻrsatilmadi</td></tr>');
  }
  out.push('</table></div>');
  return out.join("");
}
function auditReportHTML(res){
  if (!res || !res.stats)
    return '<div class="note">Audit hali oʻtkazilmadi.</div>';
  var s = res.stats, cfg = audCfg();
  var er = audArr(res.errors), wr = audArr(res.warnings);
  var srows = [
    ["Pochka",            audNum(s.packs, 0) + " ta" +
                          (s.oddPacks ? " (shundan noodatiy " + s.oddPacks + ")" : "")],
    ["Detal",             audNum(s.itemsPlaced, 0) + " joylashgan / " +
                          audNum(s.itemsExpected, 0) + " kutilgan"],
    ["Massa",             audNum(s.totalKg, 0).toFixed(1) + " kg · oʻrtacha " +
                          audNum(s.avgKg, 0).toFixed(1) + " kg (limit " + cfg.maxKg + " kg)"],
    ["Qavat toʻldirish",  Math.round(audNum(s.avgFill, 0) * 100) + "% oʻrtacha"],
    ["Eng baland pochka", audNum(s.maxLayerUsed, 0) + " qavat" +
                          (cfg.maxLayers > 0 ? " / " + cfg.maxLayers : "")],
    ["Xato",              String(audNum(s.errN, er.length))],
    ["Ogohlantirish",     String(audNum(s.warnN, wr.length))]
  ];
  var h = '<div style="margin-bottom:10px">' + auditBadgeHTML(res) + '</div>';
  h += '<h3>Umumiy koʻrsatkich</h3><div style="overflow:auto;margin-bottom:6px"><table class="dt">' +
       '<tr><th style="width:220px">Koʻrsatkich</th><th>Qiymat</th></tr>';
  srows.forEach(function(r){
    h += '<tr><td>' + audEsc(r[0]) + '</td><td class="m">' + audEsc(r[1]) + '</td></tr>';
  });
  h += '</table></div>';
  h += '<h3>Xatolar · ' + er.length + '</h3>' + audTable(er, "xato topilmadi");
  h += '<h3>Ogohlantirishlar · ' + wr.length + '</h3>' + audTable(wr, "ogohlantirish yoʻq");
  return h;
}

/* ============================================================
   3.10.5 MATN HISOBOT — clipboard yoki .txt uchun
   ============================================================ */
function auditText(res){
  if (!res || !res.stats) return "Audit oʻtkazilmadi.";
  var s = res.stats, cfg = audCfg(), L = [];
  var er = audArr(res.errors), wr = audArr(res.warnings);
  L.push("UPAKOFKA — AUDIT HISOBOTI");
  L.push("Holat: " + (er.length ? er.length + " ta xato" : "toza, xato yoʻq") +
         (wr.length ? " · " + wr.length + " ta ogohlantirish" : ""));
  L.push("Pochka: " + audNum(s.packs, 0) + " ta (noodatiy " + audNum(s.oddPacks, 0) + ")");
  L.push("Detal: " + audNum(s.itemsPlaced, 0) + " joylashgan / " +
         audNum(s.itemsExpected, 0) + " kutilgan");
  L.push("Massa: " + audNum(s.totalKg, 0).toFixed(1) + " kg, oʻrtacha " +
         audNum(s.avgKg, 0).toFixed(1) + " kg (limit " + cfg.maxKg + " kg)");
  L.push("Qavat toʻldirish: " + Math.round(audNum(s.avgFill, 0) * 100) +
         "%, eng baland pochka " + audNum(s.maxLayerUsed, 0) + " qavat" +
         (cfg.maxLayers > 0 ? " / " + cfg.maxLayers : ""));
  L.push("");
  L.push("XATOLAR (" + er.length + ")");
  if (!er.length) L.push("  — yoʻq");
  er.forEach(function(e){ L.push("  [" + e.pack + "] " + e.code + " — " + e.msg); });
  L.push("");
  L.push("OGOHLANTIRISHLAR (" + wr.length + ")");
  if (!wr.length) L.push("  — yoʻq");
  wr.forEach(function(w){ L.push("  [" + w.pack + "] " + w.code + " — " + w.msg); });
  return L.join("\n");
}
