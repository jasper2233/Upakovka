/* ============================================================
   3.6 POCHKALASH ALGORITMI
   ============================================================ */

/* Har pochkaga shuncha variant sinaladi (har xil tag + strategiya + tartib +
   aralashtirish), eng zichi gʻolib. Ilgari bu S.packTries sozlamasi edi, lekin uni
   hech kim oʻzgartira olmasdi — interfeysda maydon yoʻq, localStorage ga ham
   yozilmasdi. Terish LOGIKASI ham doimiy AVTO: ilgari S.logic bilan qoʻlda
   tanlanadigan edi, v9 dan beri u doim −1 (avto) va tanlov olib tashlangan. */
var PACK_TRIES = 100;

/* 3.6.1 MaxRects joylashtirgich — markaziy boʻshliqni toʻldirish uchun */
function Packer(W,H){ this.free=[{x:0,y:0,w:W,h:H}]; }
Packer.prototype.find = function(w,h){
  var best=null;
  for (var i=0;i<this.free.length;i++){
    var f=this.free[i], o=[[w,h,0],[h,w,1]];
    for (var k=0;k<2;k++){
      var a=o[k][0], b=o[k][1];
      if (a<=f.w+1e-9 && b<=f.h+1e-9){
        var s1=Math.min(f.w-a,f.h-b), s2=Math.max(f.w-a,f.h-b);
        if (!best || s1<best.s1 || (s1===best.s1 && s2<best.s2))
          best={x:f.x,y:f.y,a:a,b:b,rot:o[k][2],s1:s1,s2:s2};
      }
    }
  }
  return best;
};
Packer.prototype.place = function(n){
  var out=[];
  for (var i=0;i<this.free.length;i++){ var f=this.free[i]; if(!this.split(f,n,out)) out.push(f); }
  this.free=out; this.prune();
};
Packer.prototype.split = function(f,n,out){
  if (n.x>=f.x+f.w || n.x+n.a<=f.x || n.y>=f.y+f.h || n.y+n.b<=f.y) return false;
  if (n.x<f.x+f.w && n.x+n.a>f.x){
    if (n.y>f.y && n.y<f.y+f.h) out.push({x:f.x,y:f.y,w:f.w,h:n.y-f.y});
    if (n.y+n.b<f.y+f.h) out.push({x:f.x,y:n.y+n.b,w:f.w,h:f.y+f.h-(n.y+n.b)});
  }
  if (n.y<f.y+f.h && n.y+n.b>f.y){
    if (n.x>f.x && n.x<f.x+f.w) out.push({x:f.x,y:f.y,w:n.x-f.x,h:f.h});
    if (n.x+n.a<f.x+f.w) out.push({x:n.x+n.a,y:f.y,w:f.x+f.w-(n.x+n.a),h:f.h});
  }
  return true;
};
function rectIn(a,b){ return a.x>=b.x-1e-9 && a.y>=b.y-1e-9 && a.x+a.w<=b.x+b.w+1e-9 && a.y+a.h<=b.y+b.h+1e-9; }
Packer.prototype.prune = function(){
  for (var i=0;i<this.free.length;i++){
    for (var j=i+1;j<this.free.length;j++){
      if (rectIn(this.free[i],this.free[j])){ this.free.splice(i,1); i--; break; }
      if (rectIn(this.free[j],this.free[i])){ this.free.splice(j,1); j--; }
    }
  }
};

/* 3.6.2 Variatsiya: 4 xil saralash + markazlash yordamchilari */
var ORD = [
  function(a,b){ return (b.W-a.W) || (b.L-a.L); },        // qisqa tomon — javon uchun eng yaxshi
  function(a,b){ return (b.L-a.L) || (b.W-a.W); },        // uzun tomon
  function(a,b){ return b.L*b.W - a.L*a.W; },             // maydon
  function(a,b){ return (b.L+b.W) - (a.L+a.W); }          // perimetr
];
function mulberry(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0;
  var t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }

/* DETERMINIZM URUGʻLARI. `Math.random()` pochkalashda TAQIQLANGAN — bir xil
   kirish har doim bir xil natija berishi shart (seansni tiklash shunga
   tayanadi). Urugʻlar oddiy qatʼiy sonlar, sehr yoʻq:
     MAIN_SEED / SEED_STEP — asosiy oqim, har urinishga (`tries`) boshqa urugʻ
     ODD_SEED              — nostandart oqim: u alohida teriladi va natijasi
                             asosiy oqimning urinish raqamiga bogʻliq boʻlmasin */
var MAIN_SEED = 1234, SEED_STEP = 7919, ODD_SEED = 4242;

/* Vaqt oʻlchovi — diagnostika uchun. `performance.now()` Chrome/Edge 50+ da
   har doim bor (minimal brauzer 09-storage.js da yozilgan), shuning uchun
   `Date.now()` zaxirasi kerak emas; ilgari u olti joyda takrorlanardi. */
function nowMs(){ return performance.now(); }

function centerLayer(items, baseL, baseW){
  if (!items.length) return items;
  var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  items.forEach(function(q){ x0=Math.min(x0,q.x); y0=Math.min(y0,q.y); x1=Math.max(x1,q.x+q.a); y1=Math.max(y1,q.y+q.b); });
  var dx = (baseL-(x1-x0))/2 - x0, dy = (baseW-(y1-y0))/2 - y0;
  items.forEach(function(q){ q.x = Math.round(q.x+dx); q.y = Math.round(q.y+dy); });
  return items;
}
function bboxOf(items){
  var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  items.forEach(function(q){ x0=Math.min(x0,q.x); y0=Math.min(y0,q.y); x1=Math.max(x1,q.x+q.a); y1=Math.max(y1,q.y+q.b); });
  return items.length ? {x0:x0,y0:y0,L:x1-x0,W:y1-y0} : {x0:0,y0:0,L:0,W:0};
}

/* ============================================================
   3.6.3 SIMMETRIK QAVAT — keng zona chetda, tor detal MARKAZDA
   • detallar zonalarga (strip) yigʻiladi
   • eng keng zona old va orqa chetga, eng tori markazga
   • zona ichida eng uzun detal chap va oʻng chetga, kaltasi oʻrtaga
   • ortib qolgan kichik detallar faqat markaziy boʻshliqqa tushadi
   Sabab: kichik detal chetda qolsa pochka koʻtarilganda tushib ketadi.
   ============================================================ */
function mirrorLayer(items, baseL, baseW){
  items.forEach(function(q){
    q.x = Math.round(baseL - q.x - q.a);
    q.y = Math.round(baseW - q.y - q.b);
  });
  return items;
}
/* v12: `off` (chiqish) parametri olib tashlandi — u signaturada turardi, lekin
   funksiya tanasida bir marta ham ishlatilmasdi. Qavat chegarasi envL/envW orqali
   allaqachon kelayotgan edi. */
/* v14: `tOnly` — QAVAT QALINLIGI. Berilsa, qavatga faqat aynan shu qalinlikdagi
   detal tushadi. Sabab: aralash qalinlikdagi qavat notekis boʻladi — 16 mm
   detal yonidagi 3 mm detal ustidagi qavatni 13 mm ga qiyshaytiradi, pochka
   burchagi koʻtariladi va tasma boʻshab qoladi. null = eskicha (aralash). */
function makeLayer(pool, envL, envW, kgBudget, baseL, baseW, ord, maxN, flip, rndj, tOnly){
  var area = baseL*baseW, lim = maxN || 1e9;
  function tOK(x){ return tOnly == null || Math.abs(x.T - tOnly) < 1e-9; }
  var cands = pool.filter(function(x){ return !x.used && tOK(x); }).sort(ORD[ord]);
  if (rndj) for (var ji=0; ji+1<cands.length; ji++)          // yengil aralashtirish
    if (rndj() < 0.14){ var tmp=cands[ji]; cands[ji]=cands[ji+1]; cands[ji+1]=tmp; }
  var strips = [], kg = 0, usedH = 0, cnt = 0;

  function ways(it){
    var o=[];
    if (it.L<=envL+1e-9 && it.W<=envW+1e-9) o.push([it.L,it.W,0]);   // uzun tomoni zona boʻylab
    if (it.W<=envL+1e-9 && it.L<=envW+1e-9) o.push([it.W,it.L,1]);
    return o;
  }
  cands.forEach(function(it){
    if (cnt>=lim || kg + it.kg > kgBudget + 1e-9) return;
    var o = ways(it); if (!o.length) return;
    for (var s=0;s<strips.length;s++){
      var st = strips[s];
      for (var k=0;k<o.length;k++)
        if (o[k][1] <= st.h+1e-9 && st.len + o[k][0] <= envL+1e-9){
          st.items.push({it:it,a:o[k][0],b:o[k][1],rot:o[k][2]});
          st.len += o[k][0]; kg += it.kg; cnt++; it.used = true; return;
        }
    }
    for (var k2=0;k2<o.length;k2++)
      if (usedH + o[k2][1] <= envW+1e-9){
        strips.push({ h:o[k2][1], len:o[k2][0],
                      items:[{it:it,a:o[k2][0],b:o[k2][1],rot:o[k2][2]}] });
        usedH += o[k2][1]; kg += it.kg; cnt++; it.used = true; return;
      }
  });
  if (!strips.length) return { items:[], kg:0, fill:0, bb:bboxOf([]), h:0 };

  // zonalarni simmetrik tarqatish: eng balandi chetlarda
  strips.sort(function(a,b){ return b.h - a.h || b.len - a.len; });
  var front=[], back=[];
  strips.forEach(function(st,i){ (i%2===0?front:back).push(st); });
  var totalH = strips.reduce(function(s,st){ return s+st.h; },0);
  var spanW = Math.max(totalH, Math.min(baseW, envW));
  var yF=0, yB=spanW;
  front.forEach(function(st){ st.y=yF; yF+=st.h; });
  back.forEach(function(st){ yB-=st.h; st.y=yB; });

  var items=[], cov=0;
  strips.forEach(function(st){
    st.items.sort(function(a,b){ return b.a - a.a; });
    var Lh=[], Rh=[];
    st.items.forEach(function(q,i){ (i%2===0?Lh:Rh).push(q); });
    var seq = Lh.concat(Rh.reverse());          // uzunlar chetda, kaltalar oʻrtada
    var x = baseL/2 - st.len/2;
    seq.forEach(function(q){ q.x=x; q.y=st.y; x+=q.a; items.push(q); cov+=q.a*q.b; });
  });

  // markaziy boʻshliqni kichik detallar bilan toʻldiramiz
  var gapH = yB - yF;
  if (gapH > 40 && cnt < lim){
    var pk = new Packer(baseL, gapH), sub=[];
    pool.filter(function(x){ return !x.used && tOK(x); }).sort(ORD[ord]).forEach(function(it){
      if (cnt>=lim || kg + it.kg > kgBudget + 1e-9) return;
      var n = pk.find(it.L, it.W); if (!n) return;
      pk.place(n);
      sub.push({it:it, x:n.x, y:n.y+yF, a:n.a, b:n.b, rot:n.rot});
      kg += it.kg; cnt++; it.used = true;
    });
    if (sub.length){
      var b = bboxOf(sub);
      var dx = baseL/2 - b.L/2 - b.x0, dy = yF + gapH/2 - b.W/2 - b.y0;
      sub.forEach(function(q){ q.x+=dx; q.y+=dy; items.push(q); cov+=q.a*q.b; });
    }
  }

  centerLayer(items, baseL, baseW);
  if (flip) mirrorLayer(items, baseL, baseW);      // gʻisht terish: qator boshi almashadi
  /* v21: `strips` va `t` maydonlari olib tashlandi — ular yozilardi, lekin
     butun loyihada bir marta ham oʻqilmasdi (04-packer dagi `L.whole` va
     03-parser dagi `part`/`area`/`idx` bilan bir xil holat). Qavat qalinligi
     kerak boʻlsa `L.items[0].it.T` dan olinadi: bitta qavatda bitta qalinlik. */
  return { items:items, kg:kg, fill:area? cov/area : 0, bb:bboxOf(items), flipped:!!flip,
           h:items.reduce(function(m,q){ return Math.max(m,q.it.T); },0) };
}

/* v14: pooldagi boʻsh detallarning qalinliklari — detali koʻpi birinchi.
   Qavat qurishda shu tartibda sinaladi: eng koʻp detalli qalinlik odatda eng
   zich qavat beradi, demak birinchi urinishdayoq yaxshi natija chiqadi. */
