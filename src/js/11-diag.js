/* ============================================================
   3.12 DIAGNOSTIKA — parser ogohlantirishlari, XML tuzilishi, audit
   Maqsad: real .project fayllar sinovdan oʻtkazilganda "fayl
   oʻqilmadi" degan quruq alert oʻrniga ANIQ SABAB koʻrinsin.
   Bu modul #diagBox konteyneriga chizadi (tab: data-v="diag").
   ============================================================ */

/* 3.12.1 DIAG — diagnostika holati (boshqa modullar shu yerga yozadi) */
var DIAG = {
  warnings: [],   // [{code, msg, n, times}]
  xmlInfo: null,  // xmlStructure() natijasi
  fileName: "",   // yuklangan fayl nomi
  fileSize: 0,    // fayl hajmi, bayt (12-upload.js toʻldiradi)
  parseMs: 0,     // parseProject() qancha ishladi
  packMs: 0       // packAll() qancha ishladi
  /* v12: packTries maydoni olib tashlandi — unga hech kim qiymat yozmasdi,
     hisobotda esa har doim `DIAG.packTries || S.tries` ning oʻng tomoni chiqardi.
     Endi bevosita S.tries koʻrsatiladi. */
};
var DIAG_MAXW = 200;   // ogohlantirishlar roʻyxati cheklovi (himoya)
var DIAG_OV = null;    // cheklovdan oshganlarni yigʻuvchi yozuv

/* DIQQAT: parseMs / packMs / fileName / fileSize maydonlarini QOʻSHNI modullar
   toʻldiradi — 12-upload.js (loadXmlText: diagClear + fileName + fileSize + parseMs +
   xmlInfo) va 13-app.js (recompute: packMs). Bu modul global funksiyalarni
   (parseProject, packAll) ATAYLAB oʻramaydi: yadro funksiyalarini almashtirish
   diagnostika uchun juda qimmat xavf, foydasi esa yoʻq. */

/* 3.12.2 tozalash — har yangi fayl yuklanishidan OLDIN chaqiriladi */
function diagClear(){
  DIAG.warnings = [];
  DIAG.xmlInfo = null;
  DIAG.fileName = "";
  DIAG.fileSize = 0;
  DIAG.parseMs = 0;
  DIAG.packMs = 0;
  DIAG_OV = null;
}

/* 3.12.3 ogohlantirish qoʻshish — bir xil code+msg takrorlansa soni oshadi
   n — nechta detalga tegishli (koʻrsatilmasa 1) */
function diagWarn(code, msg, n){
  code = String(code == null ? "?" : code);
  msg  = String(msg  == null ? ""  : msg);
  var add = (typeof n === "number" && isFinite(n)) ? n : 1;
  for (var i = 0; i < DIAG.warnings.length; i++){
    var w = DIAG.warnings[i];
    if (w.code === code && w.msg === msg){ w.n += add; w.times++; return w; }
  }
  if (DIAG.warnings.length >= DIAG_MAXW){          // toshib ketmasin
    if (!DIAG_OV){
      DIAG_OV = { code:"KOʻP", msg:"ogohlantirishlar juda koʻp — qolganlari shu qatorga yigʻildi", n:0, times:0 };
      DIAG.warnings.push(DIAG_OV);
    }
    DIAG_OV.n += add; DIAG_OV.times++;
    return DIAG_OV;
  }
  var nw = { code:code, msg:msg, n:add, times:1 };
  DIAG.warnings.push(nw);
  return nw;
}

/* 3.12.4 XML TUZILISHI — teglar, atributlar, ildiz. Parserga bogʻliq emas:
   fayl kutilganidan boshqacha boʻlsa ham nima borligini koʻrsatadi. */
