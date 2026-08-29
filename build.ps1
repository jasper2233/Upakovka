# =============================================================================
#  build.ps1  --  "Upakofka tizimi" ni BITTA offline HTML faylga yig'ish
#
#  Nima qiladi:
#    index.html o'qiladi, undagi LOKAL <link rel="stylesheet" href="..."> va
#    <script src="..."></script> teglari fayl mazmuni bilan almashtiriladi
#    (<style>...</style> / <script>...</script>), natija bitta HTML faylga
#    UTF-8 (BOM'siz) yoziladi. Internet, Node.js, npm KERAK EMAS.
#
#  Ishlatish:
#    powershell -ExecutionPolicy Bypass -File build.ps1
#    powershell -ExecutionPolicy Bypass -File build.ps1 -Out D:\x\bitta.html
#    powershell -ExecutionPolicy Bypass -File build.ps1 -Quiet
#
#  DIQQAT: skript ataylab FAQAT ASCII belgilardan iborat. Windows PowerShell 5.1
#  BOM'siz UTF-8 .ps1 faylni ANSI kodlash deb o'qiydi va maxsus belgilarni
#  buzadi. Shuning uchun HTML ga tushadigan uzun tire [char]0x2014 orqali
#  yasaladi, o' / g' harflari esa oddiy apostrof bilan yoziladi.
# =============================================================================

