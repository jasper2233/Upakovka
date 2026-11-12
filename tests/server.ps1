# =====================================================================
#  UPK SERVER SINOVI  (server/upk-server.py)
#
#  1) API: ping, rejalar, joriy reja, saralash holati (rev / 409), xatolar,
#     yo'l chalkashtirish va hajm chegarasi.
#  2) Brauzer orqali to'liq aylanish: dist tizimi serverdan ochiladi, reja
#     serverga joylanadi, saralash holati serverga yoziladi, TV uni o'qiydi,
#     ikkinchi yozuvchi 409 oladi.
#
#  Ishga tushirish (avval .\build.ps1):
#     .\tests\server.ps1
#  Ma'lumot vaqtinchalik papkada, oxirida o'chiriladi.
# =====================================================================
param(
  [int]$Port = 18765,
  [int]$TimeoutSec = 120,
  [string]$Browser = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$py = $null
foreach ($c in @("python", "py")) { try { $py = (Get-Command $c -ErrorAction Stop).Source; break } catch {} }
if (-not $py) { "XATO: Python topilmadi"; exit 1 }
$dist = Join-Path $root "dist\upakofka-tizimi.html"
if (-not (Test-Path $dist)) { "XATO: $dist yo'q -- avval .\build.ps1"; exit 1 }
if (-not $Browser) {
  foreach ($c in @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe")) { if (Test-Path $c) { $Browser = $c; break } }
}
if (-not $Browser) { "XATO: Edge yoki Chrome topilmadi"; exit 1 }

$tag  = [guid]::NewGuid().ToString("N").Substring(0, 8)
$data = Join-Path $env:TEMP ("upk-srv-" + $tag)
New-Item -ItemType Directory -Force $data | Out-Null
$page = Join-Path $data "_e2e.html"

# --- brauzer sahifasi: dist + haydovchi ---
$driver = @'
<script>
(function(){
  var out = [], fin = false;
  function chk(n, ok, info){ out.push((ok ? "OK   | " : "XATO | ") + n + (info != null ? "  ->  " + info : "")); }
  function done(){
    if (fin) return; fin = true;
    if (typeof SRV === "object" && SRV.timer) clearInterval(SRV.timer);
    var d = document.createElement("pre"); d.id = "E2E";
    var M = "===E2E-";      // belgi bo'laklab yig'iladi: skript matnining o'zi natija deb o'qilmasin
    d.textContent = M + "START===\n" + out.join("\n") + "\n" + M + "END===";
    document.body.appendChild(d); document.title = "E2E-DONE";
  }
  function until(cond, cb, n){ n = n || 0; if (cond() || n > 400){ cb(); return; } setTimeout(function(){ until(cond, cb, n + 1); }, 50); }
  window.print = function(){};
  until(function(){ return typeof PACKS !== "undefined" && PACKS.length && !BUSY && typeof SRV === "object" && SRV.on; }, function(){
    var id = "", a = null;
    try {
      chk("server topildi (http dan ochildi, api/ping)", SRV.on === true, location.href);
      SRV.manual = true; if (SRV.timer){ clearInterval(SRV.timer); SRV.timer = null; }
      id = planId();
      srvPublish().then(function(ok){
        chk("reja serverga joylandi", ok === true, id);
        return srvReq("GET", "current");
      }).then(function(r){
        chk("joriy reja = joylangani", r.ok && r.json.sort === id, r.json && r.json.sort);
        return srvReq("GET", "plans");
      }).then(function(r){
        chk("rejalar ro'yxatida, pochka soni bilan", r.ok && r.json.plans.some(function(m){ return m.id === id && m.packs === PACKS.length; }),
            r.json && r.json.plans.length + " ta");
        postSet("sort");
        sortPlan();
        var no = +Object.keys(SORT.plan)[0], p = packByNo(no);
        a = { p:p, st:p.seq[0] };
        var rr = sortScan(qrText(p, a.st));
        chk("saralash posti: skan", rr.ok, rr.cell);
        return srvSortPushNow();
      }).then(function(){
        return srvReq("GET", "state/" + id + "/sort");
      }).then(function(st){
        chk("saralash holati serverda", st.ok && st.json.rev >= 1 && st.json.data && st.json.data.put[a.st.it.uid] === SORT.put[a.st.it.uid],
            "rev " + (st.json && st.json.rev));
        return srvReq("PUT", "state/" + id + "/sort", { base:0, dev:"boshqa", data:{} });
      }).then(function(c){
        chk("eski asos bilan yozuv rad etildi (409)", c.status === 409, "HTTP " + c.status);
        postSet("tv");
        SORT.cell = {}; SORT.pack = {}; SORT.put = {}; SRV.seenRev = -1;
        return srvTick();
      }).then(function(){
        chk("TV holatni serverdan oldi", !!SORT.put[a.st.it.uid] && document.body.classList.contains("post-tv"),
            Object.keys(SORT.put).length + " detal");
        postSet("all");
        done();
      }).catch(function(e){ chk("E2E", false, e && e.message); done(); });
    } catch(e){ chk("E2E", false, e.message); done(); }
  });
  setTimeout(done, 40000);
})();
</script>
'@
$html = [IO.File]::ReadAllText($dist, [Text.Encoding]::UTF8)
$i = $html.LastIndexOf("</body>")
if ($i -lt 0) { "XATO: </body> yo'q"; exit 1 }
[IO.File]::WriteAllText($page, $html.Insert($i, $driver), (New-Object Text.UTF8Encoding($false)))

# --- server ---
$errLog = Join-Path $data "_srv.err"; $outLog = Join-Path $data "_srv.out"
$srv = Start-Process -FilePath $py -NoNewWindow -PassThru `
  -ArgumentList @("-I", (Join-Path $root "server\upk-server.py"), "--host", "127.0.0.1", "--port", $Port,
                  "--data", (Join-Path $data "db"), "--app", $page, "--quiet", "--max-mb", "1") `
  -RedirectStandardError $errLog -RedirectStandardOutput $outLog
$up = $false
for ($k = 0; $k -lt 60; $k++) {
  try { $t = New-Object Net.Sockets.TcpClient; $t.Connect("127.0.0.1", $Port); $t.Close(); $up = $true; break }
  catch { Start-Sleep -Milliseconds 100 }
}
if (-not $up) { "XATO: server $Port portida ko'tarilmadi"; Get-Content $errLog -ErrorAction SilentlyContinue; $srv | Stop-Process -Force; exit 1 }

$fail = 0
function Chk($name, $ok, $info) {
  if ($ok) { "OK   | $name" + $(if ($info) { "  ->  $info" } else { "" }) }
  else { $script:fail++; "XATO | $name" + $(if ($info) { "  ->  $info" } else { "" }) }
}
function Req($method, $path, $body) {
  $p = @{ Uri = "http://127.0.0.1:$Port/$path"; Method = $method; UseBasicParsing = $true; TimeoutSec = 15 }
  if ($null -ne $body) { $p.Body = [Text.Encoding]::UTF8.GetBytes($body); $p.ContentType = "application/json; charset=utf-8" }
  try {
    $r = Invoke-WebRequest @p
    return @{ code = [int]$r.StatusCode; text = [string]$r.Content }
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp) {
      $sr = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)
      return @{ code = [int]$resp.StatusCode; text = $sr.ReadToEnd() }
    }
    return @{ code = 0; text = $_.Exception.Message }
  }
}
function Js($r) { try { return ($r.text | ConvertFrom-Json) } catch { return $null } }

