/* ============================================================
   3.18 MES REJIMI — upakofka MebeliX MES ichida (`/upakofka/`)
   ============================================================
   Kelishuv: docs/mes-kelishuv.md (2026-11-21). MES ichida upakofka faqat
   OFIS ishini qiladi — texnolog buyurtmani ochadi, pochkalarga teradi, 3D da
   koʻradi, qoʻlda tuzatadi va «Rejani tasdiqlash» bilan MES ga yuboradi.
   Saralash, qadoqlash, TV va chek — MES niki.

     U1. MES rejimi: `GET /api/v1/upakofka/meyorlar` 200 bersa — MES ichidamiz.
         Meʼyorlar va stelyaj sozlamasi MES dan olinadi. MES admin paneli (K10)
         tayyor boʻlguncha texnolog ularni shu yerda oʻzgartirib «MES ga saqlash»
         bilan yozadi (egasining qarori, 2026-11-22). Saralash/qadoqlash/TV postlari, profillar,
         upk-server sinxronlash va oʻz chekimiz yashiriladi.
     U2. `?order=<id>` bilan ochilganda buyurtma raqami (B-2026-…) MES dan
         olinadi va loyihaga yoziladi — reja ID lari toʻliq chiqadi.
     U3. «Rejani tasdiqlash» — reja `PUT /api/v1/upakofka/orders/{id}/reja` ga.

   MES dan tashqarida (file://, GitHub Pages, fleshkadagi nusxa, oʻz server)
   bu modul hech narsani oʻzgartirmaydi: soʻrov 404 / tarmoq xatosi beradi.
   ============================================================ */
var MES = {
  on:false,            // MES ichida ochilgan (meʼyorlar 200 qaytdi)
  done:false,          // aniqlash tugadi (natijasi qanday boʻlsa ham)
  auth:"",             // "" | "kirilmagan" — MES bor, lekin kirish yoʻq
  orderId:"",          // manzildagi ?order=<id>
  orderNo:"",          // MES dagi buyurtma raqami (B-2026-001)
  conf:null,           // MES dan kelgan meʼyorlar (xom)
  pending:false,       // MES-<id>.project yuklanmoqda — boot() raqamni qoʻysin
  last:null,           // oxirgi «Rejani tasdiqlash» javobi
  dirty:false,         // formadagi meʼyor MES dagidan farq qiladi (hali saqlanmagan)
  confMsg:null,        // oxirgi «MES ga saqlash» natijasi
  mock:null,           // testlar: function(method, path, body) -> {status, json}
  ready:null           // Promise — aniqlash tugaganda
};
var MES_API = "/api/v1/";

/* MES meʼyorlaridan S ga oʻtadigan maydonlar. Nomlar ATAYLAB bir xil
   (MES `UpakofkaMeyor` ularni bizning S dan olgan). `tries`, `byThick`,
   `baseLMin` — v22 da doimiy (02-state TRIES_FIXED), shuning uchun yoʻq. */
var MES_CONF_KEYS = ["maxKg","ovh","ovhOn","minBase","maxLen","minBaseT","minFill","lidFill",
  "lidN","lidTol","maxLayers","maxH","oneMan","twoMan","tare","baseWMax","baseCover",
  "lidBal","lidSupp","lidBed","tailGap","tailSpan","tailKgOver","tomQ",
  "oddKg","oddLMax","oddWMax","oddTol","maxPartT","partKgMax","minPartW","minPartL","sepMat",
  "rackN","cellN","bigN","cellW","cellD","cellH","bigW","bigD"];

/* MES API soʻrovi. XHR — 16-server.js dagi srvReq bilan bir xil sabab
   (eski brauzerlar); kirish cookie'si same-origin da oʻzi ketadi. */
