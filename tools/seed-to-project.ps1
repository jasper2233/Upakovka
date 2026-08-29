# ================================================================
#  SEED -> .project  — namuna XML fayllarni yaratadi
#
#  Nima uchun: bizda tayyor .project fayl yo'q, faqat allaqachon o'qib olingan
#  SEED (JSON) bor. Yuklashni uchdan-uchgacha sinash uchun haqiqiy XML kerak.
#  Bu skript SEED dan parseProject() kutadigan aynan o'sha tuzilmani yasaydi.
#
#  Ishlatish:  .\tools\seed-to-project.ps1
#
#  Natija:
#     namuna\namuna.project        — to'liq buyurtma (SEED ning aynan o'zi)
#     namuna\test-yupqa.project    — 0.6 / 3.2 / 16 mm materiallar sinovi
#
#  PowerShell 5.1. Node.js kerak emas.
# ================================================================
param([switch]$Quiet)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$enc  = New-Object System.Text.UTF8Encoding($false)
$out  = Join-Path $root "namuna"
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

function Say($m){ if (-not $Quiet) { $m } }

# --- XML atribut qiymatini qochirish ---
function X([object]$v){
  if ($null -eq $v) { return "" }
  $s = [string]$v
  $s = $s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;")
  # nazorat belgilari XML da taqiqlangan
  return ($s -replace "[\x00-\x08\x0B\x0C\x0E-\x1F]", "")
}

# --- kant harflari -> atributlar:  T->elt  B->elb  L->ell  R->elr ---
$EDGE = @{ "T" = "elt"; "B" = "elb"; "L" = "ell"; "R" = "elr" }

# ================================================================
#  1. SEED ni o'qish
# ================================================================
$seedPath = Join-Path $root "src\data\seed.js"
if (-not (Test-Path $seedPath)) { "XATO: $seedPath topilmadi"; exit 1 }
$raw = [System.IO.File]::ReadAllText($seedPath, [System.Text.Encoding]::UTF8)

$i0 = $raw.IndexOf("{")
$i1 = $raw.LastIndexOf("}")
if ($i0 -lt 0 -or $i1 -le $i0) { "XATO: seed.js ichida JSON topilmadi"; exit 1 }
$SEED = ($raw.Substring($i0, $i1 - $i0 + 1) | ConvertFrom-Json)

Say "SEED    : $($SEED.name)  ($($SEED.materials.Count) material, $($SEED.parts.Count) pozitsiya)"

# ================================================================
#  2. XML yasovchi umumiy funksiya
# ================================================================
function Build-Project($name, $uuid, $materials, $parts) {
  $sb = New-Object System.Text.StringBuilder

  [void]$sb.AppendLine('<?xml version="1.0" encoding="utf-8"?>')
  [void]$sb.AppendLine('<project name="' + (X $name) + '" project.uuid="' + (X $uuid) + '">')

  # --- 2.1 materiallar: typeId="sheet" ---
  [void]$sb.AppendLine('  <!-- MATERIALLAR: yaxlit list. t = qalinlik (kasr bo''lishi mumkin) -->')
  foreach ($m in $materials) {
    [void]$sb.AppendLine('  <good id="' + (X $m.id) + '" typeId="sheet"' +
      ' name="'  + (X $m.name) + '"' +
      ' l="'     + (X $m.l)    + '"' +
      ' w="'     + (X $m.w)    + '"' +
      ' t="'     + (X $m.t)    + '"' +
      ' count="' + (X $m.sheets) + '"/>')
  }

  # --- 2.2 mahsulotlar: typeId="product", ichida <part> lar ---
  #     mahsulot kodi (pc) bo'yicha guruhlanadi
  $byProd = [ordered]@{}
  foreach ($p in $parts) {
    $k = [string]$p.pc
    if (-not $byProd.Contains($k)) { $byProd[$k] = @() }
    $byProd[$k] += ,$p
  }

  [void]$sb.AppendLine('  <!-- MAHSULOTLAR: har <good typeId="product"> ichida o''z detallari -->')
  $gi = 0
  foreach ($pc in $byProd.Keys) {
    $gi++
    $list = $byProd[$pc]
    $pname = [string]$list[0].p
    [void]$sb.AppendLine('  <good id="G' + $gi + '" typeId="product" name="' + (X $pname) +
                         '" code="' + (X $pc) + '">')
    foreach ($p in $list) {
      $a = '    <part id="' + (X $p.id) + '"' +
           ' code="'  + (X $p.c) + '"' +
           ' name="'  + (X $p.n) + '"' +
           ' l="'     + (X $p.l) + '"' +
           ' w="'     + (X $p.w) + '"' +
           ' count="' + (X $p.q) + '"'
      # kant qirralari
      $eStr = [string]$p.e
      if ($eStr) {
        foreach ($ch in $eStr.ToCharArray()) {
          $key = [string]$ch
          if ($EDGE.ContainsKey($key)) { $a += ' ' + $EDGE[$key] + '="1"' }
        }
        # kant materiali — parser eltMat/elbMat/ellMat/elrMat dan birinchisini oladi
        if ($p.eb) {
          $first = $EDGE[[string]$eStr[0]]
          if ($first) { $a += ' ' + $first + 'Mat="' + (X $p.eb) + '"' }
        }
      }
      [void]$sb.AppendLine($a + '/>')
    }
    [void]$sb.AppendLine('  </good>')
  }

  # --- 2.3 raskroy operatsiyalari: detal <-> material bog'lanishi ---
  #     parser materialni FAQAT shu yerdan oladi
  $byMat = [ordered]@{}
  foreach ($p in $parts) {
    $k = [string]$p.m
    if (-not $byMat.Contains($k)) { $byMat[$k] = @() }
    $byMat[$k] += ,$p
  }
  [void]$sb.AppendLine('  <!-- RASKROY (CS): detal qaysi materialdan kesilishi. Parser materialni SHU YERDAN oladi -->')
  foreach ($mid in $byMat.Keys) {
    [void]$sb.AppendLine('  <operation typeId="CS">')
    [void]$sb.AppendLine('    <material id="' + (X $mid) + '"/>')
    foreach ($p in $byMat[$mid]) {
      [void]$sb.AppendLine('    <part id="' + (X $p.id) + '"/>')
    }
    [void]$sb.AppendLine('  </operation>')
  }

  [void]$sb.AppendLine('</project>')
  return $sb.ToString()
}

