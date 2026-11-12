/* ============================================================
   3.4 .PROJECT PARSER — XML dan detal, material, kant, hona
   ============================================================ */
var DENS = {3:900, 4:850, 6:850, 8:800, 10:700, 16:700, 18:700, 22:680, 25:680};
/* v22: YOGʻOCH EMAS MATERIALLAR — nomidan zichlik (kg/m³).
   Katalogda yoʻq material ilgari DENS jadvali yoki 700 kg/m³ (LDSP) bilan
   hisoblanardi. 205 ta real faylda bu ikki tomonga adashtirdi: 4 mm oyna
   (haqiqatda ~2500 kg/m³) 3 marta yengil, 30 mm «MATO» paneli esa LDSP deb
   90,7 kg chiqdi. Bu yerda faqat FIZIK doimiylar turadi — mato, akril kabi
   tarkibi har xil materialni tsex katalogga oʻzi qoʻshadi. */
var NAME_DENS = [
  { re:/OYNA|KOZGU|KO.ZGU|ZERKAL|STEKL|GLASS|SHISHA/i, d:2500 },   // shisha, koʻzgu
  { re:/KAFEL|PLITKA|KERAMI/i,                         d:2000 }    // keramik plitka
];
function nameDens(nm){
  for (var i = 0; i < NAME_DENS.length; i++) if (NAME_DENS[i].re.test(nm || "")) return NAME_DENS[i].d;
  return 0;
}
/* Material topilmaganda ishlatiladigan zaxira zichlik (16 mm LDSP, kg/m²).
   Ilgari bu son toʻrt joyda qoʻlda yozilgan edi — biri oʻzgarsa qolgani ortda qolardi. */
var KGM2_FALLBACK = 11.2;
/* v21: STANDART LIST — 16 mm LDSP. Ikki joyda kerak: faylda list oʻlchami
   boʻlmaganda zaxira qiymat va «+ Material / + Tur qoʻshish» tugmalarining
   boshlangʻich qiymati. Ilgari oʻsha toʻrt son uch faylda qoʻlda
   takrorlanardi — yuqoridagi izoh vaʼda qilgan markazlashtirish chala edi. */
var SHEET_DEFAULT = { l:2750, w:1830, t:16, kgm2:KGM2_FALLBACK };
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

/* 3.4.0.1 v22: MES DETAL ID SI (MebeliX MES bilan moslik).
   MES har jismoniy detalga chek chiqaradi, QR ichida bitta satr turadi:
       {buyurtma}_{mahsulotKodi}_{detalKodi}[-N][_n]      B-2026-047_100701_03_002_1
   Qadoqlash posti AYNAN shu chekni skanerlaydi, shuning uchun bu tizim ham
   oʻsha satrni tanishi shart. Qoidalar MES parseridan
   (`backend/app/services/giblab/parser.py`, `models.py`) aynan koʻchirilgan:
     - mahsulot kodi: good `code`, boʻlmasa `name`, u ham boʻlmasa «PRODUCT»
       (bizning `pc` dan farqli — u good id ga qaytadi, modul mantigʻi unga tayanadi);
     - detal kodi: `code`, boʻlmasa `part.code`, boʻlmasa mahsulot ichidagi
       tartib raqami (001, 002 …);
     - bitta mahsulot KODI ichida kod takrorlansa ikkinchisi `-2`, uchinchisi `-3`;
     - `_n` — nusxa raqami, FAQAT detal 1 dan koʻp nusxada boʻlsa (`buildItems`).
   Buyurtma prefiksi (`B-2026-047_`) faylda yoʻq — u MES da beriladi, shuning
   uchun skanerda olib tashlanadi (`mesStrip`). */
