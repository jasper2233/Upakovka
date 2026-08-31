/* ============================================================
   3.3 HOLAT — barcha sozlamalar (S), loyiha (P), pochkalar (PACKS)
   ============================================================ */
var APP_VER = 20;  // har yangilanishda +1
var S = {
  maxKg:35, ovh:20, minBase:190, maxLen:2100, minBaseT:16, tries:4, prefix:"SM", byThick:true,
  minFill:85, lidFill:90, lidN:3, lidTol:100, oneMan:25, maxLayers:12, sepCls:{},

  /* ---- v14: TAG (PADDON) OʻLCHOV OYNASI ----------------------------------
     Qaysi detal tag boʻla oladi. Toʻrt chegara bitta oynani beradi:
       minBase  — eni MIN  (tor detal tagda tik turolmaydi)
       baseWMax — eni MAKS (kengi listdan chiqadi, kranga sigʻmaydi)
       baseLMin — buyi MIN (kalta detal ustiga qavat terib boʻlmaydi)
       maxLen   — buyi MAKS (uzunidan yuqorisi — nostandart)
     Oyna FAQAT TAGGA tegishli: oynadan chiqqan detal qavatga bemalol tushadi,
     agar u tag gabaritiga sigʻsa. Shu sabab mayda polka nostandartga oʻtmaydi. */
  baseWMax:1900, baseLMin:0,

  /* v18: STANDART DETALNING MIN OʻLCHAMI.
     Detal shu chegaradan kichik boʻlsa — u standart oqimga umuman kirmaydi,
     NOSTANDART oqimga oʻtadi va oʻziga oʻxshagan mayda detallar bilan bogʻ
     boʻladi. Tag oynasining pastki chegarasidan (minBase, baseLMin) farqi:
     u faqat «tag boʻlolmaydi» deydi, detal baribir standart pochkaning
     qavatiga tushaveradi. Bu esa detalni butunlay boshqa oqimga yuboradi.
     Standart 0 = oʻchiq: mayda polkalar eskicha standart pochkada qoladi.
     Sexda mayda detallarni alohida yigʻish qulay boʻlsa — shu yerda yoqiladi. */
  minPartW:0, minPartL:0,

  /* ---- v14: PADDON QAMROVI ----------------------------------------------
     Tag pochkaning deyarli butun tagini egallashi shart, aks holda ustidagi
     qavatlar chetdan osilib qoladi va pochka agʻdariladi.
       baseCover — tag yuzasi pochka gabarit yuzasining ≥ shuncha % i (80…100)
       baseInset — tag gabaritdan har tomonga ≤ shuncha mm ichkarida
     Ikkalasi BIRGA tekshiriladi: foiz umumiy qamrovni, mm esa bitta yomon
     tomonni ushlaydi (uzun pochkada 5% ham 60 mm boʻlishi mumkin). */
  baseCover:90, baseInset:40,

  /* v14: pochka maks BALANDLIGI, mm. 0 = cheklovsiz. Qavat soni (maxLayers)
     aralash qalinlikda balandlikni yomon oʻlchaydi: 12 ta 3 mm = 36 mm,
     12 ta 16 mm = 192 mm. Shuning uchun mm boʻyicha ikkinchi chegara. */
  maxH:0,

  /* v17: TOM ULUSHI, min %. Koʻp detalli tomda eng kichik detalning ulushi.
       minUlush(n) = lidBal − 10 × (n − 2)
       2 detal → 40 %  (60/40 va 50/50 ruxsat, 88/12 rad)
       3 detal → 30 %  (30/30/30 atrofida)
     Sabab: mayda detal tomda qolsa, ustiga terilgan pochkaning ogʻirligi
     oʻsha kichik yuzaga toʻplanadi va detal eziladi. */
  lidBal:40,

  /* ---- v14: NOSTANDART DETALLAR -----------------------------------------
     Tag oynasidan chiqqan yoki limitdan ogʻir detallar. Ular endi shunchaki
     bir joyga tashlanmaydi — saralanib pochkalanadi:
       oddKg   — nostandart pochka massa limiti (standartdan katta boʻlishi mumkin)
       oddLMax — nostandart pochka maks buyi
       oddWMax — nostandart pochka maks eni
       oddTol  — «oʻlchami yaqin» chegarasi: shuncha mm ichida farq qilsa birga
     Bir xil oʻlchamli detallar avval oʻzaro bogʻ qilinadi (uzun-tor detal uchun
     tabiiy), xilma-xil qolganlariga toʻliq pochka mantiqi qoʻllanadi. */
  oddKg:40, oddLMax:3200, oddWMax:1900, oddTol:300,

  /* v16: QOLDIQ UCHUN MASSA ZAXIRASI, kg.
     Guruh oxirida qoladigan yengil pochkani boshqasiga singdirishda massa
     limitidan shuncha kg oshishga ruxsat beriladi. Sabab: qoldiq detal
     odatda 2–8 kg boʻladi, nishon pochkada esa 30 kg turadi — 35 kg limiti
     tufayli ular alohida qolib ketardi va butun buyurtmada oʻnlab yarim boʻsh
     pochka toʻplanardi. Bitta 43 kg li pochka ikkita (33 + 10) dan koʻra
     tashishga ham, omborga ham qulayroq.
     DIQQAT: zaxira FAQAT singdirishda ishlaydi — oddiy terish baribir
     maxKg bilan cheklangan. Zaxiradan foydalangan pochka `overKg` belgisini
     oladi, chekda «2 KISHI» chiqadi va roʻyxatda alohida koʻrinadi. */
  tailKgOver:10,

  /* v20: QUYRUQ QAVATIDA RUXSAT ETILGAN ENG KATTA BOʻSHLIQ, mm. 0 = oʻchiq.

     Quyruq qavati `minFill` (85 %) shartidan ozod — u guruh oxirida qolgan
     2–4 detalni sigʻdirish uchun bor. Lekin toʻldirish FOIZI notoʻgʻri
     oʻlchov: 4 ta tor detal butun chuqurlik boʻylab tarqalsa 44 % beradi va
     ustidagi qopqoq bemalol tayanadi; oʻsha 44 % ikkita keng detal boʻlib
     yigʻilsa esa qopqoq 681 mm boʻshliq ustidan oʻtadi va ustiga pochka
     terilganda egilib sinadi.

     Shuning uchun chegara FOIZDA emas, MILLIMETRDA: quyruq detallari orasida
     (va tag chetigacha) qolgan eng katta tayanchsiz oraliq shundan oshmasin.
     300 mm — 16 mm LDSP taxtasi ustiga 40 kg li pochka qoʻyilganda xavfsiz
     oraliq. Kattalashtirsa quyruq koʻproq ishlaydi, lekin qopqoq egiladi. */
  tailGap:300,

  /* v20: QUYRUQ QAVATINING ENG KICHIK TAYANCH KENGLIGI, % (har oʻq boʻyicha).
     0 = oʻchiq.

     `tailGap` boʻshliqni oʻlchaydi, bu esa TAYANCH KENGLIGINI. Sexda koʻrilgan
     nosozlik aynan ikkinchisi edi: 1910×300 li pochkaga 1720×160 li quyruq
     markazga tushgan. Chetdagi boʻshliqlar 70 va 102 mm — `tailGap` oʻtkazadi.
     Lekin qopqoq 300 mm enli pochkada 160 mm enli qirraga tayanadi (53 %) va
     ustiga pochka terilganda ag'dariladi.

     Qoplanish har oʻq boʻyicha alohida oʻlchanadi, kichigi olinadi. */
  tailSpan:70,

  /* v20: TOM DETALINING TAYANCH ULUSHI, % (har detal ALOHIDA). 0 = oʻchiq.

     `tailSpan` butun qavatning umumiy kengligini oʻlchaydi — u tomning
     BIRON detali ostidagi qavatdan butunlay chiqib ketganini koʻrmaydi.
     Sexda koʻrilgani shu: tom uch detaldan iborat, oʻrtadagisi ostidagi
     qavatga yaxshi tegadi, chetdagi ikkitasi esa undan chiqib osilib qoladi —
     ularning tegish yuzasi 30 % ham emas.

     Endi HAR BIR tom detali oʻz yuzasining kamida shuncha foizi bilan
     ostidagi qavatga tegishi shart. Ostida qavat boʻlmasa — tag detalga.

     Nima uchun har detal alohida: uchta detalning oʻrtachasi 70 % boʻlishi
     mumkin, lekin chetdagi bittasi 0 % boʻlsa u baribir osilib turadi va
     ustiga pochka terilganda sinadi. Oʻrtacha bu nosozlikni yashiradi. */
  lidSupp:65,

  /* v20: TOM OSTIDAGI QAVAT (TOʻSHAK) — eng kam toʻldirish, %. 0 = oʻchiq.

     `lidSupp` har bir tom detalining TEGISH yuzasini oʻlchaydi. Sexda undan
     ham qatʼiyroq talab qoʻyildi: tom ostidagi qavatning OʻZI toʻliq boʻlsin.

     Sabab: tom uch tasmadan iborat boʻlsa (1897×100 + 1790×100 + 1897×100) va
     ostidagi qavat faqat oʻrtani egallasa, chetdagi ikkita tasma qirraga
     tayanib DUMALAB ketadi — tasma tortilgunga qadar joyidan qoʻzgʻaladi.
     Toʻshak qavat oʻz yuzasining 85 % ini qoplasa tom detallari qoʻzgʻalmaydi.

     Amalda bu quyruqqa tegishli: oddiy qavatlar allaqachon `minFill` (85 %)
     dan oʻtadi, quyruq esa undan ozod. Endi SIYRAK quyruq tom ostiga
     qoʻyilmaydi — u pastroqqa suqiladi yoki umuman singdirilmaydi.

     Chegara `minFill` dan qatʼiyroq boʻlolmaydi: oddiy qavat `minFill` bilan
     qabul qilinadi, undan koʻpini talab qilish bajarilmas shart boʻlardi. */
  lidBed:85,

  /* v17: DETAL MAKS QALINLIGI, mm — undan qalini POCHKALANMAYDI.
     Haqiqiy eksportlarda proyekt faylida mebel detallari bilan bir qatorda
     XONA OBYEKTLARI ham keladi: devor, pol, shift. Ular ham «part» boʻlib
     yoziladi va oʻz materialiga ega («Devor», 350 mm, 245 kg/m²). Tizim ularni
     sodda pochkalab, 2,4 TONNALIK «pochka» yasab qoʻyardi.
     60 mm chegarasi 205 ta haqiqiy fayl oʻlchanib tanlangan (tests\corpus.ps1).
     Korpusda 30 mm dan qalin BARCHA materiallar ikki aniq guruhga boʻlinadi:
       HAQIQIY  — «Stolishnitsa» 40 mm (28 kg/m²), «MATO» 50 mm (35 kg/m²),
                  LMDF/LDSP 32 mm (22 kg/m²)
       SOXTA    — «Devor» 100 / 200 / 350 mm (70…245 kg/m²), «Pol» 100 mm
     50 va 100 mm orasida hech narsa yoʻq, shuning uchun 60 mm — xavfsiz
     chegara: stolishnitsa ham, yumshoq mebel qoplamasi ham oʻtadi.
     Chiqarib tashlangan obyektlar YOʻQOLMAYDI — ular Diagnostikada
     roʻyxat boʻlib chiqadi (`DIAG.skipped`). */
  maxPartT:60,

  /* ---- v14: QALINLIK MATRITSASI -----------------------------------------
     { "3":true } — 3 mm detallar ASOSIY pochkaga qoʻshiladi.
     Asosiy qalinlik = buyurtmada detali eng koʻp boʻlgan qalinlik (avtomatik).
     Qoʻshilgan qalinlik pochkada ALOHIDA QAVAT boʻlib turadi — bitta qavatda
     ikki xil qalinlik hech qachon aralashmaydi (qavat notekis boʻlib qolardi).
     Tag va qopqoq baribir minBaseT dan yupqa boʻlolmaydi. */
  thickMix:{},
  tare:0.6,          // v10: qadoq materiali — qogʻoz + 4 burchak + tasma (faqat chek uchun)
  labelSize:"a4",    // v10: chek oʻlchami — a4 | 100x70 | 80x60 | 58x40 | custom

  /* v20: QOʻLDA OʻLCHAM. Sexdagi termal printer ruloni har xil boʻladi va tayyor
     roʻyxatdagi uch oʻlcham yetmaydi. labelSize="custom" boʻlganda @page oʻlchami
     aynan shu ikki raqamdan olinadi (mm). Boshqa rejimda ular tegilmaydi. */
  labelW:80, labelH:60,

  /* v20: POCHKA TUGAGANDA CHEK OʻZI CHIQSIN.
     Ish tartibi: oxirgi detal qoʻyiladi → qogʻozga oʻraladi → chek yopishtiriladi.
     Ilgari ishchi «Pochka cheki» tugmasini qidirib topishi kerak edi va koʻpincha
     unutardi — pochka chekssiz omborga ketardi.
     Brauzer jimgina bosib chiqara olmaydi: chop oynasi ochiladi, ishchi Enter bosadi. */
  autoLbl:true,
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