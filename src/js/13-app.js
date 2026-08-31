/* ============================================================
   3.14 BOSHQARUV — sozlama, qayta hisob, tablar, tugmalar, ishga tushish
   ============================================================ */

/* --- 3.14.1 SOZLAMANI SAQLASH (localStorage) ---
   Diqqat: bu yerda faqat MEʼYORLAR saqlanadi. Yuklangan loyiha, hisoblangan pochkalar va
   yigʻish progressi IndexedDB da (09-storage.js) — ular hajmi katta va tez-tez oʻzgaradi. */
/* v20: SOZLAMA MAYDONLARI ROʻYXATI ENDI DOM DAN OLINADI.

   Ilgari bu qoʻlda yozilgan roʻyxat edi. Har yangi meʼyor qoʻshilganda uni
   yangilash unutilardi va oqibati JIM boʻlardi: maydon interfeysda turadi,
   operator qiymat kiritadi — lekin u saqlanmaydi va qayta hisobni ham
   chaqirmaydi. Yaʼni sozlama shunchaki YOZUV boʻlib qolardi.

   Sexda bu shunday koʻrindi: «Pochka maks. balandligi» ga 160 mm qoʻyilgan,
   tizim esa 12–14 qavat terib yuborgan. Balandlik mantigʻi toʻgʻri edi —
   maydon shunchaki packerga yetib bormasdi.

   Oxirgi tekshiruvda 46 maydondan 21 tasi roʻyxatdan tashqarida qolgan edi:
   cBaseWMax, cBaseLMin, cBaseCover, cBaseInset, cMaxH, cMaxPartT, cLidBal,
   cOddKg, cOddLMax, cOddWMax, cOddTol, cTailOver, cTailGap, cTailSpan,
   cLidSupp, cLidBed, cMinPartW, cMinPartL, cLabelW, cLabelH, cAutoLbl.

   Endi roʻyxat DOM dan yigʻiladi — unutish mumkin emas. */
var CONF_IDS = (function(){
  var out = [], box = document.getElementById("v-conf");
  if (box){
    var els = box.querySelectorAll("input,select");
    for (var i = 0; i < els.length; i++){
      var e = els[i];
      if (!e.id) continue;
      if (e.type === "file" || e.type === "button" || e.type === "submit") continue;
      out.push(e.id);
    }
  }
  /* Pochkalash qoidasi P/M ekranida turadi, lekin u ham meʼyor —
     saqlanishi va tiklanishi shart. */
  ["mgrByRoom","mgrByMat"].forEach(function(id){
    if (document.getElementById(id)) out.push(id);
  });
  return out;
})();

/* Qaysi sozlama QAYTA TERISHNI talab qilmaydi — faqat koʻrinishga taʼsir qiladi.
   Standart YOʻQ: roʻyxatda boʻlmagan har maydon qayta hisobga tushadi. Bu ataylab
   shunday — yangi maydon qoʻshilganda eng yomoni ortiqcha qayta hisob boʻladi,
   eng yaxshisi ishlaydi. Teskarisi (standart «taʼsir qilmaydi») aynan yuqoridagi
   jim nosozlikni qaytarardi. */
var CONF_VIEW_ONLY = {
  cTare:1, cOneMan:1,                                    // chek va ogohlantirish
  cPrefix:1, cLabel:1, cLabelW:1, cLabelH:1, cAutoLbl:1, // chek chop etish
  cRackN:1, cCellN:1, cCellW:1, cCellD:1, cCellH:1,      // saralash posti
  cBigN:1, cBigW:1, cBigD:1
};

/* standart qiymatlar HTML dan oʻqib olinadi — «Standartga qaytarish» shularni tiklaydi */
var CONF_DEFAULTS = {};
CONF_IDS.forEach(function(id){
  var e = $(id); if (!e) return;
  CONF_DEFAULTS[id] = (e.type === "checkbox") ? e.checked : e.value;
});
var MATCAT_DEFAULT = JSON.parse(JSON.stringify(S.matCat));

function isArr(x){ return Object.prototype.toString.call(x) === "[object Array]"; }

