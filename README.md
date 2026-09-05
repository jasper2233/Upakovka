# Upakofka tizimi

**Jonli demo:** https://jasper2233.github.io/Upakovka/
Ochilgach **«Namuna loyiha»** tugmasini bosing — tizim darrov pochkalarni teradi.

Mebel tsexi uchun **detallarni pochkalash (upakofka) MES tizimi**.
Raskroy dasturining `.project` faylini yuklaysiz — tizim detallarni pochkalarga teradi,
har detal uchun QR chek chiqaradi va upakovshikka 3D da qadam-baqadam qayerga qo'yishni ko'rsatadi.

**Server kerak emas. Internet kerak emas. O'rnatish kerak emas.**
`index.html` ni brauzerda ochsangiz bo'ldi.

Ichida namuna buyurtma bor — **«Namuna loyiha»** tugmasini bossangiz tizim darrov
**56 ta pochka** terib beradi (215 pozitsiya, 291 detal). Fayl yuklash shart emas.

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
| **Sozlamalar** | Me'yorlar uch blokda (standart / nostandart / ikkalasiga), qalinlik matritsasi, saralash posti, material katalogi, chek va buyurtma hujjati, saqlash |

---

## Ish jarayoni (upakofka posti)

1. Chapdan pochkani tanlang
2. O'ng ustunda **keyingi detal** ko'rinadi: kod, o'lcham, massa va **aniq joyi**
   («chap chetdan 230 mm, orqa chetdan 126 mm · 90° burilgan»)
3. Markazda 3D: keyingi detal **sariq soya** bo'lib turadi — qayerga tushishi oldindan ko'rinadi
4. Detalni qo'ying va QR ni skanerlang (yoki <kbd>Space</kbd> bosing)
5. Pochka tugagach — «rulondan qog'oz yechib o'rang, 2 tasma, chek yopishtiring»

**Klaviatura:** <kbd>Space</kbd>/<kbd>Enter</kbd> — qo'yildi · <kbd>Backspace</kbd> — orqaga ·
<kbd>Ctrl</kbd>+<kbd>O</kbd> — fayl yuklash · <kbd>Esc</kbd> — ochiq oynani yopish

Qisqartmalar **faqat Qadoqlash ekranida** va hech qanday oyna ochiq bo'lmaganda
ishlaydi; fokus tugmada yoki matn maydonida bo'lsa ular ham tegmaydi — aks holda
QR skanerning oxiridagi Enter detalni tekshiruvsiz «qo'yildi» deb belgilardi.

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
│     ├─ 04-packer.js      pochkalash algoritmi (MaxRects + simmetrik qavat + g'isht terish + quyruq + nostandart oqim)
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
├─ namuna/                 sinov uchun .project fayllar (SEED dan yasaladi)
├─ tools/
│  └─ seed-to-project.ps1  SEED dan namuna .project fayllarni yasaydi
├─ tests/
│  ├─ smoke.ps1            haqiqiy brauzerda 394 tekshiruv
│  ├─ corpus.ps1           205 ta real .project fayl bo'yicha regressiya
│  └─ shot.ps1             interfeys skrinshoti
└─ docs/
   ├─ README.md            hujjatlar ko'rsatkichi — qaysi savolga qayerda javob bor
   ├─ arxitektura.md       modullar, ma'lumot modeli, global nomlar
   ├─ meyorlar-TZ.md       har me'yorning texnik asoslanishi
   ├─ alohida-pochkalash.md  modul va xona kesimi
   ├─ TZ-v2.md             buyurtmachi bilan kelishilgan talablar
   ├─ TZ-v3-mantiq.md      guruhlash modeli va dunyo amaliyoti
   └─ ochiq-qarorlar.md    hali hal qilinmagan savol va takliflar
```

Hujjatlarning turi va bir-biridan farqi — **[docs/README.md](docs/README.md)**.

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
| `QALINLIK` | bitta qavatda ikki xil qalinlik (pochkada bir necha qalinlik — matritsa bilan ruxsat etilgan) |
| `GURUH` | pochkada modul / material / klass chegarasi buzilgan (odatda qo'lda ko'chirishdan) |
| `SEQ` | yig'ish ketma-ketligi detal soniga mos emas |
| `BALANDLIK` | pochka yoki bog' `Pochka maks. balandligi` dan baland |
| `TOM_TAGI` | tom ostidagi qavat («to'shak») siyrak — tom detallari qirraga tayanib dumalaydi |
| `TUZILMA` | pochkada tag detal yo'q yoki qavatda bo'sh o'rin qolgan |

**Ogohlantirishlar** (e'tibor talab qiladi, lekin xato emas):

| Kod | Nima |
|---|---|
| `TOM` | eng ustki yuza tom shartidan o'tmadi — sababi yozib qo'yiladi (pastda «Tom» bo'limi) |
| `TOM_TAYANCH` | tom ostidagi qavatga yetarli tegmayapti (`Tom detali tayanchi`) |
| `TOLDIRISH` | qavat `Qavat to'ldirish, min %` dan past |
| `TAG_OLCHAM` | tag detal o'lchami me'yordan chetda — odatda qo'lda ko'chirishdan keyin |
| `BOSH_POCHKA` | pochka faqat tag detaldan iborat, ustida qavat yo'q |
| `YENGIL` | pochka limitning yarmidan yengil, lekin guruhda zaxira bor |
| `MASSA_NOODATIY` | bitta detalning o'zi limitdan og'ir — bo'linmaydi |
| `BALANDLIK_NOODATIY` | bitta detalning o'zi balandlik limitidan qalin — bo'linmaydi |
| `BEGONA` | natijada kutilgan ro'yxatda yo'q detal bor (natija eskirgan — qayta pochkalang) |

Ikkita holat ataylab **jim turadi**, chunki ogohlantirish ishchiga hech narsa bermaydi:

| Holat | Nega ogohlantirilmaydi |
|---|---|
| **Quyruq qavati** to'ldirishi past | Quyruq `minFill` dan **ataylab** ozod — u guruh oxirida qolgan 2–4 detal uchun. Uning o'rnini uch boshqa o'lchov bosadi: `tailGap`, `tailSpan` va `lidBed` (pastda «Quyruq» bo'limi) |
| **Yengil pochka**, agar butun guruh bir pochkaga ham yetmasa | 3 mm orqa devorlar butun modulda 15 kg bo'lsa, ular 35 kg li pochka yasay olmaydi va boshqa qalinlik bilan aralasha ham olmaydi — bu kamchilik emas, materialning o'zi shunday |

---

## Tag (paddon) va qavat qoidalari

Pochkaning tagi — uning eng mas'ul qismi: ustidagi hamma narsa unga tayanadi,
ko'targich vilkasi unga tegadi, omborda ustiga boshqa pochka teriladi.
Shuning uchun tag alohida qoidalar to'plamiga bo'ysunadi.

### Tag oynasi

To'rt chegara birgalikda **qaysi detal tag bo'la olishini** belgilaydi:

```
tag eni  :  minBase (190)  …  baseWMax (1900)
tag bo'yi:  baseLMin (0)   …  maxLen   (2100)
qalinlik :  ≥ minBaseT (16)
```

