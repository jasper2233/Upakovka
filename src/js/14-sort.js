/* ============================================================
   3.15 SARALASH POSTI — paddondan stelyaj yacheykalariga
   ============================================================
   Ish oqimi ikkiga boʻlinadi:

     1) SARALASH  — butun buyurtma detallari ARALASH holda paddonda keladi.
        Ishchi har detalni skanerlaydi, dastur qaysi stelyajning qaysi
        yacheykasiga qoʻyishni aytadi. Bir yacheyka = bir pochka.
     2) QADOQLASH — yacheyka toʻlgach, ichidagi detallar tayyor toʻplam
        boʻlib chiqadi va mavjud qadoqlash ekranida terib oʻraladi.

   Yacheyka kodi: stelyaj harfi + raqam — A1, A2 … A10, B1 …
   Stelyajlar soni va yacheyka soni sozlamalarda.

   NEGA DINAMIK TAQSIMOT. Yacheyka pochkaga OLDINDAN emas, oʻsha pochkaning
   birinchi detali skanerlanganda biriktiriladi. Sabab: 55 pochkaga 60 yacheyka
   kerak boʻlardi, sexda esa masalan 3 ta stelyaj (30 yacheyka) bor. Dinamik
   taqsimotda yacheyka faqat kerak boʻlganda band boʻladi va pochka qadoqlanib
   boʻlgach darhol boʻshaydi — shu sabab 30 yacheyka bilan 55 pochkani
   toʻlqin-toʻlqin saralab chiqish mumkin.
   ============================================================ */

var SORT = {
  cell: {},   // "A3"  -> pochka raqami (p.no)
  pack: {},   // pochka no -> "A3"
  put:  {},   // detal uid -> "A3"   (aynan qaysi nusxa qoʻyilgani)
  plan: {},   // pochka no -> rejalashtirilgan yacheyka (hali band emas)
  last: null  // oxirgi skaner natijasi — katta yozuv uchun
};

/* Stelyaj harfi: 0->A, 1->B … 25->Z, keyin AA, AB … */
function rackLetter(i){
  var s = "";
  i = Math.max(0, i|0);
  do { s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) - 1; } while (i >= 0);
  return s;
}
function rackCount(){ return Math.max(1, Math.min(60, +S.rackN || 5)); }
function cellCount(){ return Math.max(1, Math.min(40, +S.cellN || 6)); }
/* Har stelyajning OXIRGI bigN yacheykasi «katta» (tor, lekin chuqur) */
function bigCount(){ return Math.max(0, Math.min(cellCount() - 1, +S.bigN || 0)); }

/* Yacheyka turi: "katta" yoki "kichik". Kod — "A6" koʻrinishida. */
function cellKind(code){
  var n = parseInt(String(code).replace(/^[A-Z]+/, ""), 10) || 0;
  return (n > cellCount() - bigCount()) ? "katta" : "kichik";
}
/* Yacheykaning fizik oʻlchami (mm). boʻyi — maʼlumot uchun: tepasi ochiq. */
function cellDims(code){
  return cellKind(code) === "katta"
    ? { w:+S.bigW  || 100, d:+S.bigD  || 800, h:+S.cellH || 1500 }
    : { w:+S.cellW || 250, d:+S.cellD || 400, h:+S.cellH || 1500 };
}
/* ESLATMA: «pochka balandligi yacheyka enidan oshmasin» qoidasi (TZ boʻyicha 192 mm)
   hali TERISH algoritmiga ulanmagan. Ilgari bu yerda cellUsable() turardi, lekin uni
   hech kim chaqirmasdi va sozlamadagi «Foydali eni» maydoni operatorga soxta boshqaruv
   koʻrsatardi. Qoida kelishilgach — sortPlan()/claimCell() ga qoʻshiladi. */

/* Hamma yacheyka kodlari — A1..A10, B1..B10 … tartibda */
function allCells(){
  var out = [], R = rackCount(), C = cellCount();
  for (var r = 0; r < R; r++)
    for (var c = 1; c <= C; c++) out.push(rackLetter(r) + c);
  return out;
}
/* Yacheyka ishchi tomonidan YOPIQ deb belgilanganmi — SAQLANGAN holat.
   Saralash mantigʻi (freeCell, sortPlan) faqat shuni oʻqiydi: tahrirlash
   paytidagi qoralama hali hech nimaga taʼsir qilmaydi. */
