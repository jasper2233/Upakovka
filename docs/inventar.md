# Inventar — nima o'zak, nima qo'shimcha

Maqsad: tizimni **bitta umumiy mantiqqa** qurish. Buning uchun avval hozir nima
borligini ajratamiz: qaysi qism olib tashlansa tizim tizim bo'lmay qoladi (o'zak),
va qaysi qism yo'l-yo'lakay qo'shilgan (qo'shimcha).

Sana: 2026-08-29. Rejim (Individual/Konveyr) allaqachon **olib tashlandi** — qoida bitta.

---

## A. O'ZAK — tegilmaydi

Bularsiz tizim ishlamaydi. Muhokamaga qo'yilmaydi.

| # | Qism | Fayl |
|---|---|---|
| A1 | `.project` parseri — detal, material, kant, CS bog'lanishi | `03-parser.js` |
| A2 | Detal ro'yxati va birlik aniqlash (`buildItems`, `unitOf`) | `03-parser.js`, `02-state.js` |
| A3 | **Guruhlash kaliti** (`packKey`) — buyurtma qaysi o'q bo'yicha bo'linadi | `04-packer.js` |
| A4 | Pochkalash algoritmi — MaxRects + qavat + g'isht terish | `04-packer.js` |
| A5 | Yig'ish ketma-ketligi (`packSeq`) | `04-packer.js` |
| A6 | Audit — invariantlar tekshiruvi | `05-audit.js` |
| A7 | QR generatori va cheklar | `01-qr.js`, `08-labels.js` |
| A8 | Saralash — stelaj, yacheyka, reja | `14-sort.js` |
| A9 | Skaner mantig'i (qadoqlash va saralash) | `10-ui.js`, `14-sort.js` |
| A10 | Seans saqlash/tiklash (IndexedDB) | `09-storage.js` |
| A11 | 3D yig'ish va 2D qavat rejasi | `06-render3d.js`, `07-render2d.js` |
| A12 | Massa hisobi (m² × kg/m²) va material bazasi | `03-parser.js` |

---

## B. QO'SHIMCHALAR — qarorni kutmoqda

Har biri: **nima qiladi · nega qo'shilgan · mening tavsiyam**.

### B1 — Modul guruhlari
Bir nechta modulni bitta pochka guruhiga qo'shish (tumba + tremo birga).
TZ-v2 §3: *«ajratish/qo'shish ixtiyoriy — chek-list»*. Zal holati uchun aynan shu kerak.
→ **QOLDIRISH**

### B2 — Klass guruhlari
Bir necha klassni bitta to'plamga ({TOM, FASAD} birga). TZ da yo'q — B1 ga simmetriya
sifatida qo'shilgan. Amalda ishlatilgani noma'lum.
→ **SO'RAYMAN** — kerak emasdek

### B3 — Klass bo'yicha ajratish (`sepCls`)
«Fasad alohida pochkalansin». Eski v9 dan qolgan. Amaliy asos bor: fasad chizilib
qoladi. TZ-v2 da yozilmagan.
→ **QOLDIRISH**, lekin tasdiqlashingiz kerak

### B4 — Modul belgisi manbai: `good` yoki kod prefiksi ✅ HAL QILINDI
**2026-08-29: OLIB TASHLANDI.** Manba tanlovi yo'q — modul har doim proekt
tuzilishidan (`<good typeId="product">`) olinadi. O'chirilgani: `S.modSrc`,
`S.modLen`, `codeUnits()`, `suggestCodeSrc()`, `renderModSrc()`, `modSrcChanged()`,
menejerdagi «Modul belgisi qayerdan» bloki va yuklash oynasidagi ikkala katakcha.
Eski sozlama/seans kod rejimida bo'lsa — modul kalitlari tozalanadi.

### B5 — Modul tanlash (`rooms`)
Qaysi modul pochkalansin — qisman jo'natish uchun. TZ da yo'q.
→ **SO'RAYMAN** — qisman jo'natish bo'ladimi?

### B6 — Qalinlik bo'yicha ajratish (`byThick`) — o'chirish mumkin
Hozir bu **sozlama**. Lekin turli qalinlikni bitta pochkaga qo'yish fizik jihatdan
noto'g'ri — pochka qiyshayadi.
→ **TAVSIYA: sozlama emas, doimiy qoida qilish** (bitta tugma kamayadi)

### B7 — Chiqish / overhang (`ovh`, `ovhOn`)
O'rta qavat tag detaldan 20 mm chiqib turishi mumkin — zich terish uchun.
→ **QOLDIRISH**

### B8 — Qopqoq me'yorlari: 3 ta sozlama
`lidFill` (qopqoq to'ldirish %), `lidN` (qopqoq detallari maks), `lidTol` (qopqoq
kichikligi mm). Uch alohida raqam, uchalasi ham nozik.
→ **TAVSIYA: doimiy konstantaga aylantirish** — P/M bularni hech qachon o'zgartirmaydi

### B9 — Variatsiya urinishlari (`tries`)
Butun buyurtma 4 marta qayta teriladi, eng yaxshisi olinadi. Sifat ↔ tezlik.
→ **TAVSIYA: doimiy konstanta** (sozlamadan olib tashlash, kodda qolsin)