function poolThicks(pool){
  var m = {}, out = [];
  pool.forEach(function(x){ if (!x.used) m[x.T] = (m[x.T] || 0) + 1; });
  Object.keys(m).forEach(function(k){ out.push({ t:+k, n:m[k] }); });
  out.sort(function(a,b){ return b.n - a.n || b.t - a.t; });
  return out;
}

/* v14: YUPQA TAG USTIGA QALIN DETAL QOʻYILMAYDI.

   Tag minBaseT dan yupqa boʻlishi — zaxira yoʻli: guruhda qalin detal umuman
   boʻlmagan holat (butun pochka 3 mm orqa devor). Bunday pochka faqat yupqa
   detallardan iborat boʻlib qolishi kerak: 3 mm paddon ustiga 16 mm bok
   qoʻyilsa, tag ezilib pochka buklanadi.

   Qoida qavat qurishda ham, quyruq singdirishda ham bir xil qoʻllanadi. */
function thickOKon(base, t){
  var m = S.minBaseT || 0;
  return !(base.T < m - 1e-9 && t >= m - 1e-9);
}

/* v17: TOM ULUSHLARI — koʻp detalli tomda eng kichik detalning ulushi.

   Buyurtmachi talabi ikki nuqta bilan berilgan:
     2 detal — 60/40 dan yomon boʻlmasin, yaʼni eng kichigi ≥ 40 %
     3 detal — 30/30/30 atrofida,        yaʼni eng kichigi ≥ 30 %
   Ikki nuqta bitta chiziqda yotadi:
       minUlush(n) = lidBal % − 10 % × (n − 2)
   lidBal = 40 boʻlganda: n=2 → 40 %, n=3 → 30 %, n=4 → 20 %.

   Nega kerak: tomga mayda detal tushsa, ustiga terilgan pochkaning ogʻirligi
   oʻsha kichik yuzaga toʻplanadi. Qogʻoz oʻralganda ham oʻsha joyda burma
   hosil boʻladi, tasma tortilganda detal siniydi. v16 gacha bu qoida faqat
   `makeLid()` yasagan qopqoqqa qoʻllanardi; eng ustki qavat shunchaki
   «qopqoq» deb koʻtarilganda esa tekshirilmasdan qolardi — natijada 96 %
   yopilgan, lekin 958×510 va 511×84 detallardan iborat tom chiqib ketardi. */
function lidBalOK(L){
  var n = L.items.length;
  if (n < 2 || !S.lidBal) return true;
  var minShare = (S.lidBal / 100) - 0.10 * (n - 2);
  if (minShare <= 0) return true;
  var tot = 0, mn = Infinity;
  L.items.forEach(function(q){ var a = q.a * q.b; tot += a; if (a < mn) mn = a; });
  if (!tot) return true;
  return (mn / tot) >= minShare - 1e-9;
}

/* ============================================================
   v15: TOM (pochkaning eng ustki yuzasi) QOIDASI

   Nega alohida va qatʼiy: yetkazib berishda pochkalar BIR-BIRINING USTIGA
   teriladi. Pastdagi pochkaning tomi ochiq qolsa — ustidagi pochkaning butun
   ogʻirligi shu bir necha kichik detalga tushadi. Ogʻirlik teng taqsimlanmaydi,
   detal qirralari ezilib sinadi, tasma boʻshaydi.

   v13 da quyruq qavati (3.6.7.1) ataylab shu talabdan ozod qilingan edi —
   «ustida hech narsa yoʻq, demak egiladigan narsa ham yoʻq» degan asos bilan.
   Asos NOTOʻGʻRI edi: ustida keyingi pochka turadi. Endi istisno yoʻq.

   TOM SHARTI — beshtasi BIRDAN, eng ustki qavat kim boʻlishidan qatʼi nazar:
     1. yuza      — tag yuzasining kamida `lidFill` % ini yopadi (standart 90)
     2. detal     — koʻpi bilan `lidN` ta (standart 3)
     3. muvozanat — ulushlar teng: 2 detalda 60/40, 3 detalda 30/30/30 atrofida
     4. gabarit   — hech bir detal pochka konvertidan chiqmaydi
     5. qalinlik  — hech bir detal `minBaseT` dan yupqa emas

   v16 gacha 2 va 3 shartlar FAQAT `makeLid()` yasagan qopqoqqa qoʻllanardi.
   Eng ustki qavat shunchaki «qopqoq» deb koʻtarilganda ular tekshirilmasdan
   qolardi — natijada 96 % yopilgan, lekin 958×510 va 511×84 detallardan
   iborat tom chiqib ketardi. Yuza yopiq, lekin ogʻirlik notekis: ustiga
   terilgan pochka mayda detalni ezib sindiradi.

   QALINLIK ZAXIRASI: tag oʻzi `minBaseT` dan yupqa boʻlsa (butun pochka 3 mm
   orqa devor — 04-packer `thickOKon` buni kafolatlaydi), qalinlik talabi
   tushiriladi. Aks holda bunday pochkaning tomi hech qachon yopilmasdi.
   ============================================================ */
function tomOK(L, base, off){
  if (!L || !L.items || !L.items.length || !base) return false;
  if (S.lidN && L.items.length > S.lidN) return false;
  if (!lidBalOK(L)) return false;
  var minT = (base.T >= (S.minBaseT || 0) - 1e-9) ? (S.minBaseT || 0) : 0;
  /* «Gabaritdan chiqmasin» — POCHKA gabaritidan, tag chetidan emas. Oʻrta
     qavatlar chiqishga (S.ovh) haqli va aynan ular gabaritni belgilaydi;
     tom ham xuddi shu konvert ichida qolsa, u pochkadan chiqib turmaydi.
     Chiqishning oʻzi paddon qamrovi (baseCover/baseInset) bilan cheklangan. */
  var e = (off || 0) + 1e-6;
  for (var i = 0; i < L.items.length; i++){
    var q = L.items[i];
    if (q.it.T < minT - 1e-9) return false;                      // yupqa detal tom boʻlmaydi
    if (q.x < -e || q.y < -e ||
        q.x + q.a > base.L + e || q.y + q.b > base.W + e) return false;
  }
  return L.fill >= (S.lidFill || 0)/100 - 1e-9;
}
/* v17: qopqoq yasash sharti endi TOM sharti bilan bir xil — ikkovi bir
   qoidaga birlashdi. Nom saqlanadi: chaqiruv joyi qaysi maʼnoda ishlatayotgani
   koʻrinib tursin. */
function lidOK(L, base, off){ return tomOK(L, base, off); }

/* v21: TOM BAYROGʻI — BITTA JOYDA.

   `L.tom` — «bu qavat TOM shartidan oʻtdimi». Uch shart birdan:
     tomOK        — yuza, detal soni, ulush muvozanati, gabarit, qalinlik
     stackSuppOK  — har detal ostidagi qavatga yetarli tayanadimi (lidSupp)
     bedOK        — ostidagi qavat («toʻshak») oʻzi toʻlami (lidBed)

   Ilgari bu ifoda UCH joyda qoʻlda takrorlanardi (layoutPack, absorbTails,
   10-ui.js `refreshPack`) va nusxalar bir-biridan farq qilardi:
     - `makeLid()` yasagan qopqoqqa `tom = true` shartsiz qoʻyilardi;
     - `refreshPack` faqat `tomOK` ni tekshirardi — qoʻlda tuzatishdan keyin
       tayanchsiz tom «yopiq» deb belgilanardi va roʻyxatda hech narsa
       koʻrinmasdi (audit esa TOM_TAYANCH deb ogohlantirardi — ikkovi zid).
   Endi bayroqni faqat shu funksiya qoʻyadi. Ifodani koʻchirib yozmang. */
function markTom(layers, base, off){
  for (var i = 0; i < layers.length; i++){
    var L = layers[i], bel = i > 0 ? layers[i-1] : null;
    L.tom = (i === layers.length - 1) &&
            tomOK(L, base, off) &&
            stackSuppOK(L, bel ? bel.items : null, base) &&
            (!bel || bedOK(bel));
  }
  return layers;
}

/* 3.6.4 QOPQOQ — avval yaxlit 1 detal, boʻlmasa 2, keyin 3 */
function makeLid(pool, base, kgBudget){
  function drop(L){ L.items.forEach(function(q){ q.it.used=false; }); }
  /* v14: qopqoq TAG bilan bir xil talabga tushadi — u pochkaning ustki yuzasi,
     ustiga boshqa pochka terilishi va tasma tortilishi mumkin. Shu sabab:
       - minBaseT dan yupqa detal qopqoq boʻlolmaydi (3 mm XDF ezilib ketadi);
       - qopqoq ham BITTA qalinlikdan (aralashsa usti notekis boʻladi);
       - koʻp detalli qopqoqda ulushlar muvozanatli (lidBalOK). */
  var minT = S.minBaseT || 0;
  var ths = poolThicks(pool).filter(function(r){
    return r.t >= minT - 1e-9 && thickOKon(base, r.t);
  });
  if (!ths.length) return null;
  for (var n=1; n<=S.lidN; n++){
    var best=null;
    for (var ti=0; ti<ths.length; ti++)
    for (var o=0;o<ORD.length;o++){
      var L = makeLayer(pool, base.L, base.W, kgBudget, base.L, base.W, o, n,
                        false, null, ths[ti].t);
      var ok = L.items.length &&
               (base.L-L.bb.L) <= S.lidTol && (base.W-L.bb.W) <= S.lidTol &&
               lidOK(L, base, 0);
      var win = ok && (!best || L.fill > best.fill);
      /* v21: nomzod TOʻLIQ pool ustida baholanadi.
         Ilgari gʻolib nomzodning detallari `used=true` boʻlib qolardi va
         keyingi tartib (ORD) allaqachon kamaygan pool ustida sinalardi —
         nomzodlar teng sharoitda solishtirilmasdi. Endi har nomzoddan keyin
         pool boʻshatiladi; joylashuv (`L.items` koordinatalari) saqlanib
         qoladi, gʻolib esa qaytarishdan oldin qayta belgilanadi. */
      drop(L);
      if (win) best = L;
    }
    if (best){                  // eng kam detalli variant gʻolib
      best.items.forEach(function(q){ q.it.used = true; });
      best.lid = true;
      return best;
    }
  }
  return null;
}

/* v14: PADDON QAMROVI — tag yuzasi pochka gabaritining kamida `baseCover` % i
   boʻlishi shart, tag esa gabaritdan har tomonga `baseInset` mm dan koʻp
   ichkariga qochmasin. Foiz umumiy qamrovni ushlaydi, mm esa bitta yomon
   tomonni: uzun pochkada 5 % yuza ham 60 mm boʻlishi mumkin.

   v21: ayni shu qoida ikki joyda — `layoutPack()` ichidagi `coverOK` va
   quyruq uchun `tailCoverOK` — soʻzma-soʻz takrorlanardi. Endi bitta funksiya;
   `layers` — hisobga olinadigan qavatlar (qabul qilinganlari + sinalayotgani). */
function coverOK(base, layers){
  var gL = base.L, gW = base.W;
  (layers || []).forEach(function(L){
    if (L && L.bb){ gL = Math.max(gL, L.bb.L); gW = Math.max(gW, L.bb.W); }
  });
  if (S.baseInset != null){
    if ((gL - base.L)/2 > S.baseInset + 1e-9) return false;
    if ((gW - base.W)/2 > S.baseInset + 1e-9) return false;
  }
  if (!S.baseCover) return true;
  return ((base.L * base.W) / (gL * gW)) >= S.baseCover/100 - 1e-9;
}

/* 3.6.5 LAYOUTPACK — bitta pochka: tag → qavatlar (tartib: boʻlaklar pastda,
   yaxlitlar tepada) → qopqoq. Gʻisht terish (toq qavat 180°).
       strat 0: avval qopqoqni zaxiraga olamiz, keyin oʻrta qavatlar
       strat 1: avval qavatlarni toʻldiramiz, oxirgisi qopqoq boʻladi --- */