# ================================================================
#  3. Tekshiruv — yozilgan XML ni qayta o'qib nazorat qilamiz
# ================================================================
function Check-Project($path, $expMat, $expPos, $expQty) {
  $ok = $true
  [xml]$doc = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

  $sheets = @($doc.project.good | Where-Object { $_.typeId -eq "sheet" })
  $prods  = @($doc.project.good | Where-Object { $_.typeId -eq "product" })
  $parts  = @($doc.SelectNodes("/project/good[@typeId='product']/part"))
  $csRefs = @($doc.SelectNodes("/project/operation[@typeId='CS']/part"))

  $qty = 0
  foreach ($p in $parts) { $qty += [int]$p.count }

  $ids  = @($parts | ForEach-Object { $_.id })
  $uniq = @($ids | Sort-Object -Unique)

  # DIQQAT: funksiya ichidagi har qanday chiqish qaytariladigan qiymatga qo'shilib ketadi.
  # Shu sabab natijani $script:chkFail orqali beramiz, matnni esa konsolga to'g'ridan yozamiz.
  function T($name, $cond, $info){
    $tail = ""
    if ($info) { $tail = " -- $info" }
    if ($cond) { if (-not $Quiet) { [Console]::WriteLine("    OK   " + $name + $tail) } }
    else       { [Console]::WriteLine("    XATO " + $name + $tail); $script:chkFail++ }
  }

  $script:chkFail = 0
  T "materiallar soni"          ($sheets.Count -eq $expMat)      "$($sheets.Count) / $expMat"
  T "pozitsiyalar soni"         ($parts.Count  -eq $expPos)      "$($parts.Count) / $expPos"
  T "detallar (count) soni"     ($qty          -eq $expQty)      "$qty / $expQty"
  T "part id lari unikal"       ($ids.Count    -eq $uniq.Count)  "$($ids.Count) ta, unikal $($uniq.Count)"
  T "har detal CS da bir marta" ($csRefs.Count -eq $parts.Count) "$($csRefs.Count) havola"
  T "mahsulotlar bor"           ($prods.Count  -gt 0)            "$($prods.Count) ta"
}

# ================================================================
#  4. namuna.project
# ================================================================
$xml1 = Build-Project $SEED.name $SEED.uuid $SEED.materials $SEED.parts
$f1 = Join-Path $out "namuna.project"
[System.IO.File]::WriteAllText($f1, $xml1, $enc)

