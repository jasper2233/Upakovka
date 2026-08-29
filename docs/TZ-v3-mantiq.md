# TZ v3 — Guruhlash mantig'i: individual, konveyr va fors major

Bu hujjat bitta savolga javob beradi:
**tizim buyurtmani qaysi bo'laklarga bo'ladi, bu qarorni kim beradi va u qayerda yoziladi.**

Sana: 2026-08-29. TZ-v2 kelishilgan qarorlarni saqlaydi; bu hujjat esa
o'sha qarorlar ostidagi *modelni* tekshiradi va tuzatadi.

---

## 1. Asosiy xulosa: individual va konveyr — bu ikki rejim emas

Hozir kodda `S.mode` bor: `"ind"` yoki `"conv"`. U `S.rules[mode]` orqali ikkita
bayroqni yoqadi — `prod` (modul bo'yicha ajrat) va `mat` (material bo'yicha ajrat).

Lekin pochkalash yadrosi allaqachon **to'rt o'q** ustida ishlaydi
(`packKey()`, `src/js/04-packer.js:339`):

```
modul / material / qalinlik / klass
```

Ya'ni **dvijok universal, ustidagi tugma esa atigi ikki holatni beradi.**
Cheklov mantiqda emas — interfeysda. Shuning uchun:

> Konveyrni majburlash mijoz xohishini cheklaydi — bu to'g'ri.
> Lekin individualni majburlash material bo'yicha optimizatsiyani yo'qotadi.
> **Ikkalasi ham noto'g'ri, chunki savol noto'g'ri qo'yilgan.**

To'g'ri savol — «bu buyurtma qaysi rejimda?» emas, balki:

> **Bu buyurtma qaysi o'q bo'yicha bo'linsin?**

### O'qlar va ularning holati

Har o'q uch holatdan birida bo'ladi:

| Holat | Ma'nosi |
|---|---|
| **ajrat** | turli qiymat ⇒ turli pochka (qat'iy chegara) |
| **birlashtir** | nomlangan guruh: {tumba, tremo} birga (allaqachon bor: `modGroups`, `clsGroups`) |
| **aralash** | o'q e'tiborga olinmaydi |

Kerakli o'qlar ro'yxati:

| O'q | Manba | Nega kerak |
|---|---|---|
| **buyurtma / mijoz** | loyiha uuid yoki kod | konveyrda 100 buyum bitta kroyda ketadi — ikki mijoz pochkasi aralashmasin ⚠️ **hozir yo'q** |
| **xona** | P/M xaritasi | zal = kuxnya + pod-TV + shkaf birga; kuxnya alohida bo'lsa alohida ⚠️ **hozir yo'q** |
| **modul** | kod prefiksi yoki `<good typeId="product">` | s/p: tumba alohida, tremo alohida |
| **klass** | parser (`classify`) | fasad alohida, bok alohida |
| **material** | `<operation typeId="CS">` | konveyr uchun asosiy o'q |
| **qalinlik** | `<good typeId="sheet" t>` | fizik shart, deyarli har doim yoqiq |

**«Individual» va «Konveyr» — shu vektorning ikki *preseti*, xolos.**

TZ-v2 §3 da bu allaqachon kelishilgan:
*«Ajratish/qo'shish ixtiyoriy — P/M chek-list ko'rinishida belgilaydi.
Tizim universal bo'lishi uchun shu kerak.»*
Yuqoridagi — o'sha qarorning to'liq shakli.

Natija: mijozni hech qachon chegaralamaymiz. «Hammasi bitta pochkada» degan
mijozga — barcha o'q `aralash`. «Har modul alohida» degan mijozga — modul `ajrat`.
Dvijok bitta.

---

## 2. Dunyo amaliyoti nima deydi

### 2.1 Asosiy tushuncha — CODP (Customer Order Decoupling Point)

Dunyo standarti «partiyami yoki individualmi?» deb so'ramaydi. U so'raydi:
**mahsulot jarayonning qaysi nuqtasida aniq mijozga biriktiriladi?**

Shu nuqtadan **yuqorida** ish partiya bo'yicha ketadi (arzon), **pastda** —
buyurtma bo'yicha (mijozga moslashuvchan). Bu «postponement» tamoyili:
farqlanishni imkon qadar kech qoldirish. Mass customization aynan shunga tayanadi.

Mebel tsexida bu nuqtani fizika belgilaydi:

| Bosqich | Mantiq | Nega |
|---|---|---|
| Raskroy | **partiya** | nesting tejamkorligi faqat buyurtmalar aralashganda chiqadi |
| Kant / CNC | **partiya** | stanok sozlamasi bo'yicha |
| **Saralash (stelaj)** | **← CODP** | materialga moslangan ketma-ketlikni buyurtmaga moslangan ketma-ketlikka aylantiradi |
| Pochkalash | **buyurtma** | ta'rifi bo'yicha |
| TMO | **mijoz** | |

**Bizning tizim butunlay shu nuqtadan pastda yashaydi.** Demak bizdagi
«konveyr» — haqiqiy konveyr ishlab chiqarish emas (raskroy hamma uchun konveyr).
U faqat «pochkani material bo'yicha ter» degani. Nomi kengroq va'da beradi,
ish esa torroq — «konveyrni majburlash mijozni cheklaydi» degan tuyg'u shundan.

### 2.2 Ikki buyurtma turi — bir savol

Asl farq shunda:

> **Pochkalash paytida bu detallar allaqachon aniq mijozga biriktirilganmi?**

- **Individual (s/p, kuxnya):** ha → modul/xona bo'yicha ajratish shart,
  chunki mijoz pochkani qabul qilib, yig'a olishi kerak.
- **Konveyr (100 ta parta):** yo'q → eng arzon o'q bo'yicha (material) terish mumkin.

Bu **spektr, ikki nuqta emas.** Oraliq holat real: *12 ta parta, 12 xil maktabga*.
Mahsulot bir xil, lekin mijozga biriktirilgan. Bunda **buyurtma o'qi + modul o'qi**
birga kerak — bugungi ikki presetning hech biri buni bermaydi. Shuning uchun
1-bo'limdagi «buyurtma / mijoz» o'qi shunchaki qulaylik emas, **yetishmayotgan qism**.

### 2.3 Batch size 1 va saralash buferi

Zamonaviy panel mebel liniyalari («batch size 1») aynan shunday ishlaydi:
oxirgi kesimdan keyin har detalga shtrix-kod yorlig'i yopishtiriladi va u butun
jarayon davomida detalni identifikatsiya qiladi. So'ng **saralash buferi** turadi:
ishchi detal kodini skanerlaydi — tizim **qaysi yacheykaga qo'yishni aytadi**,
detallar buyurtma/pozitsiya bo'yicha stelajga teriladi.

Ya'ni **bizning stelaj sxemamiz dunyo amaliyotining o'zi.** Jismoniy qism to'g'ri
qurilgan; tuzatish kerak bo'lgani — ustidagi dasturiy model.

### 2.4 As-planned va as-built (ISA-95)

MES standarti ikki yozuvni **alohida** saqlaydi:

- **Reja (as-planned)** — nima qilinishi belgilangan edi
- **Fakt (as-built)** — aslida nima qilindi (skanerlardan)

Odatda ikkisi mos keladi. Ular ajralib ketgan holat — bu xato emas, bu
**normal holat** va tizim uni qabul qila olishi shart. Fors major shu yerdan
kelib chiqadi (§4).

### 2.5 Yorliq identifikatori — keyingi bosqich uchun

Hozirgi QR formati (`SM.UUID.R3|P05|Q3|KOD|LxWxT`) o'zimiznikida yaxshi ishlaydi.
MES/ERP ga ulanishda dunyo standarti — logistik birlik uchun **SSCC** (GS1) va
GS1 yorlig'i tartibi. Buni hozir qilish shart emas, lekin QR ichidagi
identifikator **almashtiriladigan** qilib qo'yilsa, keyin og'riqsiz o'tiladi.

---

## 3. Mantiqni belgilash masalasi

Tamoyil (ISA-95 dan):

> **Guruhlash ma'lumoti mahsulot ta'rifiga tegishli, pochkalash algoritmiga emas.
> Algoritm hech qachon jimgina taxmin qilmasligi kerak.**

### 3.1 Uch pog'onali aniqlash

| # | Manba | Ishonch | Qachon |
|---|---|---|---|
| 1 | Tuzilishdan — `<good typeId="product">` | yuqori | Gib Lab fayli to'g'ri bo'lsa |
| 2 | Konvensiyadan — kod prefiksi (N belgi, sozlanadi) | o'rta | tuzilish yiqilganda (100 buyum = 1 good) |
| 3 | Qo'lda — P/M xaritasi | aniq, lekin qimmat | qolgan hamma holatda |

Bu allaqachon qisman bor (`unitOf`, prefiks rejimi). Yetishmayotgani — quyidagi ikkitasi.

### 3.2 Manbani ko'rsatish (provenance) — eng muhim yetishmayotgan narsa

Tizim har doim javob bera olishi kerak:

> **«Nega bu alohida pochka?»** → *«modul 03 — kod prefiksidan (2 belgi)»*

Busiz P/M chek-listni ishlata olmaydi: qaysi belgilash qayerdan kelganini
ko'rmasa, u nimani o'zgartirayotganini bilmaydi. Bu bitta qator matn, lekin
«universal tizim» degan gapning butun og'irligi shunga tayanadi.

Va: tizim **taxmin qilishga majbur bo'lganini alohida aytishi kerak** —
diagnostikada «5 modul kod prefiksidan olindi, tuzilishdan emas» degan qator.

### 3.3 Profil — «bir marta sozlanadi»

TZ-v2 §2: *«Konveyr sozlamasi bir marta qilinadi va eslab qolinadi… loyiha nomiga
bog'lab.»* To'g'ri, lekin loyiha nomi — noto'g'ri kalit: har loyihaning nomi boshqacha.

To'g'ri kalit — **konstruktor konvensiyasi**. Bitta bazischi hamma loyihaga bir xil
belgilash beradi. Shuning uchun saqlanadigan narsa — **nomlangan profil**:

```
Profil «Luiza s/p»
  o'qlar:      modul=ajrat, material=aralash, klass=aralash, buyurtma=ajrat
  modul manbai: kod prefiksi, 2 belgi
  guruhlar:    {tumba, tremo} birga
  material katalogi: …
```

Loyiha yuklanganda profil taklif qilinadi (nomi yoki tuzilishi bo'yicha),
P/M tasdiqlaydi yoki almashtiradi.

### 3.4 Uzoq muddatli yechim

Dunyo amaliyotida chegara **yuqorida e'lon qilinadi**, pastda taxmin qilinmaydi.
Ya'ni asl yechim — bazis konstruktori bilan **nomlash standarti** bo'yicha
kelishuv. Tizim taxmin qilishni zaxira yo'l sifatida qo'llab-quvvatlaydi va
har safar taxmin qilganini **aytadi**. Bu ikkisi birga — universallik ham,
ishonchlilik ham.

---

## 4. Fors major — reja va fakt ajralganda

To'liq oqim TZ-v2 §12 da. Bu yerda — **nega shunday**.

Qo'lda, tizimsiz yig'ilgan pochkaning **rejasi yo'q**. Uni algoritm natijasi bilan
solishtirish mumkin emas — solishtirishga narsa yo'q. Shuning uchun:

| Tekshiruv | Qo'lda kiritilgan pochkaga |
|---|---|
| Fizik me'yorlar (massa, qavat soni, qalinlik, gabarit) | **qo'llanadi** |
| Detal yo'qolgan / takrorlangan | **qo'llanadi** |
| Guruhlash qoidasi (`GURUH`) | **qo'llanmaydi** |
| Yig'ish ketma-ketligi rejaga mosligi | **qo'llanmaydi** |

Buning uchun pochkada `manba` maydoni bo'lishi kerak: `"algoritm"` yoki `"qo'lda"`.
Audit shunga qarab qoidalar to'plamini tanlaydi.

**Aks holda nima bo'ladi:** qo'lda kiritilgan har pochka auditda qizil chiqadi,
operator qizil rangga ko'nikadi va bir haftadan keyin **haqiqiy xatoni ham
ko'rmay qoladi.** Fors major yo'lining butun ma'nosi shu maydonda.

Yo'nalish (foydalanuvchi bergan spetsifikatsiya): pochka jismonan **tepadan pastga**
sochiladi, tizimga **tagdan tepaga** yoziladi — oxirgi olingan detal tag detal bo'ladi.

---

## 5. Bugun kiritilgan o'zgarishlar

Guruh chegarasi qo'lda tahrirlashda umuman tekshirilmasdi: bir bosishda
konveyrda material, individualda modul aralashib ketardi va audit yashil turaverardi.

| # | O'zgarish | Fayl |
|---|---|---|
| 1 | Pochkaga guruh kaliti yoziladi (`p.key`) | `04-packer.js:420` |
| 2 | `keyWhy()` — qaysi o'q mos kelmaganini aytadi | `04-packer.js:353` |
| 3 | `moveDetail()` guruh chegarasini tekshiradi | `10-ui.js:623` |
| 4 | Tanlov ro'yxati guruh bo'yicha filtrlanadi | `10-ui.js:644` |
| 5 | «+ yangi pochka» guruhni meros oladi | `10-ui.js:616` |
| 6 | Audit: `grpWhy()` + yangi `GURUH` xato kodi | `05-audit.js:131`, `:179` |
| 7 | Ko'chirishdan keyin `sortPlan()` qayta hisoblanadi | `10-ui.js:689` |
| 8 | 4 ta yangi test | `tests/smoke.ps1` |

Xato xabari endi aniq:
`material mos emas: LMDF Krem / LDSP Oq`

---

## 6. Keyingi qadamlar — tartib bilan

| # | Ish | Nega shu tartibda |
|---|---|---|
| 1 | **O'q vektori + chek-list** (§1) — `S.mode` o'rniga o'qlar, `ind`/`conv` preset bo'ladi | Universallikning o'zagi; qolgan hamma narsa shunga tayanadi |
| 2 | **Buyurtma va xona o'qlari** (§1) | Oraliq holatlar (12 parta / 12 maktab) hozir umuman ishlamaydi |
| 3 | **Provenance + profil** (§3.2, §3.3) | Chek-list bo'lsa-yu, manba ko'rinmasa — P/M uni ishlata olmaydi |
| 4 | **`manba` maydoni + audit rejimi** (§4) | Fors majordan oldin kerak: busiz kiritilgan pochka qizil chiqadi |
| 5 | **Fors major moduli** (TZ-v2 §12) | Yuqoridagi 4 tayyor bo'lgach |
| 6 | **Qo'lda tetris terish** (TZ-v2 §11) | Eng katta interfeys ishi; mantiq barqarorlashgach |

---

## Manbalar

- [Sorting, Buffering and Collating Systems — HOMAG](https://www.homag.com/en/product-detail/machines/sorting-buffering-and-collating-systems/sorting-line)
- [Sorting Production Set: the sorting assistant — HOMAG](https://www.homag.com/en/product-detail/sorting-production-set)
- [Batch size 1 takes center stage — HOMAG](https://www.homag.com/en/company/news/case-studies/detail/batch-size-1-takes-center-stage)
- [Differentiation and Customer Decoupling Points: Key Value Enablers for Mass Customization — Springer](https://link.springer.com/chapter/10.1007/978-3-662-44733-8_6)
- [Postponement, Mass Customization, Modularization and Customer Order Decoupling Point (PDF)](https://www.diva-portal.org/smash/get/diva2:17751/FULLTEXT01.pdf)
- [Managing Customer Order Decoupling Points in Supply Chains — Springer](https://link.springer.com/rwe/10.1007/978-3-030-89822-9_103-1)
