/* ============================================================
   3.11 SAQLASH — IndexedDB: seans, yuklangan fayllar
   Sabab: tab yopilsa yoki F5 bosilsa bir kunlik ish yoʻqolmasin.
   MUHIM: PACKS toʻgʻridan-toʻgʻri saqlanmaydi — har item ichida
   .part va .mat havolalari bor, natija ulkan va takroriy boʻlardi.
   Shuning uchun KOMPAKT SNAPSHOT: faqat uid + koordinata saqlanadi,
   qolgan hamma narsa buildItems() bilan qayta hisoblanadi.
   Bu modul 10-ui.js dan OLDIN yuklanadi — yuklanish vaqtida
   faqat 04 va undan oldingi funksiyalarga tayanadi.
   Saqlash uch pogʻonali: IndexedDB → localStorage (faqat seans) → xotira.
   ============================================================ */

/* 3.11.1 STORE — IndexedDB oʻrami. Hamma metod Promise qaytaradi.
   IndexedDB boʻlmasa (private rejim, eski brauzer, file:// cheklovi)
   hech qachon xato tashlamaydi — xotiradagi obyektga oʻtadi. */
var Store = (function(){

  var DB_NAME = "upakofka", DB_VER = 1;
  var SES_KEY = "session";      // kv doʻkonidagi seans kaliti
  var MAX_FILES = 20;           // files doʻkonida saqlanadigan maks yozuv
  var OPEN_MS = 5000;           // baza ochilishini shuncha kutamiz

  var db = null;                                  // ochiq IDBDatabase yoki null
  var mem = { kv:{}, files:[], nextId:1 };        // zaxira: oddiy xotira

  /* v12: bu yerda «juda eski brauzer uchun» oʻz Promise polifili (Mini, ~32 satr)
     turardi. U hech qachon ishga tusha olmasdi: pochkalash yadrosi ES6 generator
     ishlatadi (04-packer.js), 13-app.js esa toʻgʻridan-toʻgʻri Promise.resolve()
     chaqiradi — Promise yoʻq brauzerda sahifa allaqachon yuklanmasdi.
     Minimal brauzer: Chrome/Edge 50+. */
  var Pr = Promise;
  function warn(m, e){
    try { console.warn("Store: " + m + (e ? " — " + (e.message || e) : "")); } catch(x){}
  }
  /* zaxira yoʻl ham hech qachon xato tashlamasin */
  function safe(fn){
    try { return fn(); } catch(e){ warn("zaxira xatosi", e); return null; }
  }

  var api = { available:false, ready:null };

  /* --- 3.11.2 bazani ochish. Har qanday nosozlikda — xotira rejimi --- */
  var IDB = null;
  try {
    IDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null;
  } catch(e){ IDB = null; }                      // baʼzi brauzerlar file:// da shu yerda tashlaydi
  /* Boshlangʻich taxmin: obyektning oʻzi bor boʻlsa "bor" deb turamiz.
     Sabab: 12-upload.js Store.ready ni kutmasdan Store.available ni oʻqiydi —
     aks holda sahifa ochilishida "tarix saqlanmaydi" degan yolgʻon xabar chiqardi.
     Ochilish tugagach aniq qiymat qoʻyiladi. */
  api.available = !!IDB;

  api.ready = new Pr(function(resolve){
    var req = null, done = false;

    /* 12-upload.js «oxirgi fayllar» roʻyxatini Store.available ning BOSHLANGʻICH
       (taxminiy) qiymati bilan chizib boʻlgan. Aniq holat maʼlum boʻlgach roʻyxatni
       qayta chizamiz — aks holda tarix ishlamasa ham boʻsh roʻyxat turaverardi. */
    function recentAgain(){
      setTimeout(function(){
        try { if (typeof renderRecent === "function") renderRecent(); } catch(e){}
      }, 0);
    }
    function finish(ok){
      if (done) return;
      done = true; api.available = !!ok;
      if (!ok){ warn("xotira rejimi (IndexedDB ishlamadi)"); recentAgain(); }
      resolve(!!ok);
    }
    if (!IDB){ finish(false); return; }
    try { req = IDB.open(DB_NAME, DB_VER); }
    catch(e){ warn("open", e); finish(false); return; }

    req.onupgradeneeded = function(ev){
      try {
        var d = ev.target.result;
        if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv", { keyPath:"k" });
        if (!d.objectStoreNames.contains("files")){
          var st = d.createObjectStore("files", { keyPath:"id", autoIncrement:true });
          st.createIndex("ts", "ts", { unique:false });   // eskisini topish uchun
          st.createIndex("nk", "nk", { unique:false });   // nom+hajm — takrorni topish uchun
        }
      } catch(e){ warn("upgrade", e); }
    };
    req.onsuccess = function(){
      try {
        db = req.result;
        db.onversionchange = function(){ try { db.close(); } catch(e){} db = null; api.available = false; };
        db.onclose = function(){ db = null; api.available = false; };
      } catch(e){ db = null; warn("onsuccess", e); }
      /* Kechikib ochilgan boʻlsa ham (timeout ishlab boʻlgan) bazani qabul qilamiz:
         ready allaqachon false bilan hal boʻlgan, lekin metodlar db ga qaraydi —
         demak sekin kompyuterda ham saqlash tiklanadi. */
      if (done){ if (db){ api.available = true; recentAgain(); } return; }
      finish(!!db);
    };
    req.onerror   = function(){ warn("open xatosi", req.error); finish(false); };
    req.onblocked = function(){ finish(false); };
    setTimeout(function(){ finish(false); }, OPEN_MS);
  });

  /* --- 3.11.3 tranzaksiya yordamchisi. job(store, set) — set(v) natijani beradi --- */
  function idbTx(name, mode, job){
    return new Pr(function(resolve, reject){
      if (!db){ reject(new Error("baza yopiq")); return; }
      var t = null, out = null;
      try { t = db.transaction(name, mode); }
      catch(e){ reject(e); return; }
      t.oncomplete = function(){ resolve(out); };
      t.onerror    = function(){ reject(t.error || new Error("tranzaksiya xatosi")); };
      t.onabort    = function(){ reject(t.error || new Error("tranzaksiya bekor qilindi")); };
      try { job(t.objectStore(name), function(v){ out = v; }); }
      catch(e){ try { t.abort(); } catch(e2){} reject(e); }
    });
  }
  /* baza bor boʻlsa IndexedDB, boʻlmasa (yoki xato boʻlsa) — xotira */
  function withDb(name, mode, job, fallback){
    return api.ready.then(function(){
      if (!db) return safe(fallback);
      return idbTx(name, mode, job)["catch"](function(e){
        warn("xotiraga oʻtildi", e);
        return safe(fallback);
      });
    });
  }

  /* --- 3.11.4 files: xotira rejimi uchun yordamchilar --- */
  function memTrim(){
    mem.files.sort(function(a,b){ return (a.ts||0) - (b.ts||0); });   // eskisi boshda
    while (mem.files.length > MAX_FILES) mem.files.shift();
  }
  function memPut(rec){
    for (var i=0;i<mem.files.length;i++){
      if (mem.files[i].nk === rec.nk){ mem.files[i].ts = rec.ts; memTrim(); return mem.files[i].id; }
    }
    rec.id = mem.nextId++;
    mem.files.push(rec); memTrim();
    return rec.id;
  }
  function metaOf(v){
    return { id:v.id, name:v.name, ts:v.ts,
             size:(v.size != null ? v.size : String(v.xml||"").length) };
  }
  function sortMeta(list){
    var a = list || [];
    a.sort(function(x,y){ return (y.ts||0) - (x.ts||0); });     // yangisi birinchi
    return a.slice(0, MAX_FILES);
  }
  /* 20 tadan ortiq boʻlsa eng eskisini oʻchiramiz */
  function idbTrim(st){
    var c = st.count();
    c.onsuccess = function(){
      var extra = c.result - MAX_FILES;
      if (extra <= 0) return;
      var ix = null;
      try { ix = st.index("ts"); } catch(e){ ix = null; }
      var cr = ix ? ix.openCursor() : st.openCursor();          // eskisidan boshlab
      cr.onsuccess = function(){
        var k = cr.result;
        if (!k || extra <= 0) return;
        k["delete"](); extra--;
        k["continue"]();
      };
    };
  }

  /* --- 3.11.5 SEANS ---
     MUHIM: Chromium (Chrome/Edge) file:// sahifada IndexedDB ni BLOKLAYDI, lekin
     localStorage ishlaydi. Tsex kompyuterida tizim aynan file:// dan ochiladi,
     shuning uchun IndexedDB boʻlmagan holatda seans localStorage'ga tushadi —
     F5 dan keyin ham saqlanib qoladi (snapshot ~100 KB, limit 5 MB).
     Alohida kalit ishlatiladi — sozlamalarning "upk_conf" iga TEGILMAYDI. */
  var LS_KEY = "upk_session";
  function lsPut(snap){
    try { localStorage.setItem(LS_KEY, JSON.stringify(snap)); return true; }
    catch(e){ warn("localStorage yozilmadi (joy toʻlgan yoki yopiq)", e); return false; }
  }
  function lsGet(){
    try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; }
    catch(e){ warn("localStorage oʻqilmadi", e); return null; }
  }
  function lsDel(){ try { localStorage.removeItem(LS_KEY); } catch(e){} }

  api.putSession = function(snap){
    mem.kv[SES_KEY] = snap;                       // xotirada ham nusxa (zaxira)
    var viaLs = false;
    return withDb("kv", "readwrite", function(st){
      st.put({ k:SES_KEY, v:snap });
    }, function(){ viaLs = true; lsPut(snap); return null; }).then(function(){
      /* IndexedDB ga yozildi — localStorage'dagi eski seansni olib tashlaymiz.
         Aks holda keyinchalik IndexedDB ishdan chiqsa oʻsha ESKI seans tiklanib,
         operator bir necha kun oldingi terishni davom ettirib yuborardi. */
      if (!viaLs) lsDel();
      return true;
    });
  };
  api.getSession = function(){
    return withDb("kv", "readonly", function(st, set){
      var r = st.get(SES_KEY);
      r.onsuccess = function(){ set(r.result ? r.result.v : null); };
    }, function(){ return lsGet(); }).then(function(v){
      var m = mem.kv[SES_KEY] || null;
      if (!v) return m;
      if (m && (m.ts || 0) > (v.ts || 0)) return m;   // xotiradagisi yangiroq boʻlsa
      return v;
    });
  };
  api.clearSession = function(){
    /* Kutib turgan avtosaqlashni bekor qilamiz. 13-app.js «Seansni tozalash» tugmasi
       global clearSession() ni emas, aynan shu metodni chaqiradi — timer qolib ketsa
       800 ms dan keyin seans qaytadan yozilib, tozalash yolgʻon boʻlib chiqardi. */
    if (typeof AUTOSAVE_T !== "undefined" && AUTOSAVE_T){
      try { clearTimeout(AUTOSAVE_T); } catch(e){}
      AUTOSAVE_T = null;
    }
    delete mem.kv[SES_KEY];
    lsDel();
    return withDb("kv", "readwrite", function(st){
      st["delete"](SES_KEY);
    }, function(){ return null; }).then(function(){ return true; });
  };

  /* --- 3.11.6 FAYLLAR (xom XML) --- */
  api.putFile = function(f){
    var rec = {
      name: String((f && f.name) || "loyiha.project"),
      xml:  String((f && f.xml) || ""),
      ts:   (f && f.ts) || Date.now()
    };
    rec.size = rec.xml.length;
    rec.nk = rec.name + "|" + rec.size;           // bir xil fayl belgisi
    return withDb("files", "readwrite", function(st, set){
      function add(){
        var a = st.add(rec);
        a.onsuccess = function(){ set(a.result); idbTrim(st); };
      }
      var ix = null;
      try { ix = st.index("nk"); } catch(e){ ix = null; }
      if (!ix){ add(); return; }
      var g = ix.get(rec.nk);
      g.onsuccess = function(){
        var old = g.result;
        if (old){ old.ts = rec.ts; st.put(old); set(old.id); idbTrim(st); }  // faqat ts yangilanadi
        else add();
      };
    }, function(){ return memPut(rec); });
  };
  api.listFiles = function(){
    return withDb("files", "readonly", function(st, set){
      var out = []; set(out);
      var ix = null;
      try { ix = st.index("ts"); } catch(e){ ix = null; }
      var cr = ix ? ix.openCursor(null, "prev") : st.openCursor();
      cr.onsuccess = function(){
        var c = cr.result;
        if (!c) return;
        out.push(metaOf(c.value || {}));          // xml ushlab qolinmaydi
        c["continue"]();
      };
    }, function(){
      return mem.files.map(metaOf);
    }).then(sortMeta);
  };
  api.getFile = function(id){
    return withDb("files", "readonly", function(st, set){
      var r = st.get(id);
      r.onsuccess = function(){ set(r.result || null); };
    }, function(){
      for (var i=0;i<mem.files.length;i++) if (mem.files[i].id === id) return mem.files[i];
      return null;
    });
  };
  api.delFile = function(id){
    return withDb("files", "readwrite", function(st){
      st["delete"](id);
    }, function(){
      for (var i=0;i<mem.files.length;i++) if (mem.files[i].id === id){ mem.files.splice(i,1); break; }
      return null;
    }).then(function(){ return true; });
  };

  return api;
})();