$expQty1 = 0
foreach ($p in $SEED.parts) { $expQty1 += [int]$p.q }
Say ""
Say "YARATILDI: namuna\namuna.project  ($([math]::Round((Get-Item $f1).Length/1024,1)) KB)"
Check-Project $f1 $SEED.materials.Count $SEED.parts.Count $expQty1
$ok1 = ($script:chkFail -eq 0)

# ================================================================
#  5. test-yupqa.project — YUPQA MATERIAL SINOVI
#     Maqsad: 0.6 mm va 3.2 mm qalinlik butun songa aylanib ketmasligini isbotlash.
#     (v9 da parseInt("0.6") -> 0 bo'lib, material massasi 0 kg chiqardi.)
# ================================================================
$mats2 = @(
  [pscustomobject]@{ id="X1"; name="XDF 0.6 mm orqa devor"; l=2800; w=2070; t=0.6; sheets=6 },
  [pscustomobject]@{ id="X2"; name="HDF 3.2 mm tortma tagi"; l=2800; w=2070; t=3.2; sheets=4 },
  [pscustomobject]@{ id="X3"; name="LDSP 16 mm oq";          l=2750; w=1830; t=16;  sheets=12 }
)
$parts2 = @(
  # 16 mm korpus
  [pscustomobject]@{ id="y01"; c="99_001"; n="BOK CHAP";     p="Sinov shkafi"; pc="990001"; l=1800; w=450; q=2; m="X3"; e="TB"; eb="ABS 2mm oq" },
  [pscustomobject]@{ id="y02"; c="99_002"; n="BOK O'NG";     p="Sinov shkafi"; pc="990001"; l=1800; w=450; q=2; m="X3"; e="TB"; eb="ABS 2mm oq" },
  [pscustomobject]@{ id="y03"; c="99_003"; n="POLKA";        p="Sinov shkafi"; pc="990001"; l=864;  w=430; q=5; m="X3"; e="T";  eb="ABS 0.8mm oq" },
  [pscustomobject]@{ id="y04"; c="99_004"; n="DNO";          p="Sinov shkafi"; pc="990001"; l=864;  w=450; q=1; m="X3"; e="T";  eb="ABS 0.8mm oq" },
  [pscustomobject]@{ id="y05"; c="99_005"; n="TOM";          p="Sinov shkafi"; pc="990001"; l=864;  w=450; q=1; m="X3"; e="T";  eb="ABS 0.8mm oq" },
  [pscustomobject]@{ id="y06"; c="99_006"; n="FASAD";        p="Sinov shkafi"; pc="990001"; l=1770; w=430; q=2; m="X3"; e="TBLR"; eb="ABS 2mm oq" },
  # 0.6 mm orqa devor — ASOSIY SINOV
  [pscustomobject]@{ id="y07"; c="99_101"; n="ORQA DEVOR";   p="Sinov shkafi"; pc="990001"; l=1790; w=890; q=1; m="X1"; e=""; eb="" },
  [pscustomobject]@{ id="y08"; c="99_102"; n="ORQA DEVOR 2"; p="Sinov shkafi"; pc="990001"; l=1200; w=890; q=2; m="X1"; e=""; eb="" },
  [pscustomobject]@{ id="y09"; c="99_103"; n="ORQA DEVOR 3"; p="Sinov shkafi"; pc="990001"; l=890;  w=600; q=4; m="X1"; e=""; eb="" },
  # 3.2 mm tortma tagi
  [pscustomobject]@{ id="y10"; c="99_201"; n="TORTMA TAGI";  p="Sinov shkafi"; pc="990001"; l=820;  w=400; q=4; m="X2"; e=""; eb="" },
  [pscustomobject]@{ id="y11"; c="99_202"; n="TORTMA TAGI 2";p="Sinov shkafi"; pc="990001"; l=600;  w=400; q=2; m="X2"; e=""; eb="" }
)
$xml2 = Build-Project "Yupqa material sinovi" "0006cafe-1111-2222-3333" $mats2 $parts2
$f2 = Join-Path $out "test-yupqa.project"
[System.IO.File]::WriteAllText($f2, $xml2, $enc)

$expQty2 = 0
foreach ($p in $parts2) { $expQty2 += [int]$p.q }
Say ""
Say "YARATILDI: namuna\test-yupqa.project  ($([math]::Round((Get-Item $f2).Length/1024,1)) KB)"
Check-Project $f2 $mats2.Count $parts2.Count $expQty2
$ok2 = ($script:chkFail -eq 0)

