# ================================================================
#  CORPUS — HAQIQIY .project FAYLLAR KORPUSIDA REGRESSIYA TESTI
#
#  Nima qiladi: papkadagi har bir .project faylni haqiqiy brauzerda
#  (headless) o'qiydi, pochkalaydi va auditdan o'tkazadi. Har fayl uchun
#  bitta qator, oxirida umumiy hisobot.
#
#  Nega kerak: smoke.ps1 bitta sun'iy namunani tekshiradi. Real fayllarda
#  esa boshqacha holatlar bor — bo'sh operatsiya, nol o'lcham, notanish
#  material, bitta modul, 3000 detal. Algoritm o'zgargach shu korpusni
#  qayta yuritish — yagona ishonchli tekshiruv.
#
#  Ishlatish:
#     .\tests\corpus.ps1                          # hamma fayl
#     .\tests\corpus.ps1 -Take 20                 # birinchi 20 tasi
#     .\tests\corpus.ps1 -Filter "1026*"          # nomi bo'yicha
#     .\tests\corpus.ps1 -Csv natija.csv          # jadval qilib saqlash
#     .\tests\corpus.ps1 -Compare eski.csv        # oldingi yurish bilan solishtirish
#
#  MIJOZ MA'LUMOTI: namuna\Project papkasi .gitignore da — u repoga
#  tushmaydi. Bu skript esa faqat statistika chiqaradi, tarkibni emas.
# ================================================================
param(
  [string]$Dir     = "namuna\Project",
  [int]$Take       = 0,          # 0 = hammasi
  [int]$Batch      = 15,         # bitta sahifada nechta fayl
  [string]$Filter  = "*",
  [string]$Csv     = "",
  [string]$Compare = "",
  [string]$Browser = "",
  [int]$TimeoutSec = 600
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$enc  = New-Object System.Text.UTF8Encoding($false)

# --- brauzer ---
if (-not $Browser) {
  $cand = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $cand) { if (Test-Path $c) { $Browser = $c; break } }
}
if (-not $Browser -or -not (Test-Path $Browser)) { "XATO: Edge/Chrome topilmadi"; exit 1 }

# --- fayllar ---
$dirFull = if ([IO.Path]::IsPathRooted($Dir)) { $Dir } else { Join-Path $root $Dir }
if (-not (Test-Path $dirFull)) { "XATO: papka topilmadi: $dirFull"; exit 1 }
$files = Get-ChildItem -Path $dirFull -Recurse -File -Filter "*.project" |
         Where-Object { $_.Name -like $Filter } |
         Sort-Object FullName
if ($Take -gt 0) { $files = $files | Select-Object -First $Take }
if (-not $files) { "XATO: .project fayl topilmadi"; exit 1 }

"Brauzer : $Browser"
"Papka   : $dirFull"
"Fayl    : $($files.Count) ta  ($Batch tadan)"
""

$idx  = Join-Path $root "index.html"
$html = [System.IO.File]::ReadAllText($idx, [System.Text.Encoding]::UTF8)

$catcher = '<script>window.__ERRORS=[];window.addEventListener("error",function(e){window.__ERRORS.push((e.message||"xato")+" @ "+(e.filename||"?").split("/").pop()+":"+(e.lineno||"?"))});</script>'

