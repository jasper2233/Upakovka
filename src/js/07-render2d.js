/* ============================================================
   3.8 2D REJA — joriy qavat ustidan, podskazka
   ============================================================ */
var C2 = document.getElementById("c2d"), G2 = C2.getContext("2d");
function draw2D(){
  var d=window.devicePixelRatio||1;
  /* v10c: oʻlcham CSS dan olinadi — kanvas endi ustun eni boʻyicha choʻziladi.
     Ilgari 330×180 qotib turardi va detal kodlari 9 px edi; sex stolidagi
     plansheti 60–80 sm masofada boʻlgani uchun ular oʻqilmasdi. */
  var W = Math.round(C2.clientWidth  || 330);
  var H = Math.round(C2.clientHeight || 180);
  if (W < 80 || H < 60) return;   // hali maket hisoblanmagan yoki boʻlim yashirin
  C2.width=W*d; C2.height=H*d; G2.setTransform(d,0,0,d,0,0);
  G2.clearRect(0,0,W,H);
  /* shrift qutiga bogʻlangan: 180 px balandlikda ~10 px, 340 px da ~15 px */
  var FS = Math.max(10, Math.min(16, Math.round(H/21)));
  var p = PACKS[CUR];
  document.getElementById("lgLayer").textContent = "";
  if (!p || p.odd){
    G2.fillStyle="#8a92a0"; G2.font=FS+"px monospace"; G2.textAlign="center";
    G2.fillText(p? "noodatiy pochka — qavat rejasi yoʻq" : "reja yoʻq", W/2, H/2); return;
  }
  var seq = p.seq[STEP] || p.seq[p.seq.length-1];
  var lay = seq ? seq.layer : 0;
  var off = p.off || 0;
  var EL = p.envL, EW = p.envW;
  var pad=14, sc = Math.min((W-pad*2)/EL, (H-pad*2)/EW);
  var ox = (W-EL*sc)/2, oy = (H-EW*sc)/2;
  function R(x,y,a,b){ return [ox+(x+off)*sc, oy+(y+off)*sc, a*sc, b*sc]; }

  /* v12: detal ustidagi yozuv — KOD va OʻLCHAM.
     Ikkala raqam ham detalga yopishtirilgan chekda turadi, shuning uchun ishchi
     rejadagi yozuvni qoʻlidagi chek bilan bevosita solishtira oladi.
     Joy tor boʻlsa avval oʻlcham, undan ham tor boʻlsa yozuv butunlay tushiriladi —
     ustma-ust tushgan raqam hech qanday raqamdan yomonroq. */
  function tag2D(r, it, col, bold, big){
    if (!it) return;
    var f  = big ? FS+1 : FS;
    var f2 = Math.max(8, Math.round(f*0.78));
    var cx = r[0]+r[2]/2, cy = r[1]+r[3]/2;
    var fCode = (bold?"700 ":"")+f+"px monospace";
    G2.textAlign="center"; G2.textBaseline="middle"; G2.fillStyle=col;
    G2.font = fCode;
    if (r[2] < G2.measureText(it.code).width + 6 || r[3] < f*1.4) return;
    var dim = it.L + "×" + it.W;
    G2.font = f2+"px monospace";
    var okDim = (r[2] >= G2.measureText(dim).width + 6) && (r[3] >= f*1.2 + f2*1.4);
    if (!okDim){ G2.font = fCode; G2.fillText(it.code, cx, cy); return; }
    G2.font = fCode;            G2.fillText(it.code, cx, cy - f2*0.60);
    G2.font = f2+"px monospace"; G2.globalAlpha = .85;
    G2.fillText(dim, cx, cy + f*0.58); G2.globalAlpha = 1;
  }

  // chiqish chegarasi
  G2.setLineDash([4,3]); G2.strokeStyle="#ffc629"; G2.lineWidth=1;
  var e=R(-off,-off,EL,EW); G2.strokeRect(e[0],e[1],e[2],e[3]); G2.setLineDash([]);
  // tag detal gabariti
  var bs=R(0,0,p.base.L,p.base.W);
  G2.strokeStyle="#8a92a0"; G2.lineWidth=1; G2.strokeRect(bs[0],bs[1],bs[2],bs[3]);

  if (lay===0){
    G2.fillStyle= STEP>0 ? "rgba(165,113,76,.55)" : "rgba(255,198,41,.20)";
    G2.fillRect(bs[0],bs[1],bs[2],bs[3]);
    G2.strokeStyle="#ffc629"; G2.lineWidth=2; G2.strokeRect(bs[0],bs[1],bs[2],bs[3]);
    // eng tag (dno) detalning kodi va oʻlchami — ilgari bu yerda yozuv umuman yoʻq edi
    tag2D(bs, p.base, STEP>0 ? "#e0c3a2" : "#ffc629", STEP===0, true);
    document.getElementById("lgLayer").textContent = "eng tag — yaxlit detal, 100%";
    return;
  }
  var L = p.layers[lay-1]; if (!L) return;
  document.getElementById("lgLayer").textContent =
    (L.tail ? "quyruq (qopqoq ostida): " : L.lid ? "qopqoq: " : lay+"-qavat: ") + L.items.length+" detal · "+
    Math.round(L.fill*100)+"%"+(L.weak?" (toʻliq emas)":"")+" · "+L.kg.toFixed(1)+" kg";
  L.items.forEach(function(q){
    // v21: ilgari bu `indexOf(filter(...)[0])` edi — bir xil natija, lekin har
    // detal uchun butun ketma-ketlik ikki marta aylanardi (har kadrda).
    var idx = p.seq.findIndex(function(s){ return s.it===q.it && s.layer===lay; });
    var r = R(q.x, q.y, q.a, q.b);
    if (idx>=0 && idx < STEP){
      G2.fillStyle="rgba(79,174,138,.45)"; G2.fillRect(r[0],r[1],r[2],r[3]);
      G2.strokeStyle="#4fae8a"; G2.lineWidth=1.2; G2.strokeRect(r[0],r[1],r[2],r[3]);
    } else if (idx === STEP){
      G2.fillStyle="rgba(255,198,41,.28)"; G2.fillRect(r[0],r[1],r[2],r[3]);
      G2.strokeStyle="#ffc629"; G2.lineWidth=2; G2.strokeRect(r[0],r[1],r[2],r[3]);
    } else {
      G2.setLineDash([3,3]); G2.strokeStyle="rgba(152,160,173,.45)"; G2.lineWidth=1;
      G2.strokeRect(r[0],r[1],r[2],r[3]); G2.setLineDash([]);
    }
    /* kod va oʻlcham detalning ichiga sigʻsa yoziladi; keyingi detal — qalin va yorqin */
    var cur = idx === STEP;
    tag2D(r, q.it,
          cur ? "#ffc629" : (idx>=0 && idx<STEP) ? "#8ee0bb" : "rgba(169,177,190,.8)",
          cur, cur);
  });
}

function doneKg(p){
  var s=0; for (var i=0;i<STEP && i<p.seq.length;i++) s += p.seq[i].it.kg; return s;
}

/* sichqoncha bilan aylantirish */
(function(){
  var drag=false, lx=0, ly=0;
  C3.addEventListener("pointerdown", function(e){ drag=true; lx=e.clientX; ly=e.clientY; C3.setPointerCapture(e.pointerId); });
  C3.addEventListener("pointermove", function(e){
    if(!drag) return;
    cam.az += (e.clientX-lx)*0.008; cam.el += (e.clientY-ly)*0.006;
    cam.el = Math.max(0.06, Math.min(1.45, cam.el));
    lx=e.clientX; ly=e.clientY; draw3D();
  });
  C3.addEventListener("pointerup", function(){ drag=false; });
  C3.addEventListener("wheel", function(e){ e.preventDefault();
    cam.zoom = Math.max(0.4, Math.min(4, cam.zoom * (e.deltaY>0?0.92:1.09))); draw3D(); }, {passive:false});
})();
window.addEventListener("resize", function(){ draw3D(); draw2D(); });