/* KIRISH TOKENI 30 daqiqa yashaydi (MES `ACCESS_TOKEN_EXPIRE_MINUTES`). MES ilovasi
   uni oʻzi yangilaydi, bu sahifa esa ofisda uzoq ochiq turadi — «Rejani tasdiqlash»
   401 olardi. Shuning uchun 401 da BIR MARTA `login/refresh` va soʻrov qayta.
   EHTIYOT: MES da yangilash tokeni BIR MARTALIK — takror ishlatilsa hisobning hamma
   seansi bekor qilinadi. Shuning uchun yangilash bir vaqtda faqat bitta (umumiy
   Promise) va faqat 401 dan keyin; ikkinchi 401 — qayta urinish yoʻq. */
var MES_REFRESH = null;
function mesRefresh(){
  if (!MES_REFRESH){
    MES_REFRESH = mesReq1("POST", "login/refresh", null).then(function(r){
      MES_REFRESH = null; return !!r.ok;
    });
  }
  return MES_REFRESH;
}
function mesReq(method, path, body){
  return mesReq1(method, path, body).then(function(r){
    if (r.status !== 401 || path === "login/refresh") return r;
    return mesRefresh().then(function(ok){ return ok ? mesReq1(method, path, body) : r; });
  });
}
function mesReq1(method, path, body){
  if (MES.mock){
    return Promise.resolve().then(function(){ return MES.mock(method, path, body); })
      .then(function(r){ r = r || { status:0 }; r.ok = r.status >= 200 && r.status < 300; return r; },
            function(){ return { ok:false, status:0, json:null }; });
  }
  return new Promise(function(resolve){
    var x;
    try { x = new XMLHttpRequest(); x.open(method, MES_API + path, true); }
    catch(e){ resolve({ ok:false, status:0, json:null }); return; }
    x.timeout = 15000;
    x.setRequestHeader("Accept", "application/json");
    if (body != null) x.setRequestHeader("Content-Type", "application/json");
    x.onload = function(){
      var j = null;
      try { j = JSON.parse(x.responseText); } catch(e){}
      resolve({ ok:x.status >= 200 && x.status < 300, status:x.status, json:j });
    };
    x.onerror = x.ontimeout = x.onabort = function(){ resolve({ ok:false, status:0, json:null }); };
    try { x.send(body != null ? JSON.stringify(body) : null); }
    catch(e){ resolve({ ok:false, status:0, json:null }); }
  });
}
/* MES xato javobidan odam oʻqiydigan matn (FastAPI: {"detail": "..."} yoki roʻyxat) */
function mesErrText(r){
  // 401 — avval: MES matni («Not authenticated») ishchiga nima qilishni aytmaydi
  if (r && r.status === 401) return "MES ga kirilmagan — MES da kirib, sahifani qayta oching";
  var d = r && r.json && r.json.detail;
  if (typeof d === "string") return d;
  if (d && d.length && d[0] && d[0].msg) return d.map(function(x){ return x.msg; }).join("; ");
  if (!r || !r.status) return "MES bilan aloqa yoʻq";
  if (r.status === 403) return "bu amal uchun huquq yoʻq (menejer yoki texnolog kerak)";
  return "MES javobi: HTTP " + r.status;
}
/* ?order=<id> — faqat raqam */
function mesUrlOrder(search){
  var m = /[?&]order=([0-9]+)/.exec(String(search || ""));
  return m ? m[1] : "";
}

/* ---- U1: meʼyorlarni MES dan qoʻllash ----
   MES — tsex meʼyorlarining YAGONA manbasi: forma, S va DEVICE_CONF — hammasi
   MES niki. Seansdan tiklangan rejaning pochkalari oʻzgarmaydi (qayta terilmaydi),
   lekin Sozlamalar ekrani doim MES dagini koʻrsatadi: u yerda «MES ga saqlash»
   bor, seansning eski meʼyori koʻrinib tursa uni MES ga yozib yuborish oson edi. */
