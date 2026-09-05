# Alohida pochkalash — modul va xona kesimi

Manba: `namuna\komplekt-5modul.project` va `namuna\Pochkalash_tizimi_prompt.md`.

Sana: 2026-08-29.

> **Eslatma.** Quyidagi tahlil dastlab haqiqiy Gib Lab eksporti ustida bajarilgan.
> U mijoz buyurtmasi bo'lgani uchun ochiq repoga chiqmaydi. O'sha faylning
> **shakli** `tools\seed-to-project.ps1` bilan sun'iy ma'lumotdan qayta yasaldi —
> `namuna\komplekt-5modul.project`. Regressiya testi shu fayl ustida yuradi va
> aynan o'sha invariantni tekshiradi.

---

## 1. Fayl nima deyapti

| | Qiymat |
|---|---|
| Loyiha | `Namuna komplekt - 5 modul` |
| `<good typeId="product">` | **1 ta** — `990500` «Komplekt» |
| Pozitsiya | 31 |
| Detal | 49 |
| Material | LDSP 16 mm oq · XDF 3 mm orqa |
| Kod ko'rinishi | `01_001` … `05_007` — hammasi `_` bilan |

**Hal qiluvchi fakt: faylda bitta mahsulot bor, lekin ichida beshta mustaqil mebel.**
Ularning chegarasi faylning tuzilishida **yo'q** — u faqat detal kodining prefiksida.

| Prefiks | Poz. | Eng katta detal | Detal nomlari | Modul |
|---|---|---|---|---|
| `01` | 5 | 2100 × 350 | goli, bok, tepa, pol goli, oyoq | **karavot** |
| `02` | 6 | 480 × 382 | bok, tom, pol, fasad, sokol, XDF ort | **tumba chap** |
| `03` | 6 | 480 × 382 | `02` bilan bir xil | **tumba o'ng** (juftlik) |
| `04` | 7 | 2084 × 560 | bok, tom, pol, polka, qosh, sokol, XDF ort | **shkaf** |
| `05` | 7 | 1000 × 450 | tom, bok, pol, ramka, fasad, sokol, XDF ort | **tremo** |

Modul nomlari fayl ichida **yo'q** — hammasi bitta «Komplekt» mahsuloti ostida.
`Pochkalash_tizimi_prompt.md` §3 ning qoidasi shu holat uchun:
*«Agar mahsulot nomi aniq bo'lmasa, foydalanuvchidan so'rang — o'zingizdan taxmin qilib
yozib qo'ymang.»* Shuning uchun nomni P/M yozadi (§5.1).

Prompt hujjati modul aniqlash qoidasini ham aynan shunday belgilaydi (§3):
*«ID kodlar `XX_YYY` formatida: **XX** — mahsulot/modul raqami»*.

---

## 2. Nima buzilgan edi va nima tuzatildi

29-avgustda «modul belgisi manbai» tanlovi olib tashlandi va modul faqat
`<good typeId="product">` dan olinadigan bo'lgan edi. **Shu fayl buni rad etadi:**
faylda bitta good bor, demak beshala mebel bitta modul bo'lib qolardi — karavot,
tumba, shkaf va tremo detallari bitta pochkada aralashib ketardi.

**Tuzatildi.** Endi qoida bitta va **avtomatik** — sozlama emas, faylning o'z xossasi:

> Kod prefiksi tuzilishdan **ko'proq** birlik bersa — prefiks olinadi,
> aks holda `good` kodi.

Hamma namuna fayllarda tekshirildi:

| Fayl | `good` | Prefiks | Tanlangan manba | Modul |
|---|---|---|---|---|
| **komplekt-5modul** | 1 | 5 | **kod prefiksi** | 5 ✓ |
| namuna | 4 | 4 (good ↔ prefiks 1:1) | tuzilish | 4 ✓ |
| konveyr-partiya | 1 | yo'q (`99020101`) | tuzilish | 1 ✓ |
| test-yupqa | 1 | 1 | tuzilish | 1 ✓ |

Tanlov yo'q, raqam kiritilmaydi. `src/js/02-state.js` → `unitSrc()`, `unitOf()`.

---

## 3. Uch holat — sizning savolingizga javob

`komplekt-5modul` fayli bo'yicha **o'lchangan** raqamlar (audit toza, modul aralashmagan):

| Holat | P/M nima qiladi | Natija |
|---|---|---|
| **Har biri alohida** | «Har modul alohida pochkalansin» ✓ | **11 pochka**, 0 ta aralash |
| **Ba'zilari birga** (ikki tumba `02`+`03`) | shu ikkisini belgilab «Xona yaratish» | modullar bitta pochkalash kalitini oladi |
| **Hammasi birga** | «Har modul alohida pochkalansin» ✗ | odatiy pochkalash — kesim o'chiriladi, xolos |

