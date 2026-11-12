/* ============================================================
   3.17 SERVER ORQALI POSTLAR (v22, ixtiyoriy)
   ============================================================
   Tizim serverdan ochilsa (server/upk-server.py — http://SERVER:8080/) postlar
   reja va saralash holatini server orqali almashadi. Sabab (tsex, 2026-11-12):
   kompyuterlar tarmoqda, saralash boʻlimiga Smart TV qoʻyiladi — TV da fayl
   ochib boʻlmaydi, uning brauzeri esa istalgan payt qayta yuklanishi mumkin.

     - P/M rejani serverga joylaydi va SARALASHGA YUBORADI (joriy reja);
     - saralash va qadoqlash posti joriy rejaga OʻZI oʻtadi, lekin faqat ish
       tugaganda (stelyajlarda detal yoʻq / yigʻilayotgan pochka yoʻq). Aks holda
       ekranda «yangi reja kutmoqda» va «Hozir oʻtish» tugmasi — yarim ish
       jimgina almashib ketmasin;
     - saralash holati serverda ham turadi (rev bilan; ikkinchi yozuvchi 409 oladi);
     - «TV ekrani» posti saralash ekranini serverdan oʻqib koʻrsatadi — skaner
       boshqa qurilmada boʻlsa ham ishchilar katta ekranda koʻradi.

   Server boʻlmasa (file://, GitHub Pages) modul jim turadi — reja fayli bilan ishlanadi.
   Tarmoq soʻrovlari XMLHttpRequest bilan: eski Smart TV brauzerlarida ham bor.
   ============================================================ */
var SRV = {
  on:false, base:"api/",
  mock:null,            // testlar uchun: function(method, path, body) -> {ok,status,json}
  cur:null, curName:"", // serverdagi joriy (saralanayotgan) reja
  pushT:null, pushing:false, again:false,
  timer:null, opening:false, seenRev:-1,
  manual:false,         // testlar: fon taymeri yoʻq, qadamlar qoʻlda chaqiriladi
  err:"", conflict:false, plans:[]
};
var SRV_TICK_MS = 3000, SRV_TV_MS = 1500;

/* Qurilma belgisi — server holatni kim yozganini koʻrsatadi */
function srvDev(){
  var d = null;
  try { d = localStorage.getItem("upk_dev"); } catch(e){}
  if (!d){
    d = "d" + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem("upk_dev", d); } catch(e){}
  }
  return d;
}

