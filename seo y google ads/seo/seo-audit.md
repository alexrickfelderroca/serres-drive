# SEO‑аудит serresdrive.com — 03.09.2026

Проверено вживую через curl (не WebFetch): все 43 URL из sitemap, robots.txt, вес ассетов,
плюс 8 поисковых выдач по целевым запросам. Search Console и GA4 недоступны (API‑токен мёртв,
свойства для serresdrive.com, судя по всему, не созданы) — индексация и позиции **не измерены**.

## 1. Что на старом сайте сделано хорошо (сохранить в редизайне)

| Элемент | Состояние |
|---|---|
| Canonical | На всех 43 страницах, корректный |
| `<html lang="es">` | Есть |
| Open Graph | Есть на всех страницах |
| Schema.org | AutoRental + PostalAddress везде; BreadcrumbList; ItemList на страницах брендов; FAQPage на how.html; на страницах машин Offer + UnitPriceSpecification + EngineSpecification |
| Изображения | `alt` заполнен у 100 % картинок, hero‑фото ~220 KB JPG |
| robots.txt / sitemap.xml | Корректны, sitemap в robots, 43 URL, lastmod 2026‑07‑21 |
| Объём текста | 450–870 слов на страницу, один H1 |
| Структура URL | Понятные ЧПУ `alquiler-{marca}-barcelona.html`, `alquiler-{modelo}-barcelona.html` — тот же паттерн, что у конкурентов в топе |
| Внутренние ссылки | Меню + хлебные крошки + бренд → модели |

Вывод: техническая база у программиста хорошая. Проблемы ниже — содержательные, и все они
решаются редизайном, если его сделать по `seo-meta.json` и ТЗ.

## 2. Критические проблемы

**2.1 Два языка в одном DOM.** Переключатель ES/EN реализован на клиенте: в HTML лежат
оба языка одновременно, и H1 отдаётся Google как «Alquiler Porsche en BarcelonaRent a Porsche
in Barcelona», H2 как «Especificaciones||Specifications». Для робота это дублированный и
частично скрытый текст, размытый H1, удвоенная длина страницы. Решение: одна языковая версия
на URL. Фаза 1 — только испанский. Фаза 2 — отдельные `/en/…` страницы с `hreflang`.

**2.2 27 из 43 страниц — недоступные машины.** Ferrari (5), Lamborghini (3), McLaren, Aston
Martin, BMW (5), Maserati, Alfa Romeo, Abarth, Audi RS Q3/RS4/RS6/A5, G63 Plus, 911 Targa,
Cayenne Turbo GT/GTS — всё это показано как «доступно» с ценами. Клиент из поиска попадает
на машину, которой нет. Решение: 301 на страницу бренда (если бренд остаётся) или на `/flota`
— карта в `seo-meta.json → redirects_301`. Удалять без редиректа нельзя: у страниц есть
возраст и, возможно, ссылки.

**2.3 Неверные цены и контакты в мета‑данных.** Title главной «desde 120 €/día» (такой
цены нет во флоте), description главной обещает Ferrari и Lamborghini, G63 в title «desde
2.900 €/día» (реально 1.000). Email `info@serreswrapcenter.es`, телефон и WhatsApp — wrap‑центра.
Всё это уходит в сниппеты Google. Решение: все title/description генерируются из `fleet.json`
(файл `seo-meta.json`), контакты — только Serres Drive.

**2.4 Индексация не подтверждена.** Поиск `site:serresdrive.com` не показал ни одной
страницы домена (инструмент поиска ограничен, поэтому это сигнал, а не приговор). Обязательно:
создать свойство Search Console для serresdrive.com (DNS‑верификация, как для wrap‑центра),
отправить sitemap, проверить отчёт «Страницы».

## 3. Заметные, но не критические