function layoutPack(base, mids, allowOvh, ord, strat, rndj){
  /* v14: chiqish PADDON QAMROVI bilan cheklanadi. `baseInset` — tag chetdan
     necha mm ichkarida qolishi mumkinligi; chiqish shundan katta boʻlsa tag
     ustidagi qavat osilib qoladi. Shuning uchun konvert ikkalasining kichigidan. */
  var off = allowOvh ? Math.min(S.ovh, (S.baseInset != null ? S.baseInset : S.ovh)) : 0;
  var envL = base.L + 2*off, envW = base.W + 2*off;
  mids.forEach(function(i){ i.used = false; });
  var budget = S.maxKg - base.kg, layers = [], lid = null;

  function drop(L){ L.items.forEach(function(q){ q.it.used=false; }); }

  /* v14: BALANDLIK — maxH mm. Qavat soni aralash qalinlikda balandlikni yomon
     oʻlchaydi (12×3 mm = 36 mm, 12×16 mm = 192 mm), shuning uchun ikkinchi chegara. */
  function heightOK(extra){
    if (!S.maxH) return true;
    var h = base.T + layers.reduce(function(s,L){ return s+L.h; }, 0) +
            (lid ? lid.h : 0) + (extra || 0);
    return h <= S.maxH + 1e-9;
  }

  if (strat === 0){
    lid = makeLid(mids, base, budget);
    /* v20: qopqoq qavat siklidan OLDIN yasaladi, shuning uchun `heightOK` uni
       hisobga oladi — lekin qopqoqning OʻZI chegaradan chiqarib yuborishi
       mumkin edi (tag + qopqoq > maxH). Unda qopqoqdan voz kechamiz. */
    if (lid && !heightOK(0)){ drop(lid); lid = null; }
    if (lid) budget -= lid.kg;
  }

  /* QAVAT LIMITI: tag(1) + oʻrta qavatlar + qopqoq(1) <= S.maxLayers.
     v21: `strat === 1` da qopqoq ALOHIDA qoʻshilmaydi — eng tepadagi oʻrta
     qavat qopqoq deb belgilanadi. Ilgari bu yoʻlda ham qopqoqqa oʻrin
     ayrilardi va natijada har pochkaning yarim variantlari bitta qavat kam
     terilardi (limit buzilmasdi, lekin joy behuda qolardi). */
  var midCap = S.maxLayers > 0 ? Math.max(0, S.maxLayers - 1 - (lid ? 1 : 0)) : 1e9;

  /* v14: har qavat BITTA qalinlikdan. Qolgan qalinliklar navbat bilan sinaladi
     va eng zichi olinadi — shu sabab 3 mm orqa devorlar 16 mm pochkasining
     oʻz qavatiga tushadi, aralashib ketmaydi. */
  for (var g=0; g<40 && layers.length < midCap; g++){
    var ths = poolThicks(mids), bestL = null, flip = layers.length % 2 === 1;
    for (var ti=0; ti<ths.length; ti++){
      if (!thickOKon(base, ths[ti].t)) continue;      // yupqa tag ustiga qalin detal yoʻq
      var Lc = makeLayer(mids, envL, envW, budget, base.L, base.W, ord||0, 1e9,
                         flip, rndj, ths[ti].t);
      if (!Lc.items.length){ continue; }
      if (Lc.fill < S.minFill/100 || !coverOK(base, layers.concat([Lc])) || !heightOK(Lc.h)){
        drop(Lc); continue;
      }
      if (!bestL || Lc.fill > bestL.fill){ if (bestL) drop(bestL); bestL = Lc; }
      else drop(Lc);
    }
    if (!bestL) break;
    layers.push(bestL); budget -= bestL.kg;
  }

  // agar pochka faqat tag detaldan iborat boʻlib qolsa — toʻliq boʻlmagan qavatga ruxsat
  if (!lid && !layers.length && midCap > 0){
    var wths = poolThicks(mids), Wk = null;
    for (var wi=0; wi<wths.length && !Wk; wi++){
      if (!thickOKon(base, wths[wi].t)) continue;
      var Wc = makeLayer(mids, envL, envW, budget, base.L, base.W, ord||0, 1e9,
                         false, rndj, wths[wi].t);
      if (Wc.items.length && coverOK(base, [Wc]) && heightOK(Wc.h)) Wk = Wc;
      else drop(Wc);
    }
    if (Wk){ Wk.weak = true; layers.push(Wk); budget -= Wk.kg; }
  }

  // tartiblash: koʻp detalli / toʻliq boʻlmagan qavatlar PASTGA,
  // yaxlit bir detalli qavatlar TEPAGA — pochka usti maksimal yaxlit boʻladi
  function wholeness(L){
    return (L.items.length===1 && L.fill>=0.96 &&
            L.items[0].x>=-1e-9 && L.items[0].y>=-1e-9 &&
            L.items[0].x+L.items[0].a<=base.L+1e-9 &&
            L.items[0].y+L.items[0].b<=base.W+1e-9) ? 1 : 0;
  }
  /* v15: saralash kaliti — avval TOM boʻla oladiganlar. Ilgari faqat
     «yaxlitlik» qaralardi; yaxlit boʻlmagan, lekin tag yuzasining 95 % ini
     yopadigan ikki detalli qavat pastda qolib, ustiga 27 % li qavat chiqib
     ketishi mumkin edi. */
  function topRank(L){ return tomOK(L, base, off) ? 2 : (wholeness(L) ? 1 : 0); }
  layers.sort(function(a,b){ return topRank(a)-topRank(b); });
  // gʻisht terish paritetini qayta qoʻllash (yaxlit qavatlar simmetrik, ularga taʼsir yoʻq)
  layers.forEach(function(L,i){
    if (wholeness(L)) return;
    var wantFlip = (i % 2 === 1);
    if (!!L.flipped !== wantFlip){ mirrorLayer(L.items, base.L, base.W); L.bb = bboxOf(L.items); L.flipped = wantFlip; }
  });

  if (lid) layers.push(lid);
  else if (layers.length){
    // qopqoq: eng tepadagi qavat; agar yaxlit boʻlmasa "soft" deb belgilanadi
    var last = layers[layers.length-1];
    last.lid = true;
    /* v14: bu qopqoq makeLid() dan OʻTMAGAN — u shunchaki eng ustki qavat
       boʻlgani uchun qopqoq deb belgilanmoqda. Demak unga qopqoq qoidalari
       (min qalinlik, muvozanat) qoʻllanmagan. Belgi tashxis va sinov uchun:
       «haqiqiy qopqoq» bilan «koʻtarilgan qopqoq» ni ajratib turadi. */
    last.impl = true;
    last.soft = !wholeness(last) && (last.fill < S.lidFill/100 || last.items.some(function(q){
      return q.x < -1e-9 || q.y < -1e-9 || q.x+q.a > base.L+1e-9 || q.y+q.b > base.W+1e-9; }));
  }

  /* TOM bayrogʻi — ikkala yoʻl uchun ham bir joyda: makeLid() yasagan qopqoq
     ham, koʻtarilgan eng ustki qavat ham ayni shu shartdan oʻtadi. */
  markTom(layers, base, off);

  var kg = base.kg + layers.reduce(function(s,L){ return s+L.kg; },0);
  return { base:base, layers:layers, kg:kg, envL:envL, envW:envW, off:off,
           allowOvh:allowOvh, left:mids.filter(function(i){ return !i.used; }) };
}

/* 3.6.6 PACKGROUP — har pochkaga PACK_TRIES ta variant sinaladi, eng zichi tanlanadi
   v10: generator — har pochka yigʻilgach `yield` qiladi. Shu sabab katta buyurtmada ham
   interfeys muzlamaydi: haydovchi (packAllAsync) har 40 ms da brauzerga nafas beradi. */
var PACKPROG = { t:0, tries:0, g:0, groups:0, packs:0, cancel:false };

/* Bitta guruhdan chiqadigan pochkalarning MUTLAQ chegarasi — cheksiz sikldan
   himoya. Meʼyor emas: normal ishlashda har guruh oʻnlab iteratsiyada tugaydi. */
var GREEDY_GUARD = 900;

function* greedyPackGen(list, rnd){
  var rem = list.slice().sort(ORD[0]), packs=[], odd=[], guard=0;
  while (rem.length && guard++ < GREEDY_GUARD){
    /* v14: TAG OYNASI — toʻrt chegara (eni min/maks, boʻyi min/maks) + qalinlik.
       Qalinlik chegarasi ZAXIRA yoʻli bilan: agar guruhda minBaseT ga yetadigan
       birorta detal boʻlmasa (masalan butun guruh 3 mm orqa devor), talab shu
       guruhning eng qalin detaliga tushiriladi. Aks holda butun guruh
       nostandartga oʻtib ketardi — bu qoidaning maqsadi emas. */
    var maxT = 0;
    rem.forEach(function(x){ if (x.T > maxT) maxT = x.T; });
    var minT = Math.min(S.minBaseT || 0, maxT);
    var elig=[];
    for (var i=0;i<rem.length;i++){
      var it=rem[i];
      if (it.W>=S.minBase && it.W<=(S.baseWMax||1e9) &&
          it.L>=(S.baseLMin||0) && it.L<=S.maxLen &&
          it.kg<=S.maxKg && it.T>=minT) elig.push(i);
    }
    if (!elig.length){ odd = odd.concat(rem); rem = []; break; }

    var best=null;
    function tryVariant(bi, st, o, rndj){
      var base = rem[bi];
      var others = rem.filter(function(_,k){ return k!==bi; });
      var pk = layoutPack(base, others, S.ovhOn, o, st, rndj);
      /* v15: BALLDA ENG KATTA VAZN — YOPIQ TOM.
         Ilgari ball «qopqoq bormi» degan savolga qarardi (L.lid bayrogʻi), lekin
         qopqoq eng ustki qavat qilib KOʻTARILGAN boʻlsa ham bayroq oʻrnatilardi —
         27 % yopilgan qavat ham «qopqoq» boʻlib hisoblanardi va jarima olmasdi.
         Endi ball haqiqiy holatga qaraydi: eng ustki qavat TOM shartidan
         (yuza ≥ lidFill, gabarit ichida, minBaseT dan qalin) oʻtdimi.
         Sabab: yetkazib berishda pochkalar ustma-ust teriladi va pastdagi
         pochkaning ochiq tomi ustidagining ogʻirligini bir necha detalga
         toʻplaydi. */
      var topL = pk.layers.length ? pk.layers[pk.layers.length-1] : null;
      var tomGood = !!(topL && topL.tom);
      var lidL = pk.layers.filter(function(L){ return L.lid; })[0];
      var lidWhole = lidL && lidL.items.length===1 && !lidL.soft;
      var gO = 0;
      pk.layers.forEach(function(L){ if (L.bb){
        gO = Math.max(gO, Math.max(0,L.bb.L-base.L) + Math.max(0,L.bb.W-base.W)); } });
      var sc = -pk.kg*3 + gO*0.05
             + (tomGood ? 0 : 90)                 // ochiq tom — eng ogʻir jarima
             + (lidWhole ? 0 : 8)                 // yaxlit qopqoq — kichik ustunlik
             + (pk.layers.length === 0 ? 400 : 0)
             + rnd()*4;
      if (!best || sc < best.sc) best = { pk:pk, sc:sc, bi:bi };
    }
    // KAMIDA PACK_TRIES VARIANT: har xil tag + strategiya + tartib + aralashtirish
    var N = PACK_TRIES;
    var baseCap = Math.min(elig.length, 10);
    for (var v=0; v<N; v++){
      var bi = (v < 3) ? elig[Math.min(v, elig.length-1)]
                       : elig[Math.floor(rnd()*baseCap)];
      var st = v % 2;
      var o  = Math.floor(rnd()*ORD.length);
      var jseed = rnd()*1e9;
      tryVariant(bi, st, o, v < 8 ? null : mulberry(jseed|0));   // dastlabki 8 tasi toza greedy
    }

    if (!best){ odd = odd.concat(rem); rem = []; break; }   // himoya: hech bir variant chiqmadi
    rem = best.pk.left;
    packs.push(best.pk);
    PACKPROG.packs++;
    yield PACKPROG;                    // bitta pochka tayyor — brauzerga nafas berish nuqtasi
  }
  /* Himoya toʻsigʻi ishlab ketgan boʻlsa qolgan detallar HECH QAYERGA
     tushmasdi — na `packs` ga, na `odd` ga. Ular auditda YOʻQOLGAN boʻlib
     chiqardi va sabab koʻrinmasdi. Endi ular nostandart oqimga oʻtadi:
     sikl ichidagi ikkita boshqa chiqish yoʻli allaqachon shunday qiladi. */
  if (rem.length) odd = odd.concat(rem);
  return { packs:packs, odd:odd };
}

