/* ============================================================
   3.16 POSTLAR — SARALASH VA QADOQLASH ALOHIDA (v22)
   ============================================================
   Tsex jarayoni (2026-11-12):
     1) SARALASH POSTI — ishchilar detallarni stelyaj yacheykalariga saralaydi
        (bir yacheyka = bir pochka). Stelyaj toʻlgach u BUTUNLIGICHA qadoqlash
        boʻlimiga olib boriladi (14-sort.js — rackCheckReady).
     2) QADOQLASH POSTI — stelyajdan detal olinadi va skanerlanadi, pochkasi
        oʻzi ochiladi (10-ui.js — scanOpenPack), 3D boʻyicha teriladi, pochka
        tugagach chek chiqadi va pochka ustiga yopishtiriladi (S.autoLbl).
        Boʻsh stelyaj saralashga qaytadi va u yerda QR belgisi skanerlanadi.

   Postlar odatda ALOHIDA kompyuterda va ular orasida tarmoq boʻlishi shart emas.
   Bitta talab: ikkalasida REJA bir xil boʻlsin — aks holda saralash posti P07
   deb yigʻgan yacheykadagi detallar qadoqlash postida boshqa pochkalarga tegishli
   chiqadi. Shuning uchun:
     - REJA RAQAMI (planId) — pochkalar tarkibidan hisoblanadi va ikkala postning
       ekranida turadi; farq qilsa — rejalar har xil;
     - REJA FAYLI — P/M (yoki saralash posti) rejani faylga saqlaydi, qadoqlash
       posti oʻsha faylni ochadi. Pochkalar qayta hisoblanmaydi — fayldagidek
       tiklanadi, demak qoʻlda tuzatilgan pochkalar ham, boshqa sozlamalar ham
       aynan oʻtadi.
   ============================================================ */

/* ---- POST REJIMI — shu kompyuter qaysi post. Buyurtmaga emas, QURILMAGA
   tegishli, shuning uchun alohida kalitda (sozlama va seansdan tashqarida). ---- */
var POST_KEY = "upk_post";
var POST_MEM = null;                 // localStorage ishlamasa — shu seans uchun
var POSTS = { all:"Hamma boʻlim", sort:"Saralash posti", pack:"Qadoqlash posti" };
var POST_HIDE = { sort:{ work:1 }, pack:{ sort:1 } };   // boshqa postning ekrani yashiriladi

function postMode(){
  var v = null;
  try { v = localStorage.getItem(POST_KEY); } catch(e){}
  if (v == null) v = POST_MEM;
  return POSTS.hasOwnProperty(v) ? v : "all";
}
function postHome(){ return postMode() === "sort" ? "sort" : "work"; }
function postHidden(tab){ var h = POST_HIDE[postMode()]; return !!(h && h[tab]); }
function postSet(m){
  if (!POSTS.hasOwnProperty(m)) m = "all";
  POST_MEM = m;
  try { localStorage.setItem(POST_KEY, m); } catch(e){}
  postApply(m !== "all");
}
/* Tablar, shapkadagi belgi va P/M dagi tanlov. go — postning oʻz ekraniga oʻtish. */
function postApply(go){
  var m = postMode();
  [].slice.call(document.querySelectorAll(".tabs button")).forEach(function(b){
    b.style.display = postHidden(b.dataset.v) ? "none" : "";
  });
  var chip = $("postChip");
  if (chip){ chip.textContent = m === "all" ? "" : POSTS[m]; chip.style.display = m === "all" ? "none" : ""; }
  var sel = $("mgrPost"); if (sel) sel.value = m;
  var on = document.querySelector(".tabs button.on");
  // allaqachon postning oʻz ekranida boʻlsa — qayta bosilmaydi (ishga tushishda 3D ikki marta chizilmasin)
  if ((go && (!on || on.dataset.v !== postHome())) || (on && postHidden(on.dataset.v))) showTab(postHome());
}

/* ---- REJA RAQAMI ----
   Pochkalar TARKIBIDAN (raqam + detal uid lari) va terish reviziyasidan
   hisoblanadi — 6 ta 16-lik belgi. Koordinata va massa kirmaydi: ular qayta
   hisoblashda yaxlitlanishi mumkin, saralash uchun esa faqat «qaysi detal qaysi
   pochkada» muhim. Reviziya kiradi: oʻz chekimizdagi R raqami boshqa boʻlsa
   qadoqlash posti saralashda chop etilgan chekni «eski» deb rad etardi. */
function planId(){
  if (!P || !PACKS || !PACKS.length) return "";
  var h = 0x811c9dc5;
  function add(s){
    for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  }
  add(projTag() + "|R" + (P.rev || 1));
  PACKS.forEach(function(p){
    add("|" + p.no + ":" + packItems(p).map(function(it){ return it.uid; }).sort().join(","));
  });
  return ("000000" + h.toString(16).toUpperCase()).slice(-6);
}

/* ---- REJA FAYLI ----
   Seans snapshoti (09-storage.js) — progresssiz: qabul qiluvchi post noldan
   boshlaydi. Saralash holati ham, yigʻish tartibi ham oʻtmaydi. */