| Проблема | Факт | Что делать |
|---|---|---|
| Длинные title | 18 страниц > 65 символов (до 86) | Новые title ≤ 65, см. `seo-page-map.md` |
| Длинные description | Все 148–181 символов | 110–160 |
| Нет hreflang | 0 на всех страницах | Не нужен в фазе 1 (один язык); нужен при `/en/` |
| Вес JS | GSAP 71 KB + Lenis 13 KB (с unpkg) + 7 собственных скриптов 157 KB = ~240 KB JS на каждой странице | Редизайн убирает слайдеры/параллакс — GSAP и Lenis должны уйти вместе с ними |
| Фото | JPG 220 KB без `srcset`, без WebP/AVIF | WebP/AVIF + `srcset` + `loading=lazy` ниже первого экрана, hero с `preload` |
| Хлебные крошки | Есть в schema, ведут на `fleet.html` | Обновить на новые URL |
| Sitemap lastmod | Все даты одинаковые (21.07) | Реальные даты; sitemap нового сайта сгенерирован: `seo/sitemap.xml` |
| Блок wrap‑центра на главной | Ссылки на serreswrapcenter.es и его Instagram | По docx — убрать с главной, оставить в footer (одна ссылка, это нормально) |
| Нет контента кроме карточек | Ни блога, ни страниц под поводы (свадьбы, аэропорт), ни условий аренды | `content-plan.md` |
| Нет GBP для Serres Drive | Карточка есть только у wrap‑центра | `gbp-serresdrive.md` |

## 4. Кто в выдаче и с чем (8 запросов, 03.09)

| Запрос | Кто ранжируется | Что у них есть |
|---|---|---|
| alquiler coches de lujo barcelona | Sixt, Europcar, DoYouSpain, Beyond Cars, LC Barcelona, Rentlux | Страница‑хаб «lujo Barcelona», цены в title («desde 90 €/día»), доставка в аэропорт/отель в первом абзаце |
| alquilar porsche barcelona | RentLuxeCar, Radikalworld, GT Rentals, LC Barcelona, Barcelona Lands | Отдельная страница бренда `/alquiler-porsche-barcelona/`, страница модели с ценой в title («Desde 580€/día»), мин. возраст 25 указан прямо на странице |
| alquiler mercedes g63 barcelona | RentLuxeCar, StratosRent (страница + пост в блоге), Rentlux, Red Fox, Barcelona Supercar, Billionrent | Страница модели + страница бренда; цены «desde 850 €/día»; пост в блоге ранжируется рядом со страницей |
| alquilar audi rs3 barcelona | RentLuxeCar (3 URL: город + аэропорт), Billionrent, IsyLuxe, AlquilerDeLujo, StratosRent | Отдельные страницы «модель + аэропорт»; онлайн‑бронирование; цены «desde 450 €/día» — ровно наша цена |
| alquiler coche deportivo barcelona fin de semana | Amovens, Sixt, RentLuxeCar, Rentingmundo (каталог), AlquilerDeLujo, GT Rent (блог), Rentlux | Категория «deportivos» + блог‑статья с маршрутами (Costa Brava, Garraf); Rentlux называет A45 AMG и Boxster |
| coche de lujo para boda barcelona sin conductor | bodas.net, todoboda, Caraveando, Beneluxcar | Каталоги свадебных поставщиков (bodas.net — обязательная площадка), нишевые страницы «bodas sin chófer» |
| luxury car rental barcelona airport delivery porsche | Europe Luxury Cars (город + airport), LuxuryCarHireAirport, Barcelona Supercar, DriveMeBarcelona, Driverso, King Rent, Primerentcar | EN‑сайты со страницей «Barcelona Airport»; наш EN‑трафик без `/en/` версии не получить |
| site:serresdrive.com | — | Ни одного результата (см. 2.4) |

Что из этого следует для структуры сайта:

1. **Страница бренда должна быть статической** (`/flota/porsche`), а не фильтром `?marca=`:
   так устроены все, кто в топе. Поэтому паттерн в `fleet.json` изменён на `/flota/{marca}`,
   реклама (K3) ведёт туда же.
2. **Цена в title** страницы модели и бренда — стандарт ниши, повышает CTR. Сделано.
3. **Страница «entrega en el aeropuerto»** — отдельный кластер запросов у RentLuxeCar и
   Europe Luxury Cars. Добавлена в фазу 2.