try {
  "=== 1) API ==="
  $r = Req GET "api/ping" $null;            Chk "ping" ($r.code -eq 200 -and (Js $r).server -eq "upk") $r.code
  $r = Req GET "" $null;                    Chk "tizim sahifasi /" ($r.code -eq 200 -and $r.text.Contains("<title")) $r.code
  $r = Req GET "api/plans" $null;           Chk "rejalar bo'sh" ($r.code -eq 200 -and @((Js $r).plans).Count -eq 0) $r.code
  $r = Req PUT "api/plans/ABC123" '{"x":1}';                                   Chk "reja emas -> 400" ($r.code -eq 400) $r.code
  $r = Req PUT "api/plans/ABC123" '{"format":"upk-reja","planId":"FFF000","snapshot":{}}'
  Chk "raqam mos emas -> 400" ($r.code -eq 400) $r.code
  $r = Req GET "api/plans/abc123" $null;    Chk "kichik harfli raqam -> 404" ($r.code -eq 404) $r.code
  $r = Req GET "api/plans/../../etc" $null; Chk "yo'l chalkashtirish -> 404" ($r.code -eq 404) $r.code
  $r = Req PUT "api/plans/ABC123" '{buzuq';                                    Chk "buzuq JSON -> 400" ($r.code -eq 400) $r.code
  $plan = '{"format":"upk-reja","v":1,"planId":"ABC123","name":"Sinov buyurtma","order":"B-2026-001","packs":7,"snapshot":{"project":{}}}'
  $r = Req PUT "api/plans/ABC123?sort=1" $plan;                                Chk "reja joylandi" ($r.code -eq 200) $r.code
  $r = Req GET "api/current" $null;         $j = Js $r
  Chk "joriy reja + nomi" ($j.sort -eq "ABC123" -and $j.name -eq "Sinov buyurtma") ("" + $j.sort + " / " + $j.name)
  $r = Req GET "api/plans" $null;           $j = Js $r
  Chk "ro'yxatda: nom, buyurtma, pochka" (@($j.plans).Count -eq 1 -and $j.plans[0].order -eq "B-2026-001" -and $j.plans[0].packs -eq 7) (@($j.plans).Count)
  $r = Req GET "api/plans/ABC123" $null;    Chk "reja qaytdi" ((Js $r).planId -eq "ABC123") $r.code
  $r = Req GET "api/state/ABC123/sort" $null; Chk "holat yo'q -> rev 0" ((Js $r).rev -eq 0) $r.code
  $r = Req PUT "api/state/ABC123/sort" '{"base":0,"dev":"t1","data":{"put":{"a#0":"A1"}}}'
  Chk "holat yozildi -> rev 1" ($r.code -eq 200 -and (Js $r).rev -eq 1) $r.code
  $r = Req PUT "api/state/ABC123/sort" '{"base":0,"dev":"t2","data":{}}'
  Chk "eski asos -> 409" ($r.code -eq 409) $r.code
  $r = Req PUT "api/state/ABC123/sort" '{"base":1,"dev":"t1","data":{"put":{"a#0":"A1","b#0":"A2"}}}'
  Chk "to'g'ri asos -> rev 2" ((Js $r).rev -eq 2) $r.code
  $r = Req GET "api/state/ABC123/sort" $null; $j = Js $r
  Chk "holat qaytdi" ($j.rev -eq 2 -and $j.data.put.'b#0' -eq "A2" -and $j.dev -eq "t1") $j.rev
  $r = Req PUT "api/state/ABC123/sort" '{"base":2,"data":[1,2]}';             Chk "holat obyekt emas -> 400" ($r.code -eq 400) $r.code
  $r = Req PUT "api/state/FFFFFF/sort" '{"base":0,"data":{}}'
  $c = Js (Req GET "api/current" $null)
  Chk "joylanmagan reja holati joriyni o'zgartirmaydi" ($r.code -eq 200 -and $c.sort -eq "ABC123") $c.sort
  $big = '{"format":"upk-reja","planId":"ABC124","snapshot":{"x":"' + ("x" * (1100 * 1024)) + '"}}'
  $r = Req PUT "api/plans/ABC124" $big;     Chk "hajm chegarasi -> 413" ($r.code -eq 413) $r.code
  $r = Req GET "api/ping" $null;            Chk "katta so'rovdan keyin server ishlayapti" ($r.code -eq 200) $r.code

  "=== 2) Brauzer orqali ==="
  $prof = Join-Path $data "prof"
  $dom = Join-Path $data "_dom.txt"
  $bargs = @("--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--disable-extensions",
             "--user-data-dir=$prof", "--virtual-time-budget=45000", "--dump-dom", "http://127.0.0.1:$Port/")
  $b = Start-Process -FilePath $Browser -ArgumentList $bargs -NoNewWindow -PassThru -RedirectStandardOutput $dom
  $b | Wait-Process -Timeout $TimeoutSec -ErrorAction SilentlyContinue
  if (-not $b.HasExited) { $b | Stop-Process -Force; "OGOHLANTIRISH: brauzer vaqtida tugamadi" }
  $txt = ""
  for ($k = 0; $k -lt 25; $k++) {
    if (Test-Path $dom) { try { $txt = [IO.File]::ReadAllText($dom, [Text.Encoding]::UTF8); if ($txt) { break } } catch {} }
    Start-Sleep -Milliseconds 200
  }
  $m = [regex]::Match($txt, "===E2E-START===(.*?)===E2E-END===", "Singleline")
  if (-not $m.Success) { $script:fail++; "XATO | brauzer natijasi topilmadi" }
  else {
    foreach ($line in ($m.Groups[1].Value.Trim() -split "`n")) {
      $line = [System.Net.WebUtility]::HtmlDecode($line.TrimEnd())
      if ($line -like "XATO*") { $script:fail++ }
      $line
    }
  }
} finally {
  if ($srv -and -not $srv.HasExited) { $srv | Stop-Process -Force }
  Start-Sleep -Milliseconds 300
  try { Remove-Item $data -Recurse -Force -ErrorAction SilentlyContinue } catch {}
}
""
if ($fail) { "===> SERVER SINOVI YIQILDI: $fail ta xato"; exit 1 }
"===> SERVER SINOVI O'TDI"
exit 0