var PLAN_FMT = "upk-reja";
function planFileObj(){
  if (!P || !PACKS.length) return null;
  var snap = makeSnapshot();
  snap.cur = 0; snap.sort = null; snap.packSeen = {};
  (snap.packs || []).forEach(function(s){ s.done = 0; delete s.ord; });
  return { format:PLAN_FMT, v:1, app:"UPK v" + APP_VER, planId:planId(), ts:Date.now(),
           name:P.name || "", packs:PACKS.length, snapshot:snap };
}
function planFileName(){
  return String(P.mesOrder || P.name || "reja").replace(/[\\\/:*?"<>|]+/g, "_") +
         "_reja-" + planId() + ".upk.json";
}
function planFileSave(){
  var o = planFileObj();
  if (!o){ flash("err", "reja yoʻq — avval loyihani yuklang"); return null; }
  dlText(JSON.stringify(o), planFileName(), "application/json;charset=utf-8", false);
  var n = $("planNote");
  if (n){
    n.style.display = "block";
    n.innerHTML = 'Reja fayli saqlandi: <b>' + esc(planFileName()) + '</b>. Qadoqlash postida shu faylni ' +
      '«Loyiha yuklash» orqali oching — ikkala ekranda <b>reja ' + esc(o.planId) + '</b> turishi kerak.';
  }
  return o;
}
/* Matn reja fayli boʻlib koʻrinadimi (yuklash oqimi shunga qarab ajraladi). */
function looksLikePlan(txt){ return /^\s*\{/.test(String(txt || "").replace(/^﻿/, "")); }

/* Reja faylini ochish. Qaytadi: {ok, msg, id, same}.
   Pochkalar fayldagidek TIKLANADI (qayta hisoblanmaydi) — bu postdagi
   sozlamalar boshqa boʻlsa ham tarkib aynan oʻtadi. */
function planFileLoad(txt){
  var o = null;
  try { o = JSON.parse(String(txt || "").replace(/^﻿/, "")); }
  catch(e){ return { ok:false, msg:"reja fayli oʻqilmadi — JSON buzilgan" }; }
  if (!o || o.format !== PLAN_FMT || !o.snapshot || typeof o.snapshot !== "object")
    return { ok:false, msg:"bu fayl upakofka reja fayli emas" + (o && o.format ? " (format: " + o.format + ")" : "") };
  if (+o.v > 1) return { ok:false, msg:"reja fayli yangiroq versiyada yozilgan (v" + o.v + ") — upakofkani yangilang" };
  var before = planId(), ok = false;
  try { ok = restoreSnapshot(o.snapshot); } catch(e){ ok = false; }
  if (!ok) return { ok:false, msg:"reja tiklanmadi — fayldagi detallar mos kelmadi (fayl buzilgan yoki boshqa versiya)" };
  // reviziya fayldagi loyihada bor; boʻlmasa — pochkalardagi eng kattasi (09-storage start bilan bir xil)
  var mx = 0;
  PACKS.forEach(function(p){ if ((p.rev || 0) > mx) mx = p.rev || 0; });
  P.rev = Math.max(P.rev || 0, mx) || 1;
  if (typeof PACK_SEEN === "object") PACK_SEEN = {};
  var now = planId();
  /* Boshqa reja — bu postdagi eski saralash yaroqsiz (xuddi yangi .project
     yuklangandagidek). Oʻsha reja qayta ochilsa — saralash joyida qoladi. */
  if (now !== before && typeof sortReset === "function") sortReset();
  if (typeof writeConf === "function") writeConf();
  planAfterLoad();
  var same = !o.planId || o.planId === now;
  return { ok:true, id:now, same:same,
           msg: same ? "reja fayli ochildi — " + (P.name || "loyiha") + " · reja " + now
                     : "reja ochildi, lekin raqami mos emas: faylda " + o.planId + ", tiklangani " + now };
}
function planAfterLoad(){
  renderPacks(); renderParts(); renderMats(); renderMgr(); renderCat(); stats();
  if (PACKS.length) selectPack(0); else renderStep();
  if (typeof renderThickMix === "function") renderThickMix();
  if (typeof showCellTot === "function") showCellTot();
  if (typeof renderDiag === "function") renderDiag();
  if (typeof renderSort === "function"){ renderSort(); renderPlanBox(); }
  if (typeof autosave === "function") autosave();
}

/* ---- STELYAJ BELGILARI — har stelyajga bitta QR. Boʻsh stelyaj qaytganda
   saralash postida shu belgi skanerlanadi (14-sort.js — sortRackScan). ---- */
function rackLabelsHTML(){
  var html = '<div class="lbls">';
  for (var r = 0; r < rackCount(); r++){
    var L = rackLetter(r);
    html += '<div class="label racklbl"><div><div class="rl-l">' + esc(L) + '</div>' +
      '<div class="rl-t">STELYAJ<small>' + cellCount() + ' yacheyka · boʻsh qaytganda skanerlang</small></div></div>' +
      '<canvas id="rq' + r + '"></canvas></div>';
  }
  return html + '</div>';
}
function printRackLabels(){
  applyPageSize();
  $("sheet").innerHTML = rackLabelsHTML();
  for (var r = 0; r < rackCount(); r++) drawQR($("rq" + r), rackQRText(rackLetter(r)));
  setTimeout(function(){
    window.print();
    setTimeout(function(){ $("sheet").innerHTML = ""; }, 1000);
  }, 60);
}

/* ---- bogʻlash ---- */
(function postInit(){
  var sel = $("mgrPost");
  if (sel) sel.onchange = function(){ postSet(sel.value); };
  var b = $("btnPlanSave");
  if (b) b.onclick = function(){ planFileSave(); };
  postApply(postMode() !== "all");
})();
