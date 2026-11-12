# ================================================================
#  LABELS — termal chek STIKERGA SIGʻADIMI (har chek = bitta sahifa)
#
#  Nima qiladi: namuna loyihaning HAMMA pochka cheklarini (va 60 ta detal
#  chekini) tanlangan oʻlchamda PDF ga chop etadi va sahifalarni sanaydi.
#  Chek stikerga sigʻmasa u ikkinchi stikerga toshib chiqadi — sahifa soni
#  chek sonidan oshadi. v22 gacha shunday edi: 80×60 da 51 ta pochka cheki
#  102 sahifa, 58×40 da 237 sahifa berardi.
#
#  Ishlatish:
#     .\tests\labels.ps1                          # 58x40, 80x60, 100x70
#     .\tests\labels.ps1 -Sizes 80x60,c70x50      # c = qoʻlda oʻlcham (eni x boʻyi)
#     .\tests\labels.ps1 -Keep                    # PDF larni qoldiradi (tests\lbl-*.pdf)
#
#  Faqat SANAYDI. Mazmun koʻrinishini tekshirish uchun PDF ni oching.
# ================================================================
param(
  [string[]]$Sizes = @("58x40", "80x60", "100x70"),
  [string]$Browser = "",
  [switch]$Keep
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$enc  = New-Object System.Text.UTF8Encoding($false)
if (-not $Browser) {
  foreach ($c in @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                   "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                   "C:\Program Files\Google\Chrome\Application\chrome.exe")) {
    if (Test-Path $c) { $Browser = $c; break }
  }
}
if (-not $Browser) { "XATO: Edge/Chrome topilmadi"; exit 1 }

$tester = @'
(function(){
  window.print = function(){};
  function until(cond, cb, n){ n = n||0; if (cond() || n > 300){ cb(); return; } setTimeout(function(){ until(cond, cb, n+1); }, 50); }
  until(function(){ return typeof PACKS !== "undefined" && PACKS.length && !BUSY; }, function(){
    var cfg = window.__CFG;
    var cm = /^c(\d+)x(\d+)$/.exec(cfg.size);
    if (cm){ S.labelSize = "custom"; S.labelW = +cm[1]; S.labelH = +cm[2]; } else S.labelSize = cfg.size;
    applyPageSize();
    var sheet = document.getElementById("sheet"), html = '<div class="lbls">', n = 0;
    if (cfg.kind === "pack"){
      PACKS.forEach(function(p, i){ html += packLabelHTML(p, "pq" + i); });
      sheet.innerHTML = html + "</div>";
      PACKS.forEach(function(p, i){ drawQR(document.getElementById("pq" + i), packQR(p)); });
      n = PACKS.length;
    } else {
      var all = []; PACKS.forEach(function(p){ p.seq.forEach(function(s){ all.push([p, s]); }); });
      all = all.slice(0, 60);
      all.forEach(function(x, i){ html += labelHTML(x[0], x[1], "dq" + i); });
      sheet.innerHTML = html + "</div>";
      all.forEach(function(x, i){ drawQR(document.getElementById("dq" + i), qrText(x[0], x[1])); });
      n = all.length;
    }
    document.title = "N=" + n;
  });
})();
'@

$html = [System.IO.File]::ReadAllText((Join-Path $root "index.html"), [System.Text.Encoding]::UTF8)
$page = Join-Path $root "_labels-run.html"
$bad = 0
"Brauzer : $Browser"
foreach ($size in $Sizes) {
  foreach ($kind in @("pack", "part")) {
    $inj = "<script>`nwindow.__CFG = { size:'$size', kind:'$kind' };`n" + $tester + "`n</script>`n"
    $i = $html.LastIndexOf("</body>")
    [System.IO.File]::WriteAllText($page, $html.Substring(0, $i) + $inj + $html.Substring($i), $enc)
    $ud  = Join-Path $env:TEMP ("upk-lbl-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
    $pdf = Join-Path $PSScriptRoot ("lbl-$kind-$size.pdf")
    $dom = Join-Path $env:TEMP ("upk-lbl-dom-" + [guid]::NewGuid().ToString("N").Substring(0, 6) + ".txt")
    $common = @("--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--user-data-dir=$ud",
                "--virtual-time-budget=60000")
    $url = "file:///" + $page.Replace("\", "/")
    # 1) chek soni (sarlavhadan), 2) PDF
    Start-Process -FilePath $Browser -ArgumentList ($common + @("--dump-dom", $url)) -NoNewWindow -Wait `
      -RedirectStandardOutput $dom | Out-Null
    $want = [regex]::Match([System.IO.File]::ReadAllText($dom), '<title>N=(\d+)</title>').Groups[1].Value
    Start-Process -FilePath $Browser -ArgumentList ($common + @("--no-pdf-header-footer", "--print-to-pdf=$pdf", $url)) `
      -NoNewWindow -Wait | Out-Null
    $t = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($pdf))
    $got = ([regex]::Matches($t, '/Type\s*/Page[^s]')).Count
    $ok = ($want -ne "" -and [int]$want -eq $got)
    if (-not $ok) { $bad++ }
    "{0}  {1,-6} {2,-8} chek={3,-4} sahifa={4}" -f ($(if ($ok) { "OK  " } else { "XATO" })), $kind, $size, $want, $got
    if (-not $Keep) { Remove-Item $pdf -Force -ErrorAction SilentlyContinue }
    Remove-Item $dom -Force -ErrorAction SilentlyContinue
    try { Remove-Item $ud -Recurse -Force -ErrorAction Stop } catch { }
  }
}
Remove-Item $page -Force -ErrorAction SilentlyContinue
if ($bad) { "===> $bad ta oʻlchamda chek stikerga SIGʻMADI"; exit 1 }
"===> HAMMA CHEK BITTA STIKERGA SIGʻADI"
