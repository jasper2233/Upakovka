# MebeliX MES bilan integratsiya

Bu hujjat **ikki tomonga** yozilgan: upakofka bugun nima beradi va MebeliX MES
tomonida nima o'zgarishi kerak. MES kodiga upakofka jamoasi **tegmaydi** —
2-bo'limdagi har band MES dasturchilariga topshiriladi.

MES manbasi: <https://github.com/dshukriddinov/MebeliX-Mes-System>
(o'rganilgan holat: `94a2f9e`, 2026-10-26).

---

## 0. Nega ikki tizim

MES qadoqlashni **qo'lda** yuritadi (`backend/app/api/routes/pachka.py`):
upakovkachi «Qadoq yaratish» bosadi, detallarni istalgan tartibda skanerlaydi,
«Yakunlash» bilan yopadi. Kodda ochiq yozilgan: *«Tarkibni ALGORITM emas,
qadoqlovchi belgilaydi»*. Og'irlik faqat ko'rsatiladi (`DENSITY = 700`, hamma
material uchun bitta).

Upakofka aynan shu bo'shliqni to'ldiradi: **qanday qadoqlash kerak** — qaysi
detal qaysi pochkaga, qaysi qavatga, 3D da qayerga; massa, balandlik, tom
tayanchi chegaralari bilan. MES esa **nima qadoqlandi** (as-built) ni yozadi.
Ya'ni upakofka — reja (as-planned), MES — fakt; ular raqobat qilmaydi.

---

## 1. Upakofka tomonida bajarilgani (v22)

### 1.1 Detal ID — MES bilan bir xil satr

MES har jismoniy detalga chek chiqaradi (`docs/11-detal-id-nomlash.md`):

```
{buyurtma}_{mahsulotKodi}_{detalKodi}[-N][_n]
B-2026-047_100701_03_002_1
```

Upakofka har detal nusxasiga aynan shu ID ni hisoblaydi (`item.mes`).
Qoidalar MES parseridan (`services/giblab/parser.py`, `models.py`) ko'chirilgan:

| Qism | MES dagi joyi | Upakofkada |
|---|---|---|
| mahsulot kodi: `code` → `name` → `PRODUCT` | `parse_project` | `mesProdCode()` |
| detal kodi: `code` → `part.code` → `001` | `_build_part` | `mesPartKey()` |
| takror kod: `-2`, `-3` (mahsulot KODI bo'yicha) | `_dedupe_part_code` | `mesPartKey()` |
| `_n` faqat `count > 1` da | `ParsedPart.serial_qrs` | `buildItems()` |
| buyurtma prefiksi `^B-\d{4}-\d+_` | `ORDER_PREFIX_RE` | `MES_ORDER_RE` |

Qadoqlash ekrani va saralash posti MES chekini **o'z chekidek** taniydi.
P/M da MES buyurtma raqami kiritilsa (`B-2026-047`), boshqa buyurtma cheki rad
etiladi — mahsulot kodi buyurtmalararo takrorlanishi mumkin.

**Real fayllarda o'lchangan** (205 ta `.project`): bitta mahsulot ichida takror
detal kodi **150 faylda** uchraydi (1279 holat, odatda chap/o'ng bok) — `-N`
qoidasi amalda hal qiluvchi. Kodsiz mahsulot — 11 fayl, kodsiz detal — 188 ta,
ichma-ich `<part>` — 0.

> ⚠️ **Ochiq tekshiruv.** Upakofka ID lari MES parserining o'zi bilan hali
> bittalab solishtirilmagan — qoidalar kod o'qib ko'chirilgan va unit-test bilan
> qoplangan. 2-bo'lim M6 ga qarang.

### 1.2 Reja eksporti — `*_mes-reja.json`

P/M → «MES rejasi (JSON)». MES o'qiy oladigan pochkalash rejasi (qiymatlar —
misol, tuzilish — aniq):

```json
{
  "format": "upakofka-plan", "version": 1, "app": "UPK v22",
  "order": "B-2026-047",
  "project": { "name": "…", "uuid": "…", "rev": 1 },
  "settings": { "max_kg": 35, "odd_max_kg": 40, "tare_kg": 0.6, "one_man_kg": 25 },
  "packs": [{
    "no": 1, "code": "P01", "kind": "standart",
    "group": "01 shkaf", "room": null, "thickness": 16,
    "net_kg": 34.98, "gross_kg": 35.58, "size_mm": [1753, 600, 160],
    "steps": [{
      "step": 1, "layer": 0, "role": "tag",
      "mes_id": "B-2026-047_990101_01_022", "mes_key": "990101_01_022",
      "code": "01_022", "name": "Bok", "size_mm": [1753, 600, 16], "kg": 11.78,
      "place": { "x": 0, "y": 0, "rot90": false }
    }]
  }]
}
```

| Maydon | Ma'nosi |
|---|---|
| `kind` | `standart` — tag + qavatlar; `nostandart` — uzun/tor detallar bog'i (`place` = `null`) |
| `role` | `tag`, `qavat`, `ust` (eng ustki qopqoq), `quyruq`, `noodatiy` |
| `layer` | 0 = tag, 1… = qavatlar (pastdan tepaga) |
| `place` | tag detalning chap-orqa burchagidan, mm; manfiy = tagdan chiqib turadi |
| `mes_id` | MES chekidagi to'liq satr; buyurtma raqami kiritilmagan bo'lsa prefikssiz |
| `steps` tartibi | yig'ish tartibi — upakovshik shu tartibda qo'yadi |

Xuddi shu ID «Pochka ro'yxatini CSV» da `mes_id` ustunida ham bor.

---

## 2. MES tomonida kerak bo'ladigan o'zgarishlar

Muhimlik tartibida. Har band — **taklif**, yechim MES jamoasiniki.

### M1. Upakofkani qayerda ochish — eng birinchi qaror

Upakofka — bitta statik HTML (`dist/upakofka-tizimi.html`, ~500 KB, server
kerak emas). MES API ga brauzerdan murojaat qilishi uchun:

| Yo'l | MES da nima o'zgaradi | Izoh |
|---|---|---|
| **(a) Bitta origin — tavsiya** | `caddy/Caddyfile`: `mes.mebelix.uz/upakofka/*` → statik fayl | MES login cookie (`samesite=strict`, httpOnly) o'z-o'zidan ishlaydi; CORS kerak emas |
| (b) Alohida subdomen | `CORS_ORIGINS` ga domen + Bearer token bilan login | `kroy-deploy.md` dagi tartib; cookie `strict` bo'lgani uchun token yo'li shart |

Bu qaror qabul qilinmaguncha upakofka MES bilan **fayl orqali** ishlaydi
(`.project` qo'lda yuklanadi, reja JSON qo'lda uzatiladi).

### M2. Upakovkachiga buyurtma ma'lumoti

Upakofkaga har detalning o'lchami, materiali va MES ID si kerak. Hozir:

- `GET /pachka/orders/{id}` upakovkachiga ochiq, lekin `UpakovkaPending` da
  faqat `qr_text`, `part_code`, `part_name`, `ready` bor — **o'lcham yo'q**;
- `GET /orders/{id}/files/{file_id}` (`.project`) va `GET /orders/{id}/matrix`
  — `StaffReadUser`, upakovkachi ola olmaydi.

**Taklif (bittasi yetadi):**
1. `UpakovkaPending` / `PachkaItemRow` ga `length`, `width`, `thickness`,
   `material_name` qo'shish (ma'lumot `Part` da allaqachon bor); yoki
2. UPAKOVKA post rollariga buyurtmaning `PROJECT` faylini o'qishga ruxsat.

### M3. Rejani MES da saqlash va terminalda ko'rsatish

1.2 dagi JSON ni qabul qiluvchi joy:

- `order.pack_plan` (JSONB) ustuni + migratsiya;
- `PUT /pachka/orders/{id}/plan` — P/M (MANAGER/TEXNOLOG) yuklaydi;
- `UpakovkaView.tsx`: ochiq qadoq uchun «rejadagi keyingi detal» va qavat.

Muhim tamoyil — MES ning o'z qoidasi saqlanadi: **reja bloklamaydi**.
Upakovkachi rejadan chetga chiqsa skan baribir qabul qilinadi, faqat
ogohlantiriladi (TZ-v3 §2.4, as-planned / as-built).

MES dagi qadoq kodi (`PK-B-2026-047-03`) rejadagi `P03` bilan **bir xil
bo'lishi shart emas** — bog'lanish tarkib (`instance_id`) orqali.

### M4. Og'irlik

MES `DENSITY = 700` ni hamma materialga qo'llaydi (`pachka.py: _weight`).
3 mm HDF, 0,6 mm XDF va 18 mm MDF uchun bu farq qiladi. Rejada har detalning
massasi (`steps[].kg`) material katalogidan hisoblangan — MES uni ko'rsatishi
mumkin. Ixtiyoriy.

### M5. O'zgartirish kerak EMAS

- **Bitta ochiq qadoq** (`_open_of`) — upakofka ham pochkalarni ketma-ket
  teradi, mos.
- **Qadoq cheki** (`print_pachka_label`) — MES chiqaradi; upakofkaning o'z
  pochka cheki MES rejimida kerak bo'lmaydi.
- **Detal cheki** — MES ARRA da chiqaradi; upakofka o'zinikini chiqarmasa ham
  bo'ladi (MES cheki skanerlanadi).

### M6. ID qoidasi o'zgarsa — xabar bering

`order_token()` o'zgarsa (masalan `B2026047`, `docs/11` da ko'zda tutilgan)
yoki `_dedupe_part_code` / kodsiz detal qoidasi o'zgarsa, upakofkadagi
`MES_ORDER_RE`, `MES_NO_RE`, `mesPartKey()` ham o'zgarishi kerak — aks holda
skaner MES chekini tanimay qoladi.

Solishtirish uchun so'rov: MES parserini (`parse_project(..., check_ids=False)`)
205 ta namuna faylda yurgizib, `ParsedPart.qr_texts` ni upakofka
«MES rejasi» dagi `mes_key` / `mes_id` bilan solishtirish. Farq bo'lsa — qaysi
fayl va qaysi detal.

---

## 3. Upakofka tomonida keyingi qadamlar (MES qaroriga bog'liq)

| Qadam | Kutadi |
|---|---|
| MES dan buyurtmani to'g'ridan-to'g'ri olish (faylsiz) | M1 + M2 |
| Qadam-baqadam ekrandan MES ga skan yozish (`POST /pachka/{id}/scan`) | M1; upakovkachi hisobi va ochiq smena |
| Rejani MES ga yuborish | M3 |
| O'z detal/pochka chekini MES rejimida o'chirish | M1 |
