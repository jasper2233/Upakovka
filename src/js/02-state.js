/* ============================================================
   3.3 HOLAT — barcha sozlamalar (S), loyiha (P), pochkalar (PACKS)
   ============================================================ */
var APP_VER = 12;  // har yangilanishda +1
var S = {
  maxKg:35, ovh:20, minBase:190, maxLen:2100, minBaseT:0, tries:4, prefix:"SM", byThick:true,
  minFill:85, lidFill:80, lidN:3, lidTol:100, oneMan:25, maxLayers:12, sepCls:{},
  tare:0.6,          // v10: qadoq materiali — qogʻoz + 4 burchak + tasma (faqat chek uchun)
  labelSize:"a4",    // v10: chek oʻlchami — a4 | 100x70 | 58x40
  matCat:[ {key:"LDSP", t:16, l:2750, w:1830, kgm2:11.20},
           {key:"LMDF", t:16, l:2750, w:1830, kgm2:12.32},
           {key:"MDF",  t:16, l:2750, w:1830, kgm2:12.32},
           {key:"XDF",  t:3,  l:2800, w:2070, kgm2:2.70},
           {key:"HDF",  t:3,  l:2800, w:2070, kgm2:2.70} ],
  /* v12: REJIM OLIB TASHLANDI — bitta umumiy pochkalash mantigʻi.
     Ilgari ikki nomlangan preset bor edi: «Individual» (modul boʻyicha) va
     «Konveyr» (material boʻyicha), P/M ulardan birini tanlardi. Lekin
     pochkalash yadrosi (packKey) allaqachon toʻrt oʻq ustida ishlaydi —
     preset dvijokni cheklab turardi, mijoz xohishini emas, aksincha.
     Endi qoida BITTA va bevosita belgilanadi:
       split.prod — modul (birlik) boʻyicha ajratish
       split.mat  — material boʻyicha ajratish
     Qalinlik (byThick) va klass (sepCls/clsGroups) — mustaqil oʻqlar,
     ular ham shu bitta qoidaning qismi. */
  split:{ prod:true, mat:false },
  ovhOn:true, zex:1, rooms:{},

  /* v11: GURUHLAR — bir nechta modulni yoki klassni BITTA pochka guruhiga qoʻshish.
     clsGroups: [{cls:["TOM","FASAD"]}] — tom + fasad birga, qolganidan ajralgan
     sepCls bilan farqi: sepCls bitta klassni ajratadi, clsGroups esa TOʻPLAMNI
     ajratadi (toʻplam aʼzolari oʻzaro aralashadi, tashqaridagilar bilan emas).

     v12: MODUL GURUHI = XONA. Ikkita maydon qoʻshildi:
       name — xona nomi («Zal», «Yotoqxona»); roʻyxat sarlavhasida va chekda turadi
       join — xona BIRGA pochkalanadimi
              true  — butun xona bitta pochkalash kaliti: kuxnya + pod-TV + shkaf
                      detallari aralash teriladi (v11 dagi xatti-harakat)
              false — har modul oʻz pochkasini oladi, xona nomi faqat BELGI
     Eski guruhlarda bu maydonlar yoʻq — join koʻrsatilmagani «true» deb olinadi,
     shuning uchun saqlangan sozlama xatti-harakati oʻzgarmaydi.
     modGroups: [{ mods:["01","02"], name:"Yotoqxona", join:false }] */
  modGroups:[], clsGroups:[],

  /* v12: MODUL NOMLARI — kod → odam oʻqiydigan nom. Fayl faqat «01», «02» beradi
     (komplekt-5modul da bitta good, chegara kodda), demak nomni P/M yozadi:
       { "01":"Karavot", "02":"Tumba chap", "05":"Tremo" }
     Nomsiz chekda «01» turadi va upakovshik nima ekanini bilmaydi. */
  unitNames:{},

  /* v11: SARALASH POSTI — stelyajlar va yacheykalar.
     Yacheyka kodi = stelyaj harfi + raqam (A1…A10, B1…).
     cellOff — ishchi qoʻlda YOPIQ deb belgilagan yacheykalar: ular avvalgi
     buyurtmadan band, singan yoki boshqa ish uchun ajratilgan. Tizim ularga
     detal bermaydi. Bu smena boshida kiritiladigan FIZIK holat, shuning uchun
     u qayta pochkalashda ham, saralash tozalanganda ham yoʻqolmaydi. */
  rackN:5, cellN:6, cellOff:{},

  /* v12: YACHEYKA FIZIK OʻLCHAMLARI (sexdan olingan, mm).
     Har stelyajda cellN ta yacheyka bor; oxirgi bigN tasi «KATTA» —
     u tor, lekin CHUQUR: eni 1 metrdan katta detallar shunga tushadi.
     Yacheykaning TEPASI OCHIQ — undan uzun detal bemalol chiqib turaveradi,
     shuning uchun cellH balandlik chegarasi emas, faqat maʼlumot uchun.
       kichik: eni 250, chuqurlik 400, boʻyi 1500
       katta : eni 100, chuqurlik 800, boʻyi 1500 */
  bigN:1,
  cellW:250, cellD:400, cellH:1500,
  bigW:100,  bigD:800
};