> Raqamlar `smoke.ps1` dagi «5modul» blokidan (`komplekt-5modul.project`,
> 31 pozitsiya / 49 detal). Algoritm o'zgarsa ular ham o'zgaradi — testdagi
> qiymat manba hisoblanadi.

Uchinchi qatorda siz aytganingizdek: **qo'shib pochkalansa hech qanday qo'shimcha ish
yo'q — odatiy pochkalash tizimida qoladi.** Kesim o'chiriladi, tamom.

Ikkinchi qator uchun mexanizm allaqachon bor: **modul guruhlari** (`S.modGroups`).
Belgilangan modullar bitta pochkalash kalitini oladi va bitta pochkaga tushadi.

---

## 4. Xona kesimi

Savol: *bitta project fayl ichida bir nechta xona bo'lishi mumkin — nima qilish kerak?*

Yangi o'q kerak emas. **Xona = nomlangan modul guruhi + bitta bayroq:**

```
Xona «Yotoqxona»   [birga pochkalansin ✗]  →  01 karavot, 02 tumba, 03 tumba, 04 shkaf, 05 tremo
Xona «Zal»         [birga pochkalansin ✓]  →  kuxnya, pod-TV, shkaf
```

- **Bayroq ✓** — butun xona bitta pochkalash kalitini oladi: hamma moduli aralash teriladi
  (hozirgi `modGroups` xatti-harakati). Zal holati: kuxnya + pod-TV + shkaf birga.
- **Bayroq ✗** — har modul o'z pochkasini oladi, xona nomi esa **belgi** bo'lib qoladi:
  pochkalar ro'yxatida xona sarlavhasi ostida turadi va chekka yoziladi.

Ya'ni `modGroups` ga ikkita maydon qo'shiladi: `name` va `join`. Bitta mexanizm —
ham «birga pochkalash», ham «xona bo'yicha belgilash».

Bu TZ-v2 §8 dagi chek talabini ham yopadi: *«qaysi xona yoki modul»*.

---

## 5. P/M ning qiladigan ishlari

Tartib bilan. Har biri **faqat P/M da** — saralash va qadoqlash postlariga daxli yo'q.

### 5.1 Modullarni ko'rish va nomlash
Fayl yuklangach tizim modullarni o'zi ajratadi (`01`…`05`) va ularni ro'yxatda
detal soni, massasi va eng katta detali bilan ko'rsatadi. P/M har biriga **nom** yozadi:
`01 → Karavot`, `02 → Tumba chap`, `03 → Tumba o'ng`, `04 → Shkaf`, `05 → Tremo`.

Nom loyiha bilan saqlanadi. Busiz chekda `01` turadi va upakovshik nima ekanini bilmaydi.
**Bor** — `S.unitNames`, 6-bo'limdagi 3-band.

### 5.2 Modul kesimini belgilash
Bitta katakcha: «Har modul alohida pochkalansin». **Bor** (`S.split.prod`).

### 5.3 Modullarni birlashtirish
Ikki tumbani (yoki tremo + tumba) belgilab «Xona yaratish» bosiladi — ular bitta
pochkaga tushadi. **Bor**, guruh nom ham oladi (5.4).

### 5.4 Xona yaratish va modullarni taqsimlash
Xona nomi + qaysi modullar kiradi + «birga pochkalansinmi» bayrog'i.
**Bor** — `S.modGroups` ga `name` va `join` maydonlari qo'shildi (6-bo'lim, 5-band).

### 5.5 Klass kesimi
«Fasad alohida pochkalansin» — shu faylda `Fasad` (02, 03, 05 da) va `Фронтальная` (04 da)
bor, ular chizilib qolmasligi uchun alohida ketishi mumkin. **Bor.**

### 5.6 Qisman jo'natish
Faqat ba'zi modul pochkalansin (masalan shkaf keyinroq tayyor bo'ladi) — modul
ro'yxatidagi belgini olib tashlash. **Bor.**