/* 3.6.7 KONSOLIDATSIYA — kam toʻlgan pochkalar birlashtiriladi */
function* packGroupGen(list, rnd){
  var r = yield* greedyPackGen(list, rnd);
  for (var pass=0; pass<2; pass++){
    /* v15: ochiq tomli pochka ham kuchsiz — uni qayta terishga arziydi, chunki
       tomi yopiq boshqa terish varianti topilishi mumkin. */
    var weak = r.packs.filter(function(p){
      return p.kg < S.maxKg*0.62 || p.layers.length===0 ||
             !p.layers[p.layers.length-1].tom;
    });
    if (weak.length < 2) break;
    var strong = r.packs.filter(function(p){ return weak.indexOf(p) < 0; });
    var pool = [];
    weak.forEach(function(p){
      pool.push(p.base);
      p.layers.forEach(function(L){ L.items.forEach(function(q){ pool.push(q.it); }); });
    });
    pool = pool.concat(r.odd);
    var r2 = yield* greedyPackGen(pool, rnd);
    function openTop(list){
      return list.filter(function(p){
        return !p.layers.length || !p.layers[p.layers.length-1].tom;
      }).length;
    }
    var aloneA = weak.filter(function(p){ return p.layers.length===0; }).length;
    var aloneB = r2.packs.filter(function(p){ return p.layers.length===0; }).length;
    // v15: ochiq tom ham hisobga kiradi — birlashtirish uni kamaytirsa foydali
    var before = weak.length*10 + aloneA*4 + openTop(weak)*6 + (r.odd.length?1:0);
    var after  = r2.packs.length*10 + aloneB*4 + openTop(r2.packs)*6 + (r2.odd.length?1:0);
    if (after < before) r = { packs: strong.concat(r2.packs), odd: r2.odd };
    else break;
  }
  absorbTails(r.packs);          // 3.6.7.1 — qolgan yengil pochkalarni ustiga singdirish
  return r;
}

/* 3.6.7.1 QUYRUQ — guruh oxirida qoladigan YENGIL pochkani boshqa pochka USTIGA
   qoʻshib yuborish.

   Muammo: `minFill` (85%) qavat siklini uzadi — guruhning oxirgi 2–4 detali
   toʻliq qavat yasay olmaydi va oʻziga alohida pochka ochadi. namunada shu sabab
   3 mm orqa devorlar har modulda ikkiga boʻlinardi: 12 kg + 3 kg. Konsolidatsiya
   (3.6.7) buni tuzata olmaydi — u aynan shu greedy algoritmni qayta yuritadi va
   `minFill` yana oʻsha joyda uzadi.

   Yechim: qolgan detallar tayyor pochkaning ENG USTIGA qoʻyiladi. Nega toʻldirish
   talabi bu yerda tushiriladi — `minFill` mazmuni «ustidagi qavat egilmasin»:
   quyruq qavatning USTIDA hech narsa yoʻq, demak egiladigan narsa ham yoʻq.
   Quyruq qopqoqning ustiga tushadi, yaʼni tekis yuzada yotadi va qogʻoz bilan
   tasma uni joyida ushlab turadi.

   Qatʼiy shartlar (buzilsa singdirish bekor):
     - massa limiti va qavat limiti oshmaydi;
     - detallar konvert ichida qoladi (makeLayer envL/envW bilan tekshiradi);
     - nishon pochka SHU guruhdan — modul/material/klass/qalinlik chegarasi buzilmaydi
       (packGroupGen bitta guruh ichida ishlaydi, shuning uchun bu avtomatik);
     - HAMMASI yoki HECH NARSA: yengil pochka yarmigacha koʻchmaydi, aks holda
       ikkita chala pochka qolardi.
   Determinizm: tasodif ishlatilmaydi, tartib massa va uid boʻyicha qatʼiy. */
var TAIL_LAYERS = 2;          // bitta quyruq necha qavat qoʻsha oladi

/* ============================================================
   v15: QUYRUQ QAYERGA TUSHADI

   v13 da quyruq pochkaning ENG USTIGA qoʻyilardi. Asos: «ustida hech narsa
   yoʻq, demak egiladigan narsa ham yoʻq». Asos NOTOʻGʻRI edi — yetkazib
   berishda pochkalar bir-birining ustiga teriladi, demak pastdagi pochkaning
   tomi ustidagining butun ogʻirligini koʻtaradi. Ochiq tomda bu ogʻirlik bir
   necha kichik detalga toʻplanadi: qirralar eziladi, tasma boʻshaydi.

   Endi quyruq QOPQOQ OSTIGA suqiladi:

       ████████████████   qopqoq  100 %   ← ustiga keyingi pochka tayanadi
       ███░░░███░░░░░░░   quyruq   47 %   ← qoldiq detallar
       ████████████████   qavat    98 %
       ████████████████   TAG

   Pochkaning tomi tegilmaydi. Qopqoq quyruq ustida osilib qoladi, lekin
   koʻpi bilan BIR QAVAT (quyruq qalinligi, odatda 16 mm) pastga egiladi va
   shundan keyin quyi qavatga tayanadi — egilish oʻzi cheklangan.

   Nishon pochkaning tomi ochiq boʻlsa (qopqogʻi yoʻq), quyruq eskicha ustiga
   tushadi va TOM shartidan oʻtishi shart — u yerda uni himoya qiladigan
   qopqoq yoʻq.
   ============================================================ */

function tailParts(p){
  if (p.odd) return (p.items || []).slice();     // v16: noodatiy bogʻ ham manba boʻla oladi
  var out = [p.base];
  p.layers.forEach(function(L){ L.items.forEach(function(q){ out.push(q.it); }); });
  return out;
}

/* w pochkasining HAMMA detalini p ustiga qavat-qavat qoʻyib koʻradi.
   Hammasi joylashsa — yangi qavatlar roʻyxati, aks holda null. */
/* `kgLimit` — shu urinishda ruxsat etilgan YAKUNIY massa. absorbTails uni ikki
   bosqichda beradi: avval zaxirasiz (packKgCap), keyin zaxira bilan (packKgAbs). */
function tailFit(w, p, cap, kgLimit){
  var parts = tailParts(w), rest = parts.slice(), out = [];
  var budget = (kgLimit != null ? kgLimit : packKgAbs(p)) - p.kg;
  for (var n = 0; n < cap && rest.length; n++){
    /* v14: quyruq ham QAVAT — demak u ham bitta qalinlikdan boʻlishi shart.
       `used` AVVAL tozalanadi: detallar hozircha w pochkasiga tegishli va
       `used=true` turadi, poolThicks() esa faqat boʻshlarni sanaydi. */
    parts.forEach(function(x){ x.used = false; });
    var ths = poolThicks(rest), L = null;
    for (var ti = 0; ti < ths.length; ti++){
      if (!thickOKon(p.base, ths[ti].t)) continue;     // yupqa tag ustiga qalin detal yoʻq
      parts.forEach(function(x){ x.used = false; });   // makeLayer `used` boʻyicha filtrlaydi
      var Lc = makeLayer(rest, p.envL, p.envW, budget, p.base.L, p.base.W, 0, 1e9,
                         (p.layers.length + n) % 2 === 1, null, ths[ti].t);
      if (!Lc.items.length) continue;
      if (!coverOK(p.base, p.layers.concat(out, [Lc]))) continue;  // paddon qamrovi buzilmasin
      /* v15: quyruq — pochkaning ENG USTKI yuzasi, demak u ham TOM qoidasiga
         boʻysunadi. Ilgari bu yerda istisno bor edi va natijada 27 % yopilgan
         tom bilan pochka yopilib qolardi; ustiga boshqa pochka terilganda
         ogʻirlik ikki kichik detalga tushardi. */
      /* v16: quyruq HAR DOIM eng ustki qavat OSTIGA suqiladi — shuning uchun
         pochkaning tomi hech qachon yomonlashmaydi va TOM sharti bu yerda
         talab qilinmaydi. Yagona istisno: nishonda qavat umuman boʻlmasa
         (yolgʻiz tag), quyruq oʻzi tom boʻlib qoladi — unda shart amal qiladi. */
      if (!p.layers.length && !tomOK(Lc, p.base, p.off)) continue;
      /* v20: quyruq ustidagi qavat tayanchsiz oʻtmasin. Bu `minFill` oʻrnini
         bosadi: quyruq foiz boʻyicha ozod, lekin ORALIQ boʻyicha emas. */
      if (S.tailGap && layerGap(Lc, p.base) > S.tailGap + 1e-9) continue;
      /* v20: ... va tayanch TOR boʻlib qolmasin. Boʻshliq oʻlchovi markazdagi
         yolgʻiz tor detalni oʻtkazib yuborardi (chetlarda boʻshliq kichik,
         lekin qopqoq tor qirra ustida chayqaladi). */
      if (S.tailSpan && layerSpan(Lc, p.base) < S.tailSpan/100 - 1e-9) continue;
      if (S.maxH){                                       // v14: balandlik chegarasi
        var hAdd = out.reduce(function(a, L2){ return a + L2.h; }, 0) + Lc.h;
        if (packHeight(p, hAdd) > S.maxH + 1e-9) continue;
      }
      if (!L || Lc.items.length > L.items.length) L = Lc;
    }
    if (!L || !L.items.length) break;
    // gʻolib variantning detallarini qayta belgilaymiz (oxirgi sinov boshqasi boʻlishi mumkin)
    parts.forEach(function(x){ x.used = false; });
    L.items.forEach(function(q){ q.it.used = true; });
    L.tail = true;
    out.push(L); budget -= L.kg;
    var got = {};
    L.items.forEach(function(q){ got[q.it.uid] = 1; });
    rest = rest.filter(function(x){ return !got[x.uid]; });
  }
  // detallar qayerda boʻlmasin — w da yoki p da — baribir joylashgan
  parts.forEach(function(x){ x.used = true; });
  return rest.length ? null : out;
}

/* Quyruq qavati gabaritni kengaytirishi mumkin — paddon qamrovi qoidasi
   (`coverOK`, yuqorida) unda ham amal qiladi, aks holda quyruq tagdan osilib
   chiqib pochkani beqaror qilardi. */
function packHeight(p, extra){
  return p.base.T + p.layers.reduce(function(s, L){ return s + L.h; }, 0) +
         (extra || 0);
}
/* v21: `tailUnderLid()` shu yerda turardi — quyruq qopqoq ostiga tushishini
   hal qilardi. v20 da bu qaror `tailInsertAt()` ga oʻtdi (u faqat «tom
   yopiqmi» emas, «quyruq qaysi oʻringa suqiladi» degan savolga javob beradi)
   va funksiya oʻqilmay qoldi — hech bir joydan chaqirilmasdi. */
/* `sameKey` — nishon manba bilan bir xil pochkalash guruhida boʻlishi shart.
   packGroupGen ichida chaqirilganda kerak emas (u yerda hamma pochka bitta
   guruhdan), YAKUNIY bosqichda esa shart: u butun buyurtma boʻylab ishlaydi.

   v18: yakuniy bosqichda OQIM chegarasi ham qoʻshildi. v16 da bu yoʻq edi va
   natijada standart detallar nostandart pochkaga qoʻshilib ketardi — ikki oqim
   aralashib, uzun-tor detallar bogʻiga oddiy polka tushib qolardi.
   Endi qoida bitta: nostandart detal faqat nostandart bilan, standart qoldiq
   faqat standart pochka bilan birlashadi. */
/* v20: QAVATDAGI ENG KATTA TAYANCHSIZ ORALIQ, mm.

   Detallar ikki oʻqqa proyeksiya qilinadi va har oʻqda eng katta boʻsh oraliq
   topiladi — chetdan birinchi detalgacha, detallar orasida va oxirgi detaldan
   chetgacha. Ustidagi qavat aynan shu oraliq ustidan tayanchsiz oʻtadi.

   Nega yuza foizi emas: 4 ta tor detal butun chuqurlik boʻylab tarqalsa 44 %
   beradi va qopqoq bemalol tayanadi; oʻsha 44 % ikkita keng detal boʻlib
   yigʻilsa qopqoq 681 mm boʻshliq ustidan oʻtadi. Foiz ikkalasini ajratmaydi,
   oraliq ajratadi. */