function cellOff(code){ return !!(S.cellOff && S.cellOff[code]); }

/* ---- TAHRIRLASH REJIMI ----
   Ilgari har bosish darhol saqlanardi. Bu xavfli: notoʻgʻri yacheykaga tegib
   ketsangiz oʻzgarish allaqachon amalda boʻlardi va saralash rejasi siljirdi.
   Endi bosishlar QORALAMAGA tushadi, «Saqlash» bosilgandagina amalga oshadi. */
var RACK_EDIT = false;
var RACK_DRAFT = null;

/* Panel nimani koʻrsatishi kerak: tahrirlashda qoralama, aks holda saqlangani */
function draftOff(code){
  var src = (RACK_EDIT && RACK_DRAFT) ? RACK_DRAFT : (S.cellOff || {});
  return !!src[code];
}
function rackTarget(){
  if (RACK_EDIT){ RACK_DRAFT = RACK_DRAFT || {}; return RACK_DRAFT; }
  S.cellOff = S.cellOff || {}; return S.cellOff;
}
function rackEditStart(){
  RACK_EDIT = true;
  RACK_DRAFT = {};
  Object.keys(S.cellOff || {}).forEach(function(k){ RACK_DRAFT[k] = true; });
}
function rackEditCancel(){ RACK_EDIT = false; RACK_DRAFT = null; }
/* Qoralamani amalga oshirish. Faqat shu yerda S.cellOff oʻzgaradi. */
function rackEditSave(){
  if (!RACK_EDIT) return 0;
  var before = Object.keys(S.cellOff || {}).length;
  S.cellOff = RACK_DRAFT || {};
  RACK_EDIT = false; RACK_DRAFT = null;
  sortPlan();
  if (typeof saveConf === "function") saveConf();
  return Object.keys(S.cellOff).length - before;
}
/* Tizim foydalana oladigan yacheykalar — yopiqlari chiqarib tashlanadi */
function openCells(){ return allCells().filter(function(c){ return !cellOff(c); }); }

/* Yacheykani ochish/yopish. Ichida pochka turgan boʻlsa yopib boʻlmaydi —
   aks holda detallar «yoʻqolgan» holatga tushib qolardi. */
function toggleCell(code){
  var t = rackTarget();
  if (t[code]){ delete t[code]; if (!RACK_EDIT) sortPlan(); return { ok:true, off:false }; }
  if (SORT.cell[code]) return { ok:false, msg:code+" da P"+pad2(SORT.cell[code])+" turibdi — avval uni qadoqlang" };
  t[code] = true; if (!RACK_EDIT) sortPlan();
  return { ok:true, off:true };
}
/* Butun stelyajni ochish/yopish — 10 ta katakni bittalab bosmaslik uchun.
   Band yacheykalarga tegilmaydi, ular sanab qaytariladi. */
function toggleRack(letter){
  var t = rackTarget();
  var C = cellCount(), busy = 0, offN = 0, opened = 0, closed = 0;
  var i, code;
  for (i = 1; i <= C; i++) if (t[letter + i]) offN++;
  var close = offN < C;                      // yarmidan koʻpi ochiq boʻlsa — yopamiz
  for (i = 1; i <= C; i++){
    code = letter + i;
    if (close){
      if (SORT.cell[code]){ busy++; continue; }
      if (!t[code]){ t[code] = true; closed++; }
    } else if (t[code]){ delete t[code]; opened++; }
  }
  if (!RACK_EDIT) sortPlan();
  return { closed:closed, opened:opened, busy:busy };
}

/* Pochkaning detallari — oddiy va noodatiy pochka uchun bir xil koʻrinishda */
function packItems(p){
  if (!p) return [];
  if (p.odd) return p.items || [];
  return (p.seq || []).map(function(s){ return s.it; });
}

/* ---- 3.15.1 YACHEYKA TAQSIMOTI ---- */

/* Boʻsh yacheyka topish — yopiqlari hisobga olinmaydi. Yoʻq boʻlsa null. */
function freeCell(){
  var all = openCells();
  for (var i = 0; i < all.length; i++) if (!SORT.cell[all[i]]) return all[i];
  return null;
}

/* Pochkada nechta detal hali saralanmagan */
function packLeft(p){
  var its = packItems(p), n = 0;
  for (var i = 0; i < its.length; i++) if (!SORT.put[its[i].uid]) n++;
  return n;
}

