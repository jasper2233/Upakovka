# ME'YORLAR — TEXNIK ASOSLANISH

**Tizim:** UPAKOFKA v10 (`APP_VER = 10`, `src/js/02-state.js`) — mebel tsexi uchun detallarni pochkalash (MES)
**Hujjat mavzusi:** sozlamalar bo'limidagi 15 me'yor + algoritm ichidagi qat'iy konstantalar
**Kod manbasi:** `src/js/02-state.js` (standart qiymatlar), `src/js/13-app.js` → `readConf()` (o'qish va chegaralash), `src/js/04-packer.js` (qo'llanishi)

> **Funksiya nomlari haqida.** v10 da pochkalash yadrosi generatorga o'tkazildi, shuning uchun kodda
> `greedyPackGen()`, `packGroupGen()`, `packAllGen()` nomlari turadi (eski `greedyPack`/`packGroup`/`packAll`
> nomlari faqat `files/` papkasidagi arxiv nusxada qolgan). `packAll()` hozir — generatorni oxirigacha
> aylantiradigan sinxron o'ram; interfeys esa `packAllAsync()` orqali chaqiradi. Hujjatda hamma havola
> `src/js/04-packer.js` ning joriy holatiga mos.

---

## Bu hujjat nima uchun

Pochkalash natijasi — necha pochka chiqdi, qaysi detal qayerga tushdi, nega bu detal noodatiy bo'lib qoldi — to'liq 15 ta sonli me'yorga bog'liq. Bu sonlar interfeysdagi "Sozlamalar" bo'limida bemalol o'zgartiriladi, lekin har birining ortida geometrik hisob, ergonomika standarti yoki tsex amaliyoti turadi. Ularni "ko'proq siqilsin" degan niyat bilan o'zgartirish ko'pincha teskari natija beradi: pochka soni kamayadi, ammo yuk ko'taruvchi charchaydi, qavatlar chetdan chiqib qoladi yoki qopqoq yaxlit bo'lmay ombor tepasidagi bosimga chidamaydi.

Hujjat uch savolga javob beradi:

1. **Bu son nima uchun aynan shunday?** — asosi standartmi, geometriyami yoki amaliyotdanmi.
2. **Uni o'zgartirsam nima buziladi?** — har me'yor uchun ikki tomonlama oqibat.
3. **Kodning qaysi joyi bu sonni o'qiydi?** — tekshirish va nosozlikni topish uchun aniq fayl va funksiya.

Hujjatda ixtiro qilingan raqam yoki soxta havola yo'q. Standart raqami keltirilgan joyda u haqiqiy hujjatga tegishli; asos faqat tsex tajribasi bo'lsa, ochiq "amaliyotdan olingan qiymat" deb yozilgan.

---

## Me'yorlar jadvali (qisqacha)

| № | Me'yor | `S` kaliti | Standart | Kiritish chegarasi (`readConf`) | Ta'sir doirasi |
|---|---|---|---|---|---|
| 1 | Pochka maks. massa | `maxKg` | 35 kg | bo'sh/0 → 35 | butun algoritm |
| 2 | Chiqish (overhang) | `ovh` | 20 mm | bo'sh/0 → 0 | qavat konverti |
| 3 | Tag detal min. o'lcham | `minBase` | 190 mm | bo'sh/0 → 190 | tag tanlash |
| 4 | Maks. o'lcham | `maxLen` | 2100 mm | bo'sh/0 → 2100 | noodatiy ajratish |
| 5 | Tag/ust min. qalinlik | `minBaseT` | 0 mm | bo'sh/0 → 0 | tag tanlash |
| 6 | Qavat to'ldirish min. % | `minFill` | 85 | 10…130 | qavat yaratish |
| 7 | **Tom (qopqoq) yopilishi min. %** | `lidFill` | **90** | 10…100 | eng ustki yuza |
| 8 | Qopqoq detallari maks. | `lidN` | 3 | 1…4 | qopqoq |
| 9 | Qopqoq kichikligi maks. | `lidTol` | 100 mm | ≥ 0 | qopqoq |
| 10 | 1 kishi ko'tarish chegarasi | `oneMan` | 25 kg | bo'sh/0 → 25 | faqat chek/interfeys |
| 11 | Qalinlik bo'yicha ajratish | `byThick` | yoqilgan | belgi (checkbox) | guruhlash |
| 12 | Chiqishga ruxsat | `ovhOn` | yoqilgan | belgi (checkbox) | qavat konverti |
| 13 | Maks. qavat soni | `maxLayers` | 12 | ≥ 0 (0 = cheklovsiz) | pochka balandligi |
| 14 | Variatsiya urinishlari | `tries` | 4 | 1…40 | optimallashtirish |
| 15 | Material katalogi | `matCat` | 5 tur | jadval | massa hisobi |

**v14 da qo'shilgan me'yorlar** — tag oynasi, paddon qamrovi, qalinlik matritsasi va nostandart oqim:

| № | Nomi | `S` kaliti | Standart | Qayerda ishlaydi |
|---|---|---|---|---|
| 16 | Tag eni, maks | `baseWMax` | 1900 mm | tag tanlash + nostandart filtri |
| 17 | Tag bo'yi, min | `baseLMin` | 0 (cheklovsiz) | tag tanlash |
| 18 | Paddon qamrovi, min % | `baseCover` | 90 % | qavat qabul qilish |
| 19 | Chetdan qochish, maks | `baseInset` | 40 mm | konvert + qavat qabul qilish |
| 20 | Pochka maks. balandligi | `maxH` | 0 (cheklovsiz) | qavat qabul qilish |
| 21 | Qopqoq muvozanati, min % | `lidBal` | 80 % | qopqoq |
| 22 | Nostandart maks. massa | `oddKg` | 40 kg | nostandart oqim |
| 23 | Nostandart maks. bo'yi | `oddLMax` | 3200 mm | nostandart oqim |
| 24 | Nostandart maks. eni | `oddWMax` | 1900 mm | nostandart oqim |
| 25 | «O'lchami yaqin», maks | `oddTol` | 300 mm | nostandart bog' |
| 26 | Qalinlik matritsasi | `thickMix` | bo'sh | pochkalash kaliti |
| 27 | Qoldiq uchun zaxira | `tailKgOver` | 10 kg | quyruq singdirish |
| 28 | Detal maks. qalinligi | `maxPartT` | 60 mm | pochkalash filtri |
| 29 | Standart detal min. eni | `minPartW` | 0 (o'chiq) | oqim tanlash |
| 30 | Standart detal min. bo'yi | `minPartL` | 0 (o'chiq) | oqim tanlash |
| 31 | Quyruqda maks. bo'shliq | `tailGap` | 300 mm | quyruq qabul qilish |
| 32 | Quyruq tayanchi, min | `tailSpan` | 70 % | quyruq qabul qilish |
| 33 | Tom detali tayanchi, min | `lidSupp` | 65 % | tom qabul qilish |
| 34 | Tom ostidagi qavat, min | `lidBed` | 85 % | quyruq joylashuvi |

**21-me'yor o'zgardi:** `lidBal` endi «teng ulushdan necha %» emas, **eng kichik ulushning to'g'ridan-to'g'ri foizi** (2 detalda). Standart 80 → **40**. Formula: `minUlush(n) = lidBal − 10 × (n − 2)` → 2 detalda 40 %, 3 detalda 30 %.

**5-me'yor o'zgardi:** `minBaseT` (tag/qopqoq min. qalinlik) standarti **0 dan 16 mm ga** ko'tarildi va endi qopqoqqa ham qo'llanadi.

> **Diqqat:** 1, 3, 4-me'yorlarda `readConf()` `+value || N` shaklida o'qiydi — maydonga **0** yozilsa u standart qiymatga qaytadi, cheklov o'chmaydi. Bu ataylab: massa yoki gabarit cheklovini butunlay o'chirish xavfli. Xuddi shu shakl `oneMan`, `minFill`, `lidFill`, `lidN`, `tries` uchun ham ishlatilgan (pastdagi "Integratsiya eslatmalari", 4-band).

**v10 da qo'shilgan ikki maydon** (bu 15 talikka kirmaydi, lekin 10-me'yorga bevosita ta'sir qiladi):

| Maydon | `S` kaliti | Standart | Ma'nosi |
|---|---|---|---|
| Qadoq materiali (tara) | `tare` | 0,6 kg | Qog'oz + 4 burchak + tasma. **Pochkalash hisobiga kirmaydi** — faqat brutto va "2 KISHI" ogohlantirishiga qo'shiladi (`04-packer.js` → `packBrutto()`) |
| Chek o'lchami | `labelSize` | `a4` | Bosma chek formati (`a4` \| `100x70` \| `58x40`), algoritmga aloqasi yo'q |

---

## Me'yorlar

### 1. Pochka maks. massa — 35 kg (`S.maxKg`)

**Nima:** Bitta tayyor pochkaning yakuniy massasi. Abrabotkadan (kant, teshik, kesim) keyingi toza massa — hisob detal yuzasi × material `kg/m²` formulasi bo'yicha, `buildItems()` da chiqariladi.

**Qayerda ishlaydi:** `src/js/04-packer.js`, to'rt joyda:
- `packAllGen()` — pochkalashdan oldingi filtr: `it.kg > S.maxKg` bo'lgan detal darhol **noodatiy** ro'yxatiga tushadi va sababi `it.why` ga yoziladi;
- `greedyPackGen()` — tag detal tanlashda eligibility sharti (`it.kg <= S.maxKg`);
- `layoutPack()` — qavatlar uchun massa byudjeti: `budget = S.maxKg - base.kg`, har qavat qo'yilgach byudjet kamayadi;
- `packAllGen()` — noodatiy pochkalarni bucketlarga yig'ishda (`b.kg + it.kg > S.maxKg` → yangi bucket).

Bundan tashqari `packGroupGen()` da konsolidatsiya chegarasi (`S.maxKg * 0.62`) va `packAllGen()` da to'ldirish ko'rsatkichi (`wFill`) shu songa nisbatan hisoblanadi. Ko'rsatish: `src/js/10-ui.js` → `selectPack()`. Audit ham shu limitni tekshiradi: `src/js/05-audit.js` → `auditPacks()`, `MASSA` xato kodi.

**Nega shunday:** 35 kg — bir kishi **ko'tarib yurmaydigan**, lekin ikki kishi bemalol olib qo'yadigan, yoki bir kishi arava/rolgang bilan siljitadigan chegara. Bu ISO 11228-1 dagi 25 kg tavsiyaviy chegaradan yuqori — ataylab: pochka konveyer va aravada harakatlanadi, qo'lda ko'tarish faqat yuklash paytida bo'ladi. 25 kg dan oshgan har pochkaga chek va interfeysda "2 KISHI" ogohlantirishi chiqadi (10-me'yorga qarang). 35 dan yuqorisi 16 mm LDSP uchun taxminan 3,1 m² material degani — bu 2750×1830 listning 62% i, ya'ni bir pochkada amalda bitta shkafning yarmi.

**Oshirsa nima bo'ladi:** Pochka soni kamayadi, material sarfi (qog'oz, tasma) tushadi, ammo "2 KISHI" belgili pochkalar ulushi keskin oshadi va jarohat xavfi ortadi. 45–50 kg dan yuqorida qavatlar soni ham ortib ketib, `maxLayers` limiti ustun bo'lib qoladi — pochka og'ir, lekin past bo'lib chiqadi (13-me'yorga qarang).

**Kamaytirsa nima bo'ladi:** Pochka soni ortadi, har biri yengil va bir kishilik bo'ladi, lekin bir shkaf 3–4 pochkaga bo'linib upakofka posti ish vaqti uzayadi. 20 kg dan pastda ko'p detal (ayniqsa katta bok va dno) yolg'iz tagli, qavatsiz pochka bo'lib qoladi — `greedyPackGen()` ichidagi `tryVariant()` ball hisobida `pk.layers.length === 0` uchun +400 jarima ishlaydi, natija sifati tushadi.

**Bog'liqligi:** `oneMan` (10) — faqat ogohlantirish chegarasi, `maxKg` dan past bo'lishi mantiqiy; `maxLayers` (13) — ikkinchi mustaqil cheklov, qaysi biri oldin kelsa pochka shu yerda yopiladi; ichki `0.62` konsolidatsiya chegarasi to'g'ridan-to'g'ri `maxKg` ga ko'paytiriladi.

---

### 2. Chiqish (overhang) — 20 mm bir tomonga (`S.ovh`)

**Nima:** O'rta qavat detallari tag detal gabaritidan har tomonga chiqishi mumkin bo'lgan masofa. Jami kenglik qo'shimchasi — 2× (bir tomonga 20 → konvert 40 mm kengroq).

**Qayerda ishlaydi:** `src/js/04-packer.js` → `layoutPack()` boshida:
`off = allowOvh ? S.ovh : 0`, so'ng `envL = base.L + 2*off`, `envW = base.W + 2*off`. Bu **konvert** `makeLayer()` ga uzatiladi, ammo qavat markazlashi (`centerLayer()`) va to'ldirish foizi (`fill`) baribir **tag detal yuzasiga** nisbatan hisoblanadi. Natijada koordinata `x`/`y` manfiy bo'lishi mumkin, chegara `[-off, base.L+off]`. Chizishda: `src/js/07-render2d.js` chiqish chegarasi punktiri. Interfeysda joriy qiymat `$("lgOv")` da ko'rsatiladi.

**Nega shunday:** 20 mm — LDSP detalning bir qalinligidan (16 mm) bir oz katta va qog'ozga o'rashda burma yo'qotadigan zaxiradan kichik. Geometrik ma'nosi: chiqqan qirra tag detal ustida osilib turadi, lekin pochka yon tomondan urilganda qirra sinishga yetadigan yelka hosil qilmaydi. Amaliy asos: 20 mm chiqish bilan tor detallar (masalan 190×550 polkalar) tagning to'liq enini qoplab, `minFill` 85% shartidan o'tadi — chiqishsiz ular 78–82% da qolib qavat umuman yaratilmasdi.

**Oshirsa nima bo'ladi:** Qavat to'ldirish foizi oshadi, pochka soni kamayadi — lekin pochka gabariti kattalashadi (`p.gabL`, `p.gabW` tagdan katta chiqadi) va `greedyPackGen()` da `gO * 0.05` gabarit jarimasi ishga tushadi. 30–40 mm dan yuqorida chiqqan qirralar tashishda birinchi bo'lib shikastlanadi, qog'ozga o'rash notekis bo'ladi.

**Kamaytirsa nima bo'ladi:** Pochka qat'iy to'g'ri burchakli, tashishga eng qulay shakl bo'ladi. Lekin qavatlar kamroq to'ladi, `minFill` shartidan o'tolmay ko'p pochka faqat tag + qopqoqdan iborat bo'lib qoladi, umumiy pochka soni oshadi. 0 qo'yish `ovhOn` ni o'chirish bilan bir xil natija beradi.

**Bog'liqligi:** `ovhOn` (12) — bu qiymatni butunlay o'chiradi; `minFill` (6) — chiqish aynan shu shartdan o'tish uchun kerak; `minBase` (3) — tor tagda 40 mm chiqish nisbatan katta bo'lib qoladi (190 mm tagda chiqish enning 21% i), shuning uchun ikkalasi birga sozlanadi.

---

### 3. Tag detal min. o'lcham — 190 mm (`S.minBase`)