function layerGap(L, base){
  function axis(lo, hi, span){
    var iv = L.items.map(function(q){ return [lo(q), hi(q)]; })
                    .sort(function(a,b){ return a[0]-b[0]; });
    var g = 0, cur = 0;
    for (var i = 0; i < iv.length; i++){
      if (iv[i][0] > cur) g = Math.max(g, iv[i][0] - cur);
      if (iv[i][1] > cur) cur = iv[i][1];
    }
    if (span > cur) g = Math.max(g, span - cur);
    return g;
  }
  if (!L || !L.items || !L.items.length || !base) return Infinity;
  return Math.max(
    axis(function(q){ return q.x; }, function(q){ return q.x + q.a; }, base.L),
    axis(function(q){ return q.y; }, function(q){ return q.y + q.b; }, base.W)
  );
}

/* v20: QAVATNING TAYANCH KENGLIGI — har oʻq boʻyicha qoplangan ulush (0…1).

   `layerGap` boʻshliqni oʻlchaydi, TAYANCH KENGLIGINI emas. Ikkovi boshqa-boshqa
   nosozlikni ushlaydi:

     boʻshliq  — ikkita keng detal bir chetga yigʻilib, oʻrtada katta teshik
     kenglik  — bitta tor detal MARKAZDA: teshik yoʻq, lekin ustidagi qopqoq
                tor qirraga tayanadi va chayqaladi

   Ikkinchisi aynan sexda koʻrilgan nosozlik: 1910×300 li pochkaga 1720×160 li
   quyruq markazga qoʻyilgan. Chetdagi boʻshliqlar atigi 70 va 102 mm — `tailGap`
   (300 mm) bemalol oʻtkazadi. Lekin qopqoq 300 mm enli pochkada 160 mm enli
   qirra ustida yotadi, yaʼni ARRA-KAMON boʻlib qoladi: ustiga pochka terilsa
   ag'dariladi.

   Shuning uchun qoplanish har oʻq boʻyicha ALOHIDA oʻlchanadi va kichigi
   qaytariladi — bitta oʻq boʻyicha 90 % boʻlishi ikkinchisini oqlamaydi.
   Chetdan chiqqan qismi hisobga olinmaydi (tagdan tashqarida tayanch yoʻq). */
function layerSpan(L, base){
  function axis(lo, hi, span){
    if (span <= 0) return 0;
    var iv = L.items.map(function(q){
      return [Math.max(0, lo(q)), Math.min(span, hi(q))];
    }).filter(function(v){ return v[1] > v[0]; })
      .sort(function(a,b){ return a[0]-b[0]; });
    var tot = 0, s = 0, cur = -1;
    for (var i = 0; i < iv.length; i++){
      if (cur < 0){ s = iv[i][0]; cur = iv[i][1]; continue; }
      if (iv[i][0] > cur){ tot += cur - s; s = iv[i][0]; cur = iv[i][1]; }
      else if (iv[i][1] > cur) cur = iv[i][1];
    }
    if (cur >= 0) tot += cur - s;
    return tot / span;
  }
  if (!L || !L.items || !L.items.length || !base) return 0;
  return Math.min(
    axis(function(q){ return q.x; }, function(q){ return q.x + q.a; }, base.L),
    axis(function(q){ return q.y; }, function(q){ return q.y + q.b; }, base.W)
  );
}

/* v20: BITTA DETALNING TAYANCH ULUSHI — u ostidagi qavatga yuzasining qancha
   qismi bilan tegadi (0…1).

   Bir qavat ichidagi detallar bir-birining ustiga tushmaydi (audit USTMA_UST
   invarianti buni kafolatlaydi), shuning uchun kesishmalar yigʻindisi = birlashma
   bilan kesishma. Qoʻshimcha geometriya kerak emas. */
function partSupport(q, below){
  var A = q.a * q.b;
  if (A <= 0) return 1;
  var got = 0;
  for (var i = 0; i < below.length; i++){
    var r = below[i];
    var ox = Math.min(q.x + q.a, r.x + r.a) - Math.max(q.x, r.x);
    var oy = Math.min(q.y + q.b, r.y + r.b) - Math.max(q.y, r.y);
    if (ox > 0 && oy > 0) got += ox * oy;
  }
  return Math.min(1, got / A);
}

/* Qavatdagi ENG YOMON tayanchli detalning ulushi.

   Nega minimum, oʻrtacha emas: uchta tom detalining oʻrtachasi 70 % boʻlishi
   mumkin, lekin chetdagi bittasi 0 % boʻlsa u baribir osilib turadi va ustiga
   pochka terilganda sinadi. Oʻrtacha aynan shu nosozlikni yashiradi. */
function layerSupp(above, below, base){
  if (!above || !above.items || !above.items.length) return 1;
  var bel = (below && below.length)
    ? below
    : (base ? [{ x:0, y:0, a:base.L, b:base.W }] : null);
  if (!bel) return 1;
  var mn = 1;
  for (var i = 0; i < above.items.length; i++){
    var v = partSupport(above.items[i], bel);
    if (v < mn) mn = v;
  }
  return mn;
}
/* v20: TOʻSHAK chegarasi — amaldagi qiymat.

   `minFill` dan qatʼiyroq boʻlolmaydi: oddiy qavat aynan `minFill` bilan qabul
   qilinadi, undan koʻpini talab qilish bajarilmas shart boʻlardi va audit
   hech qachon toza chiqmasdi. */
function bedMin(){
  var a = +S.lidBed || 0;
  if (!a) return 0;
  var b = +S.minFill || 0;
  return b ? Math.min(a, b) : a;
}
/* Qavat toʻshak boʻla oladimi — ustiga TOM qoʻyish mumkinmi. */
function bedOK(L){
  var m = bedMin();
  if (!m) return true;
  return !!L && L.fill >= m/100 - 1e-9;
}

/* Qavat ostidagisiga yetarli tayanadimi. `below` — ostidagi qavat detallari
   (yoki boʻsh: unda tag detal). */
function stackSuppOK(above, below, base){
  if (!S.lidSupp) return true;
  return layerSupp(above, below, base) >= S.lidSupp/100 - 1e-9;
}

/* Nishon massa chegarasiga sigʻadimi — ikki bosqichli tanlovda ishlatiladi. */
function p_fits(p, w, lim){ return p.kg + w.kg <= lim + 1e-9; }

function absorbTails(packs, sameKey){
  for (var round = 0; round < 4 && packs.length > 1; round++){
    var did = false;
    // eng yengildan boshlaymiz — kichigi kattaga singishi osonroq
    var light = packs.filter(function(p){ return p.kg < packKgCap(p) * 0.5; })
                     .sort(function(a,b){ return a.kg - b.kg || uidCmp(packUid(a), packUid(b)); });
    for (var wi = 0; wi < light.length; wi++){
      var w = light[wi];
      if (packs.indexOf(w) < 0) continue;                 // shu roundda allaqachon singdirilgan
      /* v16: nishon MASSA boʻyicha emas, MOSLIK boʻyicha tanlanadi.
         Hamma nomzod sinaladi va quyruq qavati eng zich chiqqani gʻolib —
         bu avtomatik ravishda BIR XIL OʻLCHAMLI detallarni birga toʻplaydi
         (bir xil oʻlcham → 100 % toʻldirish → eng yuqori ball).
         Teng boʻlsa ogʻirrogʻi, keyin uid — tartib qatʼiy, determinizm saqlanadi.

         v19: IKKI BOSQICH. Ilgari nomzod filtri darhol `packKgAbs` (35+10=45 kg)
         ni ruxsat berardi va eng zich joylashuv gʻolib boʻlardi. Natijada qoldiq
         20 kg li pochkaga (35 ichida qolar edi) emas, 33 kg li pochkaga tushib
         uni 41 kg ga koʻtarib yuborardi — zaxira ODDIY holatga aylanib qolgandi.
         Namunada 45 pochkadan 11 tasi 35 kg dan ogʻir chiqardi.
         Endi zaxira OXIRGI CHORA: avval chegara ichida joy qidiriladi, faqat
         topilmasa zaxira ochiladi. */
      var pool = packs.filter(function(p){
        return p !== w && !p.odd &&                 // bogʻda tag yoʻq — nishon boʻlolmaydi
               (!sameKey || p.key === w.key) &&     // guruh chegarasi buzilmasin
               (!sameKey || !p.nst === !w.nst) &&   // v18: OQIM chegarasi
               tailRoom(p) >= 1;
      }).sort(function(a,b){ return b.kg - a.kg || uidCmp(packUid(a), packUid(b)); });

      var best = null;
      for (var stage = 0; stage < 2 && !best; stage++){
        for (var ci = 0; ci < pool.length; ci++){
          var pc = pool[ci];
          // 0-bosqich: zaxirasiz · 1-bosqich: zaxira bilan
          var lim = stage === 0 ? packKgCap(pc) : packKgAbs(pc);
          if (stage === 1 && p_fits(pc, w, packKgCap(pc))) continue;   // 0-bosqichda sinalgan
          if (!p_fits(pc, w, lim)) continue;
          var Lc2 = tailFit(w, pc, Math.min(TAIL_LAYERS, tailRoom(pc)), lim);
          if (!Lc2) continue;
          /* v20: quyruq eng ustki qavat OSTIGA suqiladi, yaʼni u TOMNING YANGI
             TAYANCHI boʻlib qoladi. Ilgari bu yerda hech narsa tekshirilmasdi
             va izohda «koʻpi bilan bir qavat pastga egiladi» deb yozilgandi —
             asos notoʻgʻri edi: tomning chetdagi detali quyruqdan butunlay
             chiqib, havoda osilib qolishi mumkin ekan.
             Endi butun taxlam tekshiriladi: quyruq ostidagisiga, keyingi quyruq
             oldingisiga, tom esa eng ustki quyruqqa. */
          if (!tailStackOK(pc, Lc2)) continue;
          var fillSum = 0;
          Lc2.forEach(function(L){ fillSum += L.fill; });
          var cand2 = {
            p: pc, Ls: Lc2,
            /* Zaxiradan qancha yeyilishi. 0-bosqichda doim 0, demak tanlov
               faqat zichlik boʻyicha ketadi. 1-bosqichda esa BIRINCHI mezon —
               eng kam oshgan nishon: 33 kg li pochkani 41 ga koʻtargandan koʻra
               20 kg li pochkani 28 ga koʻtargan yaxshiroq. */
            over: Math.max(0, (pc.kg + w.kg) - packKgCap(pc)),
            score: fillSum / Lc2.length
          };
          if (!best ||
              cand2.over < best.over - 1e-9 ||
              (Math.abs(cand2.over - best.over) < 1e-9 && cand2.score > best.score + 1e-9))
            best = cand2;
        }
      }
      if (best){
        var p = best.p, Ls = best.Ls;
        /* v20: quyruq QAYERGA suqilishi tomga qarab hal qilinadi.

           Ilgari u har doim eng ustki qavat OSTIGA tushardi va izohda «ustki
           qavat koʻpi bilan bir qavat pastga egiladi» deb yozilgandi. Asos
           notoʻgʻri edi: tom uch tasmadan iborat boʻlsa, siyrak quyruq ustida
           chetdagi ikki tasma qirraga tayanib DUMALAB ketadi.

           Endi tom ostidagi qavat toʻldirish chegarasidan oʻtishi shart:
             - quyruq oʻzi zich boʻlsa   → eskicha, tom ostiga;
             - siyrak boʻlsa va pochkada zich qavat boʻlsa → BIR QAVAT PASTGA
               (tom oʻsha zich qavat ustida qoladi, quyruq esa uning ostida);
             - boshqa holatda nomzod tanlovda allaqachon rad etilgan. */
        var ins = tailInsertAt(p, Ls);
        if (ins < 0){ /* boʻlmasligi kerak — nomzod filtri ushlab qolgan */ }
        else if (!p.layers.length){
          Ls.forEach(function(L){ p.layers.push(L); p.kg += L.kg; });
        } else {
          var tailPart = p.layers.splice(ins, p.layers.length - ins);
          Ls.forEach(function(L){ p.layers.push(L); p.kg += L.kg; });
          tailPart.forEach(function(L){ p.layers.push(L); });
        }
        // v16: limitdan oshgan boʻlsa belgilaymiz — audit, chek va roʻyxat shunga qaraydi
        if (p.kg > packKgBase(p) + 1e-9) p.overKg = true;
        /* v15: eng ustki qavat oʻzgargan boʻlishi mumkin — bayroqlarni yangilaymiz.
           Aks holda audit eski qopqoqning `tom` bayrogʻiga qarab qolardi. */
        markTom(p.layers, p.base, p.off);
        packs.splice(packs.indexOf(w), 1);
        did = true;
      }
    }
    if (!did) break;
  }
  return packs;
}

