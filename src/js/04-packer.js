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
function makeLayer(pool, envL, envW, kgBudget, baseL, baseW, ord, maxN, flip, rndj){
  var area = baseL*baseW, lim = maxN || 1e9;
  var cands = pool.filter(function(x){ return !x.used; }).sort(ORD[ord]);
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
  if (!strips.length) return { items:[], kg:0, fill:0, bb:bboxOf([]), h:0, strips:0 };

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
    pool.filter(function(x){ return !x.used; }).sort(ORD[ord]).forEach(function(it){
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
  return { items:items, kg:kg, fill:area? cov/area : 0, bb:bboxOf(items), flipped:!!flip,
           strips:strips.length, h:items.reduce(function(m,q){ return Math.max(m,q.it.T); },0) };
}

/* 3.6.4 QOPQOQ — avval yaxlit 1 detal, boʻlmasa 2, keyin 3 */
function makeLid(pool, base, kgBudget){
  function drop(L){ L.items.forEach(function(q){ q.it.used=false; }); }
  for (var n=1; n<=S.lidN; n++){
    var best=null;
    for (var o=0;o<ORD.length;o++){
      var L = makeLayer(pool, base.L, base.W, kgBudget, base.L, base.W, o, n);
      if (!L.items.length){ continue; }
      var ok = (base.L-L.bb.L) <= S.lidTol && (base.W-L.bb.W) <= S.lidTol && L.fill >= S.lidFill/100;
      // v12: L.whole yoziladigan, lekin hech qayerda oʻqilmaydigan maydon edi — olindi
      if (ok && (!best || L.fill > best.fill)){ if (best) drop(best); L.lid=true; best=L; }
      else drop(L);
    }
    if (best) return best;      // eng kam detalli variant gʻolib
  }
  return null;
}

/* 3.6.5 LAYOUTPACK — bitta pochka: tag → qavatlar (tartib: boʻlaklar pastda,
   yaxlitlar tepada) → qopqoq. Gʻisht terish (toq qavat 180°).
       strat 0: avval qopqoqni zaxiraga olamiz, keyin oʻrta qavatlar
       strat 1: avval qavatlarni toʻldiramiz, oxirgisi qopqoq boʻladi --- */
function layoutPack(base, mids, allowOvh, ord, strat, rndj){
  var off = allowOvh ? S.ovh : 0;
  var envL = base.L + 2*off, envW = base.W + 2*off, area = base.L*base.W;
  mids.forEach(function(i){ i.used = false; });
  var budget = S.maxKg - base.kg, layers = [], lid = null;

  if (strat === 0){ lid = makeLid(mids, base, budget); if (lid) budget -= lid.kg; }

  // QAVAT LIMITI: tag(1) + oʻrta qavatlar + qopqoq(1) <= S.maxLayers
  var midCap = S.maxLayers > 0
    ? Math.max(0, S.maxLayers - 1 - (lid ? 1 : (strat===0 ? 0 : 1)))
    : 1e9;

  for (var g=0; g<40 && layers.length < midCap; g++){
    var L = makeLayer(mids, envL, envW, budget, base.L, base.W, ord||0, 1e9, layers.length % 2 === 1, rndj);
    if (!L.items.length) break;
    if (L.fill < S.minFill/100){ L.items.forEach(function(q){ q.it.used=false; }); break; }
    layers.push(L); budget -= L.kg;
  }

  // agar pochka faqat tag detaldan iborat boʻlib qolsa — toʻliq boʻlmagan qavatga ruxsat
  if (!lid && !layers.length && midCap > 0){
    var Wk = makeLayer(mids, envL, envW, budget, base.L, base.W, ord||0, 1e9, false, rndj);
    if (Wk.items.length){ Wk.weak = true; layers.push(Wk); }
    else Wk.items.forEach(function(q){ q.it.used=false; });
  }

  // tartiblash: koʻp detalli / toʻliq boʻlmagan qavatlar PASTGA,
  // yaxlit bir detalli qavatlar TEPAGA — pochka usti maksimal yaxlit boʻladi
  function wholeness(L){
    return (L.items.length===1 && L.fill>=0.96 &&
            L.items[0].x>=-1e-9 && L.items[0].y>=-1e-9 &&
            L.items[0].x+L.items[0].a<=base.L+1e-9 &&
            L.items[0].y+L.items[0].b<=base.W+1e-9) ? 1 : 0;
  }
  layers.sort(function(a,b){ return wholeness(a)-wholeness(b); });
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
    last.soft = !wholeness(last) && (last.fill < S.lidFill/100 || last.items.some(function(q){
      return q.x < -1e-9 || q.y < -1e-9 || q.x+q.a > base.L+1e-9 || q.y+q.b > base.W+1e-9; }));
  }

  var kg = base.kg + layers.reduce(function(s,L){ return s+L.kg; },0);
  return { base:base, layers:layers, kg:kg, envL:envL, envW:envW, off:off,
           allowOvh:allowOvh, left:mids.filter(function(i){ return !i.used; }) };
}

/* 3.6.6 PACKGROUP — har pochkaga 24+ variant sinaladi, eng zichi tanlanadi
   v10: generator — har pochka yigʻilgach `yield` qiladi. Shu sabab katta buyurtmada ham
   interfeys muzlamaydi: haydovchi (packAllAsync) har 40 ms da brauzerga nafas beradi. */
var PACKPROG = { t:0, tries:0, g:0, groups:0, packs:0, cancel:false };

function* greedyPackGen(list, rnd){
  var rem = list.slice().sort(ORD[0]), packs=[], odd=[], guard=0;
  while (rem.length && guard++ < 900){
    var elig=[];
    for (var i=0;i<rem.length;i++){
      var it=rem[i];
      if (it.W>=S.minBase && it.L<=S.maxLen && it.kg<=S.maxKg && it.T>=S.minBaseT) elig.push(i);
    }
    if (!elig.length){ odd = odd.concat(rem); rem = []; break; }

    var best=null;
    function tryVariant(bi, st, o, rndj){
      var base = rem[bi];
      var others = rem.filter(function(_,k){ return k!==bi; });
      var pk = layoutPack(base, others, S.ovhOn, o, st, rndj);
      var lidL = pk.layers.filter(function(L){ return L.lid; })[0];
      var lidWhole = lidL && lidL.items.length===1 && !lidL.soft;
      var gO = 0;
      pk.layers.forEach(function(L){ if (L.bb){
        gO = Math.max(gO, Math.max(0,L.bb.L-base.L) + Math.max(0,L.bb.W-base.W)); } });
      var sc = -pk.kg*3 + gO*0.05
             + (lidL ? (lidL.soft ? 30 : (lidWhole ? 0 : 16)) : 90)
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
  return { packs:packs, odd:odd };
}

/* 3.6.7 KONSOLIDATSIYA — kam toʻlgan pochkalar birlashtiriladi */
function* packGroupGen(list, rnd){
  var r = yield* greedyPackGen(list, rnd);
  for (var pass=0; pass<2; pass++){
    var weak = r.packs.filter(function(p){ return p.kg < S.maxKg*0.62 || p.layers.length===0; });
    if (weak.length < 2) break;
    var strong = r.packs.filter(function(p){ return weak.indexOf(p) < 0; });
    var pool = [];
    weak.forEach(function(p){
      pool.push(p.base);
      p.layers.forEach(function(L){ L.items.forEach(function(q){ pool.push(q.it); }); });
    });
    pool = pool.concat(r.odd);
    var r2 = yield* greedyPackGen(pool, rnd);
    var aloneA = weak.filter(function(p){ return p.layers.length===0; }).length;
    var aloneB = r2.packs.filter(function(p){ return p.layers.length===0; }).length;
    var before = weak.length*10 + aloneA*4 + (r.odd.length?1:0);
    var after  = r2.packs.length*10 + aloneB*4 + (r2.odd.length?1:0);
    if (after < before) r = { packs: strong.concat(r2.packs), odd: r2.odd };
    else break;
  }
  return r;
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
         "/" + (S.byThick ? it.T : "*") + "/" + clsKeyOf(it.cls);
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
  if (S.byThick && it.T !== other.T)
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

/* 3.6.9 PACKALL — butun buyurtma: qalinlik/modul/material guruhlash, noodatiylar */
function* packAllGen(){
  var items = buildItems();
  var rule = S.split || { prod:true, mat:false };   // v12: bitta umumiy qoida
  var oddPre = [], main = [];
  items.forEach(function(it){
    if (it.L > S.maxLen || it.kg > S.maxKg){
      it.why = it.L>S.maxLen ? (it.L+" mm > "+S.maxLen+" mm") : (it.kg.toFixed(1)+" kg > "+S.maxKg+" kg");
      oddPre.push(it);
    } else main.push(it);
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
    var rnd = mulberry(1234 + t*7919), all=[], odd=oddPre.slice();
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
      r.packs.forEach(function(p){ p.gname = gl; p.key = gks[gi]; p.room = gr; });
      all = all.concat(r.packs); odd = odd.concat(r.odd);
    }
    var wFill = all.length ? all.reduce(function(s,p){ return s+p.kg; },0)/(all.length*S.maxKg) : 0;
    var lFill = 0, nL = 0;
    all.forEach(function(p){ p.layers.forEach(function(L){ lFill += Math.min(1.3,L.fill); nL++; }); });
    lFill = nL ? lFill/nL : 0;
    var noLid = all.filter(function(p){ return !p.layers.some(function(L){ return L.lid; }); }).length;
    var score = all.length*1000 + odd.length*300 + noLid*140 - wFill*260 - lFill*120;
    if (!best || score < best.score) best = { score:score, packs:all, odd:odd };
  }

  var out = best.packs;
  var buckets = {};
  best.odd.sort(function(a,b){ return b.kg-a.kg; }).forEach(function(it){
    var k = (S.byThick ? String(it.T) : "*") + "/" + clsKeyOf(it.cls);
    var b = buckets[k];
    if (!b || b.kg + it.kg > S.maxKg){ b = { odd:true, items:[], kg:0, t:it.T }; buckets[k]=b; out.push(b); }
    b.items.push(it); b.kg += it.kg;
  });
  // TERISH REVIZIYASI: har qayta pochkalashda +1. Chekdagi QR ichiga yoziladi, shuning uchun
  // eski terishdan chop etilgan chek skanerlanganda tizim buni darhol aniqlaydi.
  P.rev = (P.rev || 0) + 1;
  out.forEach(function(p,i){
    p.no = i+1;
    p.rev = P.rev;
    p.t = p.odd ? p.t : p.base.T;
    p.seq = packSeq(p);
    p.h = p.odd ? p.items.reduce(function(s,x){ return s+x.T; },0)
                : p.base.T + p.layers.reduce(function(s,L){ return s+L.h; },0);
    if (!p.odd){
      var gL = p.base.L, gW = p.base.W;
      p.layers.forEach(function(L){ if (L.bb){ gL=Math.max(gL,L.bb.L); gW=Math.max(gW,L.bb.W); } });
      p.gabL = Math.round(gL); p.gabW = Math.round(gW);
    }
    p.fillAvg = (!p.odd && p.layers.length)
      ? p.layers.reduce(function(s,L){ return s+L.fill; },0)/p.layers.length : 0;
    p.done = 0;
  });
  PACKS = out;
  return out;
}

/* 3.6.8.1 SINXRON KOʻRINISH — generatorni bir yoʻla oxirigacha aylantiradi.
   Kichik buyurtmalarda va testlarda ishlatiladi; eski chaqiruv joylari buzilmaydi. */
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
      var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
      try {
        for (;;){
          var r = gen.next();
          if (r.done){ if (onProg) onProg(PACKPROG); resolve({ ok:true }); return; }
          var now = (window.performance && performance.now) ? performance.now() : Date.now();
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
      s.push({it:q.it, layer:li+1, pos:q, role:L.lid?"ust":"qavat",
              n:qi+1, of:L.items.length, fill:L.fill, weak:!!L.weak});
    });
  });
  return s;
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

/* 3.6.11 BRUTTO — detallar massasi + qadoq materiali (tara).
   Tara pochkalash hisobiga KIRMAYDI (u sof detal massasi bilan ishlaydi),
   faqat chek va «2 kishi» ogohlantirishi uchun qoʻshiladi. */
function packBrutto(p){ return (p ? p.kg : 0) + (+S.tare || 0); }