function xmlStructure(xmlText){
  var res = { ok:false, root:"", rootAttrs:[], tags:[], head:"", chars:0,
              total:0, seen:0, cut:false, error:"" };
  try {
    var s = String(xmlText == null ? "" : xmlText);
    res.chars = s.length;
    res.head = s.slice(0, 1200);
    if (!/\S/.test(s)){ res.error = "fayl boʻsh"; return res; }

    var doc = new DOMParser().parseFromString(s, "application/xml");
    var perr = doc.querySelector ? doc.querySelector("parsererror") : null;
    var root = doc.documentElement;
    if (!root){ res.error = "hujjatda ildiz teg yoʻq"; return res; }
    if (perr || String(root.tagName).toLowerCase() === "parsererror"){
      var et = (perr || root).textContent || "XML sintaksis xatosi";
      res.error = String(et).replace(/\s+/g, " ").slice(0, 300);
      return res;
    }

    res.root = root.tagName;
    var ra = root.attributes;
    for (var i = 0; i < ra.length && i < 40; i++){
      res.rootAttrs.push({ k: ra[i].name, v: String(ra[i].value).slice(0, 120) });
    }

    // himoya: juda katta faylda faqat birinchi 20000 element koʻriladi
    var lim = (s.length > 5 * 1024 * 1024) ? 20000 : 400000;
    var all = doc.getElementsByTagName("*");
    res.total = all.length;
    var n = Math.min(all.length, lim);
    res.seen = n;                 // nechtasi haqiqatda koʻrildi (xabarlarda shu chiqadi)
    res.cut = all.length > n;

    // kalitlar "#" bilan boshlanadi: "toString"/"__proto__" nomli teg buzmasin
    var map = {}, order = [];
    for (var j = 0; j < n; j++){
      var el = all[j], tg = el.tagName;
      var rec = map["#" + tg];
      if (!rec){ rec = map["#" + tg] = { tag:tg, count:0, attrs:[], more:0, seen:{} }; order.push(rec); }
      rec.count++;
      var at = el.attributes;
      for (var k = 0; k < at.length; k++){
        var nm = at[k].name;
        if (rec.seen["#" + nm]) continue;
        rec.seen["#" + nm] = 1;
        if (rec.attrs.length >= 25) rec.more++;   // har tegga maks 25 atribut nomi
        else rec.attrs.push(nm);
      }
    }
    order.sort(function(a, b){ return (b.count - a.count) || (a.tag < b.tag ? -1 : 1); });
    order.forEach(function(r){ delete r.seen; });
    res.tags = order;
    res.ok = true;
  } catch(e){
    res.ok = false;
    res.error = "DOMParser xatosi: " + (e && e.message ? e.message : String(e));
  }
  return res;
}

/* 3.12.5 kichik yordamchilar — oʻlcham, vaqt, matn */
function diagMs(v){
  v = +v || 0;
  if (v <= 0) return "—";
  return v < 1000 ? Math.round(v) + " ms" : (v / 1000).toFixed(2) + " s";
}
function diagSize(b){
  b = +b || 0;
  if (b <= 0) return "—";
  if (b < 1024) return b + " bayt";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(2) + " MB";
}
function diagPre(txt){
  return '<pre style="background:var(--void);border:1px solid var(--line);border-radius:var(--r);' +
    'padding:10px 12px;margin:0;font-family:var(--mono);font-size:11px;line-height:1.55;color:var(--ink2);' +
    'white-space:pre-wrap;word-break:break-all;max-height:280px;overflow:auto">' + esc(txt) + '</pre>';
}
function diagTbl(inner){
  return '<div style="overflow:auto;border:1px solid var(--line);border-radius:var(--r);max-height:420px">' +
    '<table class="dt">' + inner + '</table></div>';
}
/* HTML dan sof matn — hisobotni .txt ga tushirish uchun */
function diagStrip(html){
  var s = String(html == null ? "" : html);
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(tr|div|h3|h4|li|p|table|pre)>/gi, "\n");
  s = s.replace(/<\/(td|th)>/gi, "  ");
  s = s.replace(/<[^>]*>/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
       .replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.replace(/^\s+|\s+$/g, "");
}