function saveConf(){
  var o = {};
  CONF_IDS.forEach(function(id){
    var e = $(id); if (!e) return;
    o[id] = e.type === "checkbox" ? e.checked : e.value;
  });
  o._matCat = S.matCat;
  o._sepCls = S.sepCls;
  o._modGroups = S.modGroups;   // v11
  o._clsGroups = S.clsGroups;
  o._unitNames = S.unitNames;   // v12: modul nomlari
  o._split = S.split;           // v12: bitta pochkalash qoidasi (rejim oʻrniga)
  o._cellOff = S.cellOff;       // yopiq yacheykalar — sexning fizik holati
  o._thickMix = S.thickMix;     // v20: qalinlik matritsasi ham meʼyor edi, saqlanmasdi
  try {
    localStorage.setItem("upk_conf", JSON.stringify(o));
    var n = $("saveNote"); n.style.display = "block";
    setTimeout(function(){ n.style.display = "none"; }, 3500);
  } catch(e){
    var n2 = $("saveNote");
    n2.style.display = "block";
    n2.style.borderLeftColor = "var(--alert)";
    n2.textContent = "Bu brauzerda saqlash imkoni yoʻq: " + e.message;
  }
}
function restoreConf(){
  try {
    var raw = localStorage.getItem("upk_conf"); if (!raw) return false;
    var o = JSON.parse(raw);
    CONF_IDS.forEach(function(id){
      var e = $(id); if (!e || !(id in o)) return;
      if (e.type === "checkbox") e.checked = !!o[id]; else e.value = o[id];
    });
    /* v12: eski saqlangan sozlamada rejim («b2c/b2b» yoki «ind/conv») va ikki
       qoida turgan boʻlishi mumkin — ular bitta qoidaga koʻchiriladi. Katakchalar
       shundan keyin toʻldiriladi, aks holda eski rejimning qiymati koʻrinmasdi. */
    S.split = splitFix(o._split, o.mode, o._rules);
    if ($("mgrByRoom")) $("mgrByRoom").checked = !!S.split.prod;
    if ($("mgrByMat"))  $("mgrByMat").checked  = !!S.split.mat;
    if (o._matCat && o._matCat.length) S.matCat = o._matCat;
    if (o._sepCls) S.sepCls = o._sepCls;
    if (isArr(o._modGroups)) S.modGroups = o._modGroups;
    if (isArr(o._clsGroups)) S.clsGroups = o._clsGroups;
    if (o._unitNames && typeof o._unitNames === "object") S.unitNames = o._unitNames;
    /* v12: modul belgisi manbai tanlovi olib tashlandi. Eski sozlama kod
       prefiksi rejimida saqlangan boʻlsa, undagi modul kalitlari endi mavjud
       emas — tozalanadi, aks holda hamma modul oʻchirilgandek koʻrinardi. */
    if (o._modSrc === "code"){ S.rooms = {}; S.modGroups = []; }
    if (o._cellOff && typeof o._cellOff === "object") S.cellOff = o._cellOff;
    if (o._thickMix && typeof o._thickMix === "object") S.thickMix = o._thickMix;   // v20
    return true;
  } catch(e){ return false; }
}
/* v10: ilgari bu yerda location.reload() turardi — yuklangan buyurtma ham yoʻqolardi.
   Endi faqat meʼyorlar standartga qaytadi, loyiha joyida qoladi. */
function resetConf(){
  try { localStorage.removeItem("upk_conf"); } catch(e){}
  CONF_IDS.forEach(function(id){
    var e = $(id); if (!e || !(id in CONF_DEFAULTS)) return;
    if (e.type === "checkbox") e.checked = CONF_DEFAULTS[id]; else e.value = CONF_DEFAULTS[id];
  });
  S.matCat = JSON.parse(JSON.stringify(MATCAT_DEFAULT));
  S.sepCls = {}; S.modGroups = []; S.clsGroups = []; S.unitNames = {};
  S.split = { prod:true, mat:false };                  // v12
  if (typeof renderCat === "function") renderCat();
  if (P) recompute();
}

