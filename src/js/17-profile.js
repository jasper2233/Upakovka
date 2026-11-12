/* ============================================================
   3.18 NOMLANGAN PROFIL — meʼyorlar toʻplami (v22, TZ-v3 §3.3)
   ============================================================
   TZ-v2 §2: «sozlama bir marta qilinadi va eslab qolinadi». Bitta tsexda bir
   necha xil buyurtma oqimi boʻladi — masalan «Mijozga» (modul ajratiladi, tom
   qattiq) va «Omborga» (buyurtma boʻyicha, zich). Profil — shu meʼyorlarning
   NOMLANGAN toʻplami: tanlansa hamma maydon bir yoʻla oʻrnatiladi.

   Profilga KIRADI: Sozlamalar ekranidagi meʼyorlar, modul/material kesimi,
   material katalogi, qalinlik matritsasi, klass guruhlari.
   KIRMAYDI: shu kompyuterga xos narsalar (stelyaj va yacheykalar, chek
   printeri, QR prefiksi) va buyurtmaga xos narsalar (modul nomlari, modul
   guruhlari, yopiq yacheykalar).

   Loyiha yuklanganda profil oʻzi taklif qilinadi: profilning «kalit soʻzi»
   loyiha yoki fayl nomida boʻlsa (kirillcha ham — translit).
   ============================================================ */
var PROF_KEY = "upk_profiles";
var PROF_SKIP = { cRackN:1, cCellN:1, cCellW:1, cCellD:1, cBigN:1, cBigW:1, cBigD:1, cCellH:1,
                  cLabel:1, cLabelW:1, cLabelH:1, cAutoLbl:1, cPrefix:1 };
var PROF_DEL_ARM = null;

function profClone(v){ return JSON.parse(JSON.stringify(v)); }
function profAll(){
  try {
    var o = JSON.parse(localStorage.getItem(PROF_KEY) || "{}");
    return (o && typeof o === "object" && !isArr(o)) ? o : {};
  } catch(e){ return {}; }
}
function profWrite(o){
  try { localStorage.setItem(PROF_KEY, JSON.stringify(o)); return true; } catch(e){ return false; }
}
function profNames(){ return Object.keys(profAll()).sort(function(a, b){ return a.localeCompare(b); }); }

/* Joriy meʼyorlar — FORMADAN (foydalanuvchi koʻrib turgani) */
function profCapture(){
  var f = {};
  CONF_IDS.forEach(function(id){
    if (PROF_SKIP[id]) return;
    var e = $(id); if (!e) return;
    f[id] = e.type === "checkbox" ? e.checked : e.value;
  });
  return { f:f, matCat:profClone(S.matCat || []), thickMix:profClone(S.thickMix || {}),
           clsGroups:profClone(S.clsGroups || []) };
}
function profSave(name, match){
  name = String(name || "").trim();
  if (!name) return "profil nomini kiriting";
  if (name.length > 40) return "nom juda uzun (40 belgigacha)";
  var all = profAll(), p = profCapture();
  p.match = String(match || "").trim();
  p.ts = Date.now();
  all[name] = p;
  if (!profWrite(all)) return "profil saqlanmadi — brauzer xotirasi yopiq yoki toʻlgan";
  S.profile = name;
  if (typeof saveConf === "function") saveConf();
  return null;
}
/* Profilni qoʻllash. noRe — qayta pochkalanmasin (yuklash oynasida: boot oʻzi hisoblaydi). */
function profApply(name, noRe){
  var p = profAll()[name];
  if (!p) return "«" + name + "» profili topilmadi";
  Object.keys(p.f || {}).forEach(function(id){
    if (PROF_SKIP[id]) return;
    var e = $(id); if (!e) return;
    if (e.type === "checkbox") e.checked = !!p.f[id]; else e.value = p.f[id];
  });
  if (isArr(p.matCat) && p.matCat.length) S.matCat = profClone(p.matCat);
  if (p.thickMix && typeof p.thickMix === "object") S.thickMix = profClone(p.thickMix);
  if (isArr(p.clsGroups)) S.clsGroups = profClone(p.clsGroups);
  S.profile = name;
  if ($("cTomQ") && typeof tomFields === "function") tomFields($("cTomQ").value);
  if (typeof renderCat === "function") renderCat();
  if (!noRe){
    if (P) recompute(); else readConf();
    if (typeof renderMgr === "function" && P) renderMgr();
  }
  if (typeof saveConf === "function") saveConf();
  profUi();
  return null;
}
function profDel(name){
  var all = profAll();
  if (!all[name]) return "«" + name + "» profili topilmadi";
  delete all[name];
  if (!profWrite(all)) return "oʻchirib boʻlmadi";
  if (S.profile === name){ S.profile = ""; if (typeof saveConf === "function") saveConf(); }
  return null;
}
/* Loyiha/fayl nomiga mos profil: kalit soʻzlardan biri nomda boʻlsa */
function profMatch(text){
  var u = translit(text), all = profAll(), names = profNames();
  for (var i = 0; i < names.length; i++){
    var ws = String(all[names[i]].match || "").split(",");
    for (var j = 0; j < ws.length; j++){
      var w = translit(ws[j].trim());
      if (w && u.indexOf(w) >= 0) return names[i];
    }
  }
  return "";
}

