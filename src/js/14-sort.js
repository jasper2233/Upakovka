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
   taqsimotda yacheyka faqat kerak boʻlganda band boʻladi va qaytadan boʻshaydi —
   shu sabab 30 yacheyka bilan 55 pochkani toʻlqin-toʻlqin saralab chiqish mumkin.

   v22: POSTLAR ALOHIDA, STELYAJ KOʻCHMA (tsex jarayoni, 2026-11-12). Saralash
   va qadoqlash — alohida joy, odatda alohida kompyuter. Stelyaj toʻlgach u
   BUTUNLIGICHA qadoqlash boʻlimiga olib boriladi, u yerda 3D boʻyicha
   qadoqlanadi va chek yopishtiriladi, boʻsh stelyaj qaytadi. Shuning uchun
   yacheyka pochka qadoqlanganda emas (bu boshqa kompyuterda boʻladi), STELYAJ
   QAYTGANDA boʻshaydi:
     toʻlmoqda → TAYYOR (hamma pochkasi toʻla, unga boshqa pochka rejalanmagan)
               → qadoqlashda (SORT.away) → qaytdi (rackReturn yoki stelyaj QR i).
   ============================================================ */

var SORT = {
  cell: {},   // "A3"  -> pochka raqami (p.no)
  pack: {},   // pochka no -> "A3"
  put:  {},   // detal uid -> "A3"   (aynan qaysi nusxa qoʻyilgani)
  plan: {},   // pochka no -> rejalashtirilgan yacheyka (hali band emas)
  seen: {},   // v22: skanerlangan MES ID (buyurtmasiz) -> uid — bitta chek ikki marta sanalmasin
  away: {},   // v22: stelyaj harfi -> {ts, auto} — stelyaj qadoqlash boʻlimida
  gone: {},   // v22: pochka no -> stelyaj harfi — stelyaj boʻsh qaytdi, pochka saralashdan ketdi
  last: null  // oxirgi skaner natijasi — katta yozuv uchun
};
/* v22: SORT.put dagi bu qiymat — detal saralangan VA pochkasi qadoqlangan.
   Ilgari yacheyka boʻshaganda belgilar oʻchirilardi va yigʻib boʻlingan pochka
   yana «saralanmagan» boʻlib qolardi: reja unga yangi yacheyka berar, keyingi
   skan oʻralgan pochka uchun yacheyka ochardi. */
var SORT_PACKED = "*";

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
  /* v22: qoralama ochiq turgan paytda skan yacheykani band qilgan boʻlishi
     mumkin — band yacheyka yopilmaydi (aks holda u bir vaqtda yopiq va band
     boʻlib qolardi, boʻsh yacheykalar soni notoʻgʻri chiqardi). */
  var draft = RACK_DRAFT || {};
  Object.keys(draft).forEach(function(c){ if (SORT.cell[c]) delete draft[c]; });
  S.cellOff = draft;
  RACK_EDIT = false; RACK_DRAFT = null;
  sortPlan();
  if (typeof saveConf === "function") saveConf();
  return Object.keys(S.cellOff).length - before;
}
/* Tizim foydalana oladigan yacheykalar — yopiqlari chiqarib tashlanadi */
function openCells(){ return allCells().filter(function(c){ return !cellOff(c); }); }
/* v22: yacheyka qaysi stelyajniki — «AB7» -> «AB» */
function rackOf(code){ var m = /^[A-Z]+/.exec(String(code || "")); return m ? m[0] : ""; }
function rackAway(L){ return !!(SORT.away && SORT.away[L]); }
function rackExists(L){
  for (var r = 0; r < rackCount(); r++) if (rackLetter(r) === L) return true;
  return false;
}
/* v22: saralash HOZIR foydalana oladigan yacheykalar — ochiq VA stelyaji shu yerda
   (qadoqlashdagi stelyajga detal qoʻyib boʻlmaydi). */
