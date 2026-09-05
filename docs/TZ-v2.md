# TZ v2 — pochkalash tizimini qaytadan qurish

Bu hujjat buyurtmachi bilan kelishilgan qarorlarni saqlaydi. Har bo'lim ikki qismdan iborat:
**Kelishilgan** (qaror qabul qilingan) va **Ochiq** (hali javob kutilmoqda).

Oxirgi yangilanish: 2026-08-29 (11 va 12-bo'limlar qo'shildi).
Bajarilish holati v21 da tekshirildi — bajarilmagan talablar shu belgi bilan:
**⏳ hali yo'q**.

Guruhlash mantig'i, individual/konveyr modeli va dunyo amaliyoti bo'yicha tahlil —
alohida hujjatda: **[TZ-v3-mantiq.md](TZ-v3-mantiq.md)**.

---

## 0. Umumiy holat

**Kelishilgan**

- Bu tizim — **prototip**. Buyurtmachida allaqachon ishlab turgan MES tizimi bor.
  Avval bu tizim mustaqil, to'liq va chiroyli qilib yoziladi, **keyin** mavjud MES ga ulanadi.
- Demak hozircha serversiz-offline arxitektura saqlanadi, lekin ma'lumot tuzilishi
  keyin serverga ko'chishga tayyor bo'lishi kerak.
- Skaner **hech narsani o'zida saqlamaydi** — u faqat o'qiganini tizimga uzatadi.
  Butun mantiq tizim tomonida.

---

## 1. Bo'limlar va rollar

| Bo'lim | Kim | Nima qiladi | Tahrirlash |
|---|---|---|---|
| **P/M** (proyekt menejer) | ofis | loyiha yuklaydi, kesimlarni belgilaydi, qo'lda pochka teradi | **Ha — faqat shu yerda** |
| **Saralash** | tsex ishchisi | detalni skanerlab stelaj yacheykasiga qo'yadi | Yo'q |
| **Pochkalash posti** | upakovshik | QR skaner bo'yicha pochka yig'adi | **Yo'q** |
| **TMO** | omborchi | tayyor buyurtmaga oyna va qo'shimchalarni qo'shadi, ortadi | — |

**Kelishilgan**

- Tahrirlash **faqat P/M da**. Pochkalash posti ishchisi hech narsani o'zgartira olmaydi.
- P/M da qo'lda pochka terish (tetris) mumkin — u yerda **inson mantig'i** ishlatiladi
  va natija tizimga kiritiladi.
- Detalni QR orqali tahrirlash ham faqat P/M da.
- **Qo'lda terish erkinligi: ikkalasi ham kerak** — tizim tergan pochkani tuzatish ham,
  noldan o'zi terish ham. Tizim maksimal universal bo'lsin.
- **Istisno:** saralash bo'limida o'sha yerga biriktirilgan xodim javobgar —
  unda ham yacheykani **ochib tuzatish** funksiyasi bo'ladi.

### Interfeys darajasi (muhim)

Post ekranlari **tsex sharoiti** uchun: shovqin, qo'lqop, shoshilinch ish, ekranga
qaraydigan vaqt kam. Ofis ekranlari esa tinch sharoitda, sinchiklab o'qiladi. Shunga qarab:

- Post ekranlari sodda bo'lsin: katta yozuv, kam tugma, o'qishga oz matn
- Har ekranda bitta aniq ish bo'lsin — «nima qilishim kerak» degan savol tug'ilmasin
- Xato xabari ayblovchi emas, **nima qilish kerakligini** aytadigan bo'lsin
- Ofis (P/M) ekranlari murakkabroq bo'lishi mumkin

---

## 2. Loyiha yuklash

**Kelishilgan**

- ~~Yuklash bosilishi bilan darhol so'raladi: **Individual** yoki **Konveyr**.~~
  **2026-08-29 da BEKOR QILINDI.** Individual/Konveyr yo'nalishi butunlay olib
  tashlandi — tizim bitta umumiy pochkalash mantig'iga o'tdi. Yuklash oynasi endi
  hech narsa so'ramaydi, faqat faktni ko'rsatadi (fayl, modullar, klasslar).
  Sabab va tahlil: [TZ-v3-mantiq.md](TZ-v3-mantiq.md) §1.
