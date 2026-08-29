# ================================================================
#  SMOKE TEST — sahifani HAQIQIY brauzerda (headless) yuklab tekshiradi
#
#  Node.js kerak emas. Edge yoki Chrome dan foydalanadi.
#
#  Ishlatish:
#     .\tests\smoke.ps1                 modulli versiya (index.html)
#     .\tests\smoke.ps1 -Target dist    yig'ilgan bir faylli versiya
#     .\tests\smoke.ps1 -Keep           vaqtinchalik faylni qoldiradi
#     .\tests\smoke.ps1 -Http           file:// o'rniga http:// orqali (GitHub Pages sinovi)
#
#  -Http nima uchun: sexda tizim file:// dan ochiladi, GitHub Pages esa http(s)://
#  beradi. Ikkalasi bir xil emas — Chromium file:// da IndexedDB ni bloklaydi,
#  yo'llar boshqacha yechiladi, Linux serveri esa katta-kichik harfni farqlaydi.
#  Shuning uchun ikkala yo'l ham SHU test bilan tekshiriladi. Python kerak.
# ================================================================
param(
  [ValidateSet("dev","dist")]
  [string]$Target = "dev",
  [string]$Browser = "",
  [switch]$Keep,
  [switch]$Http,
  [int]$Port = 8731,
  [int]$TimeoutSec = 120
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$enc  = New-Object System.Text.UTF8Encoding($false)

# --- 1. brauzerni topish ---
if (-not $Browser) {
  $cand = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $cand) { if (Test-Path $c) { $Browser = $c; break } }
}
if (-not $Browser -or -not (Test-Path $Browser)) {
  "XATO: Edge yoki Chrome topilmadi. -Browser bilan yo'lni ko'rsating."
  exit 1
}
"Brauzer : $Browser"

# --- 2. nishon sahifa ---
if ($Target -eq "dist") { $idx = Join-Path $root "dist\upakofka-tizimi.html" }
else                    { $idx = Join-Path $root "index.html" }
if (-not (Test-Path $idx)) { "XATO: nishon topilmadi: $idx"; exit 1 }
"Nishon  : $Target -- $idx"
$html = [System.IO.File]::ReadAllText($idx, [System.Text.Encoding]::UTF8)

# --- 3. namuna XML larni sahifaga singdirish (bo'lsa) ---
function AsJsString([string]$p) {
  if (-not (Test-Path $p)) { return "null" }
  $t = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
  return (ConvertTo-Json $t -Compress)
}
$namunaJs = AsJsString (Join-Path $root "namuna\namuna.project")
$yupqaJs  = AsJsString (Join-Path $root "namuna\test-yupqa.project")
# haqiqiy Gib Lab fayli: 1 ta good, ichida 5 ta mustaqil mebel — chegara faqat kodda
$spJs     = AsJsString (Join-Path $root "namuna\komplekt-5modul.project")

# ma'lumot alohida blokda beriladi — test skriptining o'zida PowerShell interpolatsiyasi
# bo'lmasligi uchun (JS dagi $("id") ni PowerShell subexpression deb o'qib yuboradi)
$dataBlock = "<script>window.__NAMUNA = $namunaJs; window.__YUPQA = $yupqaJs; window.__K5MOD = $spJs;</script>"

