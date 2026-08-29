# POCHKALASH TIZIMI — TO'LIQ PROMPT (BAZIS .project fayllari uchun)

## 1. MAQSAD
Berilgan `.project` (BAZIS) faylidagi mebel loyihasini tahlil qilib, **har bir noyob ID kodli detalni alohida pochka (paket)** sifatida ro'yxatga olish va Excel jadval ko'rinishida chiqarish.

---

## 2. KIRISH MA'LUMOTLARI (fayldan olinadi)

Faylni oching va quyidagi elementlarni toping:

- `<project>` — loyiha nomi, valyuta, versiya
- `<good typeId="product">` — asosiy mahsulot (mebel to'plami), ichida barcha `<part>` elementlari
- `<part>` — har bir detal: `code`, `name`, `l` (uzunlik), `w` (kenglik), `count` (soni), `elt/elb/elr/ell` (kromka tomonlari), `eltMat/elbMat/elrMat/ellMat` (kromka materiali)
- `<operation typeId="XNC">` — har detalning parma dasturi, `program` ichidagi `dz="..."` qiymati = **qalinlik (T)**
- `<good typeId="sheet">` — plita turlari (masalan LDSP 16mm, XDF 3mm) — nom va qalinlik manbasi
- `<good typeId="band">` — kromka (yopqich lenta) turi va rangi

---

## 3. ID KOD TUZILISHINI ANIQLASH

ID kodlar odatda `XX_YYY` formatida bo'ladi:
- **XX** — mahsulot/modul raqami (masalan 01, 02, 03...)
- **YYY** — shu modul ichidagi detal tartib raqami

**Qoida:** Fayldagi barcha noyob `XX` prefikslarni aniqlang va har biriga mos mebel nomini **detal nomlaridan mantiqiy xulosa chiqarib** belgilang (masalan "bok", "tom", "sokl", "Fasad", "Дно ящика" so'zlaridan — bu tortmali tumbochka/komod ekanligi, "goli"/"oyoq" so'zlaridan — karavot ekanligi kelib chiqadi). Agar mahsulot nomi aniq bo'lmasa, foydalanuvchidan so'rang — o'zingizdan taxmin qilib yozib qo'ymang.

---

## 4. HAR BIR ID KOD UCHUN QOIDALAR (pochkalash mantig'i)

1. **Bitta noyob `part.code` = bitta pochka qatori.** Bir xil kodli takroriy `<part>` yozuvlari (masalan bir xil kod 2 marta uchrasa) BIRLASHTIRILADI — ularning `count` qiymatlari qo'shiladi va yagona `Soni (dona)` ustunida ko'rsatiladi.
2. Har xil kodli detallar **hech qachon birlashtirilmaydi**, hatto o'lchami bir xil bo'lsa ham.
3. Har bir pochka qatoriga tartib raqami (**Pochka №**) beriladi — modul ichida ketma-ket, keyingi modulga o'tganda davom etadi (masalan 01-modul 1–9 bo'lsa, 02-modul 10-dan boshlanadi).
4. **O'lcham:** `l` = uzunlik (L, mm), `w` = kenglik (W, mm) atributlaridan olinadi.
5. **Qalinlik (T):**
   - Avval mos `part.code`ga tegishli `<operation typeId="XNC">` dagi `program` atributidan `dz="..."` qiymatini qidiring.
   - Topilmasa, detal nomida `XDF` yoki `HDF` so'zi bo'lsa → qalinlik shu plitaning `<good typeId="sheet">` dagi `t` qiymati (odatda 3mm).
   - Hech biri topilmasa → asosiy struktura plitasining standart qalinligi (`<good typeId="sheet">`, name="LDSP...") qo'yiladi.
   - **Taxmin qilingan qalinliklarni "Izoh" ustunida belgilang** — foydalanuvchiga qaysi qiymat aniq, qaysi taxminiy ekanini ko'rsating.
6. **Material:** detal nomi va tegishli `<good typeId="sheet">` nomidan aniqlanadi (masalan "LDSP 16mm oq", "XDF 3mm", "HDF 3mm").
7. **Kromka:** `elt` (yuqori/Top), `elb` (past/Bottom), `elr` (o'ng/Right), `ell` (chap/Left) atributlari mavjud bo'lgan tomonlarni harflar bilan ko'rsating (masalan "T, B, L, R" yoki "-" agar yo'q bo'lsa).

---

## 5. CHIQISH FORMATI (Excel jadval)

**Har modul — alohida varaq (sheet)**, nomi: `XX - <Mahsulot nomi>` (masalan "01 - Krovat (karavot)").

Har varaqda ustunlar aniq shu tartibda va nomda bo'lsin:

| Pochka № | ID kod | Detal nomi | O'lcham L (mm) | O'lcham W (mm) | Qalinlik T (mm) | Soni (dona) | Material | Kromka tomoni | Izoh |
|---|---|---|---|---|---|---|---|---|---|

Qo'shimcha **"Svodka"** varag'i (birinchi o'rinda) bo'lishi shart, unda:
- Har modul nomi
- Noyob ID kodlar soni
- Jami detal soni (dona)
- Shu modulga tegishli pochka raqamlari oralig'i (masalan "№1 — №9")
- Pastda **JAMI** qatori — barcha modullar bo'yicha umumiy summa

---

## 6. FORMATLASH TALABLARI

- Shrift: **Arial**, sarlavhalar qalin (bold), oq matn ko'k fon (`#2F5496`) ustida
- Sarlavha qatori muzlatilgan (freeze panes)
- Qatorlar zebra-uslubda (juft qatorlar och fon rangida)
- Ustun kengliklari matn sig'adigan darajada moslashtirilgan
- Raqamli ustunlar (o'lcham, soni) markazlashtirilgan, matnli ustunlar chapga tekislangan

---

## 7. AGAR MA'LUMOT YETARLI BO'LMASA

- Modul nomi noaniq bo'lsa — taxmin qilmang, foydalanuvchidan so'rang.
- Qalinlik yoki material XNC dasturidan ham, nomidan ham aniqlanmasa — "Izoh" ustuniga "qalinlik taxminiy" deb yozing, jimgina standart qiymat qo'ymang.
- Agar bitta ID kod ichida turli o'lchamli qatorlar uchrasa (xatolik yoki variant) — ularni birlashtirmang, alohida qatorlarda ko'rsating va "Izoh"da sababini yozing.

---

## 8. MISOL (yakuniy natija qanday ko'rinishi kerak)

| Pochka № | ID kod | Detal nomi | L | W | T | Soni | Material | Kromka | Izoh |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 01_001 | goli | 250 | 292 | 16 | 2 | LDSP 16mm oq | - | |
| 8 | 01_009 | bok | 2100 | 350 | 16 | 1 | LDSP 16mm oq | T | |
| 14 | 02_004 | XDF ort | 415 | 381 | 3 | 1 | XDF 3mm (orqa panel) | - | |

---

**Ushbu promptni istalgan yangi `.project` faylga nisbatan qo'llash mumkin — u shunchaki ID kod tuzilishini, kromka/qalinlik/material aniqlash mantig'ini va chiqish formatini belgilaydi.**