/* ============================================================
   OPTIMAL REJA
   Ilgari yacheyka oddiy «birinchi boʻsh» qoidasi bilan berilardi: kim oldin
   skanerlansa — A1. Bu ikki tomondan yomon edi.

   1) YURISH. Ishchi har detalni yacheykaga eltib qoʻyadi. 25 detalli pochka
      A1 da boʻlsa 25 ta qisqa yurish, F10 da boʻlsa 25 ta uzun yurish.
      Demak KOʻP DETALLI pochka YAQIN yacheykaga tushishi kerak.
      Naive qoidada bu tasodifga qolgan edi.

   2) YACHEYKA YETMAGANDA. Stelyaj sigʻimi pochka sonidan kam boʻlsa, paddon
      bir necha marta oʻtiladi. Har oʻtishda paddondan qancha koʻp detal ketsa,
      keyingi oʻtish shuncha yengil. Ochiq yacheykalar eng KATTA pochkalarga
      berilsa — bir oʻtishda eng koʻp detal ketadi.

   Ikkala talab ham bir xil javob beradi: pochkalarni detal soni boʻyicha
   kamayish tartibida tizib, yacheykalarni A1 dan boshlab berish.

   Reja har biriktirishda qayta hisoblanadi, chunki yacheyka boʻshashi bilan
   qolgan pochkalar orasida tartib oʻzgaradi. 55 pochkada bu arzon amal.
   ============================================================ */
function sortPlan(){
  var open = [];
  PACKS.forEach(function(p){
    if (SORT.pack[p.no]) return;               // allaqachon yacheykada
    var left = packLeft(p);
    if (!left) return;                         // saralab boʻlingan
    open.push({ no:p.no, left:left });
  });
  // eng koʻp qolgan detal — eng yaqin yacheykaga
  open.sort(function(a,b){ return b.left - a.left || a.no - b.no; });
  var free = openCells().filter(function(c){ return !SORT.cell[c]; });
  SORT.plan = {};
  for (var i = 0; i < open.length && i < free.length; i++) SORT.plan[open[i].no] = free[i];
  return open;
}

/* Pochkaga yacheyka biriktirish (bor boʻlsa oʻshasi qaytadi) */
function claimCell(no){
  if (SORT.pack[no]) return SORT.pack[no];
  sortPlan();
  var c = SORT.plan[no];
  if (!c || SORT.cell[c]) c = freeCell();      // reja boʻlmasa — birinchi boʻsh
  if (!c) return null;
  SORT.cell[c] = no; SORT.pack[no] = c;
  sortPlan();                                   // qolganlar uchun rejani yangilaymiz
  return c;
}

/* Yurish narxi: yacheyka A1 dan qancha uzoq (tartib raqami) × shuncha detal.
   Reja qanchalik yaxshi ekanini oʻlchash uchun — testda ham ishlatiladi. */
function walkCost(){
  var idx = {}, all = allCells();
  for (var i = 0; i < all.length; i++) idx[all[i]] = i;
  var sum = 0;
  PACKS.forEach(function(p){
    var c = SORT.pack[p.no];
    if (c == null) return;
    sum += packItems(p).length * (idx[c] || 0);
  });
  return sum;
}
/* Pochka qadoqlanib boʻldi — yacheyka boʻshaydi.
   Qadoqlash ekrani pochkani tugatganda chaqiradi (10-ui.js). */
function sortFreeCell(no){
  var c = SORT.pack[no];
  if (!c) return false;
  delete SORT.cell[c]; delete SORT.pack[no];
  // shu pochkaga qoʻyilgan detallar belgisi ham olinadi
  Object.keys(SORT.put).forEach(function(uid){ if (SORT.put[uid] === c) delete SORT.put[uid]; });
  sortPlan();          // boʻshagan yacheyka endi eng katta kutayotgan pochkaga tegadi
  return true;
}

/* Pochkada nechta detal saralangan */
function cellDone(no){
  var c = SORT.pack[no]; if (!c) return 0;
  var n = 0;
  Object.keys(SORT.put).forEach(function(uid){ if (SORT.put[uid] === c) n++; });
  return n;
}

/* ---- 3.15.2 SKANER ---- */