/* --- 3.14.2 SOZLAMANI OʻQISH / YOZISH --- */
function readConf(){
  S.maxKg    = +$("cMaxKg").value || 35;
  S.ovh      = +$("cOvh").value || 0;
  S.minBase  = +$("cMinBase").value || 190;
  S.maxLen   = +$("cMaxLen").value || 2100;
  S.minBaseT = +$("cBaseT").value || 0;
  /* v14: TAG OYNASI — qolgan ikki chegara. baseLMin 0 boʻlishi MUMKIN
     («cheklovsiz»), shuning uchun `|| N` shakli ishlatilmaydi. */
  S.baseWMax  = numOr($("cBaseWMax"),  1900, 100, 4000);
  S.baseLMin  = numOr($("cBaseLMin"),     0,   0, 4000);
  S.baseCover = numOr($("cBaseCover"),   90,  50,  100);
  S.baseInset = numOr($("cBaseInset"),   40,   0,  500);
  S.maxH      = numOr($("cMaxH"),         0,   0, 5000);
  S.lidBal    = numOr($("cLidBal"),      40,   0,  100);
  S.maxPartT  = numOr($("cMaxPartT"),    60,   0, 5000);
  // v14: nostandart oqim
  S.oddKg     = numOr($("cOddKg"),       40,   1,  500);
  S.oddLMax   = numOr($("cOddLMax"),   3200, 100, 9000);
  S.oddWMax   = numOr($("cOddWMax"),   1900, 100, 4000);
  S.oddTol    = numOr($("cOddTol"),     300,   0, 2000);
  S.tailKgOver = numOr($("cTailOver"),   10,   0,  100);   // v16
  S.tailGap    = numOr($("cTailGap"),    300,   0, 4000);   // v20
  S.tailSpan   = numOr($("cTailSpan"),    70,   0,  100);   // v20
  S.lidSupp    = numOr($("cLidSupp"),     65,   0,  100);   // v20
  S.lidBed     = numOr($("cLidBed"),      85,   0,  100);   // v20
  S.minPartW   = numOr($("cMinPartW"),    0,   0, 4000);   // v18
  S.minPartL   = numOr($("cMinPartL"),    0,   0, 9000);
  readThickMix();
  S.tries    = Math.max(1, Math.min(40, +$("cTries").value || 4));
  S.prefix   = $("cPrefix").value || "SM";
  S.ovhOn    = $("cOvhOn").checked;
  S.byThick  = $("cThick").checked;

  /* v12: KESIM OʻQLARI — bitta umumiy qoida. Rejim tanlovi yoʻq: ikki katak
     bevosita S.split ni belgilaydi. Ikkalasini ham oʻchirish RUXSAT —
     «hammasi bitta pochkada» holati; qalinlik va fizik chegaralar baribir amal qiladi. */
  if (!S.split || typeof S.split !== "object") S.split = { prod:true, mat:false };
  var br = $("mgrByRoom"), bm = $("mgrByMat");
  if (br) S.split.prod = br.checked;
  if (bm) S.split.mat  = bm.checked;

  S.minFill   = Math.max(10, Math.min(130, +$("cFill").value || 85));
  S.lidFill   = Math.max(10, Math.min(100, +$("cLidFill").value || 90));
  S.lidN      = Math.max(1, Math.min(4, +$("cLidN").value || 3));
  S.lidTol    = Math.max(0, +$("cLidTol").value || 0);
  S.oneMan    = Math.max(0, +$("cOneMan").value || 25);
  S.tare      = Math.max(0, +$("cTare").value || 0);
  S.labelSize = $("cLabel") ? $("cLabel").value : "a4";
  // v20: qoʻlda chek oʻlchami — faqat labelSize="custom" da ishlatiladi
  S.labelW    = numOr($("cLabelW"),  80,  20, 300);
  S.labelH    = numOr($("cLabelH"),  60,  20, 300);
  if ($("cAutoLbl")) S.autoLbl = $("cAutoLbl").checked;
  S.maxLayers = Math.max(0, parseInt($("cMaxLay").value,10) || 0);
  /* terish logikasi (doimiy Avto) va variantlar soni endi 04-packer.js dagi
     PACK_TRIES konstantasida — ular sozlama emas, shuning uchun S da turmaydi */
  // v11: saralash posti sigʻimi
  if ($("cRackN")) S.rackN = Math.max(1, Math.min(60, parseInt($("cRackN").value,10) || 5));
  if ($("cCellN")) S.cellN = Math.max(1, Math.min(40, parseInt($("cCellN").value,10) || 6));
  // v12: yacheykaning fizik oʻlchamlari
  var cellNums = { cBigN:["bigN",0,20,1], cCellW:["cellW",20,2000,250], cCellD:["cellD",50,3000,400],
                   cCellH:["cellH",100,5000,1500],
                   cBigW:["bigW",20,2000,100], cBigD:["bigD",50,3000,800] };
  Object.keys(cellNums).forEach(function(id){
    var e = $(id); if (!e) return;
    var s = cellNums[id], v = parseInt(e.value, 10);
    S[s[0]] = Math.max(s[1], Math.min(s[2], isFinite(v) ? v : s[3]));
  });
  showCellTot();
  $("lgOv").textContent = S.ovh;
}
/* Sozlamalarda jami sigʻimni koʻrsatish — 6×10 = 60 yacheykani ofis xodimi
   pochka soni bilan solishtira olishi kerak. */
function showCellTot(){
  var e = $("cCellTot"); if (!e) return;
  var tot = (S.rackN || 5) * (S.cellN || 6);
  var need = (typeof PACKS !== "undefined" && PACKS) ? PACKS.length : 0;
  e.textContent = tot + " yacheyka" + (need ? "  ·  " + need + " pochka" : "");
  e.style.borderLeftColor = (need && tot < need) ? "var(--mark)" : "var(--info)";
  if (need && tot < need) e.textContent += "  — toʻlqin-toʻlqin saralanadi";
}
/* S dan interfeys maydonlariga — seans tiklangandan keyin kerak */
function writeConf(){
  var m = { cMaxKg:S.maxKg, cOvh:S.ovh, cMinBase:S.minBase, cMaxLen:S.maxLen, cBaseT:S.minBaseT,
            cFill:S.minFill, cLidFill:S.lidFill, cLidN:S.lidN, cLidTol:S.lidTol, cOneMan:S.oneMan,
            cTare:S.tare, cMaxLay:S.maxLayers, cTries:S.tries, cPrefix:S.prefix, cLabel:S.labelSize,
            // v14
            cBaseWMax:S.baseWMax, cBaseLMin:S.baseLMin, cBaseCover:S.baseCover,
            cBaseInset:S.baseInset, cMaxH:S.maxH, cLidBal:S.lidBal, cMaxPartT:S.maxPartT,
            cOddKg:S.oddKg, cOddLMax:S.oddLMax, cOddWMax:S.oddWMax, cOddTol:S.oddTol,
            cTailOver:S.tailKgOver, cTailGap:S.tailGap, cTailSpan:S.tailSpan,
            cLidSupp:S.lidSupp, cLidBed:S.lidBed,
            cMinPartW:S.minPartW, cMinPartL:S.minPartL,
            // v20
            cLabelW:S.labelW, cLabelH:S.labelH };
  Object.keys(m).forEach(function(id){ var e = $(id); if (e) e.value = m[id]; });
  if ($("cRackN")) $("cRackN").value = S.rackN || 5;
  if ($("cCellN")) $("cCellN").value = S.cellN || 6;
  var cellFill = { cBigN:"bigN", cCellW:"cellW", cCellD:"cellD", cCellH:"cellH",
                   cBigW:"bigW", cBigD:"bigD" };
  Object.keys(cellFill).forEach(function(id){
    var e = $(id); if (e && S[cellFill[id]] != null) e.value = S[cellFill[id]];
  });
  showCellTot();
  if ($("cOvhOn")) $("cOvhOn").checked = !!S.ovhOn;
  if ($("cThick")) $("cThick").checked = !!S.byThick;
  if ($("cAutoLbl")) $("cAutoLbl").checked = !!S.autoLbl;
  var sp = S.split || { prod:true, mat:false };
  if ($("mgrByRoom")) $("mgrByRoom").checked = !!sp.prod;
  if ($("mgrByMat"))  $("mgrByMat").checked  = !!sp.mat;
  renderThickMix();
  $("lgOv").textContent = S.ovh;
}

