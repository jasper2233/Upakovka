/* 3.9.-1 KASR AJRATGICH MUAMMOSI (v10)
   uz-UZ (va ru-RU) lokalida brauzer <input type="number"> qiymatini VERGUL bilan
   koʻrsatadi: "56,36". Foydalanuvchi ham tabiiy ravishda vergul yozadi — lekin
   type="number" da vergulli qiymat NOTOʻGʻRI hisoblanadi va .value BOʻSH string qaytaradi.
   Oqibati jimgina va ogʻir: material kg/m² 0 ga aylanadi (hamma detal 0 kg),
   tara 0 boʻladi, sozlamalar esa standart qiymatga qaytib ketadi.
   Yechim: raqamli maydonlarni matn maydoniga oʻtkazamiz (mobil klaviatura baribir
   raqamli boʻlishi uchun inputmode="decimal") va vergulni nuqtaga almashtiramiz. */
function fixNumberInputs(root){
  var list = (root || document).querySelectorAll('input[type="number"]');
  for (var i=0;i<list.length;i++){
    var inp = list[i];
    inp.type = "text";
    inp.setAttribute("inputmode", "decimal");
    inp.setAttribute("data-num", "1");
  }
}
document.addEventListener("beforeinput", function(e){
  var t = e.target;
  if (!t || t.getAttribute == null || t.getAttribute("data-num") !== "1") return;
  if (e.data !== "," && e.data !== "٫") return;      // vergul yoki arabcha kasr belgisi
  e.preventDefault();
  var a = t.selectionStart, b = t.selectionEnd;
  var v = t.value;
  if (v.indexOf(".") >= 0 && !(a <= v.indexOf(".") && v.indexOf(".") < b)) return;  // ikkinchi nuqta kerak emas
  t.value = v.slice(0, a) + "." + v.slice(b);
  try { t.selectionStart = t.selectionEnd = a + 1; } catch(err){}
  t.dispatchEvent(new Event("input", { bubbles: true }));
});

/* 3.9.0 QADAM BOSHQARUVI (v10)
   Ilgari «← Orqaga» tugmasi STEP ni kamaytirardi, lekin p.done ni emas — natijada
   yarim yigʻilgan pochka roʻyxatda ✓ boʻlib turardi. Endi ikkalasi bitta joydan yangilanadi
   va har qadam avtomatik saqlanadi. */
function setStep(n){
  var p = PACKS[CUR];
  if (!p){ STEP = 0; return; }
  STEP = Math.max(0, Math.min(n, p.seq.length));
  p.done = STEP;
  /* v11: pochka toʻliq terilgach uning stelyaj yacheykasi boʻshaydi — detallar
     yacheykadan chiqib pochkaga oʻtdi. Shu bilan yacheyka keyingi pochkaga
     tegishi mumkin, yaʼni 30 yacheyka bilan 55 pochkani saralab boʻladi. */
  if (typeof sortFreeCell === "function" && STEP >= p.seq.length){
    if (sortFreeCell(p.no) && typeof renderSort === "function") renderSort();
  }
  if (typeof autosave === "function") autosave();
}

/* KANT QIRRALARI — T/B/L/R harflari ishchiga hech nima demaydi.
   Parser ularni elt/elb/ell/elr atributlaridan yigʻadi (top/bottom/left/right). */
var EDGE_UZ = { T:"tepa", B:"past", L:"chap", R:"oʻng" };
function edgeText(e){
  if (!e) return "—";
  var out = [];
  for (var i=0;i<e.length;i++){ var w = EDGE_UZ[e.charAt(i)]; if (w) out.push(w); }
  if (!out.length) return esc(e);
  if (out.length === 4) return "4 qirra";
  return out.join(", ");
}

/* 3.9.1 pochkalar roʻyxati (chap ustun) */
/* v11: pochka qaysi guruh sarlavhasi ostiga tushadi.
   gname — pochkalash guruhining nomi; modullar birlashtirilgan boʻlsa
   «01 shkaf + tumba» boʻladi. base.prod faqat TAG detalning modulini beradi,
   shuning uchun birlashgan pochkada ikkinchi modul nomi yoʻqolib ketardi.
   Sarlavha va uning ostidagi hisoblagich AYNAN shu funksiyadan foydalanishi shart —
   ilgari sarlavha gname, hisoblagich esa base.prod boʻyicha yurib «0 pochka» chiqarardi. */
/* v14: noodatiy pochka ham endi GURUHGA tegishli — nostandart oqim (3.6.8.5)
   unga modul/material/klass kalitini, nomini va xonasini yozadi. Ilgari bu
   yerda qatʼiy «Noodatiy» qaytarilardi va bogʻlar roʻyxatda oʻz moduli ostidan
   chiqib ketardi. Nomi boʻlmasa — eskicha. Qatorning oʻzi baribir «noodatiy»
   deb yozilgani uchun belgi yoʻqolmaydi. */
function packGrpName(p){
  if (p.odd) return p.gname || "Noodatiy";
  return p.gname || p.base.prod || "Pochka";
}
/* v12: pochka qaysi XONAGA tegishli. Pochkalashda yozilgan p.room ishlatiladi;
   seansdan tiklangan eski pochkada u boʻlmasligi mumkin — tag detaldan olinadi. */
function packRoom(p){
  if (typeof p.room === "string") return p.room;
  if (p.odd) return "";
  var r = p.base ? roomOf(p.base.unit) : null;
  return r ? r.name : "";
}
function renderPacks(){
  var box = $("packList"); box.innerHTML = "";
  var lastGrp = null, lastRoom = null;
  PACKS.forEach(function(p,i){
    /* v12: XONA sarlavhasi — guruh sarlavhasidan bir pogʻona yuqorida.
       Pochkalar xona → modul tartibida terilgan (groupSortKey), shuning uchun
       bir xonaning pochkalari ketma-ket turadi va sarlavha bir marta chiqadi. */
    var room = packRoom(p);
    if (room !== lastRoom){
      lastRoom = room; lastGrp = null;            // yangi xona — guruh sarlavhasi qayta chiqsin
      if (room){
        var cnt = 0, kgs = 0;
        for (var k=i; k<PACKS.length; k++){
          if (packRoom(PACKS[k]) !== room) break;
          cnt++; kgs += packBrutto(PACKS[k]);
        }
        var rh = document.createElement("div");
        rh.className = "pkroom";
        rh.innerHTML = '<span>'+esc(room)+'</span><em>'+cnt+' pochka · '+kgs.toFixed(0)+' kg</em>';
        box.appendChild(rh);
      }
    }
    var n = p.odd ? p.items.length : p.seq.length;
    var th = p.t ? p.t+" mm" : "";
    var cls = (!p.odd && S.sepCls && S.sepCls[p.base.cls]) ? " · "+p.base.cls : "";
    var grp = packGrpName(p);
    // v10c: mahsulot nomi endi GURUH sarlavhasida, qatorda emas. Sabab: pochkalar
    // mahsulot boʻyicha ketma-ket turadi (18/12/13/10/2) va nom har qatorda
    // takrorlanganda 18 ta qator bir-biriga quyma oʻxshab qolardi.
    if (grp !== lastGrp){
      lastGrp = grp;
      var cnt = 0, kgs = 0;
      for (var j=i; j<PACKS.length; j++){
        // v12: hisob xona chegarasida ham toʻxtaydi — aks holda ikki xonadagi
        // bir xil nomli modul bitta sarlavhaga qoʻshilib ketardi
        if (packGrpName(PACKS[j]) !== grp || packRoom(PACKS[j]) !== room) break;
        cnt++; kgs += packBrutto(PACKS[j]);
      }
      var g = document.createElement("div");
      g.className = "pkgrp" + (p.odd ? " odd" : "");
      g.innerHTML = '<span>'+esc(grp)+'</span><em>'+cnt+' pochka · '+kgs.toFixed(0)+' kg</em>';
      box.appendChild(g);
    }
    // sarlavha — GABARIT: 55 pochkadan 51 tasi shu bilan farq qiladi va ishchi
    // stoldagi pochkani aynan oʻlchamidan tanib oladi
    var ttl = p.odd ? ("noodatiy" + cls)
                    : (p.gabL+"×"+p.gabW+"×"+Math.round(p.h) + (p.oddSrc ? " · NS" : ""));
    var weak = !p.odd && p.layers.some(function(L){ return L.weak; });
    // v10: har satr <s> ichida — CSS uni kesadi, shuning uchun matn hech qachon
    // "3 qavat ·" / "98%" boʻlib ikkiga boʻlinib ketmaydi
    var sub = p.odd
      ? '<s>'+n+' detal · '+th+'</s>'
      : '<s>'+n+' detal · '+(p.layers.length+1)+' qavat'+(weak?' ⚠':'')+'</s>'+
        // faqat tag detaldan iborat pochkada qavat yoʻq — «toʻldirish 0%» notoʻgʻri
        // taassurot berardi (pochka boʻsh emas, unda ustki qavat yoʻq xolos).
        // «toʻldirish» soʻzi 162 px joy olardi, ustunda esa 155 px bor — uch xonali
        // foizli qatorlar («100%») kesilardi; «toʻliq» 134 px.
        '<s>'+th+(cls?cls:"")+
          (p.layers.length ? ' · toʻliq '+Math.round((p.fillAvg||0)*100)+'%' : ' · qavatsiz')+'</s>';
    var fill = Math.min(100, p.kg/S.maxKg*100);
    var brutto = packBrutto(p);
    var d = document.createElement("div");
    d.className = "pk"+(i===CUR?" on":"")+(p.odd?" odd":"");
    var done = Math.min(p.done||0, n);
    var fin = done >= n;
    // v10: RAQAM HAR DOIM ko\u02bbrinadi. Ilgari ish boshlangach uning o\u02bbrniga \u00ab3/14\u00bb chiqardi,
    // holbuki skaner xatolari \u00abbu detal P07 pochkasiga tegishli\u00bb deb aynan raqamni aytadi \u2014
    // ishchi ro\u02bbyxatdan P07 ni topa olmasdi. Progress raqam ostiga ko\u02bbchdi.
    var mark = pad2(p.no) + (fin ? '<em class="ok">\u2713</em>'
             : (done > 0 ? '<em>'+done+'/'+n+'</em>' : ''));
    /* v11: saralangan bo\u02bblsa \u2014 detallar qaysi stelyaj yacheykasida turgani.
       Qadoqlovchi pochkani ochishdan oldin qayerdan olishini bilishi shart. */
    var cellTag = (typeof SORT === "object" && SORT && SORT.pack && SORT.pack[p.no])
      ? '<span class="celltag">'+SORT.pack[p.no]+'</span>' : '';
    d.innerHTML = '<div class="no">'+mark+'</div>'+
      '<div><div class="ttl">'+cellTag+esc(ttl)+'</div><div class="sub">'+sub+'</div>'+
      '<div class="bar"><i class="'+(fill>92?"hot":"")+'" style="width:'+fill.toFixed(0)+'%"></i></div></div>'+
      '<div class="kg">'+brutto.toFixed(1)+(brutto>S.oneMan?'<em>2 KISHI</em>':'')+'</div>';
    d.onclick = function(){ selectPack(i); };
    // v10: qator <div> edi — klaviatura bilan 55 ta pochkaning birortasiga ham
    // yetib boʻlmasdi. Endi u tugma sifatida ishlaydi.
    d.tabIndex = 0;
    d.setAttribute("role", "button");
    d.setAttribute("aria-label", "Pochka " + pad2(p.no) + ", " + grp + ", " + ttl + ", " + brutto.toFixed(1) + " kg");
    d.onkeydown = function(ev){
      if (ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); selectPack(i); }
    };
    box.appendChild(d);
  });
  $("packHint").textContent = PACKS.length+" ta";
  if (!PACKS.length){
    box.innerHTML = '<div class="note" style="margin:12px">Pochka yoʻq. Proekt menejerda kamida '+
      'bitta hona belgilangan boʻlishi kerak, soʻng «Pochkalash →» tugmasini bosing.</div>';
    return;
  }
  // butun buyurtma boʻyicha umumiy progress — ishchi «yana qancha qoldi» ni bilishi uchun
  var tot = 0, dn = 0;
  PACKS.forEach(function(q){
    var qn = q.odd ? q.items.length : q.seq.length;
    tot += qn; dn += Math.min(q.done||0, qn);
  });
  if (tot){
    $("packHint").innerHTML = PACKS.length+' ta · <b style="color:'+
      (dn>=tot?'var(--ok)':'var(--mark)')+'">'+Math.round(dn/tot*100)+'%</b>';
  }

  /* v10c: TANLANGAN POCHKANI KOʻRINISHGA OLIB KELISH.
     Ilgari «Keyingi pochka →» bosilganda yoki skaner boshqa pochkaga oʻtkazganda
     roʻyxat joyida qolardi: 50-pochka tanlangan boʻlsa-da, ekranda 01–09 turardi
     va ishchi qaysi pochka faol ekanini roʻyxatdan koʻra olmasdi (oʻlchov: tanlangan
     qator roʻyxat tepasidan 4022 px pastda, scrollTop = 0).
     block:"nearest" mantigʻi — qator allaqachon koʻrinib tursa, hech nima surilmaydi,
     shuning uchun har qadamda roʻyxat sakramaydi. */
  var sel = box.querySelector(".pk.on");
  if (sel){
    var br = box.getBoundingClientRect(), sr = sel.getBoundingClientRect();
    var head = 27;                    // yopishib turuvchi guruh sarlavhasi balandligi
    if (sr.top < br.top + head)      box.scrollTop += sr.top - br.top - head;
    else if (sr.bottom > br.bottom)  box.scrollTop += sr.bottom - br.bottom;
  }
  /* v20: yigʻish progressi har qadamda oʻzgaradi — buyurtma hujjatining holati
     ham shu yerda yangilanadi (stats() har qadamda chaqirilmaydi). */
  if (typeof orderNote === "function") { try { orderNote(); } catch(e){} }
}

