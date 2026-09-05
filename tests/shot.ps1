# ================================================================
#  SHOT — sahifani headless brauzerda ochib SKRINSHOT oladi
#
#  Ishlatish:
#     .\tests\shot.ps1                              # standart ko'rinish
#     .\tests\shot.ps1 -View mgr                    # proekt menejer
#     .\tests\shot.ps1 -View diag                   # diagnostika
#     .\tests\shot.ps1 -View sort                   # saralash (stelyaj)
#     .\tests\shot.ps1 -View work -Steps 6          # 6 detal qo'yilgan holat
#     .\tests\shot.ps1 -Width 1600 -Height 1000
#
#  Natija: tests\shot-<view>.png
# ================================================================
param(
  [ValidateSet("work","mgr","sort","parts","mats","diag","conf")]
  [string]$View = "work",
  [int]$Pack = 1,
  [int]$Steps = 0,
  [int]$Width = 1600,
  [int]$Height = 1000,
  [string]$Out = "",
  [string]$Browser = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$enc  = New-Object System.Text.UTF8Encoding($false)

if (-not $Browser) {
  $cand = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $cand) { if (Test-Path $c) { $Browser = $c; break } }
}
if (-not $Browser) { "XATO: Edge/Chrome topilmadi"; exit 1 }

if (-not $Out) { $Out = Join-Path $PSScriptRoot ("shot-" + $View + ".png") }

$idx  = Join-Path $root "index.html"
$html = [System.IO.File]::ReadAllText($idx, [System.Text.Encoding]::UTF8)

# --- haydovchi: yuklanishni kutadi, kerakli bo'limni ochadi, qadamlarni bosadi ---
$driver = @"
<script>
(function(){
  var VIEW = "$View", PACK = $Pack, STEPS = $Steps;
  function until(cond, cb, n){
    n = n || 0;
    if (cond() || n > 200) { cb(); return; }
    setTimeout(function(){ until(cond, cb, n + 1); }, 50);
  }
  until(function(){ return typeof PACKS !== "undefined" && PACKS.length > 0 && !BUSY; }, function(){
    try {
      if (VIEW !== "work") {
        var b = document.querySelector('.tabs button[data-v="' + VIEW + '"]');
        if (b) b.click();
      } else {
        selectPack(Math.min(PACK, PACKS.length - 1));
        for (var i = 0; i < STEPS; i++) advance();
        draw3D(); draw2D();
      }
    } catch(e){ if (window.console) console.error(e); }
    setTimeout(function(){ document.title = "SHOT-READY"; }, 400);
  });
})();
</script>
"@

$iEnd = $html.LastIndexOf("</body>")
$html = $html.Insert($iEnd, $driver + "`n")
$tmp = Join-Path $root "_shot-run.html"
[System.IO.File]::WriteAllText($tmp, $html, $enc)

$prof = Join-Path $env:TEMP ("upk-shot-" + [System.Guid]::NewGuid().ToString("N").Substring(0,8))
if (Test-Path $Out) { Remove-Item $Out -Force }

$bargs = @(
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--hide-scrollbars", "--force-device-scale-factor=1",
  "--user-data-dir=$prof",
  "--window-size=$Width,$Height",
  "--virtual-time-budget=25000",
  "--screenshot=$Out",
  ("file:///" + $tmp.Replace("\", "/"))
)
$p = Start-Process -FilePath $Browser -ArgumentList $bargs -NoNewWindow -PassThru
# Vaqt tugashi kutilgan holat; usiz $ErrorActionPreference="Stop" skriptni
# to'xtatib, _shot-run.html ni loyiha ildizida qoldirardi.
$p | Wait-Process -Timeout 90 -ErrorAction SilentlyContinue
if (-not $p.HasExited) { $p | Stop-Process -Force }

Remove-Item $tmp -Force -ErrorAction SilentlyContinue
try { Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue } catch { }

if (Test-Path $Out) {
  "TAYYOR: $Out  ($([math]::Round((Get-Item $Out).Length/1024,1)) KB, ${Width}x${Height})"
  exit 0
}
"XATO: skrinshot yaratilmadi"
exit 1