var MES_ORDER_RE = /^B-\d{4}-\d+_/;
function mesProdCode(g){
  return g.getAttribute("code") || g.getAttribute("name") || "PRODUCT";
}
function mesPartKey(p, prodCode, idx, seen){
  var c = p.getAttribute("code") || p.getAttribute("part.code") || "";
  if (!c){ c = String(idx + 1); while (c.length < 3) c = "0" + c; }
  if (seen[c]){
    var n = 2;
    while (seen[c + "-" + n]) n++;
    c = c + "-" + n;
  }
  seen[c] = 1;
  return prodCode + "_" + c;
}
var MES_NO_RE = /^B-\d{4}-\d+$/;                 // buyurtma raqamining oʻzi: B-2026-047
function mesStrip(v){ return String(v || "").trim().replace(MES_ORDER_RE, ""); }
/* Skanerlangan satrdagi buyurtma raqami (prefiks boʻlmasa ""). */
function mesOrderOf(v){
  var m = String(v || "").trim().match(MES_ORDER_RE);
  return m ? m[0].slice(0, -1) : "";
}
/* Chekdagi TOʻLIQ satr — buyurtma raqami kiritilgan boʻlsa u bilan. */
function mesFull(it){
  if (!it || !it.mes) return "";
  return (P && P.mesOrder ? P.mesOrder + "_" : "") + it.mes;
}
/* Skanerlangan matn shu detalgami? Bir xil detalning nusxalari (`_1`, `_2`)
   oʻzaro almashinadi — qadoqlash ekranidagi eski qoida bilan bir xil.
   Buyurtma raqami kiritilgan boʻlsa boshqa buyurtma cheki MOS KELMAYDI:
   mahsulot kodi (100701) buyurtmalararo takrorlanishi mumkin. */