# qalinliklar kasr holida saqlanganini alohida tekshiramiz
[xml]$d2 = [System.IO.File]::ReadAllText($f2, [System.Text.Encoding]::UTF8)
$ts = @($d2.project.good | Where-Object { $_.typeId -eq "sheet" } | ForEach-Object { $_.t })
Say ("    OK   qalinliklar XML da -- " + ($ts -join ", ") + " mm")
if ($ts -notcontains "0.6") { Say "    XATO 0.6 mm qalinlik XML ga tushmadi"; $ok2 = $false }

# ================================================================
#  6. konveyr-partiya.project — KONVEYR HOLATI
#     Maqsad: 12 ta BIR XIL parta bitta kroyga berilgan. Kesish uchun bu bitta
#     ish, lekin pochkalash uchun 12 ta alohida birlik.
#
#     Faylda hammasi BITTA <good typeId="product"> ichida — chunki texnolog
#     partiyani yaxlit topshirgan. Ya'ni proekt tuzilishi birlik chegarasini
#     BERMAYDI: good bo'yicha guruhlansa 12 ta parta bitta uyumga tushadi.
#
#     Birlik chegarasi faqat DETAL KODIDA qoladi:
#          990201|01   990201|02 ...   -> 1-parta
#          990202|01   990202|02 ...   -> 2-parta
#     Birinchi 6 belgi = parta raqami, 7-belgidan boshlab detal raqami.
#     Ilovada: «Modul belgisi qayerdan» -> «Detal kodining boshi», 6 belgi.
# ================================================================
$mats3 = @(
  [pscustomobject]@{ id="K1"; name="LDSP 16 mm buk"; l=2750; w=1830; t=16;  sheets=40 },
  [pscustomobject]@{ id="K2"; name="HDF 3 mm orqa";  l=2800; w=2070; t=3;   sheets=8 }
)
# bitta partaning detal to'plami (7-belgidan boshlanadigan raqam bilan)
$model = @(
  [pscustomobject]@{ s="01"; n="STOL USTI";      l=1200; w=600; q=1; m="K1"; e="TBLR"; eb="ABS 2mm buk" },
  [pscustomobject]@{ s="02"; n="YON PANEL CHAP"; l=720;  w=550; q=1; m="K1"; e="TL";   eb="ABS 2mm buk" },
  [pscustomobject]@{ s="03"; n="YON PANEL O'NG"; l=720;  w=550; q=1; m="K1"; e="TL";   eb="ABS 2mm buk" },
  [pscustomobject]@{ s="04"; n="ORQA TAYANCH";   l=1140; w=180; q=1; m="K1"; e="T";    eb="ABS 0.8mm buk" },
  [pscustomobject]@{ s="05"; n="POLKA";          l=1100; w=300; q=1; m="K1"; e="T";    eb="ABS 0.8mm buk" },
  [pscustomobject]@{ s="06"; n="ORQA DEVOR";     l=1140; w=680; q=1; m="K2"; e="";     eb="" }
)
$UNITS  = 12                       # nechta parta bitta kroyda
$parts3 = @()
$pi = 0
for ($u = 1; $u -le $UNITS; $u++) {
  $unitCode = "9902" + ("0" + $u).Substring(("0" + $u).Length - 2)   # 990201..990212
  foreach ($d in $model) {
    $pi++
    $parts3 += ,([pscustomobject]@{
      id = "k" + $pi
      c  = $unitCode + $d.s        # 8 belgi: 6 = parta, 7-8 = detal
      n  = $d.n
      p  = "Parta PS-120"          # hamma parta bir xil model
      pc = "990120"                # BITTA good — tuzilish birlikni bermaydi
      l  = $d.l; w = $d.w; q = $d.q; m = $d.m; e = $d.e; eb = $d.eb
    })
  }
}
$xml3 = Build-Project "Konveyr partiya - 12 ta parta" "0012c0de-4444-5555-6666" $mats3 $parts3
$f3 = Join-Path $out "konveyr-partiya.project"
[System.IO.File]::WriteAllText($f3, $xml3, $enc)

$expQty3 = 0
foreach ($p in $parts3) { $expQty3 += [int]$p.q }
Say ""
Say "YARATILDI: namuna\konveyr-partiya.project  ($([math]::Round((Get-Item $f3).Length/1024,1)) KB)"
Check-Project $f3 $mats3.Count $parts3.Count $expQty3
$ok3 = ($script:chkFail -eq 0)