/* v14: raqamli maydonni chegaralar bilan oʻqish. `+v || N` shaklidan farqi —
   NOL QIYMATNI saqlaydi: «cheklovsiz» degani aynan 0 bilan yoziladi
   (baseLMin, maxH), `|| N` esa uni jimgina standartga qaytarib yuborardi. */
function numOr(el, def, lo, hi){
  if (!el) return def;
  var v = parseFloat(el.value);
  if (!isFinite(v)) return def;
  return Math.max(lo, Math.min(hi, v));
}

/* ---- v14: QALINLIK MATRITSASI ------------------------------------------
   Buyurtmadagi har qalinlik uchun bitta katak: «asosiy pochkaga qoʻshilsin».
   Asosiy qalinlik — detali eng koʻp boʻlgani; u katakcha olmaydi, chunki
   uning oʻzi asos. Ruʻyxat LOYIHADAN chiqadi, sozlamadan emas — shuning uchun
   yangi fayl yuklanganda oʻzi yangilanadi. */
function thickList(){
  var out = [], cnt = {};
  if (typeof P !== "object" || !P || !P.parts) return out;
  try {
    buildItems().forEach(function(it){
      var k = String(it.T);
      cnt[k] = (cnt[k] || 0) + 1;
    });
  } catch(e){ return out; }
  Object.keys(cnt).forEach(function(k){ out.push({ t:k, n:cnt[k] }); });
  out.sort(function(a,b){ return b.n - a.n || (+a.t) - (+b.t); });
  return out;
}
function renderThickMix(){
  var box = $("thickMix"); if (!box) return;
  var list = thickList();
  if (!list.length){ box.innerHTML = '<span style="color:var(--ink3)">Loyiha yuklanmagan.</span>'; return; }
  if (!S.thickMix || typeof S.thickMix !== "object") S.thickMix = {};
  var main = list[0].t;
  box.innerHTML = list.map(function(r, i){
    if (i === 0)
      return '<div style="display:inline-block;margin:0 18px 6px 0">' +
             '<b style="font-family:var(--mono)">' + esc(r.t) + ' mm</b> ' +
             '<span style="color:var(--ok)">— ASOSIY</span> ' +
             '<span style="color:var(--ink3)">· ' + r.n + ' detal</span></div>';
    return '<label class="chk" style="display:inline-flex;margin:0 18px 6px 0">' +
           '<input type="checkbox" data-tmix="' + esc(r.t) + '"' +
           (S.thickMix[r.t] ? " checked" : "") + '>' +
           '<span><b style="font-family:var(--mono)">' + esc(r.t) + ' mm</b> → ' + esc(main) +
           ' mm pochkasiga · <span style="color:var(--ink3)">' + r.n + ' detal</span></span></label>';
  }).join("");
  box.querySelectorAll("[data-tmix]").forEach(function(el){
    el.onchange = function(){
      S.thickMix[el.getAttribute("data-tmix")] = el.checked;
      recomputeSoon();
    };
  });
}
function readThickMix(){
  var box = $("thickMix"); if (!box) return;
  if (!S.thickMix || typeof S.thickMix !== "object") S.thickMix = {};
  box.querySelectorAll("[data-tmix]").forEach(function(el){
    S.thickMix[el.getAttribute("data-tmix")] = el.checked;
  });
}

/* --- 3.14.3 JARAYON KOʻRSATKICHI ---
   Katta buyurtmada pochkalash bir necha soniya davom etadi. Ilgari bu vaqtda brauzer
   toʻliq muzlab qolardi. Endi hisob boʻlaklab bajariladi, koʻrsatkich chiqadi va
   bekor qilish mumkin. Kichik buyurtmada koʻrsatkich umuman koʻrinmaydi (250 ms kechikish). */