/* Skanerlangan matndan detal kodini ajratib olish.
   Chek QR i «SM.5EED0000.R1|P01|Q0|01_021|1753x600x16» koʻrinishida —
   kod 4-maydonda. Oddiy shtrix-kod boʻlsa matnning oʻzi. */
function scanCode(v){
  v = String(v || "").trim();
  if (!v) return "";
  var f = v.split("|");
  return (f.length > 3 && f[3]) ? f[3].trim() : v;
}

/* Shu kodli, hali qoʻyilmagan detalni topish.
   Bir xil koddagi detallar oʻzaro ALMASHINADI (bu tizimda allaqachon shunday —
   qadoqlash ekranidagi checkScan ham shunga tayanadi), shuning uchun qaysi
   nusxani olish farq qilmaydi. Lekin tartib bejiz emas:
     1) yacheykasi BOR pochka — ochiq yacheykani tezroq toʻldirib boʻshatamiz;
     2) soʻng eng kichik raqamli pochka — natija oldindan aytib boʻladigan boʻlsin. */
function findSortTarget(code){
  var withCell = null, any = null;
  for (var i = 0; i < PACKS.length; i++){
    var p = PACKS[i], its = packItems(p);
    for (var j = 0; j < its.length; j++){
      var it = its[j];
      if (it.code !== code) continue;
      if (SORT.put[it.uid]) continue;              // bu nusxa allaqachon qoʻyilgan
      if (SORT.pack[p.no]){ if (!withCell) withCell = { p:p, it:it }; }
      else if (!any) any = { p:p, it:it };
    }
  }
  return withCell || any;
}

/* Asosiy amal: detal skanerlandi -> qaysi yacheykaga qoʻyilsin.
   Qaytadi: {ok, cell, pack, item, msg, kind} */
function sortScan(raw){
  var code = scanCode(raw);
  if (!code) return { ok:false, kind:"err", msg:"kod boʻsh" };
  if (!PACKS.length) return { ok:false, kind:"err", msg:"pochkalar hisoblanmagan — avval «Pochkalash» ni bosing" };

  var t = findSortTarget(code);
  if (!t){
    // kod umuman buyurtmada bormi — ishchiga aniq javob beramiz
    var exists = false;
    for (var i = 0; i < PACKS.length && !exists; i++)
      packItems(PACKS[i]).forEach(function(it){ if (it.code === code) exists = true; });
    return exists
      ? { ok:false, kind:"ok",  msg:"«"+code+"» — bu koddagi hamma detal allaqachon saralangan" }
      : { ok:false, kind:"err", msg:"«"+code+"» — bu detal buyurtmada yoʻq" };
  }

  var cell = claimCell(t.p.no);
  if (!cell){
    /* Hamma yacheyka band. Ishchi shu detal bilan NIMA qilishini bilishi kerak —
       «boʻsh joy yoʻq» degan quruq xabar uni ekran oldida qoldiradi. Detal
       paddonda qoladi va keyingi toʻlqinda saralanadi. Ochiq yacheykalarga
       tegishli detallarni esa u davom ettiraveradi. */
    var open = Object.keys(SORT.cell).map(function(c){ return c+"=P"+pad2(SORT.cell[c]); }).join(", ");
    return { ok:false, kind:"err",
      msg:"«"+code+"» P"+pad2(t.p.no)+" ga tegishli, lekin boʻsh yacheyka yoʻq — "+
          "detalni paddonda qoldiring. Ochiq: "+open };
  }

  SORT.put[t.it.uid] = cell;
  var n = packItems(t.p).length;
  SORT.last = { cell:cell, no:t.p.no, code:t.it.code, item:t.it,
                done:cellDone(t.p.no), n:n, gname:(t.p.gname || (t.p.base && t.p.base.prod) || "") };
  if (typeof autosave === "function") autosave();
  return { ok:true, kind:"ok", cell:cell, pack:t.p, item:t.it, msg:"" };
}

/* Butun buyurtma boʻyicha saralash holati */
function sortStats(){
  var tot = 0, done = 0;
  PACKS.forEach(function(p){
    var its = packItems(p);
    tot += its.length;
    its.forEach(function(it){ if (SORT.put[it.uid]) done++; });
  });
  var busy = Object.keys(SORT.cell).length;
  var off  = openCells().length;                    // ochiq yacheykalar soni
  return { tot:tot, done:done, cells:busy,
           free: off - busy,                        // ochiq va band emas
           off: allCells().length - off };          // ishchi yopgani
}

