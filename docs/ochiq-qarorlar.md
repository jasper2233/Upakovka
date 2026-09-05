# Ochiq qarorlar

Bu ro'yxat — **hali hal qilinmagan narsalar**. Har biri: nima hozir bor,
kim qaror qilishi kerak va qaror qanday bo'lsa nima o'zgaradi.

Manba: 2026-08-29 dagi inventarizatsiya (butun tizim qism-qismga ajratilib,
har biriga «o'zak / qo'shimcha» bahosi qo'yilgan edi). O'sha hujjatning
tavsiflovchi qismi endi bu yerda emas — u takrorlanardi va eskirardi:

| Nima kerak edi | Endi qayerda |
|---|---|
| Qaysi modul nima qiladi | [arxitektura.md](arxitektura.md) §2 |
| Qaysi sozlama nima qiladi va nega shu son | [meyorlar-TZ.md](meyorlar-TZ.md) |
| Qaysi imkoniyat foydalanuvchiga nima beradi | [../README.md](../README.md) |

Shu yerda faqat **qaror kutayotgani** qoldi. Belgilar (`B2`, `B5` …) asl
inventarizatsiyadan — suhbatlarda o'sha raqamlar ishlatilgan bo'lishi mumkin,
shuning uchun saqlanadi.

---

## 1. Buyurtmachidan so'raladigan — 6 ta

Bularga javob **biz emas, sex/ofis** beradi. Har biri hozir ishlab turibdi;
javob «kerak emas» bo'lsa interfeys soddalashadi.

### B2 — Klass guruhlari (`S.clsGroups`)
Bir necha detal klassini bitta to'plamga qo'shish: `{TOM, FASAD}` birga
pochkalanadi, qolganidan ajraladi. TZ da yo'q — modul guruhlariga simmetriya
sifatida qo'shilgan.
**Savol:** amalda ishlatilyaptimi? Ishlatilmasa P/M ekranidan bitta blok
kamayadi (`btnClsGrp` va chiplar).

### B5 — Modul tanlash (`S.rooms`)
Modul kartasidagi katakcha: belgisi olingan modul umuman pochkalanmaydi.
Maqsadi — **qisman jo'natish** (shkaf keyinroq tayyor bo'ladi).
**Savol:** qisman jo'natish bo'ladimi? Bo'lmasa katakchalar olinadi va
buyurtma har doim to'liq teriladi.

### B11 — Tara va «2 KISHI» ogohlantirishi
`S.tare` (0,6 kg) brutto massaga qo'shiladi; brutto `S.oneMan` (25 kg) dan
oshsa chekda va ro'yxatda «2 KISHI KO'TARADI» chiqadi. TZ-v2 §8 dagi chek
ro'yxatida tara yo'q.
**Savol:** «2 KISHI» foydali ko'rinadi — u qoladimi? Tara raqami esa haqiqiy
o'lchovga tayanadimi yoki taxminmi?

### B12 — Chek o'lchami
Hozir beshta variant: `A4`, `100×70`, `80×60`, `58×40` va «Boshqa — qo'lda»
(20…300 mm). Ro'yxat v20 da kengaydi, chunki sexdagi rulon o'lchami har xil.
**Savol:** sexda qanaqa printer turadi? Bittasi aniq bo'lsa qolganlari
olinadi va «Boshqa — qo'lda» ham keraksiz bo'ladi.

### B20 — Diagnostika bo'limi
Parser ogohlantirishlari, audit hisoboti, XML tuzilishi, ishlash vaqti,
pochkalanmagan obyektlar. Bu **ishlab chiquvchi asbobi**, lekin P/M ham
undan foydalanishi mumkin (fayl o'qilmaganda sabab aynan shu yerda).
**Savol:** P/M ga ko'rinib tursinmi yoki yashirilsinmi?

### B22 — Detallar jadvali va CSV eksport
Butun buyurtma jadvali + qidiruv + `Detallarni CSV` tugmasi. Ma'lumotnoma
sifatida foydali, lekin ish oqimida ishlatilmaydi.
**Savol:** CSV kerakmi? Kerak bo'lsa — kimga va nima uchun?

---

## 2. Ishlab chiqish takliflari — 8 ta

Bular **bizning takliflarimiz**, buyurtmachi so'ramagan. Hech biri qabul
qilinmadi — hammasi hozircha o'z holida ishlab turibdi.

### B6 — `byThick` ni doimiy qoida qilish
Turli qalinlikni bitta qavatga qo'yish fizik jihatdan noto'g'ri (qavat
qiyshayadi), ya'ni bu sozlamani o'chirish deyarli hech qachon to'g'ri emas.
**Taklif:** sozlamadan olib tashlash, kodda doimiy `true` qilish.
**Xavfi:** qalinlik matritsasi (`thickMix`) aynan shu sozlama bilan juftlikda
ishlaydi — ikkalasi birga ko'rib chiqilishi kerak.

### B8 — Tom/qopqoq me'yorlarini konstantaga aylantirish
Ilgari uchta edi, endi **oltita**: `lidFill`, `lidN`, `lidTol`, `lidBal`,
`lidSupp`, `lidBed`. Har biri nozik va ularni P/M amalda o'zgartirmaydi.
**Taklif:** kamida bir qismini konstantaga chiqarish.
**Qarshi dalil:** oxirgi uchtasi sexdan kelgan aniq nosozliklar bo'yicha
qo'shilgan va ular hali sozlanmoqda — muzlatish erta bo'lishi mumkin.