Oyna **faqat tagga** tegishli. Oynadan chiqqan detal pochkadan chiqarilmaydi —
u shunchaki tag bo'lolmaydi va qavatga tushadi. 450×300 li polka tag bo'lolmaydi,
lekin 1753×600 tag ustida bemalol yotadi.

Yuqori chegaradan chiqqan detal esa **nostandart oqimga** o'tadi — chunki u hech
qanday tagga sig'maydi.

### Paddon qamrovi — 90 % va 40 mm

Tag pochkaning deyarli butun tagini egallashi shart. Ikkalasi **birga** tekshiriladi:

| Shart | Ma'nosi |
|---|---|
| **Yuza ≥ 90 %** | tag yuzasi pochka gabarit yuzasining kamida shuncha % i |
| **Qochish ≤ 40 mm** | tag gabaritdan har tomonga shuncha mm dan ko'p ichkariga qochmaydi |

Foiz umumiy qamrovni ushlaydi, mm esa bitta yomon tomonni: uzun pochkada 5 % yuza
ham 60 mm bo'lishi mumkin va qirra o'sha yerda osilib qoladi.

Foiz **80 dan 100 gacha** sozlanadi (chegara `readConf()` da ham shu) — pochka
qulay va ixcham chiqqunga qadar o'zgartirib ko'rish mumkin. Namuna buyurtmada
o'lchangan:

| Qamrov | Pochka | O'rtacha | To'ldirish |
|---|---|---|---|
| 80 % | 56 | 23,6 kg | 96 % |
| **90 %** | **56** | **23,6 kg** | **96 %** |
| 95 % | 58 | 22,8 kg | 93 % |
| 100 % | 64 | 20,6 kg | 93 % |

Ya'ni 90 % gacha chegara bu buyurtmada hech nimani qisib turmaydi; 95 % dan
boshlab tag nomzodlari kamayadi va pochka soni o'sadi.

### Har qavat — bitta qalinlikdan

Bitta qavatda ikki xil qalinlik **hech qachon** aralashmaydi. Sabab oddiy:
16 mm detal yonidagi 3 mm detal ustidagi qavatni 13 mm ga qiyshaytiradi,
pochka burchagi ko'tariladi va tasma bo'shab qoladi.

Yuza chegarasi (`minFill`) yonida **balandlik chegarasi** ham bor —
`Pochka maks. balandligi, mm`. Qavat soni aralash qalinlikda balandlikni yomon
o'lchaydi: 12 ta qavat 36 mm ham, 192 mm ham bo'lishi mumkin. Standart 0 —
cheklovsiz; sexda yacheyka balandligi ma'lum bo'lsa o'sha son kiritiladi.

### Qopqoq

- **16 mm dan yupqa detal qopqoq bo'lolmaydi** — u pochkaning ustki yuzasi,
  tasma tortiladi va ustiga boshqa pochka terilishi mumkin;
- qopqoq ham bitta qalinlikdan;
- **2–3 detalli qopqoqda bo'laklar deyarli teng bo'lishi kerak** — 60/40 yoki
  50/50 ruxsat, 88/12 yo'q. Mayda tasma chetda qolsa qog'oz o'ralganda burma
  hosil bo'ladi va tasma tortilganda detalni sindiradi.

Rasmiy shakli — **`Tom ulushi, min %`** (standart **40**): eng kichik detalning
ulushi shuncha % dan kam bo'lmasin. Formula: `minUlush(n) = lidBal − 10 × (n − 2)`,
ya'ni 2 detalda 40 %, 3 detalda 30 %. Batafsil — pastdagi «Tom» bo'limi.

### Yupqa detal tag bo'lgan holat

Butun guruh yupqa bo'lsa (masalan faqat 3 mm orqa devor), talab shu guruhning eng
qalin detaliga tushiriladi — aks holda ular hech qayerga joylasholmasdi.
Buning evaziga qat'iy qoida qo'llanadi: **yupqa tag ustiga qalin detal qo'yilmaydi**.
3 mm paddonli pochka oxirigacha 3 mm detallardan iborat bo'lib qoladi.

---

## Balandlik va massa — ikki mustaqil chegara

Pochka **ikki** sababdan yopiladi va ular teng huquqli:

- **massa** to'ldi (`Pochka maks. massa`, nostandart oqimda `Nostandart maks. massa`)
- **balandlik** to'ldi (`Pochka maks. balandligi`, 0 = cheklovsiz)

Qaysi biri avval to'lsa, qavat qo'shish o'sha yerda to'xtaydi. Qavat **soni**
chegarasi (`Maks. qavat soni`) uchinchi, mustaqil chegara: 12 ta 3 mm detal
36 mm, 12 ta 16 mm detal esa 192 mm beradi — shuning uchun qavat soni balandlikni
o'lchay olmaydi.

> **v20 da tuzatilgan xato.** Balandlik chegarasi bog'ga (nostandart detallar
> taxlamiga) umuman qo'llanmasdi: `oddBundles()` da faqat massa, o'lcham
> yaqinligi va gabarit tekshirilardi. Natijada `maxH = 160` mm qo'yilgan
> buyurtmada 12 ta 16 mm li detal bitta bog'ga tushib **192 mm** bo'lib chiqardi.
> Auditda ham balandlik invarianti yo'q edi — buzilish jim o'tib ketardi.
> Endi bog' ham chegarada va audit `BALANDLIK` xatosini beradi.

Bitta detalning o'zi chegaradan qalin bo'lsa — bu xato emas, uni bo'lib
bo'lmaydi: audit `BALANDLIK_NOODATIY` ogohlantirishini beradi (massa uchun
`MASSA_NOODATIY` qanday bo'lsa, shunday).

---

## Pochkalanmaydigan obyektlar

Haqiqiy proyekt fayllarida mebel detallari bilan bir qatorda **xona obyektlari**
ham keladi: devor, pol, shift. Ular ham `part` bo'lib yoziladi va o'z materialiga
ega — masalan `Devor`, 350 mm, 245 kg/m². Tizim ularni soddadillik bilan
pochkalab, **2,4 tonnalik «pochka»** yasab qo'yardi.

Chegara **qalinlik** bo'yicha: `Detal maks. qalinligi` (standart **60 mm**).
Chegara 205 ta haqiqiy faylda o'lchandi — 30 mm dan qalin barcha materiallar
ikki aniq guruhga bo'linadi:

| | Materiallar | Qalinlik |
|---|---|---|
| **Haqiqiy mahsulot** | `Stolishnitsa`, `MATO`, qalin LMDF | 32 … 50 mm |
| **Xona obyekti** | `Devor`, `Pol` | 100 … 350 mm |

Oralig'i bo'sh, shuning uchun 60 mm — xavfsiz chegara.

**Nega o'lcham bo'yicha emas.** «Listga sig'maydigan detal soxta» degan qoida
sinaldi va ishlamadi: faylda ko'pincha **qoldiq list** o'lchami yoziladi
(960×1830), haqiqiy 2428 mm li bok esa to'g'ri detal. Ya'ni bu qoida haqiqiy
detallarni chiqarib tashlagan bo'lardi.

Chiqarib tashlangani **yo'qolmaydi**: **Diagnostika → «Pochkalanmagan obyektlar»**
ro'yxatida kod, nom, soni va sababi ko'rinadi.

---

## Qalinlik matritsasi — qaysi qalinlik birga pochkalanadi