/* v20: quyruq suqilgandan keyin taxlamning HAR bogʻlanishi tayanadimi.

   Yangi tartib: [... eski qavatlar (tomsiz) ] + Ls + [ tom ]
     Ls[0]   — pochkaning tomdan oldingi qavatiga (yoki tagga) tayanadi
     Ls[i]   — Ls[i-1] ga
     tom     — Ls[oxirgi] ga
   Uchalasi ham bir xil chegara (`lidSupp`) bilan tekshiriladi. */
/* v20: quyruq QAYSI OʻRINGA suqiladi.

   Qaytaradi: `p.layers` dagi indeks — quyruq shu oʻrindan oldin qoʻyiladi,
   yaʼni [0..ins-1] quyruq OSTIDA, [ins..] quyruq USTIDA qoladi.
     -1 — joy yoʻq (singdirish bekor).

   Uch holat:
     1) pochkada qavat yoʻq        → quyruq oʻzi qavat boʻladi (ins = 0)
     2) quyruq zich (toʻshak shartidan oʻtadi) → tom ostiga (ins = len-1)
     3) quyruq siyrak              → tom va uning ostidagi ZICH qavat
                                     tegilmaydi (ins = len-2), shunda tom
                                     eski zich qavat ustida qoladi */
function tailInsertAt(p, Ls){
  var lay = p.layers || [];
  if (!lay.length) return 0;
  var lastT = Ls[Ls.length-1];
  if (bedOK(lastT)) return lay.length - 1;           // tom ostiga
  if (lay.length >= 2 && bedOK(lay[lay.length-2])) return lay.length - 2;
  return -1;
}

/* Quyruq suqilgandan keyin taxlamning HAR bogʻlanishi tayanadimi.
   `tailInsertAt` bergan oʻringa qarab tekshiriladi — quyruq tom ostiga
   tushmasligi ham mumkin. */
function tailStackOK(p, Ls){
  if (!Ls || !Ls.length) return false;
  var ins = tailInsertAt(p, Ls);
  if (ins < 0) return false;
  if (!S.lidSupp) return true;
  var lay = p.layers || [];
  // quyruqdan pastdagi oxirgi qavat (yoki tag)
  var under = ins > 0 ? lay[ins-1].items : null;
  if (!stackSuppOK(Ls[0], under, p.base)) return false;
  for (var i = 1; i < Ls.length; i++)
    if (!stackSuppOK(Ls[i], Ls[i-1].items, p.base)) return false;
  // quyruq ustidagi qavatlar
  var above = lay.slice(ins);
  if (above.length && !stackSuppOK(above[0], Ls[Ls.length-1].items, p.base)) return false;
  return true;
}

/* pochka yana nechta qavat koʻtara oladi: tag(1) + qavatlar <= S.maxLayers */
function tailRoom(p){
  return S.maxLayers > 0 ? (S.maxLayers - 1 - p.layers.length) : TAIL_LAYERS;
}
function uidCmp(a, b){
  var x = (a && a.uid) || "", y = (b && b.uid) || "";
  return x < y ? -1 : (x > y ? 1 : 0);
}
/* Pochkani tartiblash uchun barqaror kalit — noodatiy bogʻda `base` yoʻq,
   shuning uchun birinchi detal olinadi. */
function packUid(p){
  if (!p) return null;
  if (p.odd) return (p.items && p.items[0]) || null;
  return p.base;
}

/* 3.6.8 POCHKALASH KALITI — detal qaysi guruhga tushishini hal qiladi.
   Toʻrt oʻq: modul / material / qalinlik / klass. Har oʻq mustaqil ravishda
   yo boʻladi, yo boʻlmaydi («*» — bu oʻq boʻyicha ajratilmaydi).

   v11: modul va klass oʻqlari endi GURUHNI ham tushunadi.
     - modGroupOf() → tumba va tremo bitta kalit oladi, demak bitta pochkaga tushadi
     - clsGroupOf() → {TOM,FASAD} bitta kalit oladi va qolgan klasslardan ajraladi
   Guruhga kirmagan klass eskicha ishlaydi: sepCls[cls] boʻlsa alohida, boʻlmasa umumiy. */
function packKey(it, rule){
  var mod = "*";
  // it.unit — birlik belgisi: proekt tuzilishidan yoki detal kodi prefiksidan (v11)
  if (rule.prod) mod = modGroupOf(it.unit) || it.unit;
  return mod + "/" + (rule.mat ? it.matId : "*") +
         "/" + (S.byThick ? thickKey(it.T) : "*") + "/" + clsKeyOf(it.cls);
}

/* ---- v14: QALINLIK MATRITSASI -------------------------------------------
   MAIN_T — buyurtmadagi ASOSIY qalinlik: detali eng koʻp boʻlgani. U
   packAllGen() da bir marta hisoblanadi va butun terish davomida oʻzgarmaydi
   (determinizm shunga tayanadi).

   thickKey() qalinlikni POCHKALASH KALITIGA aylantiradi. S.thickMix da
   belgilangan qalinlik asosiy qalinlikning kalitini oladi — yaʼni oʻsha
   pochkaga tushadi. Lekin QAVAT darajasida ular baribir ajratilgan
   (makeLayer `tOnly`), tag va qopqoq esa minBaseT bilan himoyalangan.
   Demak «qoʻshish» degani: bitta pochkada, alohida qavatlarda. */
var MAIN_T = null;
function thickKey(T){
  var k = String(T);
  if (MAIN_T != null && S.thickMix && S.thickMix[k]) return String(MAIN_T);
  return k;
}
/* Asosiy qalinlikni aniqlash — detal soni boʻyicha. Teng boʻlsa qalini gʻolib
   (qalin detal tag boʻla oladi, yupqasi yoʻq). */
function mainThick(items){
  var cnt = {};
  items.forEach(function(it){ cnt[it.T] = (cnt[it.T] || 0) + 1; });
  var best = null;
  Object.keys(cnt).forEach(function(k){
    if (!best || cnt[k] > cnt[best] || (cnt[k] === cnt[best] && +k > +best)) best = k;
  });
  return best == null ? null : +best;
}
function clsKeyOf(cls){
  return clsGroupOf(cls) || ((S.sepCls && S.sepCls[cls]) ? cls : "*");
}
/* v12: ikki detal QAYSI oʻq boʻyicha turli guruhga tushishini aytadi.
   packKey() faqat «bir xilmi» degan savolga javob beradi, tahrirlashda esa P/M
   nima uchun rad etilganini bilishi kerak: «mos emas» emas, «material mos emas:
   Egger W1000 / LDSP oq». Oʻqlar packKey() dagi tartibda tekshiriladi. */
function keyWhy(it, other, rule){
  if (rule.prod){
    var a = modGroupOf(it.unit) || it.unit;
    var b = modGroupOf(other.unit) || other.unit;
    if (a !== b) return "modul mos emas: " + (it.unitName || it.unit) +
                        " / " + (other.unitName || other.unit);
  }
  if (rule.mat && it.matId !== other.matId)
    return "material mos emas: " + ((it.mat && it.mat.name) || it.matId) +
           " / " + ((other.mat && other.mat.name) || other.matId);
  // v14: matritsada qoʻshilgan qalinliklar bitta kalitga tushadi — «mos emas» emas
  if (S.byThick && thickKey(it.T) !== thickKey(other.T))
    return "qalinlik mos emas: " + it.T + " mm / " + other.T + " mm";
  if (clsKeyOf(it.cls) !== clsKeyOf(other.cls))
    return "klass mos emas: " + it.cls + " / " + other.cls;
  return null;
}
/* Guruhning odam oʻqiydigan nomi — pochkalar roʻyxatidagi sarlavha uchun.
   Bir nechta modul birlashtirilgan boʻlsa ularning nomlari sanab oʻtiladi. */
function groupLabel(list, rule){
  if (!list || !list.length) return "Pochka";
  var it = list[0];
  if (!rule.prod) return "Umumiy";
  var gi = modGroupOf(it.unit);
  if (!gi) return it.unitName || it.prod || "Pochka";
  var seen = {}, names = [];
  list.forEach(function(x){
    var nm = x.unitName || x.prod;
    if (!seen[nm]){ seen[nm] = 1; names.push(nm); }
  });
  return names.join(" + ");
}
/* v12: pochka qaysi XONAGA tegishli — roʻyxat sarlavhasi va chek uchun.
   «Birga pochkalansin» oʻchiq xonada ham nom qaytadi: u yerda xona modullarni
   birlashtirmaydi, lekin belgi boʻlib qoladi. */
function groupRoom(list){
  if (!list || !list.length) return "";
  var r = roomOf(list[0].unit);
  return r ? r.name : "";
}
/* v12: guruhlarni XONA → MODUL → klass → material tartibida tizish.
   Pochka raqami shu tartibda beriladi, demak roʻyxat ham shunday chiqadi:
   ishchi bir xonaning pochkalarini bir joyda koʻradi, sakrab yurmaydi. */
function groupSortKey(list){
  var it = (list && list[0]) || {};
  var r = roomOf(it.unit);
  // xonasiz modullar oxirida — xona nomi boʻyicha, soʻng modul kodi boʻyicha
  return (r ? "0" + ("00" + r.i).slice(-3) : "1") + "|" +
         String(it.unit || "") + "|" +
         String(it.cls || "") + "|" + String(it.matId || "");
}

/* ============================================================
   3.6.8.5 NOSTANDART OQIM (v14)

   Ilgari tag oynasidan chiqqan detallar shunchaki bitta roʻyxatga tashlanardi
   va massa boʻyicha boʻlinardi — geometriyasi ham, tartibi ham yoʻq edi.
   Amalda esa ular buyurtmaning eng katta, eng ogʻir va eng noqulay qismi:
   2,4 m li bok, uzun sokol, keng tom. Ular ham saralanadi.

   Ikki yoʻl, tizim oʻzi tanlaydi:

     TOʻLIQ POCHKA — detal TAG boʻla oladigan bo'lsa (eni ≥ minBase va
       nostandart gabaritga sigʻsa). Oddiy pochkadagi butun mantiq ishlaydi:
       tag → qavatlar → qopqoq, faqat massa va boʻyi chegarasi kattaroq
       (oddKg, oddLMax, oddWMax).

     BOGʻ — detal TOR (eni minBase dan kichik), yaʼni tag boʻlolmaydi va
       ustiga qavat terib boʻlmaydi. Bunday detallar oʻlchami yaqinlari bilan
       ustma-ust bogʻ qilinadi: 2 ta 2400×180 — bu tabiiy bogʻ. «Yaqin»
       chegarasi — oddTol (mm).

   Ikkala yoʻlda ham pochkalash kaliti (modul / material / qalinlik / klass)
   buzilmaydi: guruhlash packKey() boʻyicha, oddiy oqimdagidek.
   ============================================================ */

/* Nostandart limitlarini vaqtincha oʻrnatib funksiyani chaqiradi.
   Sabab: layoutPack/greedyPackGen limitlarni S dan oʻqiydi va ularni
   parametrga chiqarish butun signaturani buzardi.

   DIQQAT: chaqiruv `try … finally` ichida boʻlishi SHART. Izohda `finally`
   ilgari ham yozilgan edi, lekin kodda yoʻq edi — natijada pochkalash bekor
   qilinganda (`packAllAsync` generatorni `return()` qiladi) S.maxKg 35 emas,
   40 boʻlib qolardi va keyingi qayta hisobgacha butun interfeys notoʻgʻri
   chegara koʻrsatardi. */
function oddLimitsOn(){
  var sv = { maxKg:S.maxKg, maxLen:S.maxLen, baseWMax:S.baseWMax };
  S.maxKg    = Math.max(S.maxKg,  +S.oddKg   || S.maxKg);
  S.maxLen   = Math.max(S.maxLen, +S.oddLMax || S.maxLen);
  S.baseWMax = Math.max(S.baseWMax || 0, +S.oddWMax || 0) || S.baseWMax;
  return sv;
}
function oddLimitsOff(sv){
  S.maxKg = sv.maxKg; S.maxLen = sv.maxLen; S.baseWMax = sv.baseWMax;
}