/* ============================================================
   3.11.7 SNAPSHOT — pochkalarning kompakt tasviri
   Faqat uid va koordinata. Koordinatalar butun songa yaxlitlanadi.
   ============================================================ */
var SNAP_CONF = ["maxKg","ovh","minBase","maxLen","minBaseT","tries","prefix","byThick",
                 "minFill","lidFill","lidN","lidTol","oneMan","maxLayers","ovhOn"];

function snapPacks(packs){
  return (packs || []).map(function(p){
    /* rev — terish reviziyasi (04-packer v10). QR ichida chiqadi, shuning uchun
       tiklangandan keyin ham aynan oʻsha raqam qolishi shart, aks holda
       eski chek skanerlanganda tizim "eski terish" deb yolgʻon ogohlantiradi. */
    /* gname — pochkalash guruhining nomi (v11). Qayta hisoblanmaydi, chunki u
       S.modGroups holatiga bogʻliq; saqlanmasa birlashgan pochka tiklangandan
       keyin roʻyxatda faqat bitta modul nomi bilan chiqib qolardi. */
    var o = { no:p.no, odd:!!p.odd, t:p.t, done:p.done || 0, rev:p.rev, gname:p.gname };
    if (p.odd){
      o.itemUids = (p.items || []).map(function(it){ return it.uid; });
      return o;
    }
    o.allowOvh = !!p.allowOvh;
    o.off      = Math.round(p.off || 0);
    o.baseUid  = p.base ? p.base.uid : null;
    o.layers   = (p.layers || []).map(function(L){
      return {
        lid:     !!L.lid,
        soft:    !!L.soft,
        weak:    !!L.weak,
        flipped: !!L.flipped,
        its: (L.items || []).map(function(q){
          return { u:q.it.uid, x:Math.round(q.x), y:Math.round(q.y),
                   a:Math.round(q.a), b:Math.round(q.b), r:q.rot ? 1 : 0 };
        })
      };
    });
    return o;
  });
}

