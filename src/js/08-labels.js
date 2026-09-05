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
    '<div class="pf">'+packListHTML(p)+'</div>'+
  '</div>';
}

/* v20: POCHKA ICHIDAGI DETALLAR — chekning etagida.
   Ilgari bu yerda kodlar « · » bilan ulangan bitta uzun qator turardi va 300
   belgida kesilardi: ishchi qaysi detal yoʻqligini koʻrolmasdi.
   Endi har detal — kod + oʻlcham, alohida katakcha.

   Kesish chek oʻlchamiga qarab: 80×60 da 12 tadan, boshqa chekda 20 tadan koʻpi
   sigʻmaydi. A4 da chegara yoʻq — u yerda joy bor. Kesilgan boʻlsa oxirida
   «+N ta» turadi, ya'ni roʻyxat toʻliq emasligi YOZIB qoʻyiladi. */
function packListHTML(p){
  var mm  = (typeof labelMM === "function") ? labelMM() : null;
  var cap = !mm ? 0 : (mm.h < 62 ? 12 : 20);
  var seq = p.seq, n = seq.length;
  var show = (cap && n > cap) ? cap : n;
  var out = "";
  for (var i = 0; i < show; i++){
    var it = seq[i].it;
    out += '<span><b>' + esc(it.code) + '</b> ' + it.L + '×' + it.W + '</span>';
  }
  if (show < n) out += '<span class="more">+' + (n - show) + ' ta</span>';
  return out;
}

/* ============================================================
   v20: BUYURTMA HUJJATI — A4, toʻliq tarkib

   Nima uchun: pochka cheki bitta pochkani tavsiflaydi, lekin buyurtma
   yopilayotganda kimdir «hammasi shumi?» degan savolga javob berishi kerak.
   Hujjat aynan shu javob: har pochka, har detal, jami massa va imzo joylari.

   Qachon: FAQAT hamma pochka yigʻilib boʻlgandan keyin (orderStatus().ready).
   Yarim yigʻilgan buyurtmaga hujjat berilsa u yolgʻon hujjat boʻladi.
   ============================================================ */
function orderStatus(){
  var doneP = 0, leftParts = 0, left = [], seqTot = 0;
  PACKS.forEach(function(p){
    var n = p.seq.length, d = Math.max(0, Math.min(p.done || 0, n));
    seqTot += n;
    if (d >= n) doneP++;
    else { leftParts += (n - d); left.push({ no:p.no, done:d, of:n }); }
  });
  return {
    packs: PACKS.length, donePacks: doneP,
    parts: seqTot, leftParts: leftParts, left: left,
    ready: PACKS.length > 0 && doneP === PACKS.length
  };
}