### B10 — Noodatiy pochkalar (`odd`)
Uzun yoki og'ir detallar alohida «noodatiy» pochkaga tushadi. TZ-v2 §6: bunday
detallar **paddonga** qo'yiladi. Ya'ni tushuncha to'g'ri, nomi noto'g'ri.
→ **QOLDIRISH, nomini «Paddon» ga o'zgartirish**

### B11 — Tara / brutto va «2 KISHI» ogohlantirishi
Qadoq materiali massasi chekka qo'shiladi; 25 kg dan og'ir bo'lsa «2 KISHI» chiqadi.
TZ-v2 §8 dagi chek ro'yxatida tara yo'q.
→ **SO'RAYMAN** — «2 KISHI» foydali ko'rinadi, tara shubhali

### B12 — Chek o'lchami (A4 / 100×70 / 58×40)
Termal printer uchun. TZ da printer turi aytilmagan.
→ **SO'RAYMAN** — qanaqa printer bo'ladi?

### B13 — QR prefiksi (`prefix`, "SM")
QR boshidagi tsex belgisi. Bitta tsex bo'lsa keraksiz.
→ **TAVSIYA: olib tashlash**

### B14 — Terish reviziyasi (`R1`, `R2`…)
Buyurtma qayta pochkalansa raqam oshadi; eski chek skanerlansa tizim aytadi.
→ **QOLDIRISH** — bu xatoning oldini oladi

### B15 — Qo'lda tahrirlash ⚠️ TZ GA ZID
Hozir **Qadoqlash ekranida** turibdi. TZ-v2 §1: *«Tahrirlash faqat P/M da. Pochkalash
posti ishchisi hech narsani o'zgartira olmaydi.»*
→ **TUZATISH SHART: P/M ga ko'chirish** (bu tanlov emas, TZ ni bajarish)

### B16 — Qog'ozga o'rash (3D) va «Qalinlik ×» slayder
3D ko'rinishdagi ikki yordamchi. Ishga ta'sir qilmaydi.
→ **TAVSIYA: slayderni olib tashlash, o'rashni qoldirish**

### B17 — Yacheykaning fizik o'lchamlari (6 ta sozlama)
Kichik/katta yacheyka eni, chuqurligi, bo'yi. TZ-v2 §6 dan olingan real o'lchamlar.
→ **QOLDIRISH** (lekin sexda o'lcham o'zgarmasa — doimiy qilish mumkin)

### B18 — Yopiq yacheykalar va qoralama tahrirlash
Ishchi band yacheykani belgilaydi; «Tahrirlash → Saqlash» oqimi.
TZ-v2 §1: *«saralash bo'limida ochib tuzatish funksiyasi bo'ladi»*.
→ **QOLDIRISH**

### B19 — Optimal saralash rejasi
Pochkalarni detal soni bo'yicha tizib, yacheykani A1 dan berish — yurish 27 % kam.
TZ da yo'q, lekin o'lchangan foyda bor.
→ **QOLDIRISH**

### B20 — Diagnostika bo'limi
Parser ogohlantirishlari, audit hisoboti, XML tuzilishi, ishlash vaqti.
Ishlab chiquvchi asbobi.
→ **SO'RAYMAN** — P/M ga kerakmi, yoki yashirin qilinsinmi?

### B21 — «Oxirgi yuklangan fayllar» (20 ta)
Brauzer xotirasidagi fayl tarixi. TZ-v2 §2 esa boshqa narsani talab qiladi:
*«bitta buyurtma ishda, qolganlari navbatda»* — bu **navbat**, tarix emas.
→ **TAVSIYA: navbat bilan almashtirish**

### B22 — Detallar jadvali + qidiruv + CSV eksport
Butun buyurtma jadvali. Ma'lumotnoma sifatida foydali.
→ **SO'RAYMAN** — CSV kerakmi?

### B23 — Material katalogi (`matCat`)
LDSP / LMDF / MDF / XDF / HDF uchun kg/m². Massa hisobi shunga tayanadi.
→ **QOLDIRISH** (massa o'zak)

### B24 — Namuna loyiha (SEED)
Ichiga o'rnatilgan Namuna komplekt demo loyihasi — **28 KB**, `dist` ning 8 % i.
Sexda kerak emas, chalkashtiradi.
→ **TAVSIYA: olib tashlash**

### B25 — Sudrab tashlash, Ctrl+O, xato tashxisi oynasi
Fayl o'qilmasa alert emas, tashxis oynasi chiqadi. Real foyda.
→ **QOLDIRISH**

### B26 — Progress ko'rsatkichi va bekor qilish
Katta buyurtmada interfeys muzlamasligi uchun.
→ **QOLDIRISH**

---

## Xulosa raqamlarda

| | Soni |
|---|---|
| Qoldirish tavsiya qilinadi | 12 |
| Olib tashlash / doimiy qilish tavsiya qilinadi | 7 |
| Savol — siz hal qilasiz | 6 |
| TZ ga zid, tuzatish shart | 1 (B15) |

Tavsiyalar qabul qilinsa: **7 ta sozlama** interfeysdan yo'qoladi, `dist` ~28 KB
yengillashadi, va sozlamalar bo'limi «15 me'yor» dan «8 me'yor» ga tushadi.