4. **Условия аренды (возраст, стаж, залог)** конкуренты пишут прямо на странице модели —
   это и SEO‑контент, и фильтр нецелевых. Нужны данные владельца.
5. **Свадьбы** — трафик живёт в bodas.net/todoboda, а не только в Google. Регистрация там
   стоит выше своей страницы `/bodas`.
6. **Блог‑статьи ранжируются по коммерческим запросам** (StratosRent про G63, GT Rent про
   deportivos) — план в `content-plan.md`.

## 5. Ключевые кластеры (без объёмов — Keyword Planner недоступен до перевыпуска токена)

| Кластер | Запросы‑якоря | Страница |
|---|---|---|
| Хаб «lujo» | alquiler coches de lujo barcelona, alquiler coches alta gama barcelona, alquiler coche de lujo sant cugat | `/` и `/flota` |
| Бренд | alquilar porsche barcelona, alquiler mercedes amg barcelona, alquilar audi barcelona, alquiler range rover barcelona | `/flota/{marca}` |
| Модель | alquilar g63 barcelona, alquiler porsche 911 barcelona, alquilar audi rs3 barcelona, alquiler a45 amg barcelona, alquiler golf r barcelona, alquiler velar barcelona, alquiler cayenne barcelona, alquiler macan barcelona, alquiler 718 spyder barcelona | `/coches/{slug}` |
| Тип кузова | alquiler coche deportivo barcelona, alquiler descapotable barcelona, alquiler suv de lujo barcelona | `/flota` (фаза 2: `/flota/deportivos`, `/flota/descapotables` — только если появятся тексты) |
| Lamborghini | alquilar lamborghini barcelona, alquiler urus barcelona, rent a lamborghini barcelona | `/flota/lamborghini`, `/coches/lamborghini-urus` |
| Цена | precio alquiler porsche barcelona, cuanto cuesta alquilar un g63 | `/tarifas` + блог |
| Повод | coche para boda barcelona, alquiler coche sesion de fotos barcelona, alquiler coche eventos barcelona, regalo conducir porsche | `/bodas`, `/eventos-y-rodajes` |
| Аэропорт | alquiler coche de lujo aeropuerto barcelona, luxury car rental barcelona airport | `/entrega-aeropuerto-barcelona` |
| Условия | requisitos alquilar coche de lujo, fianza alquiler coche de lujo, edad minima alquilar porsche | `/condiciones-de-alquiler` + блог |
| EN | luxury car rental barcelona, rent a porsche barcelona, g wagon rental barcelona | `/en/…` (фаза 2) |

Объёмы: после перевыпуска токена — `python3 pull_keyword_ideas_serresdrive.py` даёт
цифры по всем рекламным ключам; они же покрывают SEO‑кластеры выше.

## 6. Что делать — по порядку

1. Программист: редизайн строго по `seo-meta.json` (title/description/H1/schema/ссылки) и
   `TZ-SEO-serresdrive-ES.md` + 301 из `redirects/`. Одна языковая версия в DOM.
2. Владелец: Search Console для serresdrive.com (DNS‑верификация под ads.serres.01@gmail.com),
   после выкладки — отправить `sitemap.xml`, запросить индексацию 6 главных URL.
3. Владелец: GBP «Serres Drive» по `gbp-serresdrive.md`; регистрация на bodas.net.
4. Владелец → мне: условия аренды (возраст, стаж, км, страховка, франшиза) — без них не
   публикуются `/condiciones-de-alquiler` и FAQ на страницах машин.
5. Контент по `content-plan.md`: сначала тексты 16 карточек и 6 страниц брендов (фаза 1),
   затем 3 occasion‑лендинга, затем блог 2 статьи/месяц.
6. Через 4 недели после выкладки: отчёт Search Console «Страницы» и «Эффективность» —
   проверить, что 27 старых URL отдают 301 и выпали из индекса, а 16 новых вошли.