function selectPack(i){
  CUR = i; STEP = 0; WRAP = false;
  var p = PACKS[i];
  if (!p){
    // v10: ilgari bu yerda sarlavha tozalanmasdi — hamma hona oʻchirilганda
    // ekranda avvalgi pochkaning nomi va gabariti qolib ketardi.
    CUR = -1;
    $("stageTitle").textContent = PACKS.length ? "Pochka tanlanmagan" : "Pochka yoʻq";
    $("stageKg").textContent = "";
    renderPacks(); renderStep();
    return;
  }
  // pochka qayta ochilganda qoldirilgan joydan davom etadi (v10)
  STEP = Math.max(0, Math.min(p.done || 0, p.seq.length));
  if (STEP >= p.seq.length && !p.odd) WRAP = true;
  $("stageTitle").innerHTML = p.odd
    ? 'Pochka <b style="font-family:var(--mono)">P'+pad2(p.no)+'</b> — noodatiy · '+p.t+' mm'
    : 'Pochka <b style="font-family:var(--mono)">P'+pad2(p.no)+'</b>'+
      // v11: detallar qaysi yacheykada turibdi
      ((typeof SORT === "object" && SORT && SORT.pack && SORT.pack[p.no])
        ? ' <span class="celltag big">'+SORT.pack[p.no]+'</span>' : '')+
      ' — '+esc(p.gname||p.base.prod)+' · '+p.t+' mm'+
      // v10c: bosish maydoni 154×14 px edi — barmoq uchun juda ingichka
      ' <label style="margin-left:14px;font-size:11px;color:var(--ink2);cursor:pointer;'+
      'display:inline-flex;align-items:center;gap:6px;padding:6px 4px">'+
      '<input type="checkbox" id="pkOvh" '+(p.allowOvh?"checked":"")+
      ' style="accent-color:var(--mark);width:17px;height:17px;margin:0">chiqishga ruxsat</label>';
  /* v10c: ilgari «… · 3 / 12 qavat   35.0 / 35 kg» chiqardi — ikkita «x / y» juftligi
     yonma-yon turib nima nimaga taqqoslanayotgani bilinmasdi. Bundan tashqari bu
     yerda TOZA massa, chap ustundagi roʻyxatda esa BRUTTO turardi: bitta pochka,
     ikki xil raqam. Endi ikkalasi ham yozilgan va nomlangan. */
  $("stageKg").textContent = (p.odd ? "" : "gabarit "+p.gabL+"×"+p.gabW+"×"+Math.round(p.h)+" mm · qavat "+
    (p.layers.length+1)+(S.maxLayers>0?"/"+S.maxLayers:"")+" · ")+
    // v16: chegara pochkaga qarab oʻzgaradi (nostandart oqim, qoldiq zaxirasi)
    "toza "+p.kg.toFixed(1)+"/"+packKgCap(p)+" kg"+(p.overKg?" (zaxira)":"")+
    " · brutto "+packBrutto(p).toFixed(1)+" kg";
  var t = $("pkOvh"); if (t) t.onchange = function(){ togglePackOvh(p, t.checked); };
  renderPacks(); renderStep();
}

function togglePackOvh(p, on){
  // v10: bu katak butun pochkani qaytadan teradi va progressni nolga tushiradi.
  // moveDetail() boshlangan pochkani tahrirlashni ATAYIN bloklaydi — bu yerda ham
  // shunday boʻlishi kerak, aks holda qoʻlqopli barmoq tegib ketsa ish yoʻqoladi.
  if (p.done > 0){
    var t = $("pkOvh"); if (t) t.checked = p.allowOvh;      // katakni qaytaramiz
    flash("err", "P"+pad2(p.no)+" yigʻilishi boshlangan ("+p.done+" detal) — "+
                 "chiqish rejimini oʻzgartirish uchun avval boshiga qaytaring");
    return;
  }
  /* v21: FAQAT shu pochkaning oʻz detallari qayta teriladi.
     Ilgari bu yerga `p.left` ham qoʻshilardi. `left` esa layoutPack ning
     ishchi maydoni — «shu tagga sigʻmaganlar» — va ular terish davomida
     BOSHQA pochkalarga ketgan edi. Natijada katakni bir marta bosish oʻsha
     detallarni ikkinchi marta shu pochkaga tiqib, auditda TAKROR xatosini
     berardi. Endi manba `packMids(p)` — refreshPack va moveDetail bilan bir xil. */
  var mids = packMids(p);
  /* strat=0 ATAYIN yozilgan: usiz strat undefined boʻlib qopqoq zaxirasi
     (04-packer.js:193) ishlamas va qavat limiti boshqacha hisoblanardi — yaʼni
     «chiqishga ruxsat» katagi bitta pochkani refreshPack/moveDetail dan BOSHQA
     qoida bilan qayta terardi. Uchalasi endi bir xil. */
  var np = layoutPack(p.base, mids, on, 0, 0);
  p.layers = np.layers; p.kg = np.kg; p.envL = np.envL; p.envW = np.envW;
  p.off = np.off; p.allowOvh = on; p.left = [];
  packDerive(p);
  p.done = 0;                      // terish oʻzgardi — progress nolga
  if (np.left.length){
    /* v21: bogʻ manba pochkaning GURUHINI meros oladi (moveDetail dagi
       «+ yangi pochka» kabi). Ilgari u kalitsiz chiqardi va roʻyxatda oʻz
       xonasidan uzilib, «Noodatiy» sarlavhasi ostiga tushib qolardi. */
    var b = { odd:true, items:np.left, kg:np.left.reduce(function(s,x){ return s+x.kg; },0),
              no:PACKS.length+1, rev:P.rev||1, t:np.left[0].T, done:0,
              gname:p.gname, key:p.key, room:p.room, nst:!!p.nst };
    b.seq = packSeq(b); b.h = np.left.reduce(function(s,x){ return s+x.T; },0);
    PACKS.push(b);
    flash("err", np.left.length+" detal sigʻmadi — noodatiy pochkaga oʻtdi");
  }
  STEP = 0; renderPacks(); renderStep(); stats();
  if (typeof autosave === "function") autosave();
}