/* ---- 3.15.3 INTERFEYS ---- */

function sortFlash(kind, text){
  var m = $("sortMsg"); if (!m) return;
  m.className = "msg " + (kind || "");
  m.textContent = text || "";
}

function renderSort(){
  var box = $("sortLast"); if (!box) return;
  var st = sortStats();

  var hint = $("sortHint");
  if (hint) hint.innerHTML = st.done+' / '+st.tot+' detal · <b style="color:'+
    (st.done>=st.tot && st.tot ? 'var(--ok)' : 'var(--mark)')+'">'+
    (st.tot ? Math.round(st.done/st.tot*100) : 0)+'%</b>';
  var cnt = $("sortCells");
  if (cnt) cnt.textContent = st.cells+" band · "+st.free+" boʻsh"+(st.off ? " · "+st.off+" yopiq" : "");

  /* Oxirgi skanerlangan detal EKRANDA QOLADI — keyingi skanergacha. Ishchi
     detalni qoʻlga olib, stelyajgacha yurib borguncha ekranga qayta qaray oladi. */
  var L2 = SORT.last;
  if (!L2){
    box.innerHTML = '<div class="sortidle">Detalni skanerlang</div>';
    return;
  }
  var it = L2.item, full = L2.done >= L2.n;
  box.innerHTML =
    '<div class="bigcell'+(full?" full":"")+'">'+esc(L2.cell)+'</div>'+
    '<div class="bigpack">P'+pad2(L2.no)+' · <b>'+L2.done+'/'+L2.n+'</b> detal'+
      (full ? ' · <span class="okword">YACHEYKA TOʻLDI</span>' : '')+'</div>'+
    '<div class="bigcode">'+esc(it.code)+'</div>'+
    '<div class="bigdim">'+it.L+' × '+it.W+' × '+it.T+' mm · '+it.kg.toFixed(2)+' kg</div>'+
    '<div class="bigname">'+esc(it.name)+'</div>';
}

/* «Reja» — qaysi pochka qaysi yacheykaga tushishi. Ish boshlashdan oldin
   brigadir stelyajlarni shu roʻyxat boʻyicha tayyorlab qoʻyadi. */
function renderPlanBox(){
  var box = $("sortPlanBox"); if (!box) return;
  if (box.style.display === "none" || !box.style.display){ box.innerHTML = ""; return; }
  sortPlan();
  var rows = [];
  PACKS.forEach(function(p){
    var c = SORT.pack[p.no] || SORT.plan[p.no];
    if (!c) return;
    rows.push({ c:c, no:p.no, n:packItems(p).length, left:packLeft(p), live:!!SORT.pack[p.no] });
  });
  var idx = {}, all = allCells();
  for (var i = 0; i < all.length; i++) idx[all[i]] = i;
  rows.sort(function(a,b){ return idx[a.c] - idx[b.c]; });

  var wait = 0;
  PACKS.forEach(function(p){ if (!SORT.pack[p.no] && !SORT.plan[p.no] && packLeft(p)) wait++; });

  box.innerHTML =
    '<div class="planhead">Eng koʻp detalli pochka — eng yaqin yacheykada. '+
    'Shunda ishchi kamroq yuradi'+(wait ? ', '+wait+' ta pochka yacheyka boʻshashini kutadi' : '')+'.</div>'+
    '<div class="plangrid">'+ rows.map(function(r){
      return '<div class="planrow2'+(r.live?" live":"")+'">'+
        '<b>'+r.c+'</b><s>P'+pad2(r.no)+'</s><i>'+r.n+' detal</i>'+
        (r.live ? '<em>'+(r.n-r.left)+'/'+r.n+'</em>' : '') + '</div>';
    }).join("") + '</div>';
}

/* ============================================================
   STELYAJLAR — ishchi smena boshida qaysi yacheyka BOʻSH ekanini kiritadi.
   Sexda yacheykalarning bir qismi avvalgi buyurtmadan band boʻlishi, singan
   yoki boshqa ishga ajratilgan boʻlishi mumkin. Tizim buni oʻzi bilolmaydi.
   Yopiq yacheykaga detal berilmaydi.
   ============================================================ */