/* ============================================================
   MODUL (BIRLIK) BELGISI — bu SOZLAMA emas, FAYLNING xossasi.

   Real fayllar shuni koʻrsatdi (namuna\ dagi uchala fayl shu holatlarni takrorlaydi):
     «komplekt-5modul» — <good typeId="product"> BITTA, lekin ichida 5 ta
       mustaqil mebel bor va ularning chegarasi FAQAT detal kodida:
       01_… karavot, 02_/03_… tumba, 04_… shkaf, 05_… tremo.
       Tuzilishga tayansak beshalasi bitta pochkaga aralashib ketardi.
     «namuna» — 4 ta good, kodlar ham aynan 4 ta prefiks beradi
       (good 990101 ↔ prefiks 01). Ikki manba bir xil javob beradi.
     «konveyr-partiya» — kodda ajratgich yoʻq (99020101), demak prefiks yoʻq.

   Qoida BITTA va avtomatik: kod prefiksi tuzilishdan KOʻPROQ birlik bersa —
   prefiks olinadi, aks holda good kodi. Tanlov yoʻq; natija P/M ga koʻrsatiladi.
   ============================================================ */
var UNIT_SEP = /^([^_\-]+)[_\-]/;          // «01_001» -> «01», «AB-7» -> «AB»
function unitPrefix(code){
  var m = UNIT_SEP.exec(String(code || ""));
  return m ? m[1] : null;
}
/* Butun loyiha uchun bir marta hisoblanadi va P da saqlanadi. P almashsa
   (yangi fayl yoki seans tiklanishi) qiymat oʻzi bilan ketadi. */
function unitSrc(){
  if (!P || !P.parts) return "good";
  if (P.unitSrc === "code" || P.unitSrc === "good") return P.unitSrc;
  var goods = {}, pres = {};
  P.parts.forEach(function(p){
    goods[p.pc] = 1;
    var u = unitPrefix(p.c);
    if (u) pres[u] = 1;
  });
  P.unitSrc = (Object.keys(pres).length > Object.keys(goods).length) ? "code" : "good";
  return P.unitSrc;
}
/* Detal qaysi BIRLIKKA (modulga) tegishli. Xom part obyekti bilan ishlaydi —
   buildItems, roomStats va classStats bir xil javob olishi uchun hamma joyda
   AYNAN shu funksiya chaqiriladi. */
function unitOf(p){
  if (unitSrc() === "code"){
    var u = unitPrefix(p.c);
    if (u) return u;
  }
  return p.pc;
}
/* Birlikning koʻrsatiladigan nomi. Prefiksdan olingan birlikda good nomi
   hamma modul uchun bir xil («Komplekt») — uni nom deb koʻrsatib boʻlmaydi,
   shuning uchun kodning oʻzi qaytadi. Odam oʻqiydigan nomni P/M beradi. */
function unitName(p){
  var u = unitOf(p);
  return unitLabel(u, (u === p.pc) ? (p.p || p.pc) : u);
}
/* v12: modulning koʻrsatiladigan nomi. P/M bergan nom birinchi oʻrinda —
   fayl «01» dan boshqa hech nima bermaydi, odam oʻqiydigan nomni P/M yozadi. */
function unitLabel(code, dflt){
  var n = S.unitNames && S.unitNames[code];
  return (typeof n === "string" && n) ? n : (dflt || code);
}

/* v12: modul qaysi XONAGA tegishli. Guruhga kirmasa null.
   Bu funksiya BELGILASH uchun — join yoqilganmi-yoʻqmi, farqi yoʻq. */
function roomOf(code){
  var g = S.modGroups || [];
  for (var i=0;i<g.length;i++){
    if (g[i] && g[i].mods && g[i].mods.indexOf(code) >= 0)
      return { i:i, name:(g[i].name || ("Xona " + grpLetter(i))), join:(g[i].join !== false) };
  }
  return null;
}
/* Modul qaysi POCHKALASH guruhiga tegishli — packKey() shuni oʻqiydi.
   Faqat «birga pochkalansin» yoqilgan xona kalit beradi; belgi uchungina
   yaratilgan xona (join:false) modullarni birlashtirmaydi. */
function modGroupOf(code){
  var r = roomOf(code);
  return (r && r.join) ? ("MG" + r.i) : null;
}
/* Klass qaysi guruhga tegishli */
function clsGroupOf(cls){
  var g = S.clsGroups || [];
  for (var i=0;i<g.length;i++) if (g[i] && g[i].cls && g[i].cls.indexOf(cls) >= 0) return "CG"+i;
  return null;
}
/* Guruh nomi — «A», «B», «C»… roʻyxatda va pochka sarlavhasida koʻrsatiladi */
function grpLetter(i){ return String.fromCharCode(65 + (i % 26)); }

/* v12: ESKI SOZLAMANI BITTA QOIDAGA KOʻCHIRISH.
   Brauzerdagi saqlangan sozlama va IndexedDB dagi seans hali eski shaklda
   turgan boʻlishi mumkin: {mode:"ind"|"conv"|"b2c"|"b2b", rules:{ind,conv}}.
   Shu sabab har oʻqishda ayni shu funksiyadan oʻtkaziladi — foydalanuvchining
   sozlamasi yoʻqolmasin, faqat shakli oʻzgarsin.
     split — yangi shakl (bor boʻlsa oʻshasi olinadi)
     mode / rules — eski shakl */
function splitFix(split, mode, rules){
  if (split && typeof split === "object")
    return { prod: !!split.prod, mat: !!split.mat };
  var m = (mode === "b2b" || mode === "conv") ? "conv" : "ind";
  var old = null;
  if (rules && typeof rules === "object")
    old = rules[m] || (m === "conv" ? rules.b2b : rules.b2c);
  if (old && typeof old === "object")
    return { prod: !!old.prod, mat: !!old.mat };
  // eski rejim nomi bor, lekin qoidasi yoʻq — oʻsha rejimning maʼnosi bilan
  return (m === "conv") ? { prod:false, mat:true } : { prod:true, mat:false };
}
var P = null;      // loyiha: {name, uuid, materials[], parts[]}
var PACKS = [];    // hisoblangan pochkalar
var CUR = -1;      // tanlangan pochka
var WRAP = false;  // qogʻozga oʻralganmi
var STEP = 0;      // yigʻish qadami