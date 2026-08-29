/* ============================================================
   3.14 BOSHQARUV — sozlama, qayta hisob, tablar, tugmalar, ishga tushish
   ============================================================ */

/* --- 3.14.1 SOZLAMANI SAQLASH (localStorage) ---
   Diqqat: bu yerda faqat MEʼYORLAR saqlanadi. Yuklangan loyiha, hisoblangan pochkalar va
   yigʻish progressi IndexedDB da (09-storage.js) — ular hajmi katta va tez-tez oʻzgaradi. */
var CONF_IDS = ["cMaxKg","cOvh","cMinBase","cMaxLen","cBaseT","cFill","cLidFill","cLidN","cLidTol",
                "cOneMan","cTare","cMaxLay","cTries","cPrefix","cLabel","cOvhOn","cThick",
                "cRackN","cCellN",
                /* v12: yacheykaning fizik oʻlchamlari. Bular ham SHU roʻyxatda boʻlishi SHART —
                   aks holda operator sexdagi haqiqiy oʻlchamni kiritadi, tizim esa uni
                   saqlamay har ochilishda standartga qaytarib yuboradi. */
                "cBigN","cCellW","cCellD","cCellH","cBigW","cBigD",
                /* v12: «mode»/«mgrMode» olib tashlandi — rejim yoʻq, qoida bitta */
                "mgrByRoom","mgrByMat"];

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
  S.lidFill   = Math.max(10, Math.min(100, +$("cLidFill").value || 80));
  S.lidN      = Math.max(1, Math.min(4, +$("cLidN").value || 3));
  S.lidTol    = Math.max(0, +$("cLidTol").value || 0);
  S.oneMan    = Math.max(0, +$("cOneMan").value || 25);
  S.tare      = Math.max(0, +$("cTare").value || 0);
  S.labelSize = $("cLabel") ? $("cLabel").value : "a4";
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
            cTare:S.tare, cMaxLay:S.maxLayers, cTries:S.tries, cPrefix:S.prefix, cLabel:S.labelSize };
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
  var sp = S.split || { prod:true, mat:false };
  if ($("mgrByRoom")) $("mgrByRoom").checked = !!sp.prod;
  if ($("mgrByMat"))  $("mgrByMat").checked  = !!sp.mat;
  $("lgOv").textContent = S.ovh;
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

["cMaxKg","cOvh","cMinBase","cMaxLen","cBaseT","cTries","cOvhOn","cThick","cFill","cLidFill",
 "cLidN","cLidTol","cOneMan","cMaxLay"].forEach(function(id){
  var e = $(id); if (e) e.onchange = function(){ recompute(); };
});
$("cTare").onchange  = function(){ readConf(); renderPacks(); renderStep(); };
$("cLabel").onchange = function(){ readConf(); };
$("cPrefix").onchange = function(){ readConf(); renderStep(); };

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
$("btnPackLbl").onclick   = function(){ var p=PACKS[CUR]; if(!p) return;
  applyPageSize();
  $("sheet").innerHTML = '<div class="lbls">'+packLabelHTML(p,"qpk")+'</div>';
  drawQR($("qpk"), packQR(p)); setTimeout(function(){ window.print(); },60); };

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