/* sof maʼlumot nusxasi — havolasiz */
function snapClone(o, dflt){
  try { return JSON.parse(JSON.stringify(o)); } catch(e){ return dflt; }
}

function makeSnapshot(){
  var conf = {};
  SNAP_CONF.forEach(function(k){ conf[k] = S[k]; });
  return {
    v: 1,
    ts: Date.now(),
    name: P ? P.name : "",
    uuid: P ? P.uuid : "",
    split: snapClone(S.split || {}, {}),   // v12: rejim oʻrniga bitta qoida
    cur: CUR,
    step: STEP,
    conf: conf,
    rooms:  snapClone(S.rooms  || {}, {}),
    sepCls: snapClone(S.sepCls || {}, {}),
    matCat: snapClone(S.matCat || [], []),
    modGroups: snapClone(S.modGroups || [], []),   // v11
    unitNames: snapClone(S.unitNames || {}, {}),   // v12: modul nomlari
    clsGroups: snapClone(S.clsGroups || [], []),
    rackN: S.rackN, cellN: S.cellN,
    /* cellOff (yopiq yacheykalar) ATAYIN bu yerda YOʻQ.
       U ikki joyda — sozlamalarda ham, seansda ham — saqlanardi va ikkalasi
       bir-biriga zid boʻlib qolardi: localStorage da 2 ta yopiq yacheyka
       turgan boʻlsa-da, eskirgan snapshot 48 tasini yopiq qilib tiklardi.
       Yopiq yacheyka — SEXNING holati, buyurtmaning emas: boshqa buyurtma
       yuklansa ham stelyaj oʻsha stelyaj. Shuning uchun u faqat sozlamalarda. */
    /* v11: saralash holati. Bu FIZIK holat — detallar rostdan ham stelyajda
       turibdi. Brauzer yopilib qayta ochilsa ham u yoʻqolmasligi shart, aks
       holda ishchi butun paddonni qaytadan saralashga majbur boʻlardi. */
    sort: (typeof SORT === "object" && SORT)
      ? { cell:snapClone(SORT.cell||{},{}), pack:snapClone(SORT.pack||{},{}),
          put:snapClone(SORT.put||{},{}) }
      : null,
    /* P ning sof nusxasi: name, uuid, materials, parts (+ rev kabi qoʻshimcha
       maydonlar ham oʻz-oʻzidan tushadi — P da faqat oddiy maʼlumot turadi) */
    project: P ? (snapClone(P, null) || { name:P.name, uuid:P.uuid, rev:P.rev || 0,
                   materials: snapClone(P.materials || [], []),
                   parts:     snapClone(P.parts     || [], []) }) : null,
    packs: snapPacks(PACKS)
  };
}

