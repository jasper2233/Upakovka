/* ============================================================
   3.4 .PROJECT PARSER — XML dan detal, material, kant, hona
   ============================================================ */
var DENS = {3:900, 4:850, 6:850, 8:800, 10:700, 16:700, 18:700, 22:680, 25:680};
/* Material topilmaganda ishlatiladigan zaxira zichlik (16 mm LDSP, kg/m²).
   Ilgari bu son toʻrt joyda qoʻlda yozilgan edi — biri oʻzgarsa qolgani ortda qolardi. */
var KGM2_FALLBACK = 11.2;
function catLookup(name, t){
  var u = (name||"").toUpperCase(), best = null;
  (S.matCat||[]).forEach(function(c){
    if (!c.key) return;
    if (u.indexOf(String(c.key).toUpperCase()) < 0) return;
    var tOk = !c.t || Math.abs(c.t - t) < 0.51;
    if (!tOk) return;
    if (!best || String(c.key).length > String(best.key).length) best = c;   // aniqrogʻi gʻolib
  });
  return best;
}

/* 3.4.0 Yordamchilar.
   MUHIM: qalinlik va oʻlchamlar KASR boʻlishi mumkin (0.6 mm XDF, 3.2 mm HDF, 18.5 mm).
   Ilgari bu yerda parseInt turgan edi — "0.6" -> 0 boʻlib, material massasi 0 kg chiqardi va
   xato butun zanjir boʻylab tarqalardi (guruhlash, qavat balandligi, 35 kg limiti).
   Shu sabab hamma joyda num() ishlatiladi. */
function num(v, dflt){
  if (v === null || v === undefined || v === "") return dflt;
  var x = parseFloat(String(v).replace(",", "."));   // "16,5" koʻrinishi ham uchraydi
  return isFinite(x) ? x : dflt;
}
/* Parser ogohlantirishi — diagnostika boʻlimi yuklangan boʻlsa oʻsha yerga tushadi */
function pwarn(code, msg, n){
  if (typeof diagWarn === "function") diagWarn(code, msg, n);
}
/* Nomdan qalinlikni topishga urinish: "XDF 3 mm", "LDSP-16", "MDF 0,6" */
function thickFromName(nm){
  var m = String(nm || "").match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  if (m) return num(m[1], 0);
  m = String(nm || "").match(/[^\d](\d{1,2}(?:[.,]\d)?)(?:\D|$)/);
  return m ? num(m[1], 0) : 0;
}