[CmdletBinding()]
param(
  # Natija fayl yo'li. Standart: <loyiha>\dist\upakofka-tizimi.html
  [string]$Out = "",
  # Hisobotni bosmaslik (xato va ogohlantirishlar baribir chiqadi)
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

# ----------------------------------------------------------------------------
#  0. KICHIK YORDAMCHILAR
# ----------------------------------------------------------------------------

# Oddiy xabar -- -Quiet bo'lsa bosilmaydi
function Say([string]$t) {
  if (-not $Quiet) { Write-Host $t }
}

# Rangli xabar -- -Quiet bo'lsa bosilmaydi
function SayC([string]$t, [string]$color) {
  if (-not $Quiet) { Write-Host $t -ForegroundColor $color }
}

# Xato: har doim ko'rinadi
function Err([string]$t) {
  Write-Host ("XATO: " + $t) -ForegroundColor Red
}

# Ogohlantirish: har doim ko'rinadi
function Warn([string]$t) {
  Write-Host ("OGOH: " + $t) -ForegroundColor Yellow
}

# Faylni UTF-8 da o'qish. Boshidagi BOM belgisi (U+FEFF) olib tashlanadi,
# aks holda u singdirilgan matn o'rtasida axlat belgi bo'lib qoladi.
function Read-Utf8([string]$path) {
  $t = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  if ($t.Length -gt 0 -and $t[0] -eq [char]0xFEFF) { $t = $t.Substring(1) }
  return $t
}

# Faylni UTF-8 (BOM'SIZ) yozish
function Write-Utf8([string]$path, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

# Tegdan atribut qiymatini olish: "href", "src", "rel" ...
# Qo'shtirnoq, apostrof va qo'shtirnoqsiz yozuvni ham tushunadi.
# (?<![-\w]) -- nom oldida harf yoki tire bo'lmasin, aks holda "data-rel=" ni
# "rel=" deb o'qib yuborardi.
function Get-Attr([string]$tag, [string]$name) {
  $rx = '(?is)(?<![-\w])' + $name + '\s*=\s*(?:"([^"]*)"|''([^'']*)''|([^\s>]+))'
  $m = [regex]::Match($tag, $rx)
  if (-not $m.Success) { return $null }
  if ($m.Groups[1].Success) { return $m.Groups[1].Value }
  if ($m.Groups[2].Success) { return $m.Groups[2].Value }
  return $m.Groups[3].Value
}

# Havola tashqimi? http:, https:, //, data:, blob:, file:, mailto:, # -- tegilmaydi
function Test-External([string]$u) {
  if ($u -eq $null) { return $true }
  if ($u.Trim().Length -eq 0) { return $true }
  return ($u -match '^(?i)\s*(?:https?:|//|data:|blob:|file:|mailto:|#)')
}

# Havola INTERNETdan keladimi? (hisobot uchun: data:/# lar bu yerga kirmaydi)
function Test-Remote([string]$u) {
  if ($u -eq $null) { return $false }
  return ($u -match '^(?i)\s*(?:https?:|//)')
}

# Baytni KB ga o'girish (hisobot uchun). Natija -- MATN, chunki Format-Table
# sonni tizim lokali bilan ("15,6") bosadi, matn esa hamma joyda bir xil.
function ToKb($bytes) {
  $kb = [math]::Round(([double]$bytes) / 1024, 1)
  return $kb.ToString("0.0", [System.Globalization.CultureInfo]::InvariantCulture)
}

# ----------------------------------------------------------------------------
#  1. YO'LLAR
# ----------------------------------------------------------------------------

$Root = $PSScriptRoot
if ([string]::IsNullOrEmpty($Root)) { $Root = (Get-Location).Path }

$Src = Join-Path $Root "index.html"

if ([string]::IsNullOrEmpty($Out)) {
  $Dst = Join-Path $Root "dist\upakofka-tizimi.html"
} elseif ([System.IO.Path]::IsPathRooted($Out)) {
  $Dst = $Out
} else {
  $Dst = Join-Path $Root $Out
}
$Dst = [System.IO.Path]::GetFullPath($Dst)

if (-not (Test-Path -LiteralPath $Src -PathType Leaf)) {
  Err ("bosh fayl topilmadi -> " + $Src)
  Err "build.ps1 loyiha ildizida (index.html yonida) turishi kerak."
  exit 1
}

# --- xavfsizlik: natija manbani yo'q qilib yubormasin ---------------------
$SrcFull = [System.IO.Path]::GetFullPath($Src)
$SrcDir  = [System.IO.Path]::GetFullPath((Join-Path $Root "src")) + "\"

if ($Dst.ToLower() -eq $SrcFull.ToLower()) {
  Err "-Out index.html ning o'ziga ishora qilyapti -- manba fayl yo'q qilinardi."
  Err "Boshqa nom bering, masalan: -Out dist\upakofka-tizimi.html"
  exit 1
}
if ($Dst.ToLower().StartsWith($SrcDir.ToLower())) {
  Err ("-Out manba papkasi ichiga ko'rsatyapti -> " + $Dst)
  Err "src\ ichiga yozib bo'lmaydi: keyingi buildda natija o'ziga singdirilardi."
  exit 1
}
if (Test-Path -LiteralPath $Dst -PathType Container) {
  Err ("-Out papkani ko'rsatyapti, fayl kerak -> " + $Dst)
  exit 1
}

Say ""
SayC "  UPAKOFKA TIZIMI -- bir faylli versiyani yig'ish" Cyan
Say  ("  manba : " + $Src)
Say  ("  natija: " + $Dst)
Say ""

$html = Read-Utf8 $Src

# ----------------------------------------------------------------------------
#  2. TEGLARNI TOPISH VA SINGDIRISH
#
#  Ikki xil teg qidiriladi:
#    <link ...>                       -- faqat rel="stylesheet" bo'lganlari
#    <script ... src="..."></script>  -- src atributi bor bo'lganlari
#  Ichki (src'siz) <script> bloklari bu naqshga tushmaydi: <script> dan keyin
#  darhol ">" keladi, [^>]* esa ">" dan o'tolmaydi.
# ----------------------------------------------------------------------------

$rxTags = '(?is)<link\b[^>]*>|<script\b[^>]*\bsrc\s*=[^>]*>\s*</script\s*>'
$hits   = [regex]::Matches($html, $rxTags)

$rows    = @()          # hisobot jadvali
$ext     = @()          # tashqi (o'zgarishsiz qoldirilgan) havolalar
$missing = @()          # topilmagan lokal fayllar
$seen    = @{}          # takror singdirishni aniqlash uchun
$totBytes = 0

$sb  = New-Object System.Text.StringBuilder
$pos = 0

foreach ($m in $hits) {

  # tegdan oldingi matn
  [void]$sb.Append($html.Substring($pos, $m.Index - $pos))
  $pos = $m.Index + $m.Length

  $tag    = $m.Value
  $isLink = ($tag -match '(?i)^<link\b')
  $kind   = "JS"
  $url    = $null
  $media  = $null

  if ($isLink) {
    # faqat uslublar jadvali singdiriladi; preconnect / icon / preload tegilmaydi
    $rel = Get-Attr $tag "rel"
    if (($rel -eq $null) -or ($rel -notmatch '(?i)\bstylesheet\b')) {
      $oth = Get-Attr $tag "href"
      if (Test-Remote $oth) { $ext += $oth }   # hisobotda ko'rinsin
      [void]$sb.Append($tag)
      continue
    }
    $kind  = "CSS"
    $url   = Get-Attr $tag "href"
    $media = Get-Attr $tag "media"
  } else {
    $url = Get-Attr $tag "src"

    # <script> ni singdirish uning bajarilish tartibini o'zgartiradi:
    # defer/async yo'qoladi, type="module" esa umuman ishlamay qoladi.
    $sType = Get-Attr $tag "type"
    if (($sType -ne $null) -and ($sType -match '(?i)module')) {
      Warn ("type=""module"" skript singdirilmoqda -> " + $url)
      Warn "      file:// da modul CORS bilan bloklanadi -- klassik skriptga o'tkazing."
    } elseif (($sType -ne $null) -and ($sType.Trim().Length -gt 0) -and
              ($sType -notmatch '(?i)^\s*(?:text/javascript|application/javascript|module)\s*$')) {
      Warn ("noma'lum type=""" + $sType + """ skript oddiy <script> ga aylantirildi -> " + $url)
    }
    if ($tag -match '(?i)\s(?:defer|async)(?=[\s=>/])') {
      Warn ("defer/async atributi yo'qoladi -> " + $url + " (skript endi shu joyda darhol bajariladi)")
    }
  }

  # tashqi havola -- o'zgarishsiz qoldiriladi (masalan Google Fonts)
  if (Test-External $url) {
    if (($url -ne $null) -and ($url.Trim().Length -gt 0)) { $ext += $url }
    [void]$sb.Append($tag)
    continue
  }

  # "src/js/01-qr.js?v=3#x" -> "src/js/01-qr.js"
  $clean = ($url -split '[?#]')[0]
  $relFs = $clean -replace '/', '\'
  $relFs = $relFs -replace '^\.\\', ''
  $relFs = $relFs -replace '^\\', ''

  $full = ""
  try {
    $full = [System.IO.Path]::GetFullPath((Join-Path $Root $relFs))
  } catch {
    $full = ""
  }

  # topilmasa va yo'lda %XX bo'lsa -- URL kodlashini yechib yana urinamiz
  # (masalan href="src/css/mening%20uslubim.css")
  if (($full -eq "") -or (-not (Test-Path -LiteralPath $full -PathType Leaf))) {
    if ($relFs -match '%[0-9A-Fa-f]{2}') {
      try {
        $alt = [System.IO.Path]::GetFullPath((Join-Path $Root ([System.Uri]::UnescapeDataString($relFs))))
        if (Test-Path -LiteralPath $alt -PathType Leaf) { $full = $alt }
      } catch {
      }
    }
  }

  if (($full -eq "") -or (-not (Test-Path -LiteralPath $full -PathType Leaf))) {
    # yo'l topilmadi -- yig'ish to'xtaydi (pastda), lekin avval hammasi sanaladi
    $missing += ($clean + "   ->   " + (Join-Path $Root $relFs))
    [void]$sb.Append($tag)
    continue
  }

  if ($seen.ContainsKey($full.ToLower())) {
    Warn ("bu fayl index.html da bir necha marta ulangan -> " + $clean)
  }
  $seen[$full.ToLower()] = $true

  $body  = Read-Utf8 $full
  $bytes = (Get-Item -LiteralPath $full).Length
  $lines = ([regex]::Matches($body, "`n")).Count + 1
  $totBytes += $bytes

  # HTML parser skriptni erta yopib qo'ymasligi uchun:
  #   </script  ->  <\/script     (JS string ichida uchrashi mumkin)
  #   </style   ->  <\/style      (CSS string ichida uchrashi mumkin)
  if ($body -match '(?i)</script') {
    $body = $body -replace '(?i)</script', '<\/script'
    Say ("        (" + $clean + ": </script ketma-ketligi ekranlandi)")
  }
  if ($body -match '(?i)</style') {
    $body = $body -replace '(?i)</style', '<\/style'
    Say ("        (" + $clean + ": </style ketma-ketligi ekranlandi)")
  }

  $head = "/* ===== " + $clean + " ===== */"

  if ($kind -eq "CSS") {
    # media="print" kabi shart yo'qolib ketmasin -- <style> ga ko'chiriladi
    $mAttr = ""
    if (($media -ne $null) -and ($media.Trim().Length -gt 0) -and ($media -notmatch '(?i)^\s*all\s*$')) {
      $mAttr = ' media="' + ($media -replace '"', '&quot;') + '"'
    }
    $repl = "<style" + $mAttr + ">`r`n" + $head + "`r`n" + $body + "`r`n</style>"
  } else {
    $repl = "<script>`r`n" + $head + "`r`n" + $body + "`r`n</script>"
  }
  [void]$sb.Append($repl)

  $rows += [PSCustomObject][ordered]@{
    "Tur"      = $kind
    "Fayl"     = $clean
    "Qator"    = $lines
    "Hajm, KB" = (ToKb $bytes)
  }
}

# oxirgi tegdan keyingi matn
[void]$sb.Append($html.Substring($pos))
$outText = $sb.ToString()

# ----------------------------------------------------------------------------
#  3. TOPILMAGAN FAYLLAR -- to'xtash
# ----------------------------------------------------------------------------

if ($missing.Count -gt 0) {
  Write-Host ""
  Err ("index.html da ko'rsatilgan " + $missing.Count + " ta fayl topilmadi:")
  foreach ($x in $missing) { Write-Host ("       " + $x) -ForegroundColor Red }
  Write-Host ""
  Err "yig'ish to'xtatildi -- hech narsa yozilmadi."
  exit 1
}

if ($rows.Count -eq 0) {
  Write-Host ""
  Err "index.html ichida singdiriladigan lokal <link>/<script> topilmadi."
  Err "Yo'llar nisbiy bo'lishi kerak, masalan: src=""src/js/01-qr.js""."
  exit 1
}

# ----------------------------------------------------------------------------
#  4. <head> ichiga versiya izohi
# ----------------------------------------------------------------------------

$dash  = [string][char]0x2014                          # uzun tire
$stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm")
$verc  = "<!-- Upakofka tizimi " + $dash + " build " + $stamp + " -->"

$mHead = [regex]::Match($outText, '(?is)<head\b[^>]*>')
if ($mHead.Success) {
  $cut = $mHead.Index + $mHead.Length
  $outText = $outText.Substring(0, $cut) + "`r`n" + $verc + $outText.Substring($cut)
} else {
  $mHead = [regex]::Match($outText, '(?is)</head\s*>')
  if ($mHead.Success) {
    $outText = $outText.Substring(0, $mHead.Index) + $verc + "`r`n" + $outText.Substring($mHead.Index)
  } else {
    Warn "<head> topilmadi -- versiya izohi qo'yilmadi."
  }
}

# ----------------------------------------------------------------------------
#  5. YOZISH (UTF-8, BOM'SIZ)
# ----------------------------------------------------------------------------

$dstDir = Split-Path -Parent $Dst
if (-not (Test-Path -LiteralPath $dstDir)) {
  New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
}

Write-Utf8 $Dst $outText
$outLen = (Get-Item -LiteralPath $Dst).Length

# ----------------------------------------------------------------------------
#  6. HISOBOT
# ----------------------------------------------------------------------------

if (-not $Quiet) {
  Write-Host ""
  ($rows | Format-Table -AutoSize | Out-String).TrimEnd() | Write-Host
  Write-Host ""
  Write-Host ("  singdirildi : " + $rows.Count + " fayl, jami " + (ToKb $totBytes) + " KB")
  Write-Host ("  natija      : " + $Dst)
  Write-Host ("  hajmi       : " + (ToKb $outLen) + " KB (" + $outLen + " bayt)")
  Write-Host ("  vaqt        : " + $stamp)
  if ($ext.Count -gt 0) {
    Write-Host ("  tashqi      : " + $ext.Count + " havola o'zgarishsiz qoldirildi")
    foreach ($u in $ext) { Write-Host ("                " + $u) -ForegroundColor DarkGray }
  }
  Write-Host ""
}

# ----------------------------------------------------------------------------
#  7. TEKSHIRUVLAR
# ----------------------------------------------------------------------------

$fatal = 0

# 7.0 -- fayl boshida BOM bo'lmasin (bo'lsa brauzer uni matn deb ko'rsatadi)
$b3 = $null
$fs = $null
try {
  $fs = [System.IO.File]::OpenRead($Dst)
  $b3 = New-Object 'byte[]' 3
  [void]$fs.Read($b3, 0, 3)
} catch {
  Warn "BOM tekshiruvi bajarilmadi (fayl band bo'lishi mumkin)."
  $b3 = $null
} finally {
  if ($fs -ne $null) { $fs.Dispose() }
}
if ($b3 -ne $null) {
  if (($b3[0] -eq 0xEF) -and ($b3[1] -eq 0xBB) -and ($b3[2] -eq 0xBF)) {
    Err "natija faylida BOM bor -- kutilmagan holat, yozuvchi kodni tekshiring."
    $fatal = 1
  }
}

# 7.1 -- src/ ga ishora qiluvchi havola qolmasin
$leftSrc = [regex]::Matches($outText, '(?i)\b(?:src|href)\s*=\s*["'']\s*(?:\./)?src/[^"'']*')
if ($leftSrc.Count -gt 0) {
  Err ("natijada src/ ga ishora qiluvchi " + $leftSrc.Count + " ta havola qoldi:")
  $n = 0
  foreach ($h in $leftSrc) {
    Write-Host ("       " + $h.Value) -ForegroundColor Red
    $n++
    if ($n -ge 8) { break }
  }
  $fatal = 1
}

# 7.2 -- boshqa lokal (nisbiy) havolalar qolganmi? bu faqat ogohlantirish:
#        file:// da ochilganda ular yuklanmasligi mumkin
$rxLocal  = '(?i)\b(?:src|href)\s*=\s*"(?!https?:|//|data:|blob:|mailto:|#|javascript:)([^"]+)"'
$leftLoc  = [regex]::Matches($outText, $rxLocal)
if ($leftLoc.Count -gt 0) {
  Warn ("natijada " + $leftLoc.Count + " ta nisbiy havola bor (tekshirib chiqing):")
  $n = 0
  foreach ($h in $leftLoc) {
    Write-Host ("       " + $h.Groups[1].Value) -ForegroundColor Yellow
    $n++
    if ($n -ge 8) { break }
  }
}

# 7.3 -- <script ...> va </script> teglari soni teng bo'lsin
$op = ([regex]::Matches($outText, '(?i)<script\b')).Count
$cl = ([regex]::Matches($outText, '(?i)</script\s*>')).Count
if ($op -ne $cl) {
  Err ("<script> teglari muvozanati buzilgan: ochilgan " + $op + ", yopilgan " + $cl)
  Err "sabab odatda JS matni ichidagi '<script' satri bo'ladi -- uni kodda"
  Err "'<scr' + 'ipt' ko'rinishida bo'lib yozing."
  $fatal = 1
} else {
  Say ("  OK: <script> muvozanati -- " + $op + " ta juft")
}

# 7.35 -- NUL bayt bo'lmasin.
# Sabab: manba faylni tashqi vosita bilan tahrirlaganda kodlash buzilib, oddiy
# belgi (masalan probel) o'rniga 0x00 tushib qolishi mumkin. Brauzer buni yutadi
# va testlar ham sezmaydi -- lekin git faylni BINARY deb biladi va bir kun kelib
# diff ham, merge ham ishlamay qoladi. Shuning uchun bu qat'iy xato.
$nul = 0
foreach ($b in [Text.Encoding]::UTF8.GetBytes($outText)) { if ($b -eq 0) { $nul++ } }
if ($nul -gt 0) {
  Err ("natijada " + $nul + " ta NUL (0x00) bayt bor -- manba fayllardan biri buzilgan")
  Err "topish: Get-ChildItem src -Recurse -File | ForEach-Object {"
  Err "  if ([IO.File]::ReadAllBytes($_.FullName) -contains 0) { $_.FullName } }"
  $fatal = 1
} else {
  Say "  OK: NUL bayt yo'q"
}

# 7.4 -- hajm juda kichik bo'lsa ogohlantirish
if ($outLen -lt 102400) {
  Warn ("natija hajmi 100 KB dan kichik (" + (ToKb $outLen) + " KB) -- fayllar to'liq singdirilmagan bo'lishi mumkin")
} else {
  Say ("  OK: hajm -- " + (ToKb $outLen) + " KB")
}

# 7.5 -- tashqi havolalar internetsiz ishlashga xalaqit beradi
if ($ext.Count -gt 0) {
  Warn ("natijada " + $ext.Count + " ta tashqi havola bor -- internetsiz ular yuklanmaydi")
}

# ----------------------------------------------------------------------------
#  8. YAKUN
# ----------------------------------------------------------------------------

Write-Host ""
if ($fatal -ne 0) {
  Err "TEKSHIRUV XATO -- fayl yozildi, lekin undan FOYDALANMANG:"
  Err ("      " + $Dst)
  Write-Host ""
  exit 1
}

SayC ("  TAYYOR: " + $Dst) Green
Say ""
exit 0