function srvReq(method, path, body){
  if (SRV.mock){
    return Promise.resolve().then(function(){ return SRV.mock(method, path, body); })
      .then(function(r){ return r || { ok:false, status:0, json:null }; },
            function(){ return { ok:false, status:0, json:null }; });
  }
  return new Promise(function(resolve){
    var x;
    try { x = new XMLHttpRequest(); x.open(method, SRV.base + path, true); }
    catch(e){ resolve({ ok:false, status:0, json:null }); return; }
    x.timeout = 8000;
    if (body != null) x.setRequestHeader("Content-Type", "application/json;charset=utf-8");
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

/* Server bormi. http(s) dan ochilmagan boʻlsa (fayldan) — soʻrov ham yuborilmaydi. */
function srvDetect(){
  if (!SRV.mock && !/^https?:$/.test(location.protocol)) return Promise.resolve(false);
  return srvReq("GET", "ping").then(function(r){
    SRV.on = !!(r.ok && r.json && r.json.server === "upk");
    srvUi();
    if (SRV.on) srvStart();
    /* TV kun boʻyi yoniq turadi: u yoqilganda server hali koʻtarilmagan boʻlsa
       (tarmoq xatosi — status 0) har 10 s qayta soʻraladi. 404 — bu hostda API
       yoʻq (GitHub Pages, oddiy fayl serveri): qayta soʻralmaydi. */
    else if (!SRV.mock && r.status === 0) setTimeout(srvDetect, 10000);
    return SRV.on;
  });
}
function srvStart(){
  if (SRV.timer){ clearInterval(SRV.timer); SRV.timer = null; }
  if (SRV.manual) return;
  SRV.timer = setInterval(srvTick, postMode() === "tv" ? SRV_TV_MS : SRV_TICK_MS);
  // saralash posti: serverdagi holat yangiroq boʻlsa — oʻsha (masalan TV brauzeri qayta yuklangan)
  if (postMode() === "sort" && P && PACKS.length) srvSortPull(planId(), false);
  srvTick();
}

/* ---- saralash holati: eksport / import ---- */
function sortLastLite(L){
  if (!L) return null;
  var o = {};
  ["cell","no","code","done","n","ready","away","gone","rack","freed","gname"].forEach(function(k){
    if (L[k] !== undefined) o[k] = L[k];
  });
  if (L.item) o.uid = L.item.uid;
  return o;
}
function sortLastFull(o){
  if (!o || typeof o !== "object") return null;
  var L = {}, k;
  for (k in o) if (o.hasOwnProperty(k)) L[k] = o[k];
  if (o.uid){
    var it = packItems(packByNo(o.no)).filter(function(x){ return x.uid === o.uid; })[0];
    if (!it) return null;
    L.item = it;
  } else if (!o.rack) return null;
  return L;
}
function sortExport(){
  return { cell:SORT.cell, pack:SORT.pack, put:SORT.put, seen:SORT.seen,
           away:SORT.away, gone:SORT.gone, last:sortLastLite(SORT.last) };
}
function sortImport(d){
  function obj(v){ return (v && typeof v === "object") ? JSON.parse(JSON.stringify(v)) : {}; }
  SORT.cell = obj(d.cell); SORT.pack = obj(d.pack); SORT.put = obj(d.put); SORT.seen = obj(d.seen);
  SORT.away = obj(d.away); SORT.gone = obj(d.gone);
  SORT.last = sortLastFull(d.last);
  sortPlan();
}
function srvSortRender(){
  if (typeof renderSort === "function"){ renderSort(); renderPlanBox(); renderRackBox(); }
  if (typeof renderPacks === "function" && PACKS.length) renderPacks();
}

/* Saralash posti har oʻzgarishdan keyin (14-sort.js sortSaved) — 0,4 s jamlab yuboriladi */
function srvSortPush(){
  if (!SRV.on || postMode() !== "sort" || !P || !PACKS.length) return;
  if (SRV.pushT) clearTimeout(SRV.pushT);
  SRV.pushT = setTimeout(srvSortPushNow, 400);
}
function srvSortPushNow(){
  if (SRV.pushT){ clearTimeout(SRV.pushT); SRV.pushT = null; }   // kutib turgan yuborish — shu bilan
  if (SRV.pushing){ SRV.again = true; return Promise.resolve(false); }
  var id = planId();
  if (!id) return Promise.resolve(false);
  SRV.pushing = true;
  // rev faqat SHU rejaniki boʻlsa asos boʻladi — boshqa rejadan qolgan rev yolgʻon ziddiyat berardi
  var base = (SORT.revOf === id) ? (SORT.rev || 0) : 0;
  return srvReq("PUT", "state/" + id + "/sort", { base:base, dev:srvDev(), data:sortExport() })
    .then(function(r){
      SRV.pushing = false;
      var p = Promise.resolve(r.ok);
      if (r.ok && r.json){
        SORT.rev = +r.json.rev || 0; SORT.revOf = id; SRV.err = ""; SRV.conflict = false;
        if (typeof autosave === "function") autosave();
      } else if (r.status === 409){
        /* boshqa qurilma ham shu rejani saralayapti — server haqiqat; ishchi
           oxirgi skanni takrorlaydi (bitta chek ikki marta sanalmaydi — SORT.seen) */
        SRV.conflict = true;
        p = srvSortPull(id, true).then(function(){ return false; });
      } else {
        SRV.err = "server bilan aloqa yoʻq — saralash shu qurilmada saqlanmoqda";
      }
      srvBanner();
      return p.then(function(v){
        if (SRV.again){ SRV.again = false; return srvSortPushNow(); }
        return v;
      });
    });
}
/* Serverdagi holatni olish. force — rev dan qatʼi nazar (reja ochilganda, ziddiyatda). */
function srvSortPull(id, force){
  if (!id) return Promise.resolve(false);
  return srvReq("GET", "state/" + id + "/sort").then(function(r){
    if (!r.ok || !r.json || !r.json.data || typeof r.json.data !== "object") return false;
    if (id !== planId()) return false;                   // shu orada reja almashgan
    var rev = +r.json.rev || 0;
    if (!force && SORT.revOf === id && rev <= (SORT.rev || 0)) return false;
    sortImport(r.json.data);
    SORT.rev = rev; SORT.revOf = id;
    srvSortRender();
    if (typeof autosave === "function") autosave();
    return true;
  });
}

/* ---- joriy rejaga ergashish ---- */
/* Post hozir boʻshmi — yangi rejaga jimgina oʻtsa boʻladimi. */
function srvIdle(){
  var m = postMode();
  if (!P || !PACKS.length) return true;
  if (m === "sort") return !Object.keys(SORT.cell).length;     // stelyajlarda bu rejaning detali yoʻq
  if (m === "pack"){
    var started = 0, open = 0, done = 0;
    PACKS.forEach(function(p){
      var d = p.done || 0;
      if (d > 0) started++;
      if (d > 0 && d < p.seq.length) open++;
      if (d >= p.seq.length) done++;
    });
    return open === 0 && (started === 0 || done === PACKS.length);
  }
  return true;
}
function srvTick(){
  if (!SRV.on) return Promise.resolve(false);
  var m = postMode();
  if (m === "all") return Promise.resolve(false);              // P/M kompyuteri oʻzi boshqaradi
  return srvReq("GET", "current").then(function(r){
    if (!r.ok || !r.json){ SRV.err = "server bilan aloqa yoʻq"; srvBanner(); return false; }
    if (SRV.err === "server bilan aloqa yoʻq") SRV.err = "";
    SRV.cur = r.json.sort || null; SRV.curName = r.json.name || "";
    var mine = planId();
    if (SRV.cur && SRV.cur !== mine && (m === "tv" || srvIdle())){
      srvBanner();
      return srvOpenPlan(SRV.cur, true);
    }
    srvBanner();
    if (m === "tv" && SRV.cur && SRV.cur === mine) return srvTvPull();
    // saralash posti: serverda yangiroq holat (masalan shu TV brauzeri qayta yuklangan) — oʻsha
    if (m === "sort" && mine && !SRV.pushT && !SRV.pushing) return srvSortPull(mine, false);
    return false;
  });
}
/* TV: holat oʻzgargan boʻlsa — ekran yangilanadi (TV hech qachon yozmaydi) */
function srvTvPull(){
  var id = planId();
  return srvReq("GET", "state/" + id + "/sort").then(function(r){
    if (!r.ok || !r.json || id !== planId()) return false;
    var rev = +r.json.rev || 0;
    if (rev === SRV.seenRev) return false;
    SRV.seenRev = rev;
    if (r.json.data && typeof r.json.data === "object") sortImport(r.json.data);
    else sortImport({});
    SORT.rev = rev; SORT.revOf = id;
    srvSortRender();
    return true;
  });
}
/* Serverdagi rejani ochish. auto — ergashish (xabar boshqacha). */
function srvOpenPlan(id, auto){
  if (SRV.opening) return Promise.resolve(false);
  SRV.opening = true;
  return srvReq("GET", "plans/" + id).then(function(r){
    SRV.opening = false;
    if (!r.ok || !r.json){ flash("err", "reja serverdan olinmadi (" + id + ")"); return false; }
    var res = planFileLoad(r.json);
    if (!res.ok){ flash("err", res.msg); return false; }
    SRV.seenRev = -1;
    flash(res.same ? "ok" : "err", (auto ? "serverdagi joriy reja ochildi — " : "") + res.msg);
    if (typeof showTab === "function" && typeof postHome === "function" && postMode() !== "all") showTab(postHome());
    srvBanner();
    var m = postMode();
    if (m === "tv") return srvTvPull().then(function(){ return true; });
    if (m === "sort") return srvSortPull(res.id, true).then(function(){ return true; });
    return true;
  }, function(){ SRV.opening = false; return false; });
}

/* ---- P/M: joylash va roʻyxat ---- */
function srvPublish(){
  var o = planFileObj();
  if (!o){ flash("err", "reja yoʻq — avval loyihani yuklang"); return Promise.resolve(false); }
  return srvReq("PUT", "plans/" + o.planId + "?sort=1", o).then(function(r){
    if (r.ok){
      flash("ok", "reja serverga joylandi va saralashga yuborildi — reja " + o.planId);
      SRV.cur = o.planId; SRV.curName = o.name;
      return srvPlans().then(function(){ return true; });
    }
    flash("err", "serverga joylanmadi: " + ((r.json && r.json.error) || (r.status ? "HTTP " + r.status : "aloqa yoʻq")));
    return false;
  });
}
function srvPlans(){
  return Promise.all([srvReq("GET", "plans"), srvReq("GET", "current")]).then(function(rs){
    SRV.plans = (rs[0].ok && rs[0].json && rs[0].json.plans) || [];
    if (rs[1].ok && rs[1].json){ SRV.cur = rs[1].json.sort || null; SRV.curName = rs[1].json.name || ""; }
    srvUi();
    return SRV.plans;
  });
}
function srvTime(ts){
  if (!ts) return "";
  var d = new Date(ts), p2 = function(n){ return (n < 10 ? "0" : "") + n; };
  return p2(d.getDate()) + "." + p2(d.getMonth() + 1) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes());
}
function srvUi(){
  var box = $("srvBox"); if (!box) return;
  if (!SRV.on){ box.style.display = "none"; box.innerHTML = ""; return; }
  box.style.display = "block";
  var mine = planId();
  var rows = SRV.plans.slice(0, 8).map(function(m){
    var cur = m.id === SRV.cur;
    return '<div class="srvrow' + (cur ? " cur" : "") + '">' +
      '<b class="planid">' + esc(m.id) + '</b>' +
      '<span>' + esc(m.name || "—") + (m.order ? ' · ' + esc(m.order) : '') +
        (m.packs != null ? ' · ' + m.packs + ' pochka' : '') + ' · ' + srvTime(m.ts) + '</span>' +
      (cur ? '<em>saralanmoqda</em>' : '') +
      (m.id === mine ? '<i>ochiq</i>' : '<button type="button" class="btn gh" data-srvopen="' + esc(m.id) + '">Ochish</button>') +
      '</div>';
  }).join("");
  box.innerHTML =
    '<div class="srvhead"><b>Server: ulangan</b> — reja va saralash holati postlar orasida server orqali almashadi.' +
    '<span class="grow"></span><button type="button" class="btn pri" id="btnSrvPub">Serverga joylash — saralashga yuborish</button></div>' +
    (rows ? '<div class="srvlist">' + rows + '</div>' : '<div class="srvempty">Serverda hali reja yoʻq.</div>');
  var pb = $("btnSrvPub");
  if (pb) pb.onclick = function(){ srvPublish(); };
  [].slice.call(box.querySelectorAll("[data-srvopen]")).forEach(function(b){
    b.onclick = function(){ srvOpenPlan(b.dataset.srvopen, false); };
  });
}

/* Postdagi ogohlantirish: yangi reja kutmoqda / aloqa yoʻq / ziddiyat */
function srvBanner(){
  var el = $("srvBanner"); if (!el) return;
  var m = postMode(), msg = "", kind = "", btn = false;
  if (SRV.on && m !== "all"){
    if (SRV.err) { msg = SRV.err; kind = "err"; }
    else if (SRV.conflict) { msg = "Boshqa qurilma ham shu rejani saralayapti — holat serverdan olindi. Oxirgi detalni qayta skanerlang."; kind = "err"; }
    else if (m !== "tv" && SRV.cur && P && SRV.cur !== planId()){
      msg = "Serverda yangi reja: " + (SRV.curName || "—") + " (reja " + SRV.cur + "). " +
            (m === "sort" ? "Stelyajlar boʻshagach oʻzi oʻtadi." : "Ochiq pochka tugagach oʻzi oʻtadi.");
      kind = "warn"; btn = true;
    }
  }
  if (!msg){ el.style.display = "none"; el.innerHTML = ""; return; }
  el.className = "srvbanner " + kind;
  el.style.display = "flex";
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (btn ? '<button type="button" class="btn" id="btnSrvGo">Hozir oʻtish</button>' : '');
  var gb = $("btnSrvGo");
  if (gb) gb.onclick = function(){ if (SRV.cur) srvOpenPlan(SRV.cur, false); };
}

/* ishga tushish — sahifa yuklangach (13-app.js seansni tiklashga ulgursin) */
setTimeout(function(){ srvDetect(); }, 300);