# Bir tirnoqli here-string: PowerShell ichiga tegmaydi
$runner = @'
<script>
(function(){
  var OUT = [];
  function until(cond, cb, tries){
    tries = tries || 0;
    if (cond() || tries > 200) { cb(); return; }
    setTimeout(function(){ until(cond, cb, tries + 1); }, 50);
  }
  function num(v, d){ return (typeof v === "number" && isFinite(v)) ? v : d; }

  until(function(){ return typeof PACKS !== "undefined" && PACKS && PACKS.length > 0; }, function(){
    var files = window.__FILES || [];
    for (var i = 0; i < files.length; i++){
      var f = files[i], row = { n: f.n };
      var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
      try {
        var data = parseProject(f.t);
        // yangi buyurtma — eski guruhlar boshqa faylning kodlariga tayangan
        S.rooms = {}; S.sepCls = {}; S.modGroups = []; S.clsGroups = [];
        S.unitNames = {}; S.thickMix = {};
        P = data; CUR = -1; STEP = 0;
        if (!P.rev) P.rev = 0;
        applyCat();
        packAll();
        var items = buildItems();
        var a = auditPacks(PACKS, items);

        var openTom = 0, tot = 0, heavy = 0, over = 0, oddN = 0;
        var maxKg = 0, maxH = 0;
        PACKS.forEach(function(p){
          if (p.kg > maxKg) maxKg = p.kg;
          if (num(p.h,0) > maxH) maxH = p.h;
          if (p.odd){ oddN++; return; }
          if (p.overKg) over++;
          if (p.kg > S.oneMan) heavy++;
          if (!p.layers.length) return;
          tot++;
          if (!tomOK(p.layers[p.layers.length-1], p.base, p.off)) openTom++;
        });
        var wc = {};
        a.warnings.forEach(function(w){ wc[w.code] = (wc[w.code]||0) + 1; });

        row.ok      = 1;
        row.pos     = data.parts.length;
        row.det     = a.stats.itemsExpected;
        row.placed  = a.stats.itemsPlaced;
        row.mat     = data.materials.length;
        row.packs   = PACKS.length;
        row.odd     = oddN;
        row.kg      = Math.round(a.stats.totalKg * 10) / 10;
        row.avg     = Math.round(a.stats.avgKg * 10) / 10;
        row.maxKg   = Math.round(maxKg * 10) / 10;
        row.fill    = Math.round(a.stats.avgFill * 100);
        row.maxH    = Math.round(maxH);
        row.openTom = openTom;
        row.tops    = tot;
        row.heavy   = heavy;
        row.over    = over;
        row.err     = a.errors.length;
        row.errCode = a.errors.slice(0,3).map(function(e){ return e.code; }).join("/");
        row.warn    = a.warnings.length;
        row.warnMap = Object.keys(wc).map(function(k){ return k + ":" + wc[k]; }).join(" ");

        /* v16: SOXTA DETALLAR — haqiqiy eksportlarda xona devori, pol, shift
           kabi obyektlar ham «detal» boʻlib keladi. Ular listdan kesilmaydi,
           demak pochkalanmasligi kerak. Ikki belgi sanaladi. */
        var bigT = 0, noFit = 0, bigKg = 0;
        items.forEach(function(it){
          if (it.T > 40) bigT++;
          var m = it.mat || {};
          var ml = +m.l || 0, mw = +m.w || 0;
          if (ml && mw){
            var fits = (it.L <= ml + 1 && it.W <= mw + 1) || (it.W <= ml + 1 && it.L <= mw + 1);
            if (!fits) noFit++;
          }
          if (it.kg > 200) bigKg++;
        });
        row.bigT = bigT; row.noFit = noFit; row.bigKg = bigKg;
        row.skip = ((DIAG && DIAG.skipped) ? DIAG.skipped : [])
                     .reduce(function(a, x){ return a + (x.q || 1); }, 0);

      } catch(e){
        row.ok = 0;
        row.errCode = String(e && e.message ? e.message : e).slice(0, 90);
      }
      var t1 = (window.performance && performance.now) ? performance.now() : Date.now();
      row.ms = Math.round(t1 - t0);
      OUT.push(row);
    }
    var d = document.createElement("pre");
    d.id = "CORPUSOUT";
    d.textContent = "===CORPUS-START===\n" + JSON.stringify(OUT) + "\n===CORPUS-END===";
    document.body.appendChild(d);
  });
})();
</script>
'@

$iBody = $html.IndexOf("<body>")
$iEnd  = $html.LastIndexOf("</body>")
if ($iBody -lt 0 -or $iEnd -lt 0) { "XATO: index.html tuzilishi kutilganidek emas"; exit 1 }

# Uzun yo'lni o'ngdan kesadi — mijoz papkasi ko'rinib tursin
function Tail42([string]$t){
  if ($t.Length -le 42) { return $t }
  return "…" + $t.Substring($t.Length - 41)
}

$rows = New-Object System.Collections.ArrayList
$batches = [Math]::Ceiling($files.Count / [double]$Batch)
$swAll = [System.Diagnostics.Stopwatch]::StartNew()