# kod tuzilishini alohida tekshiramiz: 8 belgi, 6-prefiks bo'yicha 12 ta birlik
[xml]$d3 = [System.IO.File]::ReadAllText($f3, [System.Text.Encoding]::UTF8)
$codes = @($d3.project.good | Where-Object { $_.typeId -eq "product" } |
           ForEach-Object { $_.part } | ForEach-Object { $_.code })
$goods = @($d3.project.good | Where-Object { $_.typeId -eq "product" }).Count
$pref  = @($codes | ForEach-Object { $_.Substring(0,6) } | Sort-Object -Unique)
$badLen = @($codes | Where-Object { $_.Length -ne 8 }).Count
Say ("    OK   <good typeId=product> soni -- " + $goods + " (birlik chegarasi tuzilishda YO'Q)")
Say ("    OK   kod uzunligi 8 emas -- " + $badLen + " ta")
Say ("    OK   6-belgili prefikslar -- " + $pref.Count + " ta: " + ($pref[0..2] -join ", ") + " ...")
if ($goods -ne 1)          { Say "    XATO good bitta bo'lishi kerak edi";              $ok3 = $false }
if ($badLen -ne 0)         { Say "    XATO hamma kod 8 belgi bo'lishi kerak";           $ok3 = $false }
if ($pref.Count -ne $UNITS){ Say ("    XATO prefiks soni " + $UNITS + " bo'lishi kerak"); $ok3 = $false }

# ================================================================
#  7. komplekt-5modul.project — TUZILISHI YIQILGAN KOMPLEKT
#     Maqsad: faylda BITTA <good typeId="product"> bo'lsa-yu, ichida bir nechta
#     MUSTAQIL mebel bo'lsa, tizim ularni detal kodi prefiksidan ajratishi.
#
#     Bu haqiqiy Gib Lab eksportlarining odatiy shakli: konstruktor butun
#     komplektni bitta mahsulot qilib topshiradi, birlik chegarasi esa faqat
#     kodda qoladi:  01_001 karavot ... 05_016 tremo.
#     Tuzilishga tayanilsa beshala mebel bitta pochkaga aralashib ketardi.
#
#     Ilgari bu holat namuna\komplekt-5modul ... .project (haqiqiy mijoz buyurtmasi) bilan
#     tekshirilardi. U ochiq repoga chiqmasligi kerak, shuning uchun bu yerda
#     o'sha SHAKL sun'iy ma'lumot bilan qayta yasaladi.
# ================================================================
$mats4 = @(
  [pscustomobject]@{ id="S1"; name="LDSP 16 mm oq";  l=2750; w=1830; t=16; sheets=22 },
  [pscustomobject]@{ id="S2"; name="XDF 3 mm orqa";  l=2800; w=2070; t=3;  sheets=5 }
)
# har modul: nomi + detallari. Kod prefiksi = modul raqami, ajratgich "_"
$MODULLAR = @(
  [pscustomobject]@{ pre="01"; nom="karavot"; det=@(
    [pscustomobject]@{ n="GOLI";       l=250;  w=292;  q=2; m="S1"; e="";     eb="" },
    [pscustomobject]@{ n="BOK";        l=2100; w=350;  q=2; m="S1"; e="T";    eb="ABS 2mm oq" },
    [pscustomobject]@{ n="TEPA";       l=1980; w=420;  q=1; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="POL GOLI";   l=1900; w=300;  q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="OYOQ";       l=180;  w=120;  q=4; m="S1"; e="";     eb="" }) },
  [pscustomobject]@{ pre="02"; nom="tumba chap"; det=@(
    [pscustomobject]@{ n="BOK";        l=480;  w=382;  q=2; m="S1"; e="T";    eb="ABS 2mm oq" },
    [pscustomobject]@{ n="TOM";        l=420;  w=382;  q=1; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="POL";        l=420;  w=382;  q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="FASAD";      l=430;  w=200;  q=2; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="SOKOL";      l=420;  w=80;   q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="XDF ORT";    l=470;  w=372;  q=1; m="S2"; e="";     eb="" }) },
  [pscustomobject]@{ pre="03"; nom="tumba o`ng"; det=@(
    [pscustomobject]@{ n="BOK";        l=480;  w=382;  q=2; m="S1"; e="T";    eb="ABS 2mm oq" },
    [pscustomobject]@{ n="TOM";        l=420;  w=382;  q=1; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="POL";        l=420;  w=382;  q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="FASAD";      l=430;  w=200;  q=2; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="SOKOL";      l=420;  w=80;   q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="XDF ORT";    l=470;  w=372;  q=1; m="S2"; e="";     eb="" }) },
  [pscustomobject]@{ pre="04"; nom="shkaf"; det=@(
    [pscustomobject]@{ n="BOK";        l=2084; w=560;  q=3; m="S1"; e="T";    eb="ABS 2mm oq" },
    [pscustomobject]@{ n="TOM";        l=1499; w=560;  q=1; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="POL";        l=1499; w=560;  q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="POLKA";      l=730;  w=540;  q=4; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="QOSH";       l=1499; w=120;  q=1; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="SOKOL";      l=1499; w=100;  q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="XDF ORT";    l=2074; w=1489; q=1; m="S2"; e="";     eb="" }) },
  [pscustomobject]@{ pre="05"; nom="tremo"; det=@(
    [pscustomobject]@{ n="TOM";        l=1000; w=450;  q=1; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="BOK";        l=979;  w=450;  q=3; m="S1"; e="T";    eb="ABS 2mm oq" },
    [pscustomobject]@{ n="POL";        l=940;  w=450;  q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="RAMKA";      l=900;  w=90;   q=2; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="FASAD";      l=470;  w=430;  q=2; m="S1"; e="TBLR"; eb="ABS 2mm oq" },
    [pscustomobject]@{ n="SOKOL";      l=940;  w=80;   q=1; m="S1"; e="T";    eb="ABS 0.8mm oq" },
    [pscustomobject]@{ n="XDF ORT";    l=990;  w=940;  q=1; m="S2"; e="";     eb="" }) }
)
$parts4 = @()
$pi4 = 0
foreach ($mod in $MODULLAR) {
  $di = 0
  foreach ($d in $mod.det) {
    $di++; $pi4++
    $kod = $mod.pre + "_" + ("00" + $di).Substring(("00" + $di).Length - 3)
    $parts4 += ,([pscustomobject]@{
      id = "s" + $pi4
      c  = $kod
      n  = $kod + " " + $d.n
      p  = "Komplekt"      # hamma modul BITTA mahsulot nomi ostida
      pc = "990500"        # BITTA good — tuzilish birlikni bermaydi
      l  = $d.l; w = $d.w; q = $d.q; m = $d.m; e = $d.e; eb = $d.eb
    })
  }
}
$xml4 = Build-Project "Namuna komplekt - 5 modul" "0005c0de-7777-8888-9999" $mats4 $parts4
$f4 = Join-Path $out "komplekt-5modul.project"
[System.IO.File]::WriteAllText($f4, $xml4, $enc)