var PROG_TIMER = null;
function progShow(){
  PROG_TIMER = setTimeout(function(){ $("prog").classList.add("on"); }, 250);
}
function progHide(){
  if (PROG_TIMER){ clearTimeout(PROG_TIMER); PROG_TIMER = null; }
  $("prog").classList.remove("on");
}
function progUpdate(pp){
  var frac = (pp.tries ? (pp.t - 1) / pp.tries : 0) +
             (pp.tries && pp.groups ? (pp.g / pp.groups) / pp.tries : 0);
  var pct = Math.max(0, Math.min(100, frac * 100));
  $("progFill").style.width = pct.toFixed(0) + "%";
  $("progTxt").textContent = "urinish " + pp.t + "/" + pp.tries +
    " · guruh " + pp.g + "/" + pp.groups + " · " + pp.packs + " pochka";
}

/* --- 3.14.4 QAYTA HISOB --- */
var BUSY = false;
function recompute(){
  if (!P) return Promise.resolve();
  readConf();
  BUSY = true;
  progShow();
  var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  // packAllAsync ichida run-token bor: yangi chaqiruv boshlansa eskisi oʻzi toʻxtaydi
  return packAllAsync(progUpdate).then(function(res){
    if (res && res.superseded) return res;      // yangi hisob ishlayapti — ekranga tegmaymiz
    BUSY = false; progHide();
    if (typeof DIAG === "object" && DIAG)
      DIAG.packMs = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;
    if (res && res.cancelled) return res;
    renderPacks(); renderParts(); stats();
    selectPack(PACKS.length ? Math.min(Math.max(CUR,0), PACKS.length-1) : -1);
    /* v11: qayta terishda pochkalar tarkibi butunlay oʻzgaradi — eski saralash
       endi notoʻgʻri («P07 → B3» degan yozuv boshqa detallarga tegishli boʻlib
       qoladi). Shu sabab saralash nolga tushadi. */
    if (typeof sortReset === "function") sortReset();
    if (typeof showCellTot === "function") showCellTot();
    // v14: qalinlik matritsasi LOYIHADAN chiqadi — yangi fayl yuklangach yangilanadi
    if (typeof renderThickMix === "function") renderThickMix();
    if (typeof autosave === "function") autosave();
    return res;
  }).catch(function(e){
    BUSY = false; progHide();
    if (window.console) console.error("pochkalash xatosi:", e);
    flash("err", "pochkalash xatosi: " + (e && e.message ? e.message : e));
  });
}
/* material maydonlarini tahrirlashda — kechiktirilgan qayta hisob (harf boshiga emas) */
var SOON = null;
function recomputeSoon(){
  if (SOON) clearTimeout(SOON);
  SOON = setTimeout(function(){ SOON = null; recompute(); }, 450);
}

/* --- 3.14.5 LOYIHANI ISHGA TUSHIRISH --- */
function boot(data){
  P = data; CUR = -1; STEP = 0;
  if (!P.rev) P.rev = 0;
  if (!S.rooms) S.rooms = {};
  readConf(); applyCat();
  renderMats(); renderMgr(); renderCat();
  return recompute().then(function(){
    if (PACKS.length) selectPack(0); else renderStep();
    if (typeof renderDiag === "function") renderDiag();
  });
}

/* v12: codeUnits() va suggestCodeSrc() olib tashlandi — ikkalasi ham kod
   prefiksi rejimi uchun edi (prefiks nechta birlik beradi; tuzilish buzilgan
   boʻlsa prefiksni tavsiya qilish). Manba tanlovi yoʻq, ular ham keraksiz. */

/* Oynadagi birliklar roʻyxati — proekt tuzilishi boʻyicha */
function modalUnits(parts){
  var u = {};
  parts.forEach(function(p){
    var r = u[p.pc] = u[p.pc] || { name:p.p, n:0 };
    r.n += p.q;
  });
  var ks = Object.keys(u).sort();
  $("mRoomN").textContent = ks.length;
  $("mRoomsInfo").innerHTML = ks.map(function(k){
    return "<b>"+esc(k)+"</b> — "+esc(u[k].name)+" · "+u[k].n+" detal";
  }).join("<br>");
}

var PENDING = null;
function askAndBoot(data, fname){
  PENDING = data;
  $("mFile").textContent = (fname||"") + " · " + data.parts.reduce(function(s,p){ return s+p.q; },0) + " detal";

  /* v12: modul tanlovlari oynadan olib tashlandi. Oyna endi FAKTNI koʻrsatadi —
     joriy sozlama bilan qanaqa modullar chiqishini. Tanlov P/M menejerida. */
  modalUnits(data.parts);
  // detal klasslari
  var cls = {};
  data.parts.forEach(function(p){ var c = classify(p.n); cls[c] = (cls[c]||0) + p.q; });
  var ck = Object.keys(cls).sort(function(a,b){ return cls[b]-cls[a]; });
  $("mClsN").textContent = ck.length;
  $("mCls").innerHTML = ck.map(function(c){
    return '<label class="chk" style="padding:3px 0"><input type="checkbox" data-cls="'+esc(c)+'" '+
      (S.sepCls[c] ? "checked" : "")+' style="accent-color:var(--mark)"><span style="font-family:var(--mono);font-size:12px">'+
      esc(c)+' <i style="color:var(--ink3);font-style:normal">· '+cls[c]+' dona</i></span></label>';
  }).join("");
  // parser ogohlantirishlari — pochkalashdan OLDIN koʻrinsin
  var w = $("mWarn");
  if (w){
    var ws = (typeof DIAG === "object" && DIAG && DIAG.warnings) ? DIAG.warnings : [];
    w.innerHTML = ws.length
      ? '<div class="msg err" style="margin-bottom:10px">⚠ '+ws.length+
        ' ta ogohlantirish — «Diagnostika» boʻlimida koʻring<br><span style="font-size:10.5px;color:var(--ink3)">'+
        esc(ws.slice(0,3).map(function(x){ return x.msg; }).join(" · ").slice(0,180))+'</span></div>'
      : '';
  }
  $("modal").style.display = "flex";
}