/* boʻlimni xavfsiz chizish: bittasi yiqilsa ham qolgani koʻrinaveradi.
   Diagnostika hech qachon ilovani yiqitmasligi kerak — uni aynan hammasi
   buzilganda ochishadi. */
function diagSafe(fn, ttl){
  try { return fn(); }
  catch(e){
    return '<h3>' + esc(ttl) + '</h3><div class="note" style="border-left-color:var(--alert)">' +
      'Bu boʻlim chizilmadi: ' + esc(e && e.message ? e.message : String(e)) + '</div>';
  }
}

/* 3.12.6 boʻlimlar — har biri mustaqil HTML qaytaradi */

/* (a) fayl haqida */
function diagFileHTML(){
  var sz = DIAG.fileSize || (DIAG.xmlInfo ? DIAG.xmlInfo.chars : 0);
  var h = '<h3>Fayl</h3>';
  if (!DIAG.fileName && !DIAG.parseMs){
    h += '<div class="note">Hali .project fayl yuklanmagan — ekranda oʻrnatilgan namuna maʼlumot turibdi. ' +
         'Fayl yuklansa shu yerda oʻqish natijasi va sabablar koʻrinadi.</div>';
  }
  h += '<div class="fields">' +
    '<div class="f"><label>Nomi</label><b style="font-family:var(--mono);font-size:13px;word-break:break-all">' +
      esc(DIAG.fileName || "—") + '</b></div>' +
    '<div class="f"><label>Hajmi</label><b style="font-family:var(--mono);font-size:13px">' +
      esc(diagSize(sz)) + '</b></div>' +
    '<div class="f"><label>Oʻqish (parse)</label><b style="font-family:var(--mono);font-size:13px">' +
      esc(diagMs(DIAG.parseMs)) + '</b></div>' +
    '<div class="f"><label>Pochkalash</label><b style="font-family:var(--mono);font-size:13px">' +
      esc(diagMs(DIAG.packMs)) + '</b></div>' +
    '<div class="f"><label>Variatsiya urinishi</label><b style="font-family:var(--mono);font-size:13px">' +
      esc(String((typeof S !== "undefined" ? S.tries : 0) || "—")) + '</b></div>' +
    '<div class="f"><label>Tizim</label><b style="font-family:var(--mono);font-size:13px">UPK v' +
      esc(String(typeof APP_VER !== "undefined" ? APP_VER : "?")) + '</b></div>' +
    '</div>';
  return h;
}

/* (b) parser ogohlantirishlari */
function diagWarnHTML(){
  var h = '<h3>Parser ogohlantirishlari</h3>';
  if (!DIAG.warnings.length){
    return h + '<div class="note" style="border-left-color:var(--ok);color:var(--ok)">' +
      'Ogohlantirish yoʻq — fayl toza oʻqildi.</div>';
  }
  var rows = '<tr><th>Kod</th><th>Tavsif</th><th>Soni</th></tr>';
  DIAG.warnings.forEach(function(w){
    rows += '<tr><td class="m"><span class="tag c">' + esc(w.code) + '</span></td>' +
      '<td style="white-space:normal">' + esc(w.msg) + '</td>' +
      '<td class="m">' + w.n + (w.times > 1 && w.times !== w.n ? ' <i style="color:var(--ink3);font-style:normal">(' + w.times + ' marta)</i>' : '') + '</td></tr>';
  });
  return h + diagTbl(rows);
}