**Nima:** Detal tag (poydevor) bo'lishi uchun uning **qisqa tomoni** (`it.W`) shu qiymatdan kichik bo'lmasligi kerak. Uzun tomoni cheklanmaydi (u 4-me'yor bilan tekshiriladi).

**Qayerda ishlaydi:** `src/js/04-packer.js` → `greedyPackGen()` ichidagi eligibility sikli: `if (it.W >= S.minBase && it.L <= S.maxLen && it.kg <= S.maxKg && it.T >= S.minBaseT) elig.push(i);`. Agar hech bir detal shartga tushmasa, qolgan hammasi **noodatiy** ga o'tadi. Shuningdek `src/js/10-ui.js` → `renderParts()` da "tag bo'lolmaydi" tegi va `moveDetail(fromIdx, uid, toIdx)` da yangi pochka yaratish taqiqi (`if (it.W < S.minBase || it.L > S.maxLen) return "bu detal yangi pochkaga tag bo'lolmaydi (...)"`). Audit buni `TAG_OLCHAM` ogohlantirishi bilan takrorlaydi (`05-audit.js`).

**Nega shunday:** Geometrik barqarorlik. Tag eni 190 mm bo'lganda ustidagi qavatlar har tomonga 20 mm chiqsa ham umumiy taglik 230 mm bo'ladi — bu pochka balandligi 12 qavat × 16 mm ≈ 192 mm ga taxminan teng, ya'ni balandlik/eng nisbati ≈ 1:1. Nisbat 1 dan oshgani sari pochka ag'darilishga moyil bo'ladi. 190 mm shuningdek mebel amaliyotidagi eng ko'p uchraydigan tor polka (200 mm) va sokol (100 mm) o'rtasidagi tabiiy chegara: sokol tag bo'lmaydi, polka bo'ladi. Aniq son amaliyotdan olingan qiymat.

**Oshirsa nima bo'ladi:** Tag sifatida faqat katta detallar (bok, dno, tom) tanlanadi — pochkalar barqaror va chiroyli chiqadi, lekin tag bo'la oladigan detallar soni kamayib, ular tugagach qolgan hamma tor detal noodatiy pochkaga tushadi. 300 mm dan yuqorida namuna tipidagi loyihalarda noodatiy ulushi sezilarli oshadi.

**Kamaytirsa nima bo'ladi:** Deyarli har detal tag bo'la oladi, `greedyPackGen()` uchun tanlov kengayadi, noodatiy soni nolga tushadi. Lekin 120–150 mm li tagli pochkalar tik va nozik bo'ladi: ko'tarilganda egiladi, aravada ag'dariladi, ustiga hech narsa terib bo'lmaydi.

**Bog'liqligi:** `ovh` (2) — chiqish tor tagda nisbatan xavfli; `maxLayers` (13) — balandlik/eng nisbatini shu ikkovi birga belgilaydi; `minBaseT` (5) — bir xil eligibility shartida tekshiriladi.

---

### 4. Maks. o'lcham — 2100 mm (`S.maxLen`)

**Nima:** Detalning **uzun tomoni** (`it.L`) uchun yuqori chegara. Undan uzun detal oddiy pochkaga umuman kirmaydi — u alohida **noodatiy** pochkaga ajratiladi.

**Qayerda ishlaydi:** `src/js/04-packer.js`, ikki bosqichda:
- `packAllGen()` boshida, pochkalashdan oldin: `if (it.L > S.maxLen || it.kg > S.maxKg)` → `oddPre` ga tushadi, sababi `it.why = it.L + " mm > " + S.maxLen + " mm"` ko'rinishida yoziladi va interfeysda ko'rsatiladi;
- `greedyPackGen()` eligibility sharti — bu bosqichda qolgan detal tag bo'lishi uchun ham qayta tekshiriladi.

`src/js/10-ui.js` → `renderParts()` bunday detalga "noodatiy · N mm" tegini qo'yadi.

**Nega shunday:** Uch tomonlama chegara. Birinchidan, 2750×1830 LDSP listidan chiqadigan eng uzun ishlatiladigan detal amalda 2100–2400 mm oralig'ida (shkaf bogi, tik ustun). Ikkinchidan, 2100 mm — standart yuk mashinasi kuzovi eni (2350–2450 mm) ichiga ko'ndalang joylashadigan uzunlik. Uchinchidan, 2100 mm dan uzun detalni ikki kishi ham qo'l bilan ko'targanda o'rtasi egiladi va 16 mm LDSP yorilishi mumkin — bunday detallar alohida, tekis, kam qavatli pochkada tashiladi. Aniq son amaliyotdan olingan qiymat.

**Oshirsa nima bo'ladi:** Uzun detallar oddiy pochkalarga aralashadi, noodatiy soni kamayadi. Lekin pochka uzunligi ortib, upakofka stolidan chiqib ketadi, aravaga sig'maydi, ombor rafiga ko'ndalang qo'yib bo'lmaydi. 2400 mm dan yuqorida 3D ko'rinishdagi proporsiya ham buziladi.

**Kamaytirsa nima bo'ladi:** Noodatiy pochkalar soni ortadi. Noodatiy pochka — bu qavatsiz, tartibsiz stak: unda qopqoq yo'q, joylashtirish koordinatalari yo'q (`pos: null`), yig'ish ketma-ketligi shunchaki ro'yxat. 1800 mm ga tushirilganda namuna tipidagi loyihada shkaf boklari ham noodatiyga o'tib ketadi, natija amaliy foydasini yo'qotadi.

**Bog'liqligi:** `maxKg` (1) — noodatiylikning ikkinchi sababi, ikkalasi bitta filtrda; `minBase` (3) — birgalikda "tag bo'la oladigan detal" to'plamini belgilaydi; `byThick` (11) — noodatiy pochkalar ham qalinlik bo'yicha ajratiladi.

---

### 5. Tag/ust min. qalinlik — 0 mm (`S.minBaseT`)

**Nima:** Tag detal qalinligi (`it.T`) uchun quyi chegara. Standart 0 — cheklov yo'q, ya'ni 3 mm XDF ham tag bo'la oladi.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `greedyPackGen()` eligibility sharti: `it.T >= S.minBaseT`. Boshqa hech qayerda tekshirilmaydi.

**Nega shunday:** Standart 0 qo'yilgan, chunki `byThick` (11) yoqilgan holatda 3 mm XDF pochkasida **hamma** detal 3 mm bo'ladi — u yerda tag ham majburan 3 mm. Cheklov qo'yilsa bunday guruh umuman pochkalanmay qolardi. Ya'ni bu me'yor faqat `byThick` o'chirilgan (aralash qalinlik) rejim uchun mo'ljallangan zaxira himoya: aralash pochkada yupqa XDF tagda qolib, ustiga 16 mm LDSP qavatlari tushishining oldini oladi.

**Oshirsa nima bo'ladi (masalan 10 qo'yilsa):** Yupqa material hech qachon tag bo'lmaydi. `byThick` o'chirilgan aralash rejimda bu foydali. Lekin `byThick` yoqilgan holatda 3 mm XDF guruhida **birorta ham** detal eligibility dan o'tmaydi va `greedyPackGen()` `if (!elig.length){ odd = odd.concat(rem); ... }` shoxiga tushib, butun XDF guruhini noodatiy pochkalarga chiqaradi. Bu eng ko'p uchraydigan noto'g'ri sozlash.

**Kamaytirsa nima bo'ladi:** 0 dan past qiymat ma'nosiz — `readConf()` bo'sh/0 ni 0 ga tenglashtiradi.

**Bog'liqligi:** `byThick` (11) — bevosita: `byThick` yoqilgan bo'lsa bu me'yorni 0 da qoldirish kerak. Interfeysdagi yorliq "Tag/**ust** min. qalinlik" deydi, lekin kodda `makeLid()` qalinlikni tekshirmaydi — amalda faqat tagga ta'sir qiladi (pastdagi "Integratsiya eslatmalari" ga qarang).

---

### 6. Qavat to'ldirish min. % — 85 (`S.minFill`)

**Nima:** Har bir o'rta qavat tag detal yuzasining kamida shuncha foizini qoplashi shart. Qoplamasa qavat butunlay bekor qilinadi va pochka shu yerda yopiladi.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `layoutPack()` ning asosiy qavat siklida:
`if (L.fill < S.minFill/100){ L.items.forEach(function(q){ q.it.used=false; }); break; }`
`L.fill` `makeLayer()` da `cov / area` sifatida hisoblanadi, bu yerda `area = baseL * baseW` — ya'ni **tag detal yuzasi**, konvert emas. Shu sababli chiqish yoqilgan bo'lsa `fill` 100% dan oshishi mumkin; `packAllGen()` statistikada uni `Math.min(1.3, L.fill)` bilan cheklaydi, `readConf()` esa kiritishga 130 gacha ruxsat beradi.

**Nega shunday:** Bo'shliq — pochkaning eng katta dushmani. 15% bo'sh joyda ustidagi qavat egiladi, tashishda detallar siljib bir-biriga uriladi, qirralar shikastlanadi. 85% — amaliyotdan olingan qiymat: undan yuqori talab qavat yaratilishini juda qiyinlashtiradi (`makeLayer()` javon/strip usuli bilan), pastroq talab esa ko'zga ko'rinadigan bo'shliq qoldiradi. namuna sinov loyihasida amalda o'rtacha 97–99% ga erishilgan, ya'ni 85 chegarasi kamdan-kam ishga tushadi — u faqat oxirgi, yarim bo'sh qavatni kesib tashlaydi.

**Oshirsa nima bo'ladi:** Qavatlar zichroq, pochka mustahkamroq. Lekin 95% dan yuqorida ko'p pochka faqat tag + 1 qavatdan iborat bo'lib qoladi, qolgan detallar keyingi pochkalarga ketadi — umumiy pochka soni oshadi va o'rtacha massa `maxKg` dan ancha past tushadi.

**Kamaytirsa nima bo'ladi:** Pochkalar to'liqroq, soni kamroq. Lekin 60–70% da qavat ichida katta bo'shliqlar paydo bo'ladi; 3D ko'rinishda bu darhol seziladi, amalda esa pochka "yumshoq" bo'lib qoladi va ustiga boshqa pochka terib bo'lmaydi.

**Bog'liqligi:** `ovh` (2) — chiqish `fill` ni oshiradi, shuning uchun ikkalasi birga ishlaydi; `lidFill` (7) — qopqoq uchun alohida, pastroq chegara; `maxLayers` (13) — ikkalasi qavat siklini to'xtatadigan ikki mustaqil sabab.

**Istisno — QUYRUQ qavat (v13).** `minFill` ning mazmuni bitta jumlada: *ustidagi qavat egilmasin*. Guruhning oxirgi 2–4 detali bu shartdan o'tolmay o'ziga alohida yarim bo'sh pochka ochib yuborardi (namunada har modulning 3 mm orqa devorlari 12 kg + 3 kg bo'lib ikkiga bo'linardi). Shuning uchun `absorbTails()` (`04-packer.js` → 3.6.7.1) bunday qoldiqni tayyor pochkaning **eng ustiga** qo'shadi va o'sha bitta qavatga `minFill` qo'llanmaydi — quyruqning ustida hech narsa yo'q, demak egiladigan narsa ham yo'q. Quyruq qopqoqning ustiga tushadi, ya'ni tekis yuzada yotadi; qog'oz va ikki tasma uni joyida ushlab turadi. Massa, qavat va konvert chegaralari esa o'zgarishsiz amal qiladi.

Auditda quyruq qavati `TOLDIRISH` ogohlantirishini bermaydi (`05-audit.js` → `!L.tail`) — bu qoidaning o'zi, xatoni yashirish emas. Tashqi belgisi ko'rinib turadi: 2D rejada qavat sarlavhasi *«quyruq (eng ust)»*, qadam matnida esa *«quyruq — hammasining ustiga»* deb yoziladi.

---

### 7. Tom (qopqoq) yopilishi min. % — 90 (`S.lidFill`)