/* 3.9.2 keyingi detal karti + skaner tekshiruvi */
function renderStep(){
  var p = PACKS[CUR];
  if (!p){ $("nextBox").innerHTML = '<div style="color:var(--ink3)">Pochka tanlang</div>'; $("lblwrap").innerHTML=""; draw3D(); draw2D(); return; }
  var fin = STEP >= p.seq.length;
  var step = p.seq[Math.min(STEP, p.seq.length-1)];
  $("stepNo").textContent = Math.min(STEP+1,p.seq.length)+"/"+p.seq.length;

  if (fin){
    $("nextBox").innerHTML =
      '<div class="step">pochka tayyor</div>'+
      '<div class="code" style="color:var(--ok)">P'+pad2(p.no)+'</div>'+
      '<div class="nm">'+p.seq.length+' detal · '+p.kg.toFixed(1)+' kg · gabarit '+(p.odd?'—':p.gabL+'×'+p.gabW+'×'+Math.round(p.h)+' mm')+' · <b>'+(p.odd?p.items.length:(p.layers.length+1))+' qavat</b></div>'+
      (p.odd?'':'<div class="where" style="margin-top:12px"><u>Keyingi ish</u><b>rulondan qogʻoz yechib oʻrang, 2 tasma tashlang, pochka chekini yopishtiring</b></div>')+
      // v10: ilgari bu yerda NETTO (p.kg) tekshirilardi, roʻyxatda va chekda esa BRUTTO.
      // Natijada 24.7 kg netto pochkada ekran jim turib, chekda «2 KISHI» chiqardi.
      // Endi uch joyda ham bitta manba — packBrutto().
      (packBrutto(p)>S.oneMan
        ? '<div class="heavy">⚠ '+packBrutto(p).toFixed(0)+' KG — 2 KISHI KOʻTARADI</div>' : '')+
      '<div class="btnrow" style="margin-top:14px"><button class="btn" id="bBack">← Orqaga</button>'+
      (CUR+1 < PACKS.length
        ? '<button class="btn pri" id="bNextPack">Keyingi pochka →</button>'
        : '<button class="btn" id="bNextPack" disabled title="oxirgi pochka">Oxirgi pochka</button>')+
      '</div>';
    $("bBack").onclick = function(){ setStep(STEP-1); WRAP=false; renderStep(); renderPacks(); };
    // v10: oxirgi pochkada tugma jim turardi — endi oʻchirilgan holatda va nomi boshqa
    $("bNextPack").onclick = function(){ if (CUR+1<PACKS.length) selectPack(CUR+1); };
  } else {
    var it = step.it;
    var role = step.role==="tag" ? "eng tag — yaxlit detal"
             : step.role==="ust" ? "eng ust — qopqoq"+(step.of>1?" ("+step.n+"/"+step.of+")":"")+(step.weak?" · toʻliq emas":"")
             : step.role==="quyruq" ? "quyruq — qopqoq ostiga"+(step.of>1?" ("+step.n+"/"+step.of+")":"")
             : step.role==="noodatiy" ? "noodatiy — alohida"
             : step.layer+"-qavat"+(step.of>1?" ("+step.n+"/"+step.of+")":"");
    function axis(v, inWord){
      v = Math.round(v);
      if (v === 0) return inWord+" chetga tekis";
      if (v < 0)  return inWord+"ga "+(-v)+" mm chiqadi";
      return inWord+" chetdan "+v+" mm";
    }
    var where = !step.pos ? "alohida qoʻyiladi"
      : step.role==="tag" ? "markazga, tekis"
      : axis(step.pos.x,"chap")+" · "+axis(step.pos.y,"orqa")+(step.pos.rot?" · 90° burilgan":"");
    $("nextBox").innerHTML =
      '<div class="step">qadam '+(STEP+1)+' · '+role+'</div>'+
      '<div class="code">'+esc(it.code)+'</div>'+
      '<div class="nm">'+esc(it.name)+'</div>'+
      '<div class="grid2">'+
        '<div class="cell"><u>Oʻlcham</u><b>'+it.L+'×'+it.W+'</b></div>'+
        '<div class="cell"><u>Qalinlik</u><b>'+it.T+' mm</b></div>'+
        '<div class="cell"><u>Massa</u><b>'+it.kg.toFixed(2)+' kg</b></div>'+
        '<div class="cell"><u>Kant</u><b>'+edgeText(it.edges)+'</b></div>'+
      '</div>'+
      '<div class="where"><u>Qayerga</u><b>'+where+'</b></div>'+
      '<div class="scan"><input id="scan" placeholder="QR skanerlang yoki kod yozing" autocomplete="off"></div>'+
      '<div class="msg" id="msg"></div>'+
      '<div class="btnrow"><button class="btn" id="bBack">← Orqaga</button>'+
      '<button class="btn pri" id="bOk">Qoʻyildi ✓</button></div>';
    $("bOk").onclick = advance;
    $("bBack").onclick = function(){ setStep(STEP-1); WRAP=false; renderStep(); renderPacks(); };
    var sc = $("scan");
    sc.onkeydown = function(e){ if (e.key==="Enter"){ checkScan(sc.value.trim()); sc.value=""; } };
    setTimeout(function(){ sc.focus(); }, 30);
    if (PEND){ var m=$("msg"); m.className="msg "+PEND.k; m.textContent=PEND.t; PEND=null; }
    $("lblwrap").innerHTML = labelHTML(p, step, "qrLive");
    drawQR($("qrLive"), qrText(p, step));
  }
  var bw2=$("btnWrap"); if(bw2) bw2.textContent = WRAP ? "Qogʻozni ochish" : "Qogʻozga oʻrash";
  draw3D(); draw2D();
}
function advance(){ var p=PACKS[CUR]; if (!p) return;
  flashClear();                       // eski xabar yangi qadamga oʻtmasin
  var was = STEP;
  if (STEP<p.seq.length) setStep(STEP+1);
  /* v20: pochka AYNAN SHU QADAMDA tugadimi. Shart `STEP>=seq.length` emas,
     OʻTISH boʻyicha: aks holda tayyor pochkada har Enter bosilganda chek qayta
     chiqib ketardi. */
  var justDone = (was < p.seq.length && STEP >= p.seq.length);
  if (STEP>=p.seq.length && !p.odd) WRAP = true;
  renderStep(); renderPacks();
  if (justDone && S.autoLbl) printPackLabel(p);
}
/* XABAR (flash).
   v10: ilgari xabar PEND da qolib, keyingi qadamda QAYTA chiqardi — ishchi toʻgʻri
   ishlayotgan boʻlsa ham ekranda eski qizil xato turaverardi va unga ishonmay qoʻyardi.
   Endi xabar 6 soniyada oʻzi soʻnadi va yangi qadam boshlanganda tozalanadi. */
var PEND=null, PEND_T=null;
function flash(kind, text){
  PEND={k:kind,t:text};
  var m=$("msg");
  if(m){ m.className="msg "+kind; m.textContent=text; }
  if (PEND_T) clearTimeout(PEND_T);
  PEND_T = setTimeout(function(){
    PEND = null;
    var el = $("msg");
    if (el){ el.className="msg"; el.textContent=""; }
  }, 6000);
}
function flashClear(){
  if (PEND_T){ clearTimeout(PEND_T); PEND_T=null; }
  PEND = null;
  var m=$("msg"); if(m){ m.className="msg"; m.textContent=""; }
}

/* SKANER TEKSHIRUVI.
   QR format: PREFIKS.UUID.Rn|Pnn|Qn|KOD|LxWxT
   v10: reviziya (Rn) tekshiriladi — buyurtma qayta pochkalangandan keyin eski chek
   skanerlansa operator buni darhol biladi, aks holda notoʻgʻri pochka yigʻiladi. */
function checkScan(v){
  var p = PACKS[CUR]; if (!p || !v) return;
  if (STEP >= p.seq.length){ flash("ok","pochka allaqachon tayyor"); return; }
  var step = p.seq[STEP], want = qrText(p, step);
  var f = v.split("|");

  // eski terishdan chop etilgan chekmi?
  var hdr = f[0] ? f[0].split(".") : [];
  var rev = null;
  for (var z=0; z<hdr.length; z++) if (/^R\d+$/.test(hdr[z])) rev = +hdr[z].slice(1);
  if (rev !== null && P && P.rev && rev !== P.rev){
    flash("err","bu chek ESKI terishdan (R"+rev+"), joriy terish R"+P.rev+" — cheklarni qayta chop eting");
    return;
  }

  // bir xil koddagi detallar oʻzaro almashinadi: pochka + kod mos kelsa yetarli
  var sameCode = f.length>3 && f[1]==="P"+pad2(p.no) && f[3]===step.it.code;
  if (v === want || v === step.it.code || sameCode){ advance(); flash("ok","toʻgʻri — qoʻyildi ✓"); return; }
  var at = -1;
  for (var i=0;i<p.seq.length;i++){ if (qrText(p,p.seq[i])===v || p.seq[i].it.code===v){ at=i; break; } }
  if (at>=0){ flash("err","bu detal shu pochkada, lekin "+(at+1)+"-qadamda"); return; }

  // boshqa pochkada bormi? — operatorga aniq yoʻl koʻrsatamiz
  for (var k=0;k<PACKS.length;k++){
    if (k===CUR) continue;
    var q = PACKS[k];
    for (var j=0;j<q.seq.length;j++){
      if (qrText(q,q.seq[j])===v || q.seq[j].it.code===v){
        flash("err","bu detal P"+pad2(q.no)+" pochkasiga tegishli ("+(j+1)+"-qadam)");
        return;
      }
    }
  }
  flash("err","bu detal bu buyurtmada topilmadi");
}