/* (c) audit — 05-audit.js boʻlmasa jim oʻtkazadi */
function diagAuditHTML(){
  if (typeof auditPacks !== "function") return "";
  if (typeof P === "undefined" || !P) return "";
  if (typeof PACKS === "undefined" || !PACKS || !PACKS.length) return "";
  var html = "";
  try {
    var rep = auditPacks(PACKS, buildItems());
    if (typeof auditReportHTML === "function"){
      try { html = auditReportHTML(rep); } catch(e1){ html = ""; }
      if (!html){ try { html = auditReportHTML(); } catch(e2){ html = ""; } }
    }
  } catch(e){
    html = '<div class="note" style="border-left-color:var(--alert)">Audit ishlamadi: ' +
           esc(e && e.message ? e.message : String(e)) + '</div>';
  }
  return html ? ('<h3>Audit</h3>' + html) : "";
}
/* v12: bu yerda uchinchi pogʻonali zaxira (diagAuditFallback) turardi — u hisobotni
   xom JSON qilib koʻrsatardi. Unga yetib borish uchun auditReportHTML() ikkala
   chaqiruvda ham boʻsh qaytarishi kerak edi, bu esa hech qachon boʻlmaydi. */
function diagAuditText(){
  if (typeof auditPacks !== "function") return "";
  if (typeof P === "undefined" || !P) return "";
  if (typeof PACKS === "undefined" || !PACKS || !PACKS.length) return "";
  try {
    var rep = auditPacks(PACKS, buildItems());
    if (typeof auditText === "function"){
      var t = auditText(rep);
      if (t) return String(t);
    }
    var html = "";
    if (typeof auditReportHTML === "function"){
      try { html = auditReportHTML(rep); } catch(e1){ html = ""; }
      if (!html){ try { html = auditReportHTML(); } catch(e2){ html = ""; } }
    }
    return diagStrip(html);
  } catch(e){
    return "audit ishlamadi: " + (e && e.message ? e.message : String(e));
  }
}

/* (d) loyiha tarkibi — materiallar va detal klasslari */
function diagProjectHTML(){
  var h = '<h3>Loyiha tarkibi</h3>';
  if (typeof P === "undefined" || !P){
    return h + '<div class="note">Loyiha yuklanmagan.</div>';
  }
  // P tiklangan seansdan kelib, maydonlari toʻliqsiz boʻlishi mumkin — himoya
  var parts = (P.parts && P.parts.length) ? P.parts : [];
  var mats  = (P.materials && P.materials.length) ? P.materials : [];
  var items = [];
  try { items = buildItems(); } catch(e){ items = []; }
  var kg = items.reduce(function(s, i){ return s + (+(i && i.kg) || 0); }, 0);
  var all = parts.reduce(function(s, p){ return s + (+(p && p.q) || 0); }, 0);

  h += '<div class="note" style="border-left-color:var(--mark)"><b>' + esc(P.name || "—") + '</b> · id ' +
    esc(P.uuid || "—") + ' — jami <b>' + all + '</b> detal, faol <b>' + items.length + '</b> detal / <b>' +
    kg.toFixed(0) + ' kg</b> · ' + mats.length + ' material · ' + parts.length + ' pozitsiya</div>';

  // materiallar
  var rows = '<tr><th>Nomi</th><th>List oʻlchami</th><th>Qalinlik</th><th>kg/m²</th><th>List kg</th><th>Katalog mosligi</th></tr>';
  mats.forEach(function(m){
    var c = null;
    try { c = catLookup(m.name, m.t); } catch(e){ c = null; }
    var tag = c ? '<span class="tag b">' + esc(c.key) + '</span>'
                : '<span class="tag a">katalogda yoʻq — zichlik boʻyicha</span>';
    if (c && m.cat && m.cat !== c.key) tag += ' <span class="tag c">joriy: ' + esc(m.cat) + '</span>';
    var ml = +m.l || 0, mw = +m.w || 0, mt = +m.t || 0, mk = +m.kgm2 || 0;
    rows += '<tr><td>' + esc(m.name) + '</td>' +
      '<td class="m">' + ml + ' × ' + mw + '</td>' +
      '<td class="m">' + mt + ' mm</td>' +
      '<td class="m">' + mk.toFixed(2) + '</td>' +
      '<td class="m">' + (ml * mw / 1e6 * mk).toFixed(1) + '</td>' +
      '<td>' + tag + '</td></tr>';
  });
  h += diagTbl(rows);

  // detal klasslari
  var cs = [];
  try { cs = classStats(); } catch(e){ cs = []; }
  h += '<div style="margin-top:12px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)">' +
       'Detal klasslari — ' + cs.length + ' ta</div>' +
       '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:7px">';
  cs.forEach(function(c){
    var sep = (typeof S !== "undefined" && S.sepCls && S.sepCls[c.cls]);
    h += '<span class="tag ' + (sep ? "c" : "b") + '" style="padding:3px 8px">' +
         esc(c.cls) + ' · ' + c.n + (sep ? " · alohida" : "") + '</span>';
  });
  h += '</div>';
  return h;
}

