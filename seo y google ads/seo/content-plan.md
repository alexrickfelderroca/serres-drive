# SERRES DRIVE — контент‑план SEO (03.09.2026)

Три фазы. Фаза 1 идёт вместе с редизайном, без неё сайт нельзя выкладывать. Фазы 2–3 —
после запуска, по 2 материала в месяц. Все тексты на испанском; факты только из `fleet.json`
и условий, подтверждённых владельцем. Ничего про страховку, возраст, км и «cancelación gratuita»
до подтверждения.

## Фаза 1 — тексты страниц редизайна (обязательно к выкладке)

### 13 страниц машин `/coches/{slug}` — 400–600 слов каждая

Структура одинаковая, порядок блоков фиксирован (первый экран = фото + цена/день + WhatsApp):

1. **H1** `Alquiler {modelo} en Barcelona` + подзаголовок с ценой от/день.
2. **Таблица тарифов** 1 día / 2 días / 3 días / 1 semana / 1 mes (из `fleet.json`) + строка
   «Fianza {deposit} €» + «Entrega y recogida en el área metropolitana: 100 €».
3. **Especificaciones**: мощность, 0–100, макс. скорость, места, коробка, привод, топливо,
   кузов — по docx п. 8. Данные даёт владелец/партнёр; в `fleet.json` заполнено только то,
   что было в docx (A45 425 CV, Golf R 333 CV).
4. **«Para quién es este coche»** — 120–180 слов живого текста: для чего его берут (уикенд
   на Коста‑Брава, свадьба, съёмка, деловая поездка), чем отличается от соседей по флоту.
   Здесь же 2–3 ссылки на соседние модели (список `links_to` в `seo-meta.json`).
5. **Cómo reservar** — 3 строки: WhatsApp с названием машины и датами → подтверждение →
   доставка.
6. **FAQ (4–5 вопросов, schema FAQPage)**: «¿Cuánto cuesta alquilar el {modelo} un fin de
   semana?» (2 días = X €), «¿Entregáis en el aeropuerto?», «¿Cuál es la fianza?»,
   «¿Qué requisitos necesito?» (ответ — из условий владельца), «¿Puedo alquilarlo por un mes?».
7. Ссылки: страница бренда, `/tarifas`, `/como-funciona`, `/condiciones-de-alquiler`.

Приоритет написания (по рекламной и поисковой ценности): G63 → Urus → RS6 → 911 Cabrio →
911 Carrera S → A45 → RS3 → RS Q3 → Cayenne → Velar → Golf R → GLC → A200.

### 6 страниц брендов `/flota/{marca}` — 300–400 слов

H1 `Alquiler {Marca} en Barcelona`, вводный абзац с ценой от, карточки моделей (ItemList),
абзац «por qué alquilar un {Marca} en Barcelona» (маршруты, поводы), FAQ 3 вопроса
(«¿Desde cuánto cuesta alquilar un Porsche en Barcelona?», «¿Qué modelos tenéis?»,
«¿Hacéis entrega en el aeropuerto?»). Для брендов с одной машиной (Lamborghini, Range Rover,
Volkswagen) текст должен быть про бренд и сценарии, а не копией страницы модели — иначе
Google склеит их.

### Главная, `/flota`, `/tarifas`, `/como-funciona`, `/contacto`, `/por-que-serres`

Тексты по docx; мета — из `seo-meta.json`. На главной — 6 карточек брендов (Porsche,
Lamborghini, Mercedes‑AMG, Audi, Range Rover, Volkswagen) и один абзац 80–120 слов под H1 с
ключами «alquiler de coches de lujo en Barcelona», «entrega en hotel o aeropuerto»,
«reserva por WhatsApp». На `/tarifas` — таблица 16 строк + 2 абзаца про залог и доставку.

### `/condiciones-de-alquiler` — частично разблокирована 03.09

Подтверждено владельцем: **минимум 18 лет**, **только действующие права, без стажа**,
**150 км** (понимаю как «в день включено» — подтвердить единицу). Это главное отличие от
конкурентов (у всех «mínimo 25 años») — выносим в первый абзац страницы, в FAQ карточек
(«¿Qué requisitos necesito?» → «Tener 18 años y carnet de conducir en vigor. No pedimos
antigüedad mínima.») и в объявления (уже добавлено).

Ещё нужны: страховка и франшиза, цена доп. км, топливо (полный/полный?), отмена/перенос,
документы (DNI/паспорт, карта для залога). Пока страницу можно публиковать с тем, что есть,
и блоком «Te lo confirmamos por WhatsApp» для остального. Залог для Urus и RS6 не
подтверждён — на их страницах «Fianza: te la confirmamos por WhatsApp».

## Фаза 2 — occasion‑лендинги (месяц 1–2 после запуска)

| URL | Целевые запросы | Что на странице | Куда ссылается |
|---|---|---|---|
| `/bodas` | coche para boda barcelona, alquiler coche bodas barcelona sin chofer, coche de lujo boda barcelona | Тезис «tú conduces, sin chófer»; 3 машины (911 Cabrio, Urus, G63) с ценой за 1–2 дня; доставка к месту свадьбы 100 €; как забронировать дату; FAQ (декор, фотограф, часы) | 3 карточки, `/tarifas` |
| `/eventos-y-rodajes` | alquiler coche sesion de fotos barcelona, alquiler coche rodaje barcelona, coche para evento barcelona | Съёмки, клипы, презентации; почасовой формат **не** предлагаем — минимум 1 день; список машин по «картинке»; доставка в студию/локацию | G63, 911, RS3, `/flota` |
| `/entrega-aeropuerto-barcelona` | alquiler coche de lujo aeropuerto barcelona, recogida aeropuerto el prat coche de lujo, luxury car rental barcelona airport | Как проходит встреча в T1/T2, что нужно иметь при себе, 100 € за доставку, время подачи; FAQ про рейсы с задержкой | `/flota`, `/como-funciona` |
| `/regalo` (опционально) | regalo conducir porsche barcelona, regalar alquiler coche de lujo | «Un día al volante» — не трек‑день, а обычная аренда на день как подарок; как оформить на другого человека | 911, 718, RS3 |