function mesMatch(v, it){
  if (!it || !it.mesKey) return false;
  var o = mesOrderOf(v);
  if (o && P && P.mesOrder && o !== P.mesOrder) return false;
  var k = mesStrip(v);
  if (k === it.mes) return true;
  if (it.of > 1 && k.indexOf(it.mesKey + "_") === 0)
    return /^\d+$/.test(k.slice(it.mesKey.length + 1));
  return false;
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
  var estN = [];                               // v22: katalogga tushmagan materiallar
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
    var dens = nameDens(nm) || DENS[Math.round(t)] || 700;   // v22: avval nomdan (shisha, kafel)
    if (!cat) estN.push(nm + " " + t + " mm");            // v22: katalogsiz — massa taxminiy
    // Bazis eksportida list oʻlchami <good> da emas, ichidagi <part l w> da turadi
    var sp = g.querySelector("part");
    mats.push({ id:id, name:nm,
      l:num(g.getAttribute("l"), sp ? num(sp.getAttribute("l"), SHEET_DEFAULT.l) : SHEET_DEFAULT.l),
      w:num(g.getAttribute("w"), sp ? num(sp.getAttribute("w"), SHEET_DEFAULT.w) : SHEET_DEFAULT.w),
      t:t, kgm2: cat ? cat.kgm2 : +(t/1000*dens).toFixed(3),
      cat: cat ? cat.key : null,
      sheets:num(g.getAttribute("count"), 0) });
  });
  /* v22: katalogsiz material jim qolmasin — uning massasi taxmin (zichlik nomdan
     yoki qalinlikdan), pochka chegaralari esa shu massaga tayanadi. */
  if (estN.length) pwarn("MATERIAL_TAXMINIY", "katalogda yoʻq — massasi taxminiy: " +
    estN.slice(0, 4).join(", ") + (estN.length > 4 ? " …" : "") +
    ". Toʻgʻri massa uchun Sozlamalar → Material katalogi ga qoʻshing", estN.length);
  if (!mats.length) pwarn("MATERIAL_YOQ", "typeId=\"sheet\" boʻlgan material topilmadi — " +
    "hamma detal standart 16 mm LDSP deb hisoblanadi", 1);

  var noMat = 0, badSize = 0, dupId = 0, seenId = {}, prodG = null, dlN = 0;
  var multiG = [], zeroN = 0, minusN = 0;     // v22: mahsulot soni, soni 0, «minus miqdor»
  var mesSeen = {};                            // v22: MES kalit toʻqnashuvi — mahsulot KODI boʻyicha
  Object.keys(goods).forEach(function(id){
    var g = goods[id];
    if (g.getAttribute("typeId") !== "product") return;
    if (!prodG) prodG = g;                     // nom/uuid zaxirasi shu goodddan olinadi
    var mesProd = mesProdCode(g), mesN = 0;
    /* v22: MAHSULOT SONI. <good typeId="product" count="N"> — shu mahsulotdan
       N dona; <part count> esa BITTA mahsulotdagi soni. Buyurtmadagi jami =
       ikkalasining koʻpaytmasi (MES ham shunday: giblab/parser.py,
       count = part × max(product, 1)). Ilgari mahsulot soni umuman oʻqilmasdi:
       7 ta parta buyurtmasida 1 ta parta pochkalanardi — 205 ta real faylning
       8 tasida detal kam chiqardi. Parmalash (XNC) operatsiyasi soni buni
       tasdiqlaydi: u ham detal × mahsulot. Butun songa MES dagidek pastga
       yaxlitlanadi (int(float)). 0 yoki yoʻq — 1 deb olinadi (MES: max(…, 1)). */
    var gCnt = Math.max(1, Math.floor(num(g.getAttribute("count"), 1)) || 1);
    if (gCnt > 1) multiG.push((g.getAttribute("name") || g.getAttribute("code") || id) + " ×" + gCnt);
    Array.prototype.forEach.call(g.querySelectorAll("part"), function(p){
      /* v22: MES dagi detal kaliti — oʻlchamsiz detal ham sanaladi, chunki MES
         ham uni oʻtkazib yubormaydi: aks holda keyingi kodsiz detalning tartib
         raqami surilib, ID mos kelmay qolardi. */
      var mk = mesPartKey(p, mesProd, mesN++, mesSeen[mesProd] || (mesSeen[mesProd] = {}));
      if (Math.floor(num(p.getAttribute("count"), 1)) <= 0) zeroN++;            // v22
      if (num(p.getAttribute("minusCount"), 0) > 0) minusN++;                    // v22: MES dagidek
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
      parts.push({ id:pid, c:code, mk:mk,
        n:p.getAttribute("name")||"", p:g.getAttribute("name")||"", pc:g.getAttribute("code")||id,
        l:L, w:W,
        /* v22: soni 0 boʻlgan detal ishlab chiqarilmaydi (MES unga nusxa
           yaratmaydi) — q = 0 boʻlib qoladi va buildItems uni chetlab oʻtadi.
           Ilgari Math.max(1, …) uni 1 dona qilib pochkaga qoʻshardi. */
        q:Math.max(0, Math.floor(num(p.getAttribute("count"), 1))) * gCnt,
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

  if (multiG.length) pwarn("MAHSULOT_SONI", "mahsulot bir necha nusxada — detal soni koʻpaytirildi: " +
    multiG.slice(0, 4).join(", ") + (multiG.length > 4 ? " …" : ""), multiG.length);
  if (zeroN) pwarn("SONI_NOL", "soni 0 boʻlgan detallar ishlab chiqarilmaydi — pochkalanmaydi " +
    "(Diagnostika → Pochkalanmagan obyektlar)", zeroN);
  if (minusN) pwarn("MINUS_MIQDOR", "detalda «minus miqdor» bor (allaqachon tayyor nusxalar) — " +
    "tizim toʻliq miqdorni pochkalaydi, texnolog miqdorni tekshirsin", minusN);
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

/* v17: POCHKALANMAYDIGAN OBYEKTLAR.
   Haqiqiy proyekt fayllarida mebel detallari bilan bir qatorda XONA
   obyektlari ham keladi — devor, pol, shift. Ular ham `part` boʻlib yoziladi
   va oʻz materialiga ega («Devor», 350 mm, 245 kg/m²). Tizim ularni sodda
   pochkalab 2,4 tonnalik «pochka» yasab qoʻyardi.

   Chegara QALINLIK boʻyicha, oʻlcham boʻyicha EMAS. Sabab tajribadan:
     - «listga sigʻmaydi» qoidasi ishlamaydi — faylda koʻpincha QOLDIQ list
       oʻlchami yoziladi (960×1830), haqiqiy 2428 mm li bok esa toʻgʻri detal;
     - yumshoq mebel qoplamasi («MATO», 50 mm) haqiqiy mahsulot va oʻtishi kerak.
   Chegara 205 ta haqiqiy faylda oʻlchandi: 30 mm dan qalin materiallar ikki
   guruhga aniq boʻlinadi — HAQIQIY 32…50 mm (stolishnitsa 40, MATO 50) va
   SOXTA 100…350 mm (Devor, Pol). Oraligʻi boʻsh, shuning uchun 60 mm.

   Chiqarib tashlangani YOʻQOLMAYDI: roʻyxati DIAG.skipped ga yoziladi va
   Diagnostikada koʻrinadi. */
function partSkipWhy(m){
  var t = m ? +m.t : 16;
  var lim = +S.maxPartT || 0;
  if (lim && t > lim)
    return t + " mm qalinlik — " + lim + " mm dan qalin (" +
           ((m && m.name) ? m.name : "material") + ")";
  return null;
}
/* v22: MOʻRT DETAL — material yoki detal nomida tsex belgilagan kalit soʻz bormi
   (S.sepMat). Topilgan soʻzni qaytaradi. Tutuq belgilari (ʻ ' ` ’) olib
   tashlanadi: «koʻzgu», «ko'zgu» va «kozgu» bir xil. Mo'rt detal pochkalanadi,
   lekin har biri ALOHIDA pochkada (04-packer `packAllGen`) va chekida
   «EHTIYOT BOʻLING» turadi. */
function sepNorm(x){ return String(x || "").toUpperCase().replace(/[ʻʼ'`‘’]/g, ""); }
function sepMatHit(nm){
  if (!nm || !S.sepMat) return "";
  var u = sepNorm(nm), ks = String(S.sepMat).split(",");
  for (var i = 0; i < ks.length; i++){
    var k = sepNorm(ks[i]).trim();
    if (k && u.indexOf(k) >= 0) return k;
  }
  return "";
}

function buildItems(){
  var out = [];
  if (!P || !P.parts) return out;
  var skipped = [], heavy = [];
  /* v21: UID TOʻQNASHUVIGA QARSHI.
     `uid` = part.id + "#" + nusxa raqami. Faylda bir xil `id` li ikkita <part>
     uchrasa (parser buni ID_TAKROR deb ogohlantiradi, lekin faylni rad etmaydi)
     ikkala pozitsiya AYNAN bir xil uid beradi. Oqibati ogʻir: audit ularni
     «bitta detal ikki marta joylashgan» deb TAKROR xatosi bilan koʻrsatadi,
     saralash posti esa ikkinchi nusxani birinchisining yacheykasiga bogʻlaydi —
     va bu holatdan chiqib boʻlmaydi.
     Yechim: takror uchraganda pozitsiya indeksi qoʻshiladi. Tartib qatʼiy
     (P.parts tartibi oʻzgarmaydi), demak uid barqaror — seansni tiklash
     buzilmaydi. Takror boʻlmagan holatda uid eskicha qoladi. */
  var uidSeen = {};
  /* v22: MES kaliti. XML dan oʻqilgan loyihada u parserda (`mk`) tayyor.
     SEED va eski seansda esa yoʻq — oʻsha qoida bilan shu yerda hisoblanadi
     (mahsulot kodi sifatida `pc`, kodsiz detalga mahsulot ichidagi tartib
     raqami, takror kodga `-N`). P ga yozilmaydi: buildItems sof qoladi. */
  var mkOf = [], mkSeen = {}, mkIdx = {};
  P.parts.forEach(function(p, pi){
    if (p.mk){ mkOf[pi] = p.mk; return; }
    var pc = String(p.pc || "PRODUCT"), seen = mkSeen[pc] || (mkSeen[pc] = {});
    var i = mkIdx[pc] = (mkIdx[pc] || 0) + 1, c = p.c || "";
    if (!c){ c = String(i); while (c.length < 3) c = "0" + c; }
    if (seen[c]){ var n = 2; while (seen[c + "-" + n]) n++; c = c + "-" + n; }
    seen[c] = 1;
    mkOf[pi] = pc + "_" + c;
  });
  P.parts.forEach(function(p, pi){
    /* uid asosi HAR pozitsiya uchun hisoblanadi — chiqarib tashlanganlar uchun
       ham. Aks holda «modul oʻchirildi» kabi sozlama uid larni surib yuborardi. */
    var idKey = String(p.id);
    var base = uidSeen[idKey] ? (idKey + "@" + pi) : idKey;
    uidSeen[idKey] = 1;
    // v11: birlik belgisi «good» kodidan yoki detal kodining prefiksidan olinadi
    var u = unitOf(p);
    if (S.rooms && S.rooms[u] === false) return;      // oʻchirilgan birlik
    var q = p.q|0;
    /* v22: soni 0 — ishlab chiqarilmaydi. Ilgari Math.max(1, …) uni 1 dona
       qilardi: 205 faylning 11 tasida 32 ta «xayoliy» detal pochkalanardi
       (chek chiqar, buyurtma esa hech qachon toʻliq yigʻilmasdi). */
    if (q <= 0){ skipped.push({ code:p.c, name:p.n, q:0, why:"soni 0 — ishlab chiqarilmaydi" }); return; }
    var m = matOf(p.m);
    var why = partSkipWhy(m);
    if (why){ skipped.push({ code:p.c, name:p.n, q:q, why:why }); return; }
    var L = Math.max(p.l, p.w), W = Math.min(p.l, p.w);
    var area = (L*W)/1e6;                 // mm² -> m²
    var kg = area * (m ? m.kgm2 : KGM2_FALLBACK);  // m² × kg/m² -> kg
    /* v22: tsex chegarasidan ogʻir BITTA detal — deyarli har doim massa xatosi
       (katalogsiz material, notoʻgʻri qalinlik). Pochkalanadi, lekin aytiladi. */
    if (S.partKgMax && kg > S.partKgMax + 1e-9)
      heavy.push({ code:p.c, name:p.n, q:q, kg:kg, mat:m ? m.name + " " + m.t + " mm" : "—" });
    for (var k=0;k<q;k++){
      // v12: part, area, idx, band maydonlari olib tashlandi — ular yozilardi,
      // lekin butun loyihada bir marta ham oʻqilmasdi
      // v22: MES ID — nusxa raqami faqat koʻp nusxali detalda (MES `serial_qrs`)
      // v22: moʻrt — material yoki detal nomida (oyna yopishtirilgan LDSP eshik ham)
      out.push({ uid:base+"#"+k, code:p.c, name:p.n, prod:p.p, prodCode:p.pc,
        fragile:!!(sepMatHit(m && m.name) || sepMatHit(p.n)),
        mesKey:mkOf[pi], mes:q > 1 ? mkOf[pi] + "_" + (k+1) : mkOf[pi],
        unit:u, unitName:unitName(p), cls:classify(p.n),
        L:L, W:W, T:m?m.t:16, mat:m, matId:p.m, edges:p.e,
        kg:kg, of:q });
    }
  });
  /* Tashxis uchun: qaysi obyekt nega chiqarib tashlangani. buildItems() sof
     funksiya boʻlib qolishi uchun DIAG ga faqat YOZADI, undan oʻqimaydi. */
  if (typeof DIAG === "object" && DIAG){ DIAG.skipped = skipped; DIAG.heavy = heavy; }
  return out;
}