/* (e) XML tuzilishi */
function diagXmlHTML(){
  var x = DIAG.xmlInfo;
  if (!x) return "";
  var h = '<h3>XML tuzilishi</h3>';
  if (!x.ok){
    h += '<div class="note" style="border-left-color:var(--alert)">XML oʻqilmadi: ' +
         esc(x.error || "nomaʼlum xato") + '</div>';
    if (x.head) h += diagPre(x.head);
    return h;
  }
  // DIAG.xmlInfo ni boshqa modul ham yozishi mumkin — shakli boshqacha boʻlsa yiqilmaymiz
  var tags = (x.tags && typeof x.tags.length === "number") ? x.tags : [];
  var rats = (x.rootAttrs && typeof x.rootAttrs.length === "number") ? x.rootAttrs : [];
  h += '<div class="note">Ildiz teg: <b style="font-family:var(--mono)">&lt;' + esc(x.root || "?") + '&gt;</b> · ' +
       'elementlar: <b>' + (+x.total || 0) + '</b> ta · turli teg: <b>' + tags.length + '</b> ta' +
       (x.cut ? ' · <span style="color:var(--mark)">katta fayl — faqat birinchi ' +
                (+x.seen || 0) + ' element koʻrildi</span>' : '') +
       '</div>';
  if (rats.length){
    var ra = '<tr><th>Ildiz atributi</th><th>Qiymati</th></tr>';
    rats.forEach(function(a){
      ra += '<tr><td class="m">' + esc(a && a.k) + '</td><td class="m" style="white-space:normal">' +
            esc(a && a.v) + '</td></tr>';
    });
    h += diagTbl(ra);
  }
  var lim = Math.min(tags.length, 60);
  var rows = '<tr><th>Teg</th><th>Soni</th><th>Atributlari</th></tr>';
  for (var i = 0; i < lim; i++){
    var t = tags[i] || {};
    var at = (t.attrs && typeof t.attrs.join === "function") ? t.attrs : [];
    rows += '<tr><td class="m">&lt;' + esc(t.tag) + '&gt;</td><td class="m">' + (+t.count || 0) + '</td>' +
      '<td class="m" style="white-space:normal;color:var(--ink2)">' +
      (at.length ? esc(at.join(", ")) + (t.more ? ' <i style="color:var(--ink3);font-style:normal">+' + (+t.more || 0) + '</i>' : '')
                 : '<i style="color:var(--ink3);font-style:normal">—</i>') +
      '</td></tr>';
  }
  h += '<div style="margin-top:10px"></div>' + diagTbl(rows);
  if (tags.length > lim){
    h += '<div class="note">Yana ' + (tags.length - lim) + ' ta teg turi bor — toʻliq roʻyxat matnli hisobotda.</div>';
  }
  h += '<div style="margin-top:12px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)">' +
       'Fayl boshi (1200 belgi)</div><div style="margin-top:7px">' + diagPre(x.head || "—") + '</div>';
  return h;
}

