/* ============================================================
   3.13 YUKLASH — fayl tanlash, sudrab tashlash, oxirgi fayllar,
        xato oynasi. alert() oʻrniga tushunarli tashxis beriladi.
   Tashqi bogʻlanishlar (yumshoq, boʻlmasa ham ishlaydi):
     11-diag.js  -> DIAG, diagClear(), diagWarn(), xmlStructure(), renderDiag()
     09-storage.js -> Store.available, putFile/listFiles/getFile + oʻchirish
     03-parser.js -> parseProject()      13-app.js -> askAndBoot()
   ============================================================ */

var UP_MAXMB = 60;                 // bundan katta fayl — ogohlantirish bilan davom etadi
var UP_SCANMAX = 4 * 1024 * 1024;  // matn skaneri shuncha belgidan koʻpini koʻrmaydi (muzlab qolmasin)
/* Qabul qilinadigan kengaytmalar. Bu roʻyxat fayl tanlash oynasining
   `accept` atributiga ham qoʻyiladi (`initUpload`) — ilgari u index.html da
   alohida yozilgan edi va ikkalasi bir-biridan uzilib qolishi mumkin edi.
   Kengaytma mos kelmasa fayl baribir oʻqiladi, faqat ogohlantirish chiqadi. */
var UP_EXT   = [".project", ".xml", ".txt"];
var UP_BOUND = false;              // oyna hodisalari bir marta bogʻlanadi
var UP_DRAG  = 0;                  // dragenter/dragleave hisoblagichi
var UP_ZONE  = false;              // overlay hozir koʻrinib turibdimi
var UP_DRAGT = 0;                  // oxirgi dragover vaqti (qotib qolishga qarshi)
var UP_WATCH = null;               // qorovul taymer
var UP_REC   = [];                 // oxirgi fayllar roʻyxati (tugmalar indeks boʻyicha bogʻlanadi)

/* ------------------------------------------------------------
   3.13.0 qoʻshni modullar bilan yumshoq bogʻlanish
   ------------------------------------------------------------ */
function upDiag(){
  if (typeof DIAG === "undefined" || !DIAG){ try { window.DIAG = {}; } catch(e){ return {}; } }
  return DIAG;
}
function upDiagClear(){ if (typeof diagClear === "function"){ try { diagClear(); } catch(e){} } }
function upDiagWarn(code, msg){
  if (typeof diagWarn === "function"){ try { diagWarn(code, msg); return; } catch(e){} }
  if (window.console && console.warn) console.warn("[" + code + "] " + msg);
}
function upStore(){ return (typeof Store !== "undefined" && Store) ? Store : null; }
/* natija oddiy qiymat ham, Promise ham boʻlishi mumkin — ikkalasi ham qoʻllab-quvvatlanadi */
function upThen(v, cb){
  if (v && typeof v.then === "function"){ v.then(function(r){ cb(r); }, function(){ cb(null); }); }
  else cb(v);
}
function upKb(n){ return (Math.round((+n || 0) / 1024 * 10) / 10).toFixed(1); }
/* prototipsiz sanoq obyekti: "constructor" yoki "toString" nomli teg hisobni buzmasin */
function upBag(){
  try { return Object.create(null); } catch(e){ return {}; }
}

/* ------------------------------------------------------------
   3.13.1 XML TUZILMASINI SKANERLASH — DOM buzilgan boʻlsa ham ishlaydi
   (matn boʻyicha, chunki fayl aynan parse boʻlmagani uchun tekshiryapmiz)
   ------------------------------------------------------------ */