- **Kesim sozlamasi bir marta qilinadi va eslab qolinadi.** Keyingi loyiha
  yuklanganda oldingi sozlama bilan ketadi.
- Bir vaqtda **bitta buyurtma ishda** bo'ladi, qolganlari navbatda turadi.

---

## 3. Modul ajratish

**Kelishilgan**

- ~~Modul chegarasi **detal kodining prefiksida** turadi.~~
  ~~**2026-08-29 da BEKOR QILINDI.** Modul chegarasi faqat proekt tuzilishidan
  olinadi.~~
  **O'sha kunning o'zida qayta ko'rildi.** Haqiqiy Gib Lab eksportida
  ko'pincha bitta `<good typeId="product">` bo'ladi-yu, ichida bir necha
  mustaqil mebel turadi — tuzilishga tayanilsa ular bitta pochkaga aralashib
  ketardi. Yakuniy qoida **avtomatik**, sozlama emas:

  > Kod prefiksi (`01_001` → `01`) tuzilishdan **ko'proq** birlik bersa —
  > prefiks olinadi, aks holda `good` kodi.

  Manba tanlovi baribir yo'q (bu to'g'ri edi), lekin manbaning o'zi endi
  faylga qarab hal qilinadi va qaror asosi P/M ekranida ko'rinadi.
  Batafsil: [alohida-pochkalash.md](alohida-pochkalash.md) §2.
- Ajratish/qo'shish **ixtiyoriy** — P/M **chek-list** ko'rinishida belgilaydi.
  Tizim universal bo'lishi uchun shu kerak.

**Tekshirilgan raqamlar.** Dastlabki o'lchov haqiqiy mijoz eksporti ustida
bajarilgan edi (65 pozitsiya / 85 detal). U ochiq repoga chiqmaydi; o'sha
faylning **shakli** `namuna\komplekt-5modul.project` da qayta yasalgan —
31 pozitsiya / 49 detal, 5 modul.

Joriy raqamlar `tests\smoke.ps1` dagi «5modul» blokida yashaydi va har
yurgizishda tekshiriladi: modul bo'yicha **11 pochka**, modul aralashgan
pochka **0 ta**, audit xatosi **0**. Ikki tumbani birlashtirish pochka sonini
kamaytiradi, kesimni butunlay o'chirish esa yana kamaytiradi.

---

## 4. Materiallar, HDF / XDF

**Kelishilgan**

- HDF/XDF (3 mm) ni pochkaga qo'shish **ixtiyoriy**, chek-list orqali belgilanadi.
- Qo'shilganda HDF pochkaning umumiy gabaritidan (bo'yi va eni) **chiqmasligi shart** —
  chiqsa yetkazishda sinadi, shuning uchun alohida ketadi.
- XDF standarti **2800 × 2070**. Baza ostatkasidan boshqa qoldiq o'lchamlar ham chiqishi
  mumkin (mijozga arzonroq sotiladi), lekin standart shu.

---

## 5. Noodatiy narsalar (oyna va h.k.)

**Kelishilgan**

- Oyna va shunga o'xshash noodatiy narsalar **alohida ketadi**, pochkaga qo'shilmaydi.
- Ularga ham chek yopishtiriladi (bazaga kiritilganda).
- Oyna mijoz buyurtmasi TMO da turganda, tayyor narsalarga qo'shiladi.
  Yuklash paytida TMO dagi javobgar ortib beradi.
- TMO ga qabul paytida skladdan skaner orqali mijoz yacheykasiga qo'yiladi.

---

## 6. Saralash — stelaj va yacheyka

**Kelishilgan**

- Sexda **5 ta stelaj** bor. Har stelajda **6 ta yacheyka**:

| Yacheyka | Eni | Chuqurlik | Bo'yi | Soni (har stelajda) |
|---|---|---|---|---|
| Kichik | 250 mm | 400 mm | 1500 mm | 5 |
| Katta (6-chi) | 100 mm | 800 mm | 1500 mm | 1 |

  Jami: **30 yacheyka** (25 kichik + 5 katta).

- Detallar yacheykada **tik** turadi (tarelka javonidek).
- **Yacheykalarning tepasi ochiq** — uzun detallar tepaga o'tib ketaveradi.
  Fotoda 2.75 m li detal tiqib qo'yilgan. Ya'ni yacheyka bo'yi 1.5 m bo'lsa ham
  undan uzun detal bemalol turaveradi.
