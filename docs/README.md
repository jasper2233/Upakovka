# Hujjatlar

Har hujjatning **turi** boshqacha — buni bilmasdan o'qish chalkashtiradi:
biri kelishilgan talabni saqlaydi (unda hali bajarilmagani ham bor),
ikkinchisi esa bugungi kodning holatini tasvirlaydi.

| Hujjat | Turi | Nima uchun ochiladi |
|---|---|---|
| [arxitektura.md](arxitektura.md) | **holat** (as-built) | modullar, ma'lumot modeli, global nomlar, determinizm, yangi narsa qo'shish tartibi |
| [meyorlar-TZ.md](meyorlar-TZ.md) | **holat** (as-built) | har me'yor: nima, qayerda ishlaydi, nega shu son, oshirsa/kamaytirsa nima bo'ladi |
| [alohida-pochkalash.md](alohida-pochkalash.md) | **holat** + tahlil | modul va xona kesimi qanday ishlaydi, `komplekt-5modul` misolida |
| [TZ-v2.md](TZ-v2.md) | **talab** (spec) | buyurtmachi bilan kelishilgan qarorlar; bir qismi hali bajarilmagan |
| [TZ-v3-mantiq.md](TZ-v3-mantiq.md) | **tahlil** | guruhlash modeli, dunyo amaliyoti (CODP, ISA-95), keyingi qadamlar |
| [ochiq-qarorlar.md](ochiq-qarorlar.md) | **backlog** | hali hal qilinmagan narsalar: buyurtmachidan so'raladigan 6 savol, 8 taklif |

Foydalanuvchi hujjati — ildizdagi [README.md](../README.md).

---

## Nima qayerda yozilgan

Bir savolga bitta joyda javob beriladi. Takrorlanish bo'lsa — havola qo'yiladi,
matn ko'chirilmaydi.

| Savol | Hujjat |
|---|---|
| Tizim nima qiladi, qanday ishlatiladi | `README.md` |
| Nega bu son aynan shunday (35 kg, 85 %, 300 mm…) | `meyorlar-TZ.md` |
| Kod qanday tuzilgan, `pack` / `layer` / `item` maydonlari | `arxitektura.md` |
| Modul, xona va klass kesimi qanday hal qilinadi | `alohida-pochkalash.md` |
| Buyurtmachi nimani so'ragan | `TZ-v2.md` |
| Nega guruhlash aynan shu modelga qurilgan | `TZ-v3-mantiq.md` |
| Nima hali hal qilinmagan | `ochiq-qarorlar.md` |

`namuna/Pochkalash_tizimi_prompt.md` — hujjat emas, **manba**: buyurtmachining
dastlabki topshirig'i (Excel eksporti haqida). U bilan bugungi tizimning farqi
[alohida-pochkalash.md §8](alohida-pochkalash.md) da tushuntirilgan.

---

## Hujjatni yangilash qoidasi

Kod o'zgarganda hujjat **o'sha kommitda** yangilanadi. Uchta narsa eng tez
eskiradi, shuning uchun ular alohida tekshiriladi:

1. **Standart qiymatlar.** Manba — `index.html` (`value=`) va
   `src/js/02-state.js`, chegara esa `src/js/13-app.js` → `readConf()`.
   Hujjatdagi har raqam shu uchtasiga mos bo'lishi shart.
2. **O'lchangan jadvallar** («namunada: 90 % — 56 pochka»). Ular
   `namuna\namuna.project` ustida o'lchanadi; algoritm o'zgarsa qayta o'lchash
   kerak, aks holda hujjat yolg'on gapiradi. Korpus raqamlari
   («205 fayl, 4892 pochka») — `tests\corpus.ps1` chiqishidan.
3. **Fayl va funksiya havolalari.** Qator raqamiga havola **qilmang** — u
   birinchi tahrirdayoq eskiradi; funksiya nomiga havola qiling.