/* 3.9.3 shapka statistikasi + audit belgisi */
function stats(){
  if (!P) return;
  var items = buildItems();
  $("pname").textContent = P.name;
  $("puuid").textContent = "UPK v" + APP_VER + " · id " + (P.uuid||"—") + " · R" + (P.rev||1) +
                           " · " + P.materials.length + " material";
  $("sParts").innerHTML = items.length+'<i>dona</i>';
  $("sKg").innerHTML = items.reduce(function(s,i){ return s+i.kg; },0).toFixed(0)+'<i>kg</i>';
  // v10c: shapkada JAMI pochka soni turadi. Ilgari bu yerda faqat oddiy pochkalar
  // sanalardi (53) va u yon tarafdagi roʻyxatning «55 ta» yozuviga zid kelardi —
  // menejer qaysi raqamga ishonishni bilmasdi. Noodatiylar shu 55 ning ichida.
  $("sPacks").textContent = PACKS.length;
  $("sOdd").textContent = PACKS.filter(function(p){ return p.odd; }).length;
  $("sOdd").style.color = PACKS.some(function(p){ return p.odd; }) ? "var(--alert)" : "";

  /* v20: buyurtma hujjatining holati sozlamalarda doim yangi turadi —
     boshqaruvchi «Holatni tekshirish» ni bosmasdan ham nima qolganini koʻradi. */
  if (typeof orderNote === "function") { try { orderNote(); } catch(e){} }

  // AUDIT: har qayta hisobdan keyin invariantlar tekshiriladi va shapkada koʻrsatiladi
  var bd = $("auditBadge");
  if (bd && typeof auditPacks === "function"){
    try {
      LAST_AUDIT = auditPacks(PACKS, items);
      bd.innerHTML = auditBadgeHTML(LAST_AUDIT);
    } catch(e){
      LAST_AUDIT = null;
      bd.textContent = "—";
      if (window.console) console.warn("audit:", e);
    }
  }
}
var LAST_AUDIT = null;

/* 3.9.4 detallar jadvali — qidiruv bilan.
   215 qatorli roʻyxatda kerakli detalni koʻz bilan qidirib boʻlmaydi, shuning uchun
   jadval ustida filtr maydoni turadi: kod, nom, mahsulot, material va oʻlcham boʻyicha. */
var PART_Q = "";
function renderParts(){
  if (!P || !P.parts) return;
  var q = (PART_Q || "").trim().toLowerCase();
  var terms = q ? q.split(/\s+/) : [];
  var rows = ['<tr><th>Kod</th><th>Nomi</th><th>Mahsulot</th><th>Oʻlcham</th><th>Qal.</th><th>Dona</th><th>Massa, kg</th><th>Material</th><th>Kant</th><th>Holat</th></tr>'];
  var shown = 0, allN = 0, kgSum = 0;

  P.parts.forEach(function(p){
    var m = matOf(p.m), L=Math.max(p.l,p.w), W=Math.min(p.l,p.w);
    var kg = L*W/1e6*(m?m.kgm2:KGM2_FALLBACK);
    allN += p.q;
    if (terms.length){
      var hay = (p.c+" "+p.n+" "+p.p+" "+p.pc+" "+(m?m.name:"")+" "+L+"x"+W+" "+(m?m.t:"")).toLowerCase();
      for (var t=0;t<terms.length;t++) if (hay.indexOf(terms[t]) < 0) return;   // hamma soʻz topilsin
    }
    shown += p.q; kgSum += kg * p.q;
    var tag = L>S.maxLen ? '<span class="tag a">noodatiy · '+L+' mm</span>'
            : W<S.minBase ? '<span class="tag c">tag boʻlolmaydi</span>'
            : '<span class="tag b">oddiy</span>';
    rows.push('<tr><td class="m">'+esc(p.c)+'</td><td>'+esc(p.n)+'</td><td>'+esc(p.p)+'</td>'+
      '<td class="m">'+L+' × '+W+'</td><td class="m">'+(m?m.t:"—")+'</td><td class="m">'+p.q+'</td>'+
      // v10c: kant ustuni «T» / «TBR» kabi xom harflarni koʻrsatardi, holbuki ish
      // ekranida ayni shu maʼlumot «tepa, past, oʻng» deb tarjima qilinadi.
      '<td class="m">'+kg.toFixed(2)+'</td><td>'+esc(m?m.name:"—")+'</td><td>'+edgeText(p.e)+'</td><td>'+tag+'</td></tr>');
  });

  if (rows.length === 1)
    rows.push('<tr><td colspan="10" style="color:var(--ink3);padding:18px 12px">«'+esc(q)+'» boʻyicha detal topilmadi</td></tr>');

  $("tParts").innerHTML = rows.join("");
  var c = $("partCnt");
  if (c) c.textContent = terms.length
    ? (shown + " / " + allN + " dona · " + kgSum.toFixed(0) + " kg")
    : (allN + " dona · " + P.parts.length + " pozitsiya");
}

/* 3.9.5 material bazasi (list massasi ↔ kg/m²) */
function renderMats(){
  var box = $("matList"); box.innerHTML = "";
  P.materials.forEach(function(m,i){
    var sheetKg = (m.l*m.w/1e6*m.kgm2);
    var d = document.createElement("div");
    d.style.cssText = "background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:13px;margin-bottom:10px";
    d.innerHTML = '<div class="fields">'+
      // v10c: «XDF 2800x2070 mm 5.8 kv» kabi nomlar 190 px maydonga sigʻmasdi
      '<div class="f wide"><label>Nomi</label><input data-k="name" value="'+esc(m.name)+'"></div>'+
      '<div class="f"><label>Uzunlik, mm</label><input data-k="l" type="number" value="'+m.l+'"></div>'+
      '<div class="f"><label>Eni, mm</label><input data-k="w" type="number" value="'+m.w+'"></div>'+
      '<div class="f"><label>Qalinlik, mm</label><input data-k="t" type="number" step="0.1" value="'+m.t+'"></div>'+
      '<div class="f"><label>Bir list massasi, kg</label><input data-k="sheet" type="number" step="0.1" value="'+sheetKg.toFixed(2)+'"></div>'+
      '<div class="f"><label>kg / m²</label><input data-k="kgm2" type="number" step="0.01" value="'+m.kgm2+'"><small>ikkalasi bogʻliq</small></div>'+
      '</div>';
    d.querySelectorAll("input").forEach(function(inp){
      // v10: ilgari har bosilgan HARF uchun butun buyurtma qayta pochkalanardi
      // (100 variant × 4 urinish). Endi model darhol yangilanadi, qayta terish esa
      // kechiktirilgan va asinxron; maydonlar faqat fokus tark etilganda qayta chiziladi.
      inp.oninput = function(){
        var k = inp.dataset.k, v = inp.value;
        if (k==="name"){ m.name = v; return; }
        if (k==="sheet"){ var ar = m.l*m.w/1e6; m.kgm2 = ar ? +(parseFloat(v||0)/ar).toFixed(4) : 0; }
        else if (k==="kgm2"){ m.kgm2 = parseFloat(v||0) || 0; }
        else { m[k] = parseFloat(v||0) || 0; }
        if (typeof recomputeSoon === "function") recomputeSoon();
      };
      inp.onchange = function(){
        var k = inp.dataset.k;
        if (k==="sheet" || k==="kgm2" || k==="l" || k==="w") renderMats();
      };
    });
    box.appendChild(d);
  });
  if (typeof fixNumberInputs === "function") fixNumberInputs(box);
}

/* 3.9.5.1 MATERIAL QOʻSHISH — «+ Material qoʻshish» tugmasi (v9 da tugma bor edi, mantiq yoʻq) */
function addMaterial(){
  if (!P) return;
  var id = "m" + (Date.now() % 100000);
  P.materials.push({ id:id, name:"Yangi material", cat:null, sheets:0,
    l:SHEET_DEFAULT.l, w:SHEET_DEFAULT.w, t:SHEET_DEFAULT.t, kgm2:SHEET_DEFAULT.kgm2 });
  renderMats();
}

/* 3.9.6 chop etish va CSV eksport
   v10: chek oʻlchami sozlanadi. A4 — 2 ustun (oddiy printer); 100×70 va 58×40 — termal
   printer, har chek alohida varaqda. @page oʻlchami chop etishdan oldin joylashtiriladi. */
/* v20: chek oʻlchami endi QOʻLDA ham beriladi. Tayyor uch oʻlcham sexdagi har
   xil rulonga yetmasdi. `labelSize` qiymatlari:
     a4 | 100x70 | 80x60 | 58x40 | custom   (custom → S.labelW × S.labelH, mm)

   CSS sinflari: A4 uchun `sz-a4`, qolgan hammasi uchun `sz-lbl` (har chek alohida
   varaqda). Chek boʻyi 62 mm dan past boʻlsa qoʻshimcha `tiny` — shrift kichrayadi
   va detallar roʻyxati qisqaradi. Ilgari har oʻlcham uchun alohida CSS bloki bor
   edi va qoʻlda oʻlcham qoʻshilishi bilan ular yaroqsiz boʻlib qolardi. */