function mesConfApply(o){
  if (!o || typeof o !== "object") return false;
  if (typeof CONF_FROM_SNAP === "boolean") CONF_FROM_SNAP = false;
  MES_CONF_KEYS.forEach(function(k){ if (o.hasOwnProperty(k) && o[k] != null) S[k] = o[k]; });
  /* Katalog: MES `{nom, kgm2}` saqlaydi; bizda kalit + qalinlik + list oʻlchami.
     Qalinlik nomning oxirida keladi («LDSP 16» — mesCatOut() shunday yozadi).
     Boʻsh boʻlsa — bizning standart katalog (MES hujjati shunday deydi). */
  if (o.matCat && o.matCat.length){
    S.matCat = o.matCat.map(mesCatIn).filter(function(c){ return c.key; });
  }
  if (o.cellOff && typeof o.cellOff === "object") S.cellOff = JSON.parse(JSON.stringify(o.cellOff));
  S.autoLbl = false;                       // chek — MES niki (qadoq yopilganda)
  writeConf(); readConf();
  if (typeof renderCat === "function") renderCat();
  DEVICE_CONF = confCapture();
  return true;
}
/* Katalog yozuvi: MES → bizniki. «LDSP 16» → kalit LDSP, qalinlik 16 mm. */
function mesCatIn(c){
  var nom = String(c.key || c.nom || "").trim(), t = +c.t || 0;
  var m = !c.key && /^(.*\S)\s+(\d+(?:[.,]\d+)?)\s*(?:mm)?$/i.exec(nom);
  if (m){ nom = m[1]; t = +m[2].replace(",", "."); }
  return { key:nom, t:t, l:+c.l || SHEET_DEFAULT.l, w:+c.w || SHEET_DEFAULT.w,
           kgm2:+c.kgm2 || 0, dens:+c.dens || 0 };
}
/* … va aksincha. MES sxemasi (`UpakofkaMatCat`) faqat nom va kg/m² ni saqlaydi,
   shuning uchun qalinlik nomga qoʻshiladi; zichlik boʻlsa — shu qalinlik uchun
   kg/m² ga aylantiriladi. kg/m² 0 boʻlgan yozuvni MES rad etadi — u tushiriladi. */
function mesCatOut(c){
  var t = +c.t || 0, kg = t ? catKgm2(c, t) : (+c.kgm2 || 0);
  return { nom:(String(c.key || "").trim() + (t ? " " + t : "")).slice(0, 60), kgm2:+(+kg).toFixed(4) };
}

/* ---- 1a (2026-11-22): MEʼYORLARNI UPAKOFKADAN MES GA YOZISH ----
   Egasining qarori: MES admin paneli (K10) tayyor boʻlguncha texnolog meʼyorni
   shu yerda oʻzgartirib MES ga saqlaydi. Avtomatik emas — «MES ga saqlash»
   tugmasi bilan: har yozuv MES audit jurnaliga tushadi, har harfda emas.
   Ruxsat MES da (menejer / texnolog); 403 boʻlsa forma MES qiymatiga qaytadi. */