**Asosiy qalinlik** — buyurtmada detali eng ko'p bo'lgani. U avtomatik aniqlanadi,
sozlama emas. Sozlamalarda har qolgan qalinlik uchun bitta katak turadi:
*«3 mm → 16 mm pochkasiga»*.

Katak belgilansa, o'sha qalinlik asosiy pochkaga qo'shiladi — lekin **alohida qavat**
bo'lib. Ya'ni «qo'shish» degani: bitta pochkada, alohida qavatlarda. Tag va qopqoq
baribir yupqa detaldan bo'lmaydi.

Katak bo'sh bo'lsa — o'sha qalinlik eskicha, o'z pochkasini oladi.

---

## Nostandart detallar

Tag oynasining yuqori chegarasidan chiqqan yoki limitdan og'ir detallar.
Ilgari ular bitta ro'yxatga tashlanardi. Endi ular **saralanadi** va ikki yo'ldan
birini oladi — tizim o'zi tanlaydi:

| Yo'l | Qachon | Nima bo'ladi |
|---|---|---|
| **To'liq pochka** | detal tag bo'la oladi (eni ≥ 190) | oddiy pochkadagi butun mantiq: tag → qavatlar → qopqoq. Faqat massa va bo'yi chegarasi kattaroq |
| **Bog'** | detal tor, tag bo'lolmaydi | o'lchami yaqinlari bilan ustma-ust bog'lanadi: 2 ta 2400×180 — tabiiy bog' |

### Ikki oqim aralashmaydi

Nostandart oqimga **ikki xil** detal keladi va ular bir-biriga aralashmaydi:

| Oqim | Nima | Qayerga borishi mumkin |
|---|---|---|
| **Haqiqiy nostandart** | o'lcham yoki massa chegarasidan chiqqan (2188 mm li bok, 40 kg li tom) | faqat o'ziga o'xshagan nostandart bilan |
| **Standart qoldiq** | tag bo'lolmagan tor detal (438×100 polka) | o'z guruhidagi standart pochkaga singdirilishi mumkin |

Bitta pochkada haqiqiy nostandart va standart detal **hech qachon** birga
turmaydi. Uzun-tor detallar bog'iga oddiy polka tushib qolmaydi.

> Bu qoida v16 da buzilgan edi: yakuniy singdirish bosqichi ikkala oqimni
> aralashtirib yuborardi. Endi har pochkada oqim belgisi (`nst`) turadi va
> singdirish undan o'tolmaydi.

### Standart detal min. o'lchami

Ikki qo'shimcha chegara — **`Standart detal min. eni`** va **`min bo'yi`**
(standart **0 = o'chiq**):

Detal shu chegaradan kichik bo'lsa, u standart oqimga **umuman kirmaydi** —
nostandart oqimga o'tadi va o'ziga o'xshagan mayda detallar bilan bog' bo'ladi.

Tag oynasining pastki chegarasidan (`Tag eni, min`) farqi muhim:

| Chegara | Nima qiladi |
|---|---|
| `Tag eni, min` (190) | detal **tag bo'lolmaydi**, lekin standart pochkaning qavatiga tushaveradi |
| `Standart detal min. eni` (0) | detal **butunlay boshqa oqimga** o'tadi |

Sexda mayda detallarni alohida yig'ish qulay bo'lsa — shu yerda yoqiladi.
O'chiq holda mayda polkalar eskicha standart pochkada qoladi.

Uch sozlama:

- **Nostandart maks. massa** (40 kg) — standartdan katta bo'lishi mumkin.
  Uzun bok bitta o'zi 30 kg bo'lsa, uni 35 kg ga siqish bitta detallik pochkalarni
  ko'paytiradi. Audit ham, qo'lda tahrirlash ham bu pochkani aynan shu limit bilan
  o'lchaydi;
- **Nostandart maks. bo'yi / eni** (3200 / 1900 mm) — bog' gabariti shundan oshmaydi;
- **«O'lchami yaqin», maks** (300 mm) — shuncha mm ichida farq qilsa bitta bog'ga
  tushadi. Kattalashtirsa bog' kamayadi, lekin bog' ichida turli o'lchamlar
  aralashadi va u fizik jihatdan bog' bo'lmay qoladi.

Nostandart pochkalar ro'yxatda **o'z moduli ostida** turadi (oxirida emas) va
sarlavhasida `NS` belgisi bo'ladi.

---

## Tom — pochkaning eng ustki yuzasi

Yetkazib berishda pochkalar **bir-birining ustiga** teriladi. Demak pastdagi
pochkaning tomi ustidagining butun og'irligini ko'taradi. Tom ochiq qolsa —
og'irlik bir necha kichik detalga to'planadi: qirralar eziladi, tasma bo'shaydi,
og'irlik teng taqsimlanmaydi.

Shuning uchun **har bir pochkaning eng ustki qavati** besh shartga bo'ysunadi —
u qanday paydo bo'lganidan qat'i nazar:

| Shart | Qiymat |
|---|---|
| **Yuza** | ≥ **90 %** (`Tom (qopqoq) yopilishi, min %`) |
| **Detal soni** | ≤ **3** (`Qopqoq detallari, maks`) |
| **Ulushlar** | 2 detalda **60/40**, 3 detalda **30/30/30** atrofida |
| **Gabarit** | hech bir detal pochka konvertidan chiqmaydi |
| **Qalinlik** | ≥ **16 mm** |

Ulush qoidasi bitta son bilan beriladi — `Tom ulushi, min %` (standart 40):

```
minUlush(n) = lidBal − 10 × (n − 2)
   2 detal → 40 %   60/40 ✓   50/50 ✓   65/35 ✗   88/12 ✗
   3 detal → 30 %   34/33/33 ✓   55/25/20 ✗