$("mOk").onclick = function(){
  S.rooms = {};
  S.sepCls = {};
  /* v11: yangi buyurtma — eski guruhlar boshqa buyurtmaning modul kodlariga
     tayangan edi, ular bu faylda mavjud emas. Tozalanmasa «osilib» qolardi. */
  S.modGroups = []; S.clsGroups = []; S.unitNames = {};
  /* v12: oynada modul tanlovlari yoʻq — kesim katakchalari menejerdagi
     qiymatida qoladi (TZ §2: sozlama bir marta qilinadi va eslab qolinadi) */
  document.querySelectorAll("#mCls input").forEach(function(c){
    if (c.checked) S.sepCls[c.dataset.cls] = true;
  });
  $("modal").style.display = "none";
  var data = PENDING; PENDING = null;
  boot(data);
  document.querySelector('.tabs button[data-v="work"]').click();
};
$("mCancel").onclick = function(){ $("modal").style.display = "none"; PENDING = null; };

/* --- 3.14.6 TABLAR --- */
document.querySelectorAll(".tabs button").forEach(function(b){
  b.onclick = function(){
    document.querySelectorAll(".tabs button").forEach(function(x){ x.classList.remove("on"); });
    document.querySelectorAll(".view").forEach(function(x){ x.classList.remove("on"); });
    b.classList.add("on"); $("v-"+b.dataset.v).classList.add("on");
    if (b.dataset.v==="work"){ draw3D(); draw2D(); }
    if (b.dataset.v==="mgr" && P){ renderMgr(); if (typeof renderRecent === "function") renderRecent(); }
    if (b.dataset.v==="diag" && typeof renderDiag === "function") renderDiag();
    // v11: saralash — fokus darhol skanerga tushsin, ishchi qoʻli bilan bosmasin
    if (b.dataset.v==="sort" && typeof renderSort === "function"){ renderSort(); sortFocus(); }
  };
});
function showTab(name){
  var b = document.querySelector('.tabs button[data-v="'+name+'"]');
  if (b) b.click();
}

/* --- 3.14.7 TUGMA VA MAYDON BOGʻLASHLARI --- */
/* v12: rejim tanlovlari («mode», «mgrMode») olib tashlandi — kesim katakchalari
   readConf() orqali bevosita S.split ga yozadi. */
$("mgrApply").onclick = function(){
  recompute();
  showTab("work");
};
/* v11: guruh tugmalari */
if ($("btnModGrp")) $("btnModGrp").onclick = makeModGroup;
if ($("btnClsGrp")) $("btnClsGrp").onclick = makeClsGroup;

/* v12: «Modul belgisi qayerdan» tanlovi va uning bogʻlanishlari olib tashlandi —
   birlik har doim proekt tuzilishidan olinadi (unitOf, 02-state.js). */

/* v20: HAR SOZLAMA TIZIMGA BOGʻLANADI.

   Ilgari bu yerda 14 ta id li qoʻlda yozilgan roʻyxat turardi va faqat oʻshalar
   `recompute()` ni chaqirardi. Qolgan 30 dan ortiq maydon — balandlik, paddon
   qamrovi, nostandart limitlar, quyruq qoidalari, chek oʻlchami — hech nimaga
   bogʻlanmagan edi: operator qiymat kiritardi, tizim esa eski natijani
   koʻrsatib turaverardi.

   Endi bogʻlash CONF_IDS boʻyicha avtomatik. Yangi maydon qoʻshilsa u oʻzi
   bogʻlanadi — `smoke.ps1` buni qoʻriqlaydi. */
CONF_IDS.forEach(function(id){
  var e = $(id); if (!e) return;
  if (id === "mgrByRoom" || id === "mgrByMat") return;   // ularning oʻz ishlovchisi bor
  e.onchange = CONF_VIEW_ONLY[id]
    ? function(){
        readConf();
        if (typeof showCellTot === "function") showCellTot();
        if (typeof renderPacks === "function") renderPacks();
        if (typeof renderStep === "function") renderStep();
      }
    : function(){ recompute(); };
});

