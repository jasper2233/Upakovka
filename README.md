# Upakofka tizimi

Mebel tsexi uchun **detallarni pochkalash (upakofka) MES tizimi**.
Raskroy dasturining `.project` faylini yuklaysiz — tizim detallarni pochkalarga teradi,
har detal uchun QR chek chiqaradi va upakovshikka 3D da qadam-baqadam qayerga qo'yishni ko'rsatadi.

**Server kerak emas. Internet kerak emas. O'rnatish kerak emas.**
`index.html` ni brauzerda ochsangiz bo'ldi.

Ichida namuna buyurtma bor — **«Namuna loyiha»** tugmasini bossangiz tizim darrov
55 ta pochka terib beradi. Fayl yuklash shart emas.

---

## Tez boshlash

### Ishlab chiqish (modulli) versiya
```
index.html   -> brauzerda ochish (ikki marta bosish yetadi)
```

### Bir faylli versiya (tsexga olib borish uchun)
```powershell
.\build.ps1
```
Natija: `dist\upakofka-tizimi.html` — hamma narsa bitta faylda.
Uni fleshkaga tashlab istalgan kompyuterda ochsa bo'ladi.

### Veb (GitHub Pages)

Repo ildizidan to'g'ridan-to'g'ri xizmat qiladi — build ham, bundler ham,
Actions ham kerak emas. `Settings → Pages → Source: main / (root)`.

Ishlashi tekshirilgan: butun test to'plami `http://` orqali ham yuriladi —
```powershell
.\tests\smoke.ps1 -Http
```
Bu lokal server ko'taradi va sahifani aynan Pages sharoitida sinaydi
(Linux katta-kichik harfni farqlaydi, IndexedDB `file://` dan boshqacha ishlaydi).

**Nima uchun Pages — va nima uchun emas.** Pages ofis, demo va mijozga ko'rsatish
uchun. Sex kompyuteri uchun **emas**: u yerda internet bo'lmasligi mumkin, shuning
uchun tsexga `dist\upakofka-tizimi.html` fleshkada boradi.

> ⚠️ Saqlash **origin bo'yicha** ajraladi. `file://` dan ochilgan sozlama va
> seans `https://` da **ko'rinmaydi** (va aksincha) — bu brauzer qoidasi, xato emas.
> Bitta odam ikkala yo'ldan foydalansa, ishini yo'qotgandek his qiladi.
> Shuning uchun bitta post — bitta yo'l.

---

## Loyiha faylini yuklash

Uch yo'l bor, uchalasi ham bir xil ishlaydi:

| Yo'l | Qanday |
|---|---|
| Tugma | Yuqori o'ngdagi **«Loyiha yuklash»** yoki menejerdagi **«Fayl tanlash»** |
| Sudrab tashlash | `.project` faylni brauzer oynasiga **sudrab tashlang** |
| Klaviatura | <kbd>Ctrl</kbd>+<kbd>O</kbd> |

Qo'llab-quvvatlanadigan kengaytmalar: `.project`, `.xml`, `.txt`.

Fayl yuklangach **«Yangi buyurtma»** oynasi ochiladi va ko'rsatadi:
- **Modullar** — faylda qanaqa modul bor
- **Detal klasslari** — qaysilari alohida pochkalansin (fasad alohida, bok alohida...)

### Modul chegarasi qayerdan olinadi

Bu **sozlama emas** — faylning o'z xossasi. Qoida bitta va avtomatik:

> Detal kodining prefiksi (`01_001` → `01`) proekt tuzilishidan (`<good typeId="product">`)
> **ko'proq** birlik bersa — prefiks olinadi, aks holda `good` kodi.

Sabab: haqiqiy Gib Lab eksportlarida ko'pincha bitta `good` bo'ladi —
butun komplekt bitta mahsulot qilib topshiriladi — lekin ichida bir nechta mustaqil mebel (karavot, tumba,
shkaf, tremo) bo'ladi va ularning chegarasi faqat detal kodida qoladi.
Tuzilishga tayansak hammasi bitta pochkaga aralashib ketardi.
Bu holat `namuna\komplekt-5modul.project` fayli bilan doimiy tekshiriladi.