/* ---- Sozlamalar ekrani ---- */
function profNote(kind, txt){
  var n = $("profNote"); if (!n) return;
  n.className = "msg " + (kind || "");
  n.textContent = txt || "";
}
function profUi(){
  var sel = $("profSel"); if (!sel) return;
  var names = profNames(), cur = S.profile || "";
  sel.innerHTML = '<option value="">' + (names.length ? "— profil tanlang —" : "— hali profil yoʻq —") + '</option>' +
    names.map(function(n){ return '<option value="' + esc(n) + '"' + (n === cur ? " selected" : "") + '>' + esc(n) + '</option>'; }).join("");
  var c = $("profCur");
  if (c) c.textContent = cur && names.indexOf(cur) >= 0 ? "joriy: " + cur : "";
  var p = profAll()[sel.value];
  if ($("profMatch") && p && document.activeElement !== $("profMatch")) $("profMatch").value = p.match || "";
  if ($("btnProfDel")) $("btnProfDel").textContent = (PROF_DEL_ARM && PROF_DEL_ARM === sel.value) ? "Rostdan oʻchirilsinmi?" : "Oʻchirish";
}
function profInit(){
  var sel = $("profSel");
  if (sel) sel.onchange = function(){ PROF_DEL_ARM = null; profUi(); var nm = $("profName"); if (nm && sel.value) nm.value = sel.value; };
  if ($("btnProfApply")) $("btnProfApply").onclick = function(){
    var v = sel ? sel.value : "";
    if (!v){ profNote("err", "profil tanlanmagan"); return; }
    var e = profApply(v);
    profNote(e ? "err" : "ok", e || ("«" + v + "» qoʻllandi" + (P && typeof REPACK_WAIT !== "undefined" && REPACK_WAIT ? " — qayta pochkalash tasdiq kutmoqda" : "")));
  };
  if ($("btnProfSave")) $("btnProfSave").onclick = function(){
    var nm = ($("profName") && $("profName").value) || (sel && sel.value) || "";
    var e = profSave(nm, $("profMatch") ? $("profMatch").value : "");
    profUi();
    profNote(e ? "err" : "ok", e || ("«" + String(nm).trim() + "» profili saqlandi — joriy meʼyorlar bilan"));
  };
  if ($("btnProfDel")) $("btnProfDel").onclick = function(){
    var v = sel ? sel.value : "";
    if (!v){ profNote("err", "profil tanlanmagan"); return; }
    if (PROF_DEL_ARM !== v){ PROF_DEL_ARM = v; profUi(); return; }   // ikkinchi bosish — tasdiq
    PROF_DEL_ARM = null;
    var e = profDel(v);
    profUi();
    profNote(e ? "err" : "ok", e || ("«" + v + "» oʻchirildi"));
  };
  profUi();
}

/* ---- Yuklash oynasi: profil taklifi ---- */
function profModal(text){
  var box = $("mProf"); if (!box) return;
  var names = profNames();
  if (!names.length){ box.innerHTML = ""; box.style.display = "none"; return; }
  var hit = profMatch(text), pick = hit || "";
  box.style.display = "block";
  box.innerHTML = '<div class="f" style="margin:0 0 4px"><label for="mProfSel">Profil</label></div>' +
    '<select id="mProfSel" style="width:100%">' +
      '<option value="">— joriy meʼyorlar' + (S.profile ? " (" + esc(S.profile) + ")" : "") + ' —</option>' +
      names.map(function(n){ return '<option value="' + esc(n) + '"' + (n === pick ? " selected" : "") + '>' + esc(n) + '</option>'; }).join("") +
    '</select>' +
    '<div style="font-size:11px;color:var(--ink3);margin:4px 0 12px">' +
      (hit ? "«" + esc(hit) + "» — loyiha nomidagi kalit soʻz boʻyicha taklif qilindi" : "tanlansa yangi buyurtma shu meʼyorlar bilan pochkalanadi") + '</div>';
}
function profModalApply(){
  var s = $("mProfSel");
  if (!s || !s.value || s.value === S.profile) return null;
  return profApply(s.value, true);
}

profInit();