$("btnRepack").onclick   = function(){ recompute(); };
$("btnSave").onclick     = function(){ readConf(); saveConf(); };
$("btnReset").onclick    = resetConf;
$("btnCsv").onclick      = csv;
$("btnAddMat").onclick   = function(){ if (typeof addMaterial === "function") addMaterial(); };
$("btnAddCat").onclick   = function(){
  S.matCat.push({ key:"YANGI", t:16, l:2750, w:1830, kgm2:11.20 });
  renderCat();
};
$("btnClearSes").onclick = function(){
  if (typeof Store === "undefined") return;
  /* Store.clearSession() emas, 09-storage.js dagi clearSession() chaqiriladi:
     u avval KUTAYOTGAN avtosaqlash taymerini bekor qiladi. Ilgari bu yerda
     bevosita Store chaqirilardi va taymer keyin ishlab, endigina tozalangan
     seansni qaytarib yozib qoʻyishi mumkin edi. */
  clearSession().then(function(){
    var n = $("saveNote");
    n.style.display = "block"; n.style.borderLeftColor = "var(--ok)";
    n.textContent = "Seans tozalandi — keyingi ochilishda namuna loyiha yuklanadi.";
    setTimeout(function(){ n.style.display = "none"; }, 3500);
  });
};

$("btnPrintAll").onclick  = function(){ if (P) printSteps(allSteps(), (P.name||"")+" — barcha cheklar"); };
$("btnPrint1").onclick    = function(){ var p=PACKS[CUR]; if(!p) return;
  printSteps([{p:p,s:p.seq[Math.min(STEP,p.seq.length-1)]}], "P"+pad2(p.no)); };
$("btnPrintPack").onclick = function(){ var p=PACKS[CUR]; if(!p) return;
  printSteps(p.seq.map(function(s){ return {p:p,s:s}; }), "Pochka P"+pad2(p.no)); };
$("btnPackLbl").onclick   = function(){ printPackLabel(PACKS[CUR]); };

/* ---- v20: BUYURTMA HUJJATI (A4, toʻliq tarkib) ----
   Hujjat FAQAT hamma pochka yigʻilgandan keyin chop etiladi. Yarim yigʻilgan
   buyurtmaga «toʻliq tarkib» berilsa u yolgʻon hujjat boʻladi: omborga
   yoʻqolgan detal bilan qabul qilinadi.
   Tayyor boʻlmasa tugma nima qolganini yozadi va chop etmaydi. */
function orderNote(){
  var n = $("orderDocNote"); if (!n) return null;
  var st = orderStatus();
  if (!PACKS.length){
    n.style.borderLeftColor = "var(--line)";
    n.textContent = "Loyiha yuklanmagan.";
    return st;
  }
  if (st.ready){
    n.style.borderLeftColor = "var(--ok)";
    n.textContent = "TAYYOR — " + st.packs + " pochka, " + st.parts +
                    " detal yigʻildi. Hujjat chop etishga tayyor.";
  } else {
    n.style.borderLeftColor = "var(--alert)";
    var kim = st.left.slice(0, 8).map(function(x){
      return "P" + pad2(x.no) + " (" + x.done + "/" + x.of + ")";
    }).join(", ");
    n.textContent = "TAYYOR EMAS — " + (st.packs - st.donePacks) + "/" + st.packs +
                    " pochka yigʻilmagan, " + st.leftParts + " detal qoldi: " + kim +
                    (st.left.length > 8 ? " …" : "");
  }
  return st;
}
$("btnOrderChk").onclick = function(){ orderNote(); };
$("btnOrderDoc").onclick = function(){
  var st = orderNote();
  if (!st || !st.ready) return;          // tayyor emas — chop etilmaydi
  applyPageSize();                       // hujjat har doim A4
  var sh = $("sheet");
  sh.className = "sz-a4";
  var pst = document.getElementById("pageStyle");
  if (pst) pst.textContent = "@media print{@page{size:A4;margin:10mm}}";
  sh.innerHTML = orderDocHTML();
  setTimeout(function(){
    window.print();
    setTimeout(function(){ sh.innerHTML = ""; }, 1000);
  }, 60);
};

/* v12: «Tahrirlash» tugmasi Qadoqlash ekranidan olib tashlandi — TZ-v2 §1:
   pochkalash posti ishchisi hech narsani oʻzgartira olmaydi. Tahrirlash P/M
   boʻlimida, «Pochkalarni tuzatish» blokida (renderMgrEdit, 10-ui.js). */
$("btnWrap").onclick = function(){
  var p=PACKS[CUR];
  if (!p || p.odd) return;
  if (STEP < p.seq.length){ flash("err","avval hamma detalni qoʻying"); return; }
  WRAP = !WRAP; $("btnWrap").textContent = WRAP ? "Qogʻozni ochish" : "Qogʻozga oʻrash"; draw3D();
};
$("zex").oninput = function(){ S.zex = +this.value; $("zexv").textContent = this.value; draw3D(); };

$("progCancel").onclick = function(){ PACKPROG.cancel = true; $("progTxt").textContent = "bekor qilinmoqda…"; };

$("btnDemo").onclick  = function(){ boot(JSON.parse(JSON.stringify(SEED))); showTab("work"); };
$("btnLoad2").onclick = function(){ $("file").click(); };

/* detallar jadvali qidiruvi — yozilishi bilan filtrlanadi */
(function(){
  var q = $("partQ"); if (!q) return;
  var tmr = null;
  q.oninput = function(){
    if (tmr) clearTimeout(tmr);
    tmr = setTimeout(function(){ PART_Q = q.value; renderParts(); }, 120);
  };
  q.onkeydown = function(e){ if (e.key === "Escape"){ q.value = ""; PART_Q = ""; renderParts(); } };
  var b = $("btnPartCsv");
  if (b) b.onclick = function(){ partsCsv(); };
})();