function orderDocHTML(){
  var st = orderStatus();
  var netto = 0, brutto = 0;
  PACKS.forEach(function(p){ netto += p.kg; brutto += packBrutto(p); });
  var rooms = {}, mods = {}, mats = {};
  PACKS.forEach(function(p){
    var r = (typeof packRoom === "function") ? packRoom(p) : (p.room || "");
    if (r) rooms[r] = 1;
    p.seq.forEach(function(s){
      mods[unitLabel(s.it.unit, s.it.unitName || s.it.prod)] = 1;
      if (s.it.mat) mats[s.it.mat.name] = (mats[s.it.mat.name] || 0) + 1;
    });
  });
  var d = new Date();   // pad2() — 04-packer.js, ikki xonali son
  var sana = d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate());

  var h = '<div class="odoc">';

  h += '<div class="oh"><div><b>' + esc(P.name || "Buyurtma") + '</b>' +
       '<div class="sub">toʻliq tarkib · R' + (P.rev || 1) + ' · ' + sana + '</div></div>' +
       '<div class="sub" style="text-align:right">id ' + esc(P.uuid || "—") + '<br>UPK v' +
       (typeof APP_VER !== "undefined" ? APP_VER : "?") + '</div></div>';

  // ---- umumiy koʻrsatkichlar
  h += '<table class="osum"><tr>' +
       '<td><u>Pochka</u><b>' + st.packs + ' ta</b></td>' +
       '<td><u>Detal</u><b>' + st.parts + ' dona</b></td>' +
       '<td><u>Xona</u><b>' + (Object.keys(rooms).length || "—") + '</b></td>' +
       '<td><u>Modul</u><b>' + Object.keys(mods).length + '</b></td>' +
       '<td><u>Netto</u><b>' + netto.toFixed(1) + ' kg</b></td>' +
       '<td><u>Brutto</u><b>' + brutto.toFixed(1) + ' kg</b></td>' +
       '</tr></table>';

  // ---- pochkalar
  h += '<h4>Pochkalar</h4><table class="otab"><thead><tr>' +
       '<th>№</th><th>Xona / modul</th><th>Qalinlik</th><th>Qavat</th>' +
       '<th>Detal</th><th>Gabarit, mm</th><th>Netto</th><th>Brutto</th></tr></thead><tbody>';
  PACKS.forEach(function(p){
    var r = (typeof packRoom === "function") ? packRoom(p) : (p.room || "");
    var mm = {}; p.seq.forEach(function(s){ mm[unitLabel(s.it.unit, s.it.unitName)] = 1; });
    h += '<tr><td class="mono">P' + pad2(p.no) + '</td>' +
         '<td>' + esc(cut((r ? r + " · " : "") + Object.keys(mm).join(", "), 60)) + '</td>' +
         '<td class="mono">' + (p.t || "—") + '</td>' +
         '<td class="mono">' + (p.odd ? "bogʻ" : (p.layers.length + 1)) + '</td>' +
         '<td class="mono">' + p.seq.length + '</td>' +
         '<td class="mono">' + (p.odd ? "—" : p.gabL + "×" + p.gabW + "×" + Math.round(p.h)) + '</td>' +
         '<td class="mono">' + p.kg.toFixed(1) + '</td>' +
         '<td class="mono">' + packBrutto(p).toFixed(1) + '</td></tr>';
  });
  h += '</tbody></table>';

  // ---- toʻliq detal roʻyxati
  h += '<h4>Toʻliq detal roʻyxati</h4>';
  PACKS.forEach(function(p){
    h += '<div class="opk">P' + pad2(p.no) + ' — ' + p.seq.length + ' detal · ' +
         p.kg.toFixed(1) + ' kg</div>';
    h += '<table class="otab sm"><thead><tr><th>#</th><th>Kod</th><th>Nomi</th>' +
         '<th>Oʻlcham, mm</th><th>Material</th><th>Kant</th><th>kg</th></tr></thead><tbody>';
    p.seq.forEach(function(s, i){
      var it = s.it;
      h += '<tr><td class="mono">' + (i+1) + '</td>' +
           '<td class="mono">' + esc(it.code) + '</td>' +
           '<td>' + esc(cut(it.name, 46)) + '</td>' +
           '<td class="mono">' + it.L + '×' + it.W + '×' + it.T + '</td>' +
           '<td>' + esc(cut(it.mat ? it.mat.name : "—", 24)) + '</td>' +
           '<td class="mono">' + esc(typeof edgeText === "function" ? edgeText(it.edges) : (it.edges || "—")) + '</td>' +
           '<td class="mono">' + it.kg.toFixed(2) + '</td></tr>';
    });
    h += '</tbody></table>';
  });

  // ---- materiallar kesimi
  h += '<h4>Material kesimi</h4><table class="otab"><thead><tr><th>Material</th><th>Detal</th></tr></thead><tbody>';
  Object.keys(mats).sort().forEach(function(k){
    h += '<tr><td>' + esc(k) + '</td><td class="mono">' + mats[k] + '</td></tr>';
  });
  h += '</tbody></table>';

  /* ---- FURNITURA.
     `.project` faylida furnitura maʼlumoti YOʻQ — 205 fayl tekshirildi, XML da
     atigi project/good/material/operation/part teglari bor va `good` turlari
     product/sheet/band/CS/XNC/EL/LB. Petlya, tortma, ruchka, shurup — hech biri
     yozilmagan. Shuning uchun hujjat bu yerda YOLGʻON yozmaydi, balki maʼlumot
     manbasi yoʻqligini ochiq aytadi. */
  h += '<h4>Furnitura va aksesuarlar</h4>' +
       '<div class="onote">Roʻyxat kiritilmagan. Raskroy faylida (<span class="mono">.project</span>) ' +
       'furnitura maʼlumoti saqlanmaydi — unda faqat plita, kant va CNC operatsiyalari bor. ' +
       'Furnitura alohida hujjat boʻyicha topshiriladi.</div>';

  // ---- pochkalanmagan obyektlar
  var sk = (typeof DIAG !== "undefined" && DIAG.skipped) ? DIAG.skipped : [];
  if (sk.length){
    h += '<h4>Pochkalanmagan obyektlar — ' + sk.length + ' ta</h4>' +
         '<table class="otab"><thead><tr><th>Kod</th><th>Nomi</th><th>Sabab</th></tr></thead><tbody>';
    sk.forEach(function(x){
      h += '<tr><td class="mono">' + esc(x.code || "—") + '</td><td>' + esc(cut(x.name || "—", 50)) +
           '</td><td>' + esc(x.why || "—") + '</td></tr>';
    });
    h += '</tbody></table>' +
         '<div class="onote">Bular xona obyektlari (devor, pol, shift) — mebel detali emas, ' +
         'shuning uchun pochkaga kirmaydi va massaga qoʻshilmaydi.</div>';
  }

  // ---- yigʻilmagan (hujjat chop etilmaydi, lekin holat yozilib qoladi)
  if (!st.ready){
    h += '<h4 class="bad">Yigʻilmagan — ' + st.leftParts + ' detal</h4>' +
         '<table class="otab"><thead><tr><th>Pochka</th><th>Yigʻildi</th><th>Qoldi</th></tr></thead><tbody>';
    st.left.forEach(function(x){
      h += '<tr><td class="mono">P' + pad2(x.no) + '</td><td class="mono">' + x.done + '/' + x.of +
           '</td><td class="mono">' + (x.of - x.done) + '</td></tr>';
    });
    h += '</tbody></table>';
  }

  // ---- imzo
  h += '<div class="osign"><div>Topshirdi<br><span></span></div>' +
       '<div>Qabul qildi<br><span></span></div>' +
       '<div>Sana<br><span>' + sana + '</span></div></div>';

  h += '</div>';
  return h;
}
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
/* Matnni kesish — v10: ilgari .slice() belgisiz kesardi va chekda «LDSP Oq gly»
   deb tugab qolardi; ishchi roʻyxat toʻliqmi yoki yoʻqmi bilmasdi. */
function cut(s, n){
  s = String(s == null ? "" : s);
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}