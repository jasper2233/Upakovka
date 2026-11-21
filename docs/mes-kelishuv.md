# Upakofka ↔ MES: kelishilgan mantiq

Sana: 2026-11-21. Asos: MES `dev` tarmog'i (`9b1c57f`) o'rganildi, egasining qarorlari
(shu hujjatdagi hamma band) yig'ildi. Bu hujjat [`mes-integratsiya.md`](mes-integratsiya.md) dan
keyingi bosqich: o'sha yerda «nima ulanadi» yozilgan, bu yerda — «tsexda qanday ishlaydi».

MES kodiga upakofka tomonidan tegilmaydi. MES tomonidagi ishlar — §7 dagi **K** bandlar,
ularni MES jamoasi qiladi.

---

## 0. Hozirgi `dev` dagi mantiqiy kamchiliklar (nega bu hujjat)

| # | Hozir | Muammo |
|---|---|---|
| 1 | Reja IKKI joyda: `order.pack_plan` (qo'lda JSON) va `upakofka_plan` (saralash, `planId`) | Saralash bir rejani, terminal boshqasini ko'rishi mumkin |
| 2 | Pochkaning ikki kodi: `P03` (reja) va `PK-…-NN` (qadoq yaratilish tartibi) | Chekdagi raqam rejadagidan farq qiladi; bo'sh bekor qilingan qadoq raqamni siljitadi |
| 3 | MES qadog'i rejaga bog'lanmagan — tarkibning ko'pchiligidan taxmin qilinadi | Detal boshqa pochkaga tushsa ham qabul qilinadi |
| 4 | Saralash MES'ga ko'rinmaydi (ichi ochilmaydigan JSON) | Oldingi bosqichi tugamagan detal stelyajga tushadi; «detal qayerda?» yacheykani bilmaydi |
| 5 | Upakofka sahifasi MES tokenini yangilamaydi (30 daqiqa) | TV va saralash yarim soatdan keyin jim qotadi |
| 6 | `?order=` bilan ochilganda buyurtma raqami qo'yilmaydi | Reja ID lari prefikssiz, «boshqa buyurtmaning rejasi» tekshiruvi ishlamaydi |
| 7 | Ikki qadoqlash posti (upakofka `?post=pack` va MES terminali), ikki chek | Qadoqchi qayerda ishlashi noaniq |
| 8 | MES og'irligi 700 kg/m³ bilan, reja — katalog bilan | Chekdagi og'irlik rejadagidan farq qiladi; «2 kishi», «EHTIYOT» chekda yo'q |

---

## 1. Kim nima qiladi

| Tizim | Vazifasi |
|---|---|
| **Upakofka** (MES ichida, `/upakofka/`) | Faqat OFIS: texnolog buyurtmani ochadi, pochkalarga teradi, 3D da ko'radi, qo'lda tuzatadi va **«Rejani tasdiqlash»** bilan MES ga yuboradi |
| **MES** | Rejani saqlaydi va bajartiradi: saralash posti, stelyajlar, qadoqlash terminali, chek, TMO |

MES ichida upakofkaning saralash, qadoqlash va TV postlari ishlatilmaydi. Ular MES dan
tashqaridagi (fleshka, o'z server) nusxada qoladi.

---

## 2. Oqim

```
Texnolog (ofis)            Saralash posti (MES)          Qadoqlash (MES)           TMO
-----------------          ---------------------          ----------------          -----
upakofkada ochish    →     paddondan detal skani    →     stelyaj QR skani    →     PK qabul
pochkalash, tuzatish       → yacheyka (P03 uniki)         detal skani → o'z PK si
«Rejani tasdiqlash»        stelyaj to'ladi → olib         3D + 2D: qayerga yotadi
MES: PK-lar yaratiladi       ketiladi                     to'liq → yopish → chek
                                                          oxirgi detal olindi →
                                                          stelyaj o'zi bo'shaydi
```

---

## 3. Qoidalar

### 3.1 Reja
- **Bitta reja**: `order.pack_plan`. Upakofka uni to'g'ridan-to'g'ri yuboradi, fayl tashilmaydi.
- **Majburiy**: anketada «Upakovka qilish» belgisi bor buyurtma rejasiz ishlab chiqarishga
  O'TMAYDI.
- `.project` qayta yuklansa — reja eskiradi va qayta tasdiqlanishi kerak (qulflanmagan bo'lsa).
- **Qulf**: birinchi saralash skanidan keyin reja qulflanadi. Qulfni faqat **texnolog yoki
  admin** ochadi, **sabab yozib** (audit). Qayta reja faqat hali saralanmagan detallarga
  tegadi; boshlangan pochkalar o'zgarmaydi.
- Qayta rejadan keyin **pochkasi almashgan detal** ro'yxatda boshqa rangda, xira miltillab
  ko'rinadi — saralash va qadoqlash ekranida.

### 3.2 Pochka kodi — bitta
- Reja tasdiqlanganda MES har reja pochkasi uchun qadoqni OLDINDAN yaratadi:
  `P03` → `PK-B-2026-001-03`, holati «rejada», ichida kutilayotgan detallar ro'yxati.
- Bu kod yacheykada, chekda, TMO da, omborda va yuk xatida bir xil.
- Rejaga kirmagan detallar (upakofka filtri chiqargan: juda qalin, uzun va h.k.) uchun MES
  alohida **«rejasiz»** qadoq ochadi; raqami reja pochkalaridan keyin davom etadi.

### 3.3 Saralash (MES posti, UPAKOVKA dan oldin)
- Detal **faqat hamma oldingi bosqichlardan o'tgan** bo'lsa qabul qilinadi.
- Bir yacheyka = bir pochka. Yacheyka pochkaning birinchi detali tushganda band bo'ladi.
- **Bir stelyajda faqat bitta buyurtma.**
- Skan MES ga yoziladi: «detal qayerda?» stelyaj va yacheykani ko'rsatadi.
- TV — saralash postining ko'rish ekrani, Chrome da **monoblok qurilma** sifatida juftlanadi
  (bir marta, token yangilanishi MES niki).

### 3.4 Stelyaj va yacheykalar
- MES **admin panelida ro'yxat**: stelyaj (harf/kod), yacheykalar soni, katta yacheykalar,
  o'lchamlar, yopiq yacheykalar, QR yorlig'i chop etish.
- Qadoqchi **stelyaj QR ini skanerlaydi** → terminal shu stelyajdagi pochkalarni ko'rsatadi.
- Stelyajdagi **oxirgi detal** pochkaga skanerlanganda stelyaj **o'z-o'zidan bo'shaydi** va
  saralash bo'limida bo'sh bo'lib ko'rinadi.

### 3.5 Qadoqlash
- Detal skanerlanganda MES uning pochkasini o'zi ochadi («Qadoq yaratish» tugmasi yo'q).
- Detal **faqat o'z pochkasiga** tushadi; boshqasiga — **rad etiladi**.
- Pochka ichidagi tartib:

  | Qism | Qoida |
  |---|---|
  | Tag (0-qavat) | **qat'iy** — tag yotmaguncha boshqa detal qabul qilinmaydi |
  | O'rta qavatlar | tartib erkin, lekin har detal rejadagi joyiga — g'isht kabi, mayda detal chetda qolmaydi, hammasi bir qavatga yig'ilmaydi |
  | Qopqoq | **qat'iy** — o'rta qavatlar tugamaguncha qopqoq detali qabul qilinmaydi |
  | Quyruq | §8 — tasdiq kutilmoqda |

- Rad etilganda: **qizil miltillash + ovoz** (kromkadagi mos kelmaslik signali kabi) va
  sabab matni («bu detal PK-…-05 niki», «avval tagni qo'ying», «qopqoq — oxirida»).
- **To'liq bo'lmagan pochka yopilmaydi.**
- Yopilganda **bitta chek**: PK kodi, rejadagi brutto (katalog bo'yicha), ko'tarish darajasi
  (1/2/3+ kishi), mo'rt bo'lsa «EHTIYOT BO'LING». Upakofkaning o'z cheki MES da ishlatilmaydi.
- Qadoqchilar soni **cheklanmagan**: bir buyurtmaning bir nechta pochkasi parallel yig'iladi
  (ochiq pochka bitta qadoqchiga band). Hozirgi «buyurtmada faqat bitta ochiq qadoq» cheklovi
  olinadi.

### 3.6 Qadoqlash ekrani
Qadoqchi pochkani upakofka qog'ozida qayta terib yopadi, shuning uchun terishni ko'rishi
shart:

```
+--------------------------------------+------------------+
|                                      |   2D: joriy      |
|        3D: butun pochka              |   qavat ustdan   |
|        (ekranning 2/3 qismi)         |   (1/3 qismi)    |
|   skanerlangan detal yonib turadi    |   detal joyi     |
+--------------------------------------+------------------+
```

---

## 4. Kengaytirish
Hamma narsa soni bo'yicha cheklanmaydi: saralash postlari, TV lar, stelyajlar, qadoqlash
terminallari. Ishchilar va bo'limlar admin panelidan istalgancha qo'shiladi.

---

## 5. Sozlamalar
Me'yorlar va stelyaj sozlamasi **MES admin paneliga** ko'chadi. Upakofka MES ichida ularni
o'zgartirmaydi — faqat o'qiydi. Qaysilari texnolog bo'limiga o'tishi — keyin ko'riladi.
Upakofkaning nomlangan profillari MES ichida o'chiq.

---

## 6. Hozirgi `dev` dan nima o'zgaradi

| `dev` da | Kelishuvdan keyin |
|---|---|
| `order.pack_plan` + `upakofka_plan` | faqat `order.pack_plan` (+ qulf, versiya) |
| Qo'lda JSON yuklash tugmasi | upakofkadan to'g'ridan-to'g'ri; tugma zaxira bo'lib qoladi |
| `/upakofka/api/*` (upk-server protokoli) | saralash MES ga o'tgach kerak emas |
| Reja ko'rsatma, bloklamaydi | pochkaga tegishlilik, tag va qopqoq — qat'iy |
| Qadoq qo'lda yaratiladi, bitta ochiq | rejadan oldindan, parallel |
| Ko'k tasma «keyingi detal» | 3D (2/3) + 2D (1/3) ekran |
| `GET/PUT /upakofka/meyorlar` | qoladi; tahrir — admin panelda |

---

## 7. Vazifalar

### Upakofka tomoni (U)
- **U1. MES rejimi.** `GET /api/v1/upakofka/meyorlar` 200 bersa — MES rejimi: saralash,
  qadoqlash, TV postlari va profillar yashiriladi, sozlamalar MES dan o'qiladi (tahrir o'chiq).
- **U2. Buyurtma raqami.** `?order=<id>` bilan ochilganda raqam (`B-2026-…`) MES dan olinadi va
  `P.mesOrder` ga yoziladi.
- **U3. «Rejani tasdiqlash».** Reja `PUT /api/v1/upakofka/orders/{id}/reja` ga yuboriladi; MES
  javobi (bog'landi / topilmadi / qulflangan) ekranda ko'rsatiladi.
- **U4. Reja formati v2.** 3D uchun to'liq ma'lumot: har qadamda `x, y, z`, o'lcham, burilish,
  qavat balandligi; rejaga kirmagan detallar ro'yxati (`rejasiz`).
- **U5. 3D/2D ko'ruvchi modul.** MES terminali uchun alohida JS fayl (upakofkaning chizish
  kodidan): kirish — v2 reja pochkasi, chiqish — 3D va qavat 2D, detalni yondirish. MES uni
  `index.html` kabi o'zgarishsiz nusxalaydi.

### MES tomoni (K) — MES jamoasi
- **K1.** Reja yagona (`order.pack_plan`), versiya va qulf maydonlari bilan.
- **K2.** Reja majburiy: `packaging=true` buyurtma rejasiz ishlab chiqarishga o'tmaydi;
  `.project` qayta yuklansa reja eskiradi.
- **K3.** Rejadan qadoqlarni oldindan yaratish (`PK-{buyurtma}-{NN}` = `P{NN}`), «rejasiz» qadoq.
- **K4.** SARALASH posti — marshrut qadami (UPAKOVKA dan oldin), oldingi bosqichlar tekshiruvi,
  bir stelyaj — bir buyurtma, skan yoziladi, TV ko'rish ekrani.
- **K5.** Stelyaj va yacheykalar — admin panel ro'yxati, QR yorlig'i, oxirgi detal olinganda
  avtomatik bo'shash.
- **K6.** Qadoqlash: stelyaj QR skani, detal skani o'z pochkasini ochadi, qat'iy tegishlilik,
  tag birinchi, qopqoq oxirgi, qizil miltillash + ovoz, to'liqsiz yopilmaydi, parallel qadoqchilar.
- **K7.** Qadoqlash ekrani: 3D (2/3) + 2D (1/3), U5 modulidan.
- **K8.** Chek: PK kodi, rejadagi brutto, ko'tarish darajasi, «EHTIYOT BO'LING».
- **K9.** Qulf: birinchi saralash skanida; ochish — texnolog/admin, sabab bilan, audit; pochkasi
  almashgan detal boshqa rangda miltillaydi.
- **K10.** Sozlamalar admin panelida (me'yorlar, stelyajlar).
- **K11.** TV — monoblok qurilma juftlash orqali.

Tartib: U1–U3 va K1–K3 birinchi (reja bitta va pochka kodi bitta), keyin K4–K5 (saralash),
keyin U4–U5 va K6–K8 (qadoqlash), oxirida K9–K11.

---

## 8. Quyruq qavat — HAL QILINDI (2026-11-21)

**Quyruq nima.** Guruh oxirida 2–4 ta yengil detal qoladi — ular to'liq qavat yasay olmaydi
(85 % to'ldirish sharti). Alohida pochka ochmaslik uchun upakofka ularni tayyor pochkaga
qo'shadi:

```
████████████████   qopqoq  100 %   ← ustiga keyingi pochka tayanadi
███░░░███░░░░░░░   QUYRUQ   47 %   ← qoldiq detallar
████████████████   qavat    98 %
████████████████   TAG
```

Odatda quyruq **qopqoq ostiga** suqiladi; pochkaning qopqog'i bo'lmasa — eng ustiga.

**Qaror:** quyruq o'rta qavat hisoblanadi — tartib erkin, lekin qopqoqdan (`ust`) OLDIN.
Qopqoqsiz pochkada quyruq oxirgi. **Nostandart pochkada (bog') tartib erkin.**

Qoida bitta joyda yozilgan: `UpkKorish.tekshir()` (`src/korish/upk-korish.js`) — MES uni
o'z server tekshiruvida takrorlaydi (K6), sabab kodlari bir xil bo'lsin:
`boshqa_pochka`, `takror`, `avval_tag`, `qopqoq_oxirida`.

---

## 9. Upakofka tomoni — bajarildi (v23, 2026-11-21)

| Band | Nima qilindi | Qayerda |
|---|---|---|
| **U1** | `GET /api/v1/upakofka/meyorlar` 200 → MES rejimi: me'yorlar va stelyaj MES dan (tsex me'yori — `DEVICE_CONF`), Sozlamalar ekrani faqat ko'rish, post tanlovi / saralash ekrani / profillar / o'z chekimiz / upk-server sinxronlash yashirin | `src/js/18-mes.js` |
| **U2** | `?order=<id>` → `GET /api/v1/orders/{id}` dan raqam; MES dan kelgan loyihaga `mesOrder` va `mesOrderId` yoziladi. MES yuklovchisi loyihani me'yorlar kelishidan OLDIN berib qo'ymasligi uchun yuklash aniqlash tugaguncha kutadi | `18-mes.js` |
| **U3** | «Rejani tasdiqlash — MES ga yuborish» → `PUT /api/v1/upakofka/orders/{id}/reja`; javob (bog'landi / topilmadi / rejasiz / 422 matni) ekranda | `18-mes.js`, P/M → MES bloki |
| **U4** | Reja **versiya 2**: `plan_id`; pochkada `base_mm`, `env_mm {l,w,off}`, `height_mm`, `layers [{layer, role, z, h, n, fill, kg}]`; har qadamda `place {x, y, z, a, b, rot90}` (x/y — tagning chap-ORQA burchagidan, z — pol ustidan, a×b — iz), `fragile`; reja ildizida `rejasiz [{code, name, q, why}]`. v1 maydonlari o'zgarmagan | `src/js/10-ui.js` `mesPlan()` |
| **U5** | `dist/upk-korish.js` — mustaqil 3D (2/3) + 2D (1/3) ko'ruvchi: qo'yilgan / keyingi (sariq) / noto'g'ri (QIZIL miltillaydi) / almashgan (to'q sariq, xira miltillaydi); `tekshir()` va `keyingi()`. `dist/upk-korish-namuna.html` — MES jamoasi uchun namuna (reja faylini tanlab, skan qilib ko'rish) | `src/korish/` |

Tekshiruv: smoke (dev, dist, `-Http`) va server testi o'tdi. Lokal MES (`dev` `9b1c57f`)
da: MES ga kirish → `/upakofka/?order=1` → MES rejimi, raqam `B-2026-001` o'zi qo'yildi →
«Rejani tasdiqlash» → `4 pochka, 33/33 detal bog'landi`; MES saqlagan rejada v2 maydonlari
(`place.z`, `layers`) saqlangan (`extra="allow"`); ko'ruvchi MES originida ishladi.

### MES jamoasiga (shu ishdan chiqqan)
1. **Yangilash:** `dist/upakofka-tizimi.html` → `frontend/public/upakofka/index.html` (avvalgidek)
   **va** `dist/upk-korish.js` → `frontend/public/upakofka/upk-korish.js` (yangi, K7 uchun).
2. **Material katalogi yo'qoladi.** `UpakofkaMatCat` faqat `{nom, kgm2}` saqlaydi; bizda
   `{key, t, l, w, kgm2, dens}` — qalinlik va zichliksiz 16 mm LDSP massasi 18 mm ga ham
   qo'llanadi. Sxemaga `t`, `l`, `w`, `dens` qo'shilsin (K10). Hozircha upakofka `nom` ni kalit,
   qalinlikni «har qanday» deb oladi; ro'yxat bo'sh bo'lsa — o'z standart katalogi.
3. **Me'yorlarni upakofka yozmaydi** (`PUT /upakofka/meyorlar` dan foydalanmaydi): kelishuv
   §5 — tahrir MES admin panelida (K10). Admin panel tayyor bo'lguncha qiymatni shu endpoint
   orqali menejer/texnolog o'zgartiradi.
4. **`/upakofka/api/*` (upk-server protokoli)** MES ichida upakofka tomonidan endi
   ishlatilmaydi — saralash MES posti bo'lgach (K4) olib tashlash mumkin.
5. **`mes-yuklovchi.js` o'zgarmaydi** — fayl nomi `MES-<id>.project` shartnoma bo'lib qoldi
   (upakofka shu nom bilan kelgan loyihaga buyurtma raqamini qo'yadi).