> **v15 da o'zgardi:** standart 80 dan **90** ga ko'tarildi va endi u faqat
> «qopqoq» ga emas, pochkaning **eng ustki qavatiga** — kim bo'lishidan qat'i
> nazar — qo'llanadi.
>
> **Nega:** yetkazib berishda pochkalar bir-birining ustiga teriladi. Pastdagi
> pochkaning tomi ustidagining butun og'irligini ko'taradi; tom ochiq qolsa
> og'irlik bir necha kichik detalga to'planadi va ular ezilib sinadi.
>
> **Qayerda ishlaydi:** `04-packer.js` → `tomOK()` (yuza + gabarit + qalinlik)
> va `lidOK()` (yana detal soni + muvozanat). Terish balida yopiq tom eng og'ir
> vaznni oladi (`tomGood ? 0 : 90`), butun buyurtma balida esa `noTom`
> hisoblanadi. Audit yopilmagan tomni `TOM` ogohlantirishi bilan ko'rsatadi.
>
> **v13 quyruq istisnosi bekor qilindi.** Quyruq qavati ilgari bu talabdan ozod
> edi («ustida hech narsa yo'q») — asos noto'g'ri edi, ustida keyingi pochka
> turadi. Endi quyruq **qopqoq ostiga** suqiladi va tomga umuman tegmaydi.

#### Eski ta'rif (80 %, faqat qopqoq uchun)

**Nima:** Pochkaning eng ustki qavati (qopqoq) tag yuzasining kamida shuncha foizini yopishi kerak. Yopmasa u "haqiqiy qopqoq" hisoblanmaydi.

**Qayerda ishlaydi:** `src/js/04-packer.js`, ikki joyda:
- `makeLid()` — nomzod qavatni qabul qilish sharti: `L.fill >= S.lidFill/100` (gabarit sharti bilan birga);
- `layoutPack()` — `strat === 1` yo'lida qopqoq oldindan zaxiraga olinmagan bo'lsa, eng tepadagi qavat qopqoq deb belgilanadi va `last.soft = !wholeness(last) && (last.fill < S.lidFill/100 || ...chegaradan chiqish...)` orqali "yumshoq qopqoq" deb baholanadi.

`greedyPackGen()` ichidagi `tryVariant()` da bu baho ballga aylanadi: yaxlit qopqoq — 0 jarima, oddiy qopqoq — +16, yumshoq — +30, qopqoqsiz — +90.

**Nega shunday:** `minFill` (85) dan pastroq qo'yilgan — ataylab. Qopqoq pochkaning ustki himoya qatlami: uning vazifasi ostidagi detallarni chang, ishqalanish va ombor tepasidagi bosimdan saqlash. Har doim ham 85% ni yopadigan detal qolmaydi, lekin 80% yopgan qopqoq ham qopqoqsizdan ancha yaxshi. 5 punktlik yon berish amaliyotdan olingan qiymat.

**Oshirsa nima bo'ladi:** Qopqoqsiz pochkalar soni ortadi (`packAllGen()` da `noLid * 140` jarimasi orqali umumiy ball yomonlashadi). `lidFill` ni `minFill` dan yuqori qo'yish mantiqsiz — qopqoq har doim o'rta qavatdan qattiqroq shartga tushadi va deyarli hech qachon topilmaydi.

**Kamaytirsa nima bo'ladi:** Deyarli har qavat qopqoq bo'la oladi. Lekin 50–60% yopgan "qopqoq" ostidagi detallarni himoya qilmaydi, faqat statistikani chiroyli qiladi.

**Bog'liqligi:** `minFill` (6) — undan past bo'lishi kerak; `lidN` (8) va `lidTol` (9) — uchalasi birga `makeLid()` ning qabul shartini tashkil qiladi.

---

### 8. Qopqoq detallari maks. — 3 (`S.lidN`)

**Nima:** Qopqoq nechta detaldan tashkil topishi mumkin. Algoritm avval **1 ta yaxlit** detal bilan urinadi, topolmasa 2, keyin 3.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `makeLid()` ning tashqi sikli: `for (var n = 1; n <= S.lidN; n++)`. Har `n` uchun to'rtta saralash tartibi (`ORD`) sinaladi va eng zichi olinadi; birinchi muvaffaqiyatli `n` da sikl to'xtaydi — ya'ni **eng kam detalli variant g'olib**. `n === 1` bo'lganda qavatga `L.whole = true` belgisi qo'yiladi. `readConf()` kiritishni 1…4 oralig'ida cheklaydi.

**Nega shunday:** Yaxlit bitta detalli qopqoq — ideal: choksiz, tekis, ustiga chek yopishtirish qulay, qog'ozga o'rashda burma bermaydi. Lekin har pochkada tagga o'lchamdosh yaxlit detal topilavermaydi. 2 detal — hali ham qabul qilsa bo'ladigan variant (bitta chok). 3 — amaliy chegara: undan ko'p bo'lsa ustki yuza mozaikaga aylanadi, chekni qayerga yopishtirishni bilib bo'lmaydi va choklar orqali chang o'tadi. Aniq son amaliyotdan olingan qiymat.

**Oshirsa nima bo'ladi (4):** Qopqoqli pochkalar ulushi biroz oshadi. Lekin ustki yuza chok bilan to'ladi va `makeLid()` hisoblash vaqti ortadi (har `n` uchun 4 ta `makeLayer()` chaqiriladi — `n = 4` da jami 16 ta urinish, har `layoutPack()` chaqiruvida).

**Kamaytirsa nima bo'ladi (1):** Faqat yaxlit qopqoq qabul qilinadi. Sifat maksimal, lekin `strat === 0` yo'lida qopqoq topilmagan pochkalar ko'payadi — ular `strat === 1` yo'liga tushib, eng tepadagi qavat "yumshoq qopqoq" bo'lib qoladi.

**Bog'liqligi:** `lidFill` (7) va `lidTol` (9) — bitta qabul shartida; `maxLayers` (13) — qopqoq ham qavat sifatida sanaladi.

---

### 9. Qopqoq kichikligi maks. — 100 mm (`S.lidTol`)

**Nima:** Qopqoq tag detal gabaritidan har o'lcham bo'yicha shuncha millimetrgacha kichik bo'lishi mumkin. Undan kichik bo'lsa qopqoq deb qabul qilinmaydi.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `makeLid()` da qabul sharti:
`var ok = (base.L - L.bb.L) <= S.lidTol && (base.W - L.bb.W) <= S.lidTol && L.fill >= S.lidFill/100;`
`L.bb` — `bboxOf()` qaytargan qavat gabariti. Diqqat: `makeLid()` `makeLayer()` ni `off = 0` bilan chaqiradi, ya'ni **qopqoq hech qachon tagdan chiqmaydi** — bu me'yor faqat "kichik bo'lish" tomonini boshqaradi.

**Nega shunday:** `lidFill` (yuza foizi) va `lidTol` (chiziqli o'lcham) bir-birini to'ldiradi. Yuza bo'yicha 80% ni yopgan qopqoq shakli noto'g'ri bo'lishi mumkin: masalan tag 1800×500 bo'lsa, 1440×500 detal 80% ni yopadi, lekin uzunligi bo'yicha 360 mm kalta — pochkaning bir uchi ochiq qoladi. `lidTol` aynan shu holatni to'sadi. 100 mm — tag chekkasida qolgan ochiq qism ko'zga tashlanmaydigan va qog'oz o'rash bilan yopiladigan maksimal masofa. Amaliyotdan olingan qiymat.

**Oshirsa nima bo'ladi:** Qopqoq topish osonlashadi, qopqoqsiz pochkalar kamayadi. Lekin 200–300 mm da qopqoq tagning bir chetida qolib, ikkinchi chetdagi detallar ochiq turadi — bu vizual jihatdan ham, himoya jihatidan ham yomon.

**Kamaytirsa nima bo'ladi (0):** Qopqoq tag bilan aynan bir xil gabaritda bo'lishi shart. Sifat maksimal, lekin bunday detal juda kam topiladi — natijada `layoutPack()` `strat === 1` yo'liga o'tib, "yumshoq qopqoq"lar ulushi oshadi.

**Bog'liqligi:** `lidFill` (7) — yuza va chiziqli o'lcham juftligi; `lidN` (8) — ko'p detalli qopqoqda `bb` osonroq to'ladi, shuning uchun `lidTol` ni qattiqlashtirsangiz `lidN` ni oshirish yordam berishi mumkin.

---

### 10. 1 kishi ko'tarish chegarasi — 25 kg (`S.oneMan`)

**Nima:** Pochka massasi shu qiymatdan oshsa interfeysda va bosma chekda "2 KISHI" ogohlantirishi chiqadi. **Pochkalash algoritmiga umuman ta'sir qilmaydi.**

**Qayerda ishlaydi:** Faqat ko'rsatish qatlamida:
- `src/js/10-ui.js` → `renderPacks()` — pochka ro'yxatidagi kartochkada `packBrutto(p) > S.oneMan` bo'lsa "2 KISHI" yorlig'i;
- `src/js/10-ui.js` → `renderStep()` — pochka tugagach "⚠ N kg — 2 kishi ko'taradi" xabari (bu yerda **sof** `p.kg` solishtiriladi, tarasiz);
- `src/js/08-labels.js` → `packLabelHTML()` — bosma pochka chekida `var two = brutto > S.oneMan;` va "⚠ N KG — 2 KISHI KO'TARADI" satri.

> **Diqqat (v10):** `renderPacks()` va chek **brutto** (`packBrutto(p) = p.kg + S.tare`, standart tara 0,6 kg) bilan solishtiradi, `renderStep()` esa hali sof massa bilan. Ya'ni 24,5 kg li pochka ro'yxatda va chekda "2 KISHI" bo'lib chiqishi, ish oynasidagi qadam xabarida esa chiqmasligi mumkin. Bu farqni bilib turing; tarani 0 qilsangiz uchala joy ham bir xil ishlaydi.

`src/js/04-packer.js` da `S.oneMan` o'zgaruvchisi bir marta ham o'qilmaydi — u yerda faqat `packBrutto()` yordamchisi turadi.

**Nega shunday:** Bu yagona me'yor bo'lib, uning ortida to'g'ridan-to'g'ri xalqaro standart turadi:

- **ISO 11228-1** (*Ergonomics — Manual handling — Part 1: Lifting, lowering and carrying*) qo'lda ko'tarish uchun tavsiyaviy massa (reference mass) sifatida **25 kg** ni beradi — ishlovchi erkaklar populyatsiyasi uchun. Standart boshqa populyatsiyalar (ayollar, yosh yoki keksa ishchilar) uchun pastroq qiymatlarni ko'rsatadi va massani ko'tarish chastotasi, balandligi, tananing burilishi bo'yicha kamaytirishni talab qiladi. Interfeysdagi izohda "erkak 20–45 yosh" deb aniqlashtirilgan.
- **NIOSH Revised Lifting Equation** (AQSh, NIOSH) ideal sharoit uchun yuk konstantasi (Load Constant, LC) sifatida **23 kg** ni oladi va real sharoitni oltita koeffitsient (masofa, balandlik, burilish, chastota, ushlash sifati, vertikal siljish) bilan pasaytiradi.

Tizim ikkovining yuqorisini (25 kg) ogohlantirish chegarasi qilib olgan, chunki pochka qulay ushlanadigan tekis shakl va qisqa masofaga ko'tariladi.

**Oshirsa nima bo'ladi:** Ogohlantirish kamroq chiqadi, upakofka posti tezroq ishlaydi — lekin standart tavsiyasidan chetlashiladi va ishchi zo'riqadi. 35 kg (ya'ni `maxKg` ga teng) qo'yilsa ogohlantirish umuman chiqmaydi.

**Kamaytirsa nima bo'ladi:** Deyarli har pochkada "2 KISHI" chiqadi. Agar ogohlantirish har doim chiqsa, u ma'nosini yo'qotadi — operator e'tibor bermay qo'yadi. Ayollar smenasi uchun ISO 11228-1 pastroq qiymat tavsiya qiladi; bunday holda `maxKg` ni ham birga tushirish to'g'riroq bo'ladi.

**Bog'liqligi:** `maxKg` (1) — mantiqan `oneMan < maxKg` bo'lishi kerak, aks holda me'yor ishlamaydi. `S.tare` (v10) — brutto orqali bilvosita: tarani oshirsangiz ogohlantirish chegarasi amalda pasaygandek bo'ladi. Boshqa me'yorlarga hech qanday ta'siri yo'q.

> `readConf()` da `S.oneMan = Math.max(0, +$("cOneMan").value || 25)` — maydonga **0** yozib ogohlantirishni o'chirib bo'lmaydi, u 25 ga qaytadi. O'chirish uchun `maxKg` ga teng (35) qo'ying.

---

### 11. Qalinlik bo'yicha ajratish — yoqilgan (`S.byThick`)

**Nima:** Yoqilgan bo'lsa turli qalinlikdagi detallar hech qachon bitta pochkaga tushmaydi: 16 mm alohida, 3 mm alohida.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `packAllGen()`, ikki joyda:
- Oddiy detallarni guruhlashda kalitning bir qismi sifatida:
  `var k = (rule.prod ? it.prodCode : "*") + "/" + (rule.mat ? it.matId : "*") + "/" + (S.byThick ? it.T : "*") + "/" + (...klass...);`
  Har guruh mustaqil `packGroupGen()` ga beriladi.
- Noodatiy detallarni bucketlarga yig'ishda: `var k = (S.byThick ? String(it.T) : "*") + "/" + (...klass...);`

**Nega shunday:** Bu tizimning **eng birinchi qoidasi** va u geometriyadan kelib chiqadi. Bir qavatda 16 mm va 3 mm detal yonma-yon tursa, ustidagi qavat 13 mm bo'shliq ustida osilib qoladi: yoki egiladi, yoki 3 mm XDF ni bosib sindiradi. Qavat balandligi `makeLayer()` da `h = max(it.T)` sifatida hisoblanadi — ya'ni model qavatni **bir tekis qalinlikda** deb qabul qiladi. Aralash qalinlikda bu model to'g'ri bo'lmay qoladi, 3D ko'rinish ham, real pochka ham noto'g'ri chiqadi. Amaliy jihatdan: yupqa XDF orqa devorlari odatda alohida, tekis dasta qilib beriladi — bu tsex amaliyoti ham.

**O'chirsa nima bo'ladi:** Pochka soni kamayadi (guruhlar birlashadi), lekin yuqoridagi hamma muammo paydo bo'ladi. O'chirishning yagona mantiqiy sababi — juda kichik buyurtmada 3 mm detallar 2–3 dona bo'lib, ular uchun alohida pochka ochish isrof bo'lgan holat. Bunday paytda `minBaseT` (5) ni 10 ga qo'yib, yupqa material tagga tushmasligini ta'minlash shart.

**Yoqilganda:** Standart va tavsiya etiladigan holat. namuna sinov loyihasida 3 material, 2 xil qalinlik — hech qanday aralashish yo'q. Audit ham shu holatni tekshiradi: `05-audit.js` → `auditPacks()` da `byThick` yoqilgan bo'lsa qavat detali tag detal bilan bir xil qalinlikda emasligi `QALINLIK` xatosini beradi.

**Bog'liqligi:** `minBaseT` (5) — o'chirilganda majburiy juftlik; `S.sepCls` (klass ajratish) va `S.rules` (B2C/B2B) — bir xil guruhlash kalitida ishlaydi; `tries` (14) — guruhlar ko'paygani sari har urinish qimmatroq bo'ladi.

---

### 12. Chiqishga ruxsat — yoqilgan (`S.ovhOn`)

**Nima:** 2-me'yordagi chiqish qiymatini global yoqadi yoki o'chiradi. O'chirilsa `off = 0` bo'lib, qavatlar qat'iy tag gabariti ichida teriladi.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `greedyPackGen()` ichidagi `tryVariant()`: `layoutPack(base, others, S.ovhOn, o, st, rndj)`. `layoutPack()` uni `allowOvh` parametri sifatida qabul qilib, `off = allowOvh ? S.ovh : 0` deb hisoblaydi va natijada `pack.allowOvh` maydoniga saqlaydi.

**Har pochka uchun alohida ham boshqariladi:** `src/js/10-ui.js` → `selectPack()` da "chiqishga ruxsat" katagi chiziladi, `togglePackOvh()` shu pochkani qayta teradi. Ya'ni global sozlama — standart holat, pochka darajasidagi belgi — istisno.

**Nega shunday:** Chiqish foydali, lekin har doim emas. Ba'zi mijozlar (ayniqsa B2B jo'natmalarda) qat'iy to'g'ri burchakli pochka talab qiladi — ular pochkalarni pallet ustiga zich terib, stretch-plyonka bilan o'raydi. Bunday holatda chiqqan qirra butun palletni buzadi. Shuning uchun ikki darajali boshqaruv: umumiy siyosat sozlamalarda, alohida holat upakofka postida.

**O'chirsa nima bo'ladi:** Pochkalar qat'iy to'g'ri burchakli, pallet va stretch uchun ideal. Lekin `minFill` 85% shartidan o'tish qiyinlashadi, qavat soni va pochka soni oshadi. namuna loyihasida chiqish o'chirilganda pochka soni sezilarli ortadi.

**Yoqilganda:** Standart holat. Chiqish miqdorini 2-me'yor belgilaydi.

**Bog'liqligi:** `ovh` (2) — bevosita; `minFill` (6) — o'chirilganda uni ham pasaytirish kerak bo'lishi mumkin; pochka darajasidagi `p.allowOvh` — global sozlamani bekor qiladi.

---

### 13. Maks. qavat soni — 12 (`S.maxLayers`)

**Nima:** Pochkadagi qavatlar sonining yuqori chegarasi: **tag (1) + o'rta qavatlar + qopqoq (1) ≤ `maxLayers`**. 0 = cheklovsiz.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `layoutPack()`:
```
var midCap = S.maxLayers > 0
  ? Math.max(0, S.maxLayers - 1 - (lid ? 1 : (strat === 0 ? 0 : 1)))
  : 1e9;
for (var g = 0; g < 40 && layers.length < midCap; g++){ ... }
```
Ya'ni `maxLayers` dan tag uchun 1 ta va qopqoq uchun (agar u zaxiraga olingan yoki kutilayotgan bo'lsa) yana 1 ta ayriladi. Ko'rsatish: `src/js/10-ui.js` → `selectPack()` da "N / 12 qavat".

**Nega shunday:** Bu `maxKg` ga mustaqil, **ikkinchi** cheklov: qaysi biri oldin kelsa, pochka shu yerda yopiladi. Ikkinchi cheklov kerak, chunki yengil material (3 mm XDF, 2,70 kg/m²) da massa limiti juda kech keladi — 35 kg XDF bu ~13 m², ya'ni ikki listdan ko'p, va pochka o'nlab qavatga chiqib ketardi.

12 raqamining geometrik asosi: 16 mm × 12 = **192 mm**. Bu pochka balandligi:
- odam qo'li bilan yon tomondan qulay ushlaydigan balandlik;
- eng tor ruxsat etilgan tag (190 mm) bilan taxminan 1:1 nisbat beradi — ag'darilishga barqaror;
- upakofka stoli va aravaga sig'adigan o'lcham;
- qog'ozga o'rashda bitta rulon eni bilan qoplanadigan qalinlik.

3 mm material uchun 12 qavat atigi 36 mm — bu yerda amalda `maxKg` emas, aynan qavat limiti ishlaydi va yupqa detallar ortiqcha ko'p qatlamga chiqmaydi.

**Oshirsa nima bo'ladi:** Pochkalar balandroq va to'liqroq, soni kamroq. Lekin 16 mm materialda 20 qavat = 320 mm — bunday pochka ushlashga noqulay, ag'dariladi, `maxKg` limiti odatda undan oldin keladi (35 kg da 16 mm LDSP uchun taxminan 3,1 m²). 0 (cheklovsiz) qo'yilsa yupqa material pochkalari ko'zga ko'rinarli darajada baland chiqadi.

**Kamaytirsa nima bo'ladi:** Pochka past, tekis va tashishga qulay bo'ladi. Lekin pochka soni keskin oshadi va o'rtacha massa `maxKg` dan ancha past tushadi — 4 qavatda 16 mm LDSP pochkasi kamdan-kam 20 kg dan oshadi. 2–3 qavat esa qopqoqni ham imkonsiz qiladi (tag + qopqoq allaqachon 2 ta).

**Bog'liqligi:** `maxKg` (1) — parallel cheklov; `minFill` (6) — qavat siklini to'xtatadigan ikkinchi sabab; `minBase` (3) — balandlik/eng nisbatini birga belgilaydi; `lidN` (8) — qopqoq ham qavat sifatida sanaladi; ichki `g < 40` sikli — mutlaq yuqori chegara.

---

### 14. Variatsiya urinishlari — 4 (`S.tries`)

**Nima:** Butun buyurtma boshidan oxirigacha necha marta qaytadan pochkalanadi. Har urinish boshqa tasodifiy urug' (seed) bilan boshlanadi, eng yaxshi natija saqlanadi.

**Qayerda ishlaydi:** `src/js/04-packer.js` → `packAllGen()` ning tashqi sikli:
```
var TRIES = Math.max(1, S.tries);
PACKPROG.tries = TRIES; PACKPROG.groups = gks.length; PACKPROG.packs = 0;
for (var t = 0; t < TRIES; t++){
  var rnd = mulberry(1234 + t*7919), all = [], odd = oddPre.slice();
  ...
  var score = all.length*1000 + odd.length*300 + noLid*140 - wFill*260 - lFill*120;
  if (!best || score < best.score) best = { score:score, packs:all, odd:odd };
}
```
`PACKPROG` — jarayon ko'rsatkichi holati; `13-app.js` → `progUpdate()` uni "urinish t/TRIES · guruh g/groups" ko'rinishida chizadi.
Urug' `1234 + t*7919` — qat'iy formula, tasodifiy emas. `mulberry()` — o'z yozilgan deterministik PRNG. Shu sababli **bir xil loyiha + bir xil sozlama har doim bir xil natija beradi** (item `uid` lari ham deterministik). `readConf()` kiritishni 1…40 oralig'ida cheklaydi.

Ball formulasidagi vaznlar: har ortiqcha pochka +1000, har noodatiy detal +300, har qopqoqsiz pochka +140, o'rtacha massa to'ldirish −260, o'rtacha qavat to'ldirish −120. Ya'ni ustuvorlik: **pochka soni > noodatiy soni > qopqoq mavjudligi > zichlik**.

**Nega shunday:** 4 — hisoblash vaqti va natija sifati o'rtasidagi muvozanat. Har urinish ichida allaqachon juda ko'p variant sinaladi: har pochkaga 100 ta (`packTries`), har variantda 4 ta saralash tartibi va 2 ta strategiya. Ya'ni 4 ta tashqi urinish — bu yuz minglab joylashtirish varianti. Tajribada 4 dan keyin natija sezilarli yaxshilanmaydi, chunki farq faqat konsolidatsiya bosqichida yuzaga keladi. Amaliyotdan olingan qiymat.

**Oshirsa nima bo'ladi:** Natija bir oz yaxshilanishi mumkin (odatda 1–2 pochkaga), lekin hisoblash vaqti chiziqli ortadi. v10 da interfeys **muzlamaydi** — `packAllAsync()` har 40 ms da brauzerga boshqaruvni qaytaradi, jarayon ko'rsatkichi va "Bekor qilish" tugmasi ishlaydi; lekin natijani kutish vaqti baribir uzayadi. `readConf()` 40 da qattiq to'xtatadi.

**Kamaytirsa nima bo'ladi (1):** Hisoblash eng tez. Natija baribir yomon emas, chunki ichki variantlar soni katta. Sozlamani jonli sozlab ko'rayotganda (har o'zgarishda `recompute()` ishga tushadi) 1–2 qo'yish qulay, yakuniy hisobda 4 ga qaytarish kerak.

**Bog'liqligi:** Ichki `packTries` (100) — ko'paytiruvchi omil; `byThick` (11) va klass ajratish — guruhlar sonini oshirib har urinishni qimmatlashtiradi; boshqa me'yorlarga sifat jihatidan ta'siri yo'q, faqat vaqt.

---

### 15. Material katalogi — 5 tur (`S.matCat`)

**Nima:** Material turlari jadvali: kalit so'z, qalinlik, list o'lchami, `kg/m²`. Yangi loyiha yuklanganda material nomiga qarab avtomatik qo'llanadi va **hamma massa hisobining asosi** bo'ladi.

Standart katalog:

| Kalit | Qalinlik, mm | List, mm | kg/m² | Bir list, kg | Zichlik, kg/m³ |
|---|---|---|---|---|---|
| LDSP | 16 | 2750 × 1830 | 11,20 | 56,4 | ≈ 700 |
| LMDF | 16 | 2750 × 1830 | 12,32 | 62,0 | ≈ 770 |
| MDF | 16 | 2750 × 1830 | 12,32 | 62,0 | ≈ 770 |
| XDF | 3 | 2800 × 2070 | 2,70 | 15,6 | ≈ 900 |
| HDF | 3 | 2800 × 2070 | 2,70 | 15,6 | ≈ 900 |

**Qayerda ishlaydi:**
- `src/js/03-parser.js` → `catLookup(name, t)` — material nomida kalit so'z qidiriladi (registr sezgir emas) va qalinlik ±0,51 mm aniqlikda solishtiriladi. Bir nechta mos kelsa **eng uzun kalit g'olib** (shuning uchun "LMDF" nomli material "MDF" emas, "LMDF" ga tushadi). `c.t` bo'sh bo'lsa qalinlik tekshirilmaydi;
- `src/js/03-parser.js` → `parseProject()` — katalogdan topilsa `kgm2` shundan olinadi, topilmasa zaxira `DENS` jadvalidan (`t/1000 × zichlik`) hisoblanadi;
- `src/js/03-parser.js` → `buildItems()` — `kg = (L × W / 10⁶) × kgm2`;
- `src/js/10-ui.js` → `renderCat()` (tahrirlash) va `applyCat()` (joriy loyihaga qayta qo'llash, `boot()` da chaqiriladi).

Interfeysda "list kilosi" va "kg/m²" ikki tomonlama bog'langan: birini o'zgartirsangiz ikkinchisi list yuzasiga bo'lib qayta hisoblanadi.

**Nega shunday:** Massa — bu tizimning yagona fizik o'lchov birligi. `maxKg`, `oneMan`, noodatiy ajratish, konsolidatsiya, ball hisobi — hammasi undan chiqadi. Zichliklar sanoat qiymatlariga mos: LDSP ≈ 700 kg/m³ (yog'och-qipiq plita), MDF/LMDF ≈ 770 kg/m³ (o'rta zichlikdagi tolali plita, LDSP dan og'irroq), XDF/HDF ≈ 900 kg/m³ (yuqori zichlikdagi tolali plita — eng zich, lekin 3 mm bo'lgani uchun eng yengil). List o'lchamlari — mintaqada eng ko'p ishlatiladigan formatlar: 16 mm uchun 2750×1830, 3 mm orqa devor materiali uchun 2800×2070.

`DENS` zaxira jadvali (`src/js/03-parser.js` boshida) katalogdan topilmagan materiallar uchun: 3 mm → 900, 16/18 mm → 700, 22/25 mm → 680 kg/m³ va hokazo.

**Oshirsa (noto'g'ri, haqiqiydan katta `kg/m²`) nima bo'ladi:** Hamma detal og'irroq hisoblanadi. Pochkalar `maxKg` ga tezroq to'ladi — soni ortadi, har biri kam qavatli. Chekdagi massa ham noto'g'ri bo'lib, logistika hisobi buziladi.

**Kamaytirsa (haqiqiydan kichik) nima bo'ladi:** Bu **xavfli** yo'nalish. Pochkalar hisobda yengil ko'rinadi, lekin amalda 35 kg dan og'ir chiqadi. "2 KISHI" ogohlantirishi kerak bo'lgan joyda chiqmaydi. Yangi material qo'shganda `kg/m²` ni albatta real list tortish natijasidan kiritish kerak — "list kilosi" maydoni aynan shuning uchun qo'yilgan.

**Bog'liqligi:** `maxKg` (1) va `oneMan` (10) — bevosita, chunki ular kilogrammda ishlaydi; `maxLen` (4) — noodatiylikning ikkinchi sababi ham massa; `byThick` (11) — qalinlik katalogdan emas, `.project` faylining o'zidan olinadi (`03-parser.js`, `typeId="sheet"` guruhining `t` atributi, `num()` bilan kasr ham o'qiladi); katalogdagi `t` faqat qaysi katalog satri mos kelishini aniqlashga xizmat qiladi (`Math.abs(c.t - t) < 0.51`). Katalogda qalinlik noto'g'ri yozilsa mos kelish topilmaydi va `kg/m²` zaxira `DENS` jadvalidan olinadi.

---

### 16–17. Tag oynasi — `baseWMax`, `baseLMin` (+ `minBase`, `maxLen`)

**Nima:** To'rt chegara birgalikda **tag oynasini** beradi: qaysi detal pochkaga paddon (tag) bo'la oladi.

```
minBase  ≤  detal eni   ≤  baseWMax
baseLMin ≤  detal bo'yi ≤  maxLen
detal qalinligi ≥ minBaseT
```

**Qayerda ishlaydi:** `04-packer.js` → `greedyPackGen()` ning eligibility sikli va `packAllGen()` ning nostandart filtri; `10-ui.js` → `moveDetail()` da «yangi pochka» taqiqi.

**Nega oyna faqat TAGGA tegishli:** Oynadan chiqqan detal pochkadan chiqarilmaydi — u shunchaki tag bo'lolmaydi va qavatga tushadi. 450×300 mm li polka tag bo'lolmaydi, lekin 1753×600 tag ustida bemalol yotadi. Agar oyna hamma detalga qo'llansa, mayda polkalar nostandartga oqib ketardi va pochka soni keskin oshardi.

**Yuqori chegaradan chiqsa nima bo'ladi:** Detal **nostandart oqimga** o'tadi (25-me'yor bo'limiga qarang) — chunki u hech qanday tagga sig'maydi: barcha taglar `maxLen`×`baseWMax` dan kichik, chiqish esa 40 mm dan oshmaydi.

**Zaxira yo'li:** Guruhda `minBaseT` ga yetadigan birorta detal bo'lmasa (butun guruh 3 mm orqa devor), qalinlik talabi shu guruhning eng qalin detaliga tushiriladi. Aks holda butun guruh nostandartga o'tib ketardi — bu qoidaning maqsadi emas. Buning o'rniga qat'iy qoida qo'llanadi: **yupqa tag ustiga qalin detal qo'yilmaydi** (`thickOKon()`), ya'ni 3 mm paddonli pochka faqat 3 mm detallardan iborat bo'lib qoladi.

---

### 18–19. Paddon qamrovi — `baseCover` 90 %, `baseInset` 40 mm

**Nima:** Tag detal pochkaning deyarli butun tagini egallashi shart. Ikki shart **birga** tekshiriladi:

| Shart | Formula |
|---|---|
| Yuza | `tag_yuzasi / gabarit_yuzasi ≥ baseCover/100` |
| Qochish | `(gabarit − tag) / 2 ≤ baseInset` — har ikki o'q bo'yicha |

**Qayerda ishlaydi:** `04-packer.js` → `layoutPack()` ichidagi `coverOK()`; har qavat qabul qilinishidan oldin. Chiqish konverti ham shundan kelib chiqadi: `off = min(ovh, baseInset)`. Quyruq qavati uchun `tailCoverOK()` xuddi shu tekshiruvni takrorlaydi.

**Nega ikkalasi:** Foiz umumiy qamrovni ushlaydi, mm esa bitta yomon tomonni. Uzun pochkada 5 % yuza ham 60 mm bo'lishi mumkin — qirra o'sha yerda osilib qoladi va birinchi bo'lib sinadi. Tor pochkada esa aksincha: 20 mm chiqish yuzaning 12 % ini yeydi.

**Oshirsa nima bo'ladi:** 100 % da chiqish umuman qolmaydi — pochka qat'iy to'g'ri burchakli bo'ladi, lekin qavatlar `minFill` dan o'tolmay pochka soni oshadi. Namuna buyurtmada 90 % → 100 % o'tish **52 → 59 pochka** beradi.

**Kamaytirsa nima bo'ladi:** Tor tagli pochkalarda chiqish qaytadi, zichlik oshadi. Namunada 90 % → 80 % o'tish **52 → 50 pochka** beradi, lekin tor paddonli pochkalar ustiga boshqa pochka terib bo'lmaydi.

**Namuna buyurtmadagi jadval:**

| `baseCover` | Pochka | O'rtacha | To'ldirish | Bog' |
|---|---|---|---|---|
| 80 % | 50 | 26,4 kg | 92 % | 2 |
| 85 % | 50 | 26,4 kg | 92 % | 2 |
| **90 %** | **52** | **25,4 kg** | **93 %** | **7** |
| 95 % | 52 | 25,4 kg | 90 % | 5 |
| 100 % | 59 | 22,4 kg | 89 % | 6 |

---

### 20. Pochka maks. balandligi — `maxH` (0 = cheklovsiz)

**Nima:** Pochkaning mm dagi to'liq balandligi: `tag + qavatlar`.

**Qayerda ishlaydi:** `04-packer.js` → `layoutPack()` ichidagi `heightOK()` va `tailFit()`.

**Nega kerak:** `maxLayers` (13-me'yor) qavat SONINI cheklaydi, balandlikni emas. Qalinlik matritsasi yoqilgach bitta pochkada 16 mm va 3 mm qavatlar aralashadi — 12 ta qavat 36 mm ham, 192 mm ham bo'lishi mumkin. Stelyaj yacheykasi yoki yuk mashinasining polkasi esa mm bilan o'lchanadi. Shuning uchun ikkinchi, mustaqil chegara.

**Standart 0:** Cheklov o'chiq — eski xatti-harakat saqlanadi. Sexda yacheyka balandligi ma'lum bo'lsa shu son kiritiladi.

---

### 21. Qopqoq muvozanati — `lidBal` 80 %

**Nima:** Ko'p detalli qopqoqda **eng kichik detal teng ulushning kamida `lidBal` % ini** qoplashi kerak.

```
n = 2  →  teng ulush 50 %,  80 % dan  →  ≥ 40 %
n = 3  →  teng ulush 33 %,  80 % dan  →  ≥ 27 %
```

**Qayerda ishlaydi:** `04-packer.js` → `lidBalOK()`, `makeLid()` da qabul shartiga kiradi.

**Nega shunday:** Buyurtmachi talabi aynan shu shaklda berilgan: *«qopqoq 2 yoki 3 detaldan bo'lsa, ular 60×40 yoki 50×50 bo'lishi kerak»* — ya'ni bo'laklar deyarli teng. 88/12 kabi bo'linishda mayda tasma chetda qoladi: qog'oz o'ralganda o'sha yerda burma hosil bo'ladi, tasma tortilganda tasma detalni sindiradi, ustiga boshqa pochka terilsa esa yuk bir nuqtaga tushadi.

**Muhim:** Bu qoida faqat `makeLid()` yasagan **haqiqiy qopqoqqa** tegishli. Agar qopqoq topilmasa, eng ustki qavat shunchaki qopqoq deb belgilanadi va `L.impl = true` bayrog'ini oladi — unga qopqoq qoidalari qo'llanmagan va buni tashxisdan ko'rish mumkin.

---

### 22–25. Nostandart oqim — `oddKg`, `oddLMax`, `oddWMax`, `oddTol`

**Nima:** Tag oynasining yuqori chegarasidan chiqqan yoki `maxKg` dan og'ir detallar. Ilgari ular bitta ro'yxatga tashlanardi va massa bo'yicha bo'linardi — geometriyasi ham, tartibi ham yo'q edi.

**Qayerda ishlaydi:** `04-packer.js` → 3.6.8.5 bo'limi (`oddPackGen`, `oddBundles`, `oddLimitsOn/Off`).

**Ikki yo'l, tizim o'zi tanlaydi:**

| Yo'l | Qachon | Nima bo'ladi |
|---|---|---|
| **To'liq pochka** | detal eni ≥ `minBase` va nostandart gabaritga sig'adi | oddiy pochkadagi butun mantiq: tag → qavatlar → qopqoq, faqat massa va bo'yi chegarasi kattaroq. Konsolidatsiya va quyruq ham ishlaydi |
| **Bog'** | detal TOR (eni < `minBase`), ya'ni tag bo'lolmaydi | o'lchami yaqinlari bilan ustma-ust bog'lanadi: 2 ta 2400×180 — tabiiy bog' |

**`oddKg` = 40 kg:** Nostandart pochka standartdan og'irroq bo'lishi mumkin. Sabab: uzun bok yoki tom bitta o'zi 30 kg bo'lishi mumkin va uni 35 kg limitiga siqish bitta detallik pochkalar ko'payishiga olib keladi. 40 kg — ikki kishi ko'taradigan chegara (`oneMan` = 25 dan yuqori, ISO 11228-1 bo'yicha ikki kishilik ish). Audit va qo'lda tahrirlash bu pochkalarni aynan shu limit bilan o'lchaydi (`packKgCap()`), aks holda to'g'ri terilgan pochka «limitdan og'ir» bo'lib qizarardi.

**`oddTol` = 300 mm:** «O'lchami yaqin» chegarasi. Bog'ga qo'shiladigan detalning bo'yi ham, eni ham bog'ning birinchi detalidan shuncha mm dan ko'p farq qilmasligi kerak. Kattalashtirsa bog' kamayadi, lekin bog' ichida turli o'lchamlar aralashadi va u fizik jihatdan bog' bo'lmay qoladi.

**Namuna buyurtmada:** `oddTol` 300 → 2000 o'tish **52 → 50 pochka** beradi (7 bog' → 4 bog').

---

### 26. Qalinlik matritsasi — `thickMix`

**Nima:** Qaysi qalinlikdagi detallar **asosiy pochkaga** qo'shilishi. Asosiy qalinlik — buyurtmada detali eng ko'p bo'lgani, u avtomatik aniqlanadi (`mainThick()`), sozlama emas.

**Qayerda ishlaydi:** `04-packer.js` → `thickKey()`, u `packKey()` ning qalinlik o'qini almashtiradi. `MAIN_T` `packAllGen()` da bir marta hisoblanadi va butun terish davomida o'zgarmaydi — determinizm shunga tayanadi.

**Nima bo'ladi:** Belgilangan qalinlik asosiy qalinlikning pochkalash kalitini oladi, ya'ni **o'sha pochkaga** tushadi. Lekin qavat darajasida ular baribir ajratilgan:

- bitta qavatda ikki xil qalinlik **hech qachon** aralashmaydi (`makeLayer(..., tOnly)`);
- tag va qopqoq baribir `minBaseT` dan yupqa bo'lolmaydi;
- yupqa tag ustiga qalin detal qo'yilmaydi (`thickOKon()`).

Ya'ni «qo'shish» degani: **bitta pochkada, alohida qavatlarda**. 3 mm orqa devorlar 16 mm pochkasining o'z qavatida yotadi, tagi va qopqog'i esa 16 mm bo'lib qoladi.

**Nega qavat aralashmaydi:** Aralash qalinlikdagi qavat notekis bo'ladi — 16 mm detal yonidagi 3 mm detal ustidagi qavatni 13 mm ga qiyshaytiradi, pochka burchagi ko'tariladi va tasma bo'shab qoladi.

**Auditda:** `QALINLIK` xatosi endi qavat ICHINI tekshiradi («2-qavatda ikki xil qalinlik: 16 mm va 3 mm»), tag bilan solishtirmaydi.

---

### 27. Qoldiq uchun massa zaxirasi — 10 kg (`S.tailKgOver`)

**Nima:** Guruh oxirida qoladigan yengil pochkani boshqasiga singdirishda massa limitidan shuncha kg oshishga ruxsat.

**Qayerda ishlaydi:** `04-packer.js` → `packKgAbs()` (singdirish shifti), `absorbTails()` nomzod filtri va `tailFit()` byudjeti. Zaxiradan foydalangan pochka `overKg` belgisini oladi; `packKgCap()` shundan keyin uning chegarasini kengaytiradi va audit, chek hamda qo'lda tahrirlash aynan shu bilan o'lchaydi.

**Uch funksiya nega alohida:**

| Funksiya | Nima qaytaradi | Kim ishlatadi |
|---|---|---|
| `packKgBase(p)` | zaxirasiz asosiy chegara (35, nostandartda 40) | `overKg` belgisini qo'yish, singdirishning 1-bosqichi |
| `packKgCap(p)` | joriy chegara (zaxira bilan, agar ochilgan bo'lsa) | audit, chek, `moveDetail` |
| `packKgAbs(p)` | mutlaq shift = `max(base, maxKg + zaxira)` = 45 kg | singdirishning 2-bosqichi |

**v19: zaxira — oxirgi chora.** `absorbTails()` nomzodni ikki bosqichda tanlaydi:

| Bosqich | Chegara | Tanlov mezoni |
|---|---|---|
| 0 | `packKgCap` — zaxirasiz | eng zich joylashuv |
| 1 | `packKgAbs` — zaxira bilan | **avval eng kam oshgani**, keyin zichlik |

1-bosqich faqat 0-bosqichda hech qanday nishon topilmagandagina ishga tushadi.

Ilgari filtr darhol `packKgAbs` ni ruxsat berardi va eng zich joylashuv g'olib bo'lardi. Natijada qoldiq 20 kg li pochkaga (35 ichida qolar edi) emas, 33 kg li pochkaga tushib uni 41 kg ga ko'tarardi. Namunada **45 pochkadan 11 tasi (24 %)** limitdan og'ir chiqardi; tuzatilgandan keyin **47 dan 4 tasi (8,5 %)**, eng og'iri 45,1 → 38,5 kg.

**Zaxira nostandart limit ustiga qo'shilmaydi.** Ilgari nostandart pochka 40 + 10 = 50 kg gacha ko'tarilardi — bu ikki kishi uchun ham og'ir va buyurtmachi bunday narsani so'ramagan edi. Mutlaq shift bitta: 35 + 10 = 45 kg.

`packKgCap` ni singdirishda ishlatish **xato**: ikkinchi singdirishda zaxira ikki marta qo'shilib ketadi (44,9 kg o'rniga 54,9 kg) va audit `MASSA` xatosi beradi. Shu sabab uchinchi funksiya bor.

**Nega 10 kg:** Qoldiq detal odatda 2–8 kg. 10 kg zaxira bitta qoldiqni to'liq qamrab oladi va shu bilan bir vaqtda 35 → 45 kg oralig'ida qoladi — bu ISO 11228-1 bo'yicha **ikki kishilik** ish, ya'ni chekda `«2 KISHI»` yozuvi allaqachon chiqib turadi (`oneMan` = 25 kg).

**Oshirsa nima bo'ladi:** Pochka soni yana kamayadi, lekin og'irlik oshadi. Namunada 10 → 15 kg o'tish 44 → 43 pochka beradi, eng og'iri esa 48,5 kg ga chiqadi — bu ikki kishi uchun ham og'ir.

**Kamaytirsa nima bo'ladi:** 0 da singdirish faqat limit ichida ishlaydi — namunada 44 o'rniga 52 pochka chiqadi va yarim bo'sh pochkalar qaytadi.

**Bog'liqligi:** `maxKg` (1) — zaxira uning ustiga qo'shiladi; `oneMan` (10) — «2 KISHI» chegarasi; `oddKg` (22) — nostandart pochkada asos boshqa, zaxira ular ustiga ham qo'shiladi.

---

### 28. Detal maks. qalinligi — 60 mm (`S.maxPartT`)

**Nima:** Shundan qalin detal umuman pochkalanmaydi.

**Qayerda ishlaydi:** `03-parser.js` → `partSkipWhy()`, `buildItems()` boshida. Chiqarib tashlangan obyektlar `DIAG.skipped` ga yoziladi va Diagnostikada ro'yxat bo'lib chiqadi.

**Nega kerak:** Haqiqiy proyekt fayllarida mebel detallari bilan bir qatorda xona obyektlari ham keladi — devor, pol, shift. Ular ham `part` bo'lib yoziladi va o'z materialiga ega (`Devor`, 350 mm, 245 kg/m²). Tizim ularni soddadillik bilan pochkalab **2 396 kg li «pochka»** yasab qo'yardi.

**Chegara qanday tanlandi:** 205 ta haqiqiy faylda (`tests\corpus.ps1`) 30 mm dan qalin barcha materiallar sanab chiqildi:

| Guruh | Materiallar | Qalinlik | kg/m² |
|---|---|---|---|
| Haqiqiy mahsulot | `Stolishnitsa` (10+ faylda), `MATO`, qalin LMDF/LDSP | 32 … 50 mm | 22 … 35 |
| Xona obyekti | `Devor` (3 xil), `Pol` | 100 … 350 mm | 70 … 245 |

50 va 100 mm orasida **hech narsa yo'q**, shuning uchun 60 mm xavfsiz chegara: stolishnitsa (40) ham, yumshoq mebel qoplamasi (50) ham o'tadi.

**Nega o'lcham bo'yicha emas:** «Listga sig'maydigan detal soxta» qoidasi sinaldi va rad etildi. Faylda ko'pincha **qoldiq list** o'lchami yoziladi (`960×1830`, `1600×1830`), haqiqiy 2428 mm li bok esa to'g'ri detal. Bu qoida haqiqiy detallarni chiqarib tashlagan bo'lardi — korpusda 17 faylda 35 ta shunday holat topildi va hammasi haqiqiy detal chiqdi.

**Oshirsa nima bo'ladi:** 100 dan yuqorida `Devor` 100 mm va `Pol` 100 mm o'tib ketadi va buyurtma massasiga 6,5 tonna qo'shiladi.

**Kamaytirsa nima bo'ladi:** 50 dan pastda `MATO` (yumshoq mebel qoplamasi) chiqarib tashlanadi — u haqiqiy mahsulot, mijozga yetkazilishi kerak. 40 dan pastda stolishnitsa ham yo'qoladi.

---

### 29–30. Standart detal min. o'lchami — 0 (`S.minPartW`, `S.minPartL`)

**Nima:** Detal shu chegaradan kichik bo'lsa, u standart oqimga umuman kirmaydi — nostandart oqimga o'tadi.

**Qayerda ishlaydi:** `04-packer.js` → `packAllGen()` ning nostandart filtri, `maxLen`/`baseWMax`/`maxKg` bilan bir qatorda. Chegaradan chiqqan detal `it.nst = true` belgisini oladi.

**`minBase` dan farqi — bu ikki xil qoida:**

| Chegara | Nima qiladi |
|---|---|
| `minBase` (190) | detal **tag bo'lolmaydi**, lekin standart pochkaning qavatiga tushaveradi |
| `minPartW` (0) | detal **butunlay boshqa oqimga** o'tadi va faqat o'ziga o'xshaganlar bilan bog'lanadi |

**Nega standart 0:** Yoqilgan holda mayda polkalar standart pochkalardan chiqib ketadi va pochka soni oshadi. Sexda mayda detallarni alohida yig'ish qulay bo'lgandagina yoqiladi. Namunada `minPartW = 200` qo'yilsa 113 ta detal nostandart oqimga o'tadi.

---

### OQIM AJRATILISHI (me'yor emas, invariant)

Nostandart oqimga ikki xil detal keladi va ular aralashmasligi shart:

| `it.nst` | Nima | Qayerga borishi mumkin |
|---|---|---|
| `true` | haqiqiy nostandart — o'lcham yoki massa chegarasidan chiqqan | faqat nostandart bilan |
| `false` | standart guruhning qoldig'i — tag bo'lolmagan tor detal | o'z guruhidagi standart pochkaga singdirilishi mumkin |

**Qayerda:** `oddPackGen()` guruhlash kalitiga `NS/` yoki `ST/` prefiksini qo'shadi; `absorbTails(out, true)` yakuniy bosqichida `!p.nst === !w.nst` sharti tekshiriladi.

**Nega:** v16 da bu chegara yo'q edi — yakuniy singdirish ikkala oqimni aralashtirib yuborardi va uzun-tor detallar bog'iga oddiy polka tushib qolardi. Ajratishning narxi 205 fayllik korpusda **3898 → 3999 pochka (+2,6 %)**, audit toza qoladi.

**Diqqat:** prefiks FAQAT guruhlash uchun ishlatiladi; pochkaga toza `packKey()` yoziladi. Aks holda yakuniy singdirish kalitni standart pochkaniki bilan solishtira olmaydi va standart qoldiq o'z pochkasini topolmay qoladi.

---

### 31. Quyruqda maks. bo'shliq — 300 mm (`S.tailGap`)

**Nima:** Quyruq qavati detallari orasida (va tag chetigacha) qolgan eng katta **tayanchsiz oraliq**. Ustidagi qavat aynan shu oraliq ustidan o'tadi.

**Qayerda ishlaydi:** `04-packer.js` → `layerGap()` va `tailFit()` ning qabul sharti.

**Nega foiz emas, millimetr.** Quyruq `minFill` (85 %) dan ozod — bu ataylab, u qoldiqni sig'dirish uchun. Lekin to'ldirish foizi **support** haqida hech narsa aytmaydi. Namunada o'lchangan ikki holat, ikkalasi ham ~44 %:

| Quyruq tarkibi | Bo'shliq | Qopqoqqa ta'siri |
|---|---|---|
| 4 ta tor detal (1327×100, 559×100×2, 1327×100) chuqurlik bo'ylab tarqalgan | 50–90 mm | tayanadi ✓ |
| 2 ta keng detal (1752×389, 1339×389) bir joyda | **681 mm** | egiladi ⚠ |

Foiz ikkalasini ajratmaydi, oraliq ajratadi.

**Nega 300 mm:** 16 mm LDSP taxtasi ustiga 40 kg li pochka qo'yilganda xavfsiz oraliq. Bu **hisoblangan emas, tanlangan** qiymat — sexda sinab aniqlanadi.

**Namunadagi ta'siri:**

| `tailGap` | Pochka | O'rtacha | Quyruq | Eng katta bo'shliq |
|---|---|---|---|---|
| o'chiq | 47 | 28,1 kg | 16 | **681 mm** |
| 500 | 48 | 27,5 kg | 15 | 456 mm |
| **300** | **50** | **26,4 kg** | **14** | **274 mm** |
| 200 | 53 | 24,9 kg | 10 | 174 mm |

**Bog'liqligi:** `minFill` (6) — quyruq undan ozod, shu chegara uning o'rnini bosadi; `tailKgOver` (27) — ikkovi birga quyruqning qancha ishlashini belgilaydi.

---

### 34. Tom ostidagi qavat («to'shak»), min % — 85 (`S.lidBed`)

**Nima:** Tom ostidagi qavat o'z yuzasining kamida shuncha foizini qoplashi
shart. Buzilishi — **XATO** (`TOM_TAGI`), ogohlantirish emas.

**Qayerda:** `04-packer.js` → `bedMin()`, `bedOK()`, `tailInsertAt()`;
`05-audit.js` → `TOM_TAGI`.

**Nima uchun.** Tomning yuzasi, nisbatlari va gabariti to'g'ri bo'lishi mumkin —
va tom detallari baribir **dumalab ketadi**, agar ostidagi qavat siyrak bo'lsa.
Sexda ko'rilgani: tom uch tasmadan (1897×100 + 1790×100 + 1897×100), ostidagi
qavat faqat o'rtani egallaydi; chetdagi ikkita tasma qirraga tayanib qoladi va
tasma tortilgunga qadar joyidan qo'zg'aladi.

**`lidSupp` dan farqi.** `lidSupp` har bir tom detalining **tegish yuzasini**
o'lchaydi (kontakt), `lidBed` esa to'shakning **o'zi to'laligini** talab qiladi.
Ikkinchisi qat'iyroq va boshqa narsani kafolatlaydi: detal nafaqat tegadi,
balki **qo'zg'almaydi**.

**Amalda cheklov quyruqqa tegishli.** Oddiy qavatlar `minFill` dan o'tadi,
quyruq esa undan ozod. `tailInsertAt()` endi quyruqni qayerga qo'yishni hal
qiladi:

| Holat | `ins` | Natija |
|---|---|---|
| pochkada qavat yo'q | 0 | quyruq o'zi qavat bo'ladi |
| quyruq zich (`bedOK`) | `len-1` | eskicha — tom ostiga |
| quyruq siyrak, `len ≥ 2` va ostki qavat zich | `len-2` | **bir qavat pastga** — tom eski zich qavat ustida qoladi |
| aks holda | −1 | singdirilmaydi |

Uchinchi holatda zich plita siyrak quyruq ustida ko'prik bo'lib turadi — uning
osilib qolishini `tailGap` (300 mm) cheklaydi.

**Nega chegara `minFill` bilan qisiladi.** Oddiy qavat aynan `minFill` bilan
qabul qilinadi. Undan ko'pini talab qilish bajarilmas shart bo'lardi: pochka
teriladi, audit esa uni xato deb belgilardi va hech qachon toza chiqmasdi.
`bedMin() = min(lidBed, minFill)`.

**Nega XATO, ogohlantirish emas.** Sexning talabi: bunday terish qabul
qilinmaydi — pochka omborgacha butun yetib bormaydi. Packer buni kafolatlaydi
(namuna korpusida 0 buzilish), shuning uchun xato darajasi xavfsiz: audit
faqat haqiqiy regressiyada yoki qo'lda ko'chirishdan keyin qizaradi.

**O'lchov (namuna, 291 detal):**

| `lidBed` | Pochka | O'rtacha | Eng yomon to'shak | Buzilgan |
|---|---|---|---|---|
| 0 (o'chiq) | 55 | 24,0 kg | 75 % | 3 / 33 |
| **85** | **56** | **23,6 kg** | **85 %** | **0 / 33** |

UMUMIY guruhda: buzilgan 4 → 0, eng yomon to'shak 73 % → 86 %, 47 → 49 pochka.

**Test:** `smoke.ps1` → «TOM OSTIDAGI QAVAT (TO'SHAK)». Xato yo'lini sinash
uchun chegarani ko'tarib bo'lmaydi (u `minFill` bilan qisiladi), shuning uchun
buzilish to'g'ridan-to'g'ri yasaladi: bitta pochkaning to'shak qavati siyrak
deb belgilanadi va audit `TOM_TAGI` berishi tekshiriladi.

---

### 33. Tom detali tayanchi, min % — 65 (`S.lidSupp`)

**Nima:** **Har bir** tom detali o'z yuzasining kamida shuncha foizi bilan
ostidagi qavatga tegishi shart. Ostida qavat bo'lmasa — tag detalga.

**Qayerda:** `04-packer.js` → `partSupport()`, `layerSupp()`, `stackSuppOK()`,
`tailStackOK()`. Uch joyda qo'llanadi:

1. `layoutPack()` — `last.tom` shartiga kiradi (ball orqali, qat'iy rad etish emas)
2. `absorbTails()` — quyruq nomzodi **qat'iy rad etiladi** agar u tomni tayanchsiz qoldirsa
3. `auditPacks()` — `TOM` / `TOM_TAYANCH` ogohlantirishi

**Nima uchun kerak.** Tomning yuzasi, nisbatlari va gabariti to'g'ri bo'lishi
mumkin — va u baribir sinadi, agar ostidagi qavatga tegmasa. Sexda ko'rilgani:
tom uch detaldan, yuzasi 98 %, nisbatlar 30/30/30 — hammasi qoida bo'yicha.
Lekin ostidagi qavat tor: o'rtadagi detal tegadi, chetdagi ikkitasi undan
butunlay chiqib osilib qolgan (tegish yuzasi 30 % ham emas).

**Nega `tailSpan` yetarli emas.** U butun qavatning **umumiy kengligini**
o'lchaydi. 70 % qoplagan quyruq ham tomning chetdagi detalini 0 % tayanchda
qoldirishi mumkin — agar o'sha detal quyruq bandidan tashqarida tursa.

**Nega eng yomoni olinadi, o'rtacha emas.** Uchta detalning o'rtachasi 70 %
bo'lishi mumkin, lekin chetdagi bittasi 0 % bo'lsa u baribir sinadi. O'rtacha
aynan shu nosozlikni yashiradi.

**Geometriya.** Bir qavat ichidagi detallar bir-birining ustiga tushmaydi
(audit `USTMA_UST` invarianti), shuning uchun kesishmalar yig'indisi =
birlashma bilan kesishma. Qo'shimcha geometriya kerak emas.

**Quyruq suqilganda butun taxlam tekshiriladi** (`tailStackOK`). Yangi tartib
`[eski qavatlar] + Ls + [tom]` bo'lgani uchun uchta bog'lanish bor: `Ls[0]`
ostidagiga, `Ls[i]` → `Ls[i-1]`, va tom → `Ls[oxirgi]`.

> Ilgari `absorbTails` izohida «ustki qavat quyruq ustida osilib qoladi, lekin
> ko'pi bilan bir qavat pastga egiladi» deb yozilgandi. Asos noto'g'ri edi:
> tomning chetdagi detali quyruqdan **butunlay** chiqib, havoda osilib qolishi
> mumkin ekan.

**Sozlash (namuna, 291 detal):**

| `lidSupp` | Pochka | O'rtacha | Eng yomon tom tayanchi |
|---|---|---|---|
| 0 (o'chiq) | 54 | 24,5 kg | 56 % |
| **65** | **55** | **24,0 kg** | **75 %** |
| 80 | 56 | 23,6 kg | 80 % |

**Kafolat chegarasi.** 65 % da namuna korpusida bajarilmagan holat yo'q.
Yuqoriroq qiymatda (85 %) ba'zi guruhda hech qanday joylashuv shartni bajara
olmaydi — u holda pochka baribir teriladi, lekin audit ogohlantirishi chiqadi.
Test aynan shuni qo'riqlaydi: «bajarilmagan tayanch jim qolmaydi».

---

### 32. Quyruq tayanchi, min % — 70 (`S.tailSpan`)

**Nima:** Singdirilgan qoldiq qavati pochkani **har o'q bo'yicha** kamida shuncha
foiz qoplashi shart. Ikki o'q alohida o'lchanadi, kichigi olinadi.

**Qayerda:** `04-packer.js` → `layerSpan()`, `tailFit()` ichida `tailGap` bilan
yonma-yon.

**Nima uchun `tailGap` yetarli emas.** Ular boshqa-boshqa nosozlikni ushlaydi:

- `tailGap` — detallar orasidagi eng katta **tayanchsiz oraliq**. Ikkita keng
  detal bir chetga yig'ilib o'rtada teshik qoldirsa, shu o'lchov ushlaydi.
- `tailSpan` — **tayanchning kengligi**. Bitta tor detal markazga qo'yilsa
  teshik umuman yo'q (chetlardagi bo'shliqlar kichik), lekin ustidagi qopqoq
  tor qirraga tayanadi va chayqaladi.

**O'lchangan holat (sexdan).** 1910×300 li pochka, quyruq 1720×160, markazda:

| O'lchov | Qiymat | Chegara | Natija |
|---|---|---|---|
| bo'shliq X | 102 mm | 300 mm | o'tadi |
| bo'shliq Y | 70 mm | 300 mm | o'tadi |
| **tayanch Y** | **53 %** | 70 % | **rad etiladi** |

Namuna korpusida chegarasiz eng yomoni **17 %**: 1878×600 li pochkaga uchta
438×100 li tasma.

**Nega chetdan chiqqan qism sanalmaydi:** tagdan tashqarida tayanch yo'q, u yerda
detal havoda turadi. Proyeksiya `[0, base.L]` va `[0, base.W]` ga qisiladi.

**Nega oddiy qavatlarga kerak emas:** `fill ≥ minFill` bo'lsa qoplanish har
ikkala o'q bo'yicha ham kamida `minFill` bo'ladi — yuza ulushi ikki o'q
qoplanishining ko'paytmasidan katta bo'lolmaydi (`fill ≤ sx·sy ≤ min(sx,sy)`).
Faqat quyruq foizdan ozod.

**Sozlash (namuna, 291 detal):**

| `tailSpan` | Pochka | O'rtacha | Eng tor tayanch |
|---|---|---|---|
| 0 (o'chiq) | 50 | 26,4 kg | 18 % |
| 60 | 52 | 25,4 kg | 61 % |
| **70** | **54** | **24,5 kg** | **71 %** |
| 80 | 55 | 24,0 kg | 81 % |
| 90 | 56 | 23,6 kg | 90 % |

70 % tanlandi: 16 mm LDSP qopqoq eni bo'yicha 2/3 dan ko'p tayanchda yotsa
ustiga 40 kg qo'yilganda chayqalmaydi. Bu **hisoblangan emas, tanlangan** qiymat —
sexda sinab o'zgartiriladi.

**Test:** `smoke.ps1` → «QUYRUQ TAYANCHINING KENGLIGI». O'lchovning o'zi ham
sun'iy qavatlarda tekshiriladi: kichik o'q bo'yicha olinishi (X=100 %, Y=50 % →
50 %), chetdan chiqqan qism sanalmasligi, ustma-ust bo'laklar ikki marta
sanalmasligi.

---

### 20-me'yorga tuzatish: BALANDLIK BOG'GA HAM QO'LLANADI (v20)

**Xato.** `maxH` chegarasi `layoutPack()` da to'g'ri ishlardi (`heightOK()`), quyruq
singdirishda ham tekshirilardi (`tailFit`), lekin **`oddBundles()` da umuman yo'q
edi**. Bog' — nostandart detallarning ustma-ust taxlami, ya'ni balandligi
qalinliklar yig'indisi. U yerda faqat to'rt shart bor edi: massa (`oddKg`),
o'lcham yaqinligi (`oddTol`), gabarit (`oddLMax`/`oddWMax`) va qalinlik birligi.

**Oqibati.** Real buyurtmada (korpusdagi real buyurtma, 172 detal) `maxH = 160` mm bo'lsa ham
bitta bog' 12 ta 16 mm li detaldan iborat bo'lib **192 mm** chiqardi. Sexda bu
shunday ko'rinadi: «massa yetib balandlik yetmasa ham pochka qadoqlanadi».

**Nima uchun hech kim ko'rmadi.** Auditda balandlik invarianti yo'q edi. `QAVAT`
xatosi qavat **sonini** tekshiradi, bog'da esa `layers` bo'sh — demak `1 qavat`
deb hisoblanardi va limitdan o'tib ketardi. Chegara bor edi, qo'riqchisi yo'q edi.

**Tuzatish (uch joyda):**

1. `oddBundles()` — `b.h` yuritiladi va `b.h + it.T <= maxH` sharti qo'shildi.
   Massa bilan balandlik endi teng huquqli: qaysi biri avval to'lsa bog' yopiladi.
2. `layoutPack()` — qopqoq qavat siklidan oldin yasaladi; endi `heightOK(0)`
   bilan tekshiriladi va tag + qopqoq chegaradan chiqsa qopqoqdan voz kechiladi.
3. `auditPacks()` — yangi `BALANDLIK` xatosi **ikkala** tur uchun:
   oddiy pochkada `base.T + Σ L.h`, bog'da `Σ it.T`.
   Bitta detalning o'zi chegaradan qalin bo'lsa — `BALANDLIK_NOODATIY`
   ogohlantirishi (bo'lib bo'lmaydi, xato emas).

**Natija** (korpusdagi real buyurtma, `maxH = 160`): eng baland 192 → **160 mm**,
chegaradan oshgan 1 → **0**, pochka 68 → 69 (+1).

**Test:** `smoke.ps1` → «BALANDLIK CHEGARASI IKKALA TURGA HAM» — bog' ham
chegarada; audit buzilishni ko'radi; massa va balandlik mustaqil ishlaydi
(biri o'chirilganda ikkinchisi baribir cheklaydi).

---

### CHEK VA HUJJAT (me'yor emas, ish tartibi)

**Uch xil bosma:**

| Nima | Qachon | O'lcham | Manbasi |
|---|---|---|---|
| detal cheki | qo'lda | tanlangan | `labelHTML()` |
| pochka cheki | pochka tugaganda, **avtomatik** | 80×60 mm | `packLabelHTML()` + `packListHTML()` |
| buyurtma hujjati | butun buyurtma yig'ilgach | A4 | `orderDocHTML()` |

**Chek o'lchami qo'lda.** `S.labelSize` qiymatlari: `a4 | 100x70 | 80x60 | 58x40 |
custom`. `custom` da `S.labelW` × `S.labelH` (mm, 20…300). `labelMM()` uchala
holatni bitta joyda hal qiladi, `applyPageSize()` esa `@page` va CSS sinfini
qo'yadi: `sz-a4` yoki `sz-lbl` (+ `tiny`, agar bo'yi < 62 mm).

> Ilgari har o'lcham uchun alohida CSS selektori bor edi (`sz-100x70`,
> `sz-58x40`) — qo'lda o'lcham qo'shilishi bilan ular yaroqsiz bo'lib qolardi.

**Pochka chekidagi detallar ro'yxati** (`packListHTML`). 80×60 da 12 tadan,
boshqa chekda 20 tadan ko'pi sig'maydi; A4 da chegara yo'q. Kesilgan bo'lsa
oxirida «+N ta» turadi — ro'yxat to'liq emasligi **yozib qo'yiladi**.

**Avtomatik chek** (`S.autoLbl`, standart yoqilgan). `advance()` da chek
`STEP >= seq.length` sharti bo'yicha emas, **o'tish** bo'yicha chiqadi
(`was < seq.length && STEP >= seq.length`) — aks holda tayyor pochkada har
Enter bosilganda chek qayta chiqib ketardi.

Brauzer jimgina bosib chiqara olmaydi: `window.print()` chop oynasini ochadi.
Bu aylanib o'tiladigan cheklov emas.

**Buyurtma hujjati.** `orderStatus()` — har pochkaning `done` maydoni bo'yicha
tayyorlik. `ready` bo'lmasa hujjat **chop etilmaydi**: yarim yig'ilgan
buyurtmaga «to'liq tarkib» berilsa u yolg'on hujjat bo'ladi va ombor yo'qolgan
detal bilan qabul qilib oladi.

**Furnitura.** `.project` faylida furnitura ma'lumoti yo'q — 205 fayl
tekshirildi, XML da atigi `project`/`good`/`material`/`operation`/`part`
teglari va `good` turlari `product`/`sheet`/`band`/`CS`/`XNC`/`EL`/`LB`.
Hujjat shuning uchun bu yerda yolg'on yozmaydi, manba yo'qligini ochiq aytadi.

---

### INTERFEYS: HAR SOZLAMA TIZIMGA BOG'LANGAN (me'yor emas, invariant)

**Xato.** `13-app.js` da ikkita **qo'lda yozilgan** ro'yxat bor edi:

- `CONF_IDS` — localStorage ga saqlanadigan maydonlar
- onchange bog'lanishi — qaysi maydon `recompute()` ni chaqiradi

Har yangi me'yor qo'shilganda ularni yangilash unutilardi. Oqibati **jim**:
maydon interfeysda turadi, operator qiymat kiritadi — lekin u saqlanmaydi va
qayta hisobni ham chaqirmaydi.

**Miqyosi.** Tekshirilganda 46 maydondan **21 tasi** `CONF_IDS` da yo'q edi va
**30 dan ortig'i** hech qanday ishlovchiga bog'lanmagan edi. Qalinlik
matritsasi (`S.thickMix`) ham saqlanmasdi.

**Sexda qanday ko'rindi.** «Pochka maks. balandligi» ga 160 mm qo'yilgan, tizim
esa 12–14 qavat terib yuborgan. Balandlik mantig'i (`heightOK`, `packHeight`,
`oddBundles`) to'g'ri edi — maydon packerga **yetib bormasdi**.

**Tuzatish.**

1. `CONF_IDS` endi **DOM dan yig'iladi**: `#v-conf` ichidagi har `input`/`select`
   + P/M dagi `mgrByRoom`/`mgrByMat`. Unutish mumkin emas.
2. Bog'lash ham shu ro'yxat bo'yicha avtomatik. **Standart — qayta hisob**;
   faqat ko'rinishga ta'sir qiladiganlar `CONF_VIEW_ONLY` da sanab o'tilgan
   (chek o'lchami, tara, prefiks, 1 kishi chegarasi, saralash posti).
   Standartning aynan shunday bo'lishi muhim: yangi maydon qo'shilganda eng
   yomoni ortiqcha qayta hisob bo'ladi. Teskarisi — jim nosozlik.
3. `S.thickMix` ham saqlanadi (`o._thickMix`).

**Test** (`smoke.ps1` → «HAR SOZLAMA TIZIMGA BOG'LANGANMI») to'rt narsani
tekshiradi, hammasini **DOM dan** o'qib:

1. har maydon `CONF_IDS` da bormi;
2. har maydonda `onchange` bormi;
3. **`readConf()` uni haqiqatan o'qiydimi** — qiymat o'zgartiriladi, `readConf()`
   chaqiriladi va `S` da biror narsa o'zgarishi tekshiriladi. Maydon HTML da
   bor-u `readConf` unga qaramasa, aynan shu yerda ushlanadi;
4. saqlanadi va tiklanadimi.

> **Sinov tuzoqlari.** `fixNumberInputs()` (10-ui.js) ishga tushishda hamma
> `input[type=number]` ni `type="text"` ga o'giradi (uz-UZ lokalida vergul
> muammosi). Shuning uchun testda `e.type === "number"` ga qarash mumkin emas —
> `data-num="1"` atributiga qaraladi, chegaralar esa xossadan emas atributdan
> o'qiladi. Birinchi urinishda aynan shu sabab 37 ta maydon «ulanmagan» deb
> yolg'on xato bergan edi.

---

### QAVAT SONI BOG'GA HAM QO'LLANADI (v20)

`maxLayers` ilgari faqat oddiy pochkaga qo'llanardi. Bog' — N ta detalning
ustma-ust taxlami, ya'ni N qavat; ro'yxatda ham «N qavat» bo'lib ko'rinadi.
Chegara unga qo'llanmagani uchun operator «chegara ishlamayapti» deb ko'rardi.

Endi `oddBundles()` da `b.items.length < maxLayers` sharti bor va audit bog' uchun
ham `QAVAT` xatosini beradi. Bu massa va balandlik bilan bir xil naqsh:
**uch chegara, ikkala pochka turi uchun ham**.

O'lchov (korpusdagi real buyurtma, `maxH = 160`): eng ko'p detalli bog' 12 → **10**
(10 × 16 mm = 160 mm), chegaradan oshgan 0.

---

### INTERFEYS: ME'YORLAR OQIM BO'YICHA AJRATILGAN (me'yor emas, talab)

**Muammo.** Me'yorlar soni 31 taga yetganda sozlamalar ekrani bitta uzun ro'yxat
edi. `maxKg` (35) bilan `oddKg` (40), `maxLen` (2100) bilan `oddLMax` (3200)
yonma-yon turardi. Raqamlar o'xshash, nomlari ham o'xshash — boshqaruvchi qaysi
biri qaysi oqimniki ekanini ko'rmaydi. Bu shunchaki noqulaylik emas: noto'g'ri
maydonni o'zgartirish butun buyurtmani qayta terib yuboradi.

**Yechim.** Ekran uch blokka bo'lindi, har biri o'z rangi va belgisi bilan:

| Blok | CSS | Maydonlar |
|---|---|---|
| STANDART | `.blk-std` (yashil) | `cMaxKg`, `cMaxLen`, `cBaseWMax`, `cMinPartW`, `cMinPartL`, `cMinBase`, `cBaseLMin`, `cBaseT`, `cBaseCover`, `cBaseInset`, `cMaxH`, `cOvhOn` |
| NOSTANDART | `.blk-nst` (qizg'ish) | `cOddKg`, `cOddLMax`, `cOddWMax`, `cOddTol` |
| IKKALASIGA | `.blk-all` (ko'k) | `cOneMan`, `cTare`, `cMaxPartT`, `cThick`, `cTailOver`, `cTailGap`, qalinlik matritsasi |

**Nima uchun aynan shunday taqsimlangan:**

- `cMaxKg` STANDART blokda, garchi u ham oqim chegarasi bo'lsa ham — 35 kg dan
  og'ir detal nostandart oqimga o'tadi. Podskaskasida ikkala vazifasi ham
  yozilgan. Uni NOSTANDART blokka qo'yish yanada chalkash bo'lardi.
- `cMinBase` va `cBaseLMin` oqimni **o'zgartirmaydi** — ular faqat TAG bo'lishni
  taqiqlaydi. Shuning uchun ular «tag oynasi» kichik sarlavhasida emas,
  «tag (paddon) detal» ostida turadi.
- `cTailOver` va `cTailGap` IKKALASIGA blokda, chunki `oddPackGen()` ham
  `packGroupGen()` ni chaqiradi — quyruq mexanizmi nostandart oqimda ham ishlaydi.
- Qalinlik matritsasi IKKALASIGA blokda: `thickKey()` `packKey()` ichida
  ishlatiladi, ya'ni ikkala oqimning guruhlashiga ta'sir qiladi.

**Podskaska (`.q[data-tip]`).** Har maydonda «?» belgisi; hover yoki `Tab`
(`tabindex="0"` + `:focus`) bilan ochiladi. Matn uch qismdan iborat: (1) maydon
nima qiladi, (2) nimaga shu qiymat, (3) oshirsa/kamaytirsa nima bo'ladi —
imkon bo'lsa o'lchangan raqam bilan (`tailGap`: o'chiq 47 / 500 → 48 / 300 → 50 /
200 → 53 pochka).

Tooltip `.f` ga nisbatan joylashadi, `.q` ning o'ziga emas: 13 px li doiraga
nisbatan 320 px li quti ekrandan chiqib ketardi.

**Test qo'riqlaydi** (`smoke.ps1`, «SOZLAMALAR OQIM BO'YICHA AJRATILDI»): uch
blok bor; har maydon o'z blokida; oqim limitlari aralashmagan; **har** maydonda
≥ 40 belgili `data-tip` bor. Oxirgisi muhim — podskaskasiz yangi sozlama
qo'shilsa test yiqiladi.

---

## Ichki me'yorlar (interfeysda ko'rsatilmagan)

Bu qiymatlar sozlamalar oynasida yo'q — ular kodda qat'iy yozilgan. O'zgartirish faqat manba faylni tahrirlash orqali va faqat sabab bilan.

| Konstanta | Qiymat | Joyi | Ma'nosi |
|---|---|---|---|
| `S.packTries` | 100 | `13-app.js` → `readConf()`; ishlatilishi `04-packer.js` → `greedyPackGen()` | Har bitta pochkaga sinaladigan variantlar soni |
| `guard` | 900 | `04-packer.js` → `greedyPackGen()` sikli | Bitta guruhdan chiqadigan pochkalar mutlaq chegarasi (cheksiz sikldan himoya) |
| `g < 40` | 40 | `04-packer.js` → `layoutPack()` qavat sikli | O'rta qavat yaratishga urinishlar mutlaq chegarasi |
| Konsolidatsiya | 0,62 | `04-packer.js` → `packGroupGen()` | `p.kg < S.maxKg * 0.62 \|\| p.layers.length === 0` bo'lgan pochkalar "kuchsiz" deb birlashtiriladi (35 kg da ≈ 21,7 kg; qavatsiz pochka massasidan qat'i nazar kuchsiz) |
| Konsolidatsiya bosqichlari | 2 | `04-packer.js` → `packGroupGen()` | Birlashtirish ikki marta sinaladi, yaxshilanmasa to'xtaydi |
| Quyruq chegarasi | 0,50 | `04-packer.js` → `absorbTails()` | `p.kg < S.maxKg * 0.5` bo'lgan pochka "yengil" deb boshqasining ustiga singdirishga uriniladi (35 kg da 17,5 kg — auditdagi `YENGIL` chegarasi bilan bir xil) |
| `TAIL_LAYERS` | 2 | `04-packer.js` → `absorbTails()` | Bitta quyruq nishon pochkaga eng ko'pi bilan shuncha qavat qo'sha oladi. 3 ga oshirish namunada hech narsa bermadi; 0 — xususiyatni butunlay o'chiradi |
| Quyruq bosqichlari | 4 | `04-packer.js` → `absorbTails()` | Singdirish sikli shuncha marta takrorlanadi (singdirilgan pochka o'zi keyingi nishon bo'lishi mumkin), o'zgarish bo'lmasa erta to'xtaydi |
| Nostandart urug'i | 4242 | `04-packer.js` → `oddPackGen()` | Nostandart oqim o'z qat'iy urug'i bilan teriladi — asosiy oqim natijasiga bog'liq emas |
| Aralashtirish ehtimoli | 0,14 | `04-packer.js` → `makeLayer()` | Saralangan ro'yxatda qo'shni juftlarni almashtirish ehtimoli (variatsiya uchun) |
| Toza greedy variantlar | 8 | `04-packer.js` → `greedyPackGen()` | Birinchi 8 variant aralashtirishsiz, qat'iy saralash bo'yicha |
| Tag nomzodlari | 10 | `04-packer.js` → `greedyPackGen()` (`baseCap`) | Tasodifiy tanlashda ko'riladigan eng keng 10 nomzod |
| Markaziy bo'shliq | 40 mm | `04-packer.js` → `makeLayer()` | Shundan katta bo'shliq bo'lsa MaxRects bilan kichik detallar to'ldiriladi |
| Yaxlitlik chegarasi | 0,96 | `04-packer.js` → `layoutPack().wholeness()` | Qavat "yaxlit" hisoblanishi uchun kerakli to'ldirish |
| Statistik cheklov | 1,3 | `04-packer.js` → `packAllGen()` | `fill` statistikada `min(1.3, fill)` bilan cheklanadi (chiqish 100% dan oshirishi mumkin) |
| Nafas olish oralig'i | 40 ms | `04-packer.js` → `packAllAsync()` | Shu vaqtdan keyin generator to'xtatilib brauzerga boshqaruv qaytariladi |
| `S.tare` | 0,6 kg | `02-state.js`; `readConf()` → `cTare` maydoni | Qadoq materiali. Pochkalash hisobiga kirmaydi, faqat brutto va "2 KISHI" uchun (`packBrutto()`) |

**`packTries = 100` nima uchun:** Har pochkada 100 variant — bu 3 ta deterministik tag nomzodi (eng keng uchtasi, chunki `rem` `ORD[0]` bo'yicha saralangan) + 97 ta tasodifiy kombinatsiya (tag × strategiya × saralash tartibi × aralashtirish). Har variant to'liq `layoutPack()` chaqiruvi, ya'ni butun pochka boshidan teriladi va ball bilan baholanadi:
```
sc = -pk.kg*3 + gO*0.05 + (qopqoq jarimasi) + (qavatsiz bo'lsa +400) + rnd()*4
```
Ballda massa (`-kg*3`) eng katta vazn oladi — ya'ni zich pochka g'olib; gabarit chiqishi (`gO`) yengil jarima; qopqoq holati alohida baholanadi (yaxlit 0, oddiy +16, yumshoq +30, yo'q +90). 100 dan yuqorisi namuna tipidagi loyihada natijani deyarli o'zgartirmaydi, lekin vaqtni chiziqli oshiradi. Bu qiymat interfeysdan **olib tashlangan** — ilgari foydalanuvchi uni pasaytirib natija sifatini bilmasdan buzardi. Kodda quyi chegara ham bor: `var N = Math.max(8, S.packTries || 100);` — 8 tadan kam variant hech qachon sinalmaydi.

**`guard = 900` nima uchun:** Bu me'yor emas, xavfsizlik to'siqi. Agar biror sozlama kombinatsiyasi tufayli `greedyPackGen()` sikli detallarni kamaytirmay qolsa (masalan `layoutPack()` hech narsa joylashtirolmasa), 900-iteratsiyada sikl majburan to'xtaydi va brauzer muzlab qolmaydi. Normal ishlashda har guruh o'nlab iteratsiyada tugaydi — to'siqqa hech qachon yetib borilmaydi.

---

## Standartlar va manbalar

| Manba | Nima beradi | Qayerda ishlatilgan |
|---|---|---|
| **ISO 11228-1** — *Ergonomics — Manual handling — Part 1: Lifting, lowering and carrying* | Qo'lda ko'tarish uchun tavsiyaviy massa: ishlovchi erkaklar populyatsiyasi uchun 25 kg; boshqa populyatsiyalar uchun pastroq. Chastota, balandlik, burilish bo'yicha kamaytirish talabi | 10-me'yor (`oneMan = 25`), interfeys izohi, pochka cheki |
| **NIOSH Revised Lifting Equation** (AQSh, NIOSH) | Ideal sharoit uchun yuk konstantasi LC = 23 kg; real sharoit oltita koeffitsient bilan pasaytiriladi | 10-me'yor asoslanishi, interfeys izohi |
| **Interlock / split-block palletizatsiya amaliyoti** | Qatlamlarni 180° burib terish (g'isht usuli) choklarni ustma-ust tushirmaydi va ustunni mustahkamlaydi; tor element markazga, keng element chetga | `makeLayer()` simmetrik zona taqsimoti, `layoutPack()` toq qavatlarni `mirrorLayer()` bilan burishi. Bu **standart raqami emas, sanoat amaliyoti** |
| **GS1 logistika yorlig'i tuzilishi** | Yuk birligi yorlig'ida bo'lishi kerak bo'lgan ma'lumot tarkibi (identifikator, massa, tarkib) | `08-labels.js` → `packLabelHTML()` — tuzilish **yaqinlashtirilgan**, GS1 kodlash sxemasi ishlatilmagan |
| Tsex amaliyoti (Namuna komplekt sinov loyihasi) | 190, 2100, 20, 85, 80, 100, 3, 12, 4, 0,62 qiymatlari | Tegishli me'yorlarda ochiq "amaliyotdan olingan qiymat" deb belgilangan |

---

## Integratsiya eslatmalari

Quyidagilar kodni o'qishda aniqlangan nozik joylar. Ular xato emas, lekin me'yorni sozlashda kutilgan natijadan chetlashishga sabab bo'lishi mumkin.

1. **`minBaseT` faqat tagga ta'sir qiladi.** Interfeys yorlig'i "Tag/**ust** min. qalinlik" deydi, lekin `makeLid()` qopqoq detalining qalinligini tekshirmaydi — `greedyPackGen()` eligibility filtri esa faqat tag nomzodlariga qo'llanadi. Amalda me'yor tag detalni boshqaradi.

2. **`maxLayers` `strat === 1` yo'lida bir qavat konservativ.** `midCap` formulasi qopqoq uchun oldindan bitta o'rin ayiradi, lekin `strat === 1` da qopqoq alohida qo'shilmay, eng tepadagi o'rta qavat qopqoq deb **belgilanadi**. Natijada bu yo'lda jami qavatlar `maxLayers - 1` bo'lib chiqadi. `strat === 0` da esa aynan `maxLayers` ga yetadi. Ya'ni limit hech qachon buzilmaydi, lekin ba'zi pochkalarda bitta qavat ishlatilmay qoladi.

3. **`fill` 100% dan oshishi mumkin.** `makeLayer()` da `fill = cov / (baseL × baseW)`, ammo detallar chiqish tufayli tagdan tashqariga chiqadi. Shuning uchun `readConf()` `minFill` uchun 130 gacha ruxsat beradi va `packAllGen()` statistikada `Math.min(1.3, fill)` qo'llaydi. 100 dan yuqori `minFill` — bu "qavat tagdan katta bo'lsin" degani, tavsiya etilmaydi.

4. **0 kiritish cheklovni o'chirmaydi.** `readConf()` da `maxKg`, `minBase`, `maxLen`, `oneMan`, `minFill`, `lidFill`, `lidN`, `tries` uchun `+value || N` shakli ishlatilgan — 0 yozilsa standart qiymat qaytadi. Faqat `ovh`, `minBaseT`, `lidTol`, `maxLayers`, `tare` uchun 0 haqiqiy 0 ni bildiradi.

5. **`packTries` interfeysda yo'q.** `readConf()` uni har safar 100 ga majburan tenglashtiradi (`S.packTries = 100`). `02-state.js` dagi boshlang'ich qiymat ham 100. O'zgartirish uchun ikkala joyni ham tahrirlash kerak.

6. **Qo'lda tuzatilgan `kg/m²` `applyCat()` da yo'qoladi.** IndexedDB seansi `P` ni materiallari bilan birga saqlaydi (`09-storage.js` → `makeSnapshot()`), `saveConf()` esa `S.matCat` ni localStorage ga yozadi. Lekin ham `boot()`, ham seans tiklash yo'li `applyCat()` ni chaqiradi, u esa har bir materialga katalogdan topilgan `kgm2` ni **qayta yozadi**. Ya'ni "Materiallar" bo'limida qo'lda kiritilgan qiymat keyingi ochilishda yo'qoladi. Doimiy o'zgartirish katalogga kiritilishi kerak.

7. **`packAllAsync()` ni to'g'ridan-to'g'ri chaqirmang.** Uning ichida run-token bor (`PACK_RUN`): yangi hisob boshlansa eskisi `superseded` bilan tugaydi va `PACKS` ga tegmaydi. Sinov yoki skriptdan sinxron natija kerak bo'lsa `packAll()` (generatorni oxirigacha aylantiruvchi o'ram) ishlatiladi — u interfeysni bloklaydi.

8. **Audit chegaralari sozlamadan mustaqil zaxiraga ega.** `05-audit.js` → `audCfg()` `S` bo'sh yoki buzuq bo'lsa o'z standartlariga tushadi (`maxKg` 35, `maxLen` 1e9, `minBase` 0, `maxLayers` 0). Shuning uchun audit "toza" deganda ham u aynan siz kiritgan me'yorni tekshirganiga ishonch hosil qiling.

---

## Me'yorlarni o'zgartirish tartibi

Har qanday me'yorni o'zgartirish quyidagi to'rt qadamdan iborat. Qadamlarni tashlab ketmang — ayniqsa uchinchisini.

### 1-qadam. Sozlamani o'zgartirish

"Sozlamalar" bo'limiga o'ting, kerakli maydonni tahrirlang. Har maydonda `onchange` hodisasi bog'langan (`13-app.js` oxiri), shuning uchun maydondan chiqishingiz bilan `recompute()` avtomatik ishga tushadi.

**Bir vaqtda bitta me'yorni o'zgartiring.** Ikki me'yorni birga o'zgartirsangiz, natija yaxshilangan yoki yomonlashganini qaysi biri qilganini ajratib bo'lmaydi.

### 2-qadam. Qayta pochkalash

`recompute()` avtomatik ishlamagan bo'lsa (masalan katalogni tahrirlagan bo'lsangiz) — **"Qayta pochkalash"** tugmasini bosing. U ketma-ket bajaradi:

```
recompute()  →  readConf()  →  packAllAsync(progUpdate)
             →  renderPacks()  →  renderParts()  →  stats()
             →  selectPack(...)  →  autosave()
```

Katta loyihada bu bir necha soniya olishi mumkin — `tries` × guruhlar × `packTries` ko'paytmasi katta. v10 da interfeys bu vaqtda **muzlamaydi**: hisob 40 ms lik bo'laklarga bo'linadi, 250 ms dan uzoq davom etsa jarayon ko'rsatkichi chiqadi va uni "Bekor qilish" bilan to'xtatish mumkin (bekor qilinsa eski natija joyida qoladi). Yangi hisob boshlansa eskisi o'zi to'xtaydi.

### 3-qadam. Diagnostikada auditni tekshirish

**"Diagnostika"** bo'limiga o'ting va audit natijasini ko'ring. Audit **avtomatik emas** — u `renderDiag()` chaqirilganda ishlaydi, ya'ni siz "Diagnostika" bo'limini ochganingizda (`11-diag.js` → `diagAuditHTML()` → `05-audit.js` → `auditPacks(PACKS, buildItems())`). Shu sababli qayta pochkalagach bo'limni qaytadan oching yoki uni yangilang.

Audit natijasi ikkiga bo'linadi: **xato** (`errors`) — hech qachon bo'lmasligi kerak, va **ogohlantirish** (`warnings`) — bo'lishi mumkin, lekin sababini bilish kerak.

Xato kodlari — hammasi 0 bo'lishi shart:

| Kod | Nimani tekshiradi |
|---|---|
| `USTMA_UST` | Bitta qavatdagi ikki detal kesishmasi 1 mm² dan katta emasligi |
| `CHEGARA` | Har detal `[-off, base.L+off] × [-off, base.W+off]` konverti ichida ekanligi |
| `QALINLIK` | `byThick` yoqilganda qavat detali tag detal bilan bir xil qalinlikda ekanligi |
| `MASSA` | Pochka massasi `> maxKg` emasligi |
| `QAVAT` | `maxLayers > 0` bo'lganda `tag + qavatlar ≤ maxLayers` ekanligi |
| `SEQ` | Yig'ish ketma-ketligidagi qadamlar soni detallar soniga tengligi |
| `TUZILMA` | Oddiy pochkada tag detal borligi |
| `YOQOLGAN` | `buildItems()` dagi har detal biror pochkaga tushganligi |
| `TAKROR` | Bir detal ikki joyda turmaganligi |

Ogohlantirishlar (0 bo'lishi shart emas, lekin o'sib ketishi yomon belgi): `TOLDIRISH` (qavat `minFill` dan past), `TAG_OLCHAM` (tag `minBase`/`maxLen` me'yoriga tushmaydi — odatda qo'lda ko'chirishdan keyin), `BOSH_POCHKA` (faqat tagdan iborat), `YENGIL` (limitning yarmidan yengil), `MASSA_NOODATIY` (bitta detalning o'zi limitdan og'ir — bo'linmaydi), `BEGONA` (natija eskirgan, qayta pochkalash kerak).

> **Eslatma:** auditda "markazdan chetlashish" tekshiruvi **yo'q** — markazlash (`centerLayer()`) algoritmning ichki ishi, invariant emas.

Shu bilan birga natija ko'rsatkichlarini yozib oling:

- **pochka soni** — asosiy mezon, kam bo'lgani yaxshi;
- **noodatiy soni** — kam bo'lgani yaxshi;
- **qopqoqsiz pochkalar** — kam bo'lgani yaxshi;
- **o'rtacha massa** — `maxKg` ga yaqin bo'lgani yaxshi;
- **o'rtacha qavat to'ldirish** — yuqori bo'lgani yaxshi.

**Xatolardan bittasi ham 0 dan farq qilsa — o'zgartirishni bekor qiling.** Audit xatosi bu sozlama kombinatsiyasi algoritm uchun yaroqsiz degani. "Standartga qaytarish" tugmasi eng tez yo'l.

Nima o'zgarganini tushunish uchun `maxKg` ni oshirganda pochka soni kamayishi, `minFill` ni oshirganda esa ko'payishi kutiladi. Kutilganning teskarisi chiqsa — 1-qadamga qayting va faqat bitta me'yorni o'zgartirganingizga ishonch hosil qiling.

### 4-qadam. Saqlash

Natija qoniqarli bo'lsa — **"Sozlamalarni saqlash"** tugmasini bosing. `saveConf()` quyidagilarni brauzer xotirasiga (`localStorage`, kalit `upk_conf`) yozadi:

- `CONF_IDS` ro'yxatidagi hamma maydon qiymati (15 me'yor + tara + chek o'lchami + prefiks + menejer belgilari va rejim);
- `_matCat` — butun material katalogi;
- `_sepCls` — alohida pochkalanadigan klasslar.

Keyingi ochilishda `restoreConf()` ularni avtomatik tiklaydi. Yashil "Sozlamalar saqlandi" xabari 3,5 soniya ko'rinadi. `localStorage` mavjud bo'lmasa (masalan brauzer uni bloklagan bo'lsa) xabar qizil chiziq bilan chiqadi va sabab yoziladi — hujjat yiqilmaydi, lekin sozlama saqlanmaydi.

**Diqqat:** saqlash **brauzer va profilga bog'liq**. Boshqa kompyuterda yoki boshqa brauzerda standart qiymatlar qaytadi. Tsexda bir nechta ish o'rni bo'lsa, sozlamani har birida alohida kiritish yoki bitta ish o'rnini "asosiy" deb belgilash kerak.

**"Standartga qaytarish"** tugmasi (`resetConf()`) `upk_conf` kalitini o'chiradi va hamma maydonni `CONF_DEFAULTS` ga qaytaradi — bu qiymatlar sahifa yuklanganda `index.html` dagi `value`/`checked` atributlaridan o'qib olingan. Katalog `MATCAT_DEFAULT` dan tiklanadi, `S.sepCls` bo'shatiladi.

> **v10 o'zgarishi:** ilgari bu yerda `location.reload()` turardi va yuklangan buyurtma ham yo'qolardi. Endi sahifa **qayta yuklanmaydi** — faqat me'yorlar standartga qaytadi, loyiha joyida qoladi va `recompute()` avtomatik ishga tushadi.

---

## Xulosa: nimani o'zgartirish xavfsiz, nimani yo'q

| Me'yor | O'zgartirish xavfi | Izoh |
|---|---|---|
| `oneMan` (10) | **Past** | Faqat ogohlantirish, algoritmga ta'siri yo'q |
| `tries` (14) | **Past** | Faqat hisoblash vaqti |
| `lidTol` (9) | **Past** | Qopqoq sifatiga ta'sir qiladi, xato bermaydi |
| `lidN` (8) | **Past** | 1…4 oralig'ida cheklangan |
| `ovh` (2), `ovhOn` (12) | **O'rtacha** | Pochka soni sezilarli o'zgaradi |
| `lidFill` (7) | **O'rtacha** | `minFill` dan past bo'lishi kerak |
| `minFill` (6) | **O'rtacha** | Pochka soniga eng kuchli ta'sir |
| `maxLayers` (13) | **O'rtacha** | Yupqa materialda hal qiluvchi |
| `maxKg` (1) | **Yuqori** | Ergonomika + butun algoritm |
| `minBase` (3), `maxLen` (4) | **Yuqori** | Noodatiy detallar ulushini keskin o'zgartiradi |
| `minBaseT` (5) | **Yuqori** | `byThick` bilan noto'g'ri juftlikda butun guruhni noodatiyga chiqaradi |
| `byThick` (11) | **Yuqori** | O'chirish geometrik modelni buzadi |
| `matCat` (15) | **Eng yuqori** | Butun massa hisobining asosi; xato qiymat xavfsizlik ogohlantirishini o'chirib qo'yadi |

---

*Hujjat `src/js/02-state.js`, `src/js/03-parser.js`, `src/js/04-packer.js`, `src/js/05-audit.js`, `src/js/08-labels.js`, `src/js/09-storage.js`, `src/js/10-ui.js`, `src/js/11-diag.js`, `src/js/13-app.js` va `index.html` sozlamalar bo'limi kodiga (v10, `APP_VER = 10`) asoslangan. Kod o'zgarganda hujjat ham yangilanishi kerak.*