function upScanXml(xmlText){
  var all = String(xmlText == null ? "" : xmlText);
  var cut = all.length > UP_SCANMAX;                    // ulkan faylda brauzer muzlamasin
  var t = cut ? all.slice(0, UP_SCANMAX) : all;
  var o = { root:"", tags:upBag(), goods:upBag(), ops:upBag(),
            bytes:all.length, lines:0, cut:cut };
  var m, re = /<([A-Za-z_][A-Za-z0-9_.:-]*)/g;          // yopuvchi teg, <?xml va <!-- tushmaydi
  while ((m = re.exec(t)) !== null){
    if (!o.root) o.root = m[1];
    o.tags[m[1]] = (o.tags[m[1]] || 0) + 1;
  }
  var rg = /<good\b[^>]*?\btypeId\s*=\s*["']([^"']*)["']/gi;
  while ((m = rg.exec(t)) !== null){ o.goods[m[1]] = (o.goods[m[1]] || 0) + 1; }
  var ro = /<operation\b[^>]*?\btypeId\s*=\s*["']([^"']*)["']/gi;
  while ((m = ro.exec(t)) !== null){ o.ops[m[1]] = (o.ops[m[1]] || 0) + 1; }
  /* qatorlar soni — split() ulkan massiv yasamasin uchun sanab chiqiladi */
  var n = 1, p = -1;
  while ((p = t.indexOf("\n", p + 1)) >= 0) n++;
  o.lines = n;
  return o;
}
/* har xil koʻrinishdagi sanoqni {nom:soni} koʻrinishiga keltiradi */
function upMap(v){
  if (!v) return null;
  var o = upBag(), n = 0, i, e, k, c;
  if (Object.prototype.toString.call(v) === "[object Array]"){
    for (i = 0; i < v.length; i++){
      e = v[i]; if (e == null) continue;
      if (typeof e === "string"){ o[e] = (o[e] || 0) + 1; n++; continue; }
      if (typeof e !== "object") continue;
      k = e.name || e.tag || e.key || e.id || e.type || e[0];
      c = e.n || e.count || e.num || e.qty || e[1] || 1;
      if (k == null) continue;
      o[k] = (o[k] || 0) + (+c || 1); n++;
    }
  } else if (typeof v === "object"){
    for (k in v){
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      c = v[k];
      if (typeof c === "number" || typeof c === "string"){ o[k] = +c || 0; n++; }
    }
  }
  return n ? o : null;
}
/* 11-diag.js ning xmlStructure() natijasi — boʻlmasa null */
function upExtInfo(xmlText){
  if (typeof xmlStructure !== "function") return null;
  try {
    var x = xmlStructure(xmlText);
    return (x && typeof x === "object") ? x : null;
  } catch(e){ return null; }
}
/* xmlStructure() natijasi bor boʻlsa oʻshandan, boʻlmasa oʻz skanerdan.
   ext ikkinchi argument sifatida berilsa qayta hisoblanmaydi (katta faylda muhim).

   Ikki manba turli shaklda: `xmlStructure()` teglarni MASSIV qilib beradi
   ({tag,count,attrs}), `upScanXml()` esa XARITA ({teg:soni}). `upMap()` ikkovini
   bitta shaklga keltiradi. `good`/`operation` turlarini xmlStructure sanamaydi —
   ular har doim matn skaneridan olinadi.

   v21: bu yerda maydonlarning oʻn beshta muqobil nomi sinalardi
   (rootTag/rootName/tagCount/goodTypes/opTypes…). Ularning birortasi ham
   `xmlStructure()` natijasida yoʻq — faqat `root`, `tags`, `chars` va `cut` bor. */
function upXmlInfo(xmlText, ext){
  var loc = upScanXml(xmlText);
  if (arguments.length < 2) ext = upExtInfo(xmlText);
  if (!ext || typeof ext !== "object") return loc;
  return {
    root:  (typeof ext.root === "string" && ext.root) ? ext.root : loc.root,
    tags:  upMap(ext.tags) || loc.tags,
    goods: loc.goods,
    ops:   loc.ops,
    bytes: ext.chars || loc.bytes,
    lines: loc.lines,
    cut:   !!(loc.cut || ext.cut),
    raw:   ext
  };
}
/* DIAG.xmlInfo ga aynan 11-diag.js kutgan koʻrinish yoziladi.
   Muvaffaqiyatli oʻqishda matn skaneri umuman ishga tushmaydi. */
