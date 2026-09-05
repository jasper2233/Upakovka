# Arxitektura va ma'lumot modeli

Bu hujjat **ishlab chiquvchi uchun**: modullar bir-biriga qanday bog'langan,
ma'lumot qanday shaklda yuradi va yangi narsa qo'shishda qayerlarga tegish kerak.

Foydalanuvchi hujjati — [README.md](../README.md).
Me'yorlarning texnik asoslanishi — [meyorlar-TZ.md](meyorlar-TZ.md).

---

## 1. Nima uchun shunday qurilgan

Uchta cheklov butun arxitekturani belgilaydi:

| Cheklov | Qayerdan | Oqibati |
|---|---|---|
| **Internet yo'q** | sex kompyuteri tarmoqqa ulanmagan | tashqi CDN, shrift, `fetch`, XHR — yo'q |
| **Server yo'q** | tizim `file://` dan ochiladi | ES modul yo'q (CORS bloklaydi), `<script>` teglari klassik |
| **O'rnatish yo'q** | fleshkadagi bitta HTML | build — oddiy matn singdirish (`build.ps1`), bundler yo'q |

Shu sababdan **modul tizimi — global nomlar**, yuklanish tartibi esa fayl
nomidagi raqam bilan belgilanadi. Bu kamchilik emas, ataylab tanlangan yechim;
band nomlar ro'yxati 4-bo'limda.

---

## 2. Yuklanish tartibi va bog'liqlik yo'nalishi

`index.html` skriptlarni shu tartibda ulaydi. Tartib **muhim**: har modul faqat
o'zidan OLDIN yuklanganlarga tayanishi mumkin.

```
01-qr.js        QR enkoder             — bog'liq emas (IIFE, window.QRLIB)
seed.js         namuna loyiha          — sof ma'lumot
02-state.js     S, P, PACKS, birlik    — bog'liq emas
03-parser.js    XML -> P, buildItems   — 02
04-packer.js    pochkalash yadrosi     — 02, 03
05-audit.js     invariantlar           — 02 (packerga BOG'LIQ EMAS, pastga qarang)
06-render3d.js  3D sahna               — 02, 04
07-render2d.js  qavat rejasi           — 02, 04, 06 (C3 dan foydalanadi)
08-labels.js    $, esc, cheklar        — 02, 04
09-storage.js   IndexedDB, snapshot    — 02, 03, 04
10-ui.js        ro'yxat, qadam, P/M    — 02…09
11-diag.js      diagnostika            — 02…10 (hammasiga yumshoq)
12-upload.js    fayl yuklash           — 03, 08, 09, 11, 13 (yumshoq)
13-app.js       sozlama, ishga tushish — hammasi
14-sort.js      saralash posti         — 02, 04, 08, 10
```

**Yumshoq bog'liqlik** — `typeof X === "function"` bilan tekshiriladi va modul
bo'lmasa ham ishlayveradi. U faqat ikki joyda o'rinli:

* **11-diag.js va 12-upload.js** — diagnostika va yuklash hech qachon ilovani
  yiqitmasligi kerak: ular aynan hammasi buzilganda ochiladi.
* **05-audit.js** `esc`, `modGroupOf`, `clsKeyOf` ga yumshoq bog'lanadi.

Qolgan hamma joyda bog'liqlik **qattiq** — `typeof` tekshiruvi qo'shmang: u
haqiqiy xatoni yashiradi. Aynan shu sababdan v21 da bir nechta o'lik zaxira
yo'l olib tashlandi (`autosave` dagi «Promise emasmi», `renderDiag` dagi
«`$` bormi», `upDelRecent` dagi olti muqobil nom).

### Audit nima uchun mustaqil

`auditPacks()` **birorta ham** packer funksiyasini chaqirmaydi. Tayanch yuzasi
hisobi (`partSupport`/`layerSupp`) auditda **qayta yozilgan**: bir xil
geometriyani ikki mustaqil kod hisoblasa, biridagi xato ikkinchisida ko'rinadi.
Bu takrorlanish ataylab va uni «DRY» deb birlashtirmaslik kerak.