### B9 — `tries` ni konstantaga aylantirish
Butun buyurtma `S.tries` (4) marta qayta teriladi, eng yaxshisi olinadi.
**O'lchangan:** namuna buyurtmada 1, 2 va 4 — bir xil natija (56 pochka),
8 — **54 pochka**. Ya'ni 4 optimal emas; oshirish foyda beradi, lekin
vaqtni chiziqli oshiradi.
**Taklif:** sozlamadan olib tashlash va qiymatni qayta tanlash (8 ga
ko'tarish yoki vaqt byudjetiga bog'lash).

### B10 — «Noodatiy» nomini o'zgartirish
Uzun yoki og'ir detallar alohida to'plamga tushadi; kodda `odd`, interfeysda
«noodatiy» / «bog'». TZ-v2 §6 bunday detallar **paddonga** qo'yilishini
aytadi — ya'ni tushuncha to'g'ri, nomi boshqacha.
**Taklif:** interfeysdagi nomni «Paddon» ga o'zgartirish (kod nomlari
tegilmaydi).

### B13 — QR prefiksi (`S.prefix`, «SM»)
QR boshidagi tsex belgisi. Bitta tsex bo'lsa hech narsa ajratmaydi.
**Taklif:** olib tashlash.
**Qarshi dalil:** MES ga ulanishda identifikator prefiksi kerak bo'lishi
mumkin ([TZ-v3-mantiq.md](TZ-v3-mantiq.md) §2.5).

### B16 — 3D dagi «Qalinlik ×» slayderi
Qavatlarni ko'rish uchun qalinlikni 1…10 marta cho'zadi. Ishga ta'sir
qilmaydi.
**Taklif:** slayderni olib tashlash («Qog'ozga o'rash» qoladi — u ish
tartibining bir qismi).

### B21 — «Oxirgi yuklangan fayllar» → navbat
Hozir bu **tarix**: oxirgi 20 ta fayl brauzer xotirasida. TZ-v2 §2 esa
boshqa narsani talab qiladi: *«bitta buyurtma ishda, qolganlari navbatda»*.
**Taklif:** tarixni navbat bilan almashtirish.
**Xavfi:** navbat serverli bosqichga tegishli — bir kompyuterdagi navbat
ikkinchisiga ko'rinmaydi.

### B24 — O'rnatilgan namuna loyiha (`SEED`)
28,4 KB — `dist` ning **5,8 %** i. Sexda kerak emas va chalkashtirishi mumkin.
**Taklif:** chiqarish versiyasidan olib tashlash.
**Qarshi dalil:** `namuna\*.project` fayllari SEED dan yasaladi
(`tools\seed-to-project.ps1`) va `smoke.ps1` ham unga tayanadi — olib
tashlansa faqat `dist` dan olinishi kerak, manbadan emas.

---

## 3. Tasdiqlash kutmoqda — 1 ta

### B3 — Klass bo'yicha ajratish (`S.sepCls`)
«Fasad alohida pochkalansin». Eski v9 dan qolgan, TZ-v2 da yozilmagan.
Amaliy asosi bor: fasad chizilib qoladi, uni alohida yig'ish to'g'riroq.
**Kerak:** buyurtmachining tasdig'i — qoida to'g'rimi?

---

## Hal qilingani

| # | Nima | Natija |
|---|---|---|
| B4 | Modul belgisi manbai | Tanlov olib tashlandi, manba **avtomatik** aniqlanadi — [alohida-pochkalash.md](alohida-pochkalash.md) §2 |
| B15 | Qo'lda tahrirlash Qadoqlash ekranida edi (TZ-v2 §1 ga zid) | v12 da P/M ga ko'chirildi; testda qo'riqlanadi |

Qolgan qismlar («modul guruhlari», «chiqish», «terish reviziyasi», «yacheyka
o'lchamlari», «yopiq yacheykalar», «optimal saralash rejasi», «material
katalogi», «sudrab tashlash va xato tashxisi», «jarayon ko'rsatkichi»)
**o'z holicha qoldirilgan** — ular bo'yicha savol yo'q. Har birining tavsifi
va asoslanishi [meyorlar-TZ.md](meyorlar-TZ.md) va [../README.md](../README.md)
da.

---

## Ro'yxatga kirmagan, keyin qo'shilganlar

Bu imkoniyatlar inventarizatsiyadan **keyin** paydo bo'lgan va hali shu
jadval bo'yicha baholanmagan — «o'zak mi yoki qo'shimcha?» degan savol
ularga ham berilishi kerak:

| Qism | Nima | Qayerda |
|---|---|---|
| Xonalar | nomlangan modul guruhi + «birga pochkalansin» bayrog'i | `02-state.js`, `10-ui.js` |
| Quyruq | guruh oxiridagi qoldiqni tayyor pochkaga singdirish | `04-packer.js` → `absorbTails` |
| Ikki oqim | standart va nostandart detallar aralashmasligi | `04-packer.js` → `oddPackGen` |
| Qalinlik matritsasi | qaysi qalinlik asosiy pochkaga qo'shilsin | `04-packer.js` → `thickKey` |
| Tom qoidalari | tayanch, to'shak, ulush muvozanati | `04-packer.js` → `markTom` |
| Buyurtma hujjati | A4, to'liq tarkib, imzo joylari | `08-labels.js` → `orderDocHTML` |
| Avtomatik pochka cheki | oxirgi detalda o'zi chiqadi | `10-ui.js` → `advance` |
| Uch chegara bog'da ham | massa, balandlik, qavat soni | `04-packer.js` → `oddBundles` |
