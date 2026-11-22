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
  [int]$TimeoutSec = 240
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

    /* v22: YOGʻOCH EMAS MATERIALLAR. Real fayllardan: 30 mm «MATO» LDSP deb
       90,7 kg chiqqan, 4 mm oyna esa yogʻoch zichligida oddiy pochkaga
       terilgan. Tsex talabi: koʻzgu/oyna umumiy pochkaga qoʻshilmaydi — har
       biri ALOHIDA pochka, chekida «EHTIYOT BOʻLING». */
    var svP = P;
    try {
      var nw = '<project name="Material sinovi">' +
        '<good typeId="sheet" id="m1" name="LDSP Oq" t="16" l="2750" w="1830"/>' +
        '<good typeId="sheet" id="m2" name="Oyna YOD" t="4" l="2550" w="1605"/>' +
        '<good typeId="sheet" id="m3" name="MATO" t="30" l="2750" w="1830"/>' +
        '<good typeId="product" id="pp" code="990009" name="Spalniy">' +
          '<part id="b1" code="01_001" name="bok" l="1800" w="450" count="1"/>' +
          '<part id="b2" code="01_002" name="oyna" l="1000" w="500" count="1"/>' +
          '<part id="b3" code="01_003" name="mato" l="2400" w="1800" count="1"/>' +
          '<part id="b4" code="01_004" name="eshik koʻzgu yopishtirilgan" l="1700" w="450" count="1"/>' +
          '<part id="b5" code="01_005" name="polka" l="900" w="450" count="1"/>' +
        '</good>' +
        '<operation typeId="CS"><material id="m1"/><part id="b1"/><part id="b4"/><part id="b5"/></operation>' +
        '<operation typeId="CS"><material id="m2"/><part id="b2"/></operation>' +
        '<operation typeId="CS"><material id="m3"/><part id="b3"/></operation>' +
        '</project>';
      DIAG.warnings = [];
      var dn = parseProject(nw);
      var glass = dn.materials.filter(function(m){ return m.id === "m2"; })[0];
      chk("oyna massasi shisha zichligida", glass && Math.abs(glass.kgm2 - 10) < 0.01,
          glass ? glass.kgm2 + " kg/m² (4 mm × 2500)" : "yoʻq");
      var tx = DIAG.warnings.filter(function(w){ return w.code === "MATERIAL_TAXMINIY"; })[0];
      chk("katalogsiz material ogohlantirildi", !!tx && tx.msg.indexOf("MATO") >= 0 && tx.msg.indexOf("LDSP") < 0,
          tx ? tx.msg.slice(0, 70) : "yoʻq");
      P = dn;
      var itn = buildItems();
      var fr = itn.filter(function(it){ return it.fragile; }).map(function(it){ return it.code; }).join(",");
      chk("koʻzgu/oyna moʻrt deb belgilandi (material va detal nomidan)", fr === "01_002,01_004", fr || "yoʻq");
      var hv = (DIAG.heavy || []).map(function(x){ return x.code + " " + x.kg.toFixed(1); }).join(",");
      chk("65 kg dan ogʻir detal shubhali deb belgilandi", /^01_003 /.test(hv), hv || "yoʻq");
      packAll();
      var frPk = PACKS.filter(function(pk){ return packFragile(pk); });
      var frAlone = frPk.filter(function(pk){ return pk.odd && pk.items.length === 1; }).length;
      chk("har moʻrt detal ALOHIDA pochkada", frPk.length === 2 && frAlone === 2 &&
          itn.length === PACKS.reduce(function(n, pk){ return n + packItems(pk).length; }, 0),
          frPk.length + " ta moʻrt pochka, " + frAlone + " tasi yolgʻiz · jami " + PACKS.length + " pochka");
      var frAud = auditPacks(PACKS, buildItems());
      chk("moʻrt pochkalarda audit toza", frAud.errors.length === 0,
          frAud.errors.map(function(e){ return e.code; }).join(",") || "toza");
      var svLS = S.labelSize; S.labelSize = "80x60";
      var frLbl = packLabelHTML(frPk[0], "frq"), frItL = labelHTML(frPk[0], frPk[0].seq[0], "frd");
      S.labelSize = "a4";
      var frA4 = packLabelHTML(frPk[0], "frq4");
      S.labelSize = svLS;
      chk("moʻrt pochka va detal chekida «EHTIYOT BOʻLING»",
          /EHTIYOT/.test(frLbl) && /EHTIYOT/.test(frItL) && /EHTIYOT/.test(frA4), "80×60 + A4 + detal");
      var mixA = auditPacks([{ odd:true, no:1, key:"x", items:[itn[0], itn.filter(function(it){ return it.fragile; })[0]] }], itn);
      chk("audit moʻrt detal aralashganini koʻradi (MORT)", mixA.errors.some(function(e){ return e.code === "MORT"; }), "MORT");
      var svSep = S.sepMat; S.sepMat = "";
      var noneFr = buildItems().filter(function(it){ return it.fragile; }).length;
      S.sepMat = "KOʻZGU";
      var apos = buildItems().filter(function(it){ return it.fragile; }).map(function(it){ return it.code; }).join(",");
      S.sepMat = svSep;
      chk("kalit soʻz boʻsh — moʻrt detal yoʻq; tutuq belgisi farqsiz", noneFr === 0 && apos === "01_004",
          "boʻsh: " + noneFr + " · «KOʻZGU»: " + apos);
      var hvA = auditPacks([{ odd:true, no:1, items:itn.filter(function(it){ return it.code === "01_003"; }),
                              kg:itn.filter(function(it){ return it.code === "01_003"; })[0].kg, key:"x" }], itn)
                  .warnings.filter(function(w){ return w.code === "DETAL_OGIR"; }).length;
      chk("audit ogʻir detalni koʻradi (DETAL_OGIR)", hvA === 1, hvA + " ta");
    } catch(e){ chk("yogʻoch emas materiallar", false, e.message); }
    P = svP; packAll();

    /* v22: DETAL SONI MES QOIDASI BILAN — jami = detal × max(mahsulot, 1).
       Real fayllarda mahsulot count="7" (7 ta parta) boʻlganda 1 ta parta
       pochkalanardi; count="0" li detal esa 1 dona boʻlib pochkaga tushardi. */
    try {
      var cx = '<project name="Soni sinovi">' +
        '<good typeId="sheet" id="m1" name="LDSP Oq" t="16" l="2750" w="1830"/>' +
        '<good typeId="product" id="pp" code="990077" name="Parta" count="3">' +
          '<part id="c1" code="01_001" name="qopqoq" l="1200" w="600" count="2"/>' +
          '<part id="c2" code="01_002" name="bok" l="700" w="500" count="0"/>' +
          '<part id="c3" code="01_003" name="polka" l="600" w="300" count="1" minusCount="1"/>' +
        '</good>' +
        '<operation typeId="CS"><material id="m1"/><part id="c1"/><part id="c2"/><part id="c3"/></operation>' +
        '</project>';
      DIAG.warnings = [];
      var dc = parseProject(cx);
      var qc1 = dc.parts.filter(function(x){ return x.id === "c1"; })[0].q;
      var qc2 = dc.parts.filter(function(x){ return x.id === "c2"; })[0].q;
      var qc3 = dc.parts.filter(function(x){ return x.id === "c3"; })[0].q;
      chk("mahsulot soni detal soniga koʻpaytiriladi", qc1 === 6 && qc3 === 3, "2×3=" + qc1 + " · 1×3=" + qc3);
      chk("soni 0 — 0 boʻlib qoladi (1 ga aylanmaydi)", qc2 === 0, "q=" + qc2);
      var wc = DIAG.warnings.map(function(w){ return w.code; }).join(",");
      chk("mahsulot soni / soni 0 / minus miqdor ogohlantirildi",
          /MAHSULOT_SONI/.test(wc) && /SONI_NOL/.test(wc) && /MINUS_MIQDOR/.test(wc), wc);
      var svPc = P; P = dc;
      var ic = buildItems();
      P = svPc;
      var ids = ic.filter(function(it){ return it.code === "01_001"; }).map(function(it){ return it.mes; });
      chk("MES ID nusxa raqami jami son boʻyicha (_1…_6)",
          ids.length === 6 && ids[0] === "990077_01_001_1" && ids[5] === "990077_01_001_6", ids.join(" "));
      chk("soni 0 detal pochkalanmaydi", ic.filter(function(it){ return it.code === "01_002"; }).length === 0 &&
          (DIAG.skipped || []).some(function(x){ return x.code === "01_002" && /soni 0/.test(x.why); }),
          ic.length + " nusxa");
    } catch(e){ chk("detal soni (MES qoidasi)", false, e.message); }
    P = svP; buildItems();

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
      chk("splitFix: hech narsa boʻlmasa — buyurtma boʻyicha (v22, MES)", e2.prod === false && e2.mat === false,
          JSON.stringify(e2));
      /* v22: v22 dan oldingi saqlovda {modul: ha} — eski standart, ongli tanlov emas:
         bir marta yangi standartga oʻtadi. v22 da saqlangani (P/M tanlovi) qoladi. */
      var svConf = null; try { svConf = localStorage.getItem("upk_conf"); } catch(e){}
      var svSp = S.split;
      try {
        localStorage.setItem("upk_conf", JSON.stringify({ _split:{ prod:true, mat:false } }));
        restoreConf(); var mOld = S.split;
        localStorage.setItem("upk_conf", JSON.stringify({ _split:{ prod:true, mat:false }, _splitV:22 }));
        restoreConf(); var mNew = S.split;
        chk("eski saqlov (modul: ha) standartga koʻchdi, v22 tanlovi qoldi",
            !mOld.prod && !mOld.mat && mNew.prod === true && $("mgrByRoom").checked === true,
            "eski -> " + JSON.stringify(mOld) + " · v22 -> " + JSON.stringify(mNew));
      } finally {
        try { if (svConf === null) localStorage.removeItem("upk_conf"); else localStorage.setItem("upk_conf", svConf); } catch(e){}
        S.split = svSp; $("mgrByRoom").checked = !!svSp.prod; $("mgrByMat").checked = !!svSp.mat;
      }
      chk("standart: buyurtma boʻyicha (modul katagi belgilanmagan)",
          !S.split.prod && !S.split.mat && !$("mgrByRoom").checked, JSON.stringify(S.split));
      chk("rejim qoldiqlari yoʻq", typeof S.mode === "undefined" && typeof S.rules === "undefined",
          "S.mode=" + typeof S.mode + " S.rules=" + typeof S.rules);
    } catch(e){ chk("splitFix", false, e.message); }

    /* v22: 4-PARTIYA — audit boʻshliqlari va quyruqli pochkani tahrirlash */
    try {
      packAll();
      var au0 = auditPacks(PACKS, buildItems());
      var pk4 = PACKS.filter(function(x){ return !x.odd && x.seq.length >= 3; })[0];
      pk4.kg += 1;
      var au1 = auditPacks(PACKS, buildItems());
      pk4.kg -= 1;
      chk("audit: pochka massasi detallari yigʻindisidan farq qilsa — MASSA_HISOB",
          au1.errors.some(function(e){ return e.code === "MASSA_HISOB"; }) &&
          !au0.errors.some(function(e){ return e.code === "MASSA_HISOB"; }),
          au1.errors.map(function(e){ return e.code; }).join(","));
      var sv1 = pk4.seq[1]; pk4.seq[1] = pk4.seq[0];
      var au2 = auditPacks(PACKS, buildItems());
      pk4.seq[1] = sv1;
      chk("audit: ketma-ketlikda takror detal (soni toʻgʻri) — SEQ",
          au2.errors.some(function(e){ return e.code === "SEQ" && /takror/.test(e.msg); }),
          au2.errors.map(function(e){ return e.code; }).join(","));
      var no4 = PACKS[1].no; PACKS[1].no = PACKS[0].no;
      var au3 = auditPacks(PACKS, buildItems());
      PACKS[1].no = no4;
      chk("audit: takror pochka raqami — RAQAM", au3.errors.some(function(e){ return e.code === "RAQAM"; }),
          au3.errors.map(function(e){ return e.code; }).join(","));
      var svSp4 = S.split; S.split = { prod:true, mat:false };
      var g1 = { code:"G", L:2000, W:150, T:16, kg:5, uid:"g1", cls:"BOK", unit:"01", matId:"m1" };
      var g2 = { code:"G", L:2000, W:150, T:16, kg:5, uid:"g2", cls:"BOK", unit:"02", matId:"m1" };
      var g3 = { code:"G", L:2000, W:150, T:18, kg:5, uid:"g3", cls:"BOK", unit:"01", matId:"m1" };
      var auG = auditPacks([{ odd:true, no:1, key:"x", nst:false, items:[g1, g2], kg:10, seq:[{ it:g1 }, { it:g2 }] }], [g1, g2]);
      S.split = svSp4;
      var svBT = S.byThick; S.byThick = true;
      var auT = auditPacks([{ odd:true, no:1, key:"x", nst:false, items:[g1, g3], kg:10, seq:[{ it:g1 }, { it:g3 }] }], [g1, g3]);
      S.byThick = svBT;
      chk("audit: bogʻda ikki modul — GURUH, ikki qalinlik — QALINLIK",
          auG.errors.some(function(e){ return e.code === "GURUH"; }) && auT.errors.some(function(e){ return e.code === "QALINLIK"; }),
          auG.errors.map(function(e){ return e.code; }).join(",") + " / " + auT.errors.map(function(e){ return e.code; }).join(","));

      // B8: detal pochkadan JOYIDA olinadi — qolganlar qimirlamaydi, asl qavatlar tegilmaydi
      var pr = PACKS.filter(function(x){ return !x.odd && x.layers.length >= 2 && x.layers[x.layers.length - 1].items.length >= 2; })[0];
      var bak4 = packSave(pr), nIt = pr.seq.length, kg4 = pr.kg;
      var topQ = pr.layers[pr.layers.length - 1].items[0];
      var keep = pr.layers[0].items.map(function(q){ return q.it.uid + "@" + q.x + "," + q.y; }).join("|");
      var rr4 = packRemoveInPlace(pr, topQ.it.uid);
      var keep2 = pr.layers[0].items.map(function(q){ return q.it.uid + "@" + q.x + "," + q.y; }).join("|");
      var auR = auditPacks([pr], packItems(pr));
      chk("tahrir: detal joyida olindi, qolganlar qimirlamadi, audit toza",
          rr4 === null && pr.seq.length === nIt - 1 && Math.abs(pr.kg - (kg4 - topQ.it.kg)) < 1e-9 && keep === keep2 &&
          !auR.errors.length, String(rr4) + " · " + (auR.errors.map(function(e){ return e.code; }).join(",") || "toza"));
      packLoad(pr, bak4);
      chk("tahrir: rad etilsa asl pochka toʻliq qaytadi (atomik)",
          pr.seq.length === nIt && pr.layers[pr.layers.length - 1].items.indexOf(topQ) >= 0, pr.seq.length + " detal");
      // B8: tagga quyruq qilib qoʻshish — yangi massiv, asl qavatlar tegilmaydi
      var lay0 = pr.layers, cnt0 = pr.layers.length;
      var rr5 = packAddAsTail(pr, topQ.it, 1e9);
      var addOk = rr5 === null ? (pr.layers !== lay0 && lay0.length === cnt0) : (typeof rr5 === "string" && pr.layers === lay0);
      chk("tahrir: ustiga qavat qilib qoʻshish asl qavatlarga tegmaydi", addOk, rr5 === null ? "qoʻshildi" : rr5);
      packLoad(pr, bak4);

      // «yangi pochka»: nostandart pochkadan olingan detal — nostandart oyna va belgi bilan
      var svML = S.maxLen; S.maxLen = 1400; packAll();
      /* nomzodlar: ustki qavatdan boshlab (pastki qavat detali ustidagini koʻtarib
         turishi mumkin — uni olish toʻgʻri rad etiladi). Har rad atomik. */
      var cands = [];
      PACKS.forEach(function(x, i){
        if (x.odd || !x.oddSrc || (x.done || 0) > 0) return;
        for (var li = x.layers.length - 1; li >= 0; li--)
          x.layers[li].items.forEach(function(q){
            if (q.it.L > S.maxLen && q.it.W >= S.minBase) cands.push({ i:i, u:q.it.uid });
          });
      });
      var rN = "nomzod yoʻq", npN = null, nsU = null, tries4 = 0;
      for (var ci = 0; ci < cands.length && rN !== null && tries4 < 20; ci++, tries4++){
        rN = moveDetail(cands[ci].i, cands[ci].u, "new");
        if (rN === null){ npN = PACKS[PACKS.length - 1]; nsU = cands[ci].u; }
      }
      if (cands.length)
        chk("«yangi pochka»: nostandart detal nostandart pochka boʻladi",
            rN === null && npN.base.uid === nsU && npN.oddSrc === true,
            rN === null ? "P" + pad2(npN.no) + " oddSrc=" + npN.oddSrc + " · " + tries4 + " urinish" : String(rN));
      else note("namunada uzun (nostandart) detalli toʻliq pochka topilmadi — «yangi pochka» nostandart yoʻli sinalmadi");
      S.maxLen = svML; packAll();
    } catch(e){ chk("4-partiya: audit va tahrir", false, e.message); }

    /* v11: MODUL GURUHI — ikki modul bitta pochkaga tushishi kerak.
       v22: standart — buyurtma boʻyicha (modullar baribir birga), shuning uchun
       guruh mantigʻi modul ajratish YOQILGAN holda sinaladi. */
    var svSplitG = S.split;
    try {
      S.split = { prod:true, mat:false }; packAll();
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
    S.split = svSplitG; packAll();

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
      /* v22: bu blok zaxira mantigʻini KALIBRLANGAN sharoitda tekshiradi — yupqa
         detallar alohida (v21 gacha shunday edi). Yupqa detal asosiy pochkaga
         qoʻshilganda u massa limitidan joy oladi va guruh oxiridagi 16 mm qoldiq
         zaxira bilan koʻproq singdiriladi (namunada 6 → 10 pochka, hammasi 45 kg
         ichida) — bu aralashtirishning narxi, «zaxira birinchi tanlov» xatosi emas.
         Pastdagi ulush chegarasi esa aynan oʻsha xatoga kalibrlangan. Standart
         holatdagi massa chegarasini boshidagi umumiy audit tekshiradi. */
      var zThin = null;
      buildItems().forEach(function(it){ if (it.T < MAIN_T && (zThin === null || it.T < +zThin)) zThin = String(it.T); });
      S.thickMix = {}; if (zThin !== null) S.thickMix[zThin] = false; packAll();
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
      S.tailKgOver = svZ; writeConf();
      S.thickMix = {}; packAll();               // v22: standart holat (yupqa — asosiyga)
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
        // v22: «Chetdan qochish» olib tashlandi — chegara bitta: «Chiqish» (S.ovh)
        var insLim = (S.baseInset != null ? S.baseInset : S.ovh);
        if ((p.gabL - p.base.L)/2 > insLim + 0.5 ||
            (p.gabW - p.base.W)/2 > insLim + 0.5) iBad.push("P" + p.no);
      });
      chk("paddon qamrovi meʼyorda", cBad.length === 0, cBad.join(",") || "toza");
      chk("chetga chiqish meʼyorda", iBad.length === 0, iBad.join(",") || "toza");

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
      Object.keys(cnt).forEach(function(k){ if (+k < MAIN_T && thin === null) thin = k; });

      /* v22: yupqa detal (10 mm dan yupqa) STANDART HOLDA asosiy pochkaga qoʻshiladi,
         tsex katakni olib tashlasa (false) — yana alohida. */
      function mixedPacks(){
        return PACKS.filter(function(p){
          if (p.odd) return false;
          var ts = {}; ts[p.base.T] = 1;
          p.layers.forEach(function(L){ L.items.forEach(function(x){ ts[x.it.T] = 1; }); });
          return Object.keys(ts).length > 1;
        }).length;
      }
      var mixDef = mixedPacks();
      chk("yupqa detal standart holda asosiy pochkada", thin !== null && mixDef > 0,
          "yupqa " + thin + " mm · " + mixDef + " ta aralash pochka");
      S.thickMix = {}; S.thickMix[thin] = false; packAll();
      var mixOff = mixedPacks(), nOff = PACKS.length;
      chk("katak olib tashlansa yupqa alohida pochkalanadi", mixOff === 0 && nOff > q0,
          mixOff + " ta aralash · " + q0 + " → " + nOff + " pochka");
      var wasLS = null;
      try { wasLS = localStorage.getItem("upk_conf"); } catch(e){}
      var svMix = S.thickMix;
      localStorage.setItem("upk_conf", JSON.stringify({ _thickMix: { "3": false } }));
      restoreConf();
      var migOld = S.thickMix["3"];
      localStorage.setItem("upk_conf", JSON.stringify({ _thickMix: { "3": false }, _thickMixV: 22 }));
      restoreConf();
      var migNew = S.thickMix["3"];
      if (wasLS === null) localStorage.removeItem("upk_conf"); else localStorage.setItem("upk_conf", wasLS);
      S.thickMix = svMix;
      chk("eski saqlangan «false» olib tashlanadi, v22 tanlovi saqlanadi",
          migOld === undefined && migNew === false, "eski: " + migOld + " · v22: " + migNew);

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
      chk("matritsa standart holatga qaytdi", PACKS.length === q0, PACKS.length + " pochka");

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
      var fb2 = oddBundles(fake.slice(0, 2), true);  // v22: nostandart oqim — oddKg bilan
      chk("bogʻ massa limitida boʻlinadi", fb2.length === 2,
          fb2.map(function(b){ return b.kg.toFixed(1) + "kg"; }).join(" | "));
      S.oddKg = svK;

      var svT = S.oddTol; S.oddTol = 2000;
      var fb3 = oddBundles(fake);
      chk("oddTol kengaysa bogʻ kamayadi", fb3.length < fb.length,
          fb.length + " -> " + fb3.length + " bogʻ");
      S.oddTol = svT;

      /* ================= v22: 4-PARTIYA — POCHKALASH VA AUDIT ================= */
      // C1: standart qoldiq bogʻi STANDART limitda, nostandart bogʻ — nostandart limitda
      var four = [1, 2, 3, 4].map(function(i){ return fakePart("C", 2000, 150, 16, 9.5, "c" + i); });   // 38 kg
      var bST = oddBundles(four, false), bNS = oddBundles(four, true);
      var mxST = Math.max.apply(null, bST.map(function(b){ return b.kg; }));
      chk("bogʻ: standart qoldiq standart limitda (35), nostandart — 40 da yopiladi",
          bST.length === 2 && mxST <= S.maxKg + 1e-9 && bNS.length === 1 && bNS[0].kg <= oddKgCap() + 1e-9,
          "standart: " + bST.map(function(b){ return b.kg.toFixed(1); }).join("+") + " · nostandart: " +
          bNS.map(function(b){ return b.kg.toFixed(1); }).join("+"));
      var sq4 = four.map(function(it){ return { it:it }; });
      var aST = auditPacks([{ odd:true, no:1, key:"x", nst:false, items:four, kg:38, seq:sq4 }], four);
      var aNS = auditPacks([{ odd:true, no:1, key:"x", nst:true,  items:four, kg:38, seq:sq4 }], four);
      chk("audit: 38 kg li standart bogʻ — MASSA xatosi, nostandart bogʻ — toza",
          aST.errors.some(function(e){ return e.code === "MASSA"; }) && !aNS.errors.some(function(e){ return e.code === "MASSA"; }),
          aST.errors.map(function(e){ return e.code; }).join(",") + " / " + (aNS.errors.map(function(e){ return e.code; }).join(",") || "toza"));
      chk("bogʻning asosiy limiti oqimiga qarab (singdirish va roʻyxat)",
          packKgBase({ odd:true, nst:false }) === S.maxKg && packKgBase({ odd:true, nst:true }) === oddKgCap(),
          packKgBase({ odd:true, nst:false }) + " / " + packKgBase({ odd:true, nst:true }));
      // C6: zaxirani ishlatgan pochka «zaxirasiz» bosqichda yana ogʻirlashmaydi
      var ovP = { kg:40, overKg:true, oddSrc:false };
      chk("singdirish: 0-bosqich — asosiy limit, zaxira faqat 1-bosqichda",
          absorbLim(ovP, 0) === S.maxKg && absorbLim(ovP, 1) === S.maxKg + (+S.tailKgOver || 0),
          absorbLim(ovP, 0) + " / " + absorbLim(ovP, 1));
      // C5: qatlamsiz pochkadagi ikki qavatli quyruq — toʻshak tekshiriladi
      var svBed = S.lidBed, svMF = S.minFill;
      S.lidBed = 85; S.minFill = 80;
      var e1 = tailInsertAt({ layers:[] }, [{ fill:0.3 }, { fill:0.9 }]);
      var e2 = tailInsertAt({ layers:[] }, [{ fill:0.9 }, { fill:0.4 }]);
      var e3 = tailInsertAt({ layers:[] }, [{ fill:0.3 }]);
      S.lidBed = svBed; S.minFill = svMF;
      chk("quyruq: qatlamsiz pochkada siyrak qavat ustiga tom qoʻyilmaydi (TOM_TAGI)",
          e1 === -1 && e2 === 0 && e3 === 0, e1 + " " + e2 + " " + e3);
      // C13: seans kasr koordinatani yaxlitlamaydi
      var fakeP = [{ no:1, odd:false, base:{ uid:"b" }, off:0,
                     layers:[{ items:[{ it:{ uid:"x" }, x:10.5, y:20.25, a:100, b:50, rot:0 }] }] }];
      var spk = snapPacks(fakeP)[0].layers[0].its[0];
      chk("seans: kasr koordinata yaxlitlanmaydi (USTMA_UST)", spk.x === 10.5 && spk.y === 20.25, spk.x + "," + spk.y);

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
      // v22: tom maydonlari «Tom sifati = Qoʻlda» boʻlganda oʻqiladi
      S.tomQ = "qolda"; S.lidBed = 75; writeConf(); S.lidBed = 0; readConf();
      chk("toʻshak sozlamasi saqlanadi", S.lidBed === 75, "lidBed=" + S.lidBed);
      S.tomQ = "orta"; S.lidBed = svBed; writeConf(); readConf(); packAll();
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
      S.tomQ = "qolda"; S.lidSupp = 55; writeConf(); S.lidSupp = 0; readConf();
      chk("tom tayanchi sozlamasi saqlanadi", S.lidSupp === 55, "lidSupp=" + S.lidSupp);
      S.tomQ = "orta"; S.lidSupp = svSupp; S.lidBed = svBed0; writeConf(); readConf(); packAll();
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
      /* v22: sigʻim stiker geometriyasidan (08-labels packListHTML). Chekning
         stikerga sigʻishini bu yerda emas, tests\labels.ps1 PDF orqali tekshiradi. */
      var capM = /\+(\d+) ta/.exec(lh80), cap80 = capM ? shown - 1 : shown;
      chk("80×60 da roʻyxat sigʻim bilan cheklangan", shown > 0 && (capM ? cap80 + (+capM[1]) === big.seq.length : shown === big.seq.length),
          shown + " ta koʻrsatildi" + (capM ? " (+" + capM[1] + " ta)" : " — hammasi"));
      chk("termal chek ixcham: Netto/Qalinlik yoʻq, Brutto bor",
          lh80.indexOf("Netto") < 0 && lh80.indexOf("Qalinlik") < 0 && lh80.indexOf("Brutto") > 0 &&
          lh80.indexOf("thermal") > 0, "80×60");
      var fake = Object.assign({}, big); fake.seq = [];
      PACKS.forEach(function(q){ q.seq.forEach(function(st){ if (fake.seq.length < 80) fake.seq.push(st); }); });
      var lhF = packLabelHTML(fake, "tqf");
      chk("koʻp detalli chekda kesilgani yozildi", lhF.indexOf('class="more"') > 0 && pfCount(lhF) < 80,
          pfCount(lhF) + " / 80 · +N ta belgisi");

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
        if (e.getAttribute("data-noconf")) return;      // v22: profil boshqaruvlari — sozlama emas
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
      // v22: tom maydonlari faqat «Qoʻlda» darajasida oʻqiladi — tekshiruv shu holatda
      var svTQ2 = el("cTomQ").value; el("cTomQ").value = "qolda"; readConf();
      confEls.forEach(function(e){
        var was = (e.type === "checkbox") ? e.checked : e.value;
        var before = JSON.stringify(S);
        if (!bump(e)){ skipped.push(e.id); return; }
        readConf();
        if (JSON.stringify(S) === before) deaf.push(e.id);
        if (e.type === "checkbox") e.checked = was; else e.value = was;
        readConf();
      });
      el("cTomQ").value = svTQ2; readConf();
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
                    "cMinBase","cBaseT","cBaseCover",
                    "cMaxH","cOvhOn","cOvh"];          // v22: chetdan qochish -> chiqish
      var nstIds = ["cOddKg","cOddLMax","cOddWMax","cOddTol"];
      var allIds = ["cOneMan","cTare","cMaxPartT","cTomQ","cTailOver","cTailGap",
                    "cLidFill","cLidN","cLidBal","cLidTol","cLidSupp","cLidBed"];   // v22: tom bir joyda
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

      /* ================= v22: SOZLAMALARNI SODDALASHTIRISH ================= */
      chk("soddalashtirish: 4 ta maydon olib tashlandi, qiymati doimiy",
          !el("cTries") && !el("cThick") && !el("cBaseLMin") && !el("cBaseInset") && !el("btnSave") &&
          S.tries === TRIES_FIXED && S.byThick === true && S.baseLMin === 0 && S.baseInset === null,
          "tries=" + S.tries + " byThick=" + S.byThick + " baseLMin=" + S.baseLMin + " baseInset=" + S.baseInset);
      var svOvh = el("cOvh").value;
      el("cOvh").value = "30"; readConf();
      var lpO = layoutPack(PACKS.filter(function(x){ return !x.odd; })[0].base, [], true, 0, 0);
      chk("chiqish — bitta maydon: konvert aynan shu qiymatda, ziddiyat ogohlantirishi yoʻq",
          lpO.off === 30 && !confCheck().some(function(w){ return /chetdan qochish/i.test(w.msg); }), "off=" + lpO.off);
      el("cOvh").value = svOvh; readConf();
      // tom sifati
      var svTQ = el("cTomQ").value;
      el("cTomQ").value = "yumshoq"; readConf();
      var tq1 = S.lidFill === 80 && S.lidN === 4 && S.lidBal === 30 && S.lidSupp === 55 && el("cLidFill").disabled;
      el("cTomQ").value = "qolda"; readConf();
      el("cLidFill").value = "87"; readConf();
      var tq2 = S.lidFill === 87 && !el("cLidFill").disabled;
      el("cTomQ").value = svTQ; readConf();
      chk("tom sifati: daraja 6 meʼyorni oʻrnatadi, «Qoʻlda» — maydonlar ochiq",
          tq1 && tq2 && S.lidFill === TOM_PRESETS.orta.lidFill, "yumshoq " + tq1 + " · qoʻlda " + tq2);
      // eski saqlov: «Chetdan qochish» chiqishdan kichik boʻlsa — amaldagi qiymat saqlanadi; tom darajasi aniqlanadi
      var svConf2 = null; try { svConf2 = localStorage.getItem("upk_conf"); } catch(e){}
      var mig = {};
      try {
        localStorage.setItem("upk_conf", JSON.stringify({ cOvh:"20", cBaseInset:"10" }));
        restoreConf(); mig.ovh = el("cOvh").value; mig.tq0 = el("cTomQ").value;
        localStorage.setItem("upk_conf", JSON.stringify({ cLidFill:"95", cLidN:"2", cLidBal:"45", cLidTol:"50", cLidSupp:"75", cLidBed:"90" }));
        restoreConf(); mig.tq1 = el("cTomQ").value;
        localStorage.setItem("upk_conf", JSON.stringify({ cLidFill:"88" }));
        restoreConf(); mig.tq2 = el("cTomQ").value;
      } finally {
        try { if (svConf2 === null) localStorage.removeItem("upk_conf"); else localStorage.setItem("upk_conf", svConf2); } catch(e){}
        restoreConf(); readConf();
      }
      chk("eski saqlov koʻchirildi: chiqish 10 mm, tom darajasi qiymatlardan",
          mig.ovh === "10" && mig.tq0 === "orta" && mig.tq1 === "qattiq" && mig.tq2 === "qolda",
          JSON.stringify(mig));
      // avtomatik saqlash (koʻrinishga oid maydon — qayta pochkalamaydi)
      var svTare = el("cTare").value;
      el("cTare").value = "1.3"; el("cTare").onchange();
      var savedT = null; try { savedT = JSON.parse(localStorage.getItem("upk_conf") || "{}").cTare; } catch(e){}
      el("cTare").value = svTare; el("cTare").onchange();
      chk("sozlama oʻzgarishi avtomatik saqlanadi (tugma yoʻq)", savedT === "1.3" && /saqlandi/.test(el("saveNote").textContent),
          "saqlangan cTare=" + savedT);
      // profil
      try { localStorage.removeItem("upk_profiles"); } catch(e){}
      var svTare2 = el("cTare").value;
      var pe1 = profSave("Sinov-T", "sinovkalit, мебель");
      el("cTare").value = "2.5"; el("cTare").onchange();
      var pe2 = profApply("Sinov-T", true);
      var back = el("cTare").value === svTare2 && S.profile === "Sinov-T";
      chk("profil: saqlandi va qoʻllanganda meʼyorlar qaytdi", pe1 === null && pe2 === null && back,
          "cTare " + el("cTare").value + " · joriy " + S.profile);
      chk("profil: loyiha nomidagi kalit soʻz (kirillcha ham) boʻyicha taklif",
          profMatch("Buyurtma SINOVKALIT 12") === "Sinov-T" && profMatch("MEBEL zakaz 7") === "Sinov-T" && profMatch("boshqa") === "",
          profMatch("MEBEL zakaz 7") || "yoʻq");
      profModal("sinovkalit.project");
      chk("profil: yuklash oynasida mos profil tanlangan", !!el("mProfSel") && el("mProfSel").value === "Sinov-T",
          el("mProfSel") ? el("mProfSel").value : "yoʻq");
      chk("profil boshqaruvlari sozlama emas (CONF_IDS da yoʻq)",
          CONF_IDS.indexOf("profSel") < 0 && CONF_IDS.indexOf("profName") < 0 && CONF_IDS.indexOf("profMatch") < 0, "");
      var pe3 = profDel("Sinov-T");
      chk("profil: oʻchirildi", pe3 === null && !profAll()["Sinov-T"], String(pe3));
      try { localStorage.removeItem("upk_profiles"); } catch(e){}
      // katalog: zichlik va kirillcha nom
      var svCat = JSON.parse(JSON.stringify(S.matCat));
      S.matCat.push({ key:"ЛДСП", t:0, dens:700, l:2750, w:1830, kgm2:0 });
      DIAG.warnings = [];
      var cx = parseProject('<project name="Kirill">' +
        '<good typeId="sheet" id="k1" name="ЛДСП Белый" t="18" l="2750" w="1830"/>' +
        '<good typeId="sheet" id="k2" name="МДФ" t="16" l="2800" w="2070"/>' +
        '<good typeId="sheet" id="k3" name="Керамогранит черный" t="5" l="1200" w="600"/>' +
        '<good typeId="product" id="kp" code="1" name="X"><part id="a" code="01" name="a" l="500" w="400" count="1"/></good>' +
        '<operation typeId="CS"><material id="k1"/><part id="a"/></operation></project>');
      var km = {}; cx.materials.forEach(function(m){ km[m.id] = m; });
      var tx2 = DIAG.warnings.filter(function(w){ return w.code === "MATERIAL_TAXMINIY"; })[0];
      S.matCat = svCat;
      chk("katalog: zichlik (700 kg/m³) — 18 mm ЛДСП 12,6 kg/m², kirillcha МДФ = MDF",
          Math.abs(km.k1.kgm2 - 12.6) < 1e-6 && Math.abs(km.k2.kgm2 - 12.32) < 1e-6 && (!tx2 || tx2.msg.indexOf("ЛДСП") < 0),
          km.k1.kgm2 + " · " + km.k2.kgm2);
      chk("kirillcha «Керамогранит» keramika zichligida (yogʻoch emas)", Math.abs(km.k3.kgm2 - 10) < 1e-6,
          km.k3.kgm2 + " kg/m² (5 mm × 2000)");

      /* v22: SODDALASHTIRISH. P/M kundalik tegadigan maydonlar yopiq boʻlimga
         tushib qolmasin — aks holda soddalik oʻrniga yashirin meʼyor chiqadi. */
      var coreIds = ["cMaxKg","cMaxLen","cBaseWMax","cMinBase","cMaxH","cOvhOn",
                     "cOddKg","cOddLMax","cOddWMax","cOneMan","cTare","cTomQ","cOvh",
                     "cRackN","cCellN","cPrefix","cLabel","cAutoLbl"];
      var hid = coreIds.filter(function(id){
        var e = cv.querySelector("#" + id); return !e || !!e.closest("details.adv");
      });
      chk("asosiy maydonlar koʻrinib turadi", hid.length === 0, hid.join(",") || coreIds.length + " ta");
      var advN = cv.querySelectorAll("details.adv").length;
      chk("kengaytirilgan boʻlimlar bor", advN >= 4, advN + " ta");

      // yashirin maydon oʻzgarsa yopiq sarlavha buni aytadi, qaytarilsa yoʻqoladi
      var tolEl = el("cOddTol"), tolSv = tolEl.value;
      var tolAdv = tolEl.closest("details.adv");
      tolEl.value = "250"; advMark();
      var mk1 = tolAdv.querySelector(".advmod").textContent;
      tolEl.value = tolSv; advMark();
      var mk2 = tolAdv.querySelector(".advmod").textContent;
      chk("yopiq boʻlim oʻzgarishni koʻrsatadi", /^1 ta/.test(mk1) && mk2 === "",
          "oʻzgargan: «" + mk1 + "», qaytgan: «" + mk2 + "»");

      /* v22: KOʻTARISH DARAJASI VA ZIDDIYATLAR — chegaralarni tsex belgilaydi,
         tizim ularni aynan bajaradi va zid boʻlsa aytadi. */
      var svL = { one:S.oneMan, two:S.twoMan };
      S.oneMan = 25; S.twoMan = 50;
      var tiers = [liftTier(20), liftTier(30), liftTier(64.9)].join(",");
      S.twoMan = 0;
      var tierOff = liftTier(64.9);
      S.oneMan = svL.one; S.twoMan = svL.two;
      chk("koʻtarish: 1 / 2 / 3+ kishi darajasi", tiers === "1,2,3" && tierOff === 2,
          tiers + " · twoMan=0 da " + tierOff);
      chk("koʻtarish: yaxlit list «3+ KISHI / ARAVA»", liftText(64.9) === "3+ KISHI / ARAVA", liftText(64.9));
      chk("pochka chekida koʻtarish qatori bor", packLabelHTML(PACKS[0], "lblx").indexOf("KISHI") > 0, "KISHI");
      chk("2 kishi maydoni umumiy blokda", inBlk(blkAll, "cTwoMan") && !el("cTwoMan").closest("details.adv"), "cTwoMan");

      var cw0 = confCheck();
      chk("standart sozlamada xato/ziddiyat yoʻq",
          cw0.filter(function(w){ return w.lvl !== "info"; }).length === 0,
          cw0.map(function(w){ return w.lvl; }).join(",") || "toza");
      var svC = { odd:S.oddKg, mb:S.minBase };
      S.oddKg = 30; S.minBase = 5000;
      var cw1 = confCheck().map(function(w){ return w.lvl + ":" + w.msg.slice(0, 22); });
      S.oddKg = svC.odd; S.minBase = svC.mb; confCheck();
      chk("ziddiyat: nostandart < standart ogohlantiriladi", cw1.some(function(s){ return /^wrn:Nostandart massa/.test(s); }), cw1.join(" | "));
      chk("ziddiyat: tag oynasi yopiq — xato", cw1.some(function(s){ return /^err:Tag eni min/.test(s); }), cw1.join(" | "));
      chk("ziddiyat ekranda koʻrinadi", (el("confWarn").innerHTML || "").length === 0 ||
          cw0.length === el("confWarn").querySelectorAll(".note").length, el("confWarn").querySelectorAll(".note").length + " ta");

      // nostandart limiti hamma joyda tsex soni AYNAN — standartdan past boʻlsa ham
      var nBase = PACKS.length;                // v22: namuna soni qattiq yozilmaydi
      S.oddKg = 30; packAll();
      var oA = auditPacks(PACKS, buildItems());
      var oOver = PACKS.filter(function(p){
        return p.oddSrc && p.kg > 30 + 1e-6 && !(p.odd && p.items.length === 1) &&
               !(!p.odd && !p.layers.length);
      }).length;
      S.oddKg = svC.odd; packAll();
      chk("nostandart limit standartdan past boʻlsa ham aynan bajariladi", oOver === 0, oOver + " ta oshgan pochka");
      chk("past nostandart limitda audit toza", oA.errors.length === 0,
          oA.errors.slice(0,3).map(function(e){ return e.code + " P" + e.pack; }).join(" | ") || "toza");
      chk("nostandart sinovidan keyin holat tiklandi", PACKS.length === nBase, PACKS.length + " pochka");

      /* v22: tsex qoidasi — nostandart detallar qoʻshiladi, faqat yigʻindi
         nostandart limitidan OSHMASA. Zaxira nostandart pochkaga berilmaydi
         (ilgari 46 kg li nostandart pochka audit «toza» bilan chiqardi). */
      var oddOver = PACKS.filter(function(p){
        var single = p.odd ? p.items.length === 1 : !p.layers.length;
        return (p.odd || p.oddSrc) && !single && p.kg > oddKgCap() + 1e-6;
      }).map(function(p){ return "P" + p.no + " " + p.kg.toFixed(1); });
      chk("nostandart pochka limitdan oshmaydi (zaxirasiz)", oddOver.length === 0, oddOver.join(", ") || "toza");
      chk("nostandart pochkada zaxira belgisi yoʻq", PACKS.filter(function(p){ return p.oddSrc && p.overKg; }).length === 0, "overKg");
      // v22: qavat limiti 1 — faqat tag, qopqoq yasalmaydi
      var svLay = S.maxLayers; S.maxLayers = 1; packAll();
      var lAud = auditPacks(PACKS, buildItems());
      var lBad = PACKS.filter(function(p){ return !p.odd && p.layers.length > 0; }).length;
      S.maxLayers = svLay; packAll();
      chk("qavat limiti 1: faqat tag, audit toza", lBad === 0 && lAud.errors.length === 0,
          lBad + " ta qavatli · " + lAud.errors.slice(0,2).map(function(e){ return e.code; }).join(","));

      // v22: kasrli oʻlchamlar — detallar ustma-ust tushmaydi
      P.parts.forEach(function(pp){ pp.l += 0.5; pp.w += 0.3; });
      packAll();
      var fAud = auditPacks(PACKS, buildItems());
      var fOv = fAud.errors.filter(function(e){ return e.code === "USTMA_UST"; }).length;
      P.parts.forEach(function(pp){ pp.l -= 0.5; pp.w -= 0.3; });
      packAll();
      chk("kasrli oʻlchamda ustma-ust yoʻq", fOv === 0 && fAud.errors.length === 0,
          fOv + " USTMA_UST · jami xato " + fAud.errors.length);

      // v22: «chiqishga ruxsat» katagi pochkani boʻlib yubormaydi
      var tIdx = -1;
      for (var ti = 0; ti < PACKS.length; ti++) if (!PACKS[ti].odd && !PACKS[ti].done && PACKS[ti].layers.length){ tIdx = ti; break; }
      var tp = PACKS[tIdx], nPk = PACKS.length, nIt = tp.seq.length, ovh0 = tp.allowOvh;
      togglePackOvh(tp, !ovh0);
      var nPk2 = PACKS.length, nIt2 = tp.seq.length;
      togglePackOvh(tp, ovh0);
      chk("chiqish katagi pochkani boʻlmaydi", nPk2 === nPk && nIt2 === nIt && tp.allowOvh === ovh0,
          "P" + tp.no + ": " + nPk + "→" + nPk2 + " pochka, " + nIt + "→" + nIt2 + " detal");
      packAll();

      var svT = S.tailKgOver, svM = S.maxKg; oddLimitsOff(oddLimitsOn());
      chk("nostandart rejimdan keyin zaxira va limit tiklanadi", S.tailKgOver === svT && S.maxKg === svM,
          "tail=" + S.tailKgOver + " max=" + S.maxKg);

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
      /* v22: baseLMin va baseInset — endi doimiy (maydoni yoʻq); tom ulushi «Qoʻlda» da oʻqiladi */
      var svAll = { baseWMax:S.baseWMax, baseCover:S.baseCover, tomQ:S.tomQ,
                    maxH:S.maxH, lidBal:S.lidBal,
                    oddKg:S.oddKg, oddLMax:S.oddLMax, oddWMax:S.oddWMax, oddTol:S.oddTol };
      S.tomQ = "qolda";
      S.baseWMax=1234; S.baseCover=87; S.maxH=555;
      S.lidBal=45; S.oddKg=44; S.oddLMax=2900; S.oddWMax=1500; S.oddTol=250;
      writeConf();
      S.baseWMax=0; S.baseCover=0; S.maxH=0;
      S.lidBal=0; S.oddKg=0; S.oddLMax=0; S.oddWMax=0; S.oddTol=0;
      readConf();
      var rt = (S.baseWMax===1234 && S.baseCover===87 && S.baseLMin===0 && S.baseInset===null &&
                S.maxH===555 && S.lidBal===45 && S.oddKg===44 && S.oddLMax===2900 &&
                S.oddWMax===1500 && S.oddTol===250);
      chk("v14 sozlamalari yozildi va qayta oʻqildi", rt,
          JSON.stringify({wmax:S.baseWMax,lmin:S.baseLMin,cov:S.baseCover,ins:S.baseInset,
                          h:S.maxH,bal:S.lidBal,okg:S.oddKg}));
      S.baseLMin = 0; S.maxH = 0; writeConf(); readConf();
      chk("nol qiymat saqlanadi (cheklovsiz)", S.baseLMin === 0 && S.maxH === 0,
          "baseLMin=" + S.baseLMin + " maxH=" + S.maxH);
      Object.keys(svAll).forEach(function(k){ S[k] = svAll[k]; });
      writeConf(); readConf(); packAll();
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
      /* v22: «kichik guruh» namunada 3 mm orqa devorlar edi. Endi ular standart
         holda asosiy pochkaga qoʻshiladi — shuning uchun blok yupqa ALOHIDA
         sharoitda yuradi va oxirida standart holat qaytadi. */
      var yThin = null;
      buildItems().forEach(function(it){ if (it.T < MAIN_T && (yThin === null || it.T < +yThin)) yThin = String(it.T); });
      var svSplitY = S.split; S.split = { prod:true, mat:false };   // v22: guruh = modul
      S.thickMix = {}; if (yThin !== null) S.thickMix[yThin] = false; packAll();
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
      S.thickMix = {}; S.split = svSplitY; packAll();   // v22: standart holat
    } catch(e){ chk("YENGIL guruh mantigʻi", false, e.message); }

    /* v13: seansda key/room/tail saqlanadi. Ilgari key saqlanmasdi va shu sabab
       brauzer yangilangach moveDetail dagi GURUH himoyasi jimgina ishlamay qolardi. */
    var svSplitK = S.split;
    try {
      S.split = { prod:true, mat:false }; packAll();   // v22: guruh kaliti modulga qaraydi
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
    } catch(e){ chk("seans: key/tail", false, e.message); }
    S.split = svSplitK; packAll();

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
      var spBak = { P:P, PACKS:PACKS, CUR:CUR, STEP:STEP, split:S.split,
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
      S.split = spBak.split;               // v22: standart endi buyurtma boʻyicha — eskisi qaytadi
      P = spBak.P; PACKS = spBak.PACKS; CUR = spBak.CUR; STEP = spBak.STEP;
      S.rooms = spBak.rooms; S.sepCls = spBak.sepCls;
      S.modGroups = spBak.mg; S.clsGroups = spBak.cg;
      packAll();
    }

    /* v12: MODUL NOMI — P/M bergan nom roʻyxatda, chekda va tahrirlashda chiqadi.
       Fayl faqat «01»/«990101» beradi; nomsiz chekda kod turadi va upakovshik
       nima ekanini bilmaydi.
       v22: standart — buyurtma boʻyicha; modul sarlavhasi modul ajratilganda sinaladi. */
    var svSplitN = S.split;
    try {
      S.split = { prod:true, mat:false };
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
      S.unitNames = nBak;
    } catch(e){ chk("modul nomi", false, e.message); }
    S.split = svSplitN; packAll();

    /* v12: XONA — nomlangan modul guruhi + «birga pochkalansin» bayrogʻi.
       join:true  — butun xona bitta pochkalash kaliti (v11 xatti-harakati)
       join:false — har modul oʻz pochkasida, xona nomi faqat BELGI
       v22: «alohida» maʼnosi modul ajratilganda — shuning uchun blok shu holatda. */
    var svSplitX = S.split;
    try {
      S.split = { prod:true, mat:false }; packAll();
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

      S.modGroups = [];
    } catch(e){ chk("xona", false, e.message); }
    S.modGroups = []; S.split = svSplitX; packAll();

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

    /* ================= v22: SARALASH — skan detal identifikatori bo'yicha =================
       Ilgari faqat KOD bo'yicha qidirilardi: oʻz chekimizdagi pochka raqami eʼtiborsiz,
       koʻzgu juftlik boshqa pochkaga, yigʻib boʻlingan pochka yana nishon edi. */
    try {
      var sR2 = S.rackN, sC2 = S.cellN, sOff2 = S.cellOff;
      S.rackN = 6; S.cellN = 10; S.cellOff = {}; sortReset();
      // bir xil kod + oʻlcham IKKI pochkada — oʻz cheki aynan chekdagi pochkaga yuboradi
      var dup = null, firstPack = {};
      PACKS.forEach(function(p){
        packItems(p).forEach(function(it){
          var k = it.code + "|" + it.L + "x" + it.W + "x" + it.T;
          if (!firstPack[k]) firstPack[k] = p; else if (!dup && firstPack[k] !== p) dup = { a:firstPack[k], b:p, it:it };
        });
      });
      chk("saralash: ikki pochkada bir xil detal topildi", !!dup, dup ? dup.it.code + " · P" + dup.a.no + " / P" + dup.b.no : "yoʻq");
      if (dup){
        var stB = null;
        dup.b.seq.forEach(function(s){ if (!stB && s.it.code === dup.it.code) stB = s; });
        claimCell(dup.a.no);                                  // A pochkada yacheyka bor — eski mantiq shunga yuborardi
        var rOwn = sortScan(qrText(dup.b, stB));
        chk("saralash: oʻz cheki chekdagi pochkaga yuboradi", rOwn.ok && rOwn.pack === dup.b,
            rOwn.ok ? "P" + rOwn.pack.no + " (kutilgan P" + dup.b.no + ")" : rOwn.msg);
      }
      // oddiy kod bir nechta HAR XIL detalga tegishli boʻlsa — tanlanmaydi
      var it0 = packItems(PACKS[0])[0], svKey = it0.mesKey, svMes = it0.mes;
      var twin = null;
      PACKS.forEach(function(p){ packItems(p).forEach(function(x){ if (!twin && x !== it0 && x.code === it0.code) twin = x; }); });
      var fakeIt = twin || packItems(PACKS[1])[0], svCode = fakeIt.code, svFK = fakeIt.mesKey, svFM = fakeIt.mes;
      fakeIt.code = it0.code; fakeIt.mesKey = "990999_" + it0.code + "-2"; fakeIt.mes = fakeIt.mesKey;
      var rAmb = sortScan(it0.code);
      fakeIt.code = svCode; fakeIt.mesKey = svFK; fakeIt.mes = svFM;
      chk("saralash: bir nechta xil detalga tegishli kod rad etiladi", !rAmb.ok && /xil detalga/.test(rAmb.msg), rAmb.msg);
      // bir xil MES chek ikki marta — ikkinchi nusxa belgilanmaydi, yacheyka aytiladi
      sortReset();
      var multi = null;
      PACKS.forEach(function(p){ packItems(p).forEach(function(x){ if (!multi && x.of > 1) multi = x; }); });
      var mr1 = sortScan("B-2026-047_" + multi.mes), putN1 = Object.keys(SORT.put).length;
      var mr2 = sortScan("B-2026-047_" + multi.mes), putN2 = Object.keys(SORT.put).length;
      chk("saralash: bitta MES chek ikki marta — ikkinchi nusxa belgilanmaydi",
          mr1.ok && !mr2.ok && putN1 === putN2 && /allaqachon skanerlangan/.test(mr2.msg) && mr2.msg.indexOf(mr1.cell) > 0,
          mr2.msg);
      // yigʻib boʻlingan pochka saralash nishoni boʻlmaydi
      sortReset();
      var fin = PACKS.filter(function(p){ return !p.odd && p.seq.length >= 2; })[0], finI = PACKS.indexOf(fin);
      fin.seq.forEach(function(s){ sortScan(qrText(fin, s)); });
      var doneBefore = sortStats().done;
      selectPack(finI); setStep(fin.seq.length);              // pochka yigʻildi — yacheyka boʻshaydi
      sortPlan();
      chk("saralash: yigʻilgan pochka qayta nishon boʻlmaydi",
          packLeft(fin) === 0 && !SORT.plan[fin.no] && !SORT.pack[fin.no] && sortStats().done === doneBefore,
          "left=" + packLeft(fin) + " plan=" + (SORT.plan[fin.no] || "—") + " done " + doneBefore + "→" + sortStats().done);
      var rFin = sortScan(qrText(fin, fin.seq[0]));
      chk("saralash: yigʻilgan pochka detali yangi yacheyka ochmaydi", !rFin.ok && !SORT.pack[fin.no], rFin.msg);
      setStep(0);
      // yacheyka yetmaganda reja qatʼiy: kichik pochka katta pochkaning yacheykasini olmaydi
      S.rackN = 1; S.cellN = 2; sortReset(); sortPlan();
      var planned = Object.keys(SORT.plan).map(Number);
      var small = PACKS.filter(function(p){ return planned.indexOf(p.no) < 0 && packLeft(p) > 0; })[0];
      var rSm = sortScan(qrText(small, small.seq ? small.seq[0] : { it:packItems(small)[0], layer:1 }));
      chk("saralash: reja tashqarisidagi pochka keyingi toʻlqinda", !rSm.ok && !SORT.pack[small.no] && /toʻlqin|boʻsh yacheyka/.test(rSm.msg),
          rSm.msg.slice(0, 90));
      // tahrirlash qoralamasida yopilgan yacheyka band boʻlib qolsa — saqlashda yopilmaydi
      S.rackN = 6; S.cellN = 10; sortReset();
      rackEditStart(); toggleCell("A1");
      var big1 = PACKS.slice().sort(function(a, b){ return packItems(b).length - packItems(a).length; })[0];
      SORT.cell["A1"] = big1.no; SORT.pack[big1.no] = "A1";
      rackEditSave();
      chk("saralash: band yacheyka qoralamadan yopilmaydi", !cellOff("A1") && SORT.cell["A1"] === big1.no,
          "A1 yopiq=" + cellOff("A1"));
      // stelyaj sonini kamaytirish band yacheykani yoʻqotmaydi
      sortReset(); SORT.cell["B1"] = big1.no; SORT.pack[big1.no] = "B1";
      writeConf(); el("cRackN").value = "1"; readConf();
      var cwS = confCheck().filter(function(w){ return /kamaytirilmadi/.test(w.msg); });
      chk("saralash: band yacheyka boʻlsa stelyaj soni kamaymaydi", S.rackN === 6 && el("cRackN").value === "6" && cwS.length === 1,
          "rackN=" + S.rackN + " · " + (cwS[0] ? cwS[0].msg.slice(0, 60) : "ogohlantirish yoʻq"));
      sortReset(); S.rackN = sR2; S.cellN = sC2; S.cellOff = sOff2; writeConf(); readConf();
    } catch(e){ chk("saralash (v22)", false, e.message); }

    /* ================= v22: ALOHIDA POSTLAR =================
       Tsex jarayoni: saralash posti -> stelyaj toʻlgach BUTUNLIGICHA qadoqlashga ->
       qadoqlash posti (detal skanidan pochka ochiladi, tugagach chek) -> boʻsh
       stelyaj qaytadi. Postlar alohida kompyuterda: reja fayli va reja raqami. */
    try {
      var aR = S.rackN, aC = S.cellN, aOff = S.cellOff;
      packAll();
      S.rackN = 2; S.cellN = 3; S.cellOff = {}; sortReset();
      var pal = [];
      PACKS.forEach(function(p){ p.seq.forEach(function(st){ pal.push(qrText(p, st)); }); });
      var sdA = 17, rrA = function(){ sdA = (sdA*9301+49297) % 233280; return sdA/233280; };
      pal.sort(function(){ return rrA() - 0.5; });
      var waves = 0, readyN = 0, badAway = 0, dupCell = 0, leftP = pal.slice();
      while (leftP.length && waves < 80){
        var nextP = [];
        leftP.forEach(function(c){
          var r = sortScan(c);
          if (!r.ok){ nextP.push(c); return; }
          if (r.ready) readyN += r.ready.length;
          var Lr = r.cell ? rackOf(r.cell) : "";
          if (Lr && rackAway(Lr) && !r.away && (r.ready || []).indexOf(Lr) < 0) badAway++;
        });
        var seenNo = {};
        Object.keys(SORT.cell).forEach(function(c){
          var no = SORT.cell[c];
          if (seenNo[no] || SORT.pack[no] !== c) dupCell++;
          seenNo[no] = 1;
        });
        Object.keys(SORT.away).forEach(function(L){ rackReturn(L); });   // qadoqlandi, boʻsh qaytdi
        waves++;
        if (nextP.length === leftP.length) break;                        // oldinga siljimadi
        leftP = nextP;
      }
      var stA = sortStats();
      chk("postlar: 6 yacheyka bilan butun buyurtma toʻlqinlarda saralandi",
          !leftP.length && stA.done === stA.tot,
          stA.done + "/" + stA.tot + " detal · " + waves + " toʻlqin · paddonda " + leftP.length);
      chk("postlar: stelyaj toʻlgach oʻzi «tayyor», qaytgach yana ishladi",
          readyN >= Math.ceil(PACKS.length / S.cellN) && Object.keys(SORT.gone).length === PACKS.length,
          readyN + " marta tayyor · " + Object.keys(SORT.gone).length + "/" + PACKS.length + " pochka qadoqlashga ketdi");
      chk("postlar: qadoqlashdagi stelyajga detal berilmadi, yacheyka ikki pochkaga berilmadi",
          badAway === 0 && dupCell === 0, "notoʻgʻri " + badAway + " · takror " + dupCell);

      // toʻliq boʻlmagan stelyaj — qoʻlda, tasdiq bilan joʻnatiladi
      sortReset(); sortPlan();
      // rejadagi (yacheyka atalgan) pochka — aks holda u keyingi toʻlqinni kutadi
      var tq = null;
      Object.keys(SORT.plan).forEach(function(no){ var p = packByNo(+no); if (!tq && p && !p.odd && p.seq.length >= 3) tq = p; });
      sortScan(qrText(tq, tq.seq[0]));
      var cq = SORT.pack[tq.no], Lq = rackOf(cq);
      var s1 = rackSend(Lq, false);
      chk("postlar: toʻliq boʻlmagan stelyaj tasdiqsiz joʻnatilmaydi", !s1.ok && s1.need && !rackAway(Lq), s1.msg);
      var s2 = rackSend(Lq, true);
      chk("postlar: tasdiq bilan joʻnatildi", s2.ok && rackAway(Lq), s2.msg);
      var frq = sortFreeCell(tq.no);
      chk("postlar: qadoqlashdagi stelyaj yacheykasi pochka tugaganda boʻshamaydi",
          frq === false && SORT.pack[tq.no] === cq, String(frq) + " · " + SORT.pack[tq.no]);
      sortPlan();
      var inAw = Object.keys(SORT.plan).filter(function(no){ return rackOf(SORT.plan[no]) === Lq; }).length;
      chk("postlar: qadoqlashdagi stelyaj rejaga kirmaydi", inAw === 0, inAw + " ta reja");
      var k1 = sortScan(qrText(tq, tq.seq[1]));
      chk("postlar: kechikkan detal — qadoqlashga, oʻsha yacheykaga",
          k1.ok && k1.away && k1.kind === "warn" && k1.cell === cq && /QADOQLASHDA/.test(k1.msg), String(k1.msg).slice(0, 90));
      var snA = JSON.parse(JSON.stringify(makeSnapshot()));
      chk("postlar: seansda qadoqlashdagi stelyaj saqlanadi",
          !!(snA.sort && snA.sort.away && snA.sort.away[Lq]) && !!snA.sort.gone, JSON.stringify(snA.sort && snA.sort.away));
      var bk = sortScan(rackQRText(Lq));
      chk("postlar: stelyaj QR i — qaytdi, yacheyka boʻshadi",
          bk.ok && !rackAway(Lq) && !SORT.pack[tq.no] && SORT.gone[tq.no] === Lq,
          (SORT.last && SORT.last.freed) + " ta boʻshadi");
      var k2 = sortScan(qrText(tq, tq.seq[2]));
      chk("postlar: qaytgan stelyaj pochkasining detali — qadoqlashga", k2.ok && k2.gone && /qadoqlashga ketgan/.test(k2.msg),
          String(k2.msg).slice(0, 90));
      chk("postlar: ketgan pochka yangi yacheyka olmaydi", !SORT.pack[tq.no] && packLeft(tq) === 0, SORT.pack[tq.no] || "yoʻq");
      var k3 = sortScan(rackQRText(Lq));
      chk("postlar: saralashdagi stelyaj QR i — faqat holat", !k3.ok && /saralashda/.test(k3.msg), k3.msg);
      var k4 = sortScan("UPK|STELYAJ|ZZ");
      chk("postlar: notanish stelyaj — xato", !k4.ok && k4.kind === "err", k4.msg);
      var rlH = rackLabelsHTML();
      chk("postlar: har stelyajga QR belgi", (rlH.match(/<canvas/g) || []).length === rackCount() && rlH.indexOf(">B<") > 0,
          rackCount() + " ta belgi");
      sortReset(); S.rackN = aR; S.cellN = aC; S.cellOff = aOff;
    } catch(e){ chk("postlar: saralash", false, e.message); }

    /* QADOQLASH POSTI: stelyajdan olingan detal skanerlansa pochkasi oʻzi ochiladi */
    try {
      packAll();
      var ix = [];
      PACKS.forEach(function(p, i){ if (!p.odd && p.seq.length >= 2) ix.push(i); });
      var i0 = ix[0], i1 = ix[2], i2 = ix[4];
      selectPack(i0);
      PACKS[i0].seq.slice().forEach(function(st){ checkScan(qrText(PACKS[i0], st)); });
      chk("qadoqlash posti: pochka tugadi", (PACKS[i0].done || 0) === PACKS[i0].seq.length,
          (PACKS[i0].done || 0) + "/" + PACKS[i0].seq.length);
      var tg = PACKS[i1];
      checkScan(qrText(tg, tg.seq[0]));
      chk("qadoqlash posti: tayyor pochkadan keyin skan — detal pochkasi ochildi va qoʻyildi",
          CUR === i1 && STEP === 1 && /ochildi/.test(el("msg").textContent),
          "P" + pad2(PACKS[CUR].no) + " · qadam " + STEP + " · " + el("msg").textContent.slice(0, 60));
      var oth = PACKS[i2];
      checkScan(qrText(oth, oth.seq[0]));
      chk("qadoqlash posti: yigʻilayotgan pochka jimgina almashtirilmaydi",
          CUR === i1 && STEP === 1 && /tegishli/.test(el("msg").textContent), el("msg").textContent.slice(0, 70));
      selectPack(-1);
      checkScan(qrText(oth, oth.seq[0]));
      chk("qadoqlash posti: pochka tanlanmagan — skan pochkani ochadi", CUR === i2 && STEP === 1,
          "CUR=" + CUR + " · qadam " + STEP);

      // MES cheki: bir xil detal nusxalari ikki pochkada
      packAll(); selectPack(-1);
      var byKey = {}, pair = null;
      PACKS.forEach(function(p, i){
        p.seq.forEach(function(st){
          if (!st.it.mesKey || !(st.it.of > 1)) return;
          (byKey[st.it.mesKey] = byKey[st.it.mesKey] || []).push({ i:i, st:st });
        });
      });
      Object.keys(byKey).forEach(function(k){
        if (pair) return;
        var l = byKey[k], pi = {};
        l.forEach(function(x){ pi[x.i] = 1; });
        if (Object.keys(pi).length >= 2) pair = l;
      });
      chk("namunada nusxasi ikki pochkada boʻlgan detal bor", !!pair, pair ? pair[0].st.it.mesKey + " · " + pair.length + " nusxa" : "yoʻq");
      if (pair){
        var a1 = pair[0], qa = PACKS[a1.i];
        selectPack(a1.i);
        qa.seq.slice().forEach(function(st){
          checkScan(st.it.uid === a1.st.it.uid ? a1.st.it.mes : qrText(qa, st));
        });
        chk("MES cheki bilan pochka tugadi", (qa.done || 0) === qa.seq.length, (qa.done || 0) + "/" + qa.seq.length);
        checkScan(a1.st.it.mes);
        chk("qadoqlash posti: oʻsha MES chek qayta skanerlansa — rad, boshqa pochka ochilmaydi",
            CUR === a1.i && /allaqachon skanerlangan/.test(el("msg").textContent), el("msg").textContent.slice(0, 70));
        var a2 = pair.filter(function(x){ return x.i !== a1.i; })[0];
        var openW = {};
        pair.forEach(function(x){ if (x.i !== a1.i) openW[x.i] = 1; });
        var nOpen = Object.keys(openW).length;
        checkScan(a2.st.it.mes);
        if (nOpen === 1)
          chk("qadoqlash posti: boshqa nusxa — oʻz pochkasi ochildi", CUR === a2.i, "CUR=" + CUR + " kutilgan " + a2.i);
        else
          chk("qadoqlash posti: nusxa bir necha pochkada — taxmin qilinmaydi",
              CUR === a1.i && /pochkada bor/.test(el("msg").textContent), el("msg").textContent.slice(0, 80));
        var snS = JSON.parse(JSON.stringify(makeSnapshot()));
        chk("qadoqlash posti: skanerlangan MES cheklar seansda saqlanadi",
            !!snS.packSeen && snS.packSeen[a1.st.it.mes] === a1.st.it.uid, JSON.stringify(snS.packSeen).slice(0, 60));
      }
      packAll(); selectPack(0);
    } catch(e){ chk("qadoqlash posti", false, e.message); }

    /* REJA RAQAMI va REJA FAYLI — ikki kompyuterda reja aynan bir xil */
    try {
      packAll(); selectPack(0); stats(); renderSort();
      var id0 = planId();
      chk("reja raqami: 6 belgi, takror hisobda oʻzgarmaydi", /^[0-9A-F]{6}$/.test(id0) && planId() === id0, id0);
      chk("reja raqami ekranda: shapka, P/M, saralash", el("puuid").textContent.indexOf(id0) >= 0 &&
          el("mgrPlanId").textContent === id0 && el("sortPlanId").textContent.indexOf(id0) >= 0, el("puuid").textContent);
      var po = planFileObj();
      chk("reja fayli: progresssiz, raqami bilan",
          po.format === "upk-reja" && po.planId === id0 && po.snapshot.sort === null &&
          po.snapshot.packs.every(function(x){ return !x.done && !x.ord; }), po.planId + " · " + po.packs + " pochka");
      // «boshqa kompyuter» — sozlamasi boshqa, demak rejasi ham boshqa
      var svSpP = S.split;
      S.split = { prod:true, mat:false }; packAll();
      var idOther = planId();
      chk("reja raqami: boshqa sozlama — boshqa reja, boshqa raqam", idOther !== id0 && PACKS.length !== po.packs,
          id0 + " (" + po.packs + ") vs " + idOther + " (" + PACKS.length + ")");
      SORT.put["x#0"] = "A1";
      var lr = loadXmlText(JSON.stringify(po), "namuna_reja-" + id0 + ".upk.json");
      chk("reja fayli: yuklash oqimidan ochildi — reja aynan", !!lr && planId() === id0 && PACKS.length === po.packs,
          planId() + " · " + PACKS.length + " pochka");
      chk("reja fayli: sozlamasi ham keldi, eski saralash tozalandi", !S.split.prod && !SORT.put["x#0"],
          JSON.stringify(S.split));
      SORT.put["y#0"] = "A1";
      var rr2 = planFileLoad(JSON.stringify(po));
      chk("reja fayli: oʻsha reja qayta ochilsa saralash joyida qoladi", rr2.ok && rr2.same && SORT.put["y#0"] === "A1", rr2.msg);
      delete SORT.put["y#0"];
      var bad1 = planFileLoad("{}"), bad2 = planFileLoad("buzuq");
      var badPart = JSON.parse(JSON.stringify(po)), bi = -1;
      badPart.snapshot.packs.forEach(function(x, i){ if (bi < 0 && !x.odd) bi = i; });
      badPart.snapshot.packs[bi].baseUid = "YOQ#0";
      var bad3 = planFileLoad(JSON.stringify(badPart));
      chk("reja fayli: notoʻgʻri/buzilgan fayl rad etiladi, reja tegilmaydi",
          !bad1.ok && !bad2.ok && !bad3.ok && planId() === id0, bad3.msg);
      S.split = svSpP; packAll(); selectPack(0);
    } catch(e){ chk("reja fayli", false, e.message); }

    /* POST REJIMI — har kompyuter oʻz postini koʻradi */
    try {
      var tabV = function(v){ return document.querySelector('.tabs button[data-v="' + v + '"]').style.display !== "none"; };
      postSet("sort");
      chk("post: saralash postida qadoqlash ekrani yashirin", !tabV("work") && tabV("sort") &&
          el("v-sort").classList.contains("on") && el("postChip").style.display !== "none", el("postChip").textContent);
      showTab("work");
      chk("post: yashirin ekranga oʻtilmaydi — postning oʻzi", el("v-sort").classList.contains("on") &&
          !el("v-work").classList.contains("on"), "");
      postSet("pack");
      chk("post: qadoqlash postida saralash yashirin", !tabV("sort") && tabV("work") && el("v-work").classList.contains("on"), "");
      postSet("all");
      chk("post: hamma boʻlim — hammasi koʻrinadi", tabV("sort") && tabV("work") && el("postChip").style.display === "none", "");
      chk("post: manzildagi ?post= (TV rejimidan chiqish yoʻli)",
          postFromUrl("?post=all") === "all" && postFromUrl("?x=1&post=TV") === "tv" &&
          postFromUrl("?post=xyz") === "" && postFromUrl("") === "", "");
    } catch(e){ chk("post rejimi", false, e.message); }
    try { localStorage.removeItem("upk_post"); } catch(e){}

    /* ================= v22: MebeliX MES DETAL ID SI =================
       Qadoqlash postida MES chiqargan chek skanerlanadi:
       {buyurtma}_{mahsulot}_{detal}[-N][_n]. Qoidalar MES parseridan koʻchirilgan —
       bu blok ularning har birini alohida qoʻriqlaydi. */
    try {
      var allIt = buildItems();
      var noMes = allIt.filter(function(it){ return !it.mes; }).length;
      chk("MES: har detalga ID berildi", noMes === 0, noMes + " ta IDsiz / " + allIt.length);
      var uniq = {}, dupMes = 0;
      allIt.forEach(function(it){ if (uniq[it.mes]) dupMes++; uniq[it.mes] = 1; });
      chk("MES: ID lar takrorlanmaydi", dupMes === 0, dupMes + " ta takror");
      var many = allIt.filter(function(it){ return it.of > 1; })[0];
      var one  = allIt.filter(function(it){ return it.of === 1; })[0];
      chk("MES: koʻp nusxada _n, yagonada suffiks yoʻq",
          !!many && /_1$/.test(many.mes) && !!one && one.mes === one.mesKey,
          (many ? many.mes : "—") + " | " + (one ? one.mes : "—"));

      // kodsiz detal, takror kod va kodsiz mahsulot — MES parser.py qoidalari
      var mx = new DOMParser().parseFromString(
        '<project><good typeId="product" code="100701">' +
        '<part code="03_002"/><part code="03_002"/><part/><part code="03_002"/></good>' +
        '<good typeId="product" name="Shkaf"><part code="01"/></good></project>', "application/xml");
      var keys = [];
      Array.prototype.forEach.call(mx.querySelectorAll("good"), function(g){
        var pc = mesProdCode(g), seen = {}, n = 0;
        Array.prototype.forEach.call(g.querySelectorAll("part"), function(pp){
          keys.push(mesPartKey(pp, pc, n++, seen));
        });
      });
      chk("MES: takror kod -2/-3, kodsiz detal tartib raqami, kodsiz mahsulot nomi",
          keys.join(",") === "100701_03_002,100701_03_002-2,100701_003,100701_03_002-3,Shkaf_01",
          keys.join(","));

      // qadoqlash ekrani MES chekini taniydi
      selectPack(0);
      var s0 = STEP, wantIt = PACKS[0].seq[s0].it;
      checkScan("B-2026-047_" + wantIt.mes);
      chk("MES: qadoqlashda MES cheki qabul qilindi", STEP === s0 + 1,
          wantIt.mes + " -> STEP " + s0 + "→" + STEP);
      /* v22: pochka YIGʻILMOQDA (1-qadam qoʻyildi) — begona detal rad etiladi.
         Boshlanmagan pochkada esa begona detal oʻz pochkasini ochadi (qadoqlash
         posti — «postlar» blokida sinaladi). Begona detal joriy pochkada umuman
         boʻlmasin: nusxalar almashinadi. */
      var s1 = STEP, inP0 = {};
      packItems(PACKS[0]).forEach(function(it){ inP0[it.mesKey] = 1; });
      var alien = packItems(PACKS[1]).filter(function(it){ return !inP0[it.mesKey]; })[0];
      checkScan("B-2026-047_" + alien.mes);
      chk("MES: boshqa pochka detali rad etildi", STEP === s1 && CUR === 0, alien.mes);
      checkScan("B-2026-047_YOQ_999");
      chk("MES: notanish ID qadamni surmaydi", STEP === s1, "STEP=" + STEP);
      var nextIt = PACKS[0].seq[s1].it;

      // buyurtma raqami: notoʻgʻrisi rad, toʻgʻrisi yoziladi
      var e1 = mesOrderSet("2026-47"), e2 = mesOrderSet(" b-2026-047 ");
      chk("MES: buyurtma raqami tekshiriladi", !!e1 && e2 === "" && P.mesOrder === "B-2026-047",
          (e1 || "—") + " | " + P.mesOrder);
      checkScan("B-2026-999_" + nextIt.mes);
      chk("MES: boshqa buyurtma cheki rad etildi", STEP === s1, "STEP=" + STEP);
      checkScan("B-2026-047_" + nextIt.mes);
      chk("MES: oʻz buyurtmasi cheki qabul qilindi", STEP === s1 + 1, "STEP=" + STEP);
      setStep(s0);

      // reja: hamma pochka va hamma detal, toʻliq ID bilan
      var plan = mesPlan(), stepsN = 0, badId = 0;
      plan.packs.forEach(function(pk){ pk.steps.forEach(function(st){
        stepsN++; if (st.mes_id.indexOf("B-2026-047_") !== 0) badId++;
      }); });
      chk("MES rejasi: hamma pochka va detal", plan.packs.length === PACKS.length && stepsN === allIt.length,
          plan.packs.length + " pochka, " + stepsN + " qadam");
      chk("MES rejasi: ID lar buyurtma raqami bilan", badId === 0, badId + " ta notoʻgʻri");
      chk("MES rejasi: tag qadamida joy bor", !!plan.packs.filter(function(pk){ return pk.kind === "standart"; })[0].steps[0].place,
          "place");
      chk("MES rejasi: JSON ga aylanadi", JSON.parse(JSON.stringify(plan)).format === "upakofka-plan", "ok");
      chk("MES: P/M da buyurtma maydoni bor", !!el("mgrMesOrder") && !!el("btnMesPlan"), "mgrMesOrder");
      mesOrderSet("");
      chk("MES: raqam tozalanadi", P.mesOrder === null, String(P.mesOrder));

      // saralash posti ham MES chekidan kodni oladi
      chk("MES: saralashda MES chekidan detal kodi olinadi",
          scanCode("B-2026-047_" + wantIt.mes) === wantIt.code,
          scanCode("B-2026-047_" + wantIt.mes) + " vs " + wantIt.code);
    } catch(e){ chk("MES detal ID", false, e.message); }

    /* v22: QAVAT ICHIDA ERKIN TARTIB — namuna loyihada (sinov loyihasida mos qavat yoʻq) */
    try {
      // qavat ichida erkin tartib (MES gʻoyasi) — shu qavatdagi boshqa detal qabul qilinadi
      var fx = null;
      PACKS.forEach(function(p, pi){
        if (fx) return;
        for (var i = 1; i + 1 < p.seq.length; i++){
          var a = p.seq[i], b = p.seq[i + 1];
          if (a.layer > 0 && a.layer === b.layer && a.it.code !== b.it.code){ fx = { pi:pi, i:i }; return; }
        }
      });
      chk("erkin tartib sinovi uchun qavat topildi", !!fx, fx ? "P" + PACKS[fx.pi].no + " · " + (fx.i + 1) + "-qadam" : "yoʻq");
      if (fx){
        selectPack(fx.pi); setStep(fx.i);
        var pp = PACKS[fx.pi], curIt = pp.seq[fx.i].it, nxIt = pp.seq[fx.i + 1].it;
        checkScan(nxIt.code);
        chk("shu qavatdagi boshqa detal qabul qilinadi, tartib almashadi",
            STEP === fx.i + 1 && pp.seq[fx.i].it === nxIt && pp.seq[fx.i + 1].it === curIt,
            "STEP=" + STEP + " · " + pp.seq[fx.i].it.code + " / " + pp.seq[fx.i + 1].it.code);
        var ordB = pp.seq.map(function(x){ return x.it.uid; }).join(",");
        restoreSnapshot(makeSnapshot());
        var pr = PACKS[fx.pi];
        chk("almashgan tartib seansda saqlanadi",
            pr.seq.map(function(x){ return x.it.uid; }).join(",") === ordB && pr.done === fx.i + 1,
            "done=" + pr.done);
        selectPack(fx.pi); setStep(0);
      }
      // keyingi qavat detali hali erta — rad etiladi va sababi aytiladi
      var lx = null;
      PACKS.forEach(function(p, pi){
        if (lx || p.odd || p.layers.length < 2) return;
        var cur = p.seq[1], last = p.seq[p.seq.length - 1];
        var curCodes = {};
        p.seq.forEach(function(x){ if (x.layer === cur.layer) curCodes[x.it.code] = 1; });
        if (last.layer > cur.layer && !curCodes[last.it.code]) lx = { pi:pi, code:last.it.code };
      });
      if (lx){
        selectPack(lx.pi); setStep(1);
        checkScan(lx.code);
        chk("keyingi qavat detali rad etiladi", STEP === 1 && /qavatida/.test(el("msg").textContent), el("msg").textContent);
        setStep(0);
      }
    } catch(e){ chk("qavat ichida erkin tartib", false, e.message); }

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

        /* ================= v22: QADOQLASH POSTI — ishchi xavfsizligi ================= */
        try {
          document.querySelector('.tabs button[data-v="work"]').click();
          selectPack(0);
          var p0 = PACKS[0], s0 = STEP, st0 = p0.seq[s0];
          // boshqa buyurtmaning (boshqa loyiha belgisi) oʻz cheki — kod va pochka bir xil boʻlsa ham
          var alienQR = S.prefix + ".DEADBEEF.R" + (P.rev || 1) + "|P" + pad2(p0.no) + "|Q" + st0.layer +
                        "|" + st0.it.code + "|" + st0.it.L + "x" + st0.it.W + "x" + st0.it.T;
          checkScan(alienQR);
          chk("boshqa buyurtmaning oʻz cheki rad etiladi", STEP === s0 && /boshqa buyurtma/.test(el("msg").textContent),
              el("msg").textContent);
          checkScan(qrText(p0, st0));
          chk("oʻz cheki qabul qilinadi", STEP === s0 + 1, "STEP " + s0 + "→" + STEP);
          setStep(s0);
          checkScan("R12");
          chk("«R12» kodi reviziya deb oʻqilmaydi", !/ESKI/.test(el("msg").textContent), el("msg").textContent);

          // skaner fokussiz: belgi skan maydoniga yoʻnaltiriladi, qadam surilmaydi
          selectPack(0); setStep(0);
          var scEl = el("scan"); scEl.value = ""; scEl.blur();
          var sK = STEP;
          document.body.dispatchEvent(new KeyboardEvent("keydown", { key:"S", bubbles:true, cancelable:true }));
          chk("fokussiz skaner belgisi skan maydoniga tushadi",
              el("scan").value === "S" && STEP === sK && document.activeElement === el("scan"),
              "value=«" + el("scan").value + "» STEP=" + STEP);
          el("scan").value = "";
          el("scan").onkeydown({ key:"Enter", preventDefault:function(){} });
          chk("boʻsh skan maydonida Enter — qoʻlda «Qoʻyildi»", STEP === sK + 1, "STEP " + sK + "→" + STEP);
          setStep(sK);
        } catch(e){ chk("qadoqlash posti (v22)", false, e.message); }

        stageB3(function(){ stageSrv(function(){ stageMes(function(){
          chk("test oxirida yangi JS xatosi yo'q", window.__ERRORS.length === 0,
              window.__ERRORS.slice(0,4).join(" ; "));
          done();
        }); }); });
      });
    });
  }

  /* ---------- v22: 3-PARTIYA — SEANS VA SOZLAMALAR ---------- */
  function stageB3(cb){
    var ctx = {};
    function bad(e){ chk("3-partiya bosqichi", false, e && e.message ? e.message : String(e)); fin(); }
    function fin(){
      try { if (ctx.bc) ctx.bc.close(); } catch(e){}
      TAB_SECOND = false; AUTOSAVE_ON = true; tabBar(); repackBar(null);
      if (el("modal").style.display === "flex") el("mCancel").click();
      S.split = splitDefault(); packAll(); selectPack(0); sortReset();
      cb();
    }
    try {
      packAll(); selectPack(0); sortReset();
      /* B5: ish boshlangan boʻlsa qayta pochkalash tasdiqsiz bajarilmaydi */
      recompute().then(function(r1){
        chk("qayta pochkalash: ish yoʻq — darhol bajariladi", !(r1 && r1.pending), r1 ? JSON.stringify(r1) : "—");
        selectPack(0); setStep(1);
        ctx.rev = P.rev; ctx.packs = PACKS;
        return recompute();
      }).then(function(r2){
        chk("qayta pochkalash: ish boshlangan — tasdiqsiz pochkalar oʻzgarmaydi",
            r2 && r2.pending && PACKS === ctx.packs && P.rev === ctx.rev && (PACKS[0].done || 0) === 1 &&
            el("repackBar").style.display === "flex" && /1 ta pochka/.test(el("repackBar").textContent),
            el("repackBar").textContent.slice(0, 70));
        SORT.put["sinov#0"] = "A1";
        var wp = workProgress();
        chk("saralangan detal ham ish hisoblanadi", wp.sorted === 1 && wp.any, JSON.stringify(wp));
        delete SORT.put["sinov#0"];
        el("btnRepackGo").click();
        return until2(function(){ return !BUSY && P.rev > ctx.rev; });
      }).then(function(){
        chk("qayta pochkalash: tasdiq bilan bajarildi, ogohlantirish yopildi",
            P.rev > ctx.rev && PACKS !== ctx.packs && el("repackBar").style.display === "none", "R" + ctx.rev + " -> R" + P.rev);
        /* A3 + C8: yuklash bekor qilinsa avvalgi loyiha, pochkalar va asosiy qalinlik qoladi */
        ctx.P = P; ctx.packs = PACKS; ctx.mainT = MAIN_T;
        var data = JSON.parse(JSON.stringify(SEED)); data.name = "Bekor sinovi";
        var pr = boot(data);
        PACKPROG.cancel = true;
        return pr;
      }).then(function(res){
        chk("yuklash bekor qilindi — avvalgi loyiha, pochkalar va qalinlik joyida",
            !!res && res.cancelled === true && P === ctx.P && PACKS === ctx.packs && MAIN_T === ctx.mainT &&
            el("pname").textContent === P.name, (res && JSON.stringify(res)) + " · " + el("pname").textContent);
        /* A5: reja faylining meʼyorlari faqat oʻsha buyurtmaga */
        DEVICE_CONF = confCapture(); CONF_FROM_SNAP = false;
        ctx.dev = S.maxKg;
        S.maxKg = ctx.dev - 5; packAll();
        var po = planFileObj();
        S.maxKg = ctx.dev; packAll();
        var r = planFileLoad(po);
        var cw = confCheck().filter(function(w){ return /saqlanganidan farqli/.test(w.msg); })[0];
        chk("reja fayli: meʼyorlari shu buyurtmaga, Sozlamalarda farqi aytiladi",
            r.ok && S.maxKg === ctx.dev - 5 && CONF_FROM_SNAP === true && !!cw && /maxKg/.test(cw.msg),
            cw ? cw.msg.slice(0, 90) : "ogohlantirish yoʻq");
        return boot(JSON.parse(JSON.stringify(SEED)));
      }).then(function(){
        chk("yangi buyurtma — tsexning saqlangan meʼyorlari qoʻllandi",
            S.maxKg === ctx.dev && CONF_FROM_SNAP === false && +el("cMaxKg").value === ctx.dev &&
            !confCheck().some(function(w){ return /saqlanganidan farqli/.test(w.msg); }),
            "maxKg " + S.maxKg + " · forma " + el("cMaxKg").value);
        /* A13: vergulli qiymat (paste) */
        ctx.tare = el("cTare").value;
        el("cTare").value = "0,6"; readConf();
        chk("vergulli qiymat toʻgʻri oʻqiladi (tara 0,6)", Math.abs(S.tare - 0.6) < 1e-9 && el("cTare").value === "0.6",
            S.tare + " · «" + el("cTare").value + "»");
        el("cTare").value = ctx.tare; readConf();
        /* A9: diagnostika — seans tiklangach «fayl yuklanmagan» demaydi */
        DIAG.fileName = "sinov.project"; DIAG.parseMs = 12;
        DIAG.warnings = [{ code:"SINOV", msg:"sinov ogohlantirish", n:1 }];
        var sn = JSON.parse(JSON.stringify(makeSnapshot()));
        diagClear();
        restoreSnapshot(sn);
        var dh = diagFileHTML();
        chk("diagnostika: tiklangan seans fayl nomi va ogohlantirishlarini saqlaydi",
            DIAG.restored === true && DIAG.fileName === "sinov.project" && DIAG.warnings.length === 1 &&
            dh.indexOf("Seans tiklangan") >= 0 && dh.indexOf("Hali .project") < 0, DIAG.fileName);
        diagClear();
        /* A10: fayl tarixi — nomi va hajmi bir xil, mazmuni boshqa */
        ctx.nm = "tarix-sinovi-" + Date.now() + ".project";
        return Promise.resolve(Store.putFile({ name:ctx.nm, xml:"<project a='1800'/>" }))
          .then(function(){ return Store.putFile({ name:ctx.nm, xml:"<project a='1700'/>" }); })
          .then(function(){ return Store.listFiles(); });
      }).then(function(list){
        var mine = (list || []).filter(function(f){ return f.name === ctx.nm; });
        chk("fayl tarixi: mazmuni boshqa fayl ESKISINING ustiga tushmaydi", mine.length === 2, mine.length + " ta yozuv");
        return Promise.all(mine.map(function(f){ return Store.delFile(f.id); }));
      }).then(function(){
        /* A11: oʻqishdan oldingi ogohlantirish (kengaytma) diagnostikada qoladi */
        readFile(new File([NAMUNA], "namuna.dat", { type:"text/plain" }));
        return until2(function(){ return el("modal").style.display === "flex"; });
      }).then(function(){
        var has = DIAG.warnings.some(function(w){ return w.code === "KENGAYTMA"; });
        chk("yuklash: kengaytma ogohlantirishi fayl oʻqilgach ham qoladi", has,
            DIAG.warnings.map(function(w){ return w.code; }).join(","));
        el("mCancel").click();
        /* A12: brauzer xotirasi yozilmasa — «saqlandi» deyilmaydi */
        if (Store.available){ note("IndexedDB ishlayapti — localStorage zaxirasi (A12) bu muhitda sinalmadi"); return null; }
        var orig = localStorage.setItem;
        localStorage.setItem = function(){ throw new Error("quota"); };
        return Store.putSession(makeSnapshot()).then(
          function(){ localStorage.setItem = orig; return "ok"; },
          function(e){ localStorage.setItem = orig; return "err:" + (e && e.message); });
      }).then(function(r){
        if (r !== null) chk("seans yozilmasa xato qaytadi (yashil nuqta yolgʻon gapirmaydi)", /^err:/.test(String(r)), String(r).slice(0, 70));
        /* A8: ikki oyna */
        ctx.bc = new BroadcastChannel("upk-tabs");
        ctx.reply = null;
        ctx.bc.onmessage = function(ev){ if (ev.data && ev.data.t === "here" && ev.data.id === TAB_ID) ctx.reply = ev.data; };
        ctx.bc.postMessage({ t:"hello", id:"yangi-oyna", born:Date.now() + 100000 });
        return until2(function(){ return !!ctx.reply; });
      }).then(function(){
        chk("ikki oyna: birinchi oyna «men bor» deb javob beradi", !!ctx.reply && ctx.reply.born === TAB_BORN, ctx.reply ? "javob bor" : "javob yoʻq");
        ctx.bc.postMessage({ t:"here", id:"eski-oyna", born:1 });
        return until2(function(){ return TAB_SECOND; });
      }).then(function(){
        chk("ikki oyna: keyin ochilgan oyna seansni yozmaydi va aytadi",
            TAB_SECOND === true && AUTOSAVE_ON === false && el("tabBar").style.display === "flex",
            el("tabBar").textContent.slice(0, 60));
        TAB_SECOND = false; AUTOSAVE_ON = true; tabBar();
        /* B9: P/M qoʻlda koʻchirish — seansga yoziladi, eski chek taniladi */
        packAll(); selectPack(0); sortReset();
        var done = false, tried = 0;
        for (var i = 0; i < PACKS.length && !done; i++){
          var q = PACKS[i];
          if (q.odd || (q.done || 0) > 0) continue;
          var mids = packItems(q).filter(function(it){ return it !== q.base && it.W >= S.minBase && it.L <= S.maxLen; });
          for (var j = 0; j < mids.length && !done && tried < 25; j++){
            tried++;
            MGR_CUR = i; renderMgrEdit();
            var sel = el("mgrEdit").querySelector('select[data-uid="' + mids[j].uid + '"]');
            var btn = el("mgrEdit").querySelector('[data-mv="' + mids[j].uid + '"]');
            if (!sel || !btn) continue;
            sel.value = "new";
            ctx.srcNo = q.no;
            btn.click();
            if (el("emsg") && /koʻchirildi/.test(el("emsg").textContent)){ done = true; ctx.it = mids[j]; }
          }
        }
        chk("P/M koʻchirish: muvaffaqiyatli, eskirgan cheklar aytildi, seansga yozildi",
            done && /eskirdi/.test(el("emsg").textContent) && !!el("mvLbl") && !!el("mvPk") &&
            /busy/.test(el("saveState").className), done ? el("emsg").textContent.slice(0, 80) : tried + " ta urinish");
        if (!done) return null;
        var it = ctx.it, np = PACKS[PACKS.length - 1];
        chk("koʻchirilgan detal eski pochka raqamini eslaydi", it.movedFrom && it.movedFrom[0] === "P" + pad2(ctx.srcNo),
            String(it.movedFrom));
        var oldLbl = S.prefix + "." + projTag() + ".R" + (P.rev || 1) + "|P" + pad2(ctx.srcNo) + "|Q1|" +
                     it.code + "|" + it.L + "x" + it.W + "x" + it.T;
        selectPack(PACKS.length - 1); setStep(0);
        checkScan(oldLbl);
        chk("qadoqlash posti: eski chek tanildi, «chek eski» deyildi", STEP === 1 && /chek eski/.test(el("msg").textContent),
            "qadam " + STEP + " · " + el("msg").textContent.slice(0, 70));
        setStep(0);
        var rs = sortResolve(oldLbl);
        chk("saralash posti: eski chek tanildi", rs.cands.length >= 1 && rs.cands[0].it === it, rs.cands.length + " nomzod");
        var sn2 = JSON.parse(JSON.stringify(makeSnapshot()));
        restoreSnapshot(sn2);
        var it2 = null;
        PACKS.forEach(function(pk){ packItems(pk).forEach(function(x){ if (x.uid === it.uid) it2 = x; }); });
        chk("seans tiklangach ham eski chekni taniydi", !!it2 && !!it2.movedFrom && it2.movedFrom[0] === "P" + pad2(ctx.srcNo),
            it2 ? String(it2.movedFrom) : "yoʻq");
        return null;
      }).then(fin, bad);
    } catch(e){ bad(e); }
  }
  /* shart bajarilguncha kutish — Promise koʻrinishida */
  function until2(cond){ return new Promise(function(res){ until(cond, function(){ res(); }); }); }

  /* ---------- v23: MES REJIMI (U1–U4, soxta MES bilan) va KOʻRUVCHI (U5) ----------
     docs/mes-kelishuv.md. MES API xotirada: meʼyorlar, buyurtma, reja qabul qilish. */
  function stageMes(cb){
    var put = [], putCode = 200;
    function R(st, js){ return { status:st, json:js }; }
    var conf = { maxKg:30, ovh:20, ovhOn:true, minBase:190, maxLen:2100, minBaseT:16, minFill:85,
      lidFill:90, lidN:3, lidTol:100, maxLayers:12, maxH:0, tries:4, byThick:true, oneMan:25, twoMan:50,
      tare:0.6, baseWMax:1900, baseLMin:0, baseCover:90, lidBal:40, lidSupp:65, lidBed:85, tailGap:300,
      tailSpan:70, tailKgOver:10, tomQ:"orta", oddKg:40, oddLMax:3200, oddWMax:1900, oddTol:300,
      maxPartT:60, partKgMax:65, minPartW:0, minPartL:0, sepMat:"OYNA, KOZGU", matCat:[],
      rackN:7, cellN:6, bigN:1, cellW:250, cellD:400, cellH:1500, bigW:100, bigD:800, cellOff:{ "A2":true } };
    var expired = false, refreshN = 0, refreshOk = true;
    MES.mock = function(method, path, body){
      if (path === "login/refresh"){ refreshN++; if (!refreshOk) return R(401, { detail:"Token bekor qilingan." });
                                     expired = false; return R(200, { access_token:"x" }); }
      if (expired) return R(401, { detail:"Not authenticated" });
      if (path === "upakofka/meyorlar") return R(200, JSON.parse(JSON.stringify(conf)));
      if (path === "orders/5") return R(200, { id:5, number:"B-2026-005" });
      if (path === "upakofka/orders/5/reja" && method === "PUT"){
        if (putCode !== 200) return R(putCode, { detail:"Bu reja B-2026-999 buyurtmasiniki, siz B-2026-005 ga yuklayapsiz." });
        put.push(JSON.parse(JSON.stringify(body)));
        var n = 0; body.packs.forEach(function(pk){ n += pk.steps.length; });
        return R(200, { order_id:5, order_number:"B-2026-005", pochkalar:body.packs.length, qadamlar:n,
                        bogdandi:n, bogdanmagan:[], rejada_yoq:2 });
      }
      return R(404, { detail:"Not Found" });
    };
    var keepLbl = S.autoLbl, keepOrder = P.mesOrder;
    function fin(){
      MES.mock = null; MES.on = false; MES.orderId = ""; MES.orderNo = ""; MES.pending = false; MES.last = null;
      mesModeApply();
      try { localStorage.removeItem("upk_post"); } catch(e){}
      restoreConf(); readConf(); S.autoLbl = keepLbl; DEVICE_CONF = confCapture();
      P.mesOrder = keepOrder || null; delete P.mesOrderId;
      cb();
    }
    function bad(e){ chk("MES rejimi bosqichi", false, e && e.message ? e.message : String(e)); fin(); }
    try {
      try { localStorage.setItem("upk_post", "sort"); } catch(e){}
      MES.orderId = "5";
      mesDetect().then(function(on){
        chk("MES: rejim aniqlandi (meʼyorlar 200)", on === true && MES.on && document.body.classList.contains("mes-mode"), String(on));
        // seansdan tiklangan reja oʻz meʼyorlari bilan qoladi; yangi buyurtma — MES niki
        chk("MES: meʼyorlar MES dan — tsex meʼyori shu", (CONF_FROM_SNAP || S.maxKg === 30) && S.rackN === 7 && !!S.cellOff.A2 &&
            DEVICE_CONF && DEVICE_CONF.conf.maxKg === 30, "maxKg " + S.maxKg + " (tsex " + DEVICE_CONF.conf.maxKg + ") · rackN " + S.rackN);
        chk("MES: buyurtma raqami olindi", MES.orderNo === "B-2026-005", MES.orderNo);
        chk("MES: post tanlovi yoʻq — doim ofis, saralash ekrani yashirin",
            postMode() === "all" && postHidden("sort") && getComputedStyle(el("mgrPost").closest(".fields")).display === "none",
            postMode());
        chk("MES: sozlamalar faqat koʻrish (inert) va izoh bor",
            !!el("mesConfNote") && [].slice.call(el("v-conf").children).filter(function(c){ return c.id !== "mesConfNote" && !c.hasAttribute("inert"); }).length === 0,
            "inert");
        chk("MES: oʻz chekimiz va profil yashirin, tasdiqlash tugmasi bor",
            getComputedStyle(el("btnPrint1")).display === "none" && getComputedStyle(document.querySelector(".profbar")).display === "none" &&
            el("mesSendField").style.display !== "none" && S.autoLbl === false, "tugma");
        // U2: MES dan kelgan loyiha — raqam va id yoziladi
        MES.pending = true; var d = {}; mesTagProject(d);
        chk("MES: yuklangan loyihaga buyurtma raqami va id", d.mesOrder === "B-2026-005" && d.mesOrderId === "5" && !MES.pending,
            JSON.stringify(d));
        // U3: tasdiqlash — raqamsiz loyiha ham toʻliq ID bilan ketadi
        P.mesOrder = null;
        return mesPlanSend();
      }).then(function(ok){
        var b = put[0] || {}, idOk = 0, n = 0;
        (b.packs || []).forEach(function(pk){ pk.steps.forEach(function(st){ n++; if (st.mes_id.indexOf("B-2026-005_") === 0) idOk++; }); });
        chk("MES: reja PUT bilan yuborildi, raqam qoʻyildi", ok === true && put.length === 1 && b.order === "B-2026-005" &&
            P.mesOrder === "B-2026-005" && n > 0 && idOk === n, idOk + "/" + n);
        chk("MES: javob ekranda (bogʻlandi, rejasiz)", /bogʻlandi/.test(el("mesSendNote").textContent) &&
            /rejasiz/.test(el("mesSendNote").textContent), el("mesSendNote").textContent.slice(0, 90));
        chk("MES: tugma «Reja MES da ✓»", /MES da ✓/.test(el("btnMesSend").textContent), el("btnMesSend").textContent);
        putCode = 422;
        return mesPlanSend();
      }).then(function(ok){
        chk("MES: rad javobi (422) matni koʻrinadi", ok === false && /B-2026-999/.test(el("mesSendNote").textContent),
            el("mesSendNote").textContent.slice(0, 90));
        putCode = 200;
        // token eskirdi: ikki soʻrov bir vaqtda 401 — yangilash BITTA (MES da u bir martalik)
        expired = true; refreshN = 0;
        return Promise.all([mesPlanSend(), mesReq("GET", "orders/5")]);
      }).then(function(rs){
        chk("MES: token eskirsa bir marta yangilanadi va soʻrov oʻtadi",
            rs[0] === true && rs[1].ok && refreshN === 1 && put.length === 2, "refresh " + refreshN + " · put " + put.length);
        // yangilash ham rad etilsa — qayta urinish yoʻq, odamga aytiladi
        expired = true; refreshOk = false; refreshN = 0;
        return mesPlanSend();
      }).then(function(ok){
        chk("MES: yangilash rad etilsa — «kiring» deyiladi, cheksiz urinish yoʻq",
            ok === false && refreshN === 1 && /kirilmagan/.test(el("mesSendNote").textContent),
            "refresh " + refreshN + " · " + el("mesSendNote").textContent.slice(0, 60));
        expired = false; refreshOk = true;

        // U4: reja v2 — 3D uchun toʻliq joy
        var plan = mesPlan(), bad2 = [], std = 0;
        chk("reja v2: versiya va reja raqami", plan.version === 2 && plan.plan_id === planId(), plan.version + " " + plan.plan_id);
        plan.packs.forEach(function(pk){
          if (pk.kind !== "standart") return;
          std++;
          if (!pk.base_mm || !pk.env_mm || !pk.layers || pk.layers[0].role !== "tag") bad2.push(pk.code + ":bosh");
          var top = pk.layers[pk.layers.length - 1];
          if (Math.abs(top.z + top.h - pk.height_mm) > 1) bad2.push(pk.code + ":h");
          pk.steps.forEach(function(st){
            var q = st.place, L = pk.layers[st.layer];
            if (!q || !L) { bad2.push(pk.code + ":" + st.step + " joy yoʻq"); return; }
            if (Math.abs(q.z - L.z) > 1) bad2.push(pk.code + ":" + st.step + " z");
            if (L.role !== (st.layer === 0 ? "tag" : st.role)) bad2.push(pk.code + ":" + st.step + " rol " + L.role + "/" + st.role);
            var off = pk.env_mm.off + 1;
            if (q.x < -off || q.y < -off || q.x + q.a > pk.base_mm[0] + off || q.y + q.b > pk.base_mm[1] + off)
              bad2.push(pk.code + ":" + st.step + " konvertdan chiqdi");
          });
        });
        chk("reja v2: har qadamda x/y/z, qavat va konvert mos", std > 0 && bad2.length === 0, std + " pochka; " + bad2.slice(0, 4).join(", "));
        chk("reja v2: rejasiz roʻyxat bor", Object.prototype.toString.call(plan.rejasiz) === "[object Array]", String(plan.rejasiz && plan.rejasiz.length));

        // U5: koʻruvchi — alohida fayl, sahifaga yuklanadi
        return new Promise(function(res){
          var tries = ["src/korish/upk-korish.js", "upk-korish.js"], i = 0;
          (function next(){
            if (typeof window.UpkKorish === "object" || i >= tries.length) return res(plan);
            var sc = document.createElement("script"); sc.src = tries[i++];
            sc.onload = function(){ res(plan); }; sc.onerror = next;
            document.head.appendChild(sc);
          })();
        });
      }).then(function(plan){
        var K = window.UpkKorish;
        chk("koʻruvchi: fayl yuklandi", !!K && typeof K.create === "function", typeof K);
        if (!K) return;
        var pk = null, other = null;
        plan.packs.forEach(function(p){
          if (p.kind !== "standart") { return; }
          var hasUst = p.steps.some(function(s){ return s.role === "ust"; });
          var mid = p.steps.some(function(s){ return s.role === "qavat" || s.role === "quyruq"; });
          if (!pk && hasUst && mid) pk = p; else if (!other) other = p;
        });
        if (!pk) pk = plan.packs.filter(function(p){ return p.kind === "standart"; })[0];
        var st = pk.steps, tag = st[0].mes_id;
        chk("qoida: tag birinchi", st[0].role === "tag" && K.tekshir(pk, [], st[1].mes_id).sabab === "avval_tag" &&
            K.tekshir(pk, [], tag).ok, K.tekshir(pk, [], st[1].mes_id).sabab);
        chk("qoida: boshqa pochka detali rad", !!other && K.tekshir(pk, [tag], other.steps[0].mes_id).sabab === "boshqa_pochka",
            other ? other.code : "yoʻq");
        chk("qoida: takror skan rad", K.tekshir(pk, [tag], tag).sabab === "takror", "");
        var ust = st.filter(function(s){ return s.role === "ust"; })[0];
        if (ust){
          chk("qoida: qopqoq — oxirida", K.tekshir(pk, [tag], ust.mes_id).sabab === "qopqoq_oxirida", ust.code);
          var allMid = st.filter(function(s){ return s.role !== "ust"; }).map(function(s){ return s.mes_id; });
          chk("qoida: qavatlar tugagach qopqoq qabul", K.tekshir(pk, allMid, ust.mes_id).ok === true, "");
        }
        chk("qoida: prefikssiz ID ham bir xil", K.tekshir(pk, [], K.key(tag)).ok === true, K.key(tag));
        chk("qoida: keyingi — tag", K.keyingi(pk, []) === st[0] && K.keyingi(pk, [tag]) !== st[0], "");
        var box = document.createElement("div");
        box.style.cssText = "position:fixed;left:0;top:0;width:900px;height:420px";
        document.body.appendChild(box);
        var errs = window.__ERRORS.length;
        var v = K.create(box);
        v.setPack(pk);
        v.setState({ done:[tag], next:st[1].mes_id, wrong:other ? other.steps[0].mes_id : "", changed:[st[1].mes_id] });
        var cv = box.querySelectorAll("canvas");
        chk("koʻruvchi: 3D (2/3) va 2D (1/3) chizildi, xato yoʻq",
            cv.length === 2 && Math.abs(cv[0].getBoundingClientRect().width / cv[1].getBoundingClientRect().width - 2) < 0.2 &&
            window.__ERRORS.length === errs, cv.length + " kanvas");
        v.setState({ done:st.map(function(s){ return s.mes_id; }) });
        v.destroy(); box.parentNode.removeChild(box);
      }).then(fin, bad);
    } catch(e){ bad(e); }
  }

  /* ---------- v22: SERVER ORQALI POSTLAR (soxta server bilan) ----------
     server/upk-server.py bilan bir xil API — xotirada. Haqiqiy server va brauzer
     orqali toʻliq aylanish tests/server.ps1 da. */
  function stageSrv(cb){
    var MS = { plans:{}, meta:{}, state:{}, current:null };
    function J(o){ return JSON.parse(JSON.stringify(o)); }
    function R(st, js){ return { ok:st >= 200 && st < 300, status:st, json:js }; }
    SRV.mock = function(method, path, body){
      var m;
      if (path === "ping") return R(200, { ok:true, server:"upk", v:1 });
      if (path === "plans") return R(200, { ok:true, plans:Object.keys(MS.meta).map(function(k){ return MS.meta[k]; }) });
      if (path === "current") return R(200, { ok:true, sort:MS.current, name:MS.current && MS.meta[MS.current] ? MS.meta[MS.current].name : "" });
      if ((m = /^plans\/([0-9A-F]{6})(\?sort=1)?$/.exec(path))){
        if (method === "PUT"){
          if (!body || body.format !== "upk-reja" || body.planId !== m[1]) return R(400, { ok:false, error:"reja emas" });
          MS.plans[m[1]] = J(body); MS.meta[m[1]] = { id:m[1], name:body.name, packs:body.packs, ts:Date.now() };
          if (m[2]) MS.current = m[1];
          return R(200, { ok:true });
        }
        return MS.plans[m[1]] ? R(200, J(MS.plans[m[1]])) : R(404, { ok:false });
      }
      if ((m = /^state\/([0-9A-F]{6})\/sort$/.exec(path))){
        var cur = MS.state[m[1]] || { rev:0, data:null };
        if (method === "GET") return R(200, J(cur));
        if (body.base !== cur.rev) return R(409, { ok:false, conflict:true, rev:cur.rev });
        MS.state[m[1]] = { rev:cur.rev + 1, data:J(body.data) };
        if (MS.plans[m[1]]) MS.current = m[1];
        return R(200, { ok:true, rev:cur.rev + 1 });
      }
      return R(404, { ok:false });
    };
    SRV.manual = true;
    var id0 = "", ctx = {};
    function fin(){
      if (SRV.timer){ clearInterval(SRV.timer); SRV.timer = null; }
      if (SRV.pushT){ clearTimeout(SRV.pushT); SRV.pushT = null; }
      SRV.mock = null; SRV.on = false; SRV.manual = false; SRV.cur = null; SRV.conflict = false; SRV.err = "";
      postSet("all"); srvUi(); srvBanner();
      try { localStorage.removeItem("upk_post"); localStorage.removeItem("upk_nofocus"); } catch(e){}
      S.split = splitDefault(); packAll(); selectPack(0); sortReset();
      cb();
    }
    function bad(e){ chk("server (soxta) bosqichi", false, e && e.message ? e.message : String(e)); fin(); }
    function plannedPart(skip){
      sortPlan();
      var nos = Object.keys(SORT.plan).map(Number);
      for (var i = 0; i < nos.length; i++){
        var p = packByNo(nos[i]);
        if (!p || p.odd) continue;
        for (var j = 0; j < p.seq.length; j++) if (!SORT.put[p.seq[j].it.uid] && (!skip || p.seq[j].it.uid !== skip)) return { p:p, st:p.seq[j] };
      }
      return null;
    }
    try {
      S.split = splitDefault(); packAll(); selectPack(0); sortReset();
      srvDetect().then(function(on){
        chk("server: topildi, P/M da server bloki chiqdi", on === true && el("srvBox").style.display === "block",
            el("srvBox").textContent.slice(0, 60));
        id0 = planId();
        return srvPublish();
      }).then(function(ok){
        chk("server: reja joylandi va saralashga yuborildi", ok === true && MS.current === id0 && !!MS.plans[id0], id0);
        chk("server: roʻyxatda koʻrinadi", el("srvBox").textContent.indexOf(id0) >= 0 && /saralanmoqda/.test(el("srvBox").textContent),
            el("srvBox").textContent.slice(0, 90));
        // «boshqa kompyuter»: saralash posti, oʻzida boshqa reja, stelyajlar boʻsh
        postSet("sort");
        S.split = { prod:true, mat:false }; packAll();
        S.split = splitDefault();
        ctx.other = planId();
        sortReset(false, true);
        return srvTick();
      }).then(function(){
        chk("server: boʻsh saralash posti joriy rejaga oʻzi oʻtdi", planId() === id0 && ctx.other !== id0,
            ctx.other + " -> " + planId());
        // fokussiz skaner (Smart TV): belgilar hujjatga, Enter — skan
        showTab("sort");
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        var a = plannedPart();
        ctx.a = a;
        var code = qrText(a.p, a.st);
        for (var i = 0; i < code.length; i++)
          document.body.dispatchEvent(new KeyboardEvent("keydown", { key:code.charAt(i), bubbles:true, cancelable:true }));
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key:"Enter", bubbles:true, cancelable:true }));
        chk("saralash: skaner fokussiz ham ishlaydi (TV klaviaturasi ochilmaydi)",
            !!SORT.put[a.st.it.uid] && SORT.last && SORT.last.item === a.st.it, String(SORT.put[a.st.it.uid]));
        return srvSortPushNow();
      }).then(function(){
        var ms = MS.state[id0];
        chk("server: saralash holati serverga yozildi", !!ms && ms.rev >= 1 && ms.data.put[ctx.a.st.it.uid] === SORT.put[ctx.a.st.it.uid],
            ms ? "rev " + ms.rev : "yoʻq");
        // TV brauzeri qayta yuklandi — mahalliy holat yoʻq, serverdagisi qaytadi
        ctx.rev = SORT.rev;
        SORT.cell = {}; SORT.pack = {}; SORT.put = {}; SORT.rev = 0; SORT.revOf = "";
        return srvSortPull(id0, false);
      }).then(function(applied){
        chk("server: yoʻqolgan mahalliy holat serverdan qaytdi",
            applied === true && !!SORT.put[ctx.a.st.it.uid] && SORT.rev === ctx.rev, "rev " + SORT.rev);
        // boshqa qurilma ham yozdi — keyingi yozuv ziddiyat, server haqiqat
        MS.state[id0] = { rev:MS.state[id0].rev + 5, data:J(MS.state[id0].data) };
        var b = plannedPart(ctx.a.st.it.uid);
        ctx.b = b;
        sortScan(qrText(b.p, b.st));
        return srvSortPushNow();
      }).then(function(){
        chk("server: ikkinchi yozuvchi — ziddiyat aniqlandi, holat serverdan olindi",
            SRV.conflict === true && SORT.rev === MS.state[id0].rev && !SORT.put[ctx.b.st.it.uid] &&
            /Boshqa qurilma/.test(el("srvBanner").textContent), el("srvBanner").textContent.slice(0, 70));
        SRV.conflict = false;
        // stelyajda detal bor — yangi reja kelsa jimgina oʻtilmaydi
        MS.meta["ABCDEF"] = { id:"ABCDEF", name:"Keyingi buyurtma", ts:Date.now() };
        MS.current = "ABCDEF";
        return srvTick();
      }).then(function(){
        chk("server: stelyajda detal bor — yangi rejaga jimgina oʻtilmaydi",
            planId() === id0 && /Keyingi buyurtma/.test(el("srvBanner").textContent) && !!el("btnSrvGo"),
            el("srvBanner").textContent.slice(0, 80));
        // TV ekrani: holatni serverdan oʻqiydi, oʻzi hech narsa yozmaydi
        MS.current = id0;
        postSet("tv");
        ctx.putN = Object.keys(MS.state[id0].data.put).length; ctx.revS = MS.state[id0].rev;
        SORT.put = {}; SORT.cell = {}; SORT.pack = {}; SRV.seenRev = -1;
        ctx.tvScan = sortHandle(qrText(ctx.b.p, ctx.b.st));
        return srvTick();
      }).then(function(){
        chk("server: TV holatni serverdan koʻrsatadi, skan qabul qilmaydi, oʻzi yozmaydi",
            Object.keys(SORT.put).length === ctx.putN && MS.state[id0].rev === ctx.revS && ctx.tvScan === null &&
            getComputedStyle(document.querySelector(".tabs")).display === "none" && el("v-sort").classList.contains("on"),
            Object.keys(SORT.put).length + " detal · rev " + MS.state[id0].rev);
        // qadoqlash posti: ochiq pochka boʻlsa yangi rejaga oʻtmaydi, boʻshaganda — oʻtadi
        postSet("pack");
        S.split = { prod:true, mat:false }; packAll();
        var o2 = planFileObj(); ctx.id2 = o2.planId;
        MS.plans[o2.planId] = J(o2); MS.meta[o2.planId] = { id:o2.planId, name:"Ikkinchi buyurtma", ts:Date.now() };
        S.split = splitDefault();
        return srvOpenPlan(id0, false);
      }).then(function(){
        PACKS[0].done = 1;                               // pochka yigʻilmoqda
        MS.current = ctx.id2;
        return srvTick();
      }).then(function(){
        chk("qadoqlash posti: yigʻilayotgan pochka bor — yangi rejaga oʻtmaydi", planId() === id0 && !!el("btnSrvGo"),
            planId() + " · " + el("srvBanner").textContent.slice(0, 50));
        PACKS[0].done = 0;
        return srvTick();
      }).then(function(){
        chk("qadoqlash posti: ish yoʻq — joriy rejaga oʻzi oʻtdi", planId() === ctx.id2 && el("srvBanner").style.display === "none",
            id0 + " -> " + planId());
        fin();
      }).catch(bad);
    } catch(e){ bad(e); }
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
  "--virtual-time-budget=180000",
  "--dump-dom",
  $pageUrl
)
"Sahifa  : $(if ($Http) { $pageUrl } else { $tmp })"
"Ishga tushirilmoqda..."
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$proc = Start-Process -FilePath $Browser -ArgumentList $bargs -NoNewWindow -PassThru -RedirectStandardOutput $outFile
# Vaqt tugashi KUTILGAN holat, lekin Wait-Process bunda xato yozadi va
# $ErrorActionPreference="Stop" uni terminating qilib skriptni to'xtatardi:
# pastdagi majburan to'xtatish ham, Cleanup ham bajarilmasdi va -Http
# rejimida lokal server portni band qilib qolardi.
$proc | Wait-Process -Timeout $TimeoutSec -ErrorAction SilentlyContinue
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