function usableCells(){ return openCells().filter(function(c){ return !rackAway(rackOf(c)); }); }
function packByNo(no){
  for (var i = 0; i < PACKS.length; i++) if (PACKS[i].no === no) return PACKS[i];
  return null;
}

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
  var C = cellCount(), busy = 0, offN = 0;
  var i, code;
  for (i = 1; i <= C; i++) if (t[letter + i]) offN++;
  var close = offN < C;                      // yarmidan koʻpi ochiq boʻlsa — yopamiz
  for (i = 1; i <= C; i++){
    code = letter + i;
    if (close){
      if (SORT.cell[code]){ busy++; continue; }
      t[code] = true;
    } else delete t[code];
  }
  if (!RACK_EDIT) sortPlan();
  // v21: `opened`/`closed` hisoblagichlari qaytarilardi, lekin hech kim
  // oʻqimasdi — chaqiruvchiga faqat band yacheykalar soni kerak.
  return { busy:busy };
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
  var all = usableCells();
  for (var i = 0; i < all.length; i++) if (!SORT.cell[all[i]]) return all[i];
  return null;
}

/* Pochkada nechta detal hali saralanmagan */
function packFinished(p){ return !!p && !!p.seq && p.seq.length > 0 && (p.done || 0) >= p.seq.length; }
function packLeft(p){
  if (packFinished(p)) return 0;                // v22: yigʻib boʻlingan pochka saralanmaydi
  if (p && SORT.gone && SORT.gone[p.no]) return 0;   // v22: stelyaji bilan ketgan — yangi yacheyka olmaydi
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
  var free = usableCells().filter(function(c){ return !SORT.cell[c]; });
  SORT.plan = {};
  for (var i = 0; i < open.length && i < free.length; i++) SORT.plan[open[i].no] = free[i];
  return open;
}