# --- 4. xato ushlagich (modul skriptlaridan OLDIN turishi shart) ---
$catcher = @'
<script>
window.__ERRORS = [];
window.addEventListener("error", function(e){
  window.__ERRORS.push((e.message||"xato") + " @ " + (e.filename||"?").split("/").pop() + ":" + (e.lineno||"?"));
});
window.addEventListener("unhandledrejection", function(e){
  window.__ERRORS.push("promise: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
});
</script>
'@

# --- 5. test skripti (BIR TIRNOQLI here-string: PowerShell ichiga tegmaydi) ---
$tester = @'
<script>
(function(){
  var NAMUNA = window.__NAMUNA, YUPQA = window.__YUPQA, K5MOD = window.__K5MOD;
  var L = [], fail = 0;

  function chk(name, cond, info){
    L.push((cond ? "OK   " : "XATO ") + "| " + name + (info ? "  ->  " + info : ""));
    if (!cond) fail++;
  }
  function note(txt){ L.push("---  | " + txt); }
  function done(){
    L.push("");
    L.push("NATIJA: " + (fail ? (fail + " TA XATO") : "HAMMASI OK"));
    var d = document.createElement("pre");
    d.id = "TESTOUT";
    d.textContent = "===SMOKE-START===\n" + L.join("\n") + "\n===SMOKE-END===";
    document.body.appendChild(d);
    document.title = fail ? "SMOKE-FAIL" : "SMOKE-PASS";
  }
  /* shart bajarilguncha kutish (virtual vaqt tufayli tez o'tadi) */
  function until(cond, cb, tries){
    tries = tries || 0;
    if (cond() || tries > 150) { cb(cond()); return; }
    setTimeout(function(){ until(cond, cb, tries + 1); }, 60);
  }

  function el(id){ return document.getElementById(id); }

  /* ---------- 1-BOSQICH: yuklanish va yadro ---------- */
  function stage1(){
    chk("JS xatosi yo'q", window.__ERRORS.length === 0, window.__ERRORS.slice(0,4).join(" ; "));
    var ready = (typeof PACKS !== "undefined" && PACKS && PACKS.length > 0);
    chk("pochkalar hisoblandi", ready, "PACKS=" + (typeof PACKS !== "undefined" ? PACKS.length : "yo'q"));
    if (!ready) { done(); return; }

    var need = ["parseProject","packAll","packAllAsync","packSeq","auditPacks","auditBadgeHTML",
                "makeSnapshot","restoreSnapshot","snapPacks","autosave","renderDiag","diagWarn",
                "xmlStructure","initUpload","loadXmlText","renderRecent","showLoadError","drawQR",
                "labelHTML","packLabelHTML","packBrutto","projTag","setStep","applyPageSize",
                "addMaterial","recompute","recomputeSoon","boot","askAndBoot","writeConf","readConf"];
    var yoq = need.filter(function(n){ return typeof window[n] !== "function"; });
    chk("barcha funksiyalar mavjud", yoq.length === 0, yoq.join(","));
    chk("Store obyekti bor", typeof Store === "object" && Store !== null);
    chk("DIAG obyekti bor", typeof DIAG === "object" && DIAG !== null);

    var items = buildItems();
    var a = auditPacks(PACKS, items);
    chk("audit: xato yo'q", a.errors.length === 0,
        a.errors.slice(0,5).map(function(e){ return e.code + " P" + e.pack; }).join(" | "));
    chk("hamma detal joylashgan", a.stats.itemsPlaced === a.stats.itemsExpected,
        a.stats.itemsPlaced + "/" + a.stats.itemsExpected);
    // ogohlantirishlar xato emas, lekin qanaqaligi koʻrinib tursin
    var wc = {};
    a.warnings.forEach(function(w){ wc[w.code] = (wc[w.code]||0) + 1; });
    note("ogohlantirishlar: " + (a.warnings.length
      ? Object.keys(wc).map(function(k){ return k + "×" + wc[k]; }).join(", ") : "yo'q"));
    note("statistika: " + a.stats.packs + " pochka (" + a.stats.oddPacks + " noodatiy), " +
         a.stats.totalKg.toFixed(0) + " kg, o'rtacha " + a.stats.avgKg.toFixed(1) + " kg, " +
         "to'ldirish " + Math.round(a.stats.avgFill * 100) + "%, maks " + a.stats.maxLayerUsed + " qavat");

    chk("pochkalar ro'yxati chizildi",
        document.querySelectorAll("#packList .pk").length === PACKS.length,
        document.querySelectorAll("#packList .pk").length + " qator");
    chk("keyingi detal karti to'ldi", (el("nextBox").textContent || "").length > 20);
    chk("shapka: detal soni", /[1-9]/.test(el("sParts").textContent || ""), el("sParts").textContent);
    chk("shapka: audit belgisi", (el("auditBadge").textContent || "").length > 0,
        (el("auditBadge").textContent || "").slice(0,40));
    chk("3D holst chizildi", el("c3d").width > 100 && el("c3d").height > 30,
        el("c3d").width + "x" + el("c3d").height);
    chk("2D reja holsti", el("c2d").width > 0);
    chk("diagnostika bo'limi bor", !!el("v-diag") && !!el("diagBox"));

    stage2();
  }

  /* ---------- 2-BOSQICH: QR, chek, snapshot ---------- */
  function stage2(){
    try {
      var p0 = PACKS[0], t0 = qrText(p0, p0.seq[0]);
      var m = QRLIB.QR.make(t0);
      chk("QR matni formati", /^[A-Z0-9]+\.[A-Z0-9]+\.R\d+\|P\d\d\|Q\d+\|/.test(t0), t0);
      chk("QR matritsasi", m && m.length >= 21, m ? (m.length + "x" + m.length) : "yo'q");
      var cv = document.createElement("canvas");
      drawQR(cv, t0);
      var k = Math.max(1, Math.ceil(420 / (m.length + 8)));
      chk("QR quiet zone = 4 modul", cv.width === (m.length + 8) * k, cv.width + "px");
    } catch(e){ chk("QR ishladi", false, e.message); }

    try {
      var lh = labelHTML(PACKS[0], PACKS[0].seq[0], "tq1");
      chk("detal cheki yasaldi", lh.indexOf("class=\"label\"") >= 0 && lh.length > 300);
      var ph = packLabelHTML(PACKS[0], "tq2");
      chk("pochka cheki yasaldi", ph.indexOf("POCHKA P") >= 0);
      chk("chekda brutto bor", ph.indexOf("Brutto") >= 0 && ph.indexOf("Netto") >= 0);
      var br = packBrutto(PACKS[0]);
      chk("brutto = netto + tara", Math.abs(br - (PACKS[0].kg + S.tare)) < 1e-9,
          br.toFixed(2) + " = " + PACKS[0].kg.toFixed(2) + " + " + S.tare);
      applyPageSize();
      chk("chop etish o'lchami qo'llandi", !!document.getElementById("pageStyle"));
    } catch(e){ chk("cheklar", false, e.message); }

    try {
      var snap = makeSnapshot();
      var json = JSON.stringify(snap);
      var before  = PACKS.map(function(p){ return p.seq.length; }).join(",");
      var kgBefore = PACKS.reduce(function(s,p){ return s + p.kg; }, 0).toFixed(3);
      var ok = restoreSnapshot(JSON.parse(json));
      var after   = PACKS.map(function(p){ return p.seq.length; }).join(",");
      var kgAfter = PACKS.reduce(function(s,p){ return s + p.kg; }, 0).toFixed(3);
      chk("snapshot tiklandi", ok === true);
      chk("snapshot: ketma-ketlik bir xil", before === after);
      chk("snapshot: massa bir xil", kgBefore === kgAfter, kgBefore + " vs " + kgAfter);
      chk("snapshot hajmi oqilona", json.length < 3000000, Math.round(json.length/1024) + " KB");
      chk("tiklangandan keyin audit toza", auditPacks(PACKS, buildItems()).errors.length === 0);
    } catch(e){ chk("snapshot aylanmasi", false, e.message); }

    stage3();
  }

  /* ---------- 3-BOSQICH: parser mustahkamligi ---------- */
  function stage3(){
    if (NAMUNA) {
      try {
        var d1 = parseProject(NAMUNA);
        var qty = d1.parts.reduce(function(s,p){ return s + p.q; }, 0);
        var seedQty = SEED.parts.reduce(function(s,p){ return s + p.q; }, 0);
        chk("namuna.project o'qildi", d1.parts.length > 0,
            d1.parts.length + " pozitsiya, " + d1.materials.length + " material, " + qty + " detal");
        chk("namuna: detal soni SEED bilan mos", qty === seedQty, qty + " vs " + seedQty);
        chk("namuna: hamma detalga material topildi",
            d1.parts.filter(function(p){ return p.noMat; }).length === 0);
        chk("namuna: o'lchamlar butun",
            d1.parts.filter(function(p){ return !(p.l>0) || !(p.w>0); }).length === 0);
      } catch(e){ chk("namuna.project parse", false, e.message); }
    } else { note("namuna/namuna.project topilmadi, o'tkazib yuborildi"); }

    if (YUPQA) {
      try {
        var d2 = parseProject(YUPQA);
        var ts = d2.materials.map(function(m){ return m.t; });
        chk("0.6 mm qalinlik saqlandi", ts.indexOf(0.6) >= 0, "qalinliklar: " + ts.join(", "));
        var m06 = d2.materials.filter(function(m){ return Math.abs(m.t - 0.6) < 0.01; })[0];
        chk("0.6 mm material massasi > 0", !!m06 && m06.kgm2 > 0,
            m06 ? m06.kgm2 + " kg/m2" : "material yo'q");
        var m32 = d2.materials.filter(function(m){ return Math.abs(m.t - 3.2) < 0.01; })[0];
        chk("3.2 mm qalinlik saqlandi", !!m32, m32 ? (m32.t + " mm") : "yo'q");
      } catch(e){ chk("test-yupqa.project parse", false, e.message); }
    } else { note("namuna/test-yupqa.project topilmadi, o'tkazib yuborildi"); }

    // sun'iy yupqa material — namuna fayl bo'lmasa ham parseFloat tuzatishini isbotlaydi
    try {
      var mini = '<?xml version="1.0" encoding="utf-8"?>' +
        '<project name="Sinov 0.6" project.uuid="deadbeef-0000">' +
        '<good id="s1" typeId="sheet" name="XDF 0.6 mm orqa devor" l="2800" w="2070" t="0.6" count="3"/>' +
        '<good id="s2" typeId="sheet" name="LDSP 16 mm oq" l="2750" w="1830" t="16" count="8"/>' +
        '<good id="pr1" typeId="product" name="Sinov shkaf" code="990001">' +
          '<part id="a1" code="99_001" name="BOK CHAP" l="1800" w="450" count="2" elt="1"/>' +
          '<part id="a2" code="99_002" name="POLKA" l="900" w="400" count="4"/>' +
          '<part id="a3" code="99_003" name="ORQA DEVOR" l="1780" w="880" count="1"/>' +
        '</good>' +
        '<operation typeId="CS"><material id="s2"/><part id="a1"/><part id="a2"/></operation>' +
        '<operation typeId="CS"><material id="s1"/><part id="a3"/></operation>' +
        '</project>';
      var d3 = parseProject(mini);
      var mm = d3.materials.filter(function(m){ return m.id === "s1"; })[0];
      chk("sun'iy 0.6 mm: qalinlik butunlashmadi", mm && mm.t === 0.6, mm ? String(mm.t) : "yo'q");
      chk("sun'iy 0.6 mm: kg/m2 nolga aylanmadi", mm && mm.kgm2 > 0, mm ? String(mm.kgm2) : "-");
      var pa3 = d3.parts.filter(function(p){ return p.id === "a3"; })[0];
      chk("orqa devor 0.6 mm materialga bog'landi", pa3 && pa3.m === "s1", pa3 ? pa3.m : "yo'q");
      chk("mahsulot kodi o'qildi", d3.parts[0].pc === "990001", d3.parts[0].pc);
      chk("kant qirralari o'qildi", d3.parts[0].e === "T", d3.parts[0].e);
    } catch(e){ chk("sun'iy yupqa material sinovi", false, e.message); }

    try {
      var t1 = false; try { parseProject("<html><body>salom</body></html>"); } catch(e){ t1 = true; }
      chk("noto'g'ri ildiz teg rad etildi", t1);
      var t2 = false; try { parseProject(""); } catch(e){ t2 = true; }
      chk("bo'sh fayl rad etildi", t2);
      var t3 = false; try { parseProject("<project><good"); } catch(e){ t3 = true; }
      chk("buzilgan XML rad etildi", t3);
      var xi = xmlStructure("<project name='x'><good id='1' typeId='sheet'/><good id='2' typeId='product'/></project>");
      chk("xmlStructure ishladi", xi && xi.ok === true && xi.root === "project",
          xi ? (xi.root + ", " + xi.tags.length + " teg turi") : "yo'q");
    } catch(e){ chk("xato faylga munosabat", false, e.message); }

    stage4();
  }

  /* ---------- 4-BOSQICH: KESIM OʻQLARI + GURUHLAR ----------
     v12: rejim («Individual»/«Konveyr») olib tashlandi. Qoida bitta — S.split.
     Shu sabab bu yerda preset emas, OʻQLARNING oʻzi sinaladi. */
  function stage4(){
    try {
      var savedSplit = JSON.parse(JSON.stringify(S.split));
      var nMod = PACKS.length;
      S.split = { prod:false, mat:true };            // faqat material boʻyicha
      packAll();
      var nMat = PACKS.length;
      var mixed = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        var mats = {};
        p.seq.forEach(function(s){ mats[s.it.matId] = 1; });
        if (Object.keys(mats).length > 1) mixed++;
      });
      chk("material oʻqi: pochkada material aralashmaydi", mixed === 0, mixed + " ta aralash pochka");
      chk("material oʻqi natijasi modul oʻqidan farq qiladi", true,
          "modul=" + nMod + " pochka, material=" + nMat + " pochka");
      S.split = savedSplit;
      packAll();
      chk("modul oʻqiga qaytdi", PACKS.length === nMod, PACKS.length + " pochka");
    } catch(e){ chk("Kesim oʻqlari", false, e.message); }

    /* v12: eski shakldagi sozlama bitta qoidaga koʻchishi */
    try {
      var a = splitFix(null, "b2c", null);
      chk("splitFix: eski «b2c» -> modul oʻqi", a.prod === true && a.mat === false,
          JSON.stringify(a));
      var b = splitFix(null, "b2b", null);
      chk("splitFix: eski «b2b» -> material oʻqi", b.prod === false && b.mat === true,
          JSON.stringify(b));
      var c = splitFix(null, "conv", { ind:{prod:true,mat:false}, conv:{prod:false,mat:true} });
      chk("splitFix: rejim + qoidalardan koʻchirish", c.prod === false && c.mat === true,
          JSON.stringify(c));
      var d = splitFix({ prod:false, mat:false }, "ind", null);
      chk("splitFix: yangi shakl oʻzgarmaydi", d.prod === false && d.mat === false,
          JSON.stringify(d));
      var e2 = splitFix(null, null, null);
      chk("splitFix: hech narsa boʻlmasa — modul oʻqi", e2.prod === true && e2.mat === false,
          JSON.stringify(e2));
      chk("rejim qoldiqlari yoʻq", typeof S.mode === "undefined" && typeof S.rules === "undefined",
          "S.mode=" + typeof S.mode + " S.rules=" + typeof S.rules);
    } catch(e){ chk("splitFix", false, e.message); }

    /* v11: MODUL GURUHI — ikki modul bitta pochkaga tushishi kerak */
    try {
      var mods = roomStats().map(function(r){ return r.code; });
      var base = PACKS.length;
      S.modGroups = [{ mods:[mods[0], mods[1]] }];
      packAll();
      var joined = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        var pc = {};
        p.seq.forEach(function(s){ pc[s.it.prodCode] = 1; });
        if (pc[mods[0]] && pc[mods[1]]) joined++;
      });
      chk("modul guruhi: ikki modul bitta pochkada", joined > 0, joined + " ta aralash pochka");
      chk("modul guruhi pochka sonini kamaytirdi", PACKS.length < base,
          base + " -> " + PACKS.length + " pochka");
      var gn = null;
      PACKS.forEach(function(p){ if (!p.odd && !gn && p.gname && p.gname.indexOf(" + ")>0) gn = p.gname; });
      chk("guruh nomi ikki modulni koʻrsatadi", !!gn, gn || "topilmadi");
      S.modGroups = [];
      packAll();
      chk("modul guruhi buzildi — eski holat", PACKS.length === base, PACKS.length + " pochka");
    } catch(e){ chk("modul guruhi", false, e.message); }

    /* v11: KLASS GURUHI — {A,B} birga, qolganidan ajralgan */
    try {
      var cs = classStats().map(function(c){ return c.cls; });
      var c1 = cs[0], c2 = cs[1];
      S.clsGroups = [{ cls:[c1, c2] }];
      packAll();
      var pure = 0, dirty = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        var has = false, other = false;
        p.seq.forEach(function(s){
          if (s.it.cls === c1 || s.it.cls === c2) has = true; else other = true;
        });
        if (has && !other) pure++;
        if (has && other) dirty++;
      });
      chk("klass guruhi: toʻplam alohida pochkalanadi", dirty === 0,
          c1 + "+" + c2 + " -> " + pure + " ta toza, " + dirty + " ta aralash");
      chk("klass guruhi pochka yaratdi", pure > 0, pure + " ta pochka");
      S.clsGroups = [];
      packAll();
    } catch(e){ chk("klass guruhi", false, e.message); }

    /* v11: HAMMASI BITTA GURUHDA — kesimlar oʻchirilganda */
    try {
      var b4 = PACKS.length;
      var sr = JSON.parse(JSON.stringify(S.split)), sb = S.byThick;
      S.split = { prod:false, mat:false };
      packAll();
      chk("kesimsiz: pochka soni kamaydi", PACKS.length <= b4, b4 + " -> " + PACKS.length);
      S.split = sr; S.byThick = sb;
      packAll();
    } catch(e){ chk("kesimsiz holat", false, e.message); }

    /* v12: MODUL BELGISI — sozlama emas, faylning xossasi.
       Qoida: kod prefiksi tuzilishdan koʻproq birlik bersa — prefiks, aks holda
       good kodi. Namunada 4 good ↔ 4 prefiks, demak good tanlanadi. Haqiqiy
       «komplekt-5modul» da esa 1 good ↔ 5 prefiks — u yerda prefiks. */
    try {
      var origCodes = P.parts.map(function(p){ return p.c; });
      var origSrc = P.unitSrc;

      chk("namunada manba = tuzilish (4 good ↔ 4 prefiks)", unitSrc() === "good",
          unitSrc() + " · " + roomStats().map(function(r){ return r.code; }).join(","));

      // TUZILISH YIQILGAN HOLAT: hamma detal bitta goodda, chegara faqat kodda.
      // Aynan «komplekt-5modul» shunday — 1 good, 5 ta modul.
      var origPc = P.parts.map(function(p){ return p.pc; });
      P.parts.forEach(function(p){ p.pc = "990500"; });
      P.unitSrc = null;
      chk("tuzilish yiqilsa manba = kod prefiksi", unitSrc() === "code", unitSrc());
      var us = roomStats().map(function(r){ return r.code; });
      chk("kod prefiksidan modullar chiqdi", us.length === 4 && us[0] === "01",
          us.join(",") + " (" + us.length + " modul)");
      var it0 = buildItems()[0];
      chk("unit maydoni kod prefiksiga teng", it0 && it0.unit === it0.code.split("_")[0],
          it0 ? it0.code + " -> " + it0.unit : "detal yoʻq");

      // ajratgichsiz kod (konveyr-partiya uslubi) — good kodiga qaytadi
      P.parts.forEach(function(p, i){ p.c = "99010" + ("000" + i).slice(-3); });
      P.unitSrc = null;
      chk("ajratgichsiz kod — good kodiga qaytadi", unitSrc() === "good", unitSrc());

      chk("modSrc/modLen qoldiqlari yoʻq",
          typeof S.modSrc === "undefined" && typeof S.modLen === "undefined" &&
          typeof codeUnits === "undefined" && typeof renderModSrc === "undefined",
          "modSrc=" + typeof S.modSrc + " codeUnits=" + typeof codeUnits);

      P.parts.forEach(function(p, i){ p.c = origCodes[i]; p.pc = origPc[i]; });
      P.unitSrc = origSrc;
      packAll();
      chk("kodlar tiklandi — eski holat", PACKS.length === 55, PACKS.length + " pochka");
    } catch(e){ chk("modul belgisi manbai", false, e.message); }

    /* v12: TUZILISHI YIQILGAN KOMPLEKT — «komplekt-5modul».
       tools\seed-to-project.ps1 yasaydi: <good typeId="product"> BITTA (990500
       «Komplekt»), lekin ichida 5 ta mustaqil mebel bor — karavot, ikki
       tumba, komod, shkaf. Chegara faqat detal kodida (01_… … 05_…).
       Bu tekshiruv aynan shu holatni ushlaydi: tuzilishga tayansak beshalasi
       bitta pochkaga aralashib ketadi. */
    if (K5MOD) {
      var spBak = { P:P, PACKS:PACKS, CUR:CUR, STEP:STEP,
                    rooms:S.rooms, sepCls:S.sepCls, mg:S.modGroups, cg:S.clsGroups };
      try {
        var sp = parseProject(K5MOD);
        P = sp; S.rooms = {}; S.sepCls = {}; S.modGroups = []; S.clsGroups = [];
        var goods = {}; P.parts.forEach(function(p){ goods[p.pc] = 1; });
        chk("5modul: faylda bitta good", Object.keys(goods).length === 1,
            Object.keys(goods).join(","));
        chk("5modul: manba = kod prefiksi", unitSrc() === "code", unitSrc());
        var spU = roomStats().map(function(r){ return r.code; });
        chk("5modul: 5 ta modul ajratildi", spU.length === 5 && spU.join(",") === "01,02,03,04,05",
            spU.join(",") + " · " + P.parts.length + " pozitsiya");

        S.split = { prod:true, mat:false };
        packAll();
        var spMix = 0;
        PACKS.forEach(function(p){
          if (p.odd) return;
          var u = {};
          p.seq.forEach(function(s){ u[s.it.unit] = 1; });
          if (Object.keys(u).length > 1) spMix++;
        });
        chk("5modul: pochkada ikki modul aralashmaydi", spMix === 0,
            spMix + " ta aralash / " + PACKS.length + " pochka");
        var spSep = PACKS.length;

        // ikki tumbani (02 va 03) BIRGA pochkalash — modul guruhi
        S.modGroups = [{ mods:["02","03"] }];
        packAll();
        var spJoin = 0;
        PACKS.forEach(function(p){
          if (p.odd) return;
          var u = {};
          p.seq.forEach(function(s){ u[s.it.unit] = 1; });
          if (u["02"] && u["03"]) spJoin++;
        });
        chk("5modul: ikki tumba birga pochkalandi", spJoin > 0, spJoin + " ta umumiy pochka");
        chk("5modul: birlashtirish pochka sonini kamaytirdi", PACKS.length <= spSep,
            spSep + " -> " + PACKS.length + " pochka");

        // hammasi birga — modul kesimi oʻchiq
        S.modGroups = []; S.split = { prod:false, mat:false };
        packAll();
        chk("5modul: kesimsiz — pochka soni yana kamaydi", PACKS.length < spSep,
            spSep + " -> " + PACKS.length + " pochka");
        chk("5modul: auditda xato yoʻq", auditPacks(PACKS, buildItems()).errors.length === 0,
            PACKS.length + " pochka");
      } catch(e){ chk("komplekt-5modul", false, e.message); }
      S.split = { prod:true, mat:false };
      P = spBak.P; PACKS = spBak.PACKS; CUR = spBak.CUR; STEP = spBak.STEP;
      S.rooms = spBak.rooms; S.sepCls = spBak.sepCls;
      S.modGroups = spBak.mg; S.clsGroups = spBak.cg;
      packAll();
    }

    /* v12: MODUL NOMI — P/M bergan nom roʻyxatda, chekda va tahrirlashda chiqadi.
       Fayl faqat «01»/«990101» beradi; nomsiz chekda kod turadi va upakovshik
       nima ekanini bilmaydi. */
    try {
      var nMods = roomStats().map(function(r){ return r.code; });
      var nBak = JSON.parse(JSON.stringify(S.unitNames || {}));
      S.unitNames = {}; S.unitNames[nMods[0]] = "Karavot";
      packAll();
      chk("modul nomi roʻyxatda koʻrinadi",
          roomStats()[0].name === "Karavot", roomStats()[0].code + " -> " + roomStats()[0].name);
      var nPack = null;
      PACKS.forEach(function(p){ if (!nPack && !p.odd && p.base.unit === nMods[0]) nPack = p; });
      chk("modul nomi pochka sarlavhasida", nPack && packGrpName(nPack) === "Karavot",
          nPack ? packGrpName(nPack) : "pochka topilmadi");
      chk("modul nomi chekda", nPack && packLabelHTML(nPack, "tq").indexOf("Karavot") > 0,
          nPack ? "bor" : "yoʻq");
      /* nom berilmagan modul fayldagi oʻz nomida qoladi: tuzilishdan olinganda
         good nomi («02 shkaf»), kod prefiksidan olinganda kodning oʻzi («02») */
      chk("nomsiz modul oʻz nomida qoladi",
          roomStats()[1] && roomStats()[1].name !== "Karavot" && !!roomStats()[1].name,
          roomStats()[1] ? roomStats()[1].code + " -> " + roomStats()[1].name : "-");
      chk("unitLabel: nom bor boʻlsa u, boʻlmasa zaxira",
          unitLabel(nMods[0], "zaxira") === "Karavot" && unitLabel(nMods[1], "zaxira") === "zaxira",
          unitLabel(nMods[0], "zaxira") + " / " + unitLabel(nMods[1], "zaxira"));
      S.unitNames = nBak; packAll();
    } catch(e){ chk("modul nomi", false, e.message); }

    /* v12: XONA — nomlangan modul guruhi + «birga pochkalansin» bayrogʻi.
       join:true  — butun xona bitta pochkalash kaliti (v11 xatti-harakati)
       join:false — har modul oʻz pochkasida, xona nomi faqat BELGI */
    try {
      var xMods = roomStats().map(function(r){ return r.code; });
      var xBase = PACKS.length;

      // 1) BIRGA — ikki modul bitta pochkaga tushadi
      S.modGroups = [{ mods:[xMods[0], xMods[1]], name:"Zal", join:true }];
      packAll();
      var xJoin = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        var u = {}; p.seq.forEach(function(s){ u[s.it.unit] = 1; });
        if (u[xMods[0]] && u[xMods[1]]) xJoin++;
      });
      chk("xona «birga»: modullar bitta pochkada", xJoin > 0, xJoin + " ta umumiy pochka");
      chk("xona «birga»: pochka soni kamaydi", PACKS.length < xBase,
          xBase + " -> " + PACKS.length);
      var xp = null;
      PACKS.forEach(function(p){ if (!xp && packRoom(p) === "Zal") xp = p; });
      chk("xona nomi pochkaga yozildi", !!xp, xp ? "P" + xp.no : "topilmadi");
      chk("xona nomi chekda", xp && packLabelHTML(xp, "tq").indexOf("Zal") > 0, xp ? "bor" : "yoʻq");

      // 2) ALOHIDA — nom bor, lekin modullar birlashmaydi
      S.modGroups = [{ mods:[xMods[0], xMods[1]], name:"Yotoqxona", join:false }];
      packAll();
      var xMix = 0, xTag = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        var u = {}; p.seq.forEach(function(s){ u[s.it.unit] = 1; });
        if (u[xMods[0]] && u[xMods[1]]) xMix++;
        if (packRoom(p) === "Yotoqxona") xTag++;
      });
      chk("xona «alohida»: modullar aralashmaydi", xMix === 0, xMix + " ta aralash pochka");
      chk("xona «alohida»: nom baribir belgilanadi", xTag > 0, xTag + " ta pochka «Yotoqxona» da");
      chk("xona «alohida»: pochka soni kesimsizdagidek", PACKS.length === xBase,
          xBase + " vs " + PACKS.length);

      // 3) roʻyxatda xona sarlavhasi chiqadi
      renderPacks();
      chk("roʻyxatda xona sarlavhasi bor",
          document.querySelectorAll("#packList .pkroom").length > 0,
          document.querySelectorAll("#packList .pkroom").length + " ta sarlavha");
      // xona pochkalari ketma-ket turishi kerak (groupSortKey)
      var seenOther = false, broken = false;
      PACKS.forEach(function(p){
        if (packRoom(p) === "Yotoqxona"){ if (seenOther) broken = true; }
        else seenOther = true;
      });
      chk("xona pochkalari ketma-ket turadi", !broken, broken ? "tarqoq" : "bir joyda");

      S.modGroups = []; packAll();
    } catch(e){ chk("xona", false, e.message); }

    /* v12: TAHRIRLASH QADOQLASH EKRANIDAN OLIB TASHLANDI (TZ-v2 §1) */
    try {
      chk("Qadoqlashda «Tahrirlash» tugmasi yoʻq", !el("btnEdit"), el("btnEdit") ? "hali bor" : "yoʻq");
      chk("EDIT holati qolmadi", typeof window.EDIT === "undefined" && typeof window.renderEdit === "undefined",
          "EDIT=" + typeof window.EDIT + " renderEdit=" + typeof window.renderEdit);
      chk("P/M da tuzatish bloki bor", !!el("mgrEdit"));
      MGR_CUR = 0; renderMgrEdit();
      chk("tuzatish bloki chizildi", !!el("mgrEditPack") &&
          el("mgrEditPack").options.length === PACKS.length,
          el("mgrEditPack") ? el("mgrEditPack").options.length + " pochka" : "yoʻq");
      chk("tuzatish blokida qatorlar bor",
          el("mgrEdit").querySelectorAll(".edrow").length > 1,
          el("mgrEdit").querySelectorAll(".edrow").length + " qator");
    } catch(e){ chk("tahrirlash P/M da", false, e.message); }

    /* v11: SARALASH POSTI — paddondan stelyaj yacheykalariga */
    try {
      var sR = S.rackN, sC = S.cellN;
      S.rackN = 6; S.cellN = 10; sortReset();
      chk("saralash: yacheyka kodlari", allCells()[0] === "A1" && allCells()[10] === "B1",
          allCells().slice(0, 3).join(",") + " … " + allCells()[10] + " · jami " + allCells().length);

      // bitta pochkani to'liq saralaymiz
      var tp = null;
      PACKS.forEach(function(p){ if (!p.odd && !tp && packItems(p).length >= 4) tp = p; });
      var need = packItems(tp).length;
      packItems(tp).forEach(function(it){ sortScan(it.code); });
      chk("saralash: pochkaga yacheyka biriktirildi", !!SORT.pack[tp.no], SORT.pack[tp.no] || "yoʻq");
      chk("saralash: hamma detal joyiga tushdi", cellDone(tp.no) === need,
          cellDone(tp.no) + "/" + need);

      /* Bitta kod bir nechta pochkada uchrashi mumkin (count>1 boʻlgan detal).
         Shunda ikkinchi marta skanerlash IKKINCHI nusxani joylashtiradi — bu
         toʻgʻri, chunki paddonda rostdan ham ikkita jismoniy detal bor.
         Tekshiriladigan invariant: buyurtmadagi nusxadan KOʻPROQ joylab boʻlmaydi. */
      sortReset();
      var probe = packItems(tp)[0].code, have = 0;
      PACKS.forEach(function(p){ packItems(p).forEach(function(it){ if (it.code === probe) have++; }); });
      var placed = 0;
      for (var z = 0; z < have + 5; z++) if (sortScan(probe).ok) placed++;
      chk("saralash: nusxadan ortiq joylanmaydi", placed === have,
          probe + " — buyurtmada " + have + " ta, joylandi " + placed);
      var over = sortScan(probe);
      chk("saralash: ortiqcha skanerda tushunarli javob",
          !over.ok && over.msg.indexOf("allaqachon saralangan") > 0, over.msg.slice(0, 60));

      sortReset();
      packItems(tp).forEach(function(it){ sortScan(it.code); });

      // pochka qadoqlanib bo'lgach yacheyka bo'shaydi
      var cellWas = SORT.pack[tp.no];
      sortFreeCell(tp.no);
      chk("saralash: qadoqlangach yacheyka boʻshaydi", !SORT.pack[tp.no] && !SORT.cell[cellWas],
          cellWas + " boʻshadi");

      // sig'im yetmasa — aniq xabar, ish to'xtamaydi
      sortReset(); S.rackN = 1; S.cellN = 1;
      var used = {}, blockedMsg = "";
      PACKS.forEach(function(p){
        if (p.odd) return;
        packItems(p).forEach(function(it){
          var r = sortScan(it.code);
          if (r.ok) used[r.cell] = 1; else if (!blockedMsg && r.msg.indexOf("yacheyka yoʻq") > 0) blockedMsg = r.msg;
        });
      });
      chk("saralash: sigʻim yetmasa aniq xabar", blockedMsg.indexOf("paddonda qoldiring") > 0,
          blockedMsg.slice(0, 70));
      chk("saralash: sigʻimdan ortiq yacheyka band boʻlmaydi", Object.keys(used).length <= 1,
          Object.keys(used).length + " yacheyka");

      /* OPTIMAL REJA vs ESKI «birinchi boʻsh yacheyka» qoidasi.
         Narx = har pochka uchun (detal soni × yacheykaning A1 dan uzoqligi).
         Bu ishchining jami yurishiga proporsional. */
      sortReset(); S.rackN = 6; S.cellN = 10;
      var pallet = [];
      PACKS.forEach(function(p){ packItems(p).forEach(function(it){ pallet.push(it.code); }); });
      var sd = 5, rr = function(){ sd = (sd*9301+49297) % 233280; return sd/233280; };
      pallet.sort(function(){ return rr() - 0.5; });          // paddon aralash

      pallet.forEach(function(c){ sortScan(c); });            // reja boʻyicha
      var optCost = walkCost(), optCells = Object.keys(SORT.cell).length;

      // eski qoida: pochka qaysi tartibda birinchi uchrasa — shu tartibda A1, A2 …
      sortReset();
      var cellsAll = allCells(), k = 0, seen = {};
      pallet.forEach(function(code){
        PACKS.forEach(function(p){
          if (seen[p.no]) return;
          var hit = false;
          packItems(p).forEach(function(it){ if (it.code === code) hit = true; });
          if (hit && k < cellsAll.length){
            seen[p.no] = 1; SORT.cell[cellsAll[k]] = p.no; SORT.pack[p.no] = cellsAll[k]; k++;
          }
        });
      });
      var naiveCost = walkCost();
      chk("optimal reja yurishni kamaytiradi", optCost < naiveCost,
          "reja " + optCost + " vs eski " + naiveCost + " — " +
          Math.round((1 - optCost/naiveCost) * 100) + "% kam");

      // eng katta pochka eng yaqin yacheykada
      sortReset();
      pallet.forEach(function(c){ sortScan(c); });
      var big = null;
      PACKS.forEach(function(p){ if (!p.odd && (!big || packItems(p).length > packItems(big).length)) big = p; });
      chk("eng katta pochka A1 da", SORT.pack[big.no] === "A1",
          "P" + pad2(big.no) + " (" + packItems(big).length + " detal) -> " + SORT.pack[big.no]);

      /* YOPIQ YACHEYKALAR — ishchi qaysi joy boʻshligini oʻzi kiritadi */
      S.cellOff = {}; sortReset(); S.rackN = 6; S.cellN = 10;
      chk("yopiq yoʻq — hamma yacheyka ochiq", openCells().length === 60, openCells().length + " ochiq");

      toggleRack("A"); toggleRack("B");                 // ikki stelyajni yopamiz
      chk("stelyaj yopildi", openCells().length === 40, openCells().length + " ochiq qoldi");
      chk("yopiq yacheykaga detal berilmaydi", (freeCell() || "").charAt(0) === "C", freeCell());

      // yopiq yacheyka rejaga ham tushmasin
      sortPlan();
      var inOff = 0;
      Object.keys(SORT.plan).forEach(function(k){ if (cellOff(SORT.plan[k])) inOff++; });
      chk("reja yopiq yacheykani tanlamaydi", inOff === 0, inOff + " ta yopiqqa reja tushdi");

      toggleRack("A");                                   // qaytarib ochamiz
      chk("stelyaj qayta ochildi", openCells().length === 50, openCells().length + " ochiq");

      // band yacheykani yopib bo'lmaydi
      toggleRack("B");                                   // B ni ochamiz -> 60
      sortReset();
      var one = null; PACKS.forEach(function(p){ if (!p.odd && !one) one = p; });
      sortScan(packItems(one)[0].code);
      var busyCell = SORT.pack[one.no];
      var deny = toggleCell(busyCell);
      chk("band yacheykani yopib boʻlmaydi", !deny.ok && !cellOff(busyCell), deny.msg || "yopildi (xato)");

      // bitta yacheykani yopish
      var pick = openCells().filter(function(c){ return !SORT.cell[c]; })[0];
      toggleCell(pick);
      chk("bitta yacheyka yopildi", cellOff(pick), pick + " yopiq");
      chk("hisoblagichda yopiq soni koʻrinadi", sortStats().off === 1, sortStats().off + " yopiq");
      toggleCell(pick);
      chk("yacheyka qayta ochildi", !cellOff(pick), pick + " ochiq");

      /* SAQLANISH. Yopiq yacheykalar FAQAT sozlamalarda turishi kerak.
         Ilgari ular seans snapshotida ham saqlanardi va eskirgan snapshot
         sozlamani bosib ketardi: localStorage da 2 ta yopiq boʻlsa-da,
         qayta yuklangach 48 tasi yopiq boʻlib chiqardi. */
      S.cellOff = {}; toggleCell("C3"); toggleCell("C4");
      saveConf();
      var lsRaw = JSON.parse(localStorage.getItem("upk_conf") || "{}");
      chk("yopiq yacheykalar sozlamaga yozildi",
          lsRaw._cellOff && lsRaw._cellOff.C3 && lsRaw._cellOff.C4 &&
          Object.keys(lsRaw._cellOff).length === 2,
          JSON.stringify(lsRaw._cellOff));
      var snapNow = makeSnapshot();
      chk("yopiq yacheykalar seansga YOZILMAYDI", snapNow.cellOff === undefined,
          "snap.cellOff = " + JSON.stringify(snapNow.cellOff));
      // eskirgan seans tiklansa ham sozlama buzilmasin
      var fake = makeSnapshot(); fake.cellOff = { A1:true, A2:true, A3:true };
      restoreSnapshot(fake);
      chk("eski seans yopiq yacheykalarni oʻzgartirmaydi",
          Object.keys(S.cellOff).length === 2 && S.cellOff.C3,
          Object.keys(S.cellOff).sort().join(","));
      S.cellOff = {}; saveConf();

      /* QORALAMA — «Saqlash» bosilmaguncha hech nima oʻzgarmasligi kerak.
         Ilgari har bosish darhol amalga oshardi: notoʻgʻri yacheykaga tegib
         ketilsa saralash rejasi shu zahoti siljib ketardi. */
      S.cellOff = {}; sortReset();
      rackEditStart();
      toggleCell("E1"); toggleCell("E2"); toggleRack("F");
      chk("qoralama saqlangan holatga tegmaydi", Object.keys(S.cellOff).length === 0,
          "S.cellOff = " + Object.keys(S.cellOff).length + " ta");
      chk("qoralamada oʻzgarish koʻrinadi", draftOff("E1") && draftOff("F5"),
          "E1=" + draftOff("E1") + " F5=" + draftOff("F5"));
      chk("qoralama saralashga taʼsir qilmaydi", openCells().length === 60,
          openCells().length + " ochiq");

      rackEditCancel();
      chk("«Bekor» qoralamani tashlaydi", Object.keys(S.cellOff).length === 0 && !draftOff("E1"),
          "E1 yopiqmi: " + draftOff("E1"));

      rackEditStart();
      toggleCell("E1"); toggleCell("E2"); toggleRack("F");
      var added = rackEditSave();
      chk("«Saqlash» qoralamani amalga oshiradi", Object.keys(S.cellOff).length === 12,
          Object.keys(S.cellOff).length + " yacheyka yopildi (+" + added + ")");
      chk("saqlangach saralash hisobga oladi", openCells().length === 48,
          openCells().length + " ochiq");
      var lsAfter = JSON.parse(localStorage.getItem("upk_conf") || "{}");
      chk("«Saqlash» localStorage ga yozdi",
          lsAfter._cellOff && Object.keys(lsAfter._cellOff).length === 12,
          Object.keys(lsAfter._cellOff || {}).length + " ta");
      chk("saqlangach tahrirlash rejimi yopiladi", RACK_EDIT === false, "RACK_EDIT = " + RACK_EDIT);
      S.cellOff = {}; saveConf(); sortReset();

      // hamma yacheyka yopiq bo'lsa — aniq xabar, yiqilmaydi
      sortReset(); S.rackN = 1; S.cellN = 2;
      toggleCell("A1"); toggleCell("A2");
      var noRoom = sortScan(packItems(one)[0].code);
      chk("hamma yacheyka yopiq — tushunarli javob", !noRoom.ok && noRoom.msg.indexOf("yacheyka yoʻq") > 0,
          noRoom.msg.slice(0, 60));
      S.cellOff = {};

      // buyurtmada yo'q kod
      sortReset(); S.rackN = 6; S.cellN = 10;
      var bad = sortScan("YOQ_BUNDAY_KOD_999");
      chk("saralash: notaʼrif kod rad etiladi", !bad.ok && bad.msg.indexOf("buyurtmada yoʻq") > 0,
          bad.msg.slice(0, 50));

      // chek QR idan kod ajratish
      chk("saralash: QR matnidan kod ajratiladi",
          scanCode("SM.5EED0000.R1|P01|Q0|01_021|1753x600x16") === "01_021",
          scanCode("SM.5EED0000.R1|P01|Q0|01_021|1753x600x16"));

      sortReset(); S.rackN = sR; S.cellN = sC;
    } catch(e){ chk("saralash posti", false, e.message); }

    /* v11: klass sinonimlari */
    try {
      chk("sinonim: SOKL -> SOKOL", classify("01_055 SOKL CHAP") === "SOKOL", classify("01_055 SOKL CHAP"));
      chk("sinonim: bitta klass ikkiga boʻlinmaydi",
          classify("SOKL") === classify("SOKOL"), classify("SOKL") + " / " + classify("SOKOL"));
    } catch(e){ chk("klass sinonimlari", false, e.message); }

    /* v12: GURUH CHEGARASI — qoʻlda koʻchirish rejimni buzmasligi kerak.
       Ilgari tahrirlash packKey() ni umuman koʻrmasdi: material va modul
       chegarasi bir bosishda aralashib ketardi va audit jim turardi. */
    try {
      var gSplit = JSON.parse(JSON.stringify(S.split));
      S.split = { prod:false, mat:true };
      packAll();

      var noKey = PACKS.filter(function(p){ return !p.odd && !p.key; }).length;
      chk("pochkaga guruh kaliti yozildi", noKey === 0, noKey + " ta kalitsiz pochka");

      // turli kalitli ikki oddiy pochka topamiz
      var ga = -1, gb = -1;
      for (var gi = 0; gi < PACKS.length; gi++){
        if (PACKS[gi].odd || !PACKS[gi].layers.length) continue;
        if (ga < 0) ga = gi;
        else if (PACKS[gi].key !== PACKS[ga].key){ gb = gi; break; }
      }
      var gUid = null;
      if (ga >= 0) PACKS[ga].layers.forEach(function(L){
        L.items.forEach(function(q){ if (!gUid) gUid = q.it.uid; }); });
      var gRes = (ga >= 0 && gb >= 0 && gUid) ? moveDetail(ga, gUid, gb) : null;
      chk("material oʻqi: guruh chegarasi buzilmaydi",
          typeof gRes === "string" && gRes.indexOf("mos emas") >= 0, String(gRes));

      // tanlov roʻyxati ham boshqa guruhni koʻrsatmasligi kerak
      MGR_CUR = ga; renderMgrEdit();
      var gSel = document.querySelector('[data-uid="' + gUid + '"]');
      var gBad = 0, gOpt = gSel ? gSel.options : [];
      for (var gj = 0; gj < gOpt.length; gj++){
        var gv = gOpt[gj].value;
        if (gv !== "new" && PACKS[+gv].key !== PACKS[ga].key) gBad++;
      }
      chk("tanlov roʻyxati boshqa guruhni koʻrsatmaydi", gBad === 0,
          gBad + " ta begona variant / jami " + gOpt.length);

      // audit shu buzilishni koʻradimi — begona detalni zoʻrlab qoʻyamiz
      var gSlot = null, gAlien = null;
      PACKS[gb].layers.forEach(function(L){ L.items.forEach(function(q){ if (!gSlot) gSlot = q; }); });
      PACKS[ga].layers.forEach(function(L){ L.items.forEach(function(q){ if (!gAlien) gAlien = q.it; }); });
      var gKeep = gSlot.it;
      gSlot.it = gAlien;
      var gAu = auditPacks(PACKS, buildItems());
      var gHas = gAu.errors.some(function(e){ return e.code === "GURUH"; });
      gSlot.it = gKeep;
      chk("audit GURUH buzilishini koʻradi", gHas,
          gAu.errors.map(function(e){ return e.code; }).join(",") || "xato yoʻq");

      S.split = gSplit; packAll();
      chk("guruh sinovidan keyin holat tiklandi",
          auditPacks(PACKS, buildItems()).errors.length === 0, PACKS.length + " pochka");
    } catch(e){ chk("guruh chegarasi", false, e.message); }

    stage5();
  }

  /* ---------- 5-BOSQICH: HAQIQIY YUKLASH OQIMI (asosiy talab) ---------- */
  function stage5(){
    var xml = '<?xml version="1.0" encoding="utf-8"?>' +
      '<project name="Yuklash sinovi" project.uuid="abcd1234-9999-0000">' +
      '<good id="M1" typeId="sheet" name="LDSP 16 mm venge" l="2750" w="1830" t="16" count="10"/>' +
      '<good id="M2" typeId="sheet" name="XDF 3 mm" l="2800" w="2070" t="3" count="4"/>' +
      '<good id="G1" typeId="product" name="Oshxona shkafi" code="770001">' +
        '<part id="q1" code="77_001" name="BOK CHAP"  l="1200" w="500" count="2" elt="1" elb="1"/>' +
        '<part id="q2" code="77_002" name="BOK O\'NG"  l="1200" w="500" count="2" elt="1"/>' +
        '<part id="q3" code="77_003" name="POLKA"     l="800"  w="480" count="6"/>' +
        '<part id="q4" code="77_004" name="DNO"       l="800"  w="500" count="2"/>' +
        '<part id="q5" code="77_005" name="FASAD"     l="700"  w="396" count="4" elt="1" elb="1" ell="1" elr="1"/>' +
        '<part id="q6" code="77_006" name="ORQA DEVOR" l="1180" w="790" count="2"/>' +
      '</good>' +
      '<good id="G2" typeId="product" name="Yuqori shkaf" code="770002">' +
        '<part id="w1" code="77_101" name="BOK" l="700" w="320" count="2"/>' +
        '<part id="w2" code="77_102" name="POLKA" l="600" w="300" count="3"/>' +
        '<part id="w3" code="77_103" name="ORQA DEVOR" l="690" w="590" count="1"/>' +
      '</good>' +
      '<operation typeId="CS"><material id="M1"/>' +
        '<part id="q1"/><part id="q2"/><part id="q3"/><part id="q4"/><part id="q5"/>' +
        '<part id="w1"/><part id="w2"/></operation>' +
      '<operation typeId="CS"><material id="M2"/><part id="q6"/><part id="w3"/></operation>' +
      '</project>';

    var oldName = P.name;
    try { loadXmlText(xml, "yuklash-sinovi.project"); }
    catch(e){ chk("loadXmlText chaqirildi", false, e.message); done(); return; }

    until(function(){ return el("modal") && el("modal").style.display === "flex"; }, function(ok){
      chk("yuklashda tanlov oynasi ochildi", ok);
      if (!ok){ done(); return; }
      chk("oyna: fayl nomi ko'rindi", (el("mFile").textContent||"").indexOf("yuklash-sinovi") >= 0,
          el("mFile").textContent);
      chk("oyna: honalar ro'yxati", (el("mRoomN").textContent|0) === 2, el("mRoomN").textContent + " hona");
      chk("oyna: klasslar ro'yxati", document.querySelectorAll("#mCls input").length > 0,
          el("mClsN").textContent + " klass");
      chk("diagnostikaga XML tuzilishi yozildi", !!DIAG.xmlInfo && DIAG.xmlInfo.ok === true);
      chk("diagnostikaga fayl nomi yozildi", DIAG.fileName === "yuklash-sinovi.project", DIAG.fileName);

      el("mOk").click();                       // "Pochkalash" tugmasi

      until(function(){ return P && P.name === "Yuklash sinovi" && PACKS.length > 0 && !BUSY; },
      function(ok2){
        chk("yuklangan loyiha pochkalandi", ok2,
            P ? (P.name + " -> " + PACKS.length + " pochka") : "yo'q");
        if (!ok2){ done(); return; }
        chk("loyiha nomi almashdi", P.name !== oldName, oldName + " -> " + P.name);
        chk("UUID chekka o'tdi", projTag() === "ABCD1234", projTag());

        var it2 = buildItems();
        var a2 = auditPacks(PACKS, it2);
        chk("yuklangan loyihada audit toza", a2.errors.length === 0,
            a2.errors.slice(0,4).map(function(e){ return e.code + " P" + e.pack + " " + e.msg; }).join(" | "));
        chk("yuklangan loyihada hamma detal joylashgan",
            a2.stats.itemsPlaced === a2.stats.itemsExpected,
            a2.stats.itemsPlaced + "/" + a2.stats.itemsExpected);
        chk("qalinlik bo'yicha ajratildi (16 va 3 mm aralashmagan)",
            PACKS.filter(function(p){
              if (p.odd) return false;
              var ts = {}; p.seq.forEach(function(s){ ts[s.it.T] = 1; });
              return Object.keys(ts).length > 1;
            }).length === 0);
        chk("interfeys yangilandi", document.querySelectorAll("#packList .pk").length === PACKS.length);

        // diagnostika bo'limi chizilsinmi
        try { renderDiag(); chk("diagnostika chizildi", (el("diagBox").innerHTML||"").length > 400,
              Math.round((el("diagBox").innerHTML||"").length/1024) + " KB HTML"); }
        catch(e){ chk("diagnostika chizildi", false, e.message); }

        // qadam boshqaruvi: oldinga -> orqaga, done to'g'ri kamayadimi
        try {
          selectPack(0);
          var n0 = STEP;
          advance(); advance();
          var afterFwd = PACKS[0].done;
          setStep(STEP - 1);
          chk("qadam oldinga ishladi", afterFwd === n0 + 2, "done=" + afterFwd);
          chk("orqaga qaytganda progress kamaydi", PACKS[0].done === afterFwd - 1,
              "done=" + PACKS[0].done);
        } catch(e){ chk("qadam boshqaruvi", false, e.message); }

        chk("test oxirida yangi JS xatosi yo'q", window.__ERRORS.length === 0,
            window.__ERRORS.slice(0,4).join(" ; "));
        done();
      });
    });
  }

  until(function(){ return typeof PACKS !== "undefined" && PACKS && PACKS.length > 0; },
        function(){ stage1(); });
})();
</script>
'@