Audit packerning **bayrog'iga** ham ishonmaydi: `L.tom` bor bo'lsa ham,
tayanchni geometriyadan o'zi qayta hisoblaydi.

---

## 3. Ma'lumot modeli

Butun tizim to'rtta obyekt atrofida aylanadi: **S** (sozlama), **P** (loyiha),
**item** (detal nusxasi) va **pack** (pochka).

### 3.1 `S` — sozlamalar (`02-state.js`)

Bitta global obyekt. Uchta manba bir-biriga mos bo'lishi shart va buni
`smoke.ps1` qo'riqlaydi:

| Manba | Nima beradi |
|---|---|
| `index.html` (`value=` / `checked`) | interfeysdagi standart qiymat |
| `02-state.js` → `S` | koddagi standart qiymat |
| `13-app.js` → `readConf()` | o'qish va **chegaralash** (yagona haqiqiy cheklov) |

> `10-ui.js` → `fixNumberInputs()` hamma `input[type=number]` ni `type="text"`
> ga o'giradi (uz-UZ lokalidagi vergul muammosi). Shu sababdan HTML dagi
> `min`/`max` atributlari **brauzer tomonidan qo'llanmaydi** — ular hujjat
> bo'lib qoladi, haqiqiy chegara esa `readConf()` da. Ikkalasi bir xil
> bo'lishi shart.

`S` uch turdagi qiymatni saqlaydi:

| Tur | Misol | Qayerda saqlanadi |
|---|---|---|
| me'yor (son / bayroq) | `maxKg`, `lidBed`, `byThick` | `localStorage.upk_conf` |
| jadval / xarita | `matCat`, `sepCls`, `modGroups`, `unitNames`, `thickMix` | o'sha yerda, `_` prefiksi bilan |
| sexning fizik holati | `cellOff` (yopiq yacheykalar) | o'sha yerda — **seansga tushmaydi** |

### 3.2 `P` — loyiha (`03-parser.js` → `parseProject()`)

```
P = { name, uuid, rev, unitSrc, materials:[…], parts:[…] }
      materials[i] = { id, name, l, w, t, kgm2, cat, sheets }
      parts[i]     = { id, c, n, p, pc, l, w, q, m, noMat, e, eb }
```

`parts[i]` — faylda yozilgani, ya'ni **pozitsiya** (`q` dona). `rev` — terish
reviziyasi: har qayta pochkalashda +1 bo'ladi va QR ichiga tushadi.

`materials[i].sheets` (fayldagi list soni) va `parts[i].eb` (kant materiali)
interfeysda **ko'rsatilmaydi**, lekin `tools/seed-to-project.ps1` ularni XML ga
qaytarib yozadi — ya'ni ular fayl modelining bir qismi.

### 3.3 `item` — detal nusxasi (`03-parser.js` → `buildItems()`)

`buildItems()` har pozitsiyani `q` ta **alohida nusxaga** yoyadi. Pochkalash,
audit va saralash faqat shular bilan ishlaydi.

```
item = { uid, code, name, prod, prodCode, unit, unitName, cls,
         L, W, T, mat, matId, edges, kg, of }
```

* `uid = part.id + "#" + nusxa raqami` — **seansni tiklashning kaliti**.
  Snapshot faqat `uid` va koordinatani saqlaydi, qolgani `buildItems()` bilan
  qayta hisoblanadi.
* Shundan kelib chiqadigan **qat'iy qoida**: `buildItems()` natijasiga ta'sir
  qiladigan har sozlama `09-storage.js` → `SNAP_CONF` da bo'lishi shart
  (hozir `maxPartT`; `rooms`, `matCat`, `unitNames` snapshotda alohida
  maydon). Aks holda sozlama o'zgargach seans **umuman tiklanmaydi**.