$expQty4 = 0
foreach ($p in $parts4) { $expQty4 += [int]$p.q }
Say ""
Say "YARATILDI: namuna\komplekt-5modul.project  ($([math]::Round((Get-Item $f4).Length/1024,1)) KB)"
Check-Project $f4 $mats4.Count $parts4.Count $expQty4
$ok4 = ($script:chkFail -eq 0)

# asosiy invariant: bitta good, lekin kodda 5 ta prefiks
[xml]$d4 = [System.IO.File]::ReadAllText($f4, [System.Text.Encoding]::UTF8)
$goods4 = @($d4.project.good | Where-Object { $_.typeId -eq "product" }).Count
$codes4 = @($d4.project.good | Where-Object { $_.typeId -eq "product" } |
            ForEach-Object { $_.part } | ForEach-Object { $_.code })
$pref4  = @($codes4 | ForEach-Object { $_.Split("_")[0] } | Sort-Object -Unique)
Say ("    OK   <good typeId=product> soni -- " + $goods4 + " (birlik chegarasi tuzilishda YO'Q)")
Say ("    OK   kod prefikslari -- " + $pref4.Count + " ta: " + ($pref4 -join ", "))
if ($goods4 -ne 1)    { Say "    XATO good bitta bo'lishi kerak edi";        $ok4 = $false }
if ($pref4.Count -ne 5){ Say "    XATO prefiks soni 5 bo'lishi kerak";       $ok4 = $false }

Say ""
if ($ok1 -and $ok2 -and $ok3 -and $ok4) { Say "TAYYOR: to'rtala namuna fayl yaratildi va tekshiruvdan o'tdi"; exit 0 }
Say "OGOHLANTIRISH: tekshiruvda nomuvofiqlik bor -- yuqoriga qarang"
exit 1