```

**v16 gacha detal soni va ulush shartlari faqat tizim atayin tergan qopqoqqa
qo'llanardi.** Eng ustki qavat shunchaki «qopqoq» deb ko'tarilganda ular
tekshirilmasdan qolardi — natijada 96 % yopilgan, lekin 958×510 va 511×84
detallardan iborat tom chiqib ketardi. Yuza yopiq, lekin og'irlik notekis.

**Narxi o'lchandi.** 205 ta haqiqiy buyurtmada (`tests\corpus.ps1`) qavatli
2932 pochkadan **434 tasi (14,8 %)** baribir ochiq tom bilan chiqadi — ular
auditda `TOM` ogohlantirishini oladi. Qolgan 85 % da qoida bajariladi va
zichlikka sezilarli ta'sir qilmaydi: namuna buyurtmada `Tom yopilishi` ni
90 dan 100 ga ko'tarish 56 → 58 pochka beradi (+3,6 %).

Terish algoritmida **yopiq tom eng og'ir ball oladi** — variant tanlashda u
massadan ham ustun turadi. Baribir yopolmasa, audit `TOM` ogohlantirishini beradi:
*«eng ustki yuza 43 % yopilgan, 1 detal»*. Bu xato emas — ba'zi pochkada (tag +
bitta kichik detal) toza tom yasashning imkoni yo'q. Lekin P/M buni ko'rishi va
o'sha pochkani stopkaning **tepasiga** qo'yishi kerak.

---

## Quyruq — guruh oxiridagi qoldiq

Har qavat tag yuzasining kamida **85 %** ini qoplashi shart (`minFill`). Bu qoida
bitta narsani himoya qiladi: *ustidagi qavat egilmasin*. Lekin u guruhning oxirgi
2–4 detaliga ham tegib, ularni yarim bo'sh alohida pochkaga chiqarib yuborardi.

Endi bunday qoldiq tayyor pochkaning ichiga, **qopqoq ostiga** suqiladi:

```
████████████████   qopqoq  100 %   ← ustiga keyingi pochka tayanadi
███░░░███░░░░░░░   quyruq   47 %   ← qoldiq detallar
████████████████   qavat    98 %
████████████████   TAG
```

**Nega qopqoq ostiga, ustiga emas.** v13 da quyruq eng ustga qo'yilardi —
«ustida hech narsa yo'q, demak egiladigan narsa ham yo'q» degan asos bilan.
Asos noto'g'ri edi: ustida **keyingi pochka** turadi. Endi pochkaning tomi
tegilmaydi. Qopqoq quyruq ustida osilib qoladi, lekin ko'pi bilan bir qavat
(quyruq qalinligi, odatda 16 mm) pastga egiladi va shundan keyin quyi qavatga
tayanadi — egilish o'zi cheklangan.

Nishon pochkaning tomi **ochiq** bo'lsa (qopqog'i yo'q), quyruq eskicha ustiga
tushadi va o'zi tom shartidan o'tishi shart — u yerda uni himoya qiladigan
qopqoq yo'q.

### Nega foiz emas, millimetr

Quyruq qavati `minFill` (85 %) shartidan **ozod** — u guruh oxirida qolgan 2–4
detalni sig'dirish uchun bor. Lekin to'ldirish **foizi noto'g'ri o'lchov**:

| Bir xil 44 % | Ustidagi qopqoq |
|---|---|
| 4 ta tor detal butun chuqurlik bo'ylab tarqalgan | har 50–90 mm da tayanadi ✓ |
| 2 ta keng detal bir joyda yig'ilgan | **681 mm bo'shliq** ustidan o'tadi ⚠ |

Foiz ikkalasini ajratmaydi. Shuning uchun chegara **millimetrda**:
**`Quyruqda maks. bo'shliq`** (standart 300 mm) — quyruq detallari orasida
va tag chetigacha qolgan eng katta tayanchsiz oraliq shundan oshmasin.

Namuna buyurtmada eng katta quyruq bo'shlig'i **187 mm** — ya'ni 200 mm dan
yuqori chegara unga umuman tegmaydi. Qisganda narxi ko'rinadi:

| `tailGap` | Pochka | O'rtacha | Eng katta bo'shliq |
|---|---|---|---|
| o'chiq · 500 · **300** | **56** | **23,6 kg** | 187 mm |
| 200 | 56 | 23,6 kg | 187 mm |
| 150 · 100 | 57 | 23,2 kg | 64 mm |
| 50 | 58 | 22,8 kg | 16 mm |

Chegara real buyurtmalarda ishlaydi — namuna undan qiyinroq holatni bermaydi.

Qat'iy shartlar (bittasi buzilsa — singdirish bekor, pochka o'z holicha qoladi):

- massa, qavat va balandlik limitlari oshmaydi;
- ustidagi qavat 300 mm dan ko'p tayanchsiz o'tmaydi;
- paddon qamrovi buzilmaydi;
- nishon pochka **shu guruhdan** — modul / material / klass / qalinlik chegarasi saqlanadi;
- yupqa tag ustiga qalin detal tushmaydi;
- **hammasi yoki hech narsa** — yengil pochka yarmigacha ko'chmaydi.

Ishchiga bu ko'rinib turadi: 2D rejada qavat sarlavhasi *«quyruq (qopqoq ostida)»*,
qadam matnida *«quyruq — qopqoq ostiga»*.

### Qoldiq uchun massa zaxirasi

Qoldiq detal odatda 2–8 kg bo'ladi, nishon pochkada esa 30 kg turadi. 35 kg limiti
tufayli ular alohida qolib ketardi va butun buyurtmada o'nlab yarim bo'sh pochka
to'planardi. Bitta 43 kg li pochka ikkita (33 + 10) dan ko'ra tashishga ham,
omborga ham qulayroq.

Shuning uchun **`Qoldiq uchun zaxira, kg`** (standart 10) — singdirishda massa
limitidan shuncha kg oshishga ruxsat. Uch narsani bilib qo'ying:

- zaxira **faqat singdirishda** ochiladi — oddiy terish baribir 35 kg bilan cheklangan;
- zaxira **oxirgi chora**: singdirish avval chegara ichida joy qidiradi va faqat
  topilmasa zaxirani ochadi. Ochilganda ham **eng kam oshadigan** nishon tanlanadi —
  33 kg li pochkani 41 ga ko'targandan ko'ra 20 kg li pochkani 28 ga ko'targan yaxshi;
- zaxiradan foydalangan pochka ro'yxatda `toza 38,5/45 kg (zaxira)` deb ko'rinadi
  va chekda **«2 KISHI»** chiqadi.

**Mutlaq shift — 45 kg** (`maxKg + zaxira`). U nostandart limitning ustiga
qo'shilmaydi: nostandart pochka ham shu shiftdan oshmaydi.

Namuna buyurtmada o'lchangan:

| `Qoldiq uchun zaxira` | Pochka | O'rtacha | Zaxiradan foydalangan |
|---|---|---|---|
| 0 (o'chiq) | 62 | 21,3 kg | 0 |
| 5 kg | 58 | 22,8 kg | 4 |
| **10 kg** | **56** | **23,6 kg** | **6** |
| 20 kg | 56 | 23,6 kg | 4 |

Ya'ni zaxira 62 → 56 pochka beradi va uni ishlatgan pochkalar ulushi 11 %.

### Qoldiq qayerga tushadi — uch yo'l

| Yo'l | Qachon |
|---|---|
| **Shu guruhdagi pochkaga qo'shiladi** | gabariti to'g'ri kelsa — massa zaxirasi doirasida. Nishon **eng zich joylashadigani** bo'yicha tanlanadi, ya'ni bir xil o'lchamli detallar o'z-o'zidan birga to'planadi |
| **Bir xil o'lchamlilar bog'i** | tor detal tag bo'lolmasa — o'lchami yaqinlari bilan ustma-ust bog'lanadi |
| **Yolg'iz o'raladi** | hech qayerga sig'masa — o'z pochkasida qoladi |

Singdirish **butun buyurtma bo'ylab** oxirida yana bir marta yuritiladi: shunda
nostandart bog' ham o'z guruhidagi standart pochkaga singishi mumkin. Namunada
shu bosqichdan keyin bog'lar umuman qolmadi.

Namuna buyurtmada quyruq mexanizmining o'z hissasi: singdirish o'chirilsa
**62 pochka** (o'rtacha 21,3 kg), yoqilganda **56 pochka** (23,6 kg).

### Qo'lda tuzatish quyruqni buzmaydi

P/M pochkani qo'lda o'zgartirganda tizim uni boshidan qayta teradi — quyruq esa
`minFill` shartidan o'tmaydi, ya'ni qayta terishda albatta "ortiqcha" bo'lib qoladi.
Shuning uchun qayta terish **atomik**:

> hamma detal joylashsa — pochka yangilanadi; birortasi joylashmasa — pochka
> **butunlay tegilmagan** holda qoladi va P/M sababni ko'radi.

Ilgari bunday ortiqcha detal pochkadan jimgina chiqib ketardi va faqat auditda
`YOQOLGAN` bo'lib chiqardi. Endi buni test ushlab turadi: hech qanday qo'lda amal
detalni buyurtmadan yo'qotmaydi.

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
- `100 × 70` / `80 × 60` / `58 × 40 mm` — termal printer, har chek alohida varaqda
- `Boshqa — qo'lda (mm)` — o'lchamni o'zingiz kiritasiz (20…300 mm)

**Brutto** = detallar massasi + qadoq materiali (tara: qog'oz + 4 burchak + tasma).
Tara sozlamalarda kiritiladi va **pochkalash hisobiga kirmaydi** — u faqat chek va
«2 kishi ko'taradi» ogohlantirishi uchun.

---

## Tom ostidagi qavat — «to'shak»

Tomning yuzasi 98 %, nisbatlar 30/30/30, gabarit joyida — va shunga qaramay
tom detallari **dumalab ketadi**, agar ostidagi qavat siyrak bo'lsa.

Sexda ko'rilgani: tom uch tasmadan iborat — 1897×100 + 1790×100 + 1897×100 —
ostidagi qavat esa faqat o'rtani egallaydi. Chetdagi ikkita tasma qirraga
tayanib qoladi va tasma tortilgunga qadar joyidan qo'zg'aladi.

Qoida: **tom ostidagi qavat o'z yuzasining kamida 85 % ini qoplasin.**
Buzilishi — **xato** (audit `TOM_TAGI`), ogohlantirish emas.

Amalda bu **quyruqqa** tegishli: oddiy qavatlar allaqachon `minFill` (85 %) dan
o'tadi, quyruq esa undan ozod. Endi siyrak quyruq tom ostiga qo'yilmaydi —
**bir qavat pastga suqiladi** yoki umuman singdirilmaydi:

| Holat | Quyruq qayerga tushadi |
|---|---|
| quyruq zich (≥ 85 %) | eskicha — tom ostiga |
| quyruq siyrak, pochkada zich qavat bor | **bir qavat pastga** — tom o'sha zich qavat ustida qoladi |
| quyruq siyrak, zich qavat yo'q | singdirilmaydi — qoldiq o'z pochkasida qoladi |

| `lidBed` | Pochka | O'rtacha | Eng yomon to'shak | Buzilgan |
|---|---|---|---|---|
| o'chiq · 70 % | 55 | 24,0 kg | 75 % | 3 / 33 |
| **85 % · 100 %** | **56** | **23,6 kg** | **85 %** | **0 / 32** |

> Chegara `minFill` dan qat'iyroq bo'lolmaydi. Oddiy qavat aynan `minFill` bilan
> qabul qilinadi — undan ko'pini talab qilish bajarilmas shart bo'lardi va audit
> hech qachon toza chiqmasdi. `minFill` ni 60 ga tushirsangiz to'shak talabi ham
> 60 bo'ladi.

Boshqa konfiguratsiyada (kesimsiz, UMUMIY guruh) ham o'lchangan edi: buzilgan
**4 → 0**, eng yomon to'shak **73 % → 86 %**. Jadvaldagi raqamlar esa standart
sozlamadagi namuna buyurtmaga tegishli.

---

## Tom detali ostidagi qavatga tegadimi

Tomning yuzasi to'g'ri, nisbatlari to'g'ri, gabaritdan chiqmagan bo'lishi
mumkin — va shunga qaramay u sinadi, agar **ostidagi qavatga tegmasa**.

Sexda ko'rilgani: tom uch detaldan iborat, yuzasi 98 %, nisbatlar 30/30/30 —
hammasi qoida bo'yicha. Lekin ostidagi qavat tor: o'rtadagi detal unga tegadi,
**chetdagi ikkitasi undan butunlay chiqib osilib qolgan** — tegish yuzasi 30 %
ham emas. Ustiga pochka terilsa o'sha ikkitasi sinadi.

Yangi qoida: **har bir tom detali** o'z yuzasining kamida **65 %** i bilan
ostidagi qavatga tegishi shart (ostida qavat bo'lmasa — tag detalga).

**Nega har detal alohida, o'rtacha emas.** Uchta detalning o'rtachasi 70 %
bo'lishi mumkin, lekin chetdagi bittasi 0 % bo'lsa u baribir osilib turadi.
O'rtacha aynan shu nosozlikni yashiradi — shuning uchun **eng yomoni** olinadi.

| `lidSupp` | Pochka | O'rtacha | Eng yomon tom tayanchi |
|---|---|---|---|
| o'chiq · 50 % | 54 | 24,5 kg | 80 % |
| **65 %** | **56** | **23,6 kg** | **80 %** |
| 80 % | 57 | 23,2 kg | 80 % |
| 90 % | 58 | 22,8 kg | 72 % |

Oxirgi qator qoidaning chegarasini ko'rsatadi: 90 % qo'yilsa ham namunada
undan yaxshi joylashuv yo'q — natija yomonlashadi va audit `TOM` yoki
`TOM_TAYANCH` ogohlantirishini beradi. Shuning uchun standart 65 %.

Uch o'lchov endi uch xil nosozlikni ushlaydi va bir-birini almashtirmaydi:

| O'lchov | Nimani ko'radi |
|---|---|
| `tailGap` (300 mm) | detallar orasidagi **teshik** |
| `tailSpan` (70 %) | butun qavatning **umumiy kengligi** |
| `lidSupp` (65 %) | **har bir tom detalining** ostidagi qavatga tegishi |

> `lidSupp` `layoutPack` da qat'iy rad etish emas, **ball** orqali ishlaydi:
> tomi tayangan variant kuchli ustunlikka ega. Ba'zi guruhda esa hech qanday
> joylashuv shartni bajara olmaydi — detallar shunchaki yo'q. Bunday holat
> **jim qolmaydi**: audit `TOM` yoki `TOM_TAYANCH` ogohlantirishini beradi.
> Standart 65 % da namuna korpusida bajarilmagan holat yo'q.

### TOM ogohlantirishi endi sababni aytadi

Ilgari matn har doim bir xil edi — «≥ 90 %, ≤ 3 detal» — va 100 % yopilgan,
2 detalli tom uchun ham o'sha matn chiqardi. P/M nima noto'g'ri ekanini
topolmasdi (asl sabab 82/18 nisbat edi). Endi sabab yozib qo'yiladi:

```
eng ustki yuza — yuza 68% < 90%; 5 detal > 3 (ustiga pochka terilganda ...)
eng ustki yuza — nisbat 18% < 40% (...)
eng ustki yuza — tayanch 31% < 65% (detal ostidagi qavatdan chiqib turibdi)
```

---

## Quyruq tayanchi — nega bo'shliq o'lchovi yetarli emas

Quyruq qavati `minFill` (85 %) dan ozod, shuning uchun uning o'rnini **ikki**
o'lchov bosadi va ular boshqa-boshqa nosozlikni ushlaydi:

| O'lchov | Nimani ko'radi | Qanday nosozlik |
|---|---|---|
| **Bo'shliq** (`tailGap`, 300 mm) | detallar orasidagi eng katta tayanchsiz oraliq | ikki keng detal bir chetga yig'ilib, o'rtada teshik |
| **Tayanch** (`tailSpan`, 70 %) | har o'q bo'yicha qoplanish ulushi | bitta tor detal **markazda**: teshik yo'q, lekin qopqoq qirraga tayanadi |

Sexda ko'rilgan nosozlik aynan ikkinchisi edi: **1910×300** li pochkaga
**1720×160** li quyruq markazga tushgan. Chetdagi bo'shliqlar atigi 70 va
102 mm — bo'shliq chegarasi bemalol o'tkazadi. Lekin qopqoq 300 mm enli
pochkada 160 mm enli qirra ustida yotadi (**53 %**) va ustiga pochka
terilganda arra-kamon bo'lib **ag'dariladi**.

Namuna korpusida chegarasiz eng yomon holat **17 %** edi: 1878×600 li pochkaga
uchta 438×100 li tasma — qopqoq eni bo'yicha 17 % tayanchda turardi.

Ikki o'q **alohida** o'lchanadi va kichigi olinadi: bir o'q bo'yicha 90 %
bo'lishi ikkinchisini oqlamaydi. Chetdan chiqqan qism tayanchga qo'shilmaydi —
tagdan tashqarida tayanch yo'q.

| `tailSpan` | Pochka | O'rtacha | Eng tor tayanch |
|---|---|---|---|
| o'chiq · 60 % · **70 %** · 80 % | **56** | **23,6 kg** | 80 % |
| 90 % | 57 | 23,2 kg | 91 % |

Namuna buyurtmada eng tor quyruq tayanchi 80 % — ya'ni 80 % gacha chegara
tegmaydi. `tailGap` kabi, bu ham real buyurtmalar uchun qo'yilgan qorovul.

> Oddiy qavatlarga bu qoida kerak emas: `fill ≥ 85 %` bo'lsa qoplanish har
> ikkala o'q bo'yicha ham kamida 85 % bo'ladi (yuza ulushi ikki o'q
> ko'paytmasidan katta bo'lolmaydi). Faqat quyruq foizdan ozod, shuning uchun
> chegara faqat unga qo'yiladi.

---

## Chek va hujjat: qaysi biri qachon chiqadi

Uch xil bosma bor va ular bir-birini almashtirmaydi:

| Nima | Qachon | O'lchami | Ichida nima bor |
|---|---|---|---|
| **Detal cheki** | ishchi qo'lda so'raganda | tanlangan o'lcham | bitta detal: kod, o'lcham, massa, material, modul, QR |
| **Pochka cheki** | pochkaning oxirgi detali qo'yilganda — **o'zi** | tanlangan o'lcham (`80 × 60` — tavsiya) | pochka: modul, material, qavat, detal soni, netto/brutto, QR va **ichidagi detallar ro'yxati** |
| **Buyurtma hujjati** | butun buyurtma yig'ilib bo'lgach | **A4** | to'liq tarkib: har pochka, har detal, material kesimi, imzo joylari |

### Chek o'lchamini qo'lda belgilash

Sozlamalar → «QR chek va chop etish» → *Chek o'lchami*:

- **A4** — bir varaqda 2 ustun (oddiy printer)
- **100 × 70**, **80 × 60**, **58 × 40** mm — termal printer, har chek alohida varaqda
- **Boshqa — qo'lda (mm)** — o'lchamni o'zingiz kiritasiz (*Qo'lda: eni* va *Qo'lda: bo'yi*), 20…300 mm

Chek bo'yi **62 mm dan past** bo'lsa tizim shriftni avtomatik kichraytiradi va
pochka chekidagi detallar ro'yxatini 12 tagacha qisqartiradi — kesilgani
«+N ta» bo'lib yozib qo'yiladi, ya'ni ishchi ro'yxat to'liq emasligini biladi.

### Avtomatik pochka cheki

«Avtomatik chek» belgisi yoqilgan bo'lsa (standart holat), pochkaning oxirgi
detali qo'yilishi bilan chop oynasi **o'zi ochiladi**. Ish tartibi:
oxirgi detal → qog'ozga o'rash → chekni yopishtirish.

> Brauzer jimgina bosib chiqara olmaydi — chop oynasi ochiladi, ishchi Enter
> bosadi. Bu brauzerning xavfsizlik cheklovi, aylanib o'tib bo'lmaydi.

Chek **faqat o'tish paytida** chiqadi: tayyor pochkada Enter qayta bosilsa
chek qayta chiqmaydi.

### Buyurtma hujjati — A4, to'liq tarkib

Sozlamalar → «Buyurtma hujjati». Ikki tugma:

- **Holatni tekshirish** — nima qolganini yozadi: qaysi pochka yig'ilmagan, necha detal qoldi
- **To'liq tarkib — A4** — hujjatni chop etadi

Hujjat **faqat hamma pochka yig'ilib bo'lgandan keyin** chiqadi. Yarim yig'ilgan
buyurtmaga «to'liq tarkib» berilsa u yolg'on hujjat bo'ladi: ombor yo'qolgan
detal bilan qabul qilib oladi. Tayyor bo'lmasa tugma chop etmaydi, holatni
ko'rsatadi.

Hujjat ichida:

1. Sarlavha — buyurtma nomi, uuid, reviziya, sana
2. Umumiy ko'rsatkichlar — pochka, detal, xona, modul, netto, brutto
3. Pochkalar jadvali — har pochka bir qator
4. To'liq detal ro'yxati — pochka bo'yicha guruhlangan: kod, nomi, o'lcham, material, kant, kg
5. Material kesimi
6. **Furnitura va aksesuarlar** — ro'yxat kiritilmagan, sababi bilan (pastga qarang)
7. Pochkalanmagan obyektlar (agar bo'lsa) — devor, pol, shift
8. Imzo joylari — topshirdi / qabul qildi / sana

### Furnitura nima uchun yo'q

`.project` faylida furnitura ma'lumoti **saqlanmaydi**. 205 ta real fayl
tekshirildi: XML da atigi beshta teg bor — `project`, `good`, `material`,
`operation`, `part` — va `good` turlari `product`, `sheet`, `band`, `CS`,
`XNC`, `EL`, `LB`, `tool.cutting`, `tool.edgeline`. Petlya, tortma, ruchka,
shurup — hech biri yozilmagan.

Shuning uchun hujjat bu yerda **yolg'on yozmaydi**: ma'lumot manbasi yo'qligini
ochiq aytadi va furnitura alohida hujjat bo'yicha topshirilishini ko'rsatadi.

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

### Uch blok — qaysi raqam qaysi oqimniki

Sozlamalar ekrani **oqim bo'yicha** ajratilgan. Ilgari 35 kg bilan 40 kg,
2100 mm bilan 3200 mm bir ro'yxatda yonma-yon turardi va boshqaruvchi qaysi
raqam qaysi oqimga tegishli ekanini ko'rmasdi — nostandart limitni o'zgartirib
«standart pochkalarni buzdim» deb o'ylardi.

| Blok | Rang | Nimaga ta'sir qiladi |
|---|---|---|
| **STANDART** | yashil | tag oynasi (kim standart), tag/paddon detal, qavat va balandlik |
| **NOSTANDART** | qizg'ish | faqat nostandart bog': massa 40 kg, bo'yi 3200, eni 1900, «o'lchami yaqin» |
| **IKKALASIGA** | ko'k | ko'tarish chegarasi, tara, detal maks. qalinligi, qalinlik matritsasi, quyruq |

Har maydonda **«?»** — sichqoncha olib borilsa (yoki Tab bilan tanlansa)
podskaska chiqadi: maydon nimani qiladi, nimaga shu qiymat tanlangan va
oshirsa/kamaytirsa nima o'zgaradi — imkoni bo'lsa o'lchangan raqam bilan
(quyruq bo'shlig'i uchun: o'chiq / 300 / 200 — 56 pochka, 150 — 57, 50 — 58).

> Testda qo'riqlanadi: uch blok bor, har maydon o'z blokida, nostandart limit
> standart blokka sizib o'tmagan va **har** maydonda ≥ 40 belgili podskaska bor —
> ya'ni podskaskasiz yangi sozlama qo'shib bo'lmaydi.

### Har sozlama tizimga bog'langan

Sozlamalar bo'limidagi **hamma** maydon uch narsaga ulangan va bu testda
qo'riqlanadi:

1. **`readConf()` o'qiydi** — qiymat `S` ga tushadi
2. **O'zgarishi qayta hisobni chaqiradi** — natija darrov yangilanadi
3. **Saqlanadi va tiklanadi** — keyingi ochilishda joyida turadi

> **v20 da tuzatilgan xato.** Bu ro'yxatlar qo'lda yozilgan edi va har yangi
> me'yor qo'shilganda ularni yangilash unutilardi. Oqibati **jim** bo'lardi:
> maydon interfeysda turadi, operator qiymat kiritadi — lekin u saqlanmaydi va
> qayta hisobni ham chaqirmaydi. Sozlama shunchaki **yozuv** bo'lib qolardi.
>
> Sexda bu shunday ko'rindi: «Pochka maks. balandligi» ga 160 mm qo'yilgan,
> tizim esa 12–14 qavat terib yuborgan. Balandlik mantig'i to'g'ri edi — maydon
> packerga **yetib bormasdi**.
>
> Tekshirganda 46 maydondan **21 tasi** saqlanmas, **30 dan ortig'i** qayta
> hisobni chaqirmas ekan: `cBaseWMax`, `cBaseLMin`, `cBaseCover`, `cBaseInset`,
> `cMaxH`, `cMaxPartT`, `cLidBal`, `cOddKg`, `cOddLMax`, `cOddWMax`, `cOddTol`,
> `cTailOver`, `cTailGap`, `cTailSpan`, `cLidSupp`, `cLidBed`, `cMinPartW`,
> `cMinPartL`, `cLabelW`, `cLabelH`, `cAutoLbl` va qalinlik matritsasi.
>
> Endi ro'yxat **DOM dan yig'iladi** — unutish mumkin emas. Standart holat:
> har maydon qayta hisobga tushadi; faqat ko'rinishga ta'sir qiladiganlar
> (chek o'lchami, tara, prefiks, saralash posti) alohida ro'yxatda.

### Uch chegara: massa, balandlik, qavat soni

Pochka uch sababdan yopiladi va **uchalasi ham** oddiy pochkaga ham, bog'ga ham
qo'llanadi:

| Chegara | Sozlama | Oddiy pochkada | Bog'da |
|---|---|---|---|
| massa | `maxKg` / `oddKg` | tag + qavatlar | detallar yig'indisi |
| balandlik | `maxH` | `base.T + Σ qavat` | qalinliklar yig'indisi |
| qavat soni | `maxLayers` | tag + qavatlar | detallar soni |

Qaysi biri avval to'lsa, terish o'sha yerda to'xtaydi. Misol: 16 mm laminat va
`maxH = 160` → **10 qavat**, chunki 11-qavat 176 mm bo'lardi.

> v20 gacha balandlik ham, qavat soni ham bog'ga qo'llanmasdi: bog' 12 ta
> 16 mm li detaldan iborat bo'lib **192 mm** chiqardi va ro'yxatda «12 qavat»
> bo'lib ko'rinardi. Audit ham buni ko'rmasdi — `QAVAT` tekshiruvi bog'ni
> o'tkazib yuborardi. Endi ikkovi ham xato darajasida.

### Me'yorlarning asoslanishi

Har me'yorning texnik asoslanishi **[docs/meyorlar-TZ.md](docs/meyorlar-TZ.md)** da
yozilgan: nima uchun 35 kg, nega chiqish 20 mm, qavat to'ldirish 85 % va paddon
qamrovi 90 % qayerdan olingan va har birini oshirsa/kamaytirsa nima bo'ladi.
Kod tuzilishi va ma'lumot modeli — **[docs/arxitektura.md](docs/arxitektura.md)**.

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

### Haqiqiy fayllar korpusi

`smoke.ps1` bitta sun'iy namunani tekshiradi. Haqiqiy fayllarda esa boshqacha
holatlar bor — bo'sh operatsiya, qoldiq list o'lchami, xona devori, bitta modul,
400 detal. Shuning uchun alohida vosita:

```powershell
.\tests\corpus.ps1                              # hamma fayl
.\tests\corpus.ps1 -Take 20                     # birinchi 20 tasi
.\tests\corpus.ps1 -Csv yangi.csv -Compare eski.csv   # ikki yurishni solishtirish
```

Har fayl uchun bitta qator: detal, pochka, o'rtacha massa, to'ldirish, ochiq tom,
audit xatosi, ogohlantirish. Oxirida umumiy hisobot va xatoli fayllar ro'yxati.
`-Compare` bilan algoritm o'zgarishining **butun korpusga** ta'siri ko'rinadi:
qaysi fayl yaxshilandi, qaysi yomonlashdi, audit buzildimi.

Fayllar `namuna\Project` da kutiladi. **Bu papka `.gitignore` da** — u yerda
haqiqiy mijoz buyurtmalari turadi va repo ochiq. Skript faqat statistika
chiqaradi, tarkibni emas.

Oxirgi o'lchov (205 fayl, 15 958 detal, 61 414 kg):
**205/205 o'qildi, audit xatosi 0, detal yo'qolmadi** — 4892 pochka
(shundan 881 tasi nostandart bog'), o'rtacha 12,6 kg, ochiq tom 434/2932 (14,8 %),
zaxiradan foydalangan 97 pochka, pochkalanmagan xona obyekti 6 ta.

Skript sahifani **haqiqiy brauzerda** (Edge yoki Chrome, headless) yuklaydi va
**394 ta** tekshiruvni bajaradi. Node.js kerak emas. Nima tekshiriladi:

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
- **Quyruq**: yaratilishi, HAR DOIM eng tepada turishi, massa/qavat limitini buzmasligi,
  konvert ichida qolishi, qadam roli, auditda `TOLDIRISH` bermasligi, o'chirilganda pochka
  sonining oshishi
- `YENGIL` ogohlantirishi guruhga qarashi: kichik guruh jim, zaxirali guruh ogohlantiriladi
- Seansda `key` / `room` / `tail` saqlanishi va tiklangandan keyin ham qo'lda ko'chirish
  guruh himoyasining ishlashi
- **Qoldiq zaxirasi**: oxirgi chora sifatida ishlatilishi (ulush < 15 %),
  mutlaq shiftdan oshmasligi, nostandart limit ustiga qo'shilmasligi,
  chegara buzilmasligi, belgilanmagan pochkada ochilmasligi,
  auditda MASSA xatosi bermasligi, 0 da limitdan og'ir pochka qolmasligi
- **Tom**: quyruq tomni yomonlashtirmasligi, quyruq qopqoq ostiga tushishi,
  `tomOK`/`lidOK` chegaralari (60/40 va 50/50 ruxsat, 88/12 rad)
- **Tag oynasi**: hamma tag oyna ichida, eni chegarasi haqiqatan qisadi
- **Paddon qamrovi**: 90 % va 40 mm buzilmasligi, 100 % da chiqish umuman qolmasligi
- **Qavat qalinligi**: hech bir qavat aralash emas; audit aralash qavatni ko'rishi
- **Qalinlik matritsasi**: ikki qalinlik bitta pochkada, lekin qavat aralashmasligi,
  tag va qopqoq yupqa bo'lmasligi
- **Qopqoq**: min qalinlik, muvozanat (60/40 va 50/50 ruxsat, 88/12 rad)
- **Oqimlar ajratilishi**: standart va nostandart bitta pochkada aralashmasligi,
  har pochkada oqim belgisi bo'lishi, seansda saqlanishi
- **Standart detal min. o'lchami**: chegaradan kichigi nostandart deb belgilanishi
  va standart pochkaga tushmasligi
- **Pochkalanmaydigan obyektlar**: sun'iy «devor» qo'shilganda u chiqarib
  tashlanishi, massasi pochkaga kirmasligi, chegara ko'tarilsa qaytishi
- **Sozlamalar ekrani**: uch blok (standart / nostandart / ikkalasiga), maydonlar
  o'z blokida, oqim limitlari aralashmagan, har maydonda mazmunli podskaska
- **Chek o'lchami**: tayyor o'lchamlar va qo'lda kiritilgani `@page` ga tushishi,
  chegaradan tashqari qiymat qisilishi, 80×60 da detallar ro'yxati kesilishi va
  kesilgani yozilishi, A4 da kesilmasligi
- **Avtomatik pochka cheki**: oxirgi detalda bir marta chiqishi, tayyor pochkada
  qayta chiqmasligi, o'chirilganda umuman chiqmasligi
- **Buyurtma hujjati**: yig'ilmagan buyurtmada chop etilmasligi, tayyor bo'lganda
  hamma pochka va hamma detal kodi hujjatga tushishi, imzo joyi va furnitura izohi
- **Balandlik chegarasi**: oddiy pochkaga ham, bog'ga ham qo'llanishi; massa va
  balandlik mustaqil ishlashi; audit buzilishni ko'rishi
- **Quyruq tayanchi**: o'lchov kichik o'q bo'yicha olinishi, chetdan chiqqan
  qism sanalmasligi, ustma-ust bo'laklar ikki marta sanalmasligi, chegara
  ko'tarilganda tayanch kengayishi
- **Tom detali tayanchi**: o'lchovning o'zi (100 % / 50 % / 0 % holatlari), eng
  yomoni olinishi (o'rtacha emas), chegara tayanchni yaxshilashi va bajarilmagan
  holat audit ogohlantirishisiz qolmasligi
- **Tom ostidagi qavat**: chegara `minFill` bilan qisilishi, siyrak quyruq tom
  ostiga tushmasligi, audit buzilishni **xato** deb ko'rishi, quyruq mexanizmi
  butunlay o'chib qolmasligi
- **Sozlamalarning bog'lanishi**: har maydon saqlanadigan ro'yxatda bo'lishi,
  o'zgarishga bog'langani, `readConf()` uni haqiqatan o'qishi (qiymat
  o'zgartirilib `S` tekshiriladi) va saqlanib tiklanishi — 46 maydonning
  hammasi
- **Uch chegara bog'da ham**: massa, balandlik va qavat soni bog'ga ham
  qo'llanishi; audit ikkalasini ham ko'rishi
- **Nostandart oqim**: bog' ichida o'lchamlar yaqinligi, `oddKg` limiti, guruh kaliti,
  `oddTol` ta'siri, standart limitdan og'irining faqat asosli bo'lishi,
  nostandart detallarning hammasi joylashishi
- **Balandlik chegarasi**: `maxH` qo'yilganda hech bir pochka oshmasligi
- **v14 sozlamalari**: yozish → qayta o'qish aylanmasi va nol qiymatning saqlanishi
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
- **Minimal brauzer: Chrome / Edge 87+** (2020-yil oxiri). Chegarani JS emas,
  CSS qo'yadi:

  | Nima | Kerak | Bo'lmasa nima bo'ladi |
  |---|---|---|
  | `inset` (overlay) | Chrome 87 | yuklash, jarayon va xato oynalari ekranni qoplamaydi |
  | flex `gap` | Chrome 84 | elementlar bir-biriga yopishadi |
  | `clamp()` (qavat rejasi bo'yi) | Chrome 79 | 2D reja umuman chizilmaydi |
  | `display:grid` | Chrome 57 | uch ustunli maket yiqiladi |
  | generator + `Promise` | Chrome 50 | pochkalash yadrosi ishlamaydi |

  `accent-color` (Chrome 93) va `:focus-visible` (Chrome 86) faqat ko'rinishga
  ta'sir qiladi — ularsiz ham tizim ishlaydi.
- **Yangi modul qo'shish:** `src/js/NN-nom.js` yarating va `index.html` ga mos joyga
  `<script src>` qo'shing. `build.ps1` o'zi topib singdiradi.
- **Global nomlar** — modullararo ishlatiladiganlari: `S P PACKS CUR STEP WRAP
  APP_VER SEED Store DIAG SORT $ esc cut QRLIB LAST_AUDIT BUSY PACKPROG MAIN_T`.
  To'liq ro'yxat (modulga xos konstantalar bilan) —
  **[docs/arxitektura.md](docs/arxitektura.md)**, 4-bo'lim.
- **Determinizm:** pochkalash urug'i qat'iy (`mulberry(1234 + t*7919)`) — bir xil kirish
  va bir xil sozlama har doim bir xil natija beradi. Seansni tiklash shunga tayanadi.
- **Diagnostikada ishlash vaqti** ko'rsatiladi — algoritmni o'zgartirgach shu raqamga qarang.

### Keyingi bosqichlar (rejalashtirilgan)
1. Server + baza: buyurtma holati, rollar, har skan uchun hodisa yozuvi (traceability)
2. Fors major — qo'lda yig'ilgan pochkani tizimga kiritish
   ([TZ-v2 §12](docs/TZ-v2.md), [TZ-v3 §4](docs/TZ-v3-mantiq.md))
3. P/M da qo'lda terish (tetris) — [TZ-v2 §11](docs/TZ-v2.md)
4. Furnitura xaltasi, qadoq materiali sarfi, yuklash rejasi
5. Termal printerga to'g'ridan-to'g'ri ZPL/TSPL eksporti

*Bajarilgan:* real fayllar korpusida regressiya testi — `tests\corpus.ps1`,
205 fayl.

To'liq tartib, har qadamning holati va nega aynan shu ketma-ketlik ekani —
**[docs/TZ-v3-mantiq.md](docs/TZ-v3-mantiq.md) §6**. Hali hal qilinmagan
savol va takliflar — **[docs/ochiq-qarorlar.md](docs/ochiq-qarorlar.md)**.