* Faylda bir xil `id` li ikki `<part>` uchrasa (`ID_TAKROR` ogohlantirishi)
  ikkinchisiga pozitsiya indeksi qo'shiladi (`id@7#0`) — aks holda ikkala
  detal bitta `uid` olib, audit ularni «takror» deb ko'rsatardi.
* `L ≥ W` har doim (`L=max(l,w)`, `W=min(l,w)`).
* Pochkalash paytida yadro vaqtinchalik maydon qo'shadi: `used`
  (joylashtirildi), `nst` (qaysi oqim), `why` (nega nostandart).

### 3.4 `pack` — pochka

Ikki xil pochka bor va ular bir xil maydonlarga ega **emas**:

**Oddiy pochka** — tag + qavatlar:

```
{ base, layers:[…], envL, envW, off, allowOvh, left:[],
  key, gname, room, nst, oddSrc, overKg,
  no, rev, done,   +  hosila: kg, t, h, gabL, gabW, fillAvg, seq }
```

**Bog' (`odd:true`)** — nostandart tor detallarning ustma-ust taxlami:

```
{ odd:true, items:[…], key, gname, room, nst,
  no, rev, done,   +  hosila: kg, t, h, gabL, gabW, seq }
```

| Maydon | Ma'nosi |
|---|---|
| `key` | pochkalash kaliti (`modul/material/qalinlik/klass`) — guruh chegarasi |
| `gname` / `room` | ro'yxat sarlavhasi va chek uchun nom |
| `nst` | oqim: `true` — haqiqiy nostandart, `false` — standart |
| `oddSrc` | nostandart oqimda terilgan (limitlari boshqa: `packKgBase`) |
| `overKg` | qoldiq zaxirasidan foydalangan |
| `left` | **ishchi maydon** — `layoutPack` sig'dirolmaganlar. Terish tugagach u tozalanadi: undagi detallar allaqachon boshqa pochkalarda |
| `done` | `seq` dan nechtasi qo'yilgan (yig'ish progressi) |

**Hosila maydonlar** — `kg`, `t`, `h`, `gabL`, `gabW`, `fillAvg`, `seq` —
`base`+`layers` (yoki `items`) dan kelib chiqadi va ularni **faqat**
`packDerive()` (04-packer.js) hisoblaydi. Pochka tarkibi o'zgargan har joyda
o'sha funksiya chaqiriladi: `packAllGen`, `restoreSnapshot`, `refreshPack`,
`togglePackOvh`, `moveDetail`. Qo'lda hisoblab yozmang.

### 3.5 `layer` — qavat

```
{ items:[{ it, x, y, a, b, rot }], kg, fill, bb:{x0,y0,L,W}, h,
  flipped, lid, tom, tail, weak, soft, impl }
```