Qaror asosi menejerda bir qatorda ko'rinadi: *«5 ta modul — detal kodi prefiksidan.
Faylda mahsulot tuzilishi faqat 1 ta birlik beradi, kod prefiksi esa 5 ta.»*

Modulning odam o'qiydigan **nomini P/M yozadi** (`01 → Karavot`) — u ro'yxatda,
pochka sarlavhasida va chekda chiqadi.

### Pochka kesimlari va xonalar

**Kesimlar** — buyurtma qaysi o'q bo'yicha bo'linishi — P/M da belgilanadi:
modul bo'yicha va/yoki material bo'yicha. Ikkalasi ham o'chirilsa hamma detal
aralash teriladi; qalinlik va fizik chegaralar baribir amal qiladi.

**Xona** — nomlangan modul guruhi. Bitta bayroq bilan ikki xil ishlaydi:

| Bayroq | Nima bo'ladi |
|---|---|
| **birga** | butun xona bitta pochkalash kaliti — zal: kuxnya + pod-TV + shkaf aralash teriladi |
| **alohida** | har modul o'z pochkasida, xona nomi faqat **belgi**: ro'yxatda sarlavha, chekda yozuv |

Fayl o'qilmasa — **alert emas, tashxis oynasi** chiqadi: ildiz tegi nima ekani, qanday teglar
bor, `good`/`operation` teglarining `typeId` qiymatlari va faylning bosh qismi. Shundan
formatning nimasi boshqacha ekani darrov ko'rinadi.

Oxirgi 20 ta yuklangan fayl brauzer xotirasida saqlanadi — menejerdagi
**«Oxirgi yuklangan fayllar»** ro'yxatidan bir bosishda qayta ochiladi.

### Sinov fayllari
```
namuna\namuna.project           — 4 shkaf, 215 pozitsiya, 291 detal, 3 material
namuna\test-yupqa.project       — 0.6 / 3.2 / 16 mm materiallar (yupqa material sinovi)
namuna\komplekt-5modul.project  — 1 ta good, ichida 5 modul (chegara faqat kodda)
namuna\konveyr-partiya.project  — 12 ta bir xil buyum bitta kroyda
```
Bu fayllar `SEED` dan yasalgan. Qayta yaratish:
```powershell
.\tools\seed-to-project.ps1
```
Skript yozgan XML ni darrov qayta o'qib tekshiradi: material soni, pozitsiya soni,
detal soni, `part id` larning unikalligi va har detalning CS operatsiyasida
aynan bir marta uchrashi.

---

## Bo'limlar

| Bo'lim | Nima qilinadi |
|---|---|
| **Proekt menejer** | Fayl yuklash, oxirgi fayllar, pochka kesimlari, **modullarga nom berish**, **xonalar**, klasslar tanlovi, **pochkalarni qo'lda tuzatish** |
| **Saralash** | Paddondan stelyaj yacheykalariga. Ishchi detalni skanerlaydi — dastur qaysi yacheykaga qo'yishni aytadi. Bitta yacheyka = bitta pochka. **Stelyajlar** paneli — ishchi qaysi yacheyka band ekanini kiritadi; **Reja** — qaysi pochka qayerga tushishi |
| **Qadoqlash** | Asosiy ish ekrani: pochkalar ro'yxati (xona → modul bo'yicha tizilgan), 3D yig'ish, keyingi detal, QR chek, skaner. **Tahrirlash yo'q** — u faqat P/M da |
| **Detallar** | Butun buyurtma jadvali — kod, o'lcham, massa, material, kant, holat |
| **Materiallar** | Yaxlit list bazasi: o'lcham va massa. List kilosi ↔ kg/m² ikki tomonlama bog'liq |
| **Diagnostika** | Parser ogohlantirishlari, **audit**, XML tuzilishi, ishlash vaqti |
| **Sozlamalar** | 15 me'yor, material katalogi, chek o'lchami, saqlash |

---

## Ish jarayoni (upakofka posti)

1. Chapdan pochkani tanlang
2. O'ng ustunda **keyingi detal** ko'rinadi: kod, o'lcham, massa va **aniq joyi**
   («chap chetdan 230 mm, orqa chetdan 126 mm · 90° burilgan»)
