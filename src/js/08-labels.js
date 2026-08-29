/* ============================================================
   3.9 INTERFEYS — roʻyxat, qadam, cheklar, tahrirlash, menejer
   ============================================================ */
var $ = function(id){ return document.getElementById(id); };

/* QR ni chizish. b — "quiet zone" (tinch zona) modul hisobida.
   ISO/IEC 18004 kamida 4 modul talab qiladi; ilgari 2 turgan edi va arzon skanerlar
   chekning chekkasidagi QR ni oʻqiyolmay qiynalardi. */
function drawQR(cv, text){
  if (!cv) return;
  var m = QRLIB.QR.make(text), n=m.length, b=4, s=n+b*2;
  var k = Math.max(1, Math.ceil(420/s));
  cv.width = s*k; cv.height = s*k;
  var g = cv.getContext("2d");
  g.fillStyle="#fff"; g.fillRect(0,0,s*k,s*k); g.fillStyle="#000";
  for (var i=0;i<n;i++) for (var j=0;j<n;j++) if (m[i][j]) g.fillRect((j+b)*k,(i+b)*k,k,k);
}

/* v12: chekda «Mahsulot» oʻrnida MODUL turadi — bitta good ichida bir nechta
   mebel boʻlsa mahsulot nomi hammasi uchun bir xil, modul esa farq qiladi. */
function labelHTML(p, step, id){
  var it = step.it, m = it.mat;
  var role = step.role==="tag" ? "ENG TAG" : step.role==="ust" ? ("QOPQOQ"+(step.of>1?" "+step.n+"/"+step.of:"")) : step.role==="noodatiy" ? "NOODATIY" : (step.layer+"-QAVAT"+(step.of>1?" "+step.n+"/"+step.of:""));
  return '<div class="label">'+
    '<div>'+
      '<div class="lc">'+esc(it.code)+'</div>'+
      '<div class="ln">'+esc(it.name)+'</div>'+
      '<table>'+
        '<tr><td>Oʻlcham</td><td class="big">'+it.L+' × '+it.W+' × '+it.T+'</td></tr>'+
        '<tr><td>Massa</td><td class="big">'+it.kg.toFixed(2)+' kg</td></tr>'+
        '<tr><td>Material</td><td>'+esc(m?m.name:"—")+'</td></tr>'+
        '<tr><td>Modul</td><td>'+esc(unitLabel(it.unit, it.unitName || it.prod))+'</td></tr>'+
        '<tr><td>Pochka</td><td><span class="pill">P'+pad2(p.no)+' · '+role+'</span></td></tr>'+
      '</table>'+
    '</div>'+
    '<div style="text-align:center"><canvas id="'+id+'"></canvas>'+
      '<div style="font-size:7.5px;letter-spacing:.02em;margin-top:2px;word-break:break-all">'+esc(qrText(p,step))+'</div></div>'+
  '</div>';
}
function packQR(p){
  return S.prefix + "." + projTag() + ".R" + (p.rev || (P&&P.rev) || 1) + "|P" + pad2(p.no) + "|" +
         (p.t||"") + "mm|" + p.seq.length + "det|" + packBrutto(p).toFixed(1) + "kg|" +
         (p.odd ? "NOODATIY" : p.gabL+"x"+p.gabW+"x"+Math.round(p.h));
}
function packLabelHTML(p, id){
  var brutto = packBrutto(p);         // detallar + qadoq materiali (tara)
  var two = brutto > S.oneMan;
  var mats = {}; p.seq.forEach(function(s){ mats[s.it.mat?s.it.mat.name:"—"] = 1; });
  /* v12: chekda XONA va MODUL nomi turadi (TZ-v2 §8: «qaysi xona yoki modul»).
     Modul nomi P/M bergan nom — fayl faqat «01» beradi. Bir nechta modul bitta
     pochkaga tushgan boʻlsa (birga pochkalanadigan xona) hammasi sanab oʻtiladi. */
  var mods = {}; p.seq.forEach(function(s){ mods[unitLabel(s.it.unit, s.it.unitName)] = 1; });
  var room = (typeof packRoom === "function") ? packRoom(p)
           : (typeof p.room === "string" ? p.room : "");
  return '<div class="label plabel">'+
    '<div class="ph"><b>POCHKA P'+pad2(p.no)+'</b><span>'+esc(P.name)+' · R'+(p.rev||1)+'</span></div>'+
    '<div class="pb">'+
      '<div>'+
        '<table>'+
        (room ? '<tr><td>Xona</td><td class="big">'+esc(cut(room, 40))+'</td></tr>' : '')+
        '<tr><td>Modul</td><td class="big">'+esc(cut(Object.keys(mods).join(", "), 42))+'</td></tr>'+
        '<tr><td>Material</td><td>'+esc(cut(Object.keys(mats).join(", "), 46))+'</td></tr>'+
        '<tr><td>Qalinlik</td><td class="big">'+(p.t||"—")+' mm</td></tr>'+
        '<tr><td>Qator</td><td class="big">'+(p.odd?p.items.length:(p.layers.length+1))+' qavat</td></tr>'+
        '<tr><td>Detal</td><td class="big">'+p.seq.length+' dona</td></tr>'+
        '<tr><td>Gabarit</td><td class="big">'+(p.odd?"—":p.gabL+" × "+p.gabW+" × "+Math.round(p.h)+" mm")+'</td></tr>'+
        '<tr><td>Netto</td><td>'+p.kg.toFixed(1)+' kg</td></tr>'+
        '<tr><td>Brutto</td><td class="big">'+brutto.toFixed(1)+' kg</td></tr>'+
        '</table>'+
        (two ? '<div class="warn">⚠ '+brutto.toFixed(0)+' KG — 2 KISHI KOʻTARADI</div>' : '')+
      '</div>'+
      '<div style="text-align:center"><canvas id="'+id+'"></canvas>'+
        '<div style="font-size:7.5px;margin-top:2px;word-break:break-all">'+esc(packQR(p))+'</div></div>'+
    '</div>'+
    '<div class="pf">'+esc(cut(p.seq.map(function(s){ return s.it.code; }).join(" · "), 300))+'</div>'+
  '</div>';
}
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
/* Matnni kesish — v10: ilgari .slice() belgisiz kesardi va chekda «LDSP Oq gly»
   deb tugab qolardi; ishchi roʻyxat toʻliqmi yoki yoʻqmi bilmasdi. */
function cut(s, n){
  s = String(s == null ? "" : s);
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}