function labelMM(){
  var sz = S.labelSize || "a4";
  if (sz === "a4") return null;
  if (sz === "custom"){
    var w = +S.labelW || 80, h = +S.labelH || 60;
    return { w: Math.max(20, Math.min(300, w)), h: Math.max(20, Math.min(300, h)) };
  }
  var m = /^(\d+)x(\d+)$/.exec(sz);
  return m ? { w:+m[1], h:+m[2] } : null;
}
/* Chop etish chetlari, mm. `@page` faqat shu yerdan beriladi (style.css da
   ikkinchi nusxa yoʻq). Buyurtma hujjati kengroq chet oladi — u A4 da toʻliq
   jadval, ustunlar chetga tegib ketmasligi kerak (13-app.js `btnOrderDoc`). */
var A4_MARGIN = 8, LBL_MARGIN = 3, LBL_MARGIN_TINY = 2;

function applyPageSize(){
  var mm = labelMM();
  var sheet = $("sheet");
  sheet.className = mm ? ("sz-lbl" + (mm.h < 62 ? " tiny" : "")) : "sz-a4";
  var st = document.getElementById("pageStyle");
  if (!st){ st = document.createElement("style"); st.id = "pageStyle"; document.head.appendChild(st); }
  st.textContent = mm
    ? "@media print{@page{size:" + mm.w + "mm " + mm.h + "mm;margin:" +
      (mm.h < 62 ? LBL_MARGIN_TINY : LBL_MARGIN) + "mm}}"
    : "@media print{@page{size:A4;margin:" + A4_MARGIN + "mm}}";
}
function printSteps(list, title){
  if (!list || !list.length) return;
  applyPageSize();
  var head = (S.labelSize||"a4") === "a4"
    ? '<h2 style="font:600 13px sans-serif;margin:0 0 4mm">'+esc(title)+'</h2>' : '';
  var html = head + '<div class="lbls">';
  list.forEach(function(o,i){ html += labelHTML(o.p, o.s, "qrp"+i); });
  $("sheet").innerHTML = html + '</div>';
  list.forEach(function(o,i){ drawQR(document.getElementById("qrp"+i), qrText(o.p, o.s)); });
  setTimeout(function(){
    window.print();
    // v10: «Barcha cheklar» 291 ta canvas yaratadi (har biri ~440×440 px ≈ 0.75 MB).
    // Ilgari ular DOM da qolib ketardi — bir necha marta chop etilsa xotira toʻlardi.
    setTimeout(function(){ $("sheet").innerHTML = ""; }, 1000);
  }, 60);
}
function allSteps(){ var a=[]; PACKS.forEach(function(p){ p.seq.forEach(function(s){ a.push({p:p,s:s}); }); }); return a; }

/* v20: POCHKA CHEKI — yasash va chop etish AJRATILDI.
   Ajratilgani testga kerak: chek toʻgʻri yasalganini window.print() ni
   chaqirmasdan tekshirib boʻladi. */
function packLabelSheet(p){
  if (!p) return "";
  applyPageSize();
  var html = '<div class="lbls">' + packLabelHTML(p, "qpk") + '</div>';
  $("sheet").innerHTML = html;
  drawQR($("qpk"), packQR(p));
  return html;
}
function printPackLabel(p){
  if (!p) return;
  packLabelSheet(p);
  setTimeout(function(){ window.print(); }, 60);
}

function csv(){
  var rows = [["pochka","pochka_qalinlik","qavat","tartib","kod","nomi","mahsulot","uzunlik","eni","qalinlik","massa_kg","material","kant","qavat_toldirish_%","pochka_brutto_kg","pochka_gabarit","reviziya"]];
  PACKS.forEach(function(p){ p.seq.forEach(function(s,i){
    var it=s.it;
    rows.push([p.no, p.t||"", s.layer, i+1, it.code, it.name, it.prod, it.L, it.W, it.T, it.kg.toFixed(3), it.mat?it.mat.name:"", it.edges, s.fill!=null?Math.round(s.fill*100):"",
      packBrutto(p).toFixed(2), p.odd?"":p.gabL+"x"+p.gabW+"x"+Math.round(p.h), "R"+(p.rev||1)]);
  }); });
  /* yozib berishni dlCsv() bajaradi \u2014 ilgari bu yerda o\u02bbz nusxasi turardi va u
     URL.revokeObjectURL() ni chaqirmasdi: har eksportda blob xotirada qolib ketardi */
  dlCsv(rows, (P.name||"pochka")+"_pochkalar.csv");
}