/* BOGʻ — tor detallarni oʻlchami yaqinlari bilan ustma-ust yigʻish.
   Roʻyxat oʻlcham boʻyicha saralangani uchun yaqin detallar yonma-yon turadi;
   shu sabab faqat OXIRGI bogʻ bilan solishtiriladi — natija qatʼiy va tez. */
function oddBundles(list){
  var out = [];
  var tol = (S.oddTol != null ? +S.oddTol : 300);
  var kgCap = (+S.oddKg || S.maxKg);
  /* v20: BALANDLIK CHEGARASI BOGʻGA HAM.
     Bogʻ — detallarning ustma-ust taxlami, demak balandligi qalinliklar
     yigʻindisi. Ilgari bu yerda faqat massa, oʻlcham yaqinligi va gabarit
     tekshirilardi; balandlik esa umuman qaralmasdi. Natijada `maxH = 160` mm
     qoʻyilgan buyurtmada 12 ta 16 mm li detal bitta bogʻga tushib 192 mm
     boʻlib chiqardi — chegara oddiy pochkalarda ishlar, bogʻda ishlamasdi.
     Foydalanuvchi buni sexda koʻrdi: «massa yetib balandlik yetmasa ham
     pochka qadoqlanadi».
     Massa bilan balandlik endi TENG HUQUQLI: qaysi biri avval toʻlsa, bogʻ
     shu yerda yopiladi. */
  var hCap = (+S.maxH || 0);
  /* v20: QAVAT SONI chegarasi bogʻga ham. Bogʻ — N ta detalning ustma-ust
     taxlami, yaʼni N qavat. Ilgari bu chegara faqat oddiy pochkaga
     qoʻllanardi va bogʻ undan oshib ketishi mumkin edi; roʻyxatda esa u
     «12 qavat» boʻlib koʻrinardi va operator chegara ishlamayapti deb
     oʻylardi. Massa, balandlik va qavat soni endi bogʻda ham amal qiladi. */
  var nCap = (S.maxLayers > 0 ? S.maxLayers : 0);
  list.slice().sort(function(a,b){
    return b.L - a.L || b.W - a.W ||
           (a.code < b.code ? -1 : (a.code > b.code ? 1 : 0));
  }).forEach(function(it){
    var b = out.length ? out[out.length-1] : null;
    var fits = !!b &&
      b.kg + it.kg <= kgCap + 1e-9 &&
      (!hCap || b.h + it.T <= hCap + 1e-9) &&          // v20: balandlik
      (!nCap || b.items.length < nCap) &&              // v20: qavat soni
      Math.abs(it.L - b.L0) <= tol + 1e-9 &&
      Math.abs(it.W - b.W0) <= tol + 1e-9 &&
      Math.max(b.gabL, it.L) <= (+S.oddLMax || 1e9) + 1e-9 &&
      Math.max(b.gabW, it.W) <= (+S.oddWMax || 1e9) + 1e-9 &&
      (!S.byThick || Math.abs(b.t - it.T) < 1e-9);
    if (!fits){
      /* Yangi bogʻ. Detal YOLGʻIZ oʻzi chegaradan oshsa ham shu yerga tushadi —
         detalni boʻlib boʻlmaydi. Audit buni XATO emas, ogohlantirish deb
         koʻrsatadi (massa uchun MASSA_NOODATIY qanday boʻlsa, shunday). */
      b = { odd:true, items:[], kg:0, h:0, t:it.T, L0:it.L, W0:it.W, gabL:0, gabW:0 };
      out.push(b);
    }
    b.items.push(it); b.kg += it.kg; b.h += it.T;
    b.gabL = Math.max(b.gabL, it.L);
    b.gabW = Math.max(b.gabW, it.W);
  });
  out.forEach(function(b){ delete b.L0; delete b.W0; });   // faqat qurishda kerak edi
  return out;
}

function* oddPackGen(list, rule){
  var out = [];
  if (!list || !list.length) return out;
  /* v18: OQIM AJRATILADI. Bu oqimga ikki xil detal keladi:
       nst = true  — HAQIQIY nostandart: oʻlcham yoki massa chegarasidan chiqqan
       nst = false — standart guruhning QOLDIGʻI: tag boʻlolmagan tor detal
     Ular bir-biriga aralashmasligi kerak. Nostandart detal oʻziga oʻxshagan
     nostandart bilan bogʻlanadi, standart qoldiq esa oʻz oqimida qoladi va
     keyin standart pochkaga singdirilishi mumkin (3.6.9 yakuniy bosqich). */
  var groups = {};
  list.forEach(function(it){
    var k = (it.nst ? "NS/" : "ST/") + packKey(it, rule);
    (groups[k] = groups[k] || []).push(it);
  });
  var gks = Object.keys(groups).sort();
  for (var gi = 0; gi < gks.length; gi++){
    var gk = gks[gi], g = groups[gk];
    /* Prefiks («NS/» yoki «ST/») FAQAT shu yerda guruhlash uchun kerak edi.
       Pochkaga esa TOZA pochkalash kaliti yoziladi — aks holda yakuniy
       singdirish bosqichi kalitni standart pochkaniki bilan solishtira
       olmaydi va standart qoldiq oʻz pochkasini topolmay qoladi. */
    var pkey = packKey(g[0], rule);
    // TAG boʻla oladiganlar — toʻliq pochka mantiqi
    var wide = [], narrow = [];
    g.forEach(function(it){
      if (it.W >= S.minBase && it.L <= (+S.oddLMax || 1e9) && it.W <= (+S.oddWMax || 1e9))
        wide.push(it);
      else narrow.push(it);
    });
    /* Guruh nomi va xonasi — oddiy oqimdagidek. Ularsiz nostandart pochka
       roʻyxatda «Umumiy» ostiga tushib, xona pochkalarini ikkiga boʻlib
       yuborardi (ishchi bitta xonani ikki joydan qidirardi). */
    var gl = groupLabel(g, rule), gr = groupRoom(g);
    if (wide.length){
      /* packGroupGen — greedyPackGen ustiga konsolidatsiya (3.6.7) va quyruq
         (3.6.7.1) qoʻshadi. Nostandart oqimga ular ayniqsa kerak: u yerda
         detal kam, demak yarim boʻsh pochka ehtimoli yuqori. */
      var sv = oddLimitsOn(), res;
      try { res = yield* packGroupGen(wide, mulberry(ODD_SEED)); }
      finally { oddLimitsOff(sv); }
      for (var pi = 0; pi < res.packs.length; pi++){
        var pk = res.packs[pi];
        pk.key = pkey; pk.gname = gl; pk.room = gr;
        pk.oddSrc = true;                   // «nostandart oqimdan chiqqan» belgisi
        pk.nst = !!g[0].nst;                // v18: qaysi oqim — aralashmasin
        out.push(pk);
      }
      narrow = narrow.concat(res.odd);
    }
    oddBundles(narrow).forEach(function(b){
      b.key = pkey; b.gname = gl; b.room = gr;
      b.nst = !!(b.items[0] && b.items[0].nst);   // v18
      out.push(b);
    });
  }
  return out;
}

/* 3.6.9 PACKALL — butun buyurtma: qalinlik/modul/material guruhlash, noodatiylar */
function* packAllGen(){
  var items = buildItems();
  var rule = S.split || { prod:true, mat:false };   // v12: bitta umumiy qoida
  MAIN_T = mainThick(items);        // v14: qalinlik matritsasining asosi
  var oddPre = [], main = [];
  /* v14: NOSTANDART FILTRI. Detal tag oynasining YUQORI chegarasidan chiqsa
     nostandart oqimga oʻtadi — chunki u hech qanday tagga sigʻmaydi.
     Oynaning PAST chegarasi (minBase, baseLMin) bu yerda tekshirilmaydi:
     kichik detal tag boʻlolmaydi, lekin qavatga bemalol tushadi. */
  items.forEach(function(it){
    var why = null;
    if (it.L > S.maxLen)               why = it.L + " mm > " + S.maxLen + " mm (tag boʻyi)";
    else if (it.W > (S.baseWMax||1e9)) why = it.W + " mm > " + S.baseWMax + " mm (tag eni)";
    else if (it.kg > S.maxKg)          why = it.kg.toFixed(1) + " kg > " + S.maxKg + " kg";
    // v18: pastki chegara — mayda detal ham nostandart oqimga oʻtishi mumkin
    else if (S.minPartW && it.W < S.minPartW)
      why = it.W + " mm < " + S.minPartW + " mm (min eni)";
    else if (S.minPartL && it.L < S.minPartL)
      why = it.L + " mm < " + S.minPartL + " mm (min boʻyi)";
    if (why){
      it.why = why;
      it.nst = true;       // v18: HAQIQIY nostandart — oqimlar shunga qarab ajraladi
      oddPre.push(it);
    }
    else { it.nst = false; main.push(it); }
  });
  var groups = {};
  main.forEach(function(it){
    (groups[packKey(it, rule)] = groups[packKey(it, rule)] || []).push(it);
  });

  var best=null;
  // v12: guruhlar xona → modul tartibida teriladi, demak pochka raqamlari ham
  // shu tartibda beriladi (groupSortKey). Tartib qatʼiy — determinizm saqlanadi.
  var gks = Object.keys(groups).sort(function(a,b){
    var ka = groupSortKey(groups[a]), kb = groupSortKey(groups[b]);
    return ka < kb ? -1 : (ka > kb ? 1 : (a < b ? -1 : (a > b ? 1 : 0)));
  });
  var TRIES = Math.max(1, S.tries);
  PACKPROG.tries = TRIES; PACKPROG.groups = gks.length; PACKPROG.packs = 0;
  for (var t=0; t<TRIES; t++){
    /* Bitta urugʻ hamma guruh boʻylab ketma-ket ishlatiladi. Demak guruhlar
       TARTIBI natijaga taʼsir qiladi — lekin tartib qatʼiy (groupSortKey), shuning
       uchun bir xil kirish va bir xil sozlama har doim bir xil natija beradi.
       Har guruhga alohida urugʻ berib koʻrildi (tartibdan mustaqil boʻlsin deb) —
       namunada natija yomonlashdi: 55 pochka oʻrniga 57. Shu sabab qoldirildi. */
    var rnd = mulberry(MAIN_SEED + t*SEED_STEP), all=[], odd=oddPre.slice();
    PACKPROG.t = t+1;
    // forEach ichida yield qilib boʻlmaydi — shu sabab oddiy for sikli
    for (var gi=0; gi<gks.length; gi++){
      PACKPROG.g = gi+1;
      var glist = groups[gks[gi]];
      var r = yield* packGroupGen(glist, rnd);
      // v11: guruh nomini pochkaga yozamiz — birlashtirilgan modullarda
      // «01 shkaf + tumba» deb koʻrsatish uchun (base.prod bittasini beradi xolos)
      var gl = groupLabel(glist, rule), gr = groupRoom(glist);
      // v12: GURUH KALITI pochkada saqlanadi. Ilgari kalit faqat shu sikl ichida
      // yashardi, natijada qoʻlda tahrirlash (moveDetail) qaysi pochka qaysi guruhga
      // tegishli ekanini BILMASDI va material yoki modulni aralashtirib yuborardi.
      // Kalit endi pochka bilan birga yashaydi. room — xona nomi (chek va roʻyxat).
      r.packs.forEach(function(p){ p.gname = gl; p.key = gks[gi]; p.room = gr; p.nst = false; });
      all = all.concat(r.packs); odd = odd.concat(r.odd);
    }
    var wFill = all.length ? all.reduce(function(s,p){ return s+p.kg; },0)/(all.length*S.maxKg) : 0;
    var lFill = 0, nL = 0;
    all.forEach(function(p){ p.layers.forEach(function(L){ lFill += Math.min(1.3,L.fill); nL++; }); });
    lFill = nL ? lFill/nL : 0;
    // v15: «qopqoq bormi» emas, «tom yopiqmi» — pastdagi izohga qarang
    var noTom = all.filter(function(p){
      return !p.layers.length || !p.layers[p.layers.length-1].tom;
    }).length;
    var score = all.length*1000 + odd.length*300 + noTom*140 - wFill*260 - lFill*120;
    if (!best || score < best.score) best = { score:score, packs:all, odd:odd };
  }

  var out = best.packs;
  // v14: nostandartlar endi saralanadi — 3.6.8.5 ga qarang
  var oddOut = yield* oddPackGen(best.odd, rule);
  for (var oi = 0; oi < oddOut.length; oi++) out.push(oddOut[oi]);

  /* v16: YAKUNIY SINGDIRISH — butun buyurtma boʻylab.
     packGroupGen ichidagi singdirish faqat OʻZ guruhi bilan ishlaydi va
     nostandart oqim undan keyin quriladi. Natijada yolgʻiz qolgan bogʻ
     (masalan bitta 438×100 detal) standart pochkada xuddi shu oʻlchamdagi
     detallar turgani holda alohida qolib ketardi.
     Shu bosqich buni tuzatadi: bogʻ ham, yengil pochka ham SHU GURUHDAGI
     standart pochkaga singdiriladi — gabarit, qalinlik, qavat, balandlik va
     paddon qamrovi shartlari bilan, massa zaxirasi doirasida. */
  absorbTails(out, true);

  /* v14: nostandart pochka OʻZ GURUHINING ORQASIGA qoʻyiladi.
     Ilgari ular roʻyxat oxiriga tushardi va bitta xona ikki joyda —
     boshida va oxirida — sarlavha olardi; ishchi xonani ikki marta
     qidirardi. Tartib qatʼiy: guruh navbati → standart, keyin nostandart →
     guruh ichidagi asl tartib. Determinizm buzilmaydi. */
  var rank = {};
  gks.forEach(function(k, i){ rank[k] = i; });
  out.forEach(function(p, i){ p.__i = i; });
  function rankOf(p){ return (rank[p.key] != null) ? rank[p.key] : 1e6; }
  out.sort(function(a, b){
    var d = rankOf(a) - rankOf(b);
    if (d) return d;
    if (rankOf(a) >= 1e6){                      // ikkalasi ham yangi guruh — kalit boʻyicha
      var ka = a.key || "", kb = b.key || "";
      if (ka !== kb) return ka < kb ? -1 : 1;
    }
    var oa = (a.odd || a.oddSrc) ? 1 : 0, ob = (b.odd || b.oddSrc) ? 1 : 0;
    if (oa !== ob) return oa - ob;
    return a.__i - b.__i;
  });
  out.forEach(function(p){ delete p.__i; });
  // TERISH REVIZIYASI: har qayta pochkalashda +1. Chekdagi QR ichiga yoziladi, shuning uchun
  // eski terishdan chop etilgan chek skanerlanganda tizim buni darhol aniqlaydi.
  P.rev = (P.rev || 0) + 1;
  out.forEach(function(p,i){
    p.no = i+1;
    p.rev = P.rev;
    packDerive(p);
    /* v21: `left` — layoutPack ning ISHCHI maydoni: «shu tagga sigʻmaganlar».
       greedyPackGen uni keyingi pochkaga uzatadi, yaʼni terish tugagach
       roʻyxatdagi detallar ALLAQACHON boshqa pochkalarda turadi. Uni tozalab
       qoʻymaslik jimgina xatoga olib kelardi: «chiqishga ruxsat» katagi
       (10-ui.js `togglePackOvh`) shu roʻyxatni pochkaga qayta qoʻshib,
       detallarni IKKI joyda paydo qilardi. */
    p.left = [];
    p.done = 0;
  });
  PACKS = out;
  return out;
}