function upDiagInfo(xmlText, ext){
  if (arguments.length < 2) ext = upExtInfo(xmlText);
  return ext ? ext : upScanXml(xmlText);
}
function upTop(map, n){
  var k = Object.keys(map || {});
  k.sort(function(a, b){ return (map[b] - map[a]) || (a < b ? -1 : a > b ? 1 : 0); });
  return k.slice(0, n || 12);
}
function upHas(map, k){ return !!(map && Object.prototype.hasOwnProperty.call(map, k)); }
/* fayl umuman XML mi — birinchi belgilaridan */
function upKind(t){
  var s = String(t || "").slice(0, 200).replace(/^\uFEFF/, "");
  if (!s.replace(/\s/g, "")) return "boʻsh — ichida hech narsa yoʻq";
  if (/^PK[\u0003\u0004\u0005]/.test(s)) return "ZIP arxiv (PK…) — bu XML emas, arxivni ochib ichidagi faylni bering";
  if (/^\s*[\{\[]/.test(s)) return "JSON koʻrinishida — XML emas";
  if (/^\s*</.test(s)) return "";
  return "oddiy matn — boshida XML tegi (&lt;) yoʻq";
}
function upDeclEnc(t){
  var m = /^\s*<\?xml[^>]*encoding\s*=\s*["']([\w.\-]+)["']/i.exec(String(t || "").slice(0, 300));
  return m ? m[1] : "";
}

/* ------------------------------------------------------------
   3.13.2 SUDRAB TASHLASH — butun oyna boʻylab overlay
   ------------------------------------------------------------ */
function upDropzone(){
  var z = $("dropzone");
  if (z) return z;
  if (!document.body) return null;               // hali <body> yigʻilmagan
  z = document.createElement("div");
  z.id = "dropzone";
  /* Butun koʻrinish shu yerda: style.css dagi #dropzone qoidasi v21 da olib
     tashlandi — undan faqat backdrop-filter amalda edi, qolgani shu satr
     bilan ustidan yozilardi. */
  z.style.cssText = "display:none;position:fixed;inset:0;z-index:80;background:rgba(10,12,15,.86);" +
    "backdrop-filter:blur(2px);align-items:center;justify-content:center;" +
    "text-align:center;padding:24px;pointer-events:none";
  z.innerHTML = '<div style="border:2px dashed var(--mark);border-radius:8px;padding:42px 54px;background:rgba(30,33,39,.72)">' +
      '<div style="font-size:25px;font-weight:700;letter-spacing:.03em;color:var(--mark)">Faylni shu yerga tashlang</div>' +
      '<div style="font-family:var(--mono);font-size:12.5px;color:var(--ink2);margin-top:9px;letter-spacing:.06em">· .project yoki .xml ·</div>' +
    '</div>';
  document.body.appendChild(z);
  return z;
}
function upZoneShow(on){
  on = !!on;
  if (on === UP_ZONE) return;                    // dragover soniyasiga oʻnlab marta keladi
  UP_ZONE = on;
  var z = upDropzone();
  if (z) z.style.display = on ? "flex" : "none";
  var hint = $("dropHint");                      // menejerdagi yuklash maydoni ham yonadi
  if (hint){
    if (on) hint.classList.add("hot"); else hint.classList.remove("hot");
  }
  if (on) upWatch();
}
/* QOROVUL: baʼzi holatda (fayl oyna tashqarisiga tashlansa, Esc bosilsa) dragleave
   kelmay qoladi va overlay ekranni toʻsib qotib qolardi. dragover toʻxtagach oʻchiramiz. */
function upWatch(){
  if (UP_WATCH || typeof setInterval !== "function") return;
  UP_WATCH = setInterval(function(){
    if (!UP_ZONE){ clearInterval(UP_WATCH); UP_WATCH = null; return; }
    if ((new Date().getTime()) - UP_DRAGT > 600){ UP_DRAG = 0; upZoneShow(false); }
  }, 250);
}
function upHasFile(e){
  var dt = e.dataTransfer, t, i;
  if (!dt) return false;
  t = dt.types;
  if (!t || !t.length) return true;           // eski brauzer — tekshirmay ruxsat beramiz
  for (i = 0; i < t.length; i++) if (t[i] === "Files") return true;
  return false;
}
function upDragEnter(e){
  if (!upHasFile(e)) return;
  e.preventDefault();
  UP_DRAG++; UP_DRAGT = new Date().getTime();
  upZoneShow(true);
}
function upDragOver(e){
  if (!upHasFile(e)) return;
  e.preventDefault();                          // shusiz brauzer faylni oʻzi ochib yuboradi
  if (e.dataTransfer){ try { e.dataTransfer.dropEffect = "copy"; } catch(x){} }
  UP_DRAGT = new Date().getTime();
  upZoneShow(true);
}
function upDragLeave(e){
  if (!upHasFile(e)) return;
  e.preventDefault();
  UP_DRAG = Math.max(0, UP_DRAG - 1);
  if (!UP_DRAG) upZoneShow(false);
}
function upDrop(e){
  e.preventDefault();
  UP_DRAG = 0; upZoneShow(false);
  var dt = e.dataTransfer, fl = dt ? dt.files : null;
  if (!fl || !fl.length){
    upDiagWarn("TASHLASH", "tashlangan narsada fayl yoʻq — matn yoki havola tashlandi");
    return;
  }
  if (fl.length > 1) upDiagWarn("TASHLASH", fl.length + " ta fayl tashlandi — faqat birinchisi «" + (fl[0].name || "") + "» oʻqiladi");
  readFile(fl[0]);
}

/* ------------------------------------------------------------
   3.13.3 FAYLNI OʻQISH
   ------------------------------------------------------------ */
function upPick(){ var f = $("file"); if (f) f.click(); }

function readFile(f, enc){
  if (!f) return;
  var nm = f.name || "fayl", low = nm.toLowerCase(), isRetry = !!enc, okExt = false, i;
  if (!isRetry){
    for (i = 0; i < UP_EXT.length; i++){
      if (low.length >= UP_EXT[i].length && low.slice(-UP_EXT[i].length) === UP_EXT[i]) okExt = true;
    }
    if (!okExt) upDiagWarn("KENGAYTMA", "«" + nm + "» — kutilgani .project, .xml yoki .txt edi. Fayl baribir oʻqib koʻriladi.");
    if (!f.size){
      showLoadError(new Error("Fayl boʻsh — hajmi 0 bayt. Toʻliq koʻchirilmagan yoki nusxa olishda uzilib qolgan boʻlishi mumkin."), "", nm);
      return;
    }
    if (f.size > UP_MAXMB * 1024 * 1024){
      upDiagWarn("HAJM", "fayl " + upKb(f.size / 1024) + " MB — " + UP_MAXMB + " MB dan katta. Oʻqish sekin kechishi mumkin.");
    }
  }
  var r = new FileReader();
  r.onerror = function(){
    showLoadError(new Error("Faylni oʻqib boʻlmadi — brauzer ruxsat bermadi yoki fayl boshqa dasturda band."), "", nm);
  };
  r.onload = function(){
    var txt = String(r.result == null ? "" : r.result);
    // UTF-8 da oʻqilganda buzuq belgilar chiqsa — eʼlon qilingan kodirovkada bir marta qayta oʻqiladi
    if (!isRetry && txt.indexOf("\uFFFD") >= 0){
      var e2 = upDeclEnc(txt) || "windows-1251";
      upDiagWarn("KODIROVKA", "fayl UTF-8 emas — «" + e2 + "» kodirovkasida qayta oʻqilmoqda");
      try { readFile(f, e2); return; } catch(x){}
    }
    loadXmlText(txt, nm);
  };
  try { r.readAsText(f, enc || "utf-8"); }
  catch(e){ showLoadError(e, "", nm); }
}

function loadXmlText(xmlText, fname){
  upDiagClear();
  var d = upDiag(), st = upStore(), data = null, err = null;
  d.fileName = fname || "";
  d.fileSize = String(xmlText || "").length;
  var t0 = nowMs();
  try { data = parseProject(xmlText); }
  catch(e){ err = e; }
  var t1 = nowMs();
  d.parseMs = Math.round((t1 - t0) * 10) / 10;
  var ext = upExtInfo(xmlText);            // bir marta hisoblanadi, xato oynasiga ham shu beriladi
  d.xmlInfo = upDiagInfo(xmlText, ext);
  /* v12: bu yerda DIAG ga head, parseOk va error ham yozilardi. Uchalasini ham
     hech kim oʻqimasdi (diagnostikadagi «head» va «error» — DIAG.xmlInfo ichidagi
     boshqa maydonlar), diagClear() esa ularni tozalamasdi: eski fayldan qolgan
     qiymat keyingi faylga oʻtib ketardi. */

  if (err){
    showLoadError(err, xmlText, fname, ext);
    return null;
  }
  // fayl tarixiga yozib qoʻyamiz — xatosi ish jarayoniga taʼsir qilmaydi
  if (st && typeof st.putFile === "function"){
    try { upThen(st.putFile({ name: fname || "loyiha.project", xml: xmlText, ts: Date.now() }), function(){ renderRecent(); }); }
    catch(e2){ upDiagWarn("SAQLASH", "fayl tarixiga yozib boʻlmadi: " + (e2.message || e2)); }
  }
  renderRecent();
  /* interfeysga uzatish. Bu bosqichdagi xato ham koʻrinmay qolmasin:
     ilgari u FileReader ichida yoʻqolib ketardi va tugma «ishlamayotgandek» tuyulardi. */
  if (typeof askAndBoot !== "function"){
    upDiagWarn("YUKLASH", "askAndBoot() topilmadi — fayl oʻqildi, lekin oyna ochilmadi");
    return data;
  }
  try { askAndBoot(data, fname); }
  catch(e3){
    upDiagWarn("YUKLASH", "oyna ochilmadi: " + (e3.message || e3));
    showLoadError(e3, xmlText, fname, ext, "FAYL OʻQILDI — LEKIN OCHILMADI");
  }
  return data;
}

/* ------------------------------------------------------------
   3.13.4 XATO OYNASI — notanish formatni bir qarashda tushuntiradi
   ------------------------------------------------------------ */
function upErrBox(){
  var d = $("loadErr");
  if (d) return d;
  if (!document.body) return null;
  d = document.createElement("div");
  d.id = "loadErr";
  d.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,12,15,.82);z-index:90;" +
    "align-items:center;justify-content:center;padding:18px";
  d.innerHTML = '<div id="loadErrIn" style="background:var(--panel);border:1px solid var(--line2);' +
    'border-left:3px solid var(--alert);border-radius:6px;padding:20px 22px;width:780px;max-width:96vw;' +
    'max-height:90vh;overflow:auto"></div>';
  document.body.appendChild(d);
  d.onclick = function(e){ if (e.target === d) upErrHide(); };   // fon bosilsa yopiladi
  return d;
}
function upErrHide(){ var d = $("loadErr"); if (d) d.style.display = "none"; }
function upGoDiag(){
  var b = document.querySelector('.tabs button[data-v="diag"]');
  if (b) b.click();
  if (typeof renderDiag === "function"){ try { renderDiag(); } catch(e){} }
}
function upRow(k, v){
  return '<div style="display:grid;grid-template-columns:130px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)">' +
    '<div style="font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink3);padding-top:3px">' + k + '</div>' +
    '<div style="font-size:12.5px;color:var(--ink2);word-break:break-word">' + v + '</div></div>';
}
function upChip(txt, col){
  return '<span style="display:inline-block;font-family:var(--mono);font-size:10.5px;background:var(--panel2);' +
    'border:1px solid var(--line);border-radius:2px;padding:1px 6px;margin:0 4px 4px 0;color:' + (col || "var(--ink2)") + '">' + txt + '</span>';
}
function upBad(t){ return '<span style="color:var(--alert)">' + t + '</span>'; }

function showLoadError(err, xmlText, fname, ext, title){
  var box = upErrBox(), inn = box ? $("loadErrIn") : null;
  var txt  = String(xmlText == null ? "" : xmlText);
  var msg  = err ? (err.message || String(err)) : "nomaʼlum xato";
  if (!box || !inn){                                  // oyna yasalmadi — hech boʻlmasa konsolga
    upDiagWarn("XATO", (fname || "fayl") + ": " + msg);
    return;
  }
  var info = (arguments.length > 3) ? upXmlInfo(txt, ext) : upXmlInfo(txt);
  var h = [], kind = upKind(txt);

  h.push('<div style="font-size:15px;font-weight:700;letter-spacing:.04em;color:var(--alert);margin-bottom:3px">' +
    esc(title || "FAYL OʻQILMADI") + '</div>');
  h.push('<div style="font-family:var(--mono);font-size:11px;color:var(--ink3);margin-bottom:12px">' +
    esc(fname || "—") + ' · ' + upKb(txt.length) + ' KB · ' + (info.lines || 1) + ' qator</div>');
  h.push('<div class="msg err" style="min-height:0;padding:0 0 12px;font-size:12.5px">' + esc(msg) + '</div>');

  h.push('<div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin:0 0 4px">Tashxis</div>');

  if (kind) h.push(upRow("Fayl turi", upBad(kind)));

  // 1) root teg — 03-parser.js katta-kichik harfga qaramaydi, biz ham
  var root = info.root || "";
  h.push(upRow("Root teg", root
    ? (String(root).toLowerCase() === "project"
        ? '<b style="color:var(--ok)">&lt;' + esc(root) + '&gt;</b> — toʻgʻri, muammo ichkarida'
        : 'kutilgan <b>&lt;project&gt;</b>, topilgan ' + upBad('<b>&lt;' + esc(root) + '&gt;</b>'))
    : upBad("teg umuman topilmadi")));

  // 2) qanday teglar bor
  var tags = info.tags || {}, tk = upTop(tags, 12), tAll = Object.keys(tags).length;
  h.push(upRow("Teglar · " + tAll + " xil", (tk.length
    ? tk.map(function(k){ return upChip(esc(k) + ' <i style="font-style:normal;color:var(--ink3)">' + tags[k] + '</i>'); }).join("") +
      (tAll > tk.length ? '<span style="font-family:var(--mono);font-size:10.5px;color:var(--ink3)">… yana ' + (tAll - tk.length) + ' xil</span>' : "")
    : upBad("hech qanday teg yoʻq — bu XML fayl emas")) +
    (info.cut ? '<div style="color:var(--mark);margin-top:3px">fayl juda katta — faqat birinchi ' +
      Math.round(UP_SCANMAX / 1024 / 1024) + ' MB sanaldi</div>' : "")));

  // 3) good teglari va typeId qiymatlari
  var gN = tags.good || 0, gT = info.goods || {}, gk = upTop(gT, 12), gTxt;
  if (!gN){
    gTxt = upBad("topilmadi") + ' — material va detallar aynan &lt;good&gt; teglaridan oʻqiladi';
  } else {
    gTxt = '<b>' + gN + '</b> ta';
    if (gk.length){
      gTxt += ' · typeId: ' + gk.map(function(k){
        return upChip(esc(k) + ' <i style="font-style:normal;color:var(--ink3)">' + gT[k] + '</i>',
          (k === "sheet" || k === "product") ? "var(--ok)" : "var(--ink2)");
      }).join("");
      if (!upHas(gT, "sheet"))   gTxt += '<div style="color:var(--alert);margin-top:2px">typeId="sheet" yoʻq — material bazasi boʻsh chiqadi</div>';
      if (!upHas(gT, "product")) gTxt += '<div style="color:var(--alert);margin-top:2px">typeId="product" yoʻq — detallar shu turdagi good ichidan olinadi</div>';
    } else {
      gTxt += ' · ' + upBad('typeId atributi yoʻq');
    }
  }
  h.push(upRow("&lt;good&gt;", gTxt));

  // 4) operation teglari va typeId qiymatlari
  var oN = tags.operation || 0, oT = info.ops || {}, okeys = upTop(oT, 12), oTxt;
  if (!oN){
    oTxt = '<span style="color:var(--mark)">topilmadi</span> — raskroy (CS) boʻlmasa detal↔material bogʻlanishi aniqlanmaydi';
  } else {
    oTxt = '<b>' + oN + '</b> ta';
    if (okeys.length){
      oTxt += ' · typeId: ' + okeys.map(function(k){
        return upChip(esc(k) + ' <i style="font-style:normal;color:var(--ink3)">' + oT[k] + '</i>',
          k === "CS" ? "var(--ok)" : "var(--ink2)");
      }).join("");
      if (!upHas(oT, "CS")) oTxt += '<div style="color:var(--mark);margin-top:2px">typeId="CS" (raskroy) yoʻq — har detal birinchi materialga bogʻlanadi</div>';
    } else {
      oTxt += ' · ' + upBad('typeId atributi yoʻq');
    }
  }
  h.push(upRow("&lt;operation&gt;", oTxt));

  if (txt.indexOf("\uFFFD") >= 0){
    h.push(upRow("Kodirovka", upBad("faylda oʻqib boʻlmagan belgilar bor") + " — fayl UTF-8 emas (ehtimol Windows-1251)"));
  }

  h.push('<div class="note" style="border-left-color:var(--mark)">Bu format tizimga tanish emas boʻlsa — <b>Diagnostika</b> boʻlimida ' +
    'faylning toʻliq tuzilmasi, atributlari va namunaviy qatorlari koʻrinadi. Oʻsha maʼlumotni dasturchiga yuborsangiz format qoʻshiladi.</div>');

  h.push('<div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin:12px 0 5px">Fayl boshi — birinchi 1200 belgi</div>');
  h.push('<pre style="background:var(--void);border:1px solid var(--line);border-radius:var(--r);padding:10px 12px;' +
    'font-family:var(--mono);font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;' +
    'max-height:250px;overflow:auto;margin:0;color:var(--ink2)">' +
    (txt.length ? esc(txt.slice(0, 1200)) + (txt.length > 1200 ? "\n…" : "") : "— fayl boʻsh —") + '</pre>');

  h.push('<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button class="btn pri" id="leDiag">Diagnostikaga oʻtish</button>' +
    '<button class="btn gh" id="leClose">Yopish</button></div>');

  inn.innerHTML = h.join("");
  $("leClose").onclick = upErrHide;
  $("leDiag").onclick  = function(){ upErrHide(); upGoDiag(); };
  box.style.display = "flex";
}

/* ------------------------------------------------------------
   3.13.5 OXIRGI FAYLLAR — #recentBox (proekt menejer)
   ------------------------------------------------------------ */
/* Yozuv shakli 09-storage.js `metaOf()` da belgilangan: { id, name, ts, size }.
   v21: ilgari bu uch funksiya oʻn ikki xil maydon nomini taxmin qilardi
   (key/time/date/saved/bytes/len…) — hech biri hech qachon uchramaydi.
   `xml.length` zaxirasi qoladi: xotira rejimida toʻliq yozuv kelishi mumkin. */
function upRecId(r){ return r ? r.id : null; }
function upRecTs(r){ return +(r && r.ts) || 0; }
function upRecSize(r){
  if (!r) return 0;
  if (r.size != null) return +r.size || 0;
  return (typeof r.xml === "string") ? r.xml.length : 0;
}
function upDate(ts){
  if (!ts) return "sana nomaʼlum";
  var d = new Date(ts);
  if (isNaN(d.getTime())) return "sana nomaʼlum";
  try { return d.toLocaleString(); } catch(e){}
  // pad2() — 04-packer.js
  return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() +
         " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
/* v10 da bu roʻyxat tepasida «Fayl tanlash» tugmasi bor edi, lekin ekran tepasida
   allaqachon «Loyiha yuklash» turibdi — ikkita bir xil tugma ortiqcha shovqin edi.
   v10 da tugma boʻsh satr qaytaradigan qilingan, v12 da butunlay olib tashlandi
   (u bilan birga hech qachon element topmaydigan [data-pick] bogʻlanishi ham). */

function renderRecent(){
  var box = $("recentBox");
  if (!box) return;                                   // konteyner hali qoʻyilmagan
  var st = upStore();
  if (!st || st.available === false || typeof st.listFiles !== "function"){
    box.innerHTML = '<div class="note" style="border-left-color:var(--ink3)">Bu brauzerda fayl tarixi saqlanmaydi — ' +
      'har safar faylni qoʻlda tanlaysiz.</div>';
    upBindRecent(box);
    return;
  }
  var lst = null;
  try { lst = st.listFiles(); } catch(e){ lst = null; }
  upThen(lst, function(arr){ upDrawRecent(box, arr); });
}

function upDrawRecent(box, arr){
  var list = [], i, h = [], max;
  if (arr && arr.length){ for (i = 0; i < arr.length; i++) if (arr[i]) list.push(arr[i]); }
  list.sort(function(a, b){ return upRecTs(b) - upRecTs(a); });
  UP_REC = list;
  if (!list.length){
    box.innerHTML = '<div class="note" style="border-left-color:var(--ink3)">Hali fayl yuklanmagan — ' +
      '«Loyiha yuklash» tugmasini bosing yoki faylni shu oynaga sudrab tashlang.</div>';
    upBindRecent(box);
    return;
  }
  max = Math.min(list.length, 12);
  for (i = 0; i < max; i++) h.push(upRecRow(list[i], i));
  if (list.length > max){
    h.push('<div style="font-family:var(--mono);font-size:10.5px;color:var(--ink3);padding:2px 2px 4px">yana ' +
      (list.length - max) + ' ta eski fayl saqlangan</div>');
  }
  box.innerHTML = h.join("");
  upBindRecent(box);
}

function upRecRow(rec, i){
  var nm = (rec && rec.name) || "nomsiz fayl";
  return '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:9px;align-items:center;' +
      'background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:8px 10px;margin-bottom:7px">' +
    '<div style="min-width:0">' +
      '<div style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(nm) + '</div>' +
      '<div style="font-family:var(--mono);font-size:10px;color:var(--ink3);letter-spacing:.04em">' + esc(upDate(upRecTs(rec))) + '</div>' +
    '</div>' +
    '<div style="font-family:var(--mono);font-size:11px;color:var(--ink2);white-space:nowrap">' + upKb(upRecSize(rec)) + ' KB</div>' +
    '<button class="btn" data-open="' + i + '" style="padding:5px 11px;font-size:11.5px">Ochish</button>' +
    '<button class="btn gh" data-del="' + i + '" style="padding:5px 11px;font-size:11.5px">Oʻchirish</button>' +
  '</div>';
}

function upBindRecent(box){
  box.querySelectorAll("[data-open]").forEach(function(b){
    b.onclick = function(){ upOpenRecent(UP_REC[+b.getAttribute("data-open")]); };
  });
  box.querySelectorAll("[data-del]").forEach(function(b){
    b.onclick = function(){
      var rec = UP_REC[+b.getAttribute("data-del")];
      if (!rec) return;
      if (b.getAttribute("data-arm") !== "1"){            // ikki bosqichli tasdiq (alert/confirm oʻrniga)
        box.querySelectorAll("[data-del]").forEach(function(o){
          o.removeAttribute("data-arm"); o.textContent = "Oʻchirish"; o.style.color = "";
        });
        b.setAttribute("data-arm", "1");
        b.textContent = "Rostdan?";
        b.style.color = "var(--alert)";
        return;
      }
      upDelRecent(rec);
    };
  });
}

function upOpenRecent(rec){
  if (!rec) return;
  var st = upStore(), v = null;
  if (!st || typeof st.getFile !== "function"){
    if (typeof rec.xml === "string" && rec.xml) loadXmlText(rec.xml, rec.name || "loyiha.project");
    return;
  }
  try { v = st.getFile(upRecId(rec)); } catch(e){ v = null; }
  upThen(v, function(g){
    var xml = (typeof g === "string") ? g : (g && (g.xml || g.text || g.data)) || "";
    var nm  = (g && g.name) || rec.name || "loyiha.project";
    if (!xml){
      showLoadError(new Error("Saqlangan fayl topilmadi yoki boʻsh — tarixdan oʻchirilgan boʻlishi mumkin."), "", nm);
      renderRecent();
      return;
    }
    loadXmlText(xml, nm);
  });
}

function upDelRecent(rec){
  var st = upStore();
  /* v21: ilgari bu yerda oʻchirish metodining YETTI xil nomi sinalardi
     (delFile / deleteFile / removeFile / rmFile / dropFile / del / remove).
     Store — shu repodagi qoʻshni modul (09-storage.js) va unda aynan bitta
     nom bor. Qolgan oltitasi hech qachon topilmasdi, lekin haqiqiy shartnoma
     nima ekanini yashirardi. */
  if (!st || typeof st.delFile !== "function"){
    upDiagWarn("SAQLASH", "Store ichida oʻchirish funksiyasi yoʻq — fayl tarixdan olinmadi");
    renderRecent();
    return;
  }
  try { upThen(st.delFile(upRecId(rec)), function(){ renderRecent(); }); }
  catch(e){ upDiagWarn("SAQLASH", "oʻchirib boʻlmadi: " + (e.message || e)); renderRecent(); }
}

/* ------------------------------------------------------------
   3.13.6 ISHGA TUSHIRISH
   ------------------------------------------------------------ */
function upKey(e){
  var d;
  if (e.key === "Escape"){
    d = $("loadErr");
    if (d && d.style.display !== "none"){ e.preventDefault(); upErrHide(); }
    return;
  }
  // Ctrl+O (yoki Cmd+O) — fayl tanlash oynasi
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key || "").toLowerCase() === "o"){
    e.preventDefault();
    upPick();
  }
}

function initUpload(){
  var b = $("btnLoad"), f = $("file"), mt;
  // tugma va input har chaqiruvda qayta bogʻlanadi (13-app.js dagi eski bogʻlanish ustidan yozadi)
  if (b) b.onclick = function(){ upPick(); };
  if (f) f.accept = UP_EXT.join(",");     // yagona manba — UP_EXT
  if (f) f.onchange = function(){
    var file = (f.files && f.files[0]) || null;
    f.value = "";                     // bir xil faylni ketma-ket ikki marta tanlash uchun
    if (file) readFile(file);
  };
  if (!UP_BOUND){
    UP_BOUND = true;
    upDropzone();
    window.addEventListener("dragenter", upDragEnter, false);
    window.addEventListener("dragover",  upDragOver,  false);
    window.addEventListener("dragleave", upDragLeave, false);
    window.addEventListener("drop",      upDrop,      false);
    document.addEventListener("keydown", upKey, false);
    mt = document.querySelector('.tabs button[data-v="mgr"]');
    if (mt) mt.addEventListener("click", function(){ renderRecent(); }, false);
  }
  renderRecent();
}

/* 13-app.js initUpload() ni chaqirmasa ham modul oʻzi ishga tushadi.
   setTimeout — 13-app.js ning eski onclick bogʻlanishlaridan KEYIN bajarilishi uchun. */
if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(initUpload, 0); }, false);
} else {
  setTimeout(initUpload, 0);
}