/* ============================================================
   3.11.8 TIKLASH — snapshotdan holatni qaytarish
   uid boʻyicha itemlar qayta yaratiladi (buildItems), qavat
   ogʻirligi/bb/h/fill va pochka kg/env/seq/gabarit qayta hisoblanadi.
   Biror uid topilmasa — hech narsa oʻzgarmaydi, false qaytadi.
   ============================================================ */
function restoreSnapshot(snap){
  function bakState(){
    var b = { conf:{}, P:P, PACKS:PACKS, CUR:CUR, STEP:STEP,
              split:S.split, rooms:S.rooms, sepCls:S.sepCls, matCat:S.matCat,
              modGroups:S.modGroups, clsGroups:S.clsGroups, unitNames:S.unitNames };
    SNAP_CONF.forEach(function(k){ b.conf[k] = S[k]; });
    return b;
  }
  function putState(b){
    SNAP_CONF.forEach(function(k){ S[k] = b.conf[k]; });
    S.split = b.split; S.rooms = b.rooms; S.sepCls = b.sepCls;
    S.matCat = b.matCat;
    S.modGroups = b.modGroups; S.clsGroups = b.clsGroups; S.unitNames = b.unitNames;
    P = b.P; PACKS = b.PACKS; CUR = b.CUR; STEP = b.STEP;
  }

  /* Seans localStorage'da ham turishi mumkin — u yerdagi matnni foydalanuvchi
     tahrirlashi yoki u buzilishi mumkin. Shu sabab har maydon turi tekshiriladi:
     bitta NaN yoki yoʻqolgan qoida butun pochkalash zanjirini zaharlaydi. */
  function isArr(v){ return Object.prototype.toString.call(v) === "[object Array]"; }
  function isObj(v){ return !!v && typeof v === "object" && !isArr(v); }

  var bak = null;
  try {
    if (!snap || typeof snap !== "object" || isArr(snap)) return false;
    if (snap.v && snap.v > 1) return false;                      // kelajakdagi format
    var pr = snap.project;
    if (!isObj(pr) || !isArr(pr.parts) || !pr.parts.length) return false;

    bak = bakState();

    // 1) sozlamalar — itemlar aynan oʻsha uid bilan chiqishi uchun avval qoʻyiladi
    var conf = isObj(snap.conf) ? snap.conf : {};
    SNAP_CONF.forEach(function(k){
      var v = conf[k];
      if (v === undefined || v === null) return;
      if (k === "prefix"){ if (typeof v === "string" && v) S.prefix = v; return; }
      if (k === "byThick" || k === "ovhOn"){ S[k] = !!v; return; }
      var n = +v;
      if (isFinite(n)) S[k] = n;            // "abc" yoki null kelsa eskisi qoladi
    });
    /* v12: eski seansda rejim va ikki qoida turgan boʻlishi mumkin
       («b2c/b2b» yoki «ind/conv») — hammasi bitta qoidaga koʻchiriladi */
    S.split = splitFix(snap.split, snap.mode, snap.rules);
    /* snapshot xotira rejimida jonli obyekt boʻlishi mumkin — nusxa olamiz,
       aks holda S.rooms ni oʻzgartirish saqlangan seansni ham oʻzgartirardi */
    if (isObj(snap.rooms))  S.rooms  = snapClone(snap.rooms, {})  || {};
    if (isObj(snap.sepCls)) S.sepCls = snapClone(snap.sepCls, {}) || {};
    if (isArr(snap.matCat) && snap.matCat.length){
      var mc = snapClone(snap.matCat, null);
      if (isArr(mc) && mc.length) S.matCat = mc;
    }
    // v11: guruhlar ham seans bilan birga tiklanadi, aks holda snapshotdan
    // qaytgan pochkalar bilan menejerdagi belgilar bir-biriga mos kelmasdi
    if (isArr(snap.modGroups)) S.modGroups = snapClone(snap.modGroups, []) || [];
    if (isArr(snap.clsGroups)) S.clsGroups = snapClone(snap.clsGroups, []) || [];
    if (isObj(snap.unitNames)) S.unitNames = snapClone(snap.unitNames, {}) || {};
    /* v12: modul belgisi manbai tanlovi olib tashlandi — birlik har doim proekt
       tuzilishidan olinadi. Eski seans kod prefiksi rejimida saqlangan boʻlsa,
       undagi S.rooms va S.modGroups kalitlari («01», «02») endi mavjud boʻlmagan
       birliklarga ishora qiladi — ular tozalanadi, aks holda hamma birlik
       oʻchirilgandek koʻrinardi va buyurtma boʻsh chiqardi. */
    if (snap.modSrc === "code"){ S.rooms = {}; S.modGroups = []; }
    if (isFinite(+snap.rackN)) S.rackN = Math.max(1, Math.min(60, Math.round(+snap.rackN)));
    if (isFinite(+snap.cellN)) S.cellN = Math.max(1, Math.min(40, Math.round(+snap.cellN)));
    /* snap.cellOff OʻQILMAYDI — yuqoridagi izohga qarang. Eski seanslarda u
       boʻlishi mumkin, lekin unga ishonmaymiz: haqiqat sozlamalarda. */
    if (typeof SORT === "object" && SORT && isObj(snap.sort)){
      SORT.cell = snapClone(snap.sort.cell, {}) || {};
      SORT.pack = snapClone(snap.sort.pack, {}) || {};
      SORT.put  = snapClone(snap.sort.put,  {}) || {};
      SORT.last = null;                 // katta yozuv qayta koʻrsatilmaydi
    }
    // 2) loyiha — snapshot obyektiga tegmaslik uchun yana nusxa olinadi
    P = snapClone(pr, null);
    if (!P){ putState(bak); return false; }
    if (typeof P.name !== "string" || !P.name) P.name = "Loyiha";
    if (typeof P.uuid !== "string") P.uuid = "";
    if (!isArr(P.materials)) P.materials = [];
    if (!isArr(P.parts)) P.parts = [];
    if (typeof P.rev !== "number") P.rev = 0;      // terish reviziyasi saqlanadi

    // 3) itemlar va uid indeksi
    var items = buildItems(), byUid = {}, i, j;
    for (i=0;i<items.length;i++) byUid[items[i].uid] = items[i];

    // 4) pochkalar
    var sp = isArr(snap.packs) ? snap.packs : [], out = [], bad = false;
    for (i=0; i<sp.length && !bad; i++){
      /* Buzilgan yozuvni «boʻsh» deb qabul qilmaymiz: unda detallar jimgina
         yoʻqolib, operator toʻliqsiz pochka yigʻib yuborardi. Shubha boʻlsa —
         butun tiklashdan voz kechamiz (eski holat joyida qoladi). */
      var s = sp[i], p = null, it, sum;
      if (!isObj(s)){ bad = true; break; }

      if (s.odd){
        if (!isArr(s.itemUids)){ bad = true; break; }
        var lst = [], uids = s.itemUids;
        for (j=0;j<uids.length;j++){
          it = byUid[uids[j]];
          if (!it){ bad = true; break; }
          lst.push(it);
        }
        if (bad) break;
        p = { odd:true, items:lst, no:(s.no || i+1),
              kg: lst.reduce(function(a,x){ return a + x.kg; }, 0),
              t: (s.t != null ? s.t : (lst[0] ? lst[0].T : 0)) };
        p.h = lst.reduce(function(a,x){ return a + x.T; }, 0);
        p.seq = packSeq(p);
        p.done = Math.max(0, Math.min(isFinite(+s.done) ? Math.round(+s.done) : 0, p.seq.length));
        p.rev = (s.rev != null) ? s.rev : (P.rev || 1);
        out.push(p);
        continue;
      }

      var base = byUid[s.baseUid];
      if (!base){ bad = true; break; }

      if (!isArr(s.layers)){ bad = true; break; }
      var layers = [], sl = s.layers;
      for (j=0; j<sl.length && !bad; j++){
        var ls = sl[j];
        if (!isObj(ls) || !isArr(ls.its)){ bad = true; break; }   // qavat yoʻqolib ketmasin
        var its = ls.its;
        var lit = [], kg = 0, cov = 0, hh = 0, q, k, qa, qb;
        for (k=0;k<its.length;k++){
          q = isObj(its[k]) ? its[k] : null;
          it = q ? byUid[q.u] : null;
          if (!it){ bad = true; break; }
          /* koordinata soni buzilgan boʻlsa NaN butun geometriyani (bb, gabarit,
             3D chizma, audit chegarasi) zaharlaydi — bunday seans tiklanmasin */
          if (!isFinite(+q.x) || !isFinite(+q.y)){ bad = true; break; }
          /* a,b snapshotdagi yaxlitlangan sondan emas, itemning oʻzidan olinadi
             (rot boʻyicha). Sabab: kasr oʻlchamli detalda (559,5 mm) yaxlitlash
             1 mm ustma-ustlik yasashi va 05-audit ni yolgʻon ishga tushirishi mumkin.
             x,y esa packerda allaqachon butun songa keltirilgan — aynan tushadi. */
          qa = q.r ? it.W : it.L;
          qb = q.r ? it.L : it.W;
          lit.push({ it:it, x:+q.x, y:+q.y, a:qa, b:qb, rot:q.r ? 1 : 0 });
          kg += it.kg; cov += qa * qb;
          if (it.T > hh) hh = it.T;
        }
        if (bad) break;
        var area = base.L * base.W;
        var L = { items:lit, kg:kg, fill:(area ? cov/area : 0), bb:bboxOf(lit),
                  h:hh, flipped:!!ls.flipped, strips:0 };
        if (ls.lid)  L.lid  = true;
        if (ls.soft) L.soft = true;
        if (ls.weak) L.weak = true;
        layers.push(L);
      }
      if (bad) break;

      var off = isFinite(+s.off) ? +s.off : (s.allowOvh ? (+S.ovh || 0) : 0);
      sum = layers.reduce(function(a,L){ return a + L.kg; }, 0);
      p = { base:base, layers:layers, kg:(base.kg + sum),
            envL: base.L + 2*off, envW: base.W + 2*off, off:off,
            allowOvh: !!s.allowOvh, left: [], no:(s.no || i+1),
            t: (s.t != null ? s.t : base.T),
            gname: (typeof s.gname === "string" ? s.gname : null) };   // v11
      p.h = base.T + layers.reduce(function(a,L){ return a + L.h; }, 0);
      var gL = base.L, gW = base.W;
      layers.forEach(function(L){ if (L.bb){ gL = Math.max(gL, L.bb.L); gW = Math.max(gW, L.bb.W); } });
      p.gabL = Math.round(gL); p.gabW = Math.round(gW);
      p.fillAvg = layers.length
        ? layers.reduce(function(a,L){ return a + L.fill; }, 0) / layers.length : 0;
      p.seq = packSeq(p);
      p.done = Math.max(0, Math.min(isFinite(+s.done) ? Math.round(+s.done) : 0, p.seq.length));
      p.rev = (s.rev != null) ? s.rev : (P.rev || 1);
      out.push(p);
    }

    if (bad){ putState(bak); return false; }     // moslik yoʻq — eski holat tegilmaydi

    PACKS = out;
    CUR  = (isFinite(+snap.cur) && +snap.cur >= -1 && +snap.cur < PACKS.length)
             ? Math.round(+snap.cur) : (PACKS.length ? 0 : -1);
    STEP = isFinite(+snap.step) ? Math.max(0, Math.round(+snap.step)) : 0;
    if (!PACKS[CUR]) STEP = 0;
    else if (STEP > PACKS[CUR].seq.length) STEP = PACKS[CUR].seq.length;
    return true;

  } catch(e){
    try { if (bak) putState(bak); } catch(e2){}
    try { console.warn("restoreSnapshot: " + (e && e.message ? e.message : e)); } catch(e3){}
    return false;
  }
}