/* 3.6.8.1 SINXRON KOʻRINISH — generatorni bir yoʻla oxirigacha aylantiradi.
   Interfeys buni CHAQIRMAYDI: u har doim `packAllAsync()` orqali ishlaydi
   (aks holda katta buyurtmada brauzer muzlaydi). Bu oʻram sinov va skript
   uchun — `smoke.ps1`, `corpus.ps1` va oʻlchov vositalari shuni ishlatadi. */
function packAll(){
  var g = packAllGen(), r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}

/* 3.6.8.2 ASINXRON HAYDOVCHI — har 40 ms da brauzerga boshqaruvni qaytaradi.
   onProg(PACKPROG) — jarayon koʻrsatkichi uchun. Bekor qilinsa PACKS oʻzgarmaydi.
   Qaytaradi: Promise<{ok:true}> yoki Promise<{ok:false, cancelled:true}> */
var PACK_RUN = 0;   // har chaqiruvga oʻz raqami: yangi hisob boshlansa eskisi oʻz-oʻzidan toʻxtaydi
function packAllAsync(onProg){
  var prevPacks = PACKS;
  var myRun = ++PACK_RUN;
  PACKPROG.cancel = false;
  return new Promise(function(resolve, reject){
    var gen = packAllGen();
    function pump(){
      if (myRun !== PACK_RUN){                   // ustimizdan yangi hisob boshlandi
        try { gen.return(); } catch(e){}
        resolve({ ok:false, superseded:true });   // PACKS ga TEGMAYMIZ — u yangi hisobniki
        return;
      }
      if (PACKPROG.cancel){
        try { gen.return(); } catch(e){}
        PACKS = prevPacks;                       // bekor qilindi — eski natija qoladi
        resolve({ ok:false, cancelled:true });
        return;
      }
      var t0 = nowMs();
      try {
        for (;;){
          var r = gen.next();
          if (r.done){ if (onProg) onProg(PACKPROG); resolve({ ok:true }); return; }
          var now = nowMs();
          if (now - t0 > 40) break;              // 40 ms ishladik — nafas olamiz
        }
      } catch(e){ if (myRun === PACK_RUN) PACKS = prevPacks; reject(e); return; }
      if (onProg) onProg(PACKPROG);
      setTimeout(pump, 0);
    }
    setTimeout(pump, 0);
  });
}

/* 3.6.9 SEQ — yigʻish ketma-ketligi: tag → qavatlar → qopqoq */
function packSeq(p){
  var s=[];
  if (p.odd){
    p.items.forEach(function(it,i){ s.push({it:it, layer:i+1, pos:null, role:"noodatiy"}); });
    return s;
  }
  s.push({it:p.base, layer:0, pos:{x:0,y:0,a:p.base.L,b:p.base.W,rot:0}, role:"tag", n:1, of:1});
  p.layers.forEach(function(L,li){
    L.items.forEach(function(q,qi){
      /* weak — qavat toʻliq toʻlmagan holat. Ilgari u qadamga koʻchirilmasdi va
         10-ui.js dagi «· toʻliq emas» yozuvi hech qachon chiqmasdi. */
      /* v13: quyruq qavat qopqoqning USTIGA tushadi, shuning uchun «ust» roli
         faqat haqiqatan eng tepadagi qopqoqqa beriladi. */
      s.push({it:q.it, layer:li+1, pos:q,
              role: L.tail ? "quyruq" : (L.lid && li === p.layers.length-1 ? "ust" : "qavat"),
              n:qi+1, of:L.items.length, fill:L.fill, weak:!!L.weak});
    });
  });
  return s;
}

/* 3.6.9.1 HOSILA MAYDONLAR — bitta joyda.

   `kg`, `t`, `h`, `gabL`, `gabW`, `fillAvg`, `seq` — hammasi `base` + `layers`
   dan (bogʻda `items` dan) kelib chiqadi, yaʼni ularni saqlashning maʼnosi
   yoʻq: har oʻzgarishdan keyin qayta hisoblanadi.

   Ilgari bu hisob TOʻRT joyda qoʻlda takrorlanardi — `packAllGen()`,
   09-storage `restoreSnapshot()`, 10-ui `togglePackOvh()` va `refreshPack()` —
   va nusxalar bir-biridan farq qilib ketgan edi (bogʻning gabariti faqat
   tiklashda hisoblanardi, `fillAvg` esa uch xil shaklda yozilgandi).

   Hosila EMAS va shuning uchun bu yerda tegilmaydi: `no`, `rev`, `done`,
   `key`, `gname`, `room`, `nst`, `oddSrc`, `overKg`, `allowOvh`, `off`. */
function packDerive(p){
  if (!p) return p;
  if (p.odd){
    var its = p.items || [];
    p.kg   = its.reduce(function(s,x){ return s + x.kg; }, 0);
    p.h    = its.reduce(function(s,x){ return s + x.T;  }, 0);
    if (p.t == null) p.t = its.length ? its[0].T : 0;
    p.gabL = its.reduce(function(m,x){ return Math.max(m, x.L); }, 0);
    p.gabW = its.reduce(function(m,x){ return Math.max(m, x.W); }, 0);
    p.fillAvg = 0;
    p.seq  = packSeq(p);
    return p;
  }
  var lay = p.layers || [], gL = p.base.L, gW = p.base.W;
  lay.forEach(function(L){ if (L.bb){ gL = Math.max(gL, L.bb.L); gW = Math.max(gW, L.bb.W); } });
  p.kg      = p.base.kg + lay.reduce(function(s,L){ return s + L.kg; }, 0);
  p.t       = p.base.T;
  p.h       = p.base.T + lay.reduce(function(s,L){ return s + L.h; }, 0);
  p.gabL    = Math.round(gL);
  p.gabW    = Math.round(gW);
  p.fillAvg = lay.length ? lay.reduce(function(s,L){ return s + L.fill; }, 0)/lay.length : 0;
  p.seq     = packSeq(p);
  return p;
}

/* 3.6.10 QR MATNI — detal va pochka cheki uchun
   v10 format:  PREFIKS.UUID.Rn|Pnn|Qn|DETALKOD|LxWxT
   • UUID — loyihaning oʻz identifikatori (ilgari nomning birinchi soʻzi edi: ikki buyurtma
     bir xil soʻz bilan boshlansa cheklar bir-biriga mos kelib qolardi)
   • Rn   — terish reviziyasi. Qayta pochkalangach eski chek skanerlansa tizim ogohlantiradi. */
function projTag(){
  if (!P) return "PRJ";
  var u = (P.uuid || "").replace(/[^0-9A-Za-z]/g, "");
  if (u) return u.slice(0, 8).toUpperCase();
  return (String(P.name || "PRJ").split(" ")[0] || "PRJ").toUpperCase().slice(0, 10);
}
function qrText(p, step){
  var it = step.it;
  return S.prefix + "." + projTag() + ".R" + (p.rev || P.rev || 1) +
         "|P" + pad2(p.no) + "|Q" + step.layer +
         "|" + it.code + "|" + it.L + "x" + it.W + "x" + it.T;
}
function pad2(n){ return (n<10?"0":"")+n; }

/* v14: pochkaning massa chegarasi. Nostandart oqimdan chiqqan pochka (oddSrc)
   kattaroq limit bilan terilgan — audit ham, qoʻlda tahrirlash ham shu bilan
   oʻlchashi kerak, aks holda toʻgʻri terilgan pochka «limitdan ogʻir» boʻlib
   qizarardi. */
/* Pochkaning ASOSIY massa chegarasi — zaxirasiz. */
function packKgBase(p){
  return (p && p.oddSrc) ? Math.max(+S.maxKg || 0, +S.oddKg || 0) : (+S.maxKg || 0);
}
/* JORIY chegara: zaxiradan foydalangan pochkada u kengaygan. Audit, chek va
   qoʻlda tahrirlash shu bilan oʻlchaydi. */
function packKgCap(p){
  return packKgBase(p) + ((p && p.overKg) ? (+S.tailKgOver || 0) : 0);
}
/* MUTLAQ shift — singdirish qayergacha borishi mumkin.

   `packKgCap` dan ALOHIDA: aks holda ikkinchi singdirishda zaxira ikki marta
   qoʻshilib ketardi (44,9 kg oʻrniga 54,9 kg) va audit MASSA xatosi berardi.

   v19: zaxira NOSTANDART limit ustiga QOʻSHILMAYDI. Ilgari nostandart pochka
   40 + 10 = 50 kg gacha koʻtarilardi — bu ikki kishi uchun ham ogʻir va
   buyurtmachi bunday narsani soʻramagan edi. Endi mutlaq shift bitta:
   standart limit + zaxira (35 + 10 = 45). Nostandartning oʻz 40 kg i shundan
   past turadi va oʻzgarishsiz qoladi. */
function packKgAbs(p){
  return Math.max(packKgBase(p), (+S.maxKg || 0) + (+S.tailKgOver || 0));
}

/* 3.6.11 BRUTTO — detallar massasi + qadoq materiali (tara).
   Tara pochkalash hisobiga KIRMAYDI (u sof detal massasi bilan ishlaydi),
   faqat chek va «2 kishi» ogohlantirishi uchun qoʻshiladi. */
function packBrutto(p){ return (p ? p.kg : 0) + (+S.tare || 0); }