### 5.7 Natijani ko'rish va tuzatish
Pochkalar ro'yxati xona → modul bo'yicha tizilgan; kerak bo'lsa detalni qo'lda
ko'chirish. **Bor va faqat P/M da** — menejerdagi «Pochkalarni tuzatish» bloki
(6-bo'lim, 8-band). Qadoqlash ekranida tahrirlash yo'q.

---

## 6. Nima qilinadi — ish ro'yxati

| # | Ish | Holat |
|---|---|---|
| 1 | Modulni kod prefiksidan avtomatik ajratish | ✅ bajarildi |
| 2 | `komplekt-5modul` fayli bilan regressiya testi (5 modul, aralashmaslik, birlashtirish) | ✅ bajarildi — 8 ta test |
| 3 | **Modulga nom berish** — P/M yozadi, loyiha bilan saqlanadi | ✅ bajarildi |
| 4 | Modul kartasida qaror asosi ko'rinsin | ✅ bajarildi |
| 5 | **Xona** — nomlangan modul guruhi + «birga pochkalansin» bayrog'i | ✅ bajarildi |
| 6 | Pochkalar ro'yxati xona → modul bo'yicha tizilsin | ✅ bajarildi |
| 7 | Chekda xona va modul **nomi** chiqsin (TZ-v2 §8) | ✅ bajarildi |
| 8 | Qo'lda tahrirlashni Qadoqlash ekranidan P/M ga ko'chirish | ✅ bajarildi |

### Qanday bajarildi

**3 — Modul nomi.** `S.unitNames` (kod → nom). Menejerdagi modul kartasida bevosita
yoziladi; `localStorage` va seansga saqlanadi; `unitLabel()` orqali ro'yxatda,
pochka sarlavhasida va **chekda** chiqadi. Nom berilmasa modul fayldagi o'z nomida
qoladi (`good` nomi yoki kodning o'zi).

**4 — Qaror asosi.** Modullar ro'yxati tepasida bir qator:
*«4 ta modul — proekt tuzilishidan (`good typeId="product"`). Kod prefiksi 4 ta
birlik berardi — tuzilishdan ko'p emas.»* Yoki `komplekt-5modul` uchun:
*«5 ta modul — detal kodi prefiksidan. Faylda mahsulot tuzilishi faqat 1 ta birlik
beradi, kod prefiksi esa 5 ta — shuning uchun kod olindi.»*

**5 — Xona.** `S.modGroups` ga ikki maydon qo'shildi: `name` va `join`.
`roomOf(code)` xonani belgilash uchun, `modGroupOf(code)` esa faqat `join:true`
bo'lganda pochkalash kalitini beradi. Chipda «birga / alohida» bir bosishda
almashtiriladi — xonani buzib qayta yaratish shart emas. Eski guruhlarda `join`
yo'q → `true` deb olinadi, ya'ni saqlangan sozlama xatti-harakati o'zgarmaydi.

**6 — Ro'yxat tartibi.** `groupSortKey()` guruhlarni xona → modul → klass →
material bo'yicha tizadi; pochka raqamlari shu tartibda beriladi. Ro'yxatda
xona sarlavhasi (`.pkroom`) modul sarlavhasidan (`.pkgrp`) bir pog'ona yuqorida.

**7 — Chek.** Pochka chekida `Xona` qatori (xona bo'lsa) va `Modul` qatori.
Detal chekida «Mahsulot» o'rniga `Modul` — `komplekt-5modul` da hamma detalning mahsuloti
«Komplekt», modul esa karavot / tumba / shkaf deb farq qiladi.

**8 — Tahrirlash P/M da.** `#btnEdit`, `EDIT` global holati va `renderEdit()`
butunlay olib tashlandi. O'rniga menejerdagi «Pochkalarni tuzatish» bloki
(`renderMgrEdit`) — o'z pochka tanlovi bilan, Qadoqlash ekranidagi `CUR` ga
bog'liq emas. Qadoqlash ekranida endi faqat «Qog'ozga o'rash» va «Qalinlik ×».

---

## 7. Postlarga daxli yo'q

Yuqoridagi hamma narsa **P/M ning qarori**. Natija boshqalarga faqat tayyor holda boradi:

| Kim | Nima ko'radi | Nima o'zgartira oladi |
|---|---|---|
| **Saralash** | qaysi detal qaysi yacheykaga | yacheykani ochish/yopish (fizik holat) |
| **Qadoqlash** | pochka ro'yxati, keyingi detal, 3D, chek | **hech narsa** |

Modul, xona, kesim va guruh — bularning hech biri post ekranlarida ko'rinmaydi va
o'zgartirilmaydi. Ular faqat **natijaga** ta'sir qiladi: pochka qanday terilgani va
chekda qanaqa nom turgani.

---

## 8. Eslatma — `Pochkalash_tizimi_prompt.md` haqida

U hujjat boshqa vazifani tasvirlaydi: **har noyob detal kodini bitta qator qilib
Excel jadvalga chiqarish** («bitta noyob `part.code` = bitta pochka qatori»).
Bu — ro'yxat/inventarizatsiya, fizik pochkalash emas: bizda pochka = bir necha o'nlab
detal qavat-qavat terilgan yaxlit joy.

Lekin ikki narsada u bizning mantiqni **tasdiqlaydi** va shuning uchun qimmatli:

1. Modul chegarasi `XX_YYY` kodining `XX` prefiksida (§3) — 2-bo'limdagi tuzatish shunga mos.
2. Modul nomini taxmin qilmaslik, foydalanuvchidan so'rash (§3, §7) — 5.1 shundan.

Agar shu Excel eksporti ham kerak bo'lsa — u alohida ish, ayting.