/* --- 3.14.8 KLAVIATURA ---
   v10 XAVFSIZLIK TUZATISHI. Ilgari global Enter/Probel ushlagichi FAQAT matn maydonlarini
   istisno qilardi. Natijada:
     • foydalanuvchi istalgan tugmani (yoki tabni) bosgach fokus oʻsha tugmada qoladi;
       keyingi Enter tugmani QAYTA bosadi VA ustiga detalni «qoʻyildi» deb belgilaydi — ikki marta;
     • boshqa boʻlimda (Detallar, Sozlamalar) turib Probel bosilsa ham qadam oʻtib ketardi;
     • «Yangi buyurtma» oynasi ochiq turganda ham orqada qadam oʻtardi;
     • QR skaner matn oxirida Enter yuboradi — fokus skaner maydonidan chiqib ketgan boʻlsa,
       detal HECH QANDAY TEKSHIRUVSIZ qoʻyilgan deb belgilanardi.
   Endi qisqartma faqat: pochkalash ekranida + oyna ochiq emas + fokus tugma/maydonda emas. */

function anyOverlayOpen(){
  var ids = ["modal", "loadErr", "dropzone"];
  for (var i=0;i<ids.length;i++){
    var el = document.getElementById(ids[i]);
    if (el && el.style.display && el.style.display !== "none") return true;
  }
  var p = $("prog");
  return !!(p && p.classList.contains("on"));
}
function isWorkTab(){ var v = $("v-work"); return !!(v && v.classList.contains("on")); }

/* Escape — eng ustki oynani yopadi */
function closeTopOverlay(){
  var le = document.getElementById("loadErr");
  if (le && le.style.display && le.style.display !== "none"){ le.style.display = "none"; return true; }
  var m = $("modal");
  if (m && m.style.display && m.style.display !== "none"){
    m.style.display = "none"; PENDING = null; return true;
  }
  return false;
}

document.addEventListener("keydown", function(e){
  var t = e.target || {};
  var tag = t.tagName;

  if (e.key === "Escape" && closeTopOverlay()){ e.preventDefault(); return; }

  // matn kiritilayotgan joy — tegmaymiz
  if (tag==="INPUT" || tag==="SELECT" || tag==="TEXTAREA" || t.isContentEditable) return;
  // fokus tugmada boʻlsa Enter/Probel OʻSHA tugmaniki (brauzer oʻzi bosadi)
  if (tag==="BUTTON" || tag==="A" || (t.getAttribute && t.getAttribute("role")==="button")) return;
  // faqat pochkalash ekranida va hech qanday oyna ochiq boʻlmaganda
  if (!isWorkTab() || anyOverlayOpen()) return;

  if (e.key===" " || e.key==="Enter"){ e.preventDefault(); if(PACKS[CUR]) advance(); }
  if (e.key==="Backspace"){ e.preventDefault(); setStep(STEP-1); renderStep(); renderPacks(); }
});

/* --- 3.14.9 ISHGA TUSHISH ---
   1) localStorage dan meʼyorlar
   2) IndexedDB dan oxirgi seans (loyiha + pochkalar + yigʻish progressi)
   3) seans boʻlmasa — oʻrnatilgan namuna loyiha */
/* Raqamli maydonlarni vergulga bardoshli qilamiz (uz-UZ lokali muammosi).
   Bu restoreConf() dan KEYIN turishi kerak — u maydonlarga qiymat yozadi. */
restoreConf();
if (typeof fixNumberInputs === "function") fixNumberInputs(document);
readConf();
if (typeof initUpload === "function") initUpload();
// saralash posti oʻzini oʻzi bogʻlaydi — 14-sort.js oxiriga qarang

(function start(){
  function fallback(){ boot(JSON.parse(JSON.stringify(SEED))); }

  if (typeof Store === "undefined" || !Store.ready){ fallback(); return; }

  Store.ready.then(function(){ return Store.getSession(); }).then(function(snap){
    if (!snap){ fallback(); return; }
    var ok = false;
    try { ok = restoreSnapshot(snap); } catch(e){ if (window.console) console.warn("seans:", e); }
    if (!ok){ fallback(); return; }
    // Terish reviziyasi pochkalarda saqlangan. P.rev ni ularning eng kattasiga tenglaymiz —
    // aks holda keyingi qayta pochkalash R1 dan boshlanib, eski cheklar bilan adashtiradi.
    var mx = 0;
    PACKS.forEach(function(p){ if ((p.rev||0) > mx) mx = p.rev||0; });
    P.rev = mx || 1;
    writeConf();
    applyCat();
    renderPacks(); renderParts(); renderMats(); renderMgr(); renderCat(); stats();
    if (PACKS.length) selectPack(Math.max(0, Math.min(snap.cur || 0, PACKS.length-1)));
    else renderStep();
    if (typeof renderRecent === "function") renderRecent();
    flash("ok", "oxirgi seans tiklandi — " + (P.name || "loyiha"));
  }).catch(function(e){
    if (window.console) console.warn("seans tiklanmadi:", e);
    fallback();
  });
})();