/* 3.12.7 renderDiag — #diagBox ni toʻldiradi */
function renderDiag(){
  var box = (typeof $ === "function") ? $("diagBox") : document.getElementById("diagBox");
  if (!box) return;
  var h = diagSafe(diagFileHTML,    "Fayl") +
          diagSafe(diagWarnHTML,    "Parser ogohlantirishlari") +
          diagSafe(diagAuditHTML,   "Audit") +
          diagSafe(diagProjectHTML, "Loyiha tarkibi") +
          diagSafe(diagXmlHTML,     "XML tuzilishi");
  h += '<h3>Hisobot</h3>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn pri" id="btnDiagCopy">Hisobotni nusxalash</button>' +
      '<button class="btn" id="btnDiagSave">Hisobotni yuklab olish</button>' +
    '</div>' +
    '<div class="msg" id="diagMsg"></div>' +
    '<div id="diagCopyBox"></div>';
  box.innerHTML = h;
  var b1 = $("btnDiagCopy"); if (b1) b1.onclick = diagCopy;
  var b2 = $("btnDiagSave"); if (b2) b2.onclick = diagSave;
}

/* xabar satri (id="diagMsg" element bilan nom toʻqnashmasin uchun diagFlash) */
function diagFlash(kind, text){
  var m = $("diagMsg");
  if (m){ m.className = "msg " + kind; m.textContent = text; }
}

/* nusxalash — clipboard boʻlmasa (file:// da boʻlmasligi mumkin) textarea zaxirasi */
function diagCopy(){
  var txt = "";
  try { txt = diagText(); }
  catch(e0){ diagFlash("err", "hisobot tayyorlanmadi: " + (e0 && e0.message ? e0.message : String(e0))); return; }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(
        function(){ diagCopyDone(); },
        function(){ diagCopyFallback(txt); }
      );
      return;
    }
  } catch(e){ /* pastdagi zaxiraga oʻtamiz */ }
  diagCopyFallback(txt);
}
function diagCopyDone(){
  var b = $("diagCopyBox"); if (b) b.innerHTML = "";
  diagFlash("ok", "hisobot nusxalandi ✓");
}
function diagCopyFallback(txt){
  var box = $("diagCopyBox");
  if (!box){ diagFlash("err", "nusxalash imkoni yoʻq"); return; }
  box.innerHTML = '<textarea id="diagTA" readonly style="width:100%;height:190px;margin-top:9px;' +
    'background:var(--void);color:var(--ink2);border:1px solid var(--line2);border-radius:var(--r);' +
    'padding:9px;font-family:var(--mono);font-size:11px;line-height:1.5"></textarea>';
  var ta = $("diagTA");
  if (!ta){ diagFlash("err", "nusxalash imkoni yoʻq"); return; }
  ta.value = txt;
  ta.focus(); ta.select();
  try { ta.setSelectionRange(0, txt.length); } catch(e){}
  var ok = false;
  try { ok = document.execCommand("copy"); } catch(e2){ ok = false; }
  if (ok) diagFlash("ok", "hisobot nusxalandi ✓ (zaxira usul)");
  else diagFlash("err", "matn belgilandi — Ctrl+C bosing");
}

/* yuklab olish — .txt blob */
function diagSave(){
  try {
    var txt = diagText();
    // Blob/URL boʻlmasa (juda eski brauzer) — hech boʻlmasa matnni koʻrsatamiz
    if (typeof Blob !== "function" || !window.URL || !URL.createObjectURL){
      diagCopyFallback(txt);
      diagFlash("err", "yuklab olish qoʻllab-quvvatlanmaydi — matn pastda, Ctrl+C bosing");
      return;
    }
    var nm = ((typeof P !== "undefined" && P && P.name) ? P.name : (DIAG.fileName || "loyiha"));
    nm = String(nm).replace(/[\\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").slice(0, 60);
    if (!nm.replace(/[-_.]/g, "")) nm = "loyiha";
    var a = document.createElement("a");
    var url = URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF) + txt], { type:"text/plain;charset=utf-8" }));
    a.href = url;
    a.download = nm + "_diagnostika.txt";
    // Firefox faqat hujjatga qoʻshilgan havolani bosishga ruxsat beradi
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      try { if (a.parentNode) a.parentNode.removeChild(a); } catch(e){}
      try { URL.revokeObjectURL(url); } catch(e2){}
    }, 4000);
    diagFlash("ok", "hisobot yuklab olindi ✓");
  } catch(e){
    diagFlash("err", "yuklab olinmadi: " + (e && e.message ? e.message : String(e)));
  }
}