/* 3.9.6.1 DETALLAR roʻyxatini CSV ga — joriy filtr hisobga olinadi */
function partsCsv(){
  if (!P || !P.parts) return;
  var q = (PART_Q||"").trim().toLowerCase(), terms = q ? q.split(/\s+/) : [];
  var rows = [["kod","nomi","mahsulot","mahsulot_kodi","uzunlik","eni","qalinlik","dona","massa_kg","material","kant"]];
  P.parts.forEach(function(p){
    var m = matOf(p.m), L=Math.max(p.l,p.w), W=Math.min(p.l,p.w);
    if (terms.length){
      var hay = (p.c+" "+p.n+" "+p.p+" "+p.pc+" "+(m?m.name:"")+" "+L+"x"+W+" "+(m?m.t:"")).toLowerCase();
      for (var t=0;t<terms.length;t++) if (hay.indexOf(terms[t]) < 0) return;
    }
    rows.push([p.c, p.n, p.p, p.pc, L, W, (m?m.t:""), p.q,
               (L*W/1e6*(m?m.kgm2:KGM2_FALLBACK)).toFixed(3), (m?m.name:""), p.e]);
  });
  dlCsv(rows, (P.name||"loyiha")+"_detallar.csv");
}
/* umumiy CSV yozib berish (Excel uchun ; ajratgich va BOM) */
function dlCsv(rows, fname){
  var txt = rows.map(function(r){
    return r.map(function(c){ return '"'+String(c==null?"":c).replace(/"/g,'""')+'"'; }).join(";");
  }).join("\n");
  var a = document.createElement("a");
  var url = URL.createObjectURL(new Blob(["﻿"+txt], {type:"text/csv;charset=utf-8"}));
  a.href = url; a.download = fname;
  /* Firefox faqat hujjatga QOʻSHILGAN havolani bosishga ruxsat beradi —
     11-diag.js dagi `diagSave()` da bu allaqachon hisobga olingan edi,
     bu yerda esa yoʻq: CSV eksporti Firefoxda jimgina ishlamasdi. */
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){
    try { if (a.parentNode) a.parentNode.removeChild(a); } catch(e){}
    URL.revokeObjectURL(url);
  }, 4000);
}

/* 3.9.7 QOʻLDA TAHRIRLASH — detal koʻchirish, himoyalar bilan */
function packMids(p){
  var arr=[]; p.layers.forEach(function(L){ L.items.forEach(function(q){ arr.push(q.it); }); });
  return arr;
}
/* v13: pochkaning qayta teriladigan holatini nusxalash/tiklash.
   `layoutPack()` yangi obyektlar yasaydi va eskilariga tegmaydi, shuning uchun
   yuzaki nusxa yetarli — eski qavatlar oʻz `items` massivi bilan butun qoladi. */
var PACK_FIELDS = ["layers","kg","envL","envW","off","left","seq","t","h",
                   "fillAvg","gabL","gabW","done"];
function packSave(p){
  var b = {};
  PACK_FIELDS.forEach(function(k){ b[k] = p[k]; });
  return b;
}
function packLoad(p, b){
  PACK_FIELDS.forEach(function(k){ p[k] = b[k]; });
}

/* ATOMIK qayta terish (v13). Ilgari `layoutPack()` sigʻdirolmagan detallar
   `np.left` ga tushib pochkadan chiqib ketardi, chaqiruvchi esa uni eʼtiborsiz
   qoldirardi — yaʼni qoʻlda koʻchirishda detal buyurtmadan JIMGINA yoʻqolishi
   mumkin edi (auditda keyin YOQOLGAN boʻlib chiqardi). Bu ayniqsa QUYRUQLI
   pochkada tez yuz beradi: quyruq qavati `minFill` dan oʻtmaydi, demak qayta
   terishda u albatta «ortiqcha» boʻlib qoladi.
   Endi qoida bitta: hammasi joylashsa — pochka yangilanadi; birortasi
   joylashmasa — pochka BUTUNLAY tegilmagan holda qoladi va qoldiq qaytariladi. */
function refreshPack(p, mids){
  var bak = packSave(p);
  // v14: nostandart oqimdan chiqqan pochka oʻz limitlari bilan qayta teriladi
  var sv = p.oddSrc ? oddLimitsOn() : null, np;
  /* `finally` SHART: layoutPack xato tashlasa nostandart limitlar S da
     qolib ketardi va butun interfeys 35 kg oʻrniga 40 kg koʻrsatardi. */
  try { np = layoutPack(p.base, mids, p.allowOvh, 0, 0); }
  finally { if (sv) oddLimitsOff(sv); }
  if (np.left.length){ packLoad(p, bak); return np.left; }
  p.layers=np.layers; p.envL=np.envL; p.envW=np.envW; p.off=np.off; p.left=[];
  // v15: qayta terilgach eng ustki qavat oʻzgaradi — TOM bayrogʻi yangilanadi
  markTom(p.layers, p.base, p.off);
  packDerive(p);
  /* v21: quyruq chiqib ketgan boʻlishi mumkin — zaxira belgisi ham tushadi.
     Aks holda pochka oʻzida quyruq boʻlmasa ham +10 kg huquqini saqlab
     qolardi va roʻyxatda «(zaxira)» yozuvi turaverardi. */
  if (p.overKg && p.kg <= packKgBase(p) + 1e-9) p.overKg = false;
  p.done = 0;      // v10: qayta terilgan pochkaning ketma-ketligi oʻzgardi — progress nolga
  return [];
}
function moveDetail(fromIdx, uid, toIdx){
  var src = PACKS[fromIdx];
  if (src.odd) return "noodatiy pochkadan koʻchirish hozircha yoʻq";
  if (src.base.uid === uid) return "tag detalni koʻchirib boʻlmaydi — u pochka asosi";
  // v10: yigʻilishi boshlangan pochkani tahrirlash — operator yarim yigʻilgan pochkaning
  // yangi ketma-ketligini davom ettirib xato qiladi. Shu sabab bloklaymiz.
  var dstP = (toIdx === "new") ? null : PACKS[toIdx];
  if (src.done > 0) return "P"+pad2(src.no)+" yigʻilishi boshlangan ("+src.done+" detal) — " +
                           "avval «← Orqaga» bilan boshiga qaytaring";
  if (dstP && dstP.done > 0) return "P"+pad2(dstP.no)+" yigʻilishi boshlangan — u yerga qoʻshib boʻlmaydi";
  var it = null;
  src.layers.forEach(function(L){ L.items.forEach(function(q){ if (q.it.uid===uid) it=q.it; }); });
  if (!it) return "detal topilmadi";

  if (toIdx === "new"){
    // v14: tag oynasi — toʻrt chegara birdan
    if (it.W < S.minBase || it.W > (S.baseWMax||1e9) ||
        it.L < (S.baseLMin||0) || it.L > S.maxLen || it.T < (S.minBaseT||0))
      return "bu detal yangi pochkaga tag boʻlolmaydi ("+it.L+"×"+it.W+"×"+it.T+" mm)";
    // v13: manba pochka detalsiz qayta terilmasa — koʻchirish umuman boshlanmaydi
    var nLeft = refreshPack(src, packMids(src).filter(function(x){ return x.uid!==uid; }));
    if (nLeft.length)
      return "P"+pad2(src.no)+" bu detalsiz qayta terilmadi — "+nLeft.length+" detal joysiz qolardi";
    var np = layoutPack(it, [], S.ovhOn, 0, 0);
    np.no = PACKS.length+1; np.rev = P.rev || 1; np.done = 0;
    packDerive(np);
    // v12: yangi pochka manba pochkaning GURUHINI meros oladi. Ilgari gname
    // yozilmasdi va packGrpName() base.prod ga tushib ketardi — konveyrda
    // qoʻlda yasalgan pochka «Umumiy» ostida emas, modul nomi bilan alohida
    // sarlavha boʻlib chiqib roʻyxatni ikkiga boʻlardi.
    np.gname = src.gname; np.key = src.key; np.room = src.room;
    PACKS.push(np);
    return null;
  }
  var dst = PACKS[toIdx];
  if (dst === src) return "oʻsha pochkaning oʻzi";
  if (dst.odd) return "noodatiy pochkaga qoʻshib boʻlmaydi";
  // v12: GURUH CHEGARASI. Pochkalash kaliti (modul/material/qalinlik/klass) —
  // buyurtma qaysi oʻq boʻyicha boʻlinishi kerakligi haqidagi QAROR. Ilgari
  // tahrirlash uni umuman tekshirmasdi: konveyrda ikki material bitta pochkaga
  // tushardi, individualda ikki modul aralashardi, audit esa buni koʻrmasdi —
  // yaʼni bir bosishda butun rejimning maʼnosi yoʻqolardi.
  var rule = S.split || { prod:true, mat:false };
  if (dst.key && packKey(it, rule) !== dst.key)
    return keyWhy(it, dst.base, rule) || "boshqa guruhga tegishli detal";
  /* v21: qalinlik MATRITSA boʻyicha solishtiriladi. Ilgari bu yerda xom
     `dst.t !== it.T` turardi va u matritsaga zid edi: «3 mm → 16 mm
     pochkasiga» belgilangan boʻlsa ham qoʻlda koʻchirish rad etardi,
     holbuki packer ularni ataylab bitta pochkaga qoʻyadi. */
  if (S.byThick && thickKey(dst.t) !== thickKey(it.T))
    return "qalinlik mos emas: pochka "+dst.t+" mm, detal "+it.T+" mm";
  // v14: yupqa tag ustiga qalin detal qoʻyib boʻlmaydi (04-packer thickOKon)
  if (!thickOKon(dst.base, it.T))
    return "tag " + dst.base.T + " mm — " + it.T + " mm detal ustiga qoʻyilmaydi";
  var cap = packKgCap(dst);        // v14: nostandart pochkada limit boshqa
  if (dst.kg + it.kg > cap + 1e-9) return "sigʻmaydi: "+(dst.kg+it.kg).toFixed(1)+" kg > "+cap+" kg";
  // v13: ikkala pochka ham atomik yangilanadi. Nishonga qoʻshib boʻlmasa — u
  // tegilmagan qoladi; manba qayta terilmasa — nishon ham eski holatiga qaytadi.
  var dstBak = packSave(dst);
  var left = refreshPack(dst, packMids(dst).concat([it]));
  if (left.length)
    return "geometrik sigʻmadi: detal "+dst.base.L+"×"+dst.base.W+" tag ustiga tushmaydi";
  var srcLeft = refreshPack(src, packMids(src).filter(function(x){ return x.uid!==uid; }));
  if (srcLeft.length){
    packLoad(dst, dstBak);
    return "P"+pad2(src.no)+" bu detalsiz qayta terilmadi — "+srcLeft.length+" detal joysiz qolardi";
  }
  return null;
}
/* v12: QOʻLDA TAHRIRLASH ENDI FAQAT P/M DA.
   Ilgari «Tahrirlash» tugmasi Qadoqlash ekranida — 3D sahnaning ustida — turardi
   va upakovshik pochkani oʻzgartira olardi. TZ-v2 §1 buni aniq man qiladi:
   «Tahrirlash faqat P/M da. Pochkalash posti ishchisi hech narsani oʻzgartira
   olmaydi.» Shu sabab butun blok menejerga koʻchdi va oʻz pochka tanlovini oldi —
   u endi Qadoqlash ekranidagi CUR ga bogʻliq emas. */
var MGR_CUR = 0;
function renderMgrEdit(){
  var box = $("mgrEdit"); if (!box) return;
  if (!PACKS.length){ box.innerHTML = '<div class="note">Pochka yoʻq.</div>'; return; }
  if (MGR_CUR < 0 || MGR_CUR >= PACKS.length) MGR_CUR = 0;
  var p = PACKS[MGR_CUR];

  var pickOpts = PACKS.map(function(q,i){
    return '<option value="'+i+'"'+(i===MGR_CUR?' selected':'')+'>P'+pad2(q.no)+' · '+
      esc(packGrpName(q))+' · '+q.kg.toFixed(1)+' kg</option>';
  }).join("");

  /* koʻchirish roʻyxati GURUH boʻyicha kesiladi. Faqat rad etish yetarli emas edi:
     55 pochkali buyurtmada P/M ga 3 ta haqiqiy variant oʻrniga 54 ta variant
     koʻrinardi va ularning deyarli hammasi xato bilan qaytardi. */
  var opts = PACKS.map(function(q,i){
    if (i===MGR_CUR || q.odd) return "";
    if (S.byThick && q.t!==p.t) return "";
    if (p.key && q.key && q.key !== p.key) return "";
    return '<option value="'+i+'">P'+pad2(q.no)+' · '+q.kg.toFixed(1)+' kg</option>';
  }).join("") + '<option value="new">+ yangi pochka</option>';

  var rows = "";
  if (!p.odd){
    rows += '<div class="edrow base"><div><span class="mono">'+esc(p.base.code)+'</span> · '+
      p.base.L+'×'+p.base.W+' · '+p.base.kg.toFixed(1)+' kg'+
      '<small>TAG — koʻchirilmaydi</small></div><div></div></div>';
    p.layers.forEach(function(L,li){
      L.items.forEach(function(q){
        rows += '<div class="edrow"><div><span class="mono">'+esc(q.it.code)+'</span> · '+
          q.it.L+'×'+q.it.W+' · '+q.it.kg.toFixed(2)+' kg'+
          '<small>'+(L.tail?"quyruq":L.lid?"qopqoq":(li+1)+"-qavat")+' · '+esc(unitLabel(q.it.unit, q.it.unitName))+'</small></div>'+
          '<div style="display:flex;gap:5px"><select data-uid="'+esc(q.it.uid)+'">'+opts+'</select>'+
          '<button class="btn" data-mv="'+esc(q.it.uid)+'">→</button></div></div>';
      });
    });
  } else {
    rows = '<div class="note">Noodatiy pochka — koʻchirish faqat oddiy pochkalarda.</div>';
  }

  var room = packRoom(p);
  box.innerHTML =
    '<div class="edhead">'+
      '<select id="mgrEditPack">'+pickOpts+'</select>'+
      '<span class="grphint">'+(room ? esc(room)+' · ' : '')+esc(packGrpName(p))+' · '+
        p.kg.toFixed(1)+' / '+S.maxKg+' kg · '+p.seq.length+' detal</span>'+
    '</div>'+
    '<div class="msg" id="emsg"></div>'+
    '<div class="edlist">'+rows+'</div>';

  $("mgrEditPack").onchange = function(){ MGR_CUR = parseInt(this.value,10) || 0; renderMgrEdit(); };
  [].slice.call(box.querySelectorAll("[data-mv]")).forEach(function(b){
    b.onclick = function(){
      var uid = b.dataset.mv;
      var sel = box.querySelector('select[data-uid="'+uid+'"]');
      var to = sel.value==="new" ? "new" : parseInt(sel.value,10);
      var err = moveDetail(MGR_CUR, uid, to);
      var m = $("emsg");
      if (err){ m.className="msg err"; m.textContent = err; return; }
      m.className="msg ok"; m.textContent = "koʻchirildi ✓";
      /* v21: detal boshqa pochkaga oʻtdi — uning eski yacheykadagi belgisi
         endi yolgʻon. `SORT.put[uid]` manba pochkaning yacheykasini
         koʻrsatib turardi, yaʼni saralash ekrani detalni «allaqachon
         joyida» deb hisoblardi. Belgi olinadi: detal qayta skanerlanadi. */
      if (typeof SORT === "object" && SORT && SORT.put) delete SORT.put[uid];
      // v12: pochka tarkibi oʻzgardi — yacheyka rejasi sortPlan() ichida
      // packLeft() ga tayanadi, shuning uchun u ham qayta hisoblanishi shart
      if (typeof sortPlan === "function") sortPlan();
      renderPacks(); stats(); renderMgrEdit();
      if (CUR >= 0){ renderStep(); draw3D(); draw2D(); }
    };
  });
}

/* 3.9.8 PROEKT MENEJER — honalar, tur, yuklash modali */
/* v12: BIRLIKLAR roʻyxati. Belgi proekt tuzilishidan olinadi (unitOf) —
   manba tanlovi yoʻq, shuning uchun bu yerda ham shart yoʻq. */
function roomStats(){
  var rooms = {};
  P.parts.forEach(function(p){
    var m = matOf(p.m), L=Math.max(p.l,p.w), W=Math.min(p.l,p.w);
    var kg = L*W/1e6*(m?m.kgm2:KGM2_FALLBACK)*p.q;
    var u = unitOf(p);
    // prod — modelning nomi; kartada ikkinchi qatorda koʻrsatiladi.
    var r = rooms[u] = rooms[u] || { code:u, name:unitName(p), prod:(p.p||""), n:0, kg:0 };
    r.n += p.q; r.kg += kg;
  });
  return Object.keys(rooms).sort().map(function(k){ return rooms[k]; });
}
function renderMgr(){
  var items = buildItems();
  $("mgrInfo").innerHTML = '<b>'+esc(P.name)+'</b> · id '+esc(P.uuid||'—')+
    ' — jami <b>'+P.parts.reduce(function(s,p){ return s+p.q; },0)+'</b> detal, faol: <b>'+items.length+
    '</b> detal / <b>'+items.reduce(function(s,i){ return s+i.kg; },0).toFixed(0)+' kg</b> · '+
    P.materials.length+' material';
  // v12: rejim tanlovi olib tashlandi — kesim katakchalari bevosita S.split ni
  // koʻrsatadi, oʻrtada sinxronlanadigan ikkinchi holat yoʻq
  if ($("mgrByRoom")) $("mgrByRoom").checked = !!(S.split && S.split.prod);
  if ($("mgrByMat"))  $("mgrByMat").checked  = !!(S.split && S.split.mat);
  renderUnitSrc();
  var box = $("mgrRooms"); box.innerHTML = "";
  roomStats().forEach(function(r){
    var on = !(S.rooms && S.rooms[r.code] === false);
    var rm = roomOf(r.code);
    var d = document.createElement("div");
    d.style.cssText = "background:var(--panel);border:1px solid "+(on?"var(--line2)":"var(--line)")+
      ";border-left:3px solid "+(on?"var(--mark)":"var(--line)")+";border-radius:var(--r);padding:11px 13px"+(on?"":";opacity:.5");
    /* v12: kartada MODUL NOMI tahrirlanadi. Fayl faqat «01» beradi — odam
       oʻqiydigan nomni P/M yozadi va u chekka ham, roʻyxatga ham chiqadi.
       Kod har doim koʻrinib turadi: skanerda va xatolarda aynan u ishlatiladi. */
    d.innerHTML = '<div style="display:flex;align-items:center;gap:9px">'+
      '<input type="checkbox" '+(on?"checked":"")+' style="accent-color:var(--mark);width:15px;height:15px;flex:0 0 auto">'+
      '<div style="min-width:0;flex:1">'+
        '<div style="display:flex;align-items:center;gap:7px">'+
          '<b style="font-family:var(--mono);font-size:13px;color:var(--ink2)">'+esc(r.code)+'</b>'+
          '<input type="text" class="unitname" placeholder="nom bering…" value="'+esc(S.unitNames&&S.unitNames[r.code]?S.unitNames[r.code]:"")+'">'+
        '</div>'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--ink3);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+
        r.n+' detal · '+r.kg.toFixed(0)+' kg'+
        (rm ? ' · <span style="color:var(--mark)">'+esc(rm.name)+(rm.join?' (birga)':'')+'</span>' : '')+
        (r.prod && r.prod !== r.code ? ' · '+esc(r.prod) : '')+'</div>'+
      '</div></div>';
    d.querySelector('input[type=checkbox]').onchange = function(e){
      S.rooms = S.rooms || {};
      S.rooms[r.code] = e.target.checked;
      renderMgr();
    };
    var ni = d.querySelector(".unitname");
    // nom yozilayotganda qayta hisoblamaymiz — har harfda 55 pochka qayta terilardi
    ni.onchange = function(){
      S.unitNames = S.unitNames || {};
      var v = String(ni.value || "").trim();
      if (v) S.unitNames[r.code] = v; else delete S.unitNames[r.code];
      saveConf(); renderMgr(); recomputeSoon();
    };
    box.appendChild(d);
  });
  $("mgrRoomN").textContent = roomStats().length;
  renderMgrEdit();          // v12: qoʻlda tuzatish bloki — faqat shu boʻlimda
  // klasslar
  var cb = $("mgrCls"); cb.innerHTML = "";
  var cs = classStats();
  $("mgrClsN").textContent = cs.length;
  cs.forEach(function(c){
    // v11: guruhga kirgan klass sepCls dan chiqarilgan — bu holat roʻyxatda ham
    // koʻrinishi kerak, aks holda FASAD belgisiz turadi-yu, pastdagi chipda
    // «FASAD + TOM» yozuvi boʻladi va foydalanuvchi ziddiyat deb oʻylaydi
    var g = clsGroupOf(c.cls);
    var on = !!S.sepCls[c.cls];
    var d2 = document.createElement("label");
    d2.style.cssText = "display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid "+
      ((on||g)?"var(--mark)":"var(--line)")+";border-radius:var(--r);padding:9px 12px;cursor:"+
      (g?"default":"pointer")+((on||g)?"":";opacity:.75");
    d2.innerHTML = '<input type="checkbox" '+(on?"checked":"")+(g?" disabled":"")+
      ' style="accent-color:var(--mark);width:15px;height:15px">'+
      '<span style="font-family:var(--mono);font-size:12.5px">'+esc(c.cls)+
      ' <i style="color:'+(g?"var(--mark)":"var(--ink3)")+';font-style:normal">· '+
      (g ? grpLetter(+g.slice(2))+" guruhda" : c.n)+'</i></span>';
    d2.querySelector("input").onchange = function(e){
      if (e.target.checked) S.sepCls[c.cls] = true; else delete S.sepCls[c.cls];
      renderMgr();
    };
    cb.appendChild(d2);
  });
  renderGroups();
}