for ($b = 0; $b -lt $batches; $b++) {
  $slice = $files | Select-Object -Skip ($b * $Batch) -First $Batch
  $items = @()
  foreach ($f in $slice) {
    $txt = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $rel = $f.FullName.Substring($dirFull.Length).TrimStart('')
    $items += [pscustomobject]@{ n = $rel; t = $txt }
  }
  $dataJs = "<script>window.__FILES = " + (ConvertTo-Json $items -Compress -Depth 4) + ";</script>"

  $page = $html.Insert($iBody + 6, "`n" + $catcher)
  $page = $page.Insert($page.LastIndexOf("</body>"), $dataJs + "`n" + $runner + "`n")
  $tmp = Join-Path $root "_corpus-run.html"
  [System.IO.File]::WriteAllText($tmp, $page, $enc)

  $profile = Join-Path $env:TEMP ("upk-corpus-" + [System.Guid]::NewGuid().ToString("N").Substring(0,8))
  $outFile = Join-Path $env:TEMP ("upk-corpus-dom-" + [System.Guid]::NewGuid().ToString("N").Substring(0,6) + ".txt")
  $bargs = @("--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--disable-extensions",
             "--disable-dev-shm-usage","--user-data-dir=$profile","--virtual-time-budget=600000",
             "--dump-dom", ("file:///" + $tmp.Replace("\","/")))
  $proc = Start-Process -FilePath $Browser -ArgumentList $bargs -NoNewWindow -PassThru -RedirectStandardOutput $outFile
  $proc | Wait-Process -Timeout $TimeoutSec
  if (-not $proc.HasExited) { $proc | Stop-Process -Force }

  $dom = ""
  for ($i = 0; $i -lt 25; $i++) {
    try { $dom = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8); break }
    catch { Start-Sleep -Milliseconds 200 }
  }
  $m = [regex]::Match($dom, '<pre id="CORPUSOUT">(.*?)</pre>', "Singleline")
  if ($m.Success) {
    $json = $m.Groups[1].Value -replace '&lt;','<' -replace '&gt;','>' -replace '&quot;','"' -replace '&amp;','&'
    $json = ($json -split "===CORPUS-START===")[1]
    $json = ($json -split "===CORPUS-END===")[0]
    foreach ($r in (ConvertFrom-Json $json.Trim())) { [void]$rows.Add($r) }
  } else {
    foreach ($f in $slice) {
      $rel = $f.FullName.Substring($dirFull.Length).TrimStart('')
      [void]$rows.Add([pscustomobject]@{ n = $rel; ok = 0; errCode = "sahifa natija bermadi"; ms = 0 })
    }
  }

  Remove-Item $tmp     -Force -ErrorAction SilentlyContinue
  Remove-Item $outFile -Force -ErrorAction SilentlyContinue
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host ("  [{0}/{1}] {2} fayl" -f ($b+1), $batches, $rows.Count)
}
$swAll.Stop()

# ---------------- hisobot ----------------
""
"{0,-42} {1,5} {2,6} {3,7} {4,6} {5,5} {6,6} {7,5} {8,6}" -f "FAYL","DETAL","POCHKA","O'RT.KG","TO'LD","TOM","XATO","OGOH","MS"
"-" * 100
foreach ($r in $rows) {
  if ($r.ok -eq 1) {
    "{0,-42} {1,5} {2,6} {3,7} {4,5}% {5,5} {6,6} {7,5} {8,6}" -f `
      (Tail42 $r.n), $r.det, $r.packs, $r.avg, $r.fill,
      ("$($r.openTom)/$($r.tops)"), $r.err, $r.warn, $r.ms
  } else {
    "{0,-42} {1}" -f (Tail42 $r.n), ("O'QILMADI: " + $r.errCode)
  }
}

$good = @($rows | Where-Object { $_.ok -eq 1 })
$bad  = @($rows | Where-Object { $_.ok -ne 1 })
$errF = @($good | Where-Object { $_.err -gt 0 })
$lost = @($good | Where-Object { $_.placed -ne $_.det })

""
"=" * 100
"JAMI          : {0} fayl, {1} o'qildi, {2} o'qilmadi" -f $rows.Count, $good.Count, $bad.Count
if ($good.Count) {
  $sumDet = ($good | Measure-Object det -Sum).Sum
  $sumPk  = ($good | Measure-Object packs -Sum).Sum
  $sumKg  = ($good | Measure-Object kg -Sum).Sum
  $sumTop = ($good | Measure-Object openTom -Sum).Sum
  $sumTot = ($good | Measure-Object tops -Sum).Sum
  $sumOvr = ($good | Measure-Object over -Sum).Sum
  $avgFil = [Math]::Round((($good | Measure-Object fill -Average).Average), 1)
  $maxKg  = ($good | Measure-Object maxKg -Maximum).Maximum
  $maxMs  = ($good | Measure-Object ms -Maximum).Maximum
  "DETAL         : {0}   POCHKA: {1}   MASSA: {2} kg" -f $sumDet, $sumPk, [Math]::Round($sumKg)
  "O'RTACHA      : {0} kg/pochka   to'ldirish {1}%   eng og'ir pochka {2} kg" -f `
    ([Math]::Round($sumKg / [Math]::Max(1,$sumPk), 1)), $avgFil, $maxKg
  "OCHIQ TOM     : {0} / {1} pochka ({2}%)" -f $sumTop, $sumTot, ([Math]::Round(100.0*$sumTop/[Math]::Max(1,$sumTot),1))
  "ZAXIRALI      : {0} pochka" -f $sumOvr
  "POCHKALANMAGAN: {0} obyekt (xona devori, pol — Diagnostikada roʻyxati bor)" -f (($good | Measure-Object skip -Sum).Sum)
  "AUDIT XATOSI  : {0} faylda" -f $errF.Count
  "DETAL YO'QOLDI: {0} faylda" -f $lost.Count
  "VAQT          : {0} s (eng sekin fayl {1} ms)" -f ([Math]::Round($swAll.Elapsed.TotalSeconds,1)), $maxMs
}
if ($errF.Count) {
  ""
  "AUDIT XATOSI BOR FAYLLAR:"
  foreach ($r in $errF) { "  {0}  —  {1} xato ({2})" -f $r.n, $r.err, $r.errCode }
}
if ($lost.Count) {
  ""
  "DETAL YO'QOLGAN FAYLLAR:"
  foreach ($r in $lost) { "  {0}  —  {1}/{2}" -f $r.n, $r.placed, $r.det }
}
if ($bad.Count) {
  ""
  "O'QILMAGAN FAYLLAR:"
  foreach ($r in $bad) { "  {0}  —  {1}" -f $r.n, $r.errCode }
}

# ---------------- CSV ----------------
if ($Csv) {
  $csvPath = if ([IO.Path]::IsPathRooted($Csv)) { $Csv } else { Join-Path $root $Csv }
  $rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
  ""
  "CSV: $csvPath"
}

# ---------------- solishtirish ----------------
if ($Compare) {
  $cmpPath = if ([IO.Path]::IsPathRooted($Compare)) { $Compare } else { Join-Path $root $Compare }
  if (-not (Test-Path $cmpPath)) { ""; "OGOHLANTIRISH: solishtirish fayli topilmadi: $cmpPath" }
  else {
    $old = @{}
    foreach ($r in (Import-Csv $cmpPath)) { $old[$r.n] = $r }
    ""
    "=" * 100
    "SOLISHTIRISH: $Compare"
    $dPk = 0; $dErr = 0; $dTom = 0; $chg = 0
    foreach ($r in $good) {
      $o = $old[$r.n]
      if (-not $o) { continue }
      $pk = [int]$r.packs - [int]$o.packs
      $er = [int]$r.err   - [int]$o.err
      $tm = [int]$r.openTom - [int]$o.openTom
      $dPk += $pk; $dErr += $er; $dTom += $tm
      if ($pk -ne 0 -or $er -ne 0 -or $tm -ne 0) {
        $chg++
        "  {0,-42} pochka {1,4} -> {2,-4} ({3,3})   xato {4}->{5}   ochiq tom {6}->{7}" -f `
          (Tail42 $r.n), $o.packs, $r.packs,
          ($(if ($pk -gt 0) { "+$pk" } else { "$pk" })), $o.err, $r.err, $o.openTom, $r.openTom
      }
    }
    ""
    "  O'ZGARGAN FAYL : {0}" -f $chg
    "  POCHKA         : {0}" -f $(if ($dPk -gt 0) { "+$dPk (yomonlashdi)" } elseif ($dPk -lt 0) { "$dPk (yaxshilandi)" } else { "0" })
    "  AUDIT XATOSI   : {0}" -f $(if ($dErr -gt 0) { "+$dErr (YOMON)" } elseif ($dErr -lt 0) { "$dErr (yaxshi)" } else { "0" })
    "  OCHIQ TOM      : {0}" -f $(if ($dTom -gt 0) { "+$dTom (yomonlashdi)" } elseif ($dTom -lt 0) { "$dTom (yaxshilandi)" } else { "0" })
  }
}

if ($bad.Count -or $errF.Count -or $lost.Count) { exit 1 }
exit 0