/* 3.12.8 diagText — toʻliq matnli hisobot (nusxalash / .txt uchun) */
function diagText(){
  var L = [];
  function line(s){ L.push(s == null ? "" : String(s)); }
  var d = new Date();
  function p2(v){ return (v < 10 ? "0" : "") + v; }

  line("UPAKOFKA — DIAGNOSTIKA HISOBOTI");
  line("Tizim: UPK v" + (typeof APP_VER !== "undefined" ? APP_VER : "?"));
  line("Sana: " + d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) +
       " " + p2(d.getHours()) + ":" + p2(d.getMinutes()));
  line("=".repeat ? "=".repeat(60) : "============================================================");
  line("");

  line("[FAYL]");
  line("  Nomi            : " + (DIAG.fileName || "—"));
  line("  Hajmi           : " + diagSize(DIAG.fileSize || (DIAG.xmlInfo ? DIAG.xmlInfo.chars : 0)));
  line("  Oʻqish (parse)  : " + diagMs(DIAG.parseMs));
  line("  Pochkalash      : " + diagMs(DIAG.packMs));
  line("  Urinish         : " + ((typeof S !== "undefined" ? S.tries : 0) || "—"));
  line("");

  var tparts = (typeof P !== "undefined" && P && P.parts && P.parts.length) ? P.parts : [];
  var tmats  = (typeof P !== "undefined" && P && P.materials && P.materials.length) ? P.materials : [];

  if (typeof P !== "undefined" && P){
    var items = [];
    try { items = buildItems(); } catch(e){ items = []; }
    line("[LOYIHA]");
    line("  Nomi            : " + (P.name || "—"));
    line("  id              : " + (P.uuid || "—"));
    line("  Pozitsiya       : " + tparts.length);
    line("  Detal (jami)    : " + tparts.reduce(function(s, x){ return s + (+(x && x.q) || 0); }, 0));
    line("  Detal (faol)    : " + items.length);
    line("  Massa           : " + items.reduce(function(s, x){ return s + (+(x && x.kg) || 0); }, 0).toFixed(1) + " kg");
    if (typeof PACKS !== "undefined" && PACKS && PACKS.length){
      line("  Pochka          : " + PACKS.filter(function(x){ return !x.odd; }).length);
      line("  Noodatiy        : " + PACKS.filter(function(x){ return x.odd; }).length);
    }
    if (typeof S !== "undefined"){
      // v12: rejim yoʻq — kesim oʻqlari koʻrsatiladi
      var sp = S.split || {}, ax = [];
      if (sp.prod) ax.push("modul");
      if (sp.mat)  ax.push("material");
      if (S.byThick) ax.push("qalinlik");
      line("  Kesim           : " + (ax.length ? ax.join(" + ") : "yoʻq — hammasi aralash"));
      line("  Meʼyor          : maks " + S.maxKg + " kg · maks " + S.maxLayers +
           " qavat · chiqish " + (S.ovhOn ? S.ovh + " mm" : "yoʻq"));
    }
    line("");
  }

  line("[OGOHLANTIRISHLAR] — " + DIAG.warnings.length + " ta");
  if (!DIAG.warnings.length) line("  yoʻq — fayl toza oʻqildi");
  else DIAG.warnings.forEach(function(w){
    line("  " + w.code + " · " + w.msg + " · " + w.n + (w.times > 1 && w.times !== w.n ? " (" + w.times + " marta)" : ""));
  });
  line("");

  var au = diagAuditText();
  if (au){ line("[AUDIT]"); line(au); line(""); }

  if (typeof P !== "undefined" && P){
    line("[MATERIALLAR] — " + tmats.length + " ta");
    tmats.forEach(function(m){
      var c = null;
      try { c = catLookup(m.name, m.t); } catch(e){ c = null; }
      line("  " + (m.name || "—") + " | " + (+m.l || 0) + "x" + (+m.w || 0) + " | " + (+m.t || 0) + " mm | " +
           (+m.kgm2 || 0).toFixed(2) + " kg/m2 | katalog: " + (c ? c.key : "yoʻq"));
    });
    line("");
    var cs = [];
    try { cs = classStats(); } catch(e){ cs = []; }
    line("[KLASSLAR] — " + cs.length + " ta");
    cs.forEach(function(c){
      var sep = (typeof S !== "undefined" && S.sepCls && S.sepCls[c.cls]) ? " (alohida)" : "";
      line("  " + c.cls + " — " + c.n + sep);
    });
    line("");
  }

  var x = DIAG.xmlInfo;
  if (x){
    line("[XML TUZILISHI]");
    if (!x.ok){
      line("  XATO: " + (x.error || "nomaʼlum"));
    } else {
      var xr = (x.rootAttrs && typeof x.rootAttrs.length === "number") ? x.rootAttrs : [];
      var xt = (x.tags && typeof x.tags.length === "number") ? x.tags : [];
      line("  Ildiz: <" + (x.root || "?") + ">");
      xr.forEach(function(a){ line("    @" + (a && a.k) + " = " + (a && a.v)); });
      line("  Elementlar: " + (+x.total || 0) +
           (x.cut ? " (faqat birinchi " + (+x.seen || 0) + " tasi koʻrildi)" : ""));
      line("  Teglar:");
      xt.forEach(function(t){
        if (!t) return;
        var at = (t.attrs && typeof t.attrs.join === "function") ? t.attrs : [];
        line("    <" + t.tag + ">  ×" + (+t.count || 0) + "  [" + at.join(", ") + (t.more ? " +" + t.more : "") + "]");
      });
    }
    line("");
    line("[FAYL BOSHI]");
    line(x.head || "—");
    line("");
  }
  return L.join("\n");
}