/* ============================================================
   3.9.10b v11 GURUHLAR — modul va klass toʻplamlari
   Nega kerak: konveyr ishlab chiqarishda spalniy komplekt tumba, tremo, shkaf,
   krovat modullaridan iborat. Ularning bir qismi alohida, bir qismi birga
   pochkalanishi kerak. Ilgari tizimda faqat «hammasi alohida» yoki «hammasi
   aralash» bor edi — oraliq holat yoʻq edi.
   ============================================================ */

/* v12: MODUL BELGISI QAYERDAN OLINGANI — qaror asosi koʻrinishi SHART.
   Tanlov yoʻq, tizim oʻzi hal qiladi (unitSrc, 02-state.js). Lekin P/M nima
   uchun 5 ta modul chiqqanini bilishi kerak: aks holda natija sehr boʻlib
   qoladi va u chek-listni ishonch bilan ishlata olmaydi. */
function renderUnitSrc(){
  var e = $("mgrUnitSrc"); if (!e || !P || !P.parts) return;
  var goods = {}, pres = {};
  P.parts.forEach(function(p){
    goods[p.pc] = 1;
    var u = unitPrefix(p.c);
    if (u) pres[u] = 1;
  });
  var ng = Object.keys(goods).length, np = Object.keys(pres).length;
  var src = unitSrc(), n = roomStats().length;
  e.style.borderLeftColor = "var(--info)";
  e.innerHTML = (src === "code")
    ? '<b>'+n+' ta modul — detal kodi prefiksidan.</b> Faylda mahsulot tuzilishi '+
      'faqat <b>'+ng+' ta</b> birlik beradi, kod prefiksi esa <b>'+np+' ta</b> — '+
      'shuning uchun kod olindi.'
    : '<b>'+n+' ta modul — proekt tuzilishidan</b> (<code>good typeId="product"</code>). '+
      (np ? 'Kod prefiksi '+np+' ta birlik berardi — tuzilishdan koʻp emas.'
          : 'Detal kodlarida ajratgich yoʻq.');
}