3. Markazda 3D: keyingi detal **sariq soya** bo'lib turadi — qayerga tushishi oldindan ko'rinadi
4. Detalni qo'ying va QR ni skanerlang (yoki <kbd>Space</kbd> bosing)
5. Pochka tugagach — «rulondan qog'oz yechib o'rang, 2 tasma, chek yopishtiring»

**Klaviatura:** <kbd>Space</kbd>/<kbd>Enter</kbd> — qo'yildi · <kbd>Backspace</kbd> — orqaga ·
<kbd>Ctrl</kbd>+<kbd>O</kbd> — fayl yuklash

Yig'ish progressi **avtomatik saqlanadi**. Tab yopilib qolsa yoki brauzer yangilansa —
keyingi ochilishda o'sha joydan davom etasiz.

---

## Loyiha tuzilishi

```
upakovka/
├─ index.html              sahifa skeleti (ishlab chiqish versiyasi kirish nuqtasi)
├─ build.ps1               bir faylli versiyani yig'uvchi skript
├─ README.md               shu fayl
├─ src/
│  ├─ css/style.css        butun dizayn
│  ├─ data/seed.js         o'rnatilgan namuna loyiha (Namuna komplekt)
│  └─ js/                  yuklanish tartibi raqamlar bilan belgilangan
│     ├─ 01-qr.js          QR enkoder — kutubxonasiz, byte rejim, ECC M, 1..20-versiya
│     ├─ 02-state.js       global holat: sozlamalar (S), loyiha (P), pochkalar (PACKS)
│     ├─ 03-parser.js      .project XML parser, detal klassi, massa hisobi
│     ├─ 04-packer.js      pochkalash algoritmi (MaxRects + simmetrik qavat + g'isht terish)
│     ├─ 05-audit.js       natija invariantlarini tekshirish
│     ├─ 06-render3d.js    3D yig'ish, qog'ozga o'rash, soya
│     ├─ 07-render2d.js    qavat rejasi ustidan ko'rinish
│     ├─ 08-labels.js      QR chizish, detal cheki, pochka cheki
│     ├─ 09-storage.js     IndexedDB: seans, yuklangan fayllar tarixi
│     ├─ 10-ui.js          ro'yxat, qadam, skaner, qo'lda tahrirlash, menejer
│     ├─ 11-diag.js        diagnostika bo'limi
│     ├─ 12-upload.js      fayl yuklash, sudrab tashlash, xato tashxisi
│     ├─ 13-app.js         sozlama, qayta hisob, tablar, ishga tushish
│     └─ 14-sort.js        saralash posti: stelyaj/yacheyka, skaner, reja
├─ dist/                   build natijasi — bir faylli offline versiya
├─ namuna/                 sinov uchun .project fayllar
├─ tools/                  yordamchi skriptlar
└─ docs/                   hujjatlar
```

### Nega ES modul emas?
`type="module"` `file://` orqali ochilganda CORS sababli **ishlamaydi** — sexdagi kompyuterda
sahifa oq bo'lib qolardi. Shuning uchun oddiy klassik `<script>` teglari ishlatiladi,
yuklanish tartibi fayl nomidagi raqam bilan belgilanadi. Bir xil sababdan `fetch`, `XHR`
va tashqi CDN ham ishlatilmaydi.

---

## Audit — natija ishonchliligi

Har qayta hisobdan keyin tizim **o'zini o'zi tekshiradi** va natijani shapkada ko'rsatadi.
To'liq hisobot: **Diagnostika** bo'limi.