function parseProject(xmlText){
  if (!xmlText || !String(xmlText).trim()) throw new Error("Fayl boʻsh");
  var doc = new DOMParser().parseFromString(xmlText, "application/xml");
  var perr = doc.querySelector("parsererror");
  if (perr) throw new Error("XML oʻqilmadi — sintaksis xatosi.\n" +
    String(perr.textContent || "").replace(/\s+/g, " ").slice(0, 220));
  var root = doc.documentElement;
  if (!root) throw new Error("XML boʻsh — ildiz element yoʻq");
  var rootName = String(root.tagName || "").toLowerCase();
  if (rootName !== "project")
    throw new Error("Bu .project fayl emas.\nKutilgan ildiz teg: <project>, topilgani: <" +
      root.tagName + ">");

  var goods = {}, mats = [], parts = [], p2m = {};
  var noId = 0;
  Array.prototype.forEach.call(root.children, function(g){
    if (String(g.tagName).toLowerCase() !== "good") return;
    var id = g.getAttribute("id");
    if (id === null || id === ""){ noId++; return; }
    goods[id] = g;
  });
  if (noId) pwarn("GOOD_ID", "id atributi yoʻq <good> elementlari oʻtkazib yuborildi", noId);

  // detal -> material bogʻlanishi raskroy (CS) operatsiyasidan olinadi
  var csN = 0;
  Array.prototype.forEach.call(root.children, function(o){
    if (String(o.tagName).toLowerCase() !== "operation") return;
    if (o.getAttribute("typeId") !== "CS") return;
    csN++;
    var m = o.querySelector("material"); if (!m) return;
    var mid = m.getAttribute("id");
    Array.prototype.forEach.call(o.querySelectorAll("part"), function(p){ p2m[p.getAttribute("id")] = mid; });
  });
  if (!csN) pwarn("CS_YOQ", "faylda typeId=\"CS\" (raskroy) operatsiyasi topilmadi — " +
    "detal↔material bogʻlanishi noaniq", 1);

  Object.keys(goods).forEach(function(id){
    var g = goods[id];
    if (g.getAttribute("typeId") !== "sheet") return;
    var nm = g.getAttribute("name") || ("Material " + id);
    var traw = g.getAttribute("t");
    var t = num(traw, 0);
    if (!t){                                   // qalinlik yoʻq — nomidan topishga urinamiz
      t = thickFromName(nm);
      if (t) pwarn("QALINLIK_NOMDAN", "«" + nm + "» — t atributi yoʻq, qalinlik nomidan olindi: " + t + " mm", 1);
      else { t = 16; pwarn("QALINLIK_YOQ", "«" + nm + "» — qalinlik aniqlanmadi, 16 mm qabul qilindi", 1); }
    }
    var cat = catLookup(nm, t);
    var dens = DENS[Math.round(t)] || 700;     // zichlik butun mm boʻyicha jadvaldan
    // Bazis eksportida list oʻlchami <good> da emas, ichidagi <part l w> da turadi
    var sp = g.querySelector("part");
    mats.push({ id:id, name:nm,
      l:num(g.getAttribute("l"), sp ? num(sp.getAttribute("l"), 2750) : 2750),
      w:num(g.getAttribute("w"), sp ? num(sp.getAttribute("w"), 1830) : 1830),
      t:t, kgm2: cat ? cat.kgm2 : +(t/1000*dens).toFixed(3),
      cat: cat ? cat.key : null,
      sheets:num(g.getAttribute("count"), 0) });
  });
  if (!mats.length) pwarn("MATERIAL_YOQ", "typeId=\"sheet\" boʻlgan material topilmadi — " +
    "hamma detal standart 16 mm LDSP deb hisoblanadi", 1);

  var noMat = 0, badSize = 0, dupId = 0, seenId = {}, prodG = null, dlN = 0;
  Object.keys(goods).forEach(function(id){
    var g = goods[id];
    if (g.getAttribute("typeId") !== "product") return;
    if (!prodG) prodG = g;                     // nom/uuid zaxirasi shu goodddan olinadi
    Array.prototype.forEach.call(g.querySelectorAll("part"), function(p){
      var e = ["elt","elb","ell","elr"].filter(function(k){ return p.getAttribute(k); })
                .map(function(k){ return k.slice(-1).toUpperCase(); }).join("");
      var pid = p.getAttribute("id");
      if (pid && seenId[pid]) dupId++; else if (pid) seenId[pid] = 1;
      /* Bazis eksporti DETAL oʻlchamini dl/dw da beradi; l/w faqat list oʻlchami uchun.
         Ilgari bu yerda faqat l/w oʻqilardi — haqiqiy .project faylning HAMMA detali
         oʻlchamsiz deb tashlanar va fayl «detal topilmadi» xatosi bilan ochilmasdi. */
      var L = num(p.getAttribute("l"), num(p.getAttribute("dl"), 0)),
          W = num(p.getAttribute("w"), num(p.getAttribute("dw"), 0));
      if (p.getAttribute("l") === null && p.getAttribute("dl") !== null) dlN++;
      var code = p.getAttribute("code") || p.getAttribute("part.code") || "";
      if (!(L > 0) || !(W > 0)){ badSize++; return; }      // oʻlchamsiz detal joylashtirilmaydi
      var mid = p2m[pid];
      if (!mid){ noMat++; mid = (mats[0] && mats[0].id) || null; }
      parts.push({ id:pid, c:code,
        n:p.getAttribute("name")||"", p:g.getAttribute("name")||"", pc:g.getAttribute("code")||id,
        l:L, w:W,
        q:Math.max(1, Math.round(num(p.getAttribute("count"), 1))),
        m:mid, noMat:!p2m[pid],
        e:e, eb:p.getAttribute("eltMat")||p.getAttribute("elbMat")||p.getAttribute("ellMat")||p.getAttribute("elrMat")||"" });
    });
  });
  if (badSize) pwarn("OLCHAM_YOQ", "l yoki w oʻlchami boʻlmagan detallar oʻtkazib yuborildi", badSize);
  if (dupId)   pwarn("ID_TAKROR", "bir xil id li <part> elementlari uchradi — material bogʻlanishi adashishi mumkin", dupId);
  if (noMat)   pwarn("MATERIAL_TOPILMADI", "CS operatsiyasida uchramagan detallar birinchi materialga bogʻlandi — " +
    "massasi va qalinligi notoʻgʻri boʻlishi mumkin", noMat);

  if (!parts.length) throw new Error(
    "Faylda detal topilmadi.\nKutilgan tuzilma: <good typeId=\"product\"> ichida <part l=\"…\" w=\"…\">");

  if (dlN) pwarn("OLCHAM_DL", "detal oʻlchami dl/dw atributlaridan oʻqildi (Bazis eksporti)", dlN);

  /* Bazis eksportida <project> da na name, na project.uuid boʻladi — ikkalasi ham
     mahsulot goodidan olinadi: product.order va good nomi («Komplekt»). */
  var pName = root.getAttribute("name") || "";
  var pUuid = (root.getAttribute("project.uuid") || root.getAttribute("uuid") || "").slice(0,8);
  if (prodG){
    var ord = prodG.getAttribute("product.order") || "";
    if (!pName)
      pName = ((ord ? ord + " " : "") + (prodG.getAttribute("name") || "")).replace(/\s+/g," ").trim();
    if (!pUuid) pUuid = String(ord || prodG.getAttribute("code") || "").slice(0,8);
  }
  if (!pUuid) pwarn("UUID_YOQ", "faylda loyiha identifikatori yoʻq — QR cheklarida " +
    "ikki buyurtma bir-biridan ajralmasligi mumkin", 1);

  return { name: pName || "Loyiha", uuid: pUuid,
           materials:mats, parts:parts, rev:0 };
}

