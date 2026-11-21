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
var POSTS = { all:"Hamma boʻlim", sort:"Saralash posti", pack:"Qadoqlash posti", tv:"TV ekrani" };
var POST_HIDE = { sort:{ work:1 }, pack:{ sort:1 },     // boshqa postning ekrani yashiriladi
                  tv:{ mgr:1, work:1, parts:1, mats:1, diag:1, conf:1 } };   // v22: TV — faqat saralash ekrani

function postMode(){
  /* v23: MES ichida upakofka faqat ofis (docs/mes-kelishuv.md §1) — post tanlovi yoʻq */
  if (typeof MES === "object" && MES && MES.on) return "all";
  var v = null;
  try { v = localStorage.getItem(POST_KEY); } catch(e){}
  if (v == null) v = POST_MEM;
  return POSTS.hasOwnProperty(v) ? v : "all";
}
function postHome(){ var m = postMode(); return (m === "sort" || m === "tv") ? "sort" : "work"; }
/* v22: «ekran klaviaturasi chiqmasin» — Smart TV / planshet: skan maydoniga fokus
   berilmaydi (TV klaviaturasi ekranni yopardi), skaner fokussiz tutiladi. */
function postNoFocus(){
  var v = null;
  try { v = localStorage.getItem("upk_nofocus"); } catch(e){}
  return v === "1" || postMode() === "tv";
}
function postHidden(tab){
  if (typeof MES === "object" && MES && MES.on && tab === "sort") return true;   // v23: saralash — MES posti
  var h = POST_HIDE[postMode()]; return !!(h && h[tab]);
}
function postSet(m){
  if (!POSTS.hasOwnProperty(m)) m = "all";
  POST_MEM = m;
  try { localStorage.setItem(POST_KEY, m); } catch(e){}
  postApply(m !== "all");
  if (typeof srvStart === "function" && typeof SRV === "object" && SRV.on) srvStart();   // TV tezroq soʻraydi
  if (typeof srvBanner === "function") srvBanner();
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
  var nf = $("mgrNoFocus"); if (nf) nf.checked = postNoFocus();
  // v22: koʻrinish — TV da shapka va tablar yoʻq, saralash ekrani katta
  ["all","sort","pack","tv"].forEach(function(k){ document.body.classList.toggle("post-" + k, k === m); });
  if (m === "tv"){
    var rb = $("sortRackBox"); if (rb) rb.style.display = "block";
    var pb = $("sortPlanBox"); if (pb) pb.style.display = "none";
  }
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
           name:P.name || "", order:P.mesOrder || "", proj:projTag(),   // v22: serverdagi roʻyxat uchun
           packs:PACKS.length, snapshot:snap };
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
function looksLikePlan(txt){ return /^\s*\{/.test(String(txt || "").replace(/^\uFEFF/, "")); }

/* Reja faylini ochish (matn yoki serverdan kelgan obyekt). Qaytadi: {ok, msg, id, same}.
   Pochkalar fayldagidek TIKLANADI (qayta hisoblanmaydi) — bu postdagi
   sozlamalar boshqa boʻlsa ham tarkib aynan oʻtadi. */
function planFileLoad(txt){
  var o = null;
  if (txt && typeof txt === "object") o = JSON.parse(JSON.stringify(txt));   // snapshot ga tegmaslik uchun nusxa
  else {
    try { o = JSON.parse(String(txt || "").replace(/^\uFEFF/, "")); }
    catch(e){ return { ok:false, msg:"reja fayli oʻqilmadi — JSON buzilgan" }; }
  }
  if (!o || o.format !== PLAN_FMT || !o.snapshot || typeof o.snapshot !== "object")
    return { ok:false, msg:"bu fayl upakofka reja fayli emas" + (o && o.format ? " (format: " + o.format + ")" : "") };
  if (+o.v > 1) return { ok:false, msg:"reja fayli yangiroq versiyada yozilgan (v" + o.v + ") — upakofkani yangilang" };
  var before = planId(), ok = false;
  try { ok = restoreSnapshot(o.snapshot); } catch(e){ ok = false; }
  if (!ok) return { ok:false, msg:"reja tiklanmadi — fayldagi detallar mos kelmadi (fayl buzilgan yoki boshqa versiya)" };
  /* v22: reja meʼyorlari — faqat shu buyurtma uchun (13-app «ikki manba»);
     kech kelgan seans tiklanishi uning ustidan yozmaydi (A14) */
  if (typeof BOOT_GEN === "number") BOOT_GEN++;
  if (typeof CONF_FROM_SNAP === "boolean") CONF_FROM_SNAP = true;
  // reviziya fayldagi loyihada bor; boʻlmasa — pochkalardagi eng kattasi (09-storage start bilan bir xil)
  var mx = 0;
  PACKS.forEach(function(p){ if ((p.rev || 0) > mx) mx = p.rev || 0; });
  P.rev = Math.max(P.rev || 0, mx) || 1;
  if (typeof PACK_SEEN === "object") PACK_SEEN = {};
  var now = planId();
  /* Boshqa reja — bu postdagi eski saralash yaroqsiz (xuddi yangi .project
     yuklangandagidek). Oʻsha reja qayta ochilsa — saralash joyida qoladi. */
  if (now !== before && typeof sortReset === "function") sortReset(true, true);   // qadoqlashdagi stelyaj — joyida
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

/* v22: manzildagi ?post=tv|sort|pack|all — postni manzil bilan tanlash.
   TV rejimida sozlamalar yashirin, ya'ni rejimdan chiqadigan tugma yo'q:
   «…:8080/?post=all» oddiy rejimga qaytaradi. «…:8080/?post=tv» ni televizor
   brauzerida xatcho'p qilsa — har ochilishda TV ekrani. */
function postFromUrl(search){
  var m = /[?&]post=([a-z]+)/i.exec(String(search || ""));
  var v = m ? m[1].toLowerCase() : "";
  return POSTS.hasOwnProperty(v) ? v : "";
}

/* ---- bogʻlash ---- */
(function postInit(){
  var u = "";
  try { u = postFromUrl(location.search); } catch(e){}
  if (u){ POST_MEM = u; try { localStorage.setItem(POST_KEY, u); } catch(e){} }
  var sel = $("mgrPost");
  if (sel) sel.onchange = function(){ postSet(sel.value); };
  var nf = $("mgrNoFocus");
  if (nf) nf.onchange = function(){
    try { localStorage.setItem("upk_nofocus", nf.checked ? "1" : "0"); } catch(e){}
  };
  var b = $("btnPlanSave");
  if (b) b.onclick = function(){ planFileSave(); };
  postApply(postMode() !== "all");
})();