Параллельно: **регистрация на bodas.net и todoboda.com** (категория «coches de boda»,
Barcelona) — там живёт свадебный спрос; профиль с фото 911 Cabrio и G63, ценой «desde 800 €»
и пометкой «sin chófer».

## Фаза 3 — блог `/blog/` (2 статьи в месяц, 1.200–1.800 слов, FAQPage + BreadcrumbList)

| # | Тема (H1) | Запросы | Намерение | Ссылка на | Приоритет |
|---|---|---|---|---|---|
| 1 | ¿Cuánto cuesta alquilar un Porsche en Barcelona? Precios reales por día, semana y mes | cuanto cuesta alquilar un porsche, alquiler porsche precio barcelona, porsche 911 alquiler precio | Коммерческое | `/flota/porsche`, 911, 718 | alta |
| 2 | Requisitos para alquilar un coche de lujo en Barcelona: edad, carnet y fianza | requisitos alquilar coche de lujo, edad minima alquilar porsche, fianza alquiler coche de lujo | Возражения | `/condiciones-de-alquiler` | alta (после условий) |
| 3 | Lamborghini Urus, Mercedes G63 o Porsche Cayenne: qué SUV de lujo alquilar en Barcelona | alquilar urus o g63, suv de lujo alquiler barcelona, g63 o cayenne | Сравнение | Urus, G63, Cayenne | alta |
| 4 | A45 AMG, Audi RS3 o Golf R: el hot hatch de alquiler para un fin de semana | alquilar a45 amg barcelona, rs3 o a45, golf r alquiler | Сравнение | A45, RS3, Golf R | alta |
| 5 | Ruta en descapotable por la Costa Brava: 1 día, 2 días y dónde parar | ruta costa brava descapotable, ruta en coche costa brava un dia | Верх воронки, маршрут | 911 Cabrio, 911 Carrera S | media |
| 6 | Alquilar un coche de lujo en el aeropuerto de Barcelona: cómo funciona la entrega en El Prat | alquiler coche lujo aeropuerto barcelona, entrega coche aeropuerto el prat | Коммерческое | `/entrega-aeropuerto-barcelona` | alta |
| 7 | Coche para boda sin chófer: guía para conducir tu propio coche el día B | coche boda sin chofer, alquilar coche para boda conducir yo | Коммерческое | `/bodas` | alta |
| 8 | ¿Qué incluye el precio de un alquiler de coche de lujo? Fianza, kilómetros y seguro explicados | que incluye alquiler coche de lujo, fianza coche de lujo como funciona | Возражения | `/condiciones-de-alquiler`, `/tarifas` | media (после условий) |
| 9 | Alquilar un Lamborghini Urus en Barcelona: precio por día, fianza y cómo reservar | alquilar urus barcelona precio, alquiler lamborghini barcelona precio | Коммерческое | Urus, `/flota/lamborghini` | alta |
| 10 | Audi RS6 Avant de alquiler: el familiar de 600 CV para un viaje por Cataluña | alquilar audi rs6 barcelona, rs6 alquiler precio | Коммерческое | RS6, `/flota/audi` | media |
| 11 | Alquilar un coche de lujo por un mes en Barcelona: cuándo compensa frente al renting | alquiler coche lujo por meses barcelona, alquiler mensual coche de lujo | Коммерческое | `/tarifas`, GLC, A200 | media |
| 12 | Porsche 911 Carrera S o 911 Cabrio: cuál alquilar para un fin de semana | 911 coupe o cabrio alquiler, porsche 911 cabrio alquiler barcelona | Сравнение | 911 Carrera S, 911 Cabrio | media |
| 13 | Coche de lujo para una sesión de fotos o rodaje en Barcelona: qué pedir y cuánto cuesta | alquiler coche para fotos barcelona, coche rodaje barcelona precio | Коммерческое | `/eventos-y-rodajes` | media |
| 14 | Sant Cugat y el Vallès: alquiler de coches de lujo sin ir a Barcelona | alquiler coche de lujo sant cugat, alquiler porsche sant cugat | Локальное | `/contacto`, `/flota` | media |

Правила: каждая статья ссылается на 2–3 карточки машин и на одну хаб‑страницу; каждая
карточка машины после выхода статьи получает обратную ссылку блоком «Guías relacionadas»
(та же ошибка, что была у wrap‑центра — односторонние ссылки — здесь не повторяется).
Статьи 2 и 8 пишутся только после условий владельца.

## Фаза 2‑EN — английская версия (после первых данных Search Console)

Туристы ищут на английском, и EN‑выдача — отдельные EN‑сайты. Минимальный набор: `/en/`,
`/en/fleet`, 6 страниц брендов, 16 машин, `/en/rates`, `/en/how-it-works`, `/en/contact`
с `hreflang="en"`/`"es"` и `x-default` → ES. Не через JS‑переключатель, а отдельные HTML.
Запускать, когда испанская версия проиндексирована и есть данные по EN‑запросам в
Search Console и в рекламе (группа «Luxury Car Rental BCN (EN)»).