function mesConfBody(){
  var o = {};
  MES_CONF_KEYS.forEach(function(k){ o[k] = S[k]; });
  o.tries = +S.tries || 4; o.byThick = true; o.baseLMin = 0;
  o.cellOff = JSON.parse(JSON.stringify(S.cellOff || {}));
  o.matCat = (S.matCat || []).map(mesCatOut).filter(function(c){ return c.nom && c.kgm2 > 0 && c.kgm2 <= 200; });
  return o;
}
/* Formadagi meʼyorlar — S ga tegmasdan (13-app confCaptureForm() bilan bir xil usul) */
function mesConfFromForm(){
  var bak = {}, k;
  for (k in S) if (S.hasOwnProperty(k)) bak[k] = S[k];
  var cat = JSON.parse(JSON.stringify(S.matCat || [])), off = JSON.parse(JSON.stringify(S.cellOff || {}));
  try { readConf(); S.matCat = cat; S.cellOff = off; return mesConfBody(); }
  finally {
    for (k in S) if (S.hasOwnProperty(k) && !bak.hasOwnProperty(k)) delete S[k];
    for (k in bak) S[k] = bak[k];
  }
}
/* MES dagi bilan solishtirish — faqat MES saqlaydigan maydonlar */
function mesConfSig(o){
  if (!o) return "";
  var x = {};
  MES_CONF_KEYS.forEach(function(k){ x[k] = o[k]; });
  x.cellOff = Object.keys(o.cellOff || {}).filter(function(c){ return o.cellOff[c]; }).sort();
  x.matCat = (o.matCat || []).map(function(c){ return c.nom + "=" + (+c.kgm2).toFixed(4); });
  return JSON.stringify(x);
}
function mesConfDirtyCheck(){
  if (!MES.on || !MES.conf) return false;
  MES.dirty = mesConfSig(mesConfFromForm()) !== mesConfSig(MES.conf);
  mesConfUi();
  return MES.dirty;
}
function mesConfSave(){
  if (!MES.on) return Promise.resolve(false);
  var body = mesConfFromForm(), b = $("btnMesConfSave");
  if (b) b.disabled = true;
  return mesReq("PUT", "upakofka/meyorlar", body).then(function(r){
    if (b) b.disabled = false;
    if (r.ok && r.json){
      MES.conf = r.json; MES.dirty = false;
      mesConfApply(r.json);
      var d = new Date(), p2 = function(x){ return (x < 10 ? "0" : "") + x; };
      MES.confMsg = { kind:"ok", txt:"MES ga saqlandi ✓ " + p2(d.getHours()) + ":" + p2(d.getMinutes()) +
                      " — hamma kompyuter va post endi shu meʼyorlar bilan ishlaydi." };
      mesConfUi(); flash("ok", "meʼyorlar MES ga saqlandi");
      return true;
    }
    if (r.status === 403){
      /* huquq yoʻq — forma MES dagi qiymatga qaytadi, aks holda ekranda
         saqlanmaydigan raqamlar turib qolardi */
      mesConfApply(MES.conf); MES.dirty = false;
      if (typeof P !== "undefined" && P && !CONF_FROM_SNAP && typeof recompute === "function") recompute();
    }
    MES.confMsg = { kind:"err", txt:"MES ga saqlanmadi: " + mesErrText(r) };
    mesConfUi(); flash("err", MES.confMsg.txt);
    return false;
  });
}
/* Sozlamalar ekranining tepasidagi MES bloki: manba, holat, saqlash tugmasi */
function mesConfUi(){
  var v = $("v-conf"); if (!v || !MES.on) return;
  var n = $("mesConfNote");
  if (!n){
    n = document.createElement("div");
    n.id = "mesConfNote"; n.className = "note";
    v.insertBefore(n, v.firstChild);
    n.addEventListener("click", function(e){ if (e.target && e.target.id === "btnMesConfSave") mesConfSave(); });
  }
  var m = MES.confMsg, kind = MES.dirty ? "warn" : (m ? m.kind : "info");
  n.style.cssText = "margin:0 0 14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-left-color:" +
    (kind === "ok" ? "var(--ok)" : kind === "err" ? "var(--alert)" : kind === "warn" ? "var(--mark)" : "var(--info)");
  n.innerHTML = '<span style="flex:1 1 320px"><b>Meʼyorlar MES da saqlanadi</b> — hamma kompyuter va postda bir xil. ' +
    (MES.dirty ? "<b>Oʻzgarish hali MES ga saqlanmagan.</b>"
               : esc(m ? m.txt : "Oʻzgartirsangiz «MES ga saqlash» ni bosing (menejer yoki texnolog).")) + '</span>' +
    '<button type="button" class="btn' + (MES.dirty ? " pri" : "") + '" id="btnMesConfSave"' +
    (MES.dirty ? "" : " disabled") + '>MES ga saqlash</button>';
}

/* ---- U1: koʻrinish ---- */
function mesModeApply(){
  document.body.classList.toggle("mes-mode", !!MES.on);
  if (!MES.on){                                        // (testlar) — oddiy rejimga qaytish
    var n = $("mesConfNote");
    if (n && n.parentNode) n.parentNode.removeChild(n);
    MES.dirty = false; MES.confMsg = null;
    mesRenderBox();
    if (typeof postApply === "function") postApply(false);
    return;
  }
  // upk-server sinxronlash MES ichida kerak emas: saralash MES posti (kelishuv §3.3)
  if (typeof SRV === "object" && SRV){
    SRV.on = false;
    if (SRV.timer){ clearInterval(SRV.timer); SRV.timer = null; }
    if (typeof srvUi === "function") srvUi();
    if (typeof srvBanner === "function") srvBanner();
  }
  if (typeof postApply === "function") postApply(false);
  mesConfUi();
  mesRenderBox();
}

/* ---- U2: buyurtma raqami loyihaga ---- */
/* boot() dan oldin: MES dan kelgan loyiha bu buyurtmaniki — raqam va id
   loyihaga yoziladi (seans bilan saqlanadi, sahifa qayta ochilsa ham qoladi). */
function mesTagProject(data){
  if (!MES.on || !MES.pending || !data) return;
  MES.pending = false;
  if (MES.orderNo && MES_NO_RE.test(MES.orderNo) && !data.mesOrder) data.mesOrder = MES.orderNo;
  if (MES.orderId) data.mesOrderId = MES.orderId;
}
/* MES dagi buyurtma id si: manzildan yoki loyihadan (oldin shu yerdan ochilgan) */
function mesOrderIdOf(){
  if (MES.orderId) return MES.orderId;
  return (typeof P !== "undefined" && P && P.mesOrderId) ? String(P.mesOrderId) : "";
}

/* ---- U3: rejani tasdiqlash ---- */
function mesPlanSend(){
  var id = mesOrderIdOf();
  if (!MES.on) return Promise.resolve(mesSendNote("err", "MES rejimi emas — rejani faylga saqlang"));
  if (!P || !PACKS.length) return Promise.resolve(mesSendNote("err", "Avval loyiha yuklang va pochkalang"));
  if (!id) return Promise.resolve(mesSendNote("err",
    "Buyurtma nomaʼlum — MES dagi buyurtma sahifasidan «Upakofkada ochish» bilan oching"));
  if (!P.mesOrder && MES.orderNo && MES_NO_RE.test(MES.orderNo)) P.mesOrder = MES.orderNo;
  var plan = mesPlan();
  var btn = $("btnMesSend"); if (btn) btn.disabled = true;
  mesSendNote("info", "MES ga yuborilmoqda…");
  return mesReq("PUT", "upakofka/orders/" + id + "/reja", plan).then(function(r){
    if (btn) btn.disabled = false;
    if (!r.ok){ MES.last = null; return mesSendNote("err", "Reja qabul qilinmadi: " + mesErrText(r)); }
    var x = r.json || {};
    MES.last = { at:Date.now(), plan:planId(), res:x };
    var msg = "Reja MES ga yuborildi — " + (x.order_number || "") + ": " + (x.pochkalar || 0) + " pochka, " +
              (x.bogdandi || 0) + "/" + (x.qadamlar || 0) + " detal bogʻlandi.";
    var warn = [];
    if (x.bogdanmagan && x.bogdanmagan.length) warn.push("MES da topilmadi: " + x.bogdanmagan.join(", "));
    if (x.rejada_yoq) warn.push("rejada yoʻq " + x.rejada_yoq + " detal — MES ularga «rejasiz» qadoq ochadi");
    if (typeof autosave === "function") autosave();
    mesRenderBox();
    return mesSendNote(warn.length ? "warn" : "ok", msg + (warn.length ? " " + warn.join(" · ") : ""));
  });
}
function mesSendNote(kind, txt){
  var n = $("mesSendNote");
  if (n){
    n.style.display = "block";
    n.style.borderLeftColor = kind === "ok" ? "var(--ok)" : kind === "err" ? "var(--alert)" :
                              kind === "warn" ? "var(--mark)" : "var(--info)";
    n.textContent = txt;
  }
  if (kind === "err" || kind === "ok") flash(kind === "ok" ? "ok" : "err", txt);
  return kind !== "err";
}
/* P/M dagi MES bloki: tasdiqlash tugmasi faqat MES rejimida */
function mesRenderBox(){
  var f = $("mesSendField"); if (f) f.style.display = MES.on ? "" : "none";
  var b = $("btnMesSend");
  if (b && MES.on){
    var sent = MES.last && MES.last.plan === (P && PACKS.length ? planId() : "");
    b.textContent = sent ? "Reja MES da ✓ — qayta yuborish" : "Rejani tasdiqlash — MES ga yuborish";
  }
}

/* ---- aniqlash ---- */
function mesDetect(){
  if (!MES.mock && !/^https?:$/.test(location.protocol)){ MES.done = true; return Promise.resolve(false); }
  return mesReq("GET", "upakofka/meyorlar").then(function(r){
    if (r.status === 401 || r.status === 403){
      MES.auth = "kirilmagan";
      flash("err", "MES ga kirilmagan — avval MES da kiring, keyin sahifani qayta oching");
      return false;
    }
    if (!r.ok || !r.json || typeof r.json.maxKg !== "number") return false;
    MES.on = true; MES.conf = r.json;
    try { mesConfApply(r.json); }
    catch(e){ if (window.console) console.warn("MES meʼyorlari:", e); }
    if (!MES.orderId) return true;
    return mesReq("GET", "orders/" + MES.orderId).then(function(o){
      if (o.ok && o.json && typeof o.json.number === "string") MES.orderNo = o.json.number;
      return true;
    });
  }).then(function(on){
    MES.done = true;
    mesModeApply();
    /* seansdan tiklangan shu buyurtma loyihasida raqam boʻlmasa — qoʻyiladi */
    if (on && P && MES.orderNo && !P.mesOrder && P.mesOrderId && String(P.mesOrderId) === MES.orderId){
      P.mesOrder = MES.orderNo;
      if (typeof mesRender === "function") mesRender();
      if (typeof autosave === "function") autosave();
    }
    return on;
  }, function(){ MES.done = true; return false; });
}

/* ---- bogʻlash ---- */
(function mesInit(){
  try { MES.orderId = mesUrlOrder(location.search); } catch(e){}
  /* MES yuklovchisi (MES ning `mes-yuklovchi.js`) `.project` ni olib bizning
     loadXmlText() ga beradi — meʼyorlar va buyurtma raqami kelishidan OLDIN
     boʻlishi mumkin. Shunda loyiha mahalliy meʼyorlar bilan pochkalanib
     ketardi. Shuning uchun ?order= bilan ochilganda yuklash aniqlash
     tugaguncha kutadi. Boshqa holatda loadXmlText() oʻzgarmaydi. */
  var origLoad = window.loadXmlText, origBoot = window.boot;
  if (MES.orderId && typeof origLoad === "function"){
    window.loadXmlText = function(txt, fname){
      var mine = String(fname || "") === "MES-" + MES.orderId + ".project";
      if (MES.done){ if (mine && MES.on) MES.pending = true; return origLoad(txt, fname); }
      MES.ready.then(function(){ if (mine && MES.on) MES.pending = true; origLoad(txt, fname); });
      return null;
    };
  }
  if (typeof origBoot === "function"){
    window.boot = function(data){ mesTagProject(data); return origBoot(data); };
  }
  var b = $("btnMesSend"); if (b) b.onclick = function(){ mesPlanSend(); };
  /* meʼyor oʻzgardi — mahalliy saqlov avvalgidek (modul nomlari va boshqalar ham
     shu yerda), MES rejimida esa «MES ga saqlanmagan» belgisi ham */
  var origSave = window.saveConf;
  if (typeof origSave === "function"){
    window.saveConf = function(){ var r = origSave.apply(this, arguments); if (MES.on) mesConfDirtyCheck(); return r; };
  }
  window.addEventListener("beforeunload", function(e){
    if (MES.on && MES.dirty){ e.preventDefault(); e.returnValue = ""; }
  });
  MES.ready = mesDetect();
})();