- **Yaxlit list** (butun list bitta detal bo'lsa) stelajga emas, shu proyektga qarashli
  aniq belgilangan joyda — paddonda yoki shunga o'xshash joyda turadi.
- **Yacheyka sig'imi: pochka balandligi 192 mm dan oshmasligi kerak.**
  ⏳ **Hali ulanmagan.** Mexanizm bor — `Pochka maks. balandligi` (`S.maxH`)
  oddiy pochkaga ham, bog'ga ham qo'llanadi va audit `BALANDLIK` xatosini
  beradi — lekin standart qiymati **0 (cheklovsiz)**, ya'ni 192 mm hech
  qayerda yozilmagan. Sexda yacheyka o'lchami tasdiqlangach shu maydonga
  kiritiladi. `14-sort.js` ham buni ochiq aytadi — yacheyka oʻlchamlari
  faqat ma'lumot uchun koʻrsatiladi, terish algoritmiga ulanmagan.
- Har stelaj va har yacheykaga **raqam qo'yiladi va QR kod biriktiriladi**.
- Stelaj QR i **bir marta** skanerlanadi (smena/ish boshida). U haqidagi ma'lumot
  tizimda allaqachon bor.
- Skanerlanganda tizim aynan o'sha stelajga qaysi detalni biriktirayotganini o'zi hal qiladi.
- Yacheykaga **bitta pochkaga yetadigan** detallar qo'yiladi.
- Yacheykaga pochka uchun yetarli detal **to'lmaguncha** tizim so'rab turadi.
- Yacheyka to'lgach (pochkaga yetarli detal bo'lgach) — **o'sha yacheyka yopiladi**.
- Bitta stelaj yetsa shuning o'ziga qo'yiladi; proyekt sig'masa tizim qo'shimcha stelaj so'raydi.
- Ishchi istalgan detalni skanerlasa — u **qaysi yacheykada turishini** monoblok yoki
  ekranda ko'radi.

### Stelaj aylanmasi — eng muhim qoida

**Stelaj to'lgach, o'sha stelajning O'ZI pochkalash bo'limiga o'tadi.** Hech kim
kutib qolmaydi, «mashina to'lmaguncha yurmaydi» degan narsa yo'q:

1. Saralash A stelajni to'ldiradi
2. A stelajda bo'sh yacheyka qolmadi → A stelaj **sortirovkadan pochkalash bo'limiga
   ko'chadi**
3. Saralash B stelajda davom etaveradi
4. Pochkalash A stelajdagi yacheykalardan pochka yig'adi; pochka bitgach **TMO ga o'tadi**
5. A stelaj bo'shab saralashga qaytadi

Ya'ni yacheyka «bo'shaydi» degan tushuncha emas — **butun stelaj aylanadi**.

> **Holat.** Tizimda aylanma **yacheyka** darajasida ishlaydi: pochka
> qadoqlanib bo'lgach uning yacheykasi darhol bo'shaydi va navbatdagi eng
> katta pochkaga beriladi (`14-sort.js` → `sortFreeCell`, `sortPlan`).
> Shu sabab 30 yacheyka bilan 55 pochkani to'lqin-to'lqin saralab chiqish
> mumkin. ⏳ «Butun stelaj bir butun bo'lib ko'chadi» degan qism esa hali
> yo'q — stelaj holati (saralashdami yoki pochkalashdami) tizimda saqlanmaydi.

### Nostandart va yirik detallar

- Yacheykaga sig'maydigan detal **stelajga majburlanmaydi**: u **paddonga** yoki shu
  proyektga yaqin joyga qo'yiladi. «Faqat stelajga qo'yilsin» degan qoida yo'q.
- Bir xil yirik detallar paddonga taxlanadi — ularni pochkalash muammo emas.
- Zarurat bo'lsa nostandart detallar uchun **alohida stelaj yasaladi**.

### Ixtiyoriy joylar (paddon va boshqalar)

- Tizimda **ixtiyoriy nom beriladigan joy** yaratish imkoni bo'ladi.
- Nomni va joyning QR kodini tsexning o'zi joylashtiradi.
- Skaner orqali shu proyektga tegishli detal o'sha joyga biriktirilib tizimga kiritiladi.