| Bayroq | Ma'nosi |
|---|---|
| `lid` | qopqoq (yasalgan yoki eng ustki qavat shunday belgilangan) |
| `tom` | **TOM shartidan o'tdimi** — faqat eng ustki qavatda `true` bo'lishi mumkin |
| `tail` | quyruq — guruh qoldig'i, `minFill` dan ozod |
| `weak` | to'liq bo'lmagan qavat (pochka faqat tagdan iborat bo'lib qolmasin uchun) |
| `soft` | qopqoq yaxlit emas |
| `impl` | qopqoq `makeLid()` dan o'tmagan, ko'tarilgan |

`tom` bayrog'ini **faqat** `markTom()` qo'yadi (`layoutPack`, `absorbTails`,
`refreshPack` — uchalasi ham shuni chaqiradi). Ifodani ko'chirib yozmang:
ilgari `refreshPack` dagi nusxa ikkita shartni unutgan edi va qo'lda
tuzatishdan keyin tayanchsiz tom «yopiq» deb belgilanardi.

Qavat qalinligi alohida saqlanmaydi: bitta qavatda bitta qalinlik bo'ladi,
demak `L.items[0].it.T` yetarli.

---

## 4. Global nomlar

Yangi modul qo'shayotgan bo'lsangiz, bu nomlar **band**.

**Modullararo (holat va yordamchi):**
`S` `P` `PACKS` `CUR` `STEP` `WRAP` `APP_VER` `SEED` `Store` `DIAG` `SORT`
`$` `esc` `cut` `QRLIB` `LAST_AUDIT` `BUSY` `PACKPROG` `MAIN_T`

**Modulga xos konstanta va holat:**

| Fayl | Nomlar |
|---|---|
| 02-state | `UNIT_SEP` |
| 03-parser | `DENS` `KGM2_FALLBACK` `SHEET_DEFAULT` `CLS_KEYS` `CLS_ALIAS` |
| 04-packer | `Packer` `PACK_TRIES` `ORD` `GREEDY_GUARD` `TAIL_LAYERS` `PACK_RUN` `MAIN_SEED` `SEED_STEP` `ODD_SEED` |
| 05-audit | `AUD_CAP` |
| 06-render3d | `cam` `C3` `G3` `MATC` `COL_BASE` `COL_FRESH` |
| 07-render2d | `C2` `G2` |
| 09-storage | `SNAP_CONF` `AUTOSAVE_ON` `AUTOSAVE_MS` `AUTOSAVE_T` |
| 10-ui | `EDGE_UZ` `PEND` `PEND_T` `PART_Q` `PACK_FIELDS` `MGR_CUR` `A4_MARGIN` `LBL_MARGIN` `LBL_MARGIN_TINY` |
| 11-diag | `DIAG_MAXW` `DIAG_OV` |
| 12-upload | `UP_MAXMB` `UP_SCANMAX` `UP_EXT` `UP_BOUND` `UP_DRAG` `UP_ZONE` `UP_DRAGT` `UP_WATCH` `UP_REC` |
| 13-app | `CONF_IDS` `CONF_VIEW_ONLY` `CONF_DEFAULTS` `MATCAT_DEFAULT` `PROG_TIMER` `SOON` `PENDING` |
| 14-sort | `RACK_EDIT` `RACK_DRAFT` `RACK_T` |

Funksiya nomlari ham global. Yangi modulda **prefiks** ishlating —
`12-upload.js` dagi `up*`, `11-diag.js` dagi `diag*`, `14-sort.js` dagi
`sort*`/`rack*`, `05-audit.js` dagi `aud*` kabi.

---

## 5. Determinizm

Bir xil kirish + bir xil sozlama **har doim** bir xil natija berishi shart.
Seansni tiklash shunga tayanadi: snapshot faqat `uid` va koordinatani saqlaydi,
qolgani qayta hisoblanadi.

1. **`Math.random()` pochkalashda taqiqlangan.** O'rniga `mulberry(seed)` —
   urug'lari qat'iy konstantalar: `MAIN_SEED + t*SEED_STEP` (asosiy oqim, har
   urinishga boshqa urug') va `ODD_SEED` (nostandart oqim — u asosiy oqimning
   urinish raqamiga bog'liq bo'lmasin).
2. **Tartib qat'iy.** Guruhlar `groupSortKey()`, quyruq nomzodlari massa va
   `uid` (`uidCmp`), bog'lar o'lcham va `code` bo'yicha saralanadi. Hech qayerda
   `Object.keys()` tartibiga tayanilmaydi — u saralanadi.
3. **`Date.now()` natijaga ta'sir qilmaydi** — u faqat seans vaqt tamg'asi va
   hujjat sanasi uchun.
4. **`build.ps1` ham deterministik**: natija faylidagi «build» izohi soat emas,
   manba matnining barmoq izi. Manba o'zgarmasa `dist` bayt-ma-bayt o'sha
   bo'ladi.

Buzilishi darhol ko'rinadi: `smoke.ps1` snapshot → tiklash aylanmasida massa va
ketma-ketlikni bit-ma-bit solishtiradi.

---

## 6. Yangi narsa qo'shish

### 6.1 Yangi me'yor (sozlama)

Beshta joy, beshalasi ham majburiy:

1. **`index.html`** — `#v-conf` ichidagi kerakli blokka (`.blk-std` /
   `.blk-nst` / `.blk-all`) maydon qo'shing. `id` `c` bilan boshlansin,
   `.q[data-tip]` podskaska **shart** (test ≥ 40 belgi talab qiladi), yorliqda
   `for="…"` bo'lsin.
2. **`02-state.js`** — `S` ga standart qiymat va nima uchun shunday ekani.
3. **`13-app.js` → `readConf()`** — o'qish va chegaralash. Nol qiymat ma'noli
   bo'lsa `numOr()`, aks holda `+value || N`. Chegara HTML dagi `min`/`max`
   bilan bir xil bo'lsin.
4. **`13-app.js` → `writeConf()`** — teskari yo'nalish (seans tiklangach).
5. **`04-packer.js` / `05-audit.js`** — qo'llanishi va audit tekshiruvi.

`CONF_IDS` va `onchange` bog'lanishi **DOM dan avtomatik** yig'iladi — ularga
qo'lda qo'shish shart emas. Faqat ko'rinishga ta'sir qiladigan maydon bo'lsa
`CONF_VIEW_ONLY` ga qo'shing.

`buildItems()` natijasiga ta'sir qiladigan me'yor bo'lsa — uni
**`09-storage.js` → `SNAP_CONF`** ga ham qo'shing (3.3-bo'limga qarang).

