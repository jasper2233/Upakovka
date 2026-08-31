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

  /* v20: window.print() ni STUB bilan almashtiramiz.
     Sabab: pochka tugaganda chek endi OʻZI chiqadi (S.autoLbl), ya'ni testdagi
     har `advance()` chop oynasini ochib yuborardi. Stub uni sanaydi — natijada
     avtomatik chek ISHLAGANINI ham tekshirib boʻladi. */
  var PRINTS = [];
  window.print = function(){ PRINTS.push(document.title); };

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
                "labelMM","packLabelSheet","printPackLabel","packListHTML","orderStatus","orderDocHTML",
                "layerGap","layerSpan","partSupport","layerSupp","stackSuppOK","tailStackOK",
                "bedMin","bedOK","tailInsertAt","saveConf","restoreConf",
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
      /* v13: ilgari bu yerda «pochka soni kamayadi» talab qilinardi. Quyruq
         singdirish (04-packer 3.6.7.1) shu zaxirani guruhlashdan OLDIN yigʻib
         oladi, shuning uchun IKKI modulni birlashtirish namunada sonni
         oʻzgartirmasligi mumkin. Haqiqiy invariant boshqa: guruhlash packerga
         faqat erkinlik qoʻshadi — natija YOMONLASHMASLIGI shart. Kuchli
         tekshiruv pastda: hamma modul birga berilganda son qatʼiy kamayadi. */
      /* v16: pochkalash — EVRISTIKA (greedy + variantlar + singdirish), demak
         guruhlash qidiruv yoʻlini oʻzgartiradi va bitta pochkalik tebranish
         normal. Tekshiruv haqiqiy regressiyani (bir necha pochka yomonlashuvi)
         ushlaydi, shovqinni emas. Kuchli tekshiruv pastda: hamma modul birga
         berilganda son qatʼiy kamayadi. */
      chk("modul guruhi natijani yomonlashtirmaydi", PACKS.length <= base + 1,
          base + " -> " + PACKS.length + " pochka");
      var gn = null;
      PACKS.forEach(function(p){ if (!p.odd && !gn && p.gname && p.gname.indexOf(" + ")>0) gn = p.gname; });
      chk("guruh nomi ikki modulni koʻrsatadi", !!gn, gn || "topilmadi");
      S.modGroups = [{ mods:mods }];
      packAll();
      chk("hamma modul birga — pochka soni kamayadi", PACKS.length < base,
          base + " -> " + PACKS.length + " pochka");
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

    /* ================= v18: OQIMLAR ARALASHMAYDI ================= */
    try {
      function packParts(p){
        if (p.odd) return (p.items || []).slice();
        return [p.base].concat(p.layers.reduce(function(a, L){
          return a.concat(L.items.map(function(q){ return q.it; }));
        }, []));
      }
      /* Asosiy invariant: bitta pochkada HAQIQIY nostandart detal (nst=true —
         oʻlcham yoki massa chegarasidan chiqqan) va standart detal birga
         turmasin. v16 da yakuniy singdirish bosqichi ularni aralashtirib
         yuborgan edi: uzun-tor detallar bogʻiga oddiy polka tushib qolardi. */
      var xMix = [];
      PACKS.forEach(function(p){
        var ns = 0, st = 0;
        packParts(p).forEach(function(x){ if (x.nst) ns++; else st++; });
        if (ns && st) xMix.push("P" + p.no + " (" + ns + "ns+" + st + "st)");
      });
      chk("standart va nostandart aralashmaydi", xMix.length === 0,
          xMix.slice(0, 5).join(",") || "toza");

      // nostandart pochkadagi detallar OʻLCHAMI YAQIN boʻlishi kerak
      var xFar = [];
      PACKS.forEach(function(p){
        if (!p.nst) return;
        var ps = packParts(p);
        var lo = Math.min.apply(null, ps.map(function(x){ return x.L; }));
        var hi = Math.max.apply(null, ps.map(function(x){ return x.L; }));
        if (hi - lo > S.oddLMax) xFar.push("P" + p.no + " " + lo + "…" + hi);
      });
      chk("nostandart pochkada oʻlchamlar yaqin", xFar.length === 0, xFar.join(",") || "toza");

      // har pochkada nst bayrogʻi bor (yakuniy singdirish shunga tayanadi)
      var xNo = PACKS.filter(function(p){ return typeof p.nst === "undefined"; }).length;
      chk("har pochkada oqim belgisi bor", xNo === 0, xNo + " ta belgisiz");

      // seansdan keyin ham saqlanadi
      var xSnap = JSON.parse(JSON.stringify(makeSnapshot()));
      var xBefore = PACKS.map(function(p){ return p.nst ? 1 : 0; }).join("");
      restoreSnapshot(xSnap);
      var xAfter = PACKS.map(function(p){ return p.nst ? 1 : 0; }).join("");
      chk("seansda oqim belgisi saqlanadi", xBefore === xAfter,
          xBefore.length + " pochka");
      packAll();
    } catch(e){ chk("oqimlar ajratilishi", false, e.message); }

    /* ================= v18: STANDART DETAL MIN OʻLCHAMI ================= */
    try {
      var mp0 = PACKS.length;
      chk("min oʻlcham standart holda oʻchiq", S.minPartW === 0 && S.minPartL === 0,
          "minPartW=" + S.minPartW + " minPartL=" + S.minPartL);

      // eni chegarasini yoqamiz — mayda detallar nostandart oqimga oʻtsin
      var svW = S.minPartW;
      S.minPartW = 200; packAll();
      /* `nst` bayrogʻi POCHKADAGI detalga yoziladi. buildItems() har chaqiruvda
         YANGI obyektlar yasaydi, ularda bayroq boʻlmaydi — shuning uchun
         tekshiruv pochkalar ichidan yuritiladi. */
      var mSmall = 0, mLeak = 0;
      PACKS.forEach(function(p){
        packParts(p).forEach(function(x){
          if (x.W < 200){ mSmall++; if (!x.nst) mLeak++; }
        });
      });
      chk("min enidan kichigi nostandart deb belgilandi", mSmall > 0 && mLeak === 0,
          mSmall + " ta kichik detal, " + mLeak + " tasi belgilanmagan");

      // va ular standart pochkaga tushmasligi kerak
      var mBad = [];
      PACKS.forEach(function(p){
        if (p.nst) return;
        packParts(p).forEach(function(x){
          if (x.W < 200) mBad.push("P" + p.no + " " + x.code);
        });
      });
      chk("mayda detal standart pochkaga tushmaydi", mBad.length === 0,
          mBad.slice(0, 4).join(",") || "toza");

      var mAud = auditPacks(PACKS, buildItems());
      chk("min oʻlcham yoqilganda audit toza", mAud.errors.length === 0,
          mAud.errors.map(function(e){ return e.code; }).join(",") || "toza");
      chk("min oʻlcham yoqilganda detal yoʻqolmaydi",
          mAud.stats.itemsPlaced === mAud.stats.itemsExpected,
          mAud.stats.itemsPlaced + "/" + mAud.stats.itemsExpected);

      S.minPartW = svW; packAll();
      chk("min oʻlcham holati tiklandi", PACKS.length === mp0, PACKS.length + " pochka");

      // sozlama aylanmasi
      S.minPartW = 150; S.minPartL = 250; writeConf();
      S.minPartW = 0; S.minPartL = 0; readConf();
      chk("min oʻlcham sozlamasi saqlanadi", S.minPartW === 150 && S.minPartL === 250,
          "W=" + S.minPartW + " L=" + S.minPartL);
      S.minPartW = 0; S.minPartL = 0; writeConf(); packAll();
    } catch(e){ chk("standart detal min oʻlchami", false, e.message); }

    /* ================= v17: POCHKALANMAYDIGAN OBYEKTLAR ================= */
    try {
      var sv0 = PACKS.length;
      chk("maxPartT standarti 60 mm", S.maxPartT === 60, "maxPartT=" + S.maxPartT);
      // sunʼiy «devor» qoʻshamiz — 200 mm, katta
      var mid = "WALLMAT";
      P.materials.push({ id:mid, name:"Devor", t:200, l:2750, w:1830, kgm2:140 });
      P.parts.push({ id:"wall1", c:"00_999", n:"00_999 devor", p:"Devor", pc:"00",
                     l:3000, w:2500, q:1, m:mid, e:"" });
      var withWall = buildItems();
      var sk = (DIAG.skipped || []);
      chk("devor pochkalanmaydi", sk.length > 0 && sk.some(function(x){ return x.code === "00_999"; }),
          sk.map(function(x){ return x.code + " (" + x.why + ")"; }).join(" | ") || "roʻyxat boʻsh");
      chk("devor detallar roʻyxatiga kirmadi",
          withWall.filter(function(x){ return x.code === "00_999"; }).length === 0,
          withWall.length + " detal");
      packAll();
      var wAud = auditPacks(PACKS, buildItems());
      chk("devor bilan ham audit toza", wAud.errors.length === 0,
          wAud.errors.map(function(e){ return e.code; }).join(",") || "toza");
      var wMax = Math.max.apply(null, PACKS.map(function(p){ return p.kg; }));
      chk("devor massasi pochkaga kirmadi", wMax < 100, "eng ogʻir " + wMax.toFixed(1) + " kg");
      // chegarani koʻtarsak — devor qaytadi
      S.maxPartT = 500;
      chk("chegara koʻtarilsa devor qaytadi",
          buildItems().filter(function(x){ return x.code === "00_999"; }).length === 1,
          "maxPartT=500");
      S.maxPartT = 60;
      P.parts.pop(); P.materials.pop();
      packAll();
      chk("devor sinovidan keyin holat tiklandi", PACKS.length === sv0, PACKS.length + " pochka");
    } catch(e){ chk("pochkalanmaydigan obyektlar", false, e.message); }

    /* ================= v16: QOLDIQ UCHUN MASSA ZAXIRASI ================= */
    try {
      var z0 = PACKS.length;
      var over = PACKS.filter(function(p){ return p.overKg; });
      chk("zaxiradan foydalanilgan", over.length > 0, over.length + " ta pochka");

      // zaxira CHEGARASI: hech biri maxKg + tailKgOver dan oshmaydi
      var zBad = over.filter(function(p){
        return p.kg > packKgBase(p) + S.tailKgOver + 0.001;
      });
      chk("zaxira chegarasi buzilmaydi", zBad.length === 0,
          zBad.map(function(p){ return "P"+p.no+" "+p.kg.toFixed(1); }).join(",") ||
          ("eng ogʻiri " + Math.max.apply(null, over.map(function(p){ return p.kg; })).toFixed(1) + " kg"));

      // zaxira FAQAT belgilangan pochkada ochiladi
      var zLeak = PACKS.filter(function(p){
        return !p.overKg && !p.odd && !p.oddSrc && p.kg > S.maxKg + 0.001;
      });
      chk("zaxira belgilanmagan pochkada ochilmaydi", zLeak.length === 0,
          zLeak.map(function(p){ return "P"+p.no; }).join(",") || "toza");

      // zaxirali pochkada audit MASSA xatosi bermaydi
      var zAud = auditPacks(PACKS, buildItems());
      chk("zaxirali pochkada MASSA xatosi yoʻq",
          zAud.errors.filter(function(e){ return e.code === "MASSA"; }).length === 0,
          zAud.errors.map(function(e){ return e.code; }).join(",") || "toza");

      /* v19: zaxira OXIRGI CHORA — singdirish avval chegara ichida joy qidiradi
         va faqat topilmasa zaxirani ochadi.

         Buni pochkalarga qarab isbotlab boʻlmaydi: boʻsh massa borligi
         geometrik sigʻishni anglatmaydi. Zaxirani oshirib koʻrish ham notoʻgʻri —
         kattaroq zaxira ogʻirroq pochkaga ATAYLAB ruxsat beradi.

         Oʻlchanadigan narsa — ULUSH. Zaxira birinchi tanlov boʻlganda har
         singdirish uni ochib yuborardi va namunada 45 pochkadan 11 tasi (24 %)
         limitdan ogʻir chiqardi. Oxirgi chora boʻlganda bu ulush keskin
         tushadi. Chegara 15 % — regressiya darhol koʻrinadi. */
      var zShare = 100 * over.length / PACKS.length;
      chk("zaxira ulushi kichik — oxirgi chora", zShare < 15,
          over.length + " / " + PACKS.length + " pochka (" + zShare.toFixed(1) +
          " %) · v16 da 24 % edi");

      // zaxira ochilganda ENG KAM oshadigan nishon tanlanadi — natija cheklangan
      var zMax = over.length ? Math.max.apply(null, over.map(function(p){ return p.kg; })) : 0;
      chk("zaxirali pochka mutlaq shiftdan oshmaydi",
          zMax <= S.maxKg + S.tailKgOver + 0.001,
          "eng ogʻiri " + zMax.toFixed(1) + " kg · shift " + (S.maxKg + S.tailKgOver) + " kg");

      // nostandart pochkaga zaxira QOʻSHILMAYDI — shift baribir 45
      var zNs = PACKS.filter(function(p){
        return p.oddSrc && p.kg > S.maxKg + S.tailKgOver + 0.001;
      });
      chk("nostandart pochka ham 45 kg shiftdan oshmaydi", zNs.length === 0,
          zNs.map(function(p){ return "P"+p.no+" "+p.kg.toFixed(1); }).join(",") || "toza");

      // zaxirani oʻchirsak — limitdan ogʻir pochka qolmaydi, soni oshadi
      var svZ = S.tailKgOver;
      S.tailKgOver = 0; packAll();
      var zOver = PACKS.filter(function(p){ return p.overKg; }).length;
      var zN = PACKS.length;
      chk("zaxira 0 da limitdan ogʻir pochka yoʻq", zOver === 0, zOver + " ta");
      S.tailKgOver = svZ; packAll();
      chk("zaxira pochka sonini kamaytiradi", PACKS.length < zN,
          zN + " -> " + PACKS.length + " pochka");
      chk("zaxira holati tiklandi", PACKS.length === z0, PACKS.length + " pochka");

      // sozlama aylanmasi
      S.tailKgOver = 7; writeConf(); S.tailKgOver = 0; readConf();
      chk("zaxira sozlamasi saqlanadi", S.tailKgOver === 7, "tailKgOver=" + S.tailKgOver);
      S.tailKgOver = svZ; writeConf(); packAll();
    } catch(e){ chk("qoldiq zaxirasi", false, e.message); }

    /* ================= v14: TAG OYNASI va PADDON QAMROVI ================= */
    try {
      var w0 = PACKS.length;
      var wBad = [];
      PACKS.forEach(function(p){
        if (p.odd || p.oddSrc) return;
        if (p.base.W < S.minBase || p.base.W > S.baseWMax ||
            p.base.L < S.baseLMin || p.base.L > S.maxLen) wBad.push("P" + p.no);
      });
      chk("tag oyna ichida", wBad.length === 0, wBad.join(",") || "hammasi");

      // eni chegarasi haqiqatan qisadi: eng keng tagdan kichik qilib qoʻyamiz
      var wMax = 0;
      PACKS.forEach(function(p){ if (!p.odd && p.base.W > wMax) wMax = p.base.W; });
      var svW = S.baseWMax;
      S.baseWMax = Math.max(S.minBase + 10, wMax - 50);
      packAll();
      // nostandart oqim ATAYIN kengroq oyna bilan ishlaydi (oddWMax) — u hisobga kirmaydi
      var wOver = 0;
      PACKS.forEach(function(p){ if (!p.odd && !p.oddSrc && p.base.W > S.baseWMax) wOver++; });
      chk("tag eni chegarasi qisadi", wOver === 0,
          "baseWMax=" + S.baseWMax + " · chegaradan katta tag: " + wOver);
      S.baseWMax = svW; packAll();
      chk("tag eni tiklandi", PACKS.length === w0, PACKS.length + " pochka");

      var cBad = [], iBad = [];
      PACKS.forEach(function(p){
        if (p.odd) return;
        var cv = (p.base.L * p.base.W) / (p.gabL * p.gabW);
        if (cv < S.baseCover/100 - 1e-6) cBad.push("P" + p.no + " " + Math.round(cv*100) + "%");
        if ((p.gabL - p.base.L)/2 > S.baseInset + 0.5 ||
            (p.gabW - p.base.W)/2 > S.baseInset + 0.5) iBad.push("P" + p.no);
      });
      chk("paddon qamrovi meʼyorda", cBad.length === 0, cBad.join(",") || "toza");
      chk("chetdan qochish meʼyorda", iBad.length === 0, iBad.join(",") || "toza");

      var svC = S.baseCover;
      S.baseCover = 100; packAll();
      var ovhLeft = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        if (p.gabL > p.base.L + 0.5 || p.gabW > p.base.W + 0.5) ovhLeft++;
      });
      chk("qamrov 100% — chiqish qolmaydi", ovhLeft === 0, ovhLeft + " ta chiqishli pochka");
      S.baseCover = svC; packAll();
      chk("qamrov tiklandi", PACKS.length === w0, PACKS.length + " pochka");
    } catch(e){ chk("tag oynasi / paddon qamrovi", false, e.message); }

    /* ================= v14: QAVAT QALINLIGI va MATRITSA ================= */
    try {
      var q0 = PACKS.length;
      function mixedLayers(){
        var n = 0;
        PACKS.forEach(function(p){
          if (p.odd) return;
          p.layers.forEach(function(L){
            var ts = {};
            L.items.forEach(function(x){ ts[x.it.T] = 1; });
            if (Object.keys(ts).length > 1) n++;
          });
        });
        return n;
      }
      chk("qavatda bitta qalinlik", mixedLayers() === 0, mixedLayers() + " ta aralash qavat");

      var cnt = {};
      buildItems().forEach(function(it){ cnt[it.T] = (cnt[it.T]||0) + 1; });
      var top = null;
      Object.keys(cnt).forEach(function(k){ if (top === null || cnt[k] > cnt[top]) top = k; });
      chk("asosiy qalinlik aniqlandi", MAIN_T === +top, "MAIN_T=" + MAIN_T + " · kutilgan " + top);

      var thin = null;
      Object.keys(cnt).forEach(function(k){ if (+k !== MAIN_T && thin === null) thin = k; });
      S.thickMix = {}; S.thickMix[thin] = true;
      packAll();
      /* Yupqa tag/qopqoq ZAXIRA yoʻli bilan ruxsat etiladi: pochkada minBaseT ga
         yetadigan birorta detal boʻlmasa (masalan butun pochka 3 mm orqa devor),
         talab shu pochkaning eng qalin detaliga tushadi — aks holda ular hech
         qayerga joylasholmasdi. Tekshiruv aynan shu shartni oʻlchaydi. */
      function thickest(p){
        var m = p.base.T;
        p.layers.forEach(function(L){ L.items.forEach(function(x){ if (x.it.T > m) m = x.it.T; }); });
        return m;
      }
      var joined = 0, thinBase = 0, thinLid = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        var ts = {};
        ts[p.base.T] = 1;
        p.layers.forEach(function(L){ L.items.forEach(function(x){ ts[x.it.T] = 1; }); });
        if (Object.keys(ts).length > 1) joined++;
        var top = thickest(p);
        if (p.base.T < S.minBaseT && top >= S.minBaseT) thinBase++;
        p.layers.forEach(function(L){
          if (L.lid && !L.tail && !L.impl)
            L.items.forEach(function(x){ if (x.it.T < S.minBaseT && top >= S.minBaseT) thinLid++; });
        });
      });
      chk("matritsa: ikki qalinlik bitta pochkada", joined > 0, joined + " ta aralash pochka");
      chk("matritsada ham qavat aralashmaydi", mixedLayers() === 0, mixedLayers() + " ta");
      chk("matritsada tag yupqa boʻlmaydi", thinBase === 0, thinBase + " ta yupqa tag");
      chk("matritsada qopqoq yupqa boʻlmaydi", thinLid === 0, thinLid + " ta yupqa qopqoq");
      var mAud = auditPacks(PACKS, buildItems());
      chk("matritsada audit toza", mAud.errors.length === 0,
          mAud.errors.map(function(e){ return e.code; }).join(",") || "toza");
      S.thickMix = {}; packAll();
      chk("matritsa oʻchirildi — eski holat", PACKS.length === q0, PACKS.length + " pochka");

      var mp = null;
      PACKS.forEach(function(p){ if (!mp && !p.odd && p.layers.length && p.layers[0].items.length > 1) mp = p; });
      var alien = null;
      if (mp) buildItems().forEach(function(it){ if (!alien && it.T !== mp.base.T) alien = it; });
      if (mp && alien){
        var q = mp.layers[0].items[0], svIt = q.it;
        q.it = alien;
        var bad = auditPacks(PACKS, buildItems());
        chk("audit aralash qavatni koʻradi",
            bad.errors.some(function(e){ return e.code === "QALINLIK"; }),
            bad.errors.map(function(e){ return e.code; }).join(","));
        q.it = svIt;
      } else chk("audit aralash qavatni koʻradi", false, "sinov holati yasalmadi");
      packAll();
    } catch(e){ chk("qavat qalinligi / matritsa", false, e.message); }

    /* ================= v14: QOPQOQ QOIDALARI ================= */
    try {
      /* Qopqoq qoidalari (min qalinlik, muvozanat) makeLid() da qoʻllanadi.
         `impl` — eng ustki qavat shunchaki qopqoq deb koʻtarilgan holat: unga
         bu qoidalar tegishli emas, shuning uchun hisobdan chiqariladi. */
      var lThin = 0, lBal = 0, lN = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        p.layers.forEach(function(L){
          if (!L.lid || L.tail || L.soft || L.impl) return;
          lN++;
          L.items.forEach(function(x){ if (x.it.T < S.minBaseT) lThin++; });
          if (!lidBalOK(L)) lBal++;
        });
      });
      chk("haqiqiy qopqoq bor", lN > 0, lN + " ta");
      chk("qopqoq minBaseT dan yupqa emas", lThin === 0, lThin + " ta yupqa detal");
      chk("qopqoq muvozanati saqlangan", lBal === 0, lBal + " ta buzilgan");

      function fakeLid(a, b){ return { items:[ {a:a, b:1}, {a:b, b:1} ] }; }
      /* v17: lidBal — 2 detalli tomda eng kichik ulushning MIN foizi.
         minUlush(n) = lidBal − 10 × (n − 2):  n=2 → 40 %, n=3 → 30 %. */
      var svBal = S.lidBal; S.lidBal = 40;
      chk("tom 60/40 ruxsat", lidBalOK(fakeLid(60, 40)) === true, "60/40");
      chk("tom 50/50 ruxsat", lidBalOK(fakeLid(50, 50)) === true, "50/50");
      chk("tom 88/12 rad",    lidBalOK(fakeLid(88, 12)) === false, "88/12");
      chk("tom 65/35 rad",    lidBalOK(fakeLid(65, 35)) === false, "65/35");
      var fake3 = { items:[{a:34,b:1},{a:33,b:1},{a:33,b:1}] };
      var fake3b = { items:[{a:55,b:1},{a:25,b:1},{a:20,b:1}] };
      chk("tom 34/33/33 ruxsat", lidBalOK(fake3) === true, "34/33/33");
      chk("tom 55/25/20 rad",    lidBalOK(fake3b) === false, "55/25/20");
      chk("yaxlit tom har doim ruxsat", lidBalOK({ items:[{a:100,b:1}] }) === true, "1 detal");
      S.lidBal = svBal;
    } catch(e){ chk("qopqoq qoidalari", false, e.message); }

    /* ================= v14: NOSTANDART OQIM ================= */
    try {
      var n0 = PACKS.length;
      var bundles = PACKS.filter(function(p){ return p.odd; });

      /* v16: bogʻlar endi YAKUNIY singdirish bosqichida standart pochkalarga
         singib ketishi mumkin — namunada hammasi shunday. Shuning uchun bogʻ
         yasash mantigʻi BIRLIK sinov bilan tekshiriladi: oddBundles() ga
         sunʼiy roʻyxat beriladi va natija oʻlchanadi. */
      function fakePart(code, L, W, T, kg, uid){
        return { code:code, L:L, W:W, T:T, kg:kg, uid:uid, cls:"BOK", unit:"01", matId:"m1" };
      }
      var fake = [ fakePart("A", 2400, 180, 16, 5, "f1"),
                   fakePart("A", 2400, 180, 16, 5, "f2"),
                   fakePart("A", 2380, 175, 16, 5, "f3"),   // oʻlchami yaqin
                   fakePart("B", 1200, 180, 16, 3, "f4") ]; // uzoq — alohida bogʻ
      var fb = oddBundles(fake);
      chk("bogʻ: yaqin oʻlchamlar birga", fb.length === 2,
          fb.map(function(b){ return b.items.length + " detal"; }).join(" | "));
      var fbBad = 0;
      fb.forEach(function(b){
        var L0 = b.items[0].L, W0 = b.items[0].W;
        b.items.forEach(function(x){
          if (Math.abs(x.L - L0) > S.oddTol + 0.5 || Math.abs(x.W - W0) > S.oddTol + 0.5) fbBad++;
        });
      });
      chk("bogʻ ichida oʻlchamlar yaqin", fbBad === 0, fbBad + " ta uzoq detal");

      var svK = S.oddKg; S.oddKg = 8;              // 5+5 = 10 > 8 → ikkiga boʻlinsin
      var fb2 = oddBundles(fake.slice(0, 2));
      chk("bogʻ massa limitida boʻlinadi", fb2.length === 2,
          fb2.map(function(b){ return b.kg.toFixed(1) + "kg"; }).join(" | "));
      S.oddKg = svK;

      var svT = S.oddTol; S.oddTol = 2000;
      var fb3 = oddBundles(fake);
      chk("oddTol kengaysa bogʻ kamayadi", fb3.length < fb.length,
          fb.length + " -> " + fb3.length + " bogʻ");
      S.oddTol = svT;

      // qolgan bogʻlar (boʻlsa) guruh kalitiga ega boʻlishi shart
      var noKey = bundles.filter(function(b){ return !b.key; }).length;
      chk("bogʻga guruh kaliti yozildi", noKey === 0, noKey + " ta kalitsiz bogʻ");

      // nostandart detallar YOʻQOLMASLIGI — asosiy invariant
      var nsAll = auditPacks(PACKS, buildItems());
      chk("nostandart detallar joylashdi",
          nsAll.stats.itemsPlaced === nsAll.stats.itemsExpected,
          nsAll.stats.itemsPlaced + "/" + nsAll.stats.itemsExpected);

      var nsAud = auditPacks(PACKS, buildItems());
      chk("nostandart oqimda audit toza", nsAud.errors.length === 0,
          nsAud.errors.map(function(e){ return e.code + " " + e.pack; }).join(",") || "toza");
      /* v16: standart limitdan ogʻir boʻlish uchun UCH sabab qonuniy:
         nostandart oqim (oddSrc), noodatiy bogʻ (odd) va qoldiq zaxirasi
         (overKg). Boshqa hech qanday sabab boʻlmasligi kerak. */
      var overStd = PACKS.filter(function(p){ return p.kg > S.maxKg + 0.001; });
      chk("standart limitdan ogʻiri — faqat asosli",
          overStd.every(function(p){ return p.oddSrc || p.odd || p.overKg; }),
          overStd.filter(function(p){ return !(p.oddSrc||p.odd||p.overKg); })
                 .map(function(p){ return "P" + p.no + " " + p.kg.toFixed(1); }).join(",") || "hammasi asosli");
      chk("nostandart holati tiklandi", PACKS.length === n0, PACKS.length + " pochka");
    } catch(e){ chk("nostandart oqim", false, e.message); }

    /* ================= v14: BALANDLIK CHEGARASI ================= */
    try {
      var h0 = PACKS.length;
      var hMax = 0;
      PACKS.forEach(function(p){ if (!p.odd && p.h > hMax) hMax = p.h; });
      chk("balandlik 0 da cheklovsiz", S.maxH === 0,
          "maxH=" + S.maxH + " · eng baland " + Math.round(hMax));
      S.maxH = Math.max(40, Math.round(hMax * 0.6));
      packAll();
      var hOver = [];
      PACKS.forEach(function(p){ if (!p.odd && p.h > S.maxH + 0.5) hOver.push("P" + p.no + " " + Math.round(p.h)); });
      chk("balandlik chegarasi ushlaydi", hOver.length === 0,
          "maxH=" + S.maxH + " · oshgan: " + (hOver.join(",") || "yoʻq"));
      var hAud = auditPacks(PACKS, buildItems());
      chk("balandlik chegarasida audit toza", hAud.errors.length === 0,
          hAud.errors.map(function(e){ return e.code; }).join(",") || "toza");
      S.maxH = 0; packAll();
      chk("balandlik tiklandi", PACKS.length === h0, PACKS.length + " pochka");
    } catch(e){ chk("balandlik chegarasi", false, e.message); }

    /* ================= v20: TOM OSTIDAGI QAVAT (TOʻSHAK) =================
       Sexdan kelgan nosozlik: tom uch tasmadan iborat (1897×100 + 1790×100 +
       1897×100), yuzasi 98 %, nisbatlar toʻgʻri. Lekin ostidagi qavat faqat
       oʻrtani egallaydi — chetdagi ikkita tasma qirraga tayanib DUMALAB ketadi.

       Sexning talabi: tom ostidagi qavat oʻz yuzasining kamida 85 % ini
       qoplasin, aks holda bunday terish XATO hisoblanadi. */
    function bedOf(q){
      if (q.odd || !q.layers || q.layers.length < 2) return null;
      return q.layers[q.layers.length-2].fill;
    }
    try {
      var svBed = S.lidBed;
      chk("toʻshak chegarasi standart holda yoqilgan", S.lidBed > 0, "lidBed=" + S.lidBed);

      /* Chegara `minFill` dan qatʼiyroq boʻlolmaydi — aks holda oddiy qavat
         qabul qilinadi-yu, audit uni xato deb belgilardi. */
      var svFill = S.minFill;
      S.minFill = 60;
      chk("toʻshak chegarasi minFill dan oshmaydi", bedMin() === 60,
          "lidBed=" + S.lidBed + " minFill=60 -> " + bedMin());
      S.minFill = svFill;
      chk("odatda toʻshak chegarasi lidBed ga teng", bedMin() === Math.min(S.lidBed, S.minFill),
          bedMin() + "%");

      packAll();
      var bad = [];
      PACKS.forEach(function(q){
        var v = bedOf(q);
        if (v != null && v < bedMin()/100 - 1e-9)
          bad.push("P" + q.no + "=" + Math.round(v*100) + "%");
      });
      chk("hamma tom ostidagi qavat chegarada", bad.length === 0,
          bad.slice(0, 5).join(", ") || "toza");

      /* SIYRAK QUYRUQ TOM OSTIGA TUSHMAYDI. Aynan shu nosozlik edi. */
      var tailUnderTop = [];
      PACKS.forEach(function(q){
        if (q.odd || q.layers.length < 2) return;
        var b = q.layers[q.layers.length-2];
        if (b.tail && !bedOK(b)) tailUnderTop.push("P" + q.no + "=" + Math.round(b.fill*100) + "%");
      });
      chk("siyrak quyruq tom ostiga tushmaydi", tailUnderTop.length === 0,
          tailUnderTop.join(", ") || "toza");

      var aB = auditPacks(PACKS, buildItems());
      chk("toʻshak chegarasida audit toza", aB.errors.length === 0,
          aB.errors.map(function(e){ return e.code; }).join(",") || "toza");
      chk("toʻshak chegarasida detal yoʻqolmaydi",
          aB.stats.itemsPlaced === aB.stats.itemsExpected,
          aB.stats.itemsPlaced + "/" + aB.stats.itemsExpected);

      /* AUDIT BUZILISHNI XATO DEB KOʻRADIMI.

         Chegarani koʻtarib sinab boʻlmaydi: u `minFill` bilan qisiladi
         (`bedMin`), yaʼni auditdan hech qachon `minFill` dan koʻpini talab
         qilib boʻlmaydi. Shuning uchun buzilish TOʻGʻRIDAN-TOʻGʻRI yasaladi:
         bitta pochkaning toʻshak qavatini siyrak deb belgilaymiz. */
      var vp = null;
      PACKS.forEach(function(q){ if (!vp && !q.odd && q.layers.length >= 2) vp = q; });
      if (vp){
        var vbl = vp.layers[vp.layers.length-2], vsv = vbl.fill;
        vbl.fill = 0.30;
        var aBad = auditPacks(PACKS, buildItems());
        var bErr = aBad.errors.filter(function(e){ return e.code === "TOM_TAGI"; });
        chk("audit toʻshak buzilishini XATO deb koʻradi", bErr.length === 1,
            bErr.length + " ta TOM_TAGI" + (bErr[0] ? " · " + bErr[0].msg.slice(0, 55) : ""));
        vbl.fill = vsv;
        var aOk = auditPacks(PACKS, buildItems());
        chk("tiklangandan keyin xato yoʻqoladi",
            aOk.errors.filter(function(e){ return e.code === "TOM_TAGI"; }).length === 0);
      }

      /* Chegara oʻchirilsa siyrak toʻshak QAYTADI — oʻlchov haqiqatan
         ishlayotganini koʻrsatadi (aks holda test doim OK berardi). */
      S.lidBed = 0; packAll();
      var offMin = 1;
      PACKS.forEach(function(q){ var v = bedOf(q); if (v != null && v < offMin) offMin = v; });
      chk("chegara oʻchirilsa siyrak toʻshak paydo boʻladi", offMin < 0.85 - 1e-9,
          "oʻchiq: eng yomoni " + Math.round(offMin*100) + "%");

      S.lidBed = svBed; packAll();
      var onMin = 1;
      PACKS.forEach(function(q){ var v = bedOf(q); if (v != null && v < onMin) onMin = v; });
      chk("chegara qaytarilsa toʻshak yaxshilanadi", onMin > offMin + 1e-9,
          "oʻchiq " + Math.round(offMin*100) + "% -> yoqilgan " + Math.round(onMin*100) + "%");

      /* QUYRUQ YOʻQOLMAYDI — u pastroqqa suqiladi. Singdirish mexanizmi
         butunlay oʻchib qolmasligi kerak, aks holda pochka soni keskin oshadi. */
      var tN = 0;
      PACKS.forEach(function(q){
        if (q.odd) return;
        (q.layers || []).forEach(function(L){ if (L.tail) tN++; });
      });
      chk("quyruq mexanizmi ishlashda qoladi", tN > 0, tN + " quyruq qavati");

      // sozlama aylanmasi
      S.lidBed = 75; writeConf(); S.lidBed = 0; readConf();
      chk("toʻshak sozlamasi saqlanadi", S.lidBed === 75, "lidBed=" + S.lidBed);
      S.lidBed = svBed; writeConf(); packAll();
    } catch(e){ chk("tom ostidagi qavat", false, e.message); }

    /* ================= v20: TOM DETALINING TAYANCHI =================
       Sexdan kelgan nosozlik: tom uch detaldan iborat, yuzasi 98 %, nisbatlari
       toʻgʻri — lekin ostidagi qavat tor. Oʻrtadagi detal unga tegadi, chetdagi
       IKKITASI esa undan butunlay chiqib osilib qolgan: tegish yuzasi 30 % ham
       emas. Ustiga pochka terilsa oʻsha ikkitasi sinadi.

       `tailSpan` buni koʻrmaydi — u butun qavatning UMUMIY kengligini
       oʻlchaydi. Kerakli oʻlchov boshqa: HAR BIR tom detali oʻz yuzasining
       qancha qismi bilan ostidagi qavatga tegadi. */
    try {
      var svSupp = S.lidSupp;
      chk("tom tayanchi standart holda yoqilgan", S.lidSupp > 0, "lidSupp=" + S.lidSupp);

      /* Oʻlchovning oʻzi — sunʼiy geometriyada. Bu muhim: qoida notoʻgʻri
         oʻlchansa pochkalar «toza» chiqadi va nosozlik sezilmay qoladi. */
      var bs = { L:1000, W:400, T:16 };
      var A = { items:[{ x:0, y:0, a:1000, b:400, it:{} }] };
      chk("toʻliq ustma-ust tushgan detal 100% tayanchda",
          Math.abs(partSupport(A.items[0], [{ x:0, y:0, a:1000, b:400 }]) - 1) < 1e-9,
          Math.round(partSupport(A.items[0], [{ x:0, y:0, a:1000, b:400 }])*100) + "%");
      chk("yarmi chiqib turgan detal 50% tayanchda",
          Math.abs(partSupport({ x:0, y:0, a:1000, b:400 }, [{ x:500, y:0, a:1000, b:400 }]) - 0.5) < 1e-9,
          Math.round(partSupport({ x:0, y:0, a:1000, b:400 }, [{ x:500, y:0, a:1000, b:400 }])*100) + "%");
      chk("umuman tegmagan detal 0% tayanchda",
          partSupport({ x:0, y:0, a:100, b:100 }, [{ x:500, y:500, a:100, b:100 }]) === 0);

      /* ENG YOMONI olinadi, oʻrtacha emas — aynan shu nosozlikni ushlaydi:
         oʻrtadagi detal 100 %, chetdagi ikkitasi 0 %. */
      var three = { items:[
        { x:0,   y:0, a:300, b:400, it:{} },     // chetda — tegmaydi
        { x:350, y:0, a:300, b:400, it:{} },     // oʻrtada — tegadi
        { x:700, y:0, a:300, b:400, it:{} }      // chetda — tegmaydi
      ]};
      var narrowBelow = [{ x:350, y:0, a:300, b:400 }];
      chk("uch detalli tomda eng yomoni olinadi",
          layerSupp(three, narrowBelow, bs) === 0,
          "eng yomoni " + Math.round(layerSupp(three, narrowBelow, bs)*100) +
          "% (oʻrtacha 33% boʻlardi)");
      chk("tayanch sharti buni rad etadi",
          stackSuppOK(three, narrowBelow, bs) === false);

      // ostida qavat boʻlmasa — tag detalga tayanadi
      chk("ostida qavat boʻlmasa tagga tayanadi",
          Math.abs(layerSupp(A, null, bs) - 1) < 1e-9,
          Math.round(layerSupp(A, null, bs)*100) + "%");

      /* HAQIQIY POCHKALARDA */
      function topSupp(q){
        if (q.odd || !q.layers.length) return null;
        var L = q.layers[q.layers.length-1];
        var bel = q.layers.length > 1 ? q.layers[q.layers.length-2].items : null;
        return layerSupp(L, bel, q.base);
      }
      /* Bazani oʻlchaganda TOʻSHAK qoidasini ham oʻchiramiz. U siyrak quyruqni
         tom ostiga umuman qoʻymaydi, demak yoqiq holda tayanch baribir yaxshi
         chiqadi va bu oʻlchov `lidSupp` ni sinamay qoʻyadi. */
      var svBed0 = S.lidBed;
      S.lidSupp = 0; S.lidBed = 0; packAll();
      var offMin = 1;
      PACKS.forEach(function(q){ var v = topSupp(q); if (v != null && v < offMin) offMin = v; });

      S.lidSupp = svSupp; packAll();          // toʻshak hali ham oʻchiq
      var onMin = 1, bad = [];
      PACKS.forEach(function(q){
        var v = topSupp(q);
        if (v == null) return;
        if (v < onMin) onMin = v;
        if (v < S.lidSupp/100 - 1e-9) bad.push("P" + q.no + "=" + Math.round(v*100) + "%");
      });
      chk("hamma tom tayanch chegarasida", bad.length === 0,
          bad.slice(0, 5).join(", ") || "toza");
      chk("chegara tayanchni yaxshiladi", onMin > offMin + 1e-9,
          "oʻchiq " + Math.round(offMin*100) + "% -> yoqilgan " + Math.round(onMin*100) + "%");

      var aT = auditPacks(PACKS, buildItems());
      chk("tom tayanchida audit toza", aT.errors.length === 0,
          aT.errors.map(function(e){ return e.code; }).join(",") || "toza");
      chk("tom tayanchida detal yoʻqolmaydi",
          aT.stats.itemsPlaced === aT.stats.itemsExpected,
          aT.stats.itemsPlaced + "/" + aT.stats.itemsExpected);

      /* AUDIT SABABNI AYTADIMI. Ilgari TOM ogohlantirishi har doim bir xil matn
         berardi va P/M nima notoʻgʻri ekanini topolmasdi. */
      var tomW = aT.warnings.filter(function(w){ return w.code === "TOM"; });
      if (tomW.length)
        chk("TOM ogohlantirishi sababni aytadi",
            tomW.every(function(w){
              var m = w.msg || "";
              return m.indexOf("yuza ") > 0 || m.indexOf("detal >") > 0 ||
                     m.indexOf("nisbat ") > 0 || m.indexOf("tayanch ") > 0 ||
                     m.indexOf("gabarit") > 0;
            }),
            tomW[0].msg.slice(0, 70));

      /* Chegara koʻtarilganda: `layoutPack` da tayanch QATʼIY rad etish emas,
         BALL orqali ishlaydi (tomi tayangan variant +90 ball ustunlikka ega).
         Baʼzi guruhda esa hech qanday joylashuv shartni bajara olmaydi —
         detallar shunchaki yoʻq. Shuning uchun bu yerda kafolat emas, IKKI
         narsa talab qilinadi:
           1) chegara koʻtarilsa tayanch YAXSHILANADI;
           2) bajarilmagan joy JIM qolmaydi — audit ogohlantirishi chiqadi.
         Standart 65 % da esa kafolat bor (yuqoridagi «hamma tom tayanch
         chegarasida» tekshiruvi). */
      S.lidSupp = 85; packAll();              // toʻshak hali ham oʻchiq
      var hiMin = 1, hiBad = [];
      PACKS.forEach(function(q){
        var v = topSupp(q);
        if (v == null) return;
        if (v < hiMin) hiMin = v;
        if (v < S.lidSupp/100 - 1e-9) hiBad.push(q);
      });
      chk("chegara koʻtarilsa tayanch yaxshilanadi", hiMin > onMin - 1e-9,
          "65% da " + Math.round(onMin*100) + "% -> 85% da " + Math.round(hiMin*100) + "%");
      var aHi = auditPacks(PACKS, buildItems());
      var seen = {};
      aHi.warnings.forEach(function(w){
        if (w.code === "TOM" || w.code === "TOM_TAYANCH") seen[w.pack] = 1;
      });
      var silent = hiBad.filter(function(q){ return !seen["P" + pad2(q.no)] && !seen[q.no]; });
      chk("bajarilmagan tayanch jim qolmaydi (audit koʻrsatadi)", silent.length === 0,
          hiBad.length + " ta chegaradan past, " + silent.length + " tasi ogohlantirishsiz");

      // sozlama aylanmasi
      S.lidSupp = 55; writeConf(); S.lidSupp = 0; readConf();
      chk("tom tayanchi sozlamasi saqlanadi", S.lidSupp === 55, "lidSupp=" + S.lidSupp);
      S.lidSupp = svSupp; S.lidBed = svBed0; writeConf(); packAll();
    } catch(e){ chk("tom detalining tayanchi", false, e.message); }

    /* ================= v20: QUYRUQ TAYANCHINING KENGLIGI =================
       Sexdan kelgan nosozlik: 1910×300 li pochkaga 1720×160 li quyruq MARKAZGA
       tushgan. Chetdagi boʻshliqlar 70 va 102 mm — `tailGap` (300 mm) bemalol
       oʻtkazadi. Lekin qopqoq 300 mm enli pochkada 160 mm enli qirraga tayanadi
       (53 %) va ustiga pochka terilganda ag'dariladi.

       Demak boʻshliq oʻlchovi YETARLI EMAS: u teshikni koʻradi, tayanchning
       TORLIGINI koʻrmaydi. Ikkinchi oʻlchov — har oʻq boʻyicha qoplanish. */
    try {
      var svSpan = S.tailSpan;

      chk("quyruq tayanchi standart holda yoqilgan", S.tailSpan > 0,
          "tailSpan=" + S.tailSpan);

      packAll();
      function tailsOf(){
        var out = [];
        PACKS.forEach(function(q){
          if (q.odd) return;
          (q.layers || []).forEach(function(L){ if (L.tail) out.push({ p:q, L:L }); });
        });
        return out;
      }
      var tl = tailsOf();
      var narrow = tl.filter(function(x){
        return layerSpan(x.L, x.p.base) < S.tailSpan/100 - 1e-9;
      });
      chk("hamma quyruq tayanch chegarasida", narrow.length === 0,
          tl.length + " quyruq, " + narrow.length + " tasi tor");

      var minSpan = 1;
      tl.forEach(function(x){ var v = layerSpan(x.L, x.p.base); if (v < minSpan) minSpan = v; });
      chk("eng tor tayanch chegaradan past emas",
          !tl.length || minSpan >= S.tailSpan/100 - 1e-9,
          Math.round(minSpan*100) + "% · chegara " + S.tailSpan + "%");

      /* Oʻlchov IKKI OʻQNI ALOHIDA koʻradimi. Sunʼiy qavat: X boʻyicha toʻliq,
         Y boʻyicha yarim — min olinishi shart, aks holda nosozlik oʻtib ketadi. */
      var fake = { items:[{ x:0, y:75, a:1000, b:150, it:{} }] };
      var fb = { L:1000, W:300 };
      chk("tayanch kichik oʻq boʻyicha oʻlchanadi",
          Math.abs(layerSpan(fake, fb) - 0.5) < 1e-6,
          Math.round(layerSpan(fake, fb)*100) + "% (X=100%, Y=50%)");

      // chetdan chiqqan qism tayanch emas
      var fake2 = { items:[{ x:-200, y:0, a:1200, b:300, it:{} }] };
      chk("chetdan chiqqan qism tayanchga qoʻshilmaydi",
          Math.abs(layerSpan(fake2, fb) - 1) < 1e-6,
          Math.round(layerSpan(fake2, fb)*100) + "%");

      // ikki bo'lak birlashsa — qoplanish yig'iladi, ustma-ust tushsa qo'shilmaydi
      var fake3 = { items:[{ x:0, y:0, a:400, b:300, it:{} }, { x:300, y:0, a:400, b:300, it:{} }] };
      chk("ustma-ust tushgan bo'laklar ikki marta sanalmaydi",
          Math.abs(layerSpan(fake3, fb) - 0.7) < 1e-6,
          Math.round(layerSpan(fake3, fb)*100) + "% (0…700 mm / 1000)");

      /* CHEGARA QATTIQLASHSA TAYANCH KENGAYADI — oʻlchov haqiqatan ishlayotganini
         koʻrsatadi (aks holda test doim OK berardi). */
      /* Bazada TOʻSHAK va TOM TAYANCHI ham oʻchiriladi — ikkovi ham siyrak
         quyruqni allaqachon rad etadi va `tailSpan` ning taʼsiri koʻrinmay
         qolardi. */
      var svBedT = S.lidBed, svSuppT = S.lidSupp;
      S.tailSpan = 0; S.lidBed = 0; S.lidSupp = 0; packAll();
      var off = tailsOf(), offMin = 1;
      off.forEach(function(x){ var v = layerSpan(x.L, x.p.base); if (v < offMin) offMin = v; });
      chk("chegara oʻchirilsa tor tayanch paydo boʻladi",
          !off.length || offMin < 0.7,
          "oʻchiq: eng tor " + Math.round(offMin*100) + "%");

      S.tailSpan = 90; packAll();             // toʻshak/tayanch hali oʻchiq
      var hi = tailsOf(), hiMin = 1;
      hi.forEach(function(x){ var v = layerSpan(x.L, x.p.base); if (v < hiMin) hiMin = v; });
      chk("chegara koʻtarilsa tayanch ham kengayadi",
          !hi.length || hiMin >= 0.9 - 1e-9,
          "90%: eng tor " + Math.round(hiMin*100) + "%");

      S.tailSpan = svSpan; S.lidBed = svBedT; S.lidSupp = svSuppT; packAll();
      var aS = auditPacks(PACKS, buildItems());
      chk("tayanch chegarasida audit toza", aS.errors.length === 0,
          aS.errors.map(function(e){ return e.code; }).join(",") || "toza");
      chk("tayanch chegarasida detal yoʻqolmaydi",
          aS.stats.itemsPlaced === aS.stats.itemsExpected,
          aS.stats.itemsPlaced + "/" + aS.stats.itemsExpected);

      // sozlama aylanmasi
      S.tailSpan = 65; writeConf(); S.tailSpan = 0; readConf();
      chk("tayanch sozlamasi saqlanadi", S.tailSpan === 65, "tailSpan=" + S.tailSpan);
      S.tailSpan = svSpan; writeConf(); packAll();
    } catch(e){ chk("quyruq tayanchi", false, e.message); }

    /* ================= v20: BALANDLIK CHEGARASI IKKALA TURGA HAM =================
       Muammo (sexdan): `maxH = 160` mm qoʻyilgan buyurtmada 12 ta 16 mm li
       detal bitta BOGʻga tushib 192 mm boʻlib chiqdi. Sabab — `oddBundles()`
       da faqat massa, oʻlcham yaqinligi va gabarit tekshirilardi; balandlik
       umuman qaralmasdi. Auditda ham balandlik invarianti yoʻq edi, shuning
       uchun buzilish jim oʻtib ketardi.

       Talab: massa bilan balandlik TENG HUQUQLI. Massa toʻlib balandlik
       toʻlmasa ham pochka yopiladi, balandlik toʻlib massa toʻlmasa ham. */
    function packH(q){
      return q.odd
        ? (q.items || []).reduce(function(a, x){ return a + (x.T || 0); }, 0)
        : ((q.base ? q.base.T : 0) +
           (q.layers || []).reduce(function(a, L){ return a + (L.h || 0); }, 0));
    }
    try {
      var svH = S.maxH, svKg = S.maxKg;

      S.maxH = 64; packAll();
      var over = PACKS.filter(function(q){ return packH(q) > S.maxH + 1e-6; });
      chk("balandlik chegarasi hamma pochkaga qoʻllandi", over.length === 0,
          over.slice(0, 5).map(function(q){
            return "P" + q.no + "=" + Math.round(packH(q)) + (q.odd ? " BOGʻ" : "");
          }).join(", ") || "toza");

      // BOGʻ ham chegarada — aynan shu buzilgan edi
      var bogs = PACKS.filter(function(q){ return q.odd; });
      var bogOver = bogs.filter(function(q){ return packH(q) > S.maxH + 1e-6; });
      chk("bogʻ ham balandlik chegarasida", bogOver.length === 0,
          bogs.length + " bogʻ, " + bogOver.length + " tasi oshgan");

      /* QAVAT SONI ham bogʻga qoʻllanadi. Bogʻ N ta detalning taxlami, yaʼni
         N qavat — roʻyxatda ham «N qavat» boʻlib koʻrinadi. Ilgari chegara
         faqat oddiy pochkaga qoʻllanardi va operator «chegara ishlamayapti»
         deb koʻrardi. */
      var svLay = S.maxLayers;
      S.maxLayers = 4; packAll();
      var nOver = PACKS.filter(function(q){
        return q.odd ? (q.items || []).length > S.maxLayers
                     : (q.layers.length + 1) > S.maxLayers;
      });
      chk("qavat soni chegarasi bogʻga ham qoʻllanadi", nOver.length === 0,
          nOver.slice(0, 4).map(function(q){
            return "P" + q.no + "=" + (q.odd ? q.items.length + " detal(bogʻ)"
                                             : (q.layers.length+1) + " qavat");
          }).join(", ") || "toza");
      var aQ = auditPacks(PACKS, buildItems());
      chk("qavat chegarasida audit toza", aQ.errors.length === 0,
          aQ.errors.map(function(e){ return e.code; }).join(",") || "toza");
      chk("qavat chegarasida detal yoʻqolmaydi",
          aQ.stats.itemsPlaced === aQ.stats.itemsExpected,
          aQ.stats.itemsPlaced + "/" + aQ.stats.itemsExpected);
      S.maxLayers = svLay; packAll();

      var aH = auditPacks(PACKS, buildItems());
      chk("balandlik chegarasida audit toza", aH.errors.length === 0,
          aH.errors.map(function(e){ return e.code; }).join(",") || "toza");
      chk("balandlik chegarasida detal yoʻqolmaydi",
          aH.stats.itemsPlaced === aH.stats.itemsExpected,
          aH.stats.itemsPlaced + "/" + aH.stats.itemsExpected);

      /* AUDIT BUZILISHNI KOʻRADIMI. Terilgan pochkalarni qoldirib chegarani
         pasaytiramiz — audit BALANDLIK xatosini berishi shart. Bu invariant
         boʻlmasa keyingi regressiya yana jim oʻtib ketadi. */
      S.maxH = 24;
      var aBad = auditPacks(PACKS, buildItems());
      var hErr = aBad.errors.filter(function(e){ return e.code === "BALANDLIK"; });
      chk("audit balandlik buzilishini koʻradi", hErr.length > 0,
          hErr.length + " ta BALANDLIK xatosi");

      /* IKKI CHEGARA MUSTAQIL.
         a) balandlik keng, massa tor  -> massa cheklaydi
         b) massa keng, balandlik tor  -> balandlik cheklaydi */
      /* Har pochkaning OʻZ massa chegarasi bor: bogʻ va nostandart oqimdan
         chiqqan pochka `oddKg` bilan oʻlchanadi, oddiy pochka `maxKg` +
         qoldiq zaxirasi bilan. `maxKg` ni 12 ga tushirganda 12 kg dan ogʻir
         DETALLAR nostandart oqimga oʻtadi va u yerda 40 kg limiti amal qiladi —
         shuning uchun bitta umumiy raqam bilan oʻlchash notoʻgʻri boʻlardi. */
      /* Chegara auditdagi qoida bilan BIR XIL hisoblanadi (05-audit.js `kgCap`):
         nostandart oqimdan chiqqan pochka `oddKg` bilan oʻlchanadi, va agar
         unga qoldiq singdirilgan boʻlsa (`overKg`) — ustiga zaxira qoʻshiladi.
         Ilgari bu yerda zaxira unutilgan edi va test soxta xato berardi. */
      function kgCapOf(q){
        var b = (q.odd || q.oddSrc) ? Math.max(S.maxKg, +S.oddKg || 0) : S.maxKg;
        return b + (q.overKg ? (+S.tailKgOver || 0) : 0);
      }
      S.maxH = 0; S.maxKg = 12; packAll();
      var kgBad = PACKS.filter(function(q){ return q.kg > kgCapOf(q) + 1e-6; });
      var hMaxA = Math.max.apply(null, PACKS.map(packH));
      chk("massa yolgʻiz oʻzi cheklaydi", kgBad.length === 0,
          kgBad.slice(0, 4).map(function(q){
            return "P" + q.no + " " + q.kg.toFixed(1) + ">" + kgCapOf(q);
          }).join(", ") || ("toza · eng baland " + Math.round(hMaxA) + " mm (cheklovsiz)"));

      S.maxKg = svKg; S.maxH = 48; packAll();
      var hMaxB = Math.max.apply(null, PACKS.map(packH));
      chk("balandlik yolgʻiz oʻzi cheklaydi", hMaxB <= S.maxH + 1e-6,
          "eng baland " + Math.round(hMaxB) + " mm");

      // ikkalasi birga
      S.maxKg = 20; S.maxH = 48; packAll();
      var bad2 = PACKS.filter(function(q){
        return q.kg > kgCapOf(q) + 1e-6 || packH(q) > S.maxH + 1e-6;
      });
      chk("ikkala chegara birga ishlaydi", bad2.length === 0,
          bad2.slice(0, 4).map(function(q){
            return "P" + q.no + " " + q.kg.toFixed(1) + "kg/" + Math.round(packH(q)) + "mm";
          }).join(", ") || "toza");

      // sozlama aylanmasi va tiklash
      S.maxKg = svKg; S.maxH = svH; writeConf(); packAll();
      chk("balandlik sinovidan keyin holat tiklandi", S.maxH === svH && S.maxKg === svKg,
          "maxH=" + S.maxH + " maxKg=" + S.maxKg);
    } catch(e){ chk("balandlik chegarasi", false, e.message); }

    /* ================= v20: CHEK OʻLCHAMI VA AVTOMATIK POCHKA CHEKI ================= */
    try {
      var svSz = S.labelSize, svW = S.labelW, svH = S.labelH, svAuto = S.autoLbl;

      // tayyor oʻlchamlar «EnixBo'yi» dan oʻqiladi
      S.labelSize = "80x60"; applyPageSize();
      var mm80 = labelMM();
      chk("80×60 oʻlchami tanildi", mm80 && mm80.w === 80 && mm80.h === 60,
          mm80 ? mm80.w + "×" + mm80.h : "yoʻq");
      var pst = document.getElementById("pageStyle");
      chk("@page 80×60 ga oʻrnatildi", pst.textContent.indexOf("80mm 60mm") > 0,
          pst.textContent);
      chk("chek rejimi sinfi qoʻyildi", el("sheet").className.indexOf("sz-lbl") === 0,
          el("sheet").className);

      // A4 — chek rejimi emas
      S.labelSize = "a4"; applyPageSize();
      chk("A4 da chek rejimi oʻchadi", labelMM() === null && el("sheet").className === "sz-a4",
          el("sheet").className);

      // QOʻLDA oʻlcham
      S.labelSize = "custom"; S.labelW = 95; S.labelH = 45; applyPageSize();
      var mmC = labelMM();
      chk("qoʻlda oʻlcham qoʻllandi", mmC && mmC.w === 95 && mmC.h === 45,
          mmC ? mmC.w + "×" + mmC.h : "yoʻq");
      chk("past chekda mayda shrift yoqildi", el("sheet").className.indexOf("tiny") > 0,
          el("sheet").className);
      // chegaradan tashqari qiymat qisiladi
      S.labelW = 5000; S.labelH = 1;
      var mmX = labelMM();
      chk("qoʻlda oʻlcham chegarada ushlanadi", mmX.w === 300 && mmX.h === 20,
          mmX.w + "×" + mmX.h);

      // sozlama aylanmasi
      S.labelW = 88; S.labelH = 62; writeConf();
      S.labelW = 0;  S.labelH = 0;  readConf();
      chk("qoʻlda oʻlcham saqlanadi", S.labelW === 88 && S.labelH === 62,
          S.labelW + "×" + S.labelH);

      /* POCHKA CHEKIDA DETALLAR ROʻYXATI. 80×60 da roʻyxat kesiladi va
         kesilgani YOZILADI — ishchi roʻyxat toʻliq emasligini bilishi kerak. */
      S.labelSize = "80x60"; S.labelW = 80; S.labelH = 60;
      var big = null;
      PACKS.forEach(function(q){ if (!big || q.seq.length > big.seq.length) big = q; });
      /* Roʻyxat elementlarini sanaymiz. Butun chek boʻyicha `<span>` sanash
         notoʻgʻri: sarlavhada ham bitta bor. Shuning uchun faqat `.pf` bloki. */
      function pfCount(html){
        var m = /class="pf">([\s\S]*?)<\/div>/.exec(html);
        return m ? (m[1].match(/<span[ >]/g) || []).length : -1;
      }
      var lh80 = packLabelHTML(big, "tq80");
      chk("chekda detallar roʻyxati bor", lh80.indexOf('class="pf"') > 0 &&
          lh80.indexOf(big.seq[0].it.code) > 0, big.seq.length + " detal");
      var shown = pfCount(lh80);
      chk("80×60 da roʻyxat 12 tadan oshmaydi", shown > 0 && shown <= 13,
          shown + " ta koʻrsatildi (12 detal + «+N ta»)");
      if (big.seq.length > 12)
        chk("kesilgani yozildi", lh80.indexOf('class="more"') > 0, "+N ta belgisi");

      // A4 da chegara yoʻq — hamma detal chiqadi
      S.labelSize = "a4";
      var lhA4 = packLabelHTML(big, "tqa4");
      var shownA4 = pfCount(lhA4);
      chk("A4 da roʻyxat kesilmaydi", shownA4 === big.seq.length,
          shownA4 + "/" + big.seq.length);

      /* AVTOMATIK CHEK: oxirgi detal qoʻyilganda chiqadi, tayyor pochkada
         qayta-qayta chiqmaydi. */
      /* Chop etishning oʻzi ASINXRON (setTimeout 60 ms — QR chizilib ulgursin),
         shuning uchun PRINTS ni darrov sanab boʻlmaydi. Sinxron va aynan muhim
         narsa — chek VARAQ QI yasalishi: uni oʻrab olib sanaymiz. */
      S.labelSize = "80x60"; S.autoLbl = true;
      selectPack(0);
      var p0 = PACKS[0], n0 = p0.seq.length;
      var BUILDS = 0, origSheet = packLabelSheet;
      packLabelSheet = function(q){ BUILDS++; return origSheet(q); };

      setStep(0); p0.done = 0;
      for (var ai = 0; ai < n0; ai++) advance();
      chk("pochka tugaganda chek oʻzi yasaldi", BUILDS === 1, BUILDS + " marta");
      chk("chek varagʻida pochka maʼlumoti bor",
          (el("sheet").innerHTML || "").indexOf("POCHKA P") > 0,
          (el("sheet").innerHTML || "").length + " belgi");
      advance(); advance();
      chk("tayyor pochkada chek qayta yasalmaydi", BUILDS === 1, BUILDS + " marta");

      // oʻchirilgan holatda chiqmaydi
      S.autoLbl = false;
      setStep(0); p0.done = 0; BUILDS = 0;
      for (var aj = 0; aj < n0; aj++) advance();
      chk("avtomatik chek oʻchirilsa yasalmaydi", BUILDS === 0, BUILDS + " marta");
      packLabelSheet = origSheet;

      S.labelSize = svSz; S.labelW = svW; S.labelH = svH; S.autoLbl = svAuto;
      setStep(0); p0.done = 0; writeConf(); renderPacks(); renderStep();
    } catch(e){ chk("chek oʻlchami va avtomatik chek", false, e.message); }

    /* ================= v20: BUYURTMA HUJJATI (A4, TOʻLIQ TARKIB) ================= */
    try {
      var svAuto2 = S.autoLbl; S.autoLbl = false;   // hujjat testida chek kerak emas

      // hamma pochka nolga qaytarilsa — TAYYOR EMAS
      PACKS.forEach(function(q){ q.done = 0; });
      var st0 = orderStatus();
      chk("yigʻilmagan buyurtma tayyor emas", st0.ready === false &&
          st0.leftParts === st0.parts,
          st0.donePacks + "/" + st0.packs + " pochka, " + st0.leftParts + " detal qoldi");

      // hujjat chop etilmaydi — varaq ham toʻldirilmaydi
      el("sheet").innerHTML = "";
      el("btnOrderDoc").click();
      chk("tayyor boʻlmasa hujjat chop etilmaydi",
          (el("sheet").innerHTML || "").indexOf("odoc") < 0,
          (el("sheet").innerHTML || "").length + " belgi");
      chk("nima qolgani yozildi",
          (el("orderDocNote").textContent || "").indexOf("TAYYOR EMAS") === 0,
          el("orderDocNote").textContent.slice(0, 60));

      // hujjat ichida yigʻilmaganlar boʻlimi bor
      var d0 = orderDocHTML();
      chk("hujjatda «yigʻilmagan» boʻlimi bor", d0.indexOf("Yigʻilmagan") > 0);

      // hammasini yigʻamiz
      PACKS.forEach(function(q){ q.done = q.seq.length; });
      var st1 = orderStatus();
      chk("hammasi yigʻilganda tayyor", st1.ready === true && st1.leftParts === 0,
          st1.donePacks + "/" + st1.packs);

      var doc = orderDocHTML();
      chk("hujjat yasaldi", doc.indexOf('class="odoc"') > 0 && doc.length > 2000,
          Math.round(doc.length / 1024) + " KB");
      chk("hujjatda buyurtma nomi bor", doc.indexOf(esc(P.name)) > 0, P.name);
      chk("hujjatda hamma pochka bor",
          PACKS.every(function(q){ return doc.indexOf("P" + pad2(q.no)) > 0; }),
          PACKS.length + " pochka");
      var everyPart = buildItems().every(function(it){ return doc.indexOf(esc(it.code)) > 0; });
      chk("hujjatda hamma detal kodi bor", everyPart, buildItems().length + " detal");
      chk("hujjatda furnitura izohi bor", doc.indexOf("Furnitura") > 0);
      chk("tayyor hujjatda «yigʻilmagan» boʻlimi yoʻq", doc.indexOf("Yigʻilmagan") < 0);
      chk("hujjatda imzo joyi bor", doc.indexOf("Topshirdi") > 0 && doc.indexOf("Qabul qildi") > 0);
      chk("hujjatda material kesimi bor", doc.indexOf("Material kesimi") > 0);

      // massa yigʻindisi pochkalarnikiga teng
      var kgSum = PACKS.reduce(function(a, q){ return a + q.kg; }, 0);
      chk("hujjatdagi netto pochkalar yigʻindisiga teng",
          doc.indexOf(kgSum.toFixed(1) + " kg") > 0, kgSum.toFixed(1) + " kg");

      // endi chop etiladi (varaq toʻladi; window.print() 60 ms dan keyin)
      el("sheet").innerHTML = "";
      el("btnOrderDoc").click();
      chk("tayyor buyurtmada hujjat varaqqa chiqdi",
          (el("sheet").innerHTML || "").indexOf("odoc") > 0,
          Math.round((el("sheet").innerHTML || "").length / 1024) + " KB");
      chk("hujjat A4 rejimida", (document.getElementById("pageStyle").textContent || "")
          .indexOf("size:A4") > 0, document.getElementById("pageStyle").textContent);

      PACKS.forEach(function(q){ q.done = 0; });
      S.autoLbl = svAuto2;
      el("sheet").innerHTML = "";
      renderPacks(); renderStep();
    } catch(e){ chk("buyurtma hujjati", false, e.message); }

    /* ================= v20: HAR SOZLAMA TIZIMGA BOGʻLANGANMI =================
       Sexdan kelgan savol: «Pochka maks. balandligi» ga 160 mm qoʻyilgan, tizim
       esa 12–14 qavat terib yuborgan. Balandlik mantigʻi toʻgʻri edi — maydon
       shunchaki packerga YETIB BORMASDI: `CONF_IDS` va onchange roʻyxatlari
       qoʻlda yozilgan edi va yangi meʼyorlar ularga qoʻshilmay qolgandi.
       46 maydondan 21 tasi saqlanmasdi, 30 dan ortigʻi qayta hisobni
       chaqirmasdi — sozlama interfeysda YOZUV boʻlib turardi.

       Bu blok aynan shuni qoʻriqlaydi. Yangi maydon qoʻshilib, u readConf() ga
       ulanmasa yoki bogʻlanmasa — test yiqiladi. */
    try {
      var confEls = [];
      var cbox = el("v-conf");
      Array.prototype.forEach.call(cbox.querySelectorAll("input,select"), function(e){
        if (!e.id) return;
        if (e.type === "file" || e.type === "button" || e.type === "submit") return;
        confEls.push(e);
      });
      chk("sozlamalar boʻlimida maydonlar topildi", confEls.length > 30,
          confEls.length + " ta maydon");

      // 1) hammasi roʻyxatda
      var miss = confEls.filter(function(e){ return CONF_IDS.indexOf(e.id) < 0; })
                        .map(function(e){ return e.id; });
      chk("har maydon saqlanadigan roʻyxatda", miss.length === 0,
          miss.join(",") || CONF_IDS.length + " ta id");

      // 2) hammasida ishlovchi bor
      var noH = confEls.filter(function(e){ return typeof e.onchange !== "function"; })
                       .map(function(e){ return e.id; });
      chk("har maydon oʻzgarishga bogʻlangan", noH.length === 0, noH.join(",") || "hammasi");

      /* 3) ENG MUHIMI: maydon readConf() ga haqiqatan ulanganmi.
         Qiymat oʻzgartiriladi, readConf() chaqiriladi va S da BIRON narsa
         oʻzgarishi tekshiriladi. Maydon HTML da bor, lekin readConf unga
         qaramasa — aynan shu yerda ushlanadi. */
      /* DIQQAT: `fixNumberInputs()` (10-ui.js) ishga tushishda hamma
         input[type=number] ni type="text" ga oʻgiradi (uz-UZ lokalida vergul
         muammosi uchun) va ularga `data-num="1"` qoʻyadi. Shuning uchun bu yerda
         `e.type === "number"` ga qarash MUMKIN EMAS — raqamli maydon matn
         boʻlib koʻrinadi va sinov «ulanmagan» deb yolgʻon xato berardi.
         Chegaralar ham xossadan emas, ATRIBUTdan oʻqiladi. */
      function isNum(e){
        return e.type === "number" || e.getAttribute("data-num") === "1";
      }
      function attrN(e, k, dflt){
        var v = e.getAttribute(k);
        return (v == null || v === "") ? dflt : parseFloat(v);
      }
      function bump(e){
        if (e.type === "checkbox"){ e.checked = !e.checked; return true; }
        if (e.tagName === "SELECT"){
          for (var i = 0; i < e.options.length; i++)
            if (e.options[i].value !== e.value){ e.value = e.options[i].value; return true; }
          return false;
        }
        if (isNum(e)){
          var v  = parseFloat(e.value) || 0;
          var st = attrN(e, "step", 1) || 1;
          var lo = attrN(e, "min", -1e9);
          var hi = attrN(e, "max",  1e9);
          var nv = v + st;
          if (nv > hi) nv = v - st;
          if (nv < lo) nv = lo;
          if (nv === v) return false;
          e.value = String(nv); return true;
        }
        e.value = String(e.value) + "X"; return true;
      }
      var deaf = [], skipped = [];
      confEls.forEach(function(e){
        var was = (e.type === "checkbox") ? e.checked : e.value;
        var before = JSON.stringify(S);
        if (!bump(e)){ skipped.push(e.id); return; }
        readConf();
        if (JSON.stringify(S) === before) deaf.push(e.id);
        if (e.type === "checkbox") e.checked = was; else e.value = was;
        readConf();
      });
      chk("har maydon readConf() ga ulangan", deaf.length === 0,
          deaf.join(",") || (confEls.length - skipped.length) + " ta maydon tekshirildi");

      /* 4) SAQLANADI VA TIKLANADI. Har maydon oʻzgartiriladi, saqlanadi,
         buziladi va tiklanadi — qiymat qaytishi shart. */
      var svVals = {};
      confEls.forEach(function(e){ svVals[e.id] = (e.type === "checkbox") ? e.checked : e.value; });
      var want = {};
      confEls.forEach(function(e){
        if (bump(e)) want[e.id] = (e.type === "checkbox") ? e.checked : e.value;
      });
      saveConf();
      confEls.forEach(function(e){
        if (e.type === "checkbox") e.checked = !e.checked;
        else if (isNum(e)) e.value = "1";
      });
      restoreConf();
      var lost = Object.keys(want).filter(function(id){
        var e = el(id);
        var now = (e.type === "checkbox") ? e.checked : e.value;
        return String(now) !== String(want[id]);
      });
      chk("har maydon saqlanadi va tiklanadi", lost.length === 0,
          lost.join(",") || Object.keys(want).length + " ta maydon");

      // holatni tiklaymiz
      confEls.forEach(function(e){
        if (e.type === "checkbox") e.checked = svVals[e.id]; else e.value = svVals[e.id];
      });
      readConf(); saveConf();

      /* 5) SEXDAN KELGAN AYNAN SHU HOLAT: balandlik maydoni packerga yetadimi. */
      var hEl = el("cMaxH"), svHv = hEl.value;
      hEl.value = "160"; readConf();
      chk("balandlik maydoni S ga yetadi", S.maxH === 160, "S.maxH=" + S.maxH);
      packAll();
      var tall = PACKS.filter(function(q){ return packH(q) > 160 + 1e-6; });
      chk("160 mm qoʻyilganda hech bir pochka oshmaydi", tall.length === 0,
          tall.slice(0, 4).map(function(q){
            return "P" + q.no + "=" + Math.round(packH(q));
          }).join(", ") || "toza");
      var lay16 = PACKS.filter(function(q){
        return !q.odd && q.t === 16 && (q.layers.length + 1) > 10;
      });
      chk("16 mm da 10 qavatdan oshmaydi", lay16.length === 0,
          lay16.slice(0, 4).map(function(q){
            return "P" + q.no + "=" + (q.layers.length + 1) + " qavat";
          }).join(", ") || "toza");
      hEl.value = svHv; readConf(); packAll();
    } catch(e){ chk("sozlamalarning bogʻlanishi", false, e.message); }

    /* ================= v20: SOZLAMALAR OQIM BOʻYICHA AJRATILDI =================
       Sozlamalar ekrani uch blokka boʻlindi: STANDART / NOSTANDART / IKKALASIGA.
       Bu shunchaki bezak emas — 35 kg bilan 40 kg, 2100 mm bilan 3200 mm bir
       roʻyxatda turganda boshqaruvchi qaysi raqam qaysi oqimniki ekanini
       koʻrmasdi. Test blok tuzilishi buzilmasligini va HAR maydonda podskaska
       borligini qoʻriqlaydi (yangi maydon podskaskasiz qoʻshilib qolmasin). */
    try {
      var cv = document.getElementById("v-conf");
      var blkStd = cv.querySelector(".blk.blk-std");
      var blkNst = cv.querySelector(".blk.blk-nst");
      var blkAll = cv.querySelector(".blk.blk-all");
      chk("sozlamalar uch blokka ajratilgan", !!(blkStd && blkNst && blkAll),
          (blkStd?"std ":"")+(blkNst?"nst ":"")+(blkAll?"all":"") || "blok yoʻq");

      /* Oqim maydonlari oʻz blokida turishi — nostandart limit standart blokka
         tushib qolsa foydalanuvchi yana adashadi. */
      function inBlk(blk, id){ return !!(blk && blk.querySelector("#" + id)); }
      var stdIds = ["cMaxKg","cMaxLen","cBaseWMax","cMinPartW","cMinPartL",
                    "cMinBase","cBaseLMin","cBaseT","cBaseCover","cBaseInset",
                    "cMaxH","cOvhOn"];
      var nstIds = ["cOddKg","cOddLMax","cOddWMax","cOddTol"];
      var allIds = ["cOneMan","cTare","cMaxPartT","cThick","cTailOver","cTailGap"];
      var xStd = stdIds.filter(function(i){ return !inBlk(blkStd, i); });
      var xNst = nstIds.filter(function(i){ return !inBlk(blkNst, i); });
      var xAll = allIds.filter(function(i){ return !inBlk(blkAll, i); });
      chk("standart maydonlari standart blokda", xStd.length === 0, xStd.join(",") || "hammasi");
      chk("nostandart maydonlari nostandart blokda", xNst.length === 0, xNst.join(",") || "hammasi");
      chk("umumiy maydonlari umumiy blokda", xAll.length === 0, xAll.join(",") || "hammasi");

      // nostandart limit standart blokka sizib oʻtmasin va aksincha
      var leak = nstIds.filter(function(i){ return inBlk(blkStd, i); })
                 .concat(stdIds.filter(function(i){ return inBlk(blkNst, i); }));
      chk("oqim maydonlari aralashmagan", leak.length === 0, leak.join(",") || "toza");

      /* Har maydonda podskaska: nima qilishi va oʻzgartirsa nima boʻlishi.
         Qisqa matn podskaska emas — kamida 40 belgi talab qilamiz. */
      var noTip = [], shortTip = [];
      stdIds.concat(nstIds, allIds).forEach(function(id){
        var el = cv.querySelector("#" + id);
        if (!el) return;
        var f = el.closest(".f");
        var q = f && f.querySelector(".q[data-tip]");
        if (!q) { noTip.push(id); return; }
        if ((q.getAttribute("data-tip") || "").length < 40) shortTip.push(id);
      });
      chk("har sozlamada podskaska bor", noTip.length === 0, noTip.join(",") || "hammasida");
      chk("podskaska mazmunli (≥40 belgi)", shortTip.length === 0, shortTip.join(",") || "hammasi");

      // qalinlik matritsasi konteyneri koʻchishda yoʻqolmasin
      chk("qalinlik matritsasi joyida", !!cv.querySelector("#thickMix"), "thickMix");

      // ajratishdan keyin ham sozlamalar oʻqiladi
      var svM = S.maxKg, svO = S.oddKg;
      S.maxKg = 33; S.oddKg = 41; writeConf();
      S.maxKg = 0;  S.oddKg = 0;  readConf();
      chk("ajratishdan keyin sozlama aylanmasi ishlaydi", S.maxKg === 33 && S.oddKg === 41,
          "maxKg=" + S.maxKg + " oddKg=" + S.oddKg);
      S.maxKg = svM; S.oddKg = svO; writeConf(); packAll();
    } catch(e){ chk("sozlamalar oqim boʻyicha ajratilishi", false, e.message); }

    /* ================= v14: SOZLAMA AYLANMASI ================= */
    try {
      var svAll = { baseWMax:S.baseWMax, baseLMin:S.baseLMin, baseCover:S.baseCover,
                    baseInset:S.baseInset, maxH:S.maxH, lidBal:S.lidBal,
                    oddKg:S.oddKg, oddLMax:S.oddLMax, oddWMax:S.oddWMax, oddTol:S.oddTol };
      S.baseWMax=1234; S.baseLMin=321; S.baseCover=87; S.baseInset=33; S.maxH=555;
      S.lidBal=66; S.oddKg=44; S.oddLMax=2900; S.oddWMax=1500; S.oddTol=250;
      writeConf();
      S.baseWMax=0; S.baseLMin=0; S.baseCover=0; S.baseInset=0; S.maxH=0;
      S.lidBal=0; S.oddKg=0; S.oddLMax=0; S.oddWMax=0; S.oddTol=0;
      readConf();
      var rt = (S.baseWMax===1234 && S.baseLMin===321 && S.baseCover===87 && S.baseInset===33 &&
                S.maxH===555 && S.lidBal===66 && S.oddKg===44 && S.oddLMax===2900 &&
                S.oddWMax===1500 && S.oddTol===250);
      chk("v14 sozlamalari yozildi va qayta oʻqildi", rt,
          JSON.stringify({wmax:S.baseWMax,lmin:S.baseLMin,cov:S.baseCover,ins:S.baseInset,
                          h:S.maxH,bal:S.lidBal,okg:S.oddKg}));
      S.baseLMin = 0; S.maxH = 0; writeConf(); readConf();
      chk("nol qiymat saqlanadi (cheklovsiz)", S.baseLMin === 0 && S.maxH === 0,
          "baseLMin=" + S.baseLMin + " maxH=" + S.maxH);
      Object.keys(svAll).forEach(function(k){ S[k] = svAll[k]; });
      writeConf(); packAll();
    } catch(e){ chk("v14 sozlama aylanmasi", false, e.message); }

    /* v13: QUYRUQ — guruh oxirida qoladigan yengil pochka boshqa pochka USTIGA
       singdiriladi (04-packer 3.6.7.1). Nima tekshiriladi: quyruq haqiqatan
       ishlayaptimi, u HAR DOIM eng tepada turadimi, limitlarni buzmaydimi va
       auditga toʻgʻri koʻrinadimi. */
    try {
      var tBase = PACKS.length;
      var tails = [], tPacks = [];
      PACKS.forEach(function(p){
        if (p.odd) return;
        var has = false;
        p.layers.forEach(function(L){ if (L.tail){ tails.push(L); has = true; } });
        if (has) tPacks.push(p);
      });
      chk("quyruq qavatlar yaratildi", tails.length > 0, tails.length + " qavat / " +
          tPacks.length + " pochka");

      /* 1) v15: quyruq TOMGA TEGMAYDI. Ikki holat qonuniy:
            - nishonning tomi yopiq edi → quyruq qopqoq OSTIGA suqilgan,
              demak eng ustki qavat quyruq EMAS va u TOM shartidan oʻtadi;
            - nishonning tomi ochiq edi → quyruq eng ustga tushgan, lekin
              oʻzi TOM shartidan oʻtgan boʻlishi shart.
         Ikkalasida ham yakuniy invariant bitta: pochkaning eng ustki qavati
         TOM shartidan oʻtadi. */
      /* v16: quyruq ENG USTKI QAVAT OSTIGA suqiladi, demak u tomga umuman
         tegmaydi — yopiq tom yopiq qoladi, ochiq tom ham oʻz holicha qoladi.
         Yagona istisno: nishonda qavat boʻlmasa (yolgʻiz tag), quyruq oʻzi
         tom boʻlib qoladi — unda TOM shartidan oʻtishi shart.
         Invariant shu: quyruq eng ustda TURSA, u tom shartidan oʻtgan boʻladi. */
      var tOpen = [];
      tPacks.forEach(function(p){
        var top = p.layers[p.layers.length - 1];
        if (top.tail && !tomOK(top, p.base, p.off))
          tOpen.push("P" + p.no + " " + Math.round(top.fill*100) + "%");
      });
      chk("quyruq tomni yomonlashtirmaydi", tOpen.length === 0, tOpen.join(",") || "toza");
      var tUnder = tPacks.filter(function(p){
        return !p.layers[p.layers.length - 1].tail;
      }).length;
      chk("quyruq qopqoq ostiga tushadi", tUnder > 0,
          tUnder + " / " + tPacks.length + " pochkada quyruq ust qavat emas");

      // 2) limitlar: massa va qavat soni
      var tLim = [];
      tPacks.forEach(function(p){
        // v14: nostandart oqim pochkasida limit boshqa (packKgCap)
        if (p.kg > packKgCap(p) + 0.001) tLim.push("P" + p.no + " " + p.kg.toFixed(1) + "kg");
        if (S.maxLayers > 0 && p.layers.length + 1 > S.maxLayers)
          tLim.push("P" + p.no + " " + (p.layers.length + 1) + "q");
      });
      chk("quyruqli pochka limitlarni buzmaydi", tLim.length === 0, tLim.join(",") || "toza");

      /* v20: QUYRUQ USTIDAGI QAVAT TAYANCHSIZ OʻTMASIN.
         Quyruq `minFill` dan ozod, lekin foiz notoʻgʻri oʻlchov: 4 ta tor
         detal butun chuqurlik boʻylab tarqalsa 44 % beradi va qopqoq bemalol
         tayanadi; oʻsha 44 % ikkita keng detal boʻlsa qopqoq 681 mm boʻshliq
         ustidan oʻtadi. Chegara shuning uchun MILLIMETRDA. */
      function gapOf(L, base){
        function axis(lo, hi, span){
          var iv = L.items.map(function(q){ return [lo(q), hi(q)]; })
                          .sort(function(a,b){ return a[0]-b[0]; });
          var g = 0, cur = 0;
          iv.forEach(function(r){
            if (r[0] > cur) g = Math.max(g, r[0]-cur);
            if (r[1] > cur) cur = r[1];
          });
          if (span > cur) g = Math.max(g, span-cur);
          return g;
        }
        return Math.max(
          axis(function(q){ return q.x; }, function(q){ return q.x+q.a; }, base.L),
          axis(function(q){ return q.y; }, function(q){ return q.y+q.b; }, base.W));
      }
      var gBad = [], gMax = 0;
      tPacks.forEach(function(p){
        p.layers.forEach(function(L){
          if (!L.tail) return;
          var g = gapOf(L, p.base);
          if (g > gMax) gMax = g;
          if (S.tailGap && g > S.tailGap + 0.5) gBad.push("P" + p.no + " " + Math.round(g) + "mm");
        });
      });
      chk("quyruqda boʻshliq chegarada", gBad.length === 0,
          gBad.join(",") || ("eng kattasi " + Math.round(gMax) + " mm · chegara " + S.tailGap + " mm"));

      // chegarani qisqartirsak boʻshliq ham qisqarishi kerak
      var svG = S.tailGap;
      S.tailGap = 200; packAll();
      var g200 = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        p.layers.forEach(function(L){ if (L.tail) g200 = Math.max(g200, gapOf(L, p.base)); });
      });
      chk("chegara qisqarsa boʻshliq ham qisqaradi", g200 <= 200.5,
          "tailGap=200 → eng kattasi " + Math.round(g200) + " mm");
      S.tailGap = svG; packAll();

      // 3) quyruq detallari konvertdan chiqmaydi
      var tOut = 0;
      tPacks.forEach(function(p){
        var off = p.off || 0;
        p.layers.forEach(function(L){
          if (!L.tail) return;
          L.items.forEach(function(q){
            if (q.x < -off - 0.5 || q.y < -off - 0.5 ||
                q.x + q.a > p.base.L + off + 0.5 || q.y + q.b > p.base.W + off + 0.5) tOut++;
          });
        });
      });
      chk("quyruq konvert ichida qoladi", tOut === 0, tOut + " ta chiqib ketgan detal");

      // 4) qadamda quyruq roli koʻrinadi — ishchi uni «qopqoq» deb oʻqib qolmasin
      var tRole = 0, tUst = 0;
      tPacks.forEach(function(p){
        p.seq.forEach(function(st){ if (st.role === "quyruq") tRole++; if (st.role === "ust") tUst++; });
      });
      chk("quyruq qadam roli belgilandi", tRole > 0, tRole + " qadam");
      // v15: quyruq qopqoq ostiga tushgani uchun «ust» roli SAQLANADI
      chk("quyruqli pochkada qopqoq roli bor", tUst > 0, tUst + " ta «ust» qadam");

      // 5) audit quyruqqa TOLDIRISH bermaydi (ustida hech narsa yoʻq — egilmaydi)
      var tAud = auditPacks(PACKS, buildItems());
      chk("quyruqqa TOLDIRISH ogohlantirishi yoʻq",
          tAud.warnings.filter(function(w){ return w.code === "TOLDIRISH"; }).length === 0,
          tAud.warnings.map(function(w){ return w.code; }).join(",") || "ogoh yoʻq");
      chk("quyruqdan keyin audit toza", tAud.errors.length === 0,
          tAud.errors.map(function(e){ return e.code; }).join(","));

      // 6) xususiyat oʻchirilsa — pochka soni oshadi (quyruq haqiqatan foyda beryapti)
      var tSave = TAIL_LAYERS;
      TAIL_LAYERS = 0;
      packAll();
      var tOff = PACKS.length;
      var tOffAud = auditPacks(PACKS, buildItems());
      TAIL_LAYERS = tSave;
      packAll();
      chk("quyruq pochka sonini kamaytiradi", PACKS.length < tOff,
          tOff + " -> " + PACKS.length + " pochka");
      chk("quyruqsiz ham audit toza", tOffAud.errors.length === 0,
          tOffAud.errors.map(function(e){ return e.code; }).join(","));
      chk("quyruq holati tiklandi", PACKS.length === tBase, PACKS.length + " pochka");
    } catch(e){ chk("quyruq", false, e.message); }

    /* v13: QUYRUQLI POCHKANI QOʻLDA TAHRIRLASH. `refreshPack()` pochkani
       `minFill` qoidasi bilan qaytadan teradi — quyruq qavati bu shartdan
       oʻtmaydi, demak qayta terishda albatta «ortiqcha» boʻlib qoladi. Ilgari
       ortiqcha detallar `np.left` ga tushib POCHKADAN CHIQIB KETARDI va hech kim
       buni ushlamasdi. Endi qayta terish ATOMIK: hammasi joylashsa yangilanadi,
       aks holda pochka tegilmagan qoladi. Invariant: hech qanday qoʻlda amal
       detalni buyurtmadan yoʻqotmaydi. */
    try {
      function allUids(){
        var m = {};
        PACKS.forEach(function(p){
          if (p.odd) (p.items||[]).forEach(function(it){ m[it.uid] = 1; });
          else { m[p.base.uid] = 1; p.layers.forEach(function(L){
            L.items.forEach(function(q){ m[q.it.uid] = 1; }); }); }
        });
        return Object.keys(m).length;
      }
      var rBefore = allUids();
      /* Eng xavfli holat — quyruqli pochkaga YANGI detal qoʻshish: nishon
         `minFill` bilan qayta teriladi va quyruq albatta ortiqcha boʻlib qoladi.
         Shuning uchun NISHON quyruqli, MANBA esa shu guruhdagi boshqa pochka. */
      var rDst = -1, rIdx = -1, rUid = null;
      PACKS.forEach(function(p, i){
        if (p.odd || rDst >= 0) return;
        if (!p.layers.some(function(L){ return L.tail; })) return;
        for (var k = 0; k < PACKS.length; k++)
          if (k !== i && !PACKS[k].odd && PACKS[k].key === p.key && PACKS[k].layers.length){
            rDst = i; rIdx = k; break;
          }
      });
      if (rIdx >= 0) PACKS[rIdx].layers.forEach(function(L){
        L.items.forEach(function(q){ if (!rUid) rUid = q.it.uid; }); });
      chk("quyruqli nishon va manba topildi", rDst >= 0 && rIdx >= 0 && rUid,
          rDst >= 0 ? "P" + PACKS[rIdx].no + " -> P" + PACKS[rDst].no + " (quyruqli)" : "topilmadi");
      var rRes = (rDst >= 0 && rUid) ? moveDetail(rIdx, rUid, rDst) : "nishon yoʻq";
      chk("quyruqli pochkaga koʻchirishda detal yoʻqolmadi", allUids() === rBefore,
          rBefore + " -> " + allUids() + " (javob: " + String(rRes) + ")");
      // rad etilgan boʻlsa — nishon TEGILMAGAN qolishi shart (atomiklik)
      var rStill = (rDst >= 0) && PACKS[rDst].layers.some(function(L){ return L.tail; });
      if (rDst < 0) rStill = true;      // quyruqli nishon topilmasa tekshirish maʼnosiz
      chk("rad etilganda quyruq joyida qoldi",
          typeof rRes !== "string" || rStill, rStill ? "quyruq saqlandi" : "quyruq yoʻqoldi");
      // endi quyruqli pochkaning OʻZIDAN koʻchirib koʻramiz
      var rUid2 = null;
      if (rDst >= 0) PACKS[rDst].layers.forEach(function(L){
        L.items.forEach(function(q){ if (!rUid2) rUid2 = q.it.uid; }); });
      var rAud = auditPacks(PACKS, buildItems());
      chk("koʻchirishdan keyin YOQOLGAN yoʻq",
          rAud.errors.filter(function(e){ return e.code === "YOQOLGAN"; }).length === 0,
          rAud.errors.map(function(e){ return e.code; }).join(",") || "toza");
      // «yangi pochka» yoʻli ham xuddi shunday himoyalangan boʻlishi kerak
      var rRes2 = (rDst >= 0 && rUid2) ? moveDetail(rDst, rUid2, "new") : "yoʻq";
      chk("«yangi pochka» yoʻlida ham detal yoʻqolmadi", allUids() === rBefore,
          rBefore + " -> " + allUids() + " (javob: " + String(rRes2) + ")");
      packAll();
      chk("tahrirlash sinovidan keyin holat tiklandi", allUids() === rBefore,
          PACKS.length + " pochka · " + allUids() + " detal");
    } catch(e){ chk("quyruqli pochkani tahrirlash", false, e.message); }

    /* v13: YENGIL ogohlantirishi guruhga qaraydi. Guruhning OʻZIDA bir pochkalik
       massa boʻlmasa (3 mm orqa devorlar butun modulda 15 kg) — bu kamchilik emas,
       shuning uchun ogohlantirish chiqmasligi kerak. */
    try {
      var yA = auditPacks(PACKS, buildItems());
      var yKg = {};
      PACKS.forEach(function(p){ if (!p.odd) yKg[p.key || "*"] = (yKg[p.key || "*"] || 0) + p.kg; });
      var yWarn = {};
      yA.warnings.forEach(function(w){ if (w.code === "YENGIL") yWarn[w.pack] = 1; });
      var ySmall = null, yBad = 0;
      PACKS.forEach(function(p, i){
        if (p.odd) return;
        var lab = "P" + (p.no < 10 ? "0" : "") + p.no;
        var kichik = yKg[p.key || "*"] <= S.maxKg + 0.001;
        if (kichik && p.kg < S.maxKg * 0.5){
          if (!ySmall) ySmall = lab + " · guruh " + yKg[p.key || "*"].toFixed(1) + " kg";
          if (yWarn[lab]) yBad++;
        }
      });
      chk("kichik guruhda yengil pochka bor", !!ySmall, ySmall || "topilmadi");
      chk("kichik guruh YENGIL deb ogohlantirilmaydi", yBad === 0, yBad + " ta ortiqcha ogoh");
      // teskarisi: zaxirasi bor guruhdagi yengil pochka baribir ogohlantiriladi
      var yBig = 0;
      PACKS.forEach(function(p){
        if (p.odd) return;
        var lab = "P" + (p.no < 10 ? "0" : "") + p.no;
        if (yKg[p.key || "*"] > S.maxKg && p.kg < S.maxKg * 0.5 && yWarn[lab]) yBig++;
      });
      chk("katta guruhdagi yengil pochka ogohlantiriladi", yBig > 0, yBig + " ta");
    } catch(e){ chk("YENGIL guruh mantigʻi", false, e.message); }

    /* v13: seansda key/room/tail saqlanadi. Ilgari key saqlanmasdi va shu sabab
       brauzer yangilangach moveDetail dagi GURUH himoyasi jimgina ishlamay qolardi. */
    try {
      var kSnap = JSON.parse(JSON.stringify(makeSnapshot()));
      var kTail = 0; PACKS.forEach(function(p){ if(!p.odd) p.layers.forEach(function(L){ if(L.tail) kTail++; }); });
      var kKey  = PACKS.filter(function(p){ return !p.odd && p.key; }).length;
      restoreSnapshot(kSnap);
      var kTail2 = 0; PACKS.forEach(function(p){ if(!p.odd) p.layers.forEach(function(L){ if(L.tail) kTail2++; }); });
      var kKey2  = PACKS.filter(function(p){ return !p.odd && p.key; }).length;
      chk("seans: quyruq bayrogʻi saqlandi", kTail2 === kTail && kTail > 0, kTail + " -> " + kTail2);
      chk("seans: guruh kaliti saqlandi", kKey2 === kKey && kKey > 0, kKey + " -> " + kKey2);
      /* Tiklangandan keyin ham guruh himoyasi ishlashi shart. Nishon AYNAN
         qalinligi bir xil, lekin guruhi boshqa pochka boʻlishi kerak — aks holda
         rad javobi qalinlik himoyasidan kelib, kalit tekshirilganini isbotlamaydi. */
      var ka = -1, kb = -1;
      for (var ki = 0; ki < PACKS.length; ki++){
        if (PACKS[ki].odd || !PACKS[ki].layers.length) continue;
        if (ka < 0){ ka = ki; continue; }
        if (PACKS[ki].key !== PACKS[ka].key && PACKS[ki].t === PACKS[ka].t){ kb = ki; break; }
      }
      var kUid = null;
      if (ka >= 0) PACKS[ka].layers.forEach(function(L){
        L.items.forEach(function(q){ if (!kUid) kUid = q.it.uid; }); });
      var kRes = (ka >= 0 && kb >= 0 && kUid) ? moveDetail(ka, kUid, kb) : null;
      chk("seansdan keyin guruh himoyasi ishlaydi",
          typeof kRes === "string" && kRes.indexOf("qalinlik") < 0 && kRes.length > 5,
          String(kRes));
      packAll();
    } catch(e){ chk("seans: key/tail", false, e.message); }

    /* v12: MODUL BELGISI — sozlama emas, faylning xossasi.
       Qoida: kod prefiksi tuzilishdan koʻproq birlik bersa — prefiks, aks holda
       good kodi. Namunada 4 good ↔ 4 prefiks, demak good tanlanadi. Haqiqiy
       «komplekt-5modul» da esa 1 good ↔ 5 prefiks — u yerda prefiks. */
    try {
      var origCodes = P.parts.map(function(p){ return p.c; });
      var origSrc = P.unitSrc;
      var srcBase = PACKS.length;      // asos: qatʼiy son emas, joriy natija

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
      chk("kodlar tiklandi — eski holat", PACKS.length === srcBase,
          PACKS.length + " vs " + srcBase + " pochka");
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
      // v13: quyruq singdirishdan keyin ikki modulni qoʻshish namunada sonni
      // kamaytirmasligi mumkin — talab «yomonlashmasin» (yuqoridagi izohga qarang)
      chk("xona «birga»: natija yomonlashmaydi", PACKS.length <= xBase + 1,
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
      chk("eng katta pochka birinchi stelyajda", /^A/.test(SORT.pack[big.no] || ""),
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