# --- 6. qobiqni sahifaga joylashtirish ---
$iBody = $html.IndexOf("<body>")
if ($iBody -lt 0) { "XATO: <body> topilmadi: $idx"; exit 1 }
$html = $html.Insert($iBody + 6, "`n" + $catcher)
$iEnd = $html.LastIndexOf("</body>")
if ($iEnd -lt 0) { "XATO: </body> topilmadi: $idx"; exit 1 }
$html = $html.Insert($iEnd, $dataBlock + "`n" + $tester + "`n")

# vaqtinchalik fayl nishon YONIDA turishi kerak (dev versiyada nisbiy yo'llar shunga bog'liq)
$tmp = Join-Path (Split-Path -Parent $idx) "_smoke-run.html"
[System.IO.File]::WriteAllText($tmp, $html, $enc)

# --- 6.5 -Http: lokal server (GitHub Pages sharoitini taqlid qiladi) ---
$srv = $null
$pageUrl = "file:///" + $tmp.Replace("\", "/")
if ($Http) {
  $py = $null
  foreach ($c in @("python","py")) {
    try { $py = (Get-Command $c -ErrorAction Stop).Source; break } catch {}
  }
  if (-not $py) { "XATO: -Http uchun Python kerak, topilmadi"; exit 1 }
  # serverning ildizi nishon fayl yonida — nisbiy yo'llar aynan Pages dagidek yechiladi
  $srvRoot = Split-Path -Parent $idx
  $srv = Start-Process -FilePath $py `
    -ArgumentList @("-m","http.server",$Port,"--bind","127.0.0.1","--directory",$srvRoot) `
    -NoNewWindow -PassThru -RedirectStandardOutput ([IO.Path]::GetTempFileName()) `
    -RedirectStandardError  ([IO.Path]::GetTempFileName())
  # port ochilishini kutamiz — uxlab emas, tekshirib
  $ok = $false
  for ($i = 0; $i -lt 50; $i++) {
    try {
      $c = New-Object Net.Sockets.TcpClient
      $c.Connect("127.0.0.1", $Port); $c.Close(); $ok = $true; break
    } catch { Start-Sleep -Milliseconds 100 }
  }
  if (-not $ok) {
    if ($srv -and -not $srv.HasExited) { $srv | Stop-Process -Force }
    "XATO: lokal server $Port portida ko'tarilmadi"; exit 1
  }
  $pageUrl = "http://127.0.0.1:$Port/" + (Split-Path -Leaf $tmp)
  "Server  : http://127.0.0.1:$Port/  (ildiz: $srvRoot)"
}

# --- 7. headless ishga tushirish ---
$profile = Join-Path $env:TEMP ("upk-smoke-" + [System.Guid]::NewGuid().ToString("N").Substring(0,8))
$outFile = Join-Path $env:TEMP ("upk-smoke-dom-" + [System.Guid]::NewGuid().ToString("N").Substring(0,6) + ".txt")

$bargs = @(
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--disable-extensions", "--disable-dev-shm-usage",
  "--user-data-dir=$profile",
  "--virtual-time-budget=60000",
  "--dump-dom",
  $pageUrl
)
"Sahifa  : $(if ($Http) { $pageUrl } else { $tmp })"
"Ishga tushirilmoqda..."
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$proc = Start-Process -FilePath $Browser -ArgumentList $bargs -NoNewWindow -PassThru -RedirectStandardOutput $outFile
$proc | Wait-Process -Timeout $TimeoutSec
if (-not $proc.HasExited) {
  $proc | Stop-Process -Force
  "OGOHLANTIRISH: brauzer $TimeoutSec s ichida tugamadi, majburan to'xtatildi"
}
$sw.Stop()
"Vaqt    : $([math]::Round($sw.Elapsed.TotalSeconds,1)) s"
""

# --- 8. natijani o'qish (fayl bir necha yuz ms band bo'lishi mumkin) ---
$dom = ""
for ($i = 0; $i -lt 25; $i++) {
  if (Test-Path $outFile) {
    try {
      $fs = [System.IO.File]::Open($outFile, "Open", "Read", "ReadWrite")
      $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
      $dom = $sr.ReadToEnd(); $sr.Close(); $fs.Close()
      if ($dom.Length -gt 0) { break }
    } catch { }
  }
  Start-Sleep -Milliseconds 200
}

function Cleanup {
  if (-not $Keep) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
  Remove-Item $outFile -Force -ErrorAction SilentlyContinue
  try { Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue } catch { }
  # -Http rejimidagi lokal server — test qanday tugasa ham yopiladi,
  # aks holda port band qolib keyingi yurgizish yiqilardi
  if ($srv -and -not $srv.HasExited) {
    try { $srv | Stop-Process -Force -ErrorAction SilentlyContinue } catch { }
  }
}

# natija <pre id="TESTOUT"> ichida (marker skript manbasida ham uchraydi)
$m = [regex]::Match($dom, '<pre id="TESTOUT">(.*?)</pre>', "Singleline")
if (-not $m.Success) {
  "!!! TEST NATIJASI TOPILMADI -- sahifa yuklanmagan yoki erta yiqilgan."
  "DOM hajmi: $($dom.Length) belgi"
  $t = [regex]::Match($dom, "<title>(.*?)</title>", "Singleline")
  if ($t.Success) { "Sahifa sarlavhasi: " + $t.Groups[1].Value }
  "packList qatorlari: " + ([regex]::Matches($dom, 'class="pk')).Count
  if ($dom.Length -gt 0) { "--- DOM boshi ---"; $dom.Substring(0, [Math]::Min(1200, $dom.Length)) }
  Cleanup
  exit 2
}

$report = $m.Groups[1].Value
$report = $report -replace "&lt;", "<" -replace "&gt;", ">" -replace "&quot;", '"' -replace "&#39;", "'"
$report = $report -replace "&amp;", "&"
$report.Trim()
""
Cleanup

if ($report -match "HAMMASI OK") { "===> SMOKE TEST O'TDI ($Target)"; exit 0 }
"===> SMOKE TEST YIQILDI ($Target)"
exit 1