So'ng: [meyorlar-TZ.md](meyorlar-TZ.md) ga bo'lim yozing (nima / qayerda / nega
/ oshirsa / kamaytirsa / bog'liqligi) va `smoke.ps1` ni yuriting.

### 6.2 Yangi modul

`src/js/NN-nom.js` yarating va `index.html` ga **tartibga mos** joyga
`<script src>` qo'shing. `build.ps1` o'zi topib singdiradi. Nomlarga prefiks
bering (4-bo'lim).

### 6.3 Yangi audit tekshiruvi

`05-audit.js` → `auditPacks()`. Ikki tur bor:

* **xato** (`err`) — invariant buzilgan, hech qachon bo'lmasligi kerak;
* **ogohlantirish** (`wrn`) — bo'lishi mumkin, lekin P/M ko'rishi kerak.

Yangi kodni `README.md` dagi jadvalga ham qo'shing. Audit `04-packer.js`
bayroqlariga **ishonmasin** — geometriyani o'zi hisoblasin (2-bo'lim).

---

## 7. Sinov vositalari

| Vosita | Nima qiladi | Qachon yuritiladi |
|---|---|---|
| `tests/smoke.ps1` | haqiqiy brauzerda 394 tekshiruv | **har o'zgarishdan keyin** |
| `tests/corpus.ps1` | 205 ta real `.project` fayl bo'yicha regressiya | algoritm o'zgarganda |
| `tests/shot.ps1` | interfeys skrinshoti | ko'rinish o'zgarganda |
| `tools/seed-to-project.ps1` | namuna `.project` fayllarni qayta yasaydi | SEED yoki parser o'zgarganda |
| `build.ps1` | bir faylli versiya + beshta tekshiruv | chiqarishdan oldin |

`corpus.ps1` natijasini `-Csv` bilan saqlab, keyingi safar `-Compare` bilan
solishtiring: qaysi fayl yaxshilandi, qaysi yomonlashdi, audit buzildimi.
Algoritmga tegilganda **ikkalasi ham** yuritiladi — `smoke.ps1` bitta sun'iy
namunani, `corpus.ps1` esa 15 958 detalni tekshiradi.