/* Pochkaga yacheyka biriktirish (bor boʻlsa oʻshasi qaytadi) */
function claimCell(no){
  if (SORT.pack[no]) return SORT.pack[no];
  sortPlan();
  var c = SORT.plan[no];
  /* v22: rejada yoʻq pochka KEYINGI TOʻLQINDA. Ilgari u birinchi boʻsh
     yacheykani olardi va katta pochkaga atalgan yaqin yacheykani egallardi
     (1 detalli pochka A1 ni olib, 16 detallisini A2 ga surardi). */
  if (!c || SORT.cell[c]) return null;
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
  /* v22: stelyaj qadoqlash boʻlimida — yacheyka stelyaj QAYTGANDA boʻshaydi
     (rackReturn). Bu yerda boʻshatilsa saralash posti yoʻq stelyajga detal berardi. */
  if (rackAway(rackOf(c))) return false;
  delete SORT.cell[c]; delete SORT.pack[no];
  // v22: detallar belgisi OʻCHIRILMAYDI — «qadoqlangan» boʻladi (SORT_PACKED)
  Object.keys(SORT.put).forEach(function(uid){ if (SORT.put[uid] === c) SORT.put[uid] = SORT_PACKED; });
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

/* ---- v22: STELYAJ HAYOT SIKLI ---- */

/* Stelyaj holati: band yacheykalar (pochka, saralangan/jami), boʻsh yacheykalar
   va ularning qanchasiga pochka REJALANGAN. TAYYOR — hamma band pochka toʻla va
   stelyajga boshqa pochka rejalanmagan (aks holda u yoʻlda toʻldirilardi). */
/* Har yacheykada nechta detal — bitta oʻtishda (cellDone har yacheyka uchun
   butun SORT.put ni aylanardi: 60 stelyaj × 10 yacheyka × 1000 detal har skanda). */
function cellCounts(){
  var cnt = {};
  Object.keys(SORT.put).forEach(function(uid){ var c = SORT.put[uid]; cnt[c] = (cnt[c] || 0) + 1; });
  return cnt;
}
function rackInfo(L, cnt){
  var busy = [], free = 0, full = 0, planned = 0, pl = {};
  if (!cnt) cnt = cellCounts();
  Object.keys(SORT.plan || {}).forEach(function(no){ pl[SORT.plan[no]] = 1; });
  for (var i = 1; i <= cellCount(); i++){
    var c = L + i, no = SORT.cell[c];
    if (no){
      var n = packItems(packByNo(no)).length, d = cnt[c] || 0;
      busy.push({ c:c, no:no, n:n, done:d, full:d >= n });
      if (d >= n) full++;
    } else if (!cellOff(c)){ free++; if (pl[c]) planned++; }
  }
  var away = rackAway(L);
  return { L:L, busy:busy, full:full, free:free, planned:planned, away:away,
           ready: !away && busy.length > 0 && full === busy.length && planned === 0 };
}
/* Har skandan keyin: yangi TAYYOR boʻlgan stelyajlar qadoqlashga ketgan deb
   belgilanadi — ularning yacheykalari boʻsh stelyaj qaytguncha rejaga kirmaydi.
   Qaytadi: shu safar tayyor boʻlgan stelyaj harflari. */
function rackCheckReady(){
  sortPlan();
  var out = [], cnt = cellCounts();
  for (var r = 0; r < rackCount(); r++){
    var L = rackLetter(r);
    if (!rackAway(L) && rackInfo(L, cnt).ready){ SORT.away[L] = { ts:Date.now(), auto:true }; out.push(L); }
  }
  if (out.length) sortPlan();
  return out;
}
/* Qoʻlda joʻnatish — toʻliq boʻlmagan stelyajni ham (masalan bitta detal brakka
   ketgan). force boʻlmasa toʻliq emas pochkalar roʻyxati qaytadi, joʻnatilmaydi. */
function rackSend(L, force){
  L = String(L || "").toUpperCase();
  if (!rackExists(L)) return { ok:false, msg:"«" + L + "» — bunday stelyaj yoʻq" };
  if (rackAway(L)) return { ok:false, msg:L + " stelyaji allaqachon qadoqlashda" };
  var info = rackInfo(L);
  if (!info.busy.length) return { ok:false, msg:L + " stelyaji boʻsh — joʻnatadigan pochka yoʻq" };
  var inc = info.busy.filter(function(b){ return !b.full; });
  if (inc.length && !force)
    return { ok:false, need:true, incomplete:inc,
             msg:L + " da " + inc.length + " ta pochka toʻliq emas: " +
                 inc.map(function(b){ return "P" + pad2(b.no) + " " + b.done + "/" + b.n; }).join(", ") };
  SORT.away[L] = { ts:Date.now(), auto:false };
  sortPlan();
  if (typeof autosave === "function") autosave();
  return { ok:true, msg:L + " stelyaji qadoqlashga joʻnatildi" +
           (inc.length ? " — " + inc.length + " ta pochka toʻliq emas, qolgan detallari qadoqlashga eltiladi" : "") };
}
/* Boʻsh stelyaj qaytdi: yacheykalari boʻshaydi, undagi pochkalar saralashdan
   chiqib ketgan (SORT.gone) — ularning kechikkan detali endi qadoqlashga eltiladi. */
function rackReturn(L){
  L = String(L || "").toUpperCase();
  if (!rackExists(L)) return { ok:false, msg:"«" + L + "» — bunday stelyaj yoʻq" };
  if (!rackAway(L)) return { ok:false, msg:L + " stelyaji saralashda turibdi — u qadoqlashga joʻnatilmagan" };
  var freed = 0, packs = [];
  Object.keys(SORT.cell).forEach(function(c){
    if (rackOf(c) !== L) return;
    var no = SORT.cell[c];
    SORT.gone[no] = L; packs.push(no);
    delete SORT.cell[c]; delete SORT.pack[no]; freed++;
    Object.keys(SORT.put).forEach(function(uid){ if (SORT.put[uid] === c) SORT.put[uid] = SORT_PACKED; });
  });
  delete SORT.away[L];
  sortPlan();
  if (typeof autosave === "function") autosave();
  return { ok:true, freed:freed, packs:packs,
           msg:L + " stelyaji qaytdi — " + freed + " ta yacheyka boʻshadi" };
}
/* Stelyaj belgisi (QR): «UPK|STELYAJ|A». Qaytgan stelyaj shu bilan skanerlanadi —
   ishchi sichqonchaga tegmaydi. */
var RACK_QR = /^UPK\|STELYAJ\|([A-Z]+)$/;
function rackQR(raw){ var m = RACK_QR.exec(String(raw || "").trim().toUpperCase()); return m ? m[1] : ""; }
function rackQRText(L){ return "UPK|STELYAJ|" + L; }
function sortRackScan(L){
  if (!rackExists(L))
    return { ok:false, kind:"err", msg:"«" + L + "» stelyaji bu sexda yoʻq (sozlamada " + rackCount() + " ta stelyaj)" };
  if (rackAway(L)){
    var r = rackReturn(L);
    SORT.last = { rack:L, freed:r.freed, packs:r.packs };
    return { ok:true, kind:"ok", rack:L, msg:"" };
  }
  var info = rackInfo(L);
  return { ok:false, kind:"", rack:L,
           msg:L + " stelyaji saralashda: " + info.busy.length + " ta pochka (" + info.full + " tasi toʻla), " +
               info.free + " ta boʻsh yacheyka" };
}

/* ---- 3.15.2 SKANER ---- */

/* Skanerlangan matndan detal kodini ajratib olish (eski yoʻl — tashqi
   chaqiruvlar uchun qoldi). Chek QR i «SM.5EED0000.R1|P01|Q0|01_021|…»
   koʻrinishida — kod 4-maydonda; MES cheki shu buyurtmadagi detal kodiga
   oʻgiriladi; oddiy shtrix-kod boʻlsa matnning oʻzi. */
function scanCode(v){
  v = String(v || "").trim();
  if (!v) return "";
  var f = v.split("|");
  if (f.length > 3 && f[3]) return f[3].trim();
  for (var i = 0; i < PACKS.length; i++){
    var its = packItems(PACKS[i]);
    for (var j = 0; j < its.length; j++) if (mesMatch(v, its[j])) return its[j].code;
  }
  return v;
}

/* v22: SKAN -> DETAL (kod emas). Ilgari saralash faqat KOD bilan qidirardi:
   - koʻzgu juftlik (chap/oʻng bok, MES da `-2`) BOSHQA pochkaning yacheykasiga
     tushardi — qadoqlash posti esa uni rad etardi (205 faylning 112 tasida
     bunday kodlar bor);
   - oʻz chekimizdagi pochka raqami va oʻlcham eʼtiborsiz qolardi;
   - kodsiz detalni umuman saralab boʻlmasdi.
   Endi skan aniq detalga (yoki uning bir xil nusxalariga) aylanadi:
     MES cheki    — `mesMatch` (nusxalar almashinadi, `-2` boshqa detal);
     oʻz chekimiz — chekdagi pochka + kod + oʻlcham;
     oddiy kod    — faqat bitta detalga (bitta MES kalitiga) tegishli boʻlsa.
   Qaytadi: { cands:[{p,it}], label, err, mes } */
function sortResolve(raw){
  var v = String(raw || "").trim(), out = { cands:[], label:v, err:null, mes:false };
  if (!v) return out;
  var f = v.split("|"), hdr = f[0] ? f[0].split(".") : [];
  var own = f.length >= 5 && hdr.length >= 3 && /^R\d+$/.test(hdr[hdr.length - 1]);
  if (own){
    if (hdr[1] !== projTag()){ out.err = "bu chek boshqa buyurtmaniki (" + hdr[1] + ")"; return out; }
    var rev = +hdr[hdr.length - 1].slice(1);
    if (P && P.rev && rev !== P.rev){
      out.err = "bu chek ESKI terishdan (R" + rev + "), joriy R" + P.rev + " — cheklarni qayta chop eting";
      return out;
    }
    out.label = f[3];
    PACKS.forEach(function(p){
      if ("P" + pad2(p.no) !== f[1]) return;
      packItems(p).forEach(function(it){
        if (it.code === f[3] && (it.L + "x" + it.W + "x" + it.T) === f[4]) out.cands.push({ p:p, it:it });
      });
    });
    return out;
  }
  PACKS.forEach(function(p){
    packItems(p).forEach(function(it){ if (mesMatch(v, it)) out.cands.push({ p:p, it:it }); });
  });
  if (out.cands.length){ out.mes = true; out.label = out.cands[0].it.code || v; return out; }
  // oddiy kod — bir nechta HAR XIL detalga tegishli boʻlsa, tanlab boʻlmaydi
  var keys = {};
  PACKS.forEach(function(p){
    packItems(p).forEach(function(it){
      if (it.code === v){ out.cands.push({ p:p, it:it }); keys[it.mesKey || it.code] = 1; }
    });
  });
  var kn = Object.keys(keys).length;
  if (kn > 1){
    out.err = "«" + v + "» kodi " + kn + " xil detalga tegishli (masalan chap va oʻng bok) — chekdagi QR ni skanerlang";
    out.cands = [];
  }
  return out;
}

/* Nomzodlar ichidan hali saralanmagan nusxa. Tartib:
     0) v22: pochkasi QADOQLASHDA turgan nusxa (stelyaj toʻliq boʻlmay joʻnatilgan
        yoki qaytgan) — qadoqlovchi aynan shu detalni kutyapti;
     1) yacheykasi BOR pochka — ochiq yacheykani tezroq toʻldirib boʻshatamiz;
     2) soʻng eng kichik raqamli pochka — natija oldindan aytib boʻladigan boʻlsin.
   Yigʻib boʻlingan pochka nomzod emas (v22). */
function findSortTarget(cands){
  if (typeof cands === "string") cands = sortResolve(cands).cands;   // eski chaqiruv: kod
  var urgent = null, gone = null, withCell = null, any = null;
  for (var i = 0; i < cands.length; i++){
    var c = cands[i];
    if (SORT.put[c.it.uid] || packFinished(c.p)) continue;
    var cell = SORT.pack[c.p.no];
    if (cell){
      if (rackAway(rackOf(cell))){ if (!urgent) urgent = c; }
      else if (!withCell) withCell = c;
    }
    else if (SORT.gone && SORT.gone[c.p.no]){ if (!gone) gone = c; }
    else if (!any) any = c;
  }
  return urgent || gone || withCell || any;
}

/* Asosiy amal: detal skanerlandi -> qaysi yacheykaga qoʻyilsin.
   Qaytadi: {ok, cell, pack, item, msg, kind} */
function sortScan(raw){
  if (!String(raw || "").trim()) return { ok:false, kind:"err", msg:"kod boʻsh" };
  var rq = rackQR(raw);                                  // v22: qaytgan stelyaj belgisi
  if (rq) return sortRackScan(rq);
  if (!PACKS.length) return { ok:false, kind:"err", msg:"pochkalar hisoblanmagan — avval «Pochkalash» ni bosing" };
  var r = sortResolve(raw);
  if (r.err) return { ok:false, kind:"err", msg:r.err };
  var label = r.label;

  /* v22: bitta MES chek ikki marta skanerlansa ikkinchi nusxa belgilanmaydi —
     aks holda bitta yacheyka bir detal kam, keyingi haqiqiy nusxa esa
     «allaqachon saralangan» boʻlib qolardi. Javobda yacheyka aytiladi. */
  var mkey = r.mes ? mesStrip(raw) : null;
  if (mkey && SORT.seen[mkey] && SORT.put[SORT.seen[mkey]]){
    var wc = SORT.put[SORT.seen[mkey]];
    return { ok:false, kind:"ok", msg:"«" + label + "» — bu chek allaqachon skanerlangan" +
             (wc !== SORT_PACKED ? ": " + wc + " yacheykada" : ", pochkasi qadoqlangan") };
  }

  var t = findSortTarget(r.cands);
  if (!t){
    if (r.cands.length){
      var cellsOf = {};
      r.cands.forEach(function(c){ var x = SORT.put[c.it.uid]; if (x && x !== SORT_PACKED) cellsOf[x] = 1; });
      var where = Object.keys(cellsOf);
      return { ok:false, kind:"ok", msg:"«" + label + "» — bu detalning hamma nusxasi allaqachon saralangan" +
               (where.length ? " (" + where.join(", ") + ")" : "") };
    }
    return { ok:false, kind:"err", msg:"«" + label + "» — bu detal buyurtmada yoʻq" };
  }

  /* v22: KECHIKKAN DETAL. Pochka stelyaji bilan qadoqlashda (yoki stelyaj qaytgan) —
     detal yacheykaga emas, qadoqlash boʻlimiga eltiladi. */
  var cellNow = SORT.pack[t.p.no];
  if (cellNow && rackAway(rackOf(cellNow))){
    SORT.put[t.it.uid] = cellNow;
    if (mkey) SORT.seen[mkey] = t.it.uid;
    SORT.last = { cell:cellNow, no:t.p.no, code:t.it.code, item:t.it, away:rackOf(cellNow),
                  done:cellDone(t.p.no), n:packItems(t.p).length };
    if (typeof autosave === "function") autosave();
    return { ok:true, kind:"warn", cell:cellNow, pack:t.p, item:t.it, away:true,
             msg:"«" + label + "» — P" + pad2(t.p.no) + " " + rackOf(cellNow) + " stelyaji bilan QADOQLASHDA: " +
                 "detalni qadoqlash boʻlimiga eltib, " + cellNow + " yacheykaga qoʻying" };
  }
  if (SORT.gone && SORT.gone[t.p.no]){
    SORT.put[t.it.uid] = SORT_PACKED;
    if (mkey) SORT.seen[mkey] = t.it.uid;
    SORT.last = { cell:null, no:t.p.no, code:t.it.code, item:t.it, gone:SORT.gone[t.p.no] };
    if (typeof autosave === "function") autosave();
    return { ok:true, kind:"warn", pack:t.p, item:t.it, gone:true,
             msg:"«" + label + "» — P" + pad2(t.p.no) + " qadoqlashga ketgan (" + SORT.gone[t.p.no] +
                 " stelyaji bilan): detalni qadoqlash boʻlimiga eltib bering" };
  }

  var cell = claimCell(t.p.no);
  if (!cell){
    /* Yacheyka yoʻq yoki boʻsh yacheykalar kattaroq pochkalarga ajratilgan.
       Ishchi shu detal bilan NIMA qilishini bilishi kerak: detal paddonda qoladi
       va keyingi toʻlqinda saralanadi. Ochiq yacheykalarga tegishli detallarni
       esa u davom ettiraveradi. */
    var open = Object.keys(SORT.cell).filter(function(c){ return !rackAway(rackOf(c)); })
      .map(function(c){ return c + "=P" + pad2(SORT.cell[c]); }).join(", ");
    var freeN = usableCells().filter(function(c){ return !SORT.cell[c]; }).length;
    var awayL = Object.keys(SORT.away || {});
    return { ok:false, kind:"err",
      msg:"«" + label + "» P" + pad2(t.p.no) + " ga tegishli, lekin " +
          (freeN ? "boʻsh yacheykalar kattaroq pochkalarga ajratilgan (keyingi toʻlqin)"
                 : "boʻsh yacheyka yoʻq") +
          " — detalni paddonda qoldiring." + (open ? " Ochiq: " + open : "") +
          (awayL.length ? " · Qadoqlashda: " + awayL.join(", ") + " (qaytgach boʻshaydi)" : "") };
  }

  SORT.put[t.it.uid] = cell;
  if (mkey) SORT.seen[mkey] = t.it.uid;
  var n = packItems(t.p).length;
  SORT.last = { cell:cell, no:t.p.no, code:t.it.code, item:t.it,
                done:cellDone(t.p.no), n:n, gname:(t.p.gname || (t.p.base && t.p.base.prod) || "") };
  var ready = rackCheckReady();                         // v22: stelyaj toʻldimi
  if (ready.length) SORT.last.ready = ready;
  if (typeof autosave === "function") autosave();
  return { ok:true, kind:"ok", cell:cell, pack:t.p, item:t.it, msg:"", ready:ready };
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
  // v22: qadoqlashdagi stelyajning boʻsh yacheykasi ham «boʻsh» emas — u bu yerda yoʻq
  var free = usableCells().filter(function(c){ return !SORT.cell[c]; }).length;
  return { tot:tot, done:done, cells:busy,
           free: free,                              // ochiq, band emas va stelyaji shu yerda
           off: allCells().length - off,            // ishchi yopgani
           away: Object.keys(SORT.away || {}) };    // v22: qadoqlashdagi stelyajlar
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
  if (cnt) cnt.innerHTML = esc(st.cells+" band · "+st.free+" boʻsh"+(st.off ? " · "+st.off+" yopiq" : ""))+
    (st.away.length ? ' <span class="awaytag">qadoqlashda: '+esc(st.away.join(", "))+'</span>' : '');
  var pid = $("sortPlanId");
  if (pid) pid.textContent = (typeof planId === "function" && planId()) ? "reja " + planId() : "";

  /* Oxirgi skanerlangan detal EKRANDA QOLADI — keyingi skanergacha. Ishchi
     detalni qoʻlga olib, stelyajgacha yurib borguncha ekranga qayta qaray oladi. */
  var L2 = SORT.last;
  if (!L2){
    box.innerHTML = '<div class="sortidle">Detalni skanerlang</div>';
    return;
  }
  /* v22: qaytgan stelyaj skanerlandi */
  if (L2.rack){
    box.innerHTML =
      '<div class="bigcell full">'+esc(L2.rack)+'</div>'+
      '<div class="bigpack"><span class="okword">STELYAJ QAYTDI</span> · <b>'+L2.freed+'</b> ta yacheyka boʻshadi</div>';
    return;
  }
  var it = L2.item, full = L2.done >= L2.n;
  /* v22: stelyaj toʻldi — qadoqlashga olib borish vaqti. Keyingi skangacha turadi. */
  var ready = (L2.ready && L2.ready.length)
    ? '<div class="rackready">⚑ '+esc(L2.ready.join(", "))+' STELYAJ'+(L2.ready.length > 1 ? 'LARI' : 'I')+
      ' TAYYOR — qadoqlashga olib boring</div>' : '';
  var tail =
    '<div class="bigcode">'+esc(it.code)+'</div>'+
    '<div class="bigdim">'+it.L+' × '+it.W+' × '+it.T+' mm · '+it.kg.toFixed(2)+' kg</div>'+
    '<div class="bigname">'+esc(it.name)+'</div>';
  if (L2.gone || L2.away){
    // kechikkan detal: pochkasi qadoqlashda — yacheykaga emas, oʻsha yoqqa
    box.innerHTML =
      '<div class="bigcell away">'+esc(L2.away ? L2.cell : "P"+pad2(L2.no))+'</div>'+
      '<div class="bigpack">P'+pad2(L2.no)+' · <b class="awayword">QADOQLASHDA</b> — detalni qadoqlash boʻlimiga eltib bering</div>'+tail;
    return;
  }
  box.innerHTML = ready +
    '<div class="bigcell'+(full?" full":"")+'">'+esc(L2.cell)+'</div>'+
    '<div class="bigpack">P'+pad2(L2.no)+' · <b>'+L2.done+'/'+L2.n+'</b> detal'+
      (full ? ' · <span class="okword">YACHEYKA TOʻLDI</span>' : '')+'</div>'+tail;
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
  var R = rackCount(), C = cellCount(), h = "", cntR = cellCounts();
  for (var r = 0; r < R; r++){
    var L = rackLetter(r), offN = 0;
    for (var q = 1; q <= C; q++) if (draftOff(L + q)) offN++;
    var ri = rackInfo(L, cntR);
    h += '<div class="rackrow'+(ri.away?" away":"")+'"><button type="button" class="rackbtn'+(offN>=C?" off":"")+
         '" data-rack="'+L+'"'+(RACK_EDIT?"":" disabled")+'>'+L+'</button><div class="rackcells">';
    for (var c = 1; c <= C; c++){
      var code = L + c, no = SORT.cell[code], cls = "", txt = "boʻsh";
      if (no){
        cls = " busy"; txt = "P"+pad2(no);
        // v22: toʻla pochka — yashil; stelyaj qadoqlashda — xira
        var bi = ri.busy.filter(function(b){ return b.c === code; })[0];
        if (bi && bi.full) cls += " full";
      }
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
    h += '</div>';
    /* v22: stelyaj holati. Qadoqlashda — «Qaytdi» (yoki stelyaj QR ini skanerlash);
       saralashda pochkasi bor — qoʻlda «Joʻnatish» (toʻliq boʻlmasa ikki marta bosiladi). */
    if (!RACK_EDIT){
      if (ri.away) h += '<div class="rstat"><em class="away">qadoqlashda</em>'+
                        '<button type="button" class="btn gh" data-ret="'+L+'">Qaytdi</button></div>';
      // «kutilmoqda» — boʻsh yacheykaga pochka rejalangan: stelyaj u toʻlguncha tayyor emas
      else if (ri.busy.length) h += '<div class="rstat"><em>'+ri.full+'/'+ri.busy.length+' toʻla'+
                        (ri.planned ? ' · '+ri.planned+' kutilmoqda' : '')+'</em>'+
                        '<button type="button" class="btn gh" data-send="'+L+'">'+
                        (SEND_ARM === L ? 'Rostdan? '+(ri.busy.length - ri.full)+' toʻliq emas' : 'Joʻnatish')+'</button></div>';
    }
    h += '</div>';
  }

  // qoralamadagi hisob — tahrirlash paytida saqlanmagan holatni koʻrsatadi
  var offN2 = 0, all = allCells();
  all.forEach(function(c){ if (draftOff(c)) offN2++; });
  var busyN = Object.keys(SORT.cell).length;
  var stA = Object.keys(SORT.away || {});

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
        (stA.length ? ' · <b class="m">'+stA.length+'</b> stelyaj qadoqlashda' : '')+
        '<span class="grow"></span>'+
        '<button class="btn gh" id="rackLblBtn" title="har stelyajga QR belgi — qaytgan stelyaj shu bilan skanerlanadi">Belgilar</button>'+
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
  var lb = $("rackLblBtn");
  if (lb) lb.onclick = function(){ if (typeof printRackLabels === "function") printRackLabels(); sortFocus(); };
  // v22: stelyaj qaytdi / qoʻlda joʻnatish
  [].slice.call(box.querySelectorAll("[data-ret]")).forEach(function(b){
    b.onclick = function(){
      var r = rackReturn(b.dataset.ret);
      if (r.ok) SORT.last = { rack:b.dataset.ret, freed:r.freed, packs:r.packs };
      sortFlash(r.ok ? "ok" : "err", r.msg);
      renderSort(); renderPlanBox(); renderRackBox(); sortFocus();
    };
  });
  [].slice.call(box.querySelectorAll("[data-send]")).forEach(function(b){
    b.onclick = function(){
      var L = b.dataset.send, r = rackSend(L, SEND_ARM === L);
      if (!r.ok && r.need){
        SEND_ARM = L;                                   // ikkinchi bosish — tasdiq
        if (SEND_T) clearTimeout(SEND_T);
        SEND_T = setTimeout(function(){ SEND_ARM = null; renderRackBox(); }, 5000);
      } else SEND_ARM = null;
      sortFlash(r.ok ? "ok" : (r.need ? "warn" : "err"), r.msg + (r.need ? " — joʻnatish uchun yana bosing" : ""));
      renderSort(); renderPlanBox(); renderRackBox(); sortFocus();
    };
  });
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

/* v22: toʻliq boʻlmagan stelyajni joʻnatish — ikki bosish bilan (modal oyna yoʻq:
   u skanerni toʻsib qoʻyadi). Birinchi bosish 5 soniya «qurollanadi». */
var SEND_ARM = null, SEND_T = null;

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
  SORT.cell = {}; SORT.pack = {}; SORT.put = {}; SORT.plan = {}; SORT.seen = {}; SORT.last = null;
  SORT.away = {}; SORT.gone = {};                        // v22
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
      renderSort(); renderPlanBox(); renderRackBox();
      if (r.ok && !r.msg) sortFlash("", "");  // katta yozuvning oʻzi yetarli
      else sortFlash(r.kind, r.msg);          // v22: kechikkan detal — ok, lekin yoʻl-yoʻriq bilan
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
  function panel(btnId, boxId){
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