/* ============================================================
   3.11.9 AVTOSAQLASH — 800 ms debounce bilan
   ============================================================ */
var AUTOSAVE_ON = true;
var AUTOSAVE_MS = 800;
var AUTOSAVE_T = null;

/* Shapkadagi saqlash nuqtasi (#saveState).
   v10: bu element index.html da bor edi, lekin unga HECH BIR kod murojaat qilmasdi —
   nuqta doim kulrang turardi, saqlash xatosi esa faqat konsolga tushardi. Endi u
   haqiqiy holatni koʻrsatadi: sariq = saqlanmoqda, yashil = saqlandi, qizil = saqlanmadi.
   Bu muhim: ishchi seansi saqlanayotganini bilishi kerak. */
function saveDot(state, title){
  var d = document.getElementById("saveState");
  if (!d) return;
  d.className = "savedot" + (state ? " " + state : "");
  d.title = title || "";
}
function autosave(){
  if (!AUTOSAVE_ON || !P) return;
  if (AUTOSAVE_T) clearTimeout(AUTOSAVE_T);
  saveDot("busy", "saqlanmoqda…");
  AUTOSAVE_T = setTimeout(function(){
    AUTOSAVE_T = null;
    if (!AUTOSAVE_ON || !P) return;
    function bad(e){
      var m = (e && e.message ? e.message : e);
      saveDot("err", "saqlanmadi: " + m);
      try { console.warn("autosave: " + m); } catch(x){}
    }
    try {
      var r = Store.putSession(makeSnapshot());
      if (r && typeof r.then === "function"){
        r.then(function(){ saveDot("ok", "seans saqlandi"); }, bad);
      } else {
        saveDot("ok", "seans saqlandi");
      }
    } catch(e){ bad(e); }
  }, AUTOSAVE_MS);
}

/* seansni tozalash — localStorage'dagi "upk_conf" ga TEGILMAYDI */
function clearSession(){
  if (AUTOSAVE_T){ clearTimeout(AUTOSAVE_T); AUTOSAVE_T = null; }
  return Store.clearSession();
}