/* 3.12.9 Vaqt oʻlchovi.
   Yadro funksiyalarini (packAll / parseProject) OʻRAMAYMIZ — bu diagnostika
   uchun juda qimmat xavf. Vaqtni chaqiruvchining oʻzi yozadi:
     • DIAG.parseMs — 12-upload.js dagi loadXmlText()
     • DIAG.packMs  — 13-app.js dagi recompute()
   Ilgari shu maqsadda diagNow() yordamchisi ochiq turardi, lekin uni hech kim
   ishlatmadi — chaqiruvchilar vaqtni oʻzlari oʻlchaydi. v12 da olib tashlandi. */

/* 3.12.10 tab bogʻlanishi — FAQAT ZAXIRA.
   13-app.js tab tugmalariga oʻz onclick ini qoʻyadi va u yerda renderDiag() bor.
   Bogʻlash DOMContentLoaded da (ya'ni 13-app.js dan KEYIN) ishlaydi: tugmada
   allaqachon ishlov beruvchi boʻlsa — tegmaymiz. Aks holda har bosishda
   renderDiag() ikki marta ishlab, katta buyurtmada audit ikki karra hisoblanardi. */
(function(){
  function bind(){
    var b = document.querySelector('.tabs button[data-v="diag"]');
    if (!b || b.onclick || b.getAttribute("data-diagbound")) return;
    b.setAttribute("data-diagbound", "1");
    b.addEventListener("click", function(){
      try { renderDiag(); } catch(e){ /* diagnostika hech qachon ilovani yiqitmasin */ }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