function renderRackBox(){
  var box = $("sortRackBox"); if (!box) return;
  if (box.style.display !== "block"){ box.innerHTML = ""; return; }
  var R = rackCount(), C = cellCount(), h = "";
  for (var r = 0; r < R; r++){
    var L = rackLetter(r), offN = 0;
    for (var q = 1; q <= C; q++) if (draftOff(L + q)) offN++;
    h += '<div class="rackrow"><button type="button" class="rackbtn'+(offN>=C?" off":"")+
         '" data-rack="'+L+'"'+(RACK_EDIT?"":" disabled")+'>'+L+'</button><div class="rackcells">';
    for (var c = 1; c <= C; c++){
      var code = L + c, no = SORT.cell[code], cls = "", txt = "boʻsh";
      if (no){ cls = " busy"; txt = "P"+pad2(no); }
      else if (draftOff(code)){ cls = " off"; txt = "yopiq"; }
      // v12: katta (chuqur) yacheyka koʻzga darrov tashlanishi kerak —
      // ishchi eni katta detalni aynan shunga olib boradi
      var kind = cellKind(code), d = cellDims(code);
      if (kind === "katta") cls += " big";
      h += '<button type="button" class="cbox'+cls+'" data-cell="'+code+'"'+
           ' title="'+kind+' yacheyka · eni '+d.w+' · chuqurlik '+d.d+' mm"'+
           (RACK_EDIT?"":" disabled")+'><b>'+code+'</b><s>'+txt+'</s>'+
           (kind === "katta" ? '<u>chuqur</u>' : '')+'</button>';
    }
    h += '</div></div>';
  }

  // qoralamadagi hisob — tahrirlash paytida saqlanmagan holatni koʻrsatadi
  var offN2 = 0, all = allCells();
  all.forEach(function(c){ if (draftOff(c)) offN2++; });
  var busyN = Object.keys(SORT.cell).length;

  var bar = RACK_EDIT
    ? '<div class="rackbar edit">'+
        '<b>Tahrirlanmoqda</b>'+
        '<span class="grow"></span>'+
        '<button class="btn pri" id="rackSaveBtn">Saqlash</button>'+
        '<button class="btn gh" id="rackCancelBtn">Bekor</button>'+
      '</div>'
    : '<div class="rackbar">'+
        '<b>'+(all.length - offN2 - busyN)+'</b> boʻsh · '+
        '<b class="m">'+busyN+'</b> band · '+
        '<b class="o">'+offN2+'</b> yopiq'+
        '<span class="grow"></span>'+
        '<button class="btn" id="rackEditBtn">Tahrirlash</button>'+
      '</div>';

  var tip = RACK_EDIT
    ? '<div class="planhead">Yacheykani bosib yoping yoki oching. Stelyaj harfini '+
      'bossangiz — butun stelyaj. Oʻzgarishlar <b style="color:var(--mark)">Saqlash</b> '+
      'bosilgunicha amalga oshmaydi.</div>'
    : '<div class="planhead">Yopiq yacheykaga detal tushmaydi. Oʻzgartirish uchun '+
      '«Tahrirlash» ni bosing.</div>';

  // v12: sexdagi haqiqiy oʻlchamlar — ishchi qaysi yacheyka nimaga yaraydiganini bilsin
  var kd = { w:+S.cellW||250, d:+S.cellD||400, h:+S.cellH||1500 },
      bd = { w:+S.bigW||100,  d:+S.bigD||800 };
  var geo = '<div class="rackgeo">'+
    '<span><i class="sw"></i>kichik — eni '+kd.w+' · chuqurlik '+kd.d+' mm</span>'+
    (bigCount() ? '<span><i class="sw big"></i>chuqur — eni '+bd.w+' · chuqurlik '+bd.d+' mm</span>' : '')+
    '<span>boʻyi '+kd.h+' mm, tepasi ochiq — uzun detal chiqib turaveradi</span>'+
    '</div>';

  box.innerHTML = bar + tip + geo + h;

  var eb = $("rackEditBtn");
  if (eb) eb.onclick = function(){ rackEditStart(); renderRackBox(); };
  var sb = $("rackSaveBtn");
  if (sb) sb.onclick = function(){
    var d = rackEditSave();
    var st2 = sortStats();
    // saqlangach panel yopiladi — ekranda faqat skaner qolsin
    box.style.display = "none"; box.innerHTML = "";
    var pb2 = $("btnSortRack"); if (pb2) pb2.classList.remove("on");
    renderSort(); renderPlanBox();
    rackSaved(st2.off + " yacheyka yopiq" + (d ? " (" + (d>0?"+":"") + d + ")" : ""));
    sortFocus();
  };
  var cb = $("rackCancelBtn");
  if (cb) cb.onclick = function(){
    rackEditCancel(); renderRackBox();
    sortFlash("", "");
  };

  if (!RACK_EDIT) return;      // koʻrish rejimida kataklar bosilmaydi

  [].slice.call(box.querySelectorAll("[data-cell]")).forEach(function(b){
    b.onclick = function(){
      var r = toggleCell(b.dataset.cell);
      if (!r.ok){ sortFlash("err", r.msg); return; }
      sortFlash("", ""); renderRackBox();
    };
  });
  [].slice.call(box.querySelectorAll("[data-rack]")).forEach(function(b){
    b.onclick = function(){
      var r = toggleRack(b.dataset.rack);
      sortFlash(r.busy ? "err" : "",
        r.busy ? (b.dataset.rack+" stelyajida "+r.busy+" ta yacheyka band — ular ochiq qoldi") : "");
      renderRackBox();
    };
  });
}