/* 3.4.1 DETAL KLASSI — nomidan aniqlanadi (fasad, bok, polka...) */
var CLS_KEYS = ["FASAD","BOK","DNO","POLKA","POL","TOM","USTUN","TAROQ","QOSH","AKFA",
                "APSHIFKA","TRUBA","ZAGLUSHKA","SOKOL","KARNIZ","PEREGORODKA","ESHIK","TORTMA","YON","TEPA",
                "CHET","ORTA","PLANKA","XDF","HDF","ZADNIY","QOPQOQ"];
/* v11: SINONIMLAR. Ilgari roʻyxatda faqat «SOKOL» bor edi, faylda esa «SOKL» yozilgan —
   classify() kalitni topolmay nomning birinchi soʻzini olardi va BITTA detal turi
   ikki xil klassga boʻlinib ketardi (SOKOL va SOKL). Bu holda «shu klassni alohida
   pochkala» belgisi detallarning yarmiga tegmasdi.
   Kalit — faylda uchraydigan yozuv, qiymat — yagona klass nomi. */
var CLS_ALIAS = {
  "SOKL":"SOKOL", "COKOL":"SOKOL", "TSOKOL":"SOKOL",
  "OʻRTA":"ORTA", "O'RTA":"ORTA", "URTA":"ORTA", "SREDN":"ORTA",
  "FASSAD":"FASAD", "FSAD":"FASAD",
  "PALKA":"PLANKA", "PLANK":"PLANKA",
  "APSHIVKA":"APSHIFKA", "OBSHIVKA":"APSHIFKA",
  "ZADNYA":"ZADNIY", "ZADNAYA":"ZADNIY", "ORQA":"ZADNIY",
  "KRISHKA":"QOPQOQ", "QOPQOQI":"QOPQOQ",
  "BOKOVIN":"BOK", "YONBOSH":"BOK",
  "TEG":"DNO", "TAG":"DNO"
};
function classify(name){
  var u = (name||"").toUpperCase().replace(/Ў/g,"Oʻ");
  /* ASOSIY roʻyxat BIRINCHI tekshiriladi — shunda sinonimlar qoʻshilishi
     ilgari toʻgʻri tanilgan nomlarni buzmaydi. Masalan «TAG» → DNO sinonimi bor,
     lekin «TAGDAGI FASAD» baribir FASAD boʻlib qoladi. Sinonim faqat asosiy
     roʻyxat hech nima topa olmaganda ishga tushadi. */
  for (var i=0;i<CLS_KEYS.length;i++) if (u.indexOf(CLS_KEYS[i]) >= 0) return CLS_KEYS[i];
  for (var a in CLS_ALIAS) if (u.indexOf(a) >= 0) return CLS_ALIAS[a];
  var t = u.replace(/^[0-9_\s]+/,"").split(/\s+/).filter(function(w){ return w.length>2 && !/^[0-9]+$/.test(w); });
  return t.length ? t[0] : "BOSHQA";
}
function classStats(){
  var c = {};
  P.parts.forEach(function(p){
    if (S.rooms && S.rooms[unitOf(p)] === false) return;
    var k = classify(p.n);
    c[k] = (c[k]||0) + p.q;
  });
  return Object.keys(c).sort(function(a,b){ return c[b]-c[a]; }).map(function(k){ return {cls:k, n:c[k]}; });
}

/* ============================================================
   3.5 MASSA HISOBI — mm² → m² → kg (material bazasidan)
   kvadrat mm -> m^2 -> kg
   ============================================================ */
function matOf(id){
  if (!P || !P.materials || !P.materials.length) return null;
  for (var i=0;i<P.materials.length;i++) if (P.materials[i].id===id) return P.materials[i];
  return P.materials[0];
}

function buildItems(){
  var out = [];
  if (!P || !P.parts) return out;
  P.parts.forEach(function(p){
    // v11: birlik belgisi «good» kodidan yoki detal kodining prefiksidan olinadi
    var u = unitOf(p);
    if (S.rooms && S.rooms[u] === false) return;      // oʻchirilgan birlik
    var m = matOf(p.m);
    var L = Math.max(p.l, p.w), W = Math.min(p.l, p.w);
    var area = (L*W)/1e6;                 // mm² -> m²
    var kg = area * (m ? m.kgm2 : KGM2_FALLBACK);  // m² × kg/m² -> kg
    var q = Math.max(1, p.q|0);
    for (var k=0;k<q;k++){
      // v12: part, area, idx, band maydonlari olib tashlandi — ular yozilardi,
      // lekin butun loyihada bir marta ham oʻqilmasdi
      out.push({ uid:p.id+"#"+k, code:p.c, name:p.n, prod:p.p, prodCode:p.pc,
        unit:u, unitName:unitName(p), cls:classify(p.n),
        L:L, W:W, T:m?m.t:16, mat:m, matId:p.m, edges:p.e,
        kg:kg, of:q });
    }
  });
  return out;
}