**Tekshirilgan** (`namuna\komplekt-5modul.project`, 49 detal):

| Chegara | Natija |
|---|---|
| Detal uzunligi | max **2100 mm** — yacheyka tepasi ochiq, muammo yo'q ✓ |
| Detal eni ≤ 400 mm (kichik yacheyka) | 49 detaldan **30 tasi** sig'adi |
| Eni 400–800 mm | **17 detal** — chuqur yacheyka yoki oldinga chiqib turadi |
| Eni 800 mm dan katta | **2 detal** |

**Ochiq**

- Eni 400–800 mm li detal (49 dan 17 tasi) kichik yacheykada oldinga **chiqib
  tursa bo'ladimi**, yoki majburan chuqur yacheykaga tushishi kerakmi? Har
  stelajda chuqur yacheyka bittagina — hammasi unga sig'masligi mumkin.
  ⏳ Tizim hozir yacheyka o'lchamini **tekshirmaydi**: u faqat qaysi yacheyka
  bo'shligini biladi va o'lchamlarni ma'lumot uchun ko'rsatadi.

---

## 7. Pochkalash posti

**Kelishilgan**

- Faqat QR skaner bilan ishlaydi, tahrirlash yo'q.
- Ko'radi: stelaj ma'lumoti, qaysi ishga tegishli, qancha ish kutayotgani,
  har yacheykadagi detallar.

---

## 8. Chek va QR

**Kelishilgan**

- **QR skanerlanganda** planshet yoki monoblokda **hamma ma'lumot** ko'rsatiladi:
  detallar nechta, qaysi detallar borligi va h.k.
  (Ya'ni QR — identifikator, ma'lumot tizimdan chiqadi.)
- **Chekda ko'z bilan o'qiladigan** ma'lumot:
  - buyurtma ID si
  - detallar soni
  - qaysi xona yoki modul
  - vaqti
  - **kim tomonidan yig'ilgani** — javobgar xodim (beyjigidagi ma'lumot)

**Xodim identifikatsiyasi (kelishilgan)**  ⏳ hali yo'q — tizimda foydalanuvchi
tushunchasi yo'q, chekda «javobgar» qatori chiqmaydi. Bu serverli bosqichga
qoldirilgan (README «Keyingi bosqichlar»).

- Xodim **bo'limda ish boshlanishidan oldin o'zini skanerlaydi** (beyj).
- MES tizimiga ham skaner yoki login/parol bilan kiradi.
- Keyin **stelajni skaner bilan o'qitadi** va detal terishni boshlaydi.
- Skanerlangan har bir ish shu xodim nomiga yoziladi — chekdagi «javobgar» shundan chiqadi.

---

## 9. Buyurtma holati

**Kelishilgan**

- Buyurtma «tayyor» bo'lganini **tizim o'zi belgilaydi**: barcha detallar uchun
  qilinishi kerak bo'lgan ishlar bajarilgach, ya'ni hamma kerakli detal QR skanerdan
  o'tgach. **Bajarilgan:** `orderStatus()` har pochkaning `done` maydonini
  sanaydi; buyurtma tayyor bo'lmaguncha A4 hujjat chop etilmaydi va nima
  qolgani yozib ko'rsatiladi.
- Mijoz TMO da turgan buyurtmaga pochkalash so'rasa — buyurtma qayta pochkalash
  bo'limidan o'tadi.

---

## 10. Bazis fayl formati (tekshirilgan)

To'g'ri fayl — **Gib Lab dasturidan o'tgan** `.project`. Gib Labga kirmagan xom Bazis
eksporti tizimga berilmaydi.

| Nima | Qayerda |
|---|---|
| Loyiha nomi | `<project name="komplekt-5modul">` |
| Loyiha ID | `<project project.uuid="c7183214-…">` |
| Mahsulot | `<good typeId="product" name="Komplekt" code="990500" product.order="komplekt-5modul">` |
| Detal | `<part code="01_001" dl dw l w jl jw cl cw count usedCount>` |
| Modul | detal kodining prefiksi (`01`…`05`) |
| Material | `<good typeId="sheet" t="16">`, list o'lchami ichki `<part l w>` da |
| Detal↔material | `<operation typeId="CS">` ichidagi `<material>` + `<part>` |
| Kant | `<operation typeId="EL">`, detalda `elt/elb/ell/elr` |
| CNC | `<operation typeId="XNC" code="990500_01_001">` |

Bu faylda `l/w`, `dl/dw`, `cl/cw`, `jl/jw` — hammasi bir xil qiymat (farq topilmadi).

**Eslatma:** parser Gib Labdan o'tmagan xom Bazis eksportini ham ko'taradigan qilib
kengaytirildi (`dl/dw` dan o'qish, nom va uuid ni mahsulot goodidan olish) — bu zaxira
yo'l, asosiy oqim Gib Lab fayli.

---

## 11. Qo'lda terish (tetris) — P/M da  ⏳ hali yo'q

**Kelishilgan**

- P/M tizimning **o'zida** pochkani qo'lda terishi mumkin. Ikkala erkinlik ham kerak:
  tizim tergan pochkani **tuzatish** ham, **noldan o'zi terish** ham.
- Avval modul tanlanadi (tremo / tumba / shkaf …), so'ng unga qarashli detallar
  shakl ko'rinishida — **tetrisga o'xshab** — teriladi.
- Har qavat terilayotganda uning **massasi va gabariti** sozlamadagi me'yordan
  chiqmasligi kuzatiladi. Chiqsa: **potskazka** chiqadi yoki **qavat rangi o'zgaradi**.
- Ish tartibi SketchCut kabi: qavat yuzasi to'lgach «**To'ldi**» bosiladi — yuza
  bir tusga kiradi va keyingi qavat terila boshlaydi.
- **Qavat soni cheklovi** qo'lda yoki avtomat belgilanadi — yoqiladi/o'chiriladi.
- HDF modelga qo'shiladimi-yo'qmi — shu yerda ham belgilanadi. Qo'shilsa,
  §4 dagi gabarit shartini buzmagan holda qo'shiladi.

---

## 12. Fors major — qo'lda yig'ilgan pochkani tizimga kiritish  ⏳ hali yo'q

Bu tizim ishlamay turganda yoki tizimsiz bajarilgan ishni **keyin** qabul qilish yo'li.
Bu funksiyasiz tizim real tsexda birinchi uzilishdayoq buyurtmani yo'qotadi.

**Kelishilgan**

- Holat: pochkalar **qo'lda, tizimsiz, dasturisiz** terib bo'lingan. Endi ular
  tizimga kiritilishi kerak.
- Yo'l: pochka **sochiladi** va sochish jarayonida har detalning QR kodi
  skanerlanadi — shu tariqa pochka tizimga yoziladi.
- **Yo'nalish:** pochka jismonan **tepadan pastga** sochiladi, tizimga esa
  **tagdan tepaga** yoziladi (oxirgi olingan detal = tag detal).
- Har qavat olinganda «shu pochkadan bir qavat kamaydi» deb belgilanadi;
  ish pochka tugagunicha davom etadi.
- Pochkada **qaysi model** borligi ro'yxatdan tanlanadi yoki tizim birinchi
  skanerdayoq o'zi aniqlaydi — har model loyiha ichida oldindan yozilgan.
- Pochkaga **o'ziga tegishli bo'lmagan detal** kirib qolgan bo'lsa — tizim
  bildirishnoma beradi (to'xtatmaydi, ogohlantiradi).
- Yig'ish jarayoni ham xuddi shunday QR skaner bilan bajariladi.

**Qo'shimcha fors major holatlari** (shu bo'limga kiradi):

| Holat | Tizim nima qiladi |
|---|---|
| Detal singan / brak / yo'qolgan | Pochka «to'liq emas» holatida qoladi, TMO ga o'tmaydi; almashtiruvchi detal kelganda davom etadi |
| Tok yoki tizim o'chishi | Seans IndexedDB da — o'sha joydan davom etiladi (mavjud) |
| Tizimsiz ishlangan smena | Yuqoridagi sochib-kiritish yo'li |

**Muhim tamoyil:** qo'lda kiritilgan pochka **reja bilan solishtirilmaydi** — uning
uchun reja yo'q. Unga fizik me'yorlar (massa, qavat, qalinlik) qo'llanadi, algoritm
guruhlash qoidasi esa qo'llanmaydi. Sabab va batafsil: [TZ-v3-mantiq.md](TZ-v3-mantiq.md) §4.