/* «Saqlandi» yozuvi — 3 soniyada soʻnadi */
var RACK_T = null;
function rackSaved(what){
  var e = $("sortSaved"); if (!e) return;
  e.textContent = (what ? what + " · " : "") + "saqlandi ✓";
  e.style.display = "inline";
  if (RACK_T) clearTimeout(RACK_T);
  RACK_T = setTimeout(function(){ e.style.display = "none"; }, 3000);
}

/* Saralashni noldan boshlash */
function sortReset(){
  SORT.cell = {}; SORT.pack = {}; SORT.put = {}; SORT.plan = {}; SORT.last = null;
  sortPlan();
  renderSort(); renderPlanBox(); sortFlash("", "");
  if (typeof autosave === "function") autosave();
}

/* Skaner maydoni — Enter bosilganda ishlaydi (skanerlar oxirida Enter yuboradi) */
function sortInit(){
  var sc = $("sortScan");
  if (sc){
    sc.onkeydown = function(e){
      if (e.key !== "Enter") return;
      var v = sc.value; sc.value = "";
      var r = sortScan(v);
      renderSort(); renderPlanBox();
      if (r.ok) sortFlash("", "");            // katta yozuvning oʻzi yetarli
      else sortFlash(r.kind, r.msg);
    };
  }
  var rb = $("btnSortReset");
  if (rb) rb.onclick = function(){
    if (!Object.keys(SORT.put).length){ sortFlash("", "saralash boshlanmagan"); return; }
    sortReset();
    sortFlash("ok", "saralash tozalandi");
  };
  /* Ikki panel — «Reja» va «Stelyajlar». Bittasi ochilsa ikkinchisi yopiladi:
     ekran pastida ikkita katta blok bir vaqtda turmasin. */
  function panel(btnId, boxId, draw){
    var pb = $(btnId), box = $(boxId);
    if (!pb || !box) return;
    pb.onclick = function(){
      var on = box.style.display === "block";
      // panel yopilsa saqlanmagan qoralama tashlab yuboriladi
      rackEditCancel();
      ["sortPlanBox","sortRackBox"].forEach(function(id){
        var b = $(id); if (b) b.style.display = "none";
      });
      ["btnSortPlan","btnSortRack"].forEach(function(id){
        var b = $(id); if (b) b.classList.remove("on");
      });
      if (!on){ box.style.display = "block"; pb.classList.add("on"); }
      renderPlanBox(); renderRackBox();
      sortFocus();                            // fokus baribir skanerda qolsin
    };
  }
  panel("btnSortPlan", "sortPlanBox");
  panel("btnSortRack", "sortRackBox");
}

/* Saralash boʻlimiga oʻtilganda fokus skaner maydoniga tushsin */
function sortFocus(){
  var sc = $("sortScan");
  if (sc) setTimeout(function(){ sc.focus(); }, 40);
}

/* Modul oʻzini oʻzi bogʻlaydi. Ilgari buni 13-app.js setTimeout bilan qilardi va
   ishlamasdi: skaner maydonining onkeydown i null boʻlib qolib, Enter bosilganda
   hech nima boʻlmasdi. Bogʻlash oʻz faylining oxirida turishi ishonchli —
   bu yerda hamma funksiya allaqachon eʼlon qilingan. */
sortInit();