**Xatolar** (bo'lmasligi shart):

| Kod | Nima |
|---|---|
| `YOQOLGAN` | detal hech bir pochkaga tushmagan |
| `TAKROR` | bitta detal ikki joyda |
| `USTMA_UST` | bir qavatda ikki detal ustma-ust |
| `CHEGARA` | detal konvertdan chiqib ketgan |
| `MASSA` | pochka massa limitidan og'ir |
| `QAVAT` | qavat soni limitdan ko'p |
| `QALINLIK` | pochkada aralash qalinlik |
| `GURUH` | pochkada modul / material / klass chegarasi buzilgan (odatda qo'lda ko'chirishdan) |
| `SEQ` | yig'ish ketma-ketligi detal soniga mos emas |

**Ogohlantirishlar** (e'tibor talab qiladi, lekin xato emas): to'ldirish foizi past qavat,
tag bo'lolmaydigan o'lcham, yolg'iz tag detaldan iborat pochka, yarim bo'sh pochka.

---

## Chek va QR

QR ichidagi format:
```
PREFIKS.UUID.Rn|Pnn|Qn|DETALKOD|LxWxT
SM.5EED0000.R3|P05|Q3|01_061|559x100x16
```

- **UUID** — loyihaning o'z identifikatori (ikki buyurtma bir-biriga adashmaydi)
- **Rn** — **terish reviziyasi**. Buyurtma qayta pochkalanganda +1 bo'ladi. Eski chek
  skanerlansa tizim darhol aytadi: *«bu chek ESKI terishdan (R2), joriy terish R3 —
  cheklarni qayta chop eting»*

**Chek o'lchami** sozlamalarda tanlanadi:
- `A4 — 2 ustun` — oddiy printer
- `100 × 70 mm` / `58 × 40 mm` — termal printer, har chek alohida varaqda

**Brutto** = detallar massasi + qadoq materiali (tara: qog'oz + 4 burchak + tasma).
Tara sozlamalarda kiritiladi va **pochkalash hisobiga kirmaydi** — u faqat chek va
«2 kishi ko'taradi» ogohlantirishi uchun.

---

## Saqlash: nima qayerda turadi

| Nima | Qayerda | Qachon o'chadi |
|---|---|---|
| Me'yorlar, material katalogi | `localStorage` | «Standartga qaytarish» |
| Loyiha + pochkalar + yig'ish progressi | `IndexedDB` (seans) | «Seansni tozalash» |
| Yuklangan xom `.project` fayllar (oxirgi 20 ta) | `IndexedDB` | ro'yxatdan «O'chirish» |

Brauzer IndexedDB ni qo'llab-quvvatlamasa (private rejim), tizim yiqilmaydi — shunchaki
saqlamaydi va buni menejerda aytadi.

---

## Sozlamalar

15 me'yorning har biri texnik asoslanishi bilan **[docs/meyorlar-TZ.md](docs/meyorlar-TZ.md)** da
yozilgan: nima uchun 35 kg, nega chiqish 20 mm, qavat to'ldirish 85 % qayerdan olingan va
har birini oshirsa/kamaytirsa nima bo'ladi.

Me'yorni o'zgartirish tartibi:
1. Sozlamalarda qiymatni o'zgartiring — tizim avtomatik qayta teradi
2. **Diagnostika** bo'limida auditni tekshiring
3. Natija ma'qul bo'lsa — «Sozlamalarni saqlash»

---

## Ishlash

Pochkalash **bo'laklab** bajariladi: har 40 ms da brauzerga boshqaruv qaytariladi.
Shu sabab katta buyurtmada ham interfeys muzlamaydi, jarayon ko'rsatkichi chiqadi va
**bekor qilish** mumkin. Kichik buyurtmada ko'rsatkich umuman ko'rinmaydi.

Hisob hajmi: har pochkaga 100 variant × butun buyurtmani `S.tries` marta qayta terish.
Sekin tuyulsa — sozlamalarda **«Variatsiya urinishlari»** ni kamaytiring (4 → 2 → 1).

---

## Sinov

```powershell
.\tests\smoke.ps1                 # modulli versiya (index.html)
.\tests\smoke.ps1 -Target dist    # yig'ilgan bir faylli versiya
```

Skript sahifani **haqiqiy brauzerda** (Edge yoki Chrome, headless) yuklaydi va ~59 ta
tekshiruvni bajaradi. Node.js kerak emas. Nima tekshiriladi:

- sahifa JS xatosisiz yuklandimi, hamma modul funksiyalari joyidami
- pochkalash natijasi: audit toza, hamma detal joylashgan, statistika (kg, to'ldirish, qavat)
- QR: format, matritsa, quiet zone 4 modul; detal va pochka cheklari; brutto = netto + tara
- **saqlash → tiklash aylanmasi**: massa va ketma-ketlik bit-ma-bit bir xil qolishi
- haqiqiy `namuna\*.project` fayllarni o'qish; **0.6 va 3.2 mm qalinlik butunlashmasligi**
- buzilgan / bo'sh / noto'g'ri ildiz tegli fayllar rad etilishi
- Kesim o’qlari haqiqatan farq qilishi; material o’qida pochkada material aralashmasligi
- Modul guruhi (2 modul bitta pochkada) va klass guruhi ({TOM,FASAD} birga, qolganidan ajralgan)
- Modul belgisi: tuzilish yiqilganda kod prefiksiga o'tishi; haqiqiy `komplekt-5modul` faylida 5 ta modul ajralishi, aralashmasligi va birlashtirilishi
- Eski `b2c`/`b2b` sozlamalari `ind`/`conv` ga ko'chishi
- Modul nomi (P/M bergan) ro'yxatda, pochka sarlavhasida va chekda chiqishi
- Xona: `birga` da modullar birlashishi, `alohida` da faqat belgilanishi; ro'yxatda xona sarlavhasi
- Tahrirlash Qadoqlash ekranida YO'Qligi, P/M dagi blok ishlashi
- Saralash: yacheyka kodlari, yacheyka biriktirilishi, qadoqlangach bo'shashi,
  sig'im yetmaganda aniq xabar, nusxadan ortiq joylanmasligi, QR dan kod ajratish
- Saralash rejasi eski "birinchi bo'sh yacheyka" qoidasidan kam yurish berishi
- Yopiq yacheykalar: stelyaj/yacheyka yopilishi, rejaga tushmasligi,
  band yacheykani yopib bo'lmasligi, hammasi yopiq bo'lganda tushunarli javob
- **to'liq yuklash oqimi**: XML → tanlov oynasi → pochkalash → audit → interfeys
- qadam boshqaruvi: oldinga/orqaga, progress to'g'ri kamayishi

Xato bo'lsa skript `exit 1` qaytaradi, natija topilmasa `exit 2`.
`-Keep` bilan vaqtinchalik test sahifasi diskda qoladi (qo'lda ochib ko'rish uchun).

### Skrinshot

```powershell
.\tests\shot.ps1                          # pochkalash ekrani
.\tests\shot.ps1 -View mgr                # proekt menejer
.\tests\shot.ps1 -View diag               # diagnostika
.\tests\shot.ps1 -View work -Pack 1 -Steps 5   # 5 detal qo'yilgan holat
```
Natija: `tests\shot-<view>.png`. Interfeys o'zgarishini ko'z bilan tekshirish uchun.

## Ishlab chiquvchiga

- **Kod uslubi:** `var` va `function`, o'zbekcha izohlar, bo'limlar raqamlangan (3.1 … 3.15).
  ES modul, `fetch`/XHR va tashqi CDN ishlatilmaydi — `file://` da ular ishlamaydi.
  Pochkalash yadrosi generator (`function*`) va `Promise` ishlatadi, shu sabab
  **minimal brauzer: Chrome/Edge 50+**.
- **Yangi modul qo'shish:** `src/js/NN-nom.js` yarating va `index.html` ga mos joyga
  `<script src>` qo'shing. `build.ps1` o'zi topib singdiradi.
- **Global nomlar** (band): `S P PACKS CUR STEP EDIT WRAP $ esc Store DIAG PACKPROG
  LAST_AUDIT PEND PENDING BUSY cam C3 G3 C2 G2 DENS KGM2_FALLBACK ORD CLS_KEYS
  APP_VER SEED Packer PACK_TRIES SORT`
- **Determinizm:** pochkalash urug'i qat'iy (`mulberry(1234 + t*7919)`) — bir xil kirish
  va bir xil sozlama har doim bir xil natija beradi. Seansni tiklash shunga tayanadi.
- **Diagnostikada ishlash vaqti** ko'rsatiladi — algoritmni o'zgartirgach shu raqamga qarang.

### Keyingi bosqichlar (rejalashtirilgan)
1. Real `.project` fayllar korpusida regressiya testi (10–50 ta fayl, audit invariantlari)
2. Server + baza: buyurtma holati, rollar, har skan uchun hodisa yozuvi (traceability)
3. Furnitura xaltasi, qadoq materiali sarfi, yuklash rejasi
4. Termal printerga to'g'ridan-to'g'ri ZPL/TSPL eksporti