/* Guruhdagi modul kodlarini oʻqiladigan nomga aylantirish */
function modName(code){
  var r = roomStats();
  for (var i=0;i<r.length;i++) if (r[i].code === code) return r[i].name || code;
  return code;
}
/* Bir chipni chizish — modul va klass guruhlari uchun bir xil koʻrinish */
function grpChipHTML(i, names, kind){
  return '<div class="grpchip"><b>'+grpLetter(i)+'</b><span>'+esc(names.join(" + "))+'</span>'+
         '<button type="button" data-'+kind+'="'+i+'" title="guruhni buzish">✕</button></div>';
}

function renderGroups(){
  var rooms = roomStats().filter(function(r){ return !(S.rooms && S.rooms[r.code] === false); });
  S.modGroups = S.modGroups || []; S.clsGroups = S.clsGroups || [];

  // --- modul tanlash katakchalari ---
  var wrap = $("mgrModGrpWrap");
  if (wrap) wrap.style.display = rooms.length > 1 ? "" : "none";   // bitta modulda guruh maʼnosiz
  var pick = $("mgrModPick");
  if (pick){
    pick.innerHTML = rooms.map(function(r){
      var rm = roomOf(r.code);
      return '<label'+(rm?' class="on"':'')+'><input type="checkbox" data-mod="'+esc(r.code)+'"'+
        (rm?' disabled':'')+'><span>'+esc(r.name)+'</span>'+
        (rm ? '<i>'+esc(rm.name)+'</i>' : '<i>'+r.n+' detal</i>')+'</label>';
    }).join("");
  }
  /* v12: XONA chipi — nomi, aʼzolari va «birga pochkalansin» holati.
     Bayroq chipning oʻzida almashtiriladi: P/M xonani buzib qayta yaratmasin. */
  var mg = $("mgrModGrps");
  if (mg) mg.innerHTML = S.modGroups.map(function(g,i){
    var join = g.join !== false;
    return '<div class="grpchip"><b>'+grpLetter(i)+'</b>'+
      '<span><u style="text-decoration:none;color:var(--mark)">'+esc(g.name || ("Xona "+grpLetter(i)))+'</u>'+
      ' · '+esc(g.mods.map(modName).join(" + "))+'</span>'+
      '<button type="button" class="joinbtn'+(join?" on":"")+'" data-join="'+i+'" '+
      'title="birga pochkalansinmi">'+(join ? "birga" : "alohida")+'</button>'+
      '<button type="button" data-mg="'+i+'" title="xonani buzish">✕</button></div>';
  }).join("");
  var mh = $("mgrModHint");
  if (mh) mh.textContent = S.modGroups.length
    ? S.modGroups.length+" ta xona — «birga» boʻlsa aʼzolari bitta pochkaga tushadi, "+
      "«alohida» boʻlsa faqat roʻyxat va chekda belgilanadi"
    : "kamida 2 ta modul belgilang va xonaga nom bering";

  // --- klass guruhlari ---
  var cg = $("mgrClsGrps");
  if (cg) cg.innerHTML = S.clsGroups.map(function(g,i){
    return grpChipHTML(i, g.cls, "cg");
  }).join("");
  var ch = $("mgrClsHint");
  if (ch) ch.textContent = S.clsGroups.length
    ? S.clsGroups.length+" ta toʻplam — toʻplam aʼzolari oʻzaro aralashadi, qolganidan ajraladi"
    : "yuqorida kamida 2 ta klassni belgilang";

  // xonani buzish va «birga / alohida» almashtirish
  [].slice.call(document.querySelectorAll("#mgrModGrps button")).forEach(function(b){
    if (b.dataset.mg != null){
      b.onclick = function(){ S.modGroups.splice(+b.dataset.mg, 1); saveConf(); renderMgr(); recomputeSoon(); };
    } else if (b.dataset.join != null){
      b.onclick = function(){
        var g = S.modGroups[+b.dataset.join]; if (!g) return;
        g.join = (g.join === false);          // alohida ⇄ birga
        saveConf(); renderMgr(); recomputeSoon();
      };
    }
  });
  [].slice.call(document.querySelectorAll("#mgrClsGrps button")).forEach(function(b){
    b.onclick = function(){ S.clsGroups.splice(+b.dataset.cg, 1); renderMgr(); recomputeSoon(); };
  });
}

/* v12: «Xona yaratish» — belgilangan modullardan xona.
   join — xona birga pochkalanadimi (zal: kuxnya + pod-TV + shkaf aralash) yoki
   nom faqat belgi boʻlib qoladimi (yotoqxona: har mebel oʻz pochkasida). */
function makeModGroup(){
  var sel = [].slice.call(document.querySelectorAll("#mgrModPick input:checked"))
              .map(function(c){ return c.dataset.mod; });
  if (sel.length < 2){ mgrFlash("mgrModHint", "kamida 2 ta modul belgilang"); return; }
  var ne = $("mgrRoomName");
  var nm = ne ? String(ne.value || "").trim() : "";
  if (!nm){ mgrFlash("mgrModHint", "xonaga nom bering — u chekda va roʻyxatda turadi"); return; }
  var je = $("mgrRoomJoin");
  S.modGroups = S.modGroups || [];
  S.modGroups.push({ mods: sel, name: nm, join: !!(je && je.checked) });
  if (ne) ne.value = "";
  if (je) je.checked = false;
  saveConf(); renderMgr(); recomputeSoon();
}
/* «Belgilanganlarni birga pochkalash» — klasslar.
   Manba: yuqoridagi klass katakchalari (S.sepCls). Guruhga kirgan klasslar
   sepCls dan chiqariladi — ular endi toʻplam sifatida ajraladi. */
function makeClsGroup(){
  var sel = Object.keys(S.sepCls || {}).filter(function(c){ return S.sepCls[c] && !clsGroupOf(c); });
  if (sel.length < 2){ mgrFlash("mgrClsHint", "yuqorida kamida 2 ta klassni belgilang"); return; }
  S.clsGroups = S.clsGroups || [];
  S.clsGroups.push({ cls: sel });
  sel.forEach(function(c){ delete S.sepCls[c]; });
  renderMgr(); recomputeSoon();
}
/* qisqa xato izohi — 4 soniyada oʻz oʻrniga qaytadi */
function mgrFlash(id, msg){
  var e = $(id); if (!e) return;
  var old = e.textContent;
  e.textContent = msg; e.style.color = "var(--alert)";
  setTimeout(function(){ e.textContent = old; e.style.color = ""; }, 4000);
}

/* 3.9.11 MATERIAL KATALOGI UI */
function renderCat(){
  var box = $("catList"); if (!box) return;
  box.innerHTML = "";
  (S.matCat||[]).forEach(function(c, i){
    var sheetKg = (c.l*c.w/1e6*c.kgm2) || 0;
    var d = document.createElement("div");
    d.className = "catcard";
    // v10: «Oʻchirish» ilgari maydonlar panjarasida turib, qatorning qolgan 5 katagini
    // boʻsh qoldirardi va buzgʻunchi amal eng koʻzga koʻringan tugma edi.
    // Endi u sarlavhada, kichik va xiralashgan.
    d.innerHTML = '<div class="cathead"><b>'+esc(c.key || "—")+'</b>'+
        '<button class="btn del" data-del="'+i+'">Oʻchirish</button></div>'+
      '<div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">'+
      '<div class="f"><label>Kalit soʻz</label><input data-k="key" value="'+esc(c.key)+'"><small>nomda shu soʻz boʻlsa qoʻllanadi</small></div>'+
      '<div class="f"><label>Qalinlik, mm</label><input data-k="t" type="number" step="0.1" value="'+c.t+'"><small>0 = istalgan</small></div>'+
      '<div class="f"><label>List uzunligi</label><input data-k="l" type="number" value="'+c.l+'"></div>'+
      '<div class="f"><label>List eni</label><input data-k="w" type="number" value="'+c.w+'"></div>'+
      '<div class="f"><label>List kilosi</label><input data-k="sheet" type="number" step="0.1" value="'+sheetKg.toFixed(2)+'"></div>'+
      '<div class="f"><label>kg/m²</label><input data-k="kgm2" type="number" step="0.01" value="'+c.kgm2+'"><small>oʻzaro bogʻliq</small></div>'+
      '</div>';
    d.querySelectorAll("input").forEach(function(inp){
      inp.oninput = function(){
        var k = inp.dataset.k, v = inp.value;
        if (k==="key"){ c.key = v; return; }
        if (k==="sheet"){ var ar = (c.l*c.w/1e6)||1; c.kgm2 = +(parseFloat(v||0)/ar).toFixed(4); }
        else c[k] = parseFloat(v||0) || 0;
      };
      // qayta chizish faqat fokus tark etilganda — aks holda yozayotganda kursor yoʻqoladi
      inp.onchange = function(){
        var k = inp.dataset.k;
        if (k==="sheet"||k==="kgm2"||k==="l"||k==="w"||k==="key") renderCat();
      };
    });
    d.querySelector("[data-del]").onclick = function(){ S.matCat.splice(i,1); renderCat(); };
    box.appendChild(d);
  });
  if (typeof fixNumberInputs === "function") fixNumberInputs(box);
}

/* 3.9.12 katalogni joriy loyihaga qoʻllash */
function applyCat(){
  if (!P) return 0;
  var hit = 0;
  P.materials.forEach(function(m){
    var c = catLookup(m.name, m.t);
    if (c){ m.kgm2 = c.kgm2; m.cat = c.key; hit++; }
  });
  return hit;
}