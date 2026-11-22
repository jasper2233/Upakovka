/* ============================================================
   3.18 MES REJIMI — upakofka MebeliX MES ichida (`/upakofka/`)
   ============================================================
   Kelishuv: docs/mes-kelishuv.md (2026-11-21). MES ichida upakofka faqat
   OFIS ishini qiladi — texnolog buyurtmani ochadi, pochkalarga teradi, 3D da
   koʻradi, qoʻlda tuzatadi va «Rejani tasdiqlash» bilan MES ga yuboradi.
   Saralash, qadoqlash, TV va chek — MES niki.

     U1. MES rejimi: `GET /api/v1/upakofka/meyorlar` 200 bersa — MES ichidamiz.
         Meʼyorlar va stelyaj sozlamasi MES dan olinadi va bu yerda TAHRIRLANMAYDI
         (MES admin panelida). Saralash/qadoqlash/TV postlari, profillar,
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
   MES — tsex meʼyorlarining yagona manbasi: ular DEVICE_CONF (yangi buyurtma
   shular bilan pochkalanadi) boʻladi. Seansdan tiklangan reja oʻz meʼyorlari
   bilan qoladi (13-app boot() izohi): uning pochkalari shular bilan
   hisoblangan, keyingi yangi loyiha esa MES niki bilan. */
function mesConfApply(o){
  if (!o || typeof o !== "object") return false;
  var keep = (typeof P !== "undefined" && P && CONF_FROM_SNAP) ? confCapture() : null;
  MES_CONF_KEYS.forEach(function(k){ if (o.hasOwnProperty(k) && o[k] != null) S[k] = o[k]; });
  /* Katalog: MES `{nom, kgm2}` saqlaydi; bizda kalit + qalinlik + list oʻlchami.
     Boʻsh boʻlsa — bizning standart katalog (MES hujjati shunday deydi). */
  if (o.matCat && o.matCat.length){
    S.matCat = o.matCat.map(function(c){
      return { key:String(c.key || c.nom || "").trim(), t:+c.t || 0,
               l:+c.l || SHEET_DEFAULT.l, w:+c.w || SHEET_DEFAULT.w,
               kgm2:+c.kgm2 || 0, dens:+c.dens || 0 };
    }).filter(function(c){ return c.key; });
  }
  if (o.cellOff && typeof o.cellOff === "object") S.cellOff = JSON.parse(JSON.stringify(o.cellOff));
  S.autoLbl = false;                       // chek — MES niki (qadoq yopilganda)
  writeConf(); readConf();
  if (typeof renderCat === "function") renderCat();
  DEVICE_CONF = confCapture();
  if (keep){ confApply(keep); writeConf(); }
  return true;
}

/* ---- U1: koʻrinish ---- */
function mesModeApply(){
  document.body.classList.toggle("mes-mode", !!MES.on);
  if (!MES.on){                                        // (testlar) — oddiy rejimga qaytish
    var v = $("v-conf"), n = $("mesConfNote");
    if (n && n.parentNode) n.parentNode.removeChild(n);
    if (v) [].slice.call(v.children).forEach(function(c){ c.removeAttribute("inert"); c.classList.remove("mes-ro"); });
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
  mesConfLock();
  mesRenderBox();
}
/* Sozlamalar ekrani — faqat koʻrish. `inert`: na sichqoncha, na klaviatura. */
function mesConfLock(){
  var v = $("v-conf"); if (!v) return;
  var n = $("mesConfNote");
  if (!n){
    n = document.createElement("div");
    n.id = "mesConfNote"; n.className = "note";
    n.style.cssText = "margin:0 0 14px;border-left-color:var(--info)";
    v.insertBefore(n, v.firstChild);
  }
  n.innerHTML = "<b>Meʼyorlar MES dan olingan.</b> Ular MES admin panelida oʻzgartiriladi — " +
                "bu yerda faqat koʻrish uchun. Hamma kompyuter va postda bir xil.";
  [].slice.call(v.children).forEach(function(c){
    if (c !== n){ c.setAttribute("inert", ""); c.classList.add("mes-ro"); }
  });
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
  MES.ready = mesDetect();
})();
