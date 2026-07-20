# SERRES DRIVE — Web de alquiler de coches de lujo

Sitio web (una sola página, estático) para **Serres Drive**, el servicio de alquiler
de coches de lujo de Serres — continuación visual de [Serres Wrap Center](https://serreswrapcenter.es).
Flota en colaboración con [Sicurcars](https://www.instagram.com/sicurcars/).

- **Idiomas:** Español (por defecto) + Inglés, con conmutador ES/EN.
- **Reservas:** solo por WhatsApp (enlaces prerrellenados por coche) → **+34 621 24 44 69**.
- **Sin dependencias:** HTML + CSS + JS puro. Se puede abrir en cualquier hosting.
- **31 coches** — la flota real de Sicurcars, con sus mismos precios (§2 y §4).

---

## 1. Estructura

```
serres drive/
├─ index.html            ← portada: experiencia 3D (§8) + tubo “Elige tu coche” (§9)
├─ fleet.html            ← la flota — galería en parejas con filtros (§10.3)
├─ car.html              ← ficha de un coche  (car.html?slug=…)
├─ rates.html · how.html · why.html · contact.html
├─ css/
│  ├─ styles.css         ← diseño base (colores, tipografía, componentes)
│  ├─ home.css           ← solo la portada  (body.home-exp)
│  ├─ car.css            ← solo la ficha de coche
│  ├─ nav-ink.css        ← menú móvil “mancha de tinta”      (§10.2)
│  ├─ fleet-gallery.css  ← galería de la flota                (§10.3)
│  └─ transitions.css    ← transiciones entre páginas         (§10.1)
├─ js/
│  ├─ fleet.js           ← DATOS de los coches (precios, specs, textos) ← edita aquí
│  ├─ app.js             ← lógica común (idioma, WhatsApp, tarifas, animaciones)
│  ├─ experience.js      ← portada 3D (three.js + GSAP + Lenis)
│  ├─ car.js             ← ficha de coche
│  ├─ media-map.js       ← fotos de @sicurcars por coche
│  ├─ transitions.js · nav-ink.js · fleet-gallery.js   ← los tres módulos de §10
├─ assets/
│  ├─ brand/favicon.svg
│  ├─ models/*.glb       ← coches 3D de la portada
│  ├─ img/
│  │  ├─ og-cover.svg    ← imagen para redes sociales
│  │  ├─ hero.mp4        ← (opcional) vídeo de portada — ver §3
│  │  └─ cars/           ← FOTOS de cada coche — ver §2
│  │     ├─ <slug>.jpg          (1280 px · tarjetas y ficha)
│  │     ├─ ring/<slug>.jpg     (640 px · azulejos del tubo 3D)
│  │     ├─ ring/CREDITS.md     ← ⚠️ créditos de imágenes — no borrar
│  │     ├─ sicurcars/          (fotos extra para la galería de la ficha)
│  │     └─ scrape/             (pósters de @sicurcars)
└─ README.md
```

---

## 2. Las fotos de los coches  ⭐

**Ya están todas instaladas.** La flota son los **31 coches reales de Sicurcars**
(`sicurcars.es/nuestra-flota`, copiada en julio de 2026), y cada uno tiene su foto
en dos tamaños:

- `assets/img/cars/<slug>.jpg` — 1280 px, para las tarjetas de la flota y la ficha del coche
- `assets/img/cars/ring/<slug>.jpg` — 640 px, para los azulejos del **tubo 3D** del inicio

Para **cambiar** una foto, sobrescribe los **dos** archivos con ese mismo nombre
(horizontal, ~1280×800 px el grande y ~640×400 px el pequeño).

| Coche | Nombre del archivo | Categoría |
|---|---|---|
| Ferrari 458 Spider | `ferrari-458-spider.jpg` | Descapotable |
| Mercedes-AMG G 63 | `mercedes-amg-g63.jpg` | SUV |
| Ferrari F8 Spider | `ferrari-f8-spider.jpg` | Descapotable |
| Ferrari 488 GTB | `ferrari-488-gtb.jpg` | Deportivo |
| Mercedes-AMG G63 Plus | `mercedes-amg-g63-plus.jpg` | Lujo |
| McLaren 570S | `mclaren-570s-gt.jpg` | Deportivo |
| Porsche 911 Targa GTS | `porsche-911-targa-gts.jpg` | Deportivo |
| Aston Martin DBX 707 | `aston-martin-dbx-707.jpg` | SUV |
| BMW M8 Competition Cabrio | `bmw-m8-competition-cabrio.jpg` | Descapotable |
| Porsche 911 Carrera (992) | `porsche-911-carrera-992.jpg` | Lujo |
| Lamborghini Urus | `lamborghini-urus.jpg` | SUV |
| Ferrari Portofino M | `ferrari-portofino-m.jpg` | Descapotable |
| Porsche Cayenne Turbo GT | `porsche-cayenne-turbo-gt.jpg` | SUV |
| Lamborghini Huracán Coupé | `lamborghini-huracan-coupe.jpg` | Deportivo |
| BMW X7 M60i | `bmw-x7-m60i.jpg` | Lujo |
| BMW M4 Competition | `bmw-m4-competition.jpg` | Lujo |
| Audi RS 6 Avant | `audi-rs6-avant.jpg` | Deportivo |
| Alfa Romeo Stelvio Quadrifoglio | `alfa-romeo-stelvio-quadrifoglio.jpg` | SUV |
| Porsche 718 Spyder | `porsche-718-spyder.jpg` | Descapotable |
| Audi RS Q3 | `audi-rs-q3.jpg` | SUV |
| Audi RS Q3 Sportback | `audi-rsq3-sportback.jpg` | SUV |
| Audi RS 3 | `audi-rs3.jpg` | Deportivo |
| Mercedes-AMG A45 S | `mercedes-amg-a45-s.jpg` | Deportivo |
| Audi RS 4 Avant | `audi-rs4-avant.jpg` | Deportivo |
| Volkswagen Golf R | `volkswagen-golf-r.jpg` | Deportivo |
| Maserati Levante GranSport | `maserati-levante-gransport.jpg` | SUV |
| Audi A5 Avant | `audi-a5-avant.jpg` | Lujo |
| Porsche Cayenne GTS Coupé | `porsche-cayenne-gts-coupe.jpg` | SUV |
| BMW M135i xDrive | `bmw-m135i-xdrive.jpg` | Deportivo |
| Mercedes C 220 d Cabrio | `mercedes-c220d-cabrio.jpg` | Descapotable |
| Abarth 595 Competizione | `abarth-595-competizione.jpg` | Deportivo |

> **Matrícula difuminada.** 16 de estas fotos llevaban una placa con el logo
> **SICURCARS** en el hueco de la matrícula. Se ha **pixelado esa zona** en las dos
> versiones de cada foto. Si sustituyes una foto por otra, comprueba si hace falta
> repetir el retoque.
>
> **Excepción:** la foto del **Audi RS Q3 Sportback** original era inservible (una
> foto de móvil girada, hecha en un garaje), así que se ha sustituido por una imagen
> libre de **Wikimedia Commons** (CC0). Los créditos están en
> `assets/img/cars/ring/CREDITS.md` — **no borres ese archivo**.

---

## 3. Portada (hero) — vídeo en bucle

La portada reproduce un **vídeo de fondo en bucle** (`assets/img/hero.mp4`), silenciado y
optimizado para web (~1,5 MB · 720p). Ya viene instalado un clip nocturno de conducción
(stock gratuito, licencia Pexels — uso comercial, sin atribución obligatoria).

**Para cambiarlo por el tuyo** (p. ej. un clip de la flota de Sicurcars):
1. Guarda tu vídeo como `assets/img/hero.mp4` (horizontal, silenciado; ideal 720p y < 3 MB).
2. Recarga. Se reproduce solo, en bucle, sin sonido, también en móvil.

Orden de la portada: **vídeo** (`hero.mp4`) → si no existe, **foto** (`hero.jpg`) →
si no existe, la **escena animada por CSS**. Así nunca se ve rota.

> Comprimir tu vídeo (si tienes ffmpeg):
> `ffmpeg -i entrada.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 28 -preset slow -an -movflags +faststart hero.mp4`

---

## 4. Editar precios, coches o textos

Todo está en **`js/fleet.js`**. Cada coche es un objeto:

```js
{ slug:"mercedes-amg-g63", name:"Mercedes-AMG G 63", brand:"Mercedes-Benz",
  category:"SUV", typeKey:"SUV", bodyType:"SUV", year:2022,
  powerCv:585, zeroToHundred:"4,5 s", topSpeed:"220 km/h",
  transmission:"AMG TCT 9 vel.", drivetrain:"AWD",
  seats:5, luggage:6, km:7700, fuel:"Gasolina",
  accent:"#E85A1A", featured:true,
  extras:[…], taglineEs:"…", taglineEn:"…",
  highlightsEs:[…], highlightsEn:[…],
  prices:{ d1:2900 } }
```

- `prices`: `d1`=1 día, `w1`=1 semana, `d15`=15 días, `m1`=1 mes (en €).
  **Son los mismos tramos y los mismos importes que publica Sicurcars.**
  ⚠️ **Cualquiera de las cuatro claves puede faltar** — Sicurcars no publica todos los
  tramos de todos los coches. Donde falta, la web escribe **“Consúltanos”** en vez de un
  precio (nunca `undefined`). Cuatro coches no tienen precio de día: Urus, Portofino M,
  Huracán y Cayenne GTS Coupé.
- `category` (español, define el filtro): `Deportivo`, `SUV`, `Lujo` o `Descapotable`.
  `typeKey` es su equivalente en inglés (`Sports` / `SUV` / `Luxury` / `Convertible`).
- `brand` alimenta el filtro **Marca** de la página de flota, que se construye solo.
- `featured:true` muestra la etiqueta **Destacado / Top pick**.
- No hay campo `deposit`: la fianza depende del coche y de la duración, así que la ficha
  y la página de tarifas dicen “Consúltanos / se confirma al reservar”.
- Para **añadir un coche**: copia un bloque, cambia los datos y añade sus **dos** fotos
  (`assets/img/cars/<slug>.jpg` y `assets/img/cars/ring/<slug>.jpg`).

La entrega a domicilio (100 €) y las notas de fianza/IVA se editan en `rates.html`.

---

## 5. Cambiar el teléfono / WhatsApp / email

Ahora mismo usa el contacto de Serres Wrap Center. Para cambiarlo:

- **WhatsApp:** variable `WA_DIGITS` en `js/app.js` (formato `34XXXXXXXXX`).
- **Teléfono y email:** busca `621244469` y `info@serreswrapcenter.es` en `index.html`.
- **Instagram:** en el pie de página (`index.html`). Si abrís un perfil propio
  tipo `@serres.drive`, cámbialo ahí.

---

## 6. Ver la web en local

Cualquiera de estas opciones (desde la carpeta del proyecto):

```bash
npx serve .          # Node
# o
python -m http.server 8000
```

Luego abre `http://localhost:8000`. En VS Code también sirve la extensión **Live Server**.

> Nota: hay que servirla con un servidor (no abrir el `index.html` con doble clic),
> porque el idioma y la flota se cargan por JavaScript.

---

## 7. Publicar (deploy)

Es un sitio estático: sube **toda la carpeta** a cualquier hosting.

- **Rápido:** arrastra la carpeta a [app.netlify.com/drop](https://app.netlify.com/drop) → URL al instante.
- **Vercel / Cloudflare Pages / GitHub Pages:** también valen.
- **Junto a la web actual:** ideal como subdominio, p. ej. `drive.serreswrapcenter.es`.

---

## Notas

- Los marcadores de los coches, el favicon y la portada son SVG generados a medida
  con la identidad Serres (negro + plata/cromo clásico). Se reemplazan al añadir fotos.
- Diseño y tipografía (Barlow Condensed + DM Sans) heredados de serreswrapcenter.es
  para que Serres Drive se sienta parte de la misma marca.
- Flota en colaboración con Sicurcars (crédito en el pie de página).
- Vídeo de portada: clip de stock de **Pexels** (licencia gratuita, uso comercial sin
  atribución obligatoria). Sustitúyelo por metraje propio cuando quieras.
- **Instagram no se puede descargar de forma automática** (muro de login + anti-scraping de
  Meta). Las fotos de los coches hay que añadirlas a mano (ver §2) o pásamelas y las coloco yo.

---

## 8. La experiencia 3D del inicio  ⭐ (nuevo)

La **portada** (`index.html`) es ahora una **experiencia 3D con scroll**: aparecen los
**cuatro coches** en 3D y, al bajar, **tres se desvanecen** (G63, RS 6, M3) y solo el
**Porsche 911 GT3 RS** continúa —​ flota, gira y se "escanea" hasta una tarjeta de
**RESERVA VERIFICADA**, con el mismo lenguaje visual (negro + cromo) de la marca. Debajo hay
un **escaparate** con los coches insignia y la llamada a la reserva. El resto del sitio se ha
dividido en **páginas**:

```
index.html     ← experiencia 3D (hero GT3 RS) + escaparate + CTA
fleet.html      ← la flota completa (17 coches, filtros)   ·  fleet.html?cat=SUV pre-filtra
rates.html      ← tabla de tarifas
how.html        ← cómo funciona
why.html        ← por qué Serres
contact.html    ← contacto / reserva
```

- El idioma **ES/EN** se recuerda entre páginas (localStorage). El menú y el pie enlazan todo.
- **Reserva por WhatsApp** intacta en todas las páginas y en cada coche del escaparate.

### 8.1 Los modelos 3D  (`assets/models/*.glb`)

| Coche | Archivo | Uso |
|---|---|---|
| Porsche 911 GT3 RS | `gt3.glb` (1,5 MB) | **Hero 3D** — el que sobrevive y se escanea |
| Mercedes-AMG G63 | `g63.glb` | en el hero (se desvanece al bajar) + render en escaparate |
| Audi RS 6 Avant | `audi.glb` | en el hero (se desvanece al bajar) + render en escaparate |
| BMW M3 Touring | `bmw.glb` | en el hero (se desvanece al bajar) + render en escaparate |

Se generaron a partir de tus carpetas originales (`.rar`/`.zip` con `.fbx`/`.obj`/`.glb`):
extraídos → convertidos a **GLB** → comprimidos con **Draco + texturas WebP** (de 13–40 MB a
1–2 MB cada uno) para que carguen rápido, también en móvil.

**Fotos “estudio” de cada coche:** `assets/img/cars/renders/*.jpeg` — renders sobre fondo
oscuro que usa el escaparate del inicio. `gt3.jpeg` es además la **imagen de reserva** que se
ve si el navegador no soporta 3D o si el usuario tiene *reduce motion* activado.

### 8.2 Cambiar o recolocar los coches del hero

En [`js/experience.js`](js/experience.js) hay un array **`DEFS`** con los cuatro coches. El que
lleva `hero:true` es el que **sobrevive y se escanea** (ahora el GT3 RS); los otros tres se
desvanecen al bajar. Cambia la ruta `url` para usar otro `.glb`, o mueve cada coche con
`pos:[x,y,z]` y su tamaño con `size`. El encuadre de la cámara se calcula solo y se adapta a
móvil (`computeLayout`).

### 8.3 Sonido y accesibilidad

- **Sonido:** un “beep” de escáner + rugido suave al escanear. El botón redondo abajo-izquierda
  lo **silencia** (se recuerda). Por norma del navegador solo suena tras la primera interacción.
- **Reduce motion / sin 3D / sin JS:** la experiencia se degrada sola a una **portada estática**
  con la foto del GT3 RS; ningún texto se pierde. Nada de scroll “secuestrado”.

### 8.4 Librerías (por CDN, como las tipografías)

`three.js` (r0.160), `GSAP` + `ScrollTrigger`, `Lenis` y el decoder `Draco` se cargan por CDN
en `index.html`. Las páginas internas **no** cargan 3D (son ligeras).

> **Nota:** el **GT3 RS** y el **BMW M3 Touring** aún **no están en `js/fleet.js`** (la flota
> real son 17 coches: sí están el G63 y el RS 6). En el escaparate se muestran como modelos
> insignia con reserva “Consúltanos” por WhatsApp. Si quieres que sean alquilables, dime sus
> precios/specs y los añado a `fleet.js` (aparecerán también en la flota y en las tarifas).

---

## 9. “Elige tu coche” — el tubo 3D + ficha de cada coche  ⭐ (nuevo)

Al terminar el scroll del hero, la animación del **Porsche** ya **no desaparece**: se
**enlaza** con una segunda escena interactiva sobre el mismo lienzo 3D. El Porsche (GT3 RS)
se asienta en el centro y **la flota aparece a su alrededor como un cilindro/“tubo” de fotos**
(recreando la referencia *Scroll-Driven Image Tube*), sobre el **fondo oscuro** de siempre.

- Al **hacer scroll**, el tubo de fotos **fluye verticalmente** (bucle infinito) y **gira** con
  suavidad; el **Porsche rota despacio** en el centro. Para girarlo tú: **arrastra en horizontal**
  o **desliza en horizontal** con el trackpad / rueda (en ratón, `Shift` + rueda). El giro
  automático sigue funcionando por debajo; tu gesto solo le añade impulso.
- **Pasa el cursor** sobre cualquier foto para ver su nombre y precio/día; **haz clic en
  cualquiera** — también las del fondo del tubo — para abrir **su ficha**. Las fotos que quedan
  justo delante del Porsche se **atenúan** para que el coche nunca se tape (y se “ve a través”
  de ellas al clicar).
- Hay **más fotos que coches**: las 17 fotos se **repiten** por todo el tubo (9 columnas × 6
  filas × 3) para llenarlo, como en el vídeo de referencia.
- Se degrada solo: sin WebGL / *reduce motion* / sin JS → una **rejilla de enlaces** con los 17
  coches (`.oa-choose`), nunca se esconde nada. En táctil, el deslizamiento **vertical** hace
  scroll normal (mueve el tubo); solo el **horizontal** lo gira a mano.

### 9.1 Scroll rápido — por qué el tubo ya no “salta”  ⚠️

El tubo avanza **~1,1 vueltas de bucle por pantalla** que scrolleas. Si bajabas muy rápido,
un solo fotograma podía entregar **varias vueltas de golpe**: el código antiguo solo corregía
**una** vuelta por fotograma, así que el cilindro se iba fuera de rango y **se saltaba toda la
animación**. Ahora hay tres defensas en [`js/experience.js`](js/experience.js):

1. **Techo por fotograma** (`MAX_LOOPS_PER_FRAME`): el tubo nunca avanza más de un 16 % del
   bucle en un fotograma, por muy rápido que scrollees.
2. **Ajuste por módulo** en vez de un `if/else`: ya da igual la magnitud, siempre cae dentro
   del rango válido.
3. **Fotograma atascado** (`FRAME_GAP_MAX`): si un fotograma tarda más de 120 ms (cambio de
   pestaña, tirón de GC), ese salto se **descarta** en vez de aplicarse.

Además, mientras el tubo ocupa la pantalla se **frena el scroll de la página**: el
multiplicador de rueda baja a `0,42` y el suavizado de Lenis a `0,055`, entrando y saliendo
**de forma progresiva** para que no se note un corte. Un tirón fuerte **planea** en vez de
saltarse la sección, pero el scroll normal sigue siendo cómodo (~2.200 px/s medidos).

Si quieres tocar la sensación, los cuatro valores están juntos arriba del archivo:
`MAX_LOOPS_PER_FRAME`, `FRAME_GAP_MAX`, `LENIS_INTUBE` y `WHEEL_TO_ANGLE`.

Código: [`js/experience.js`](js/experience.js) (Acto A = tumble, Acto B = anillo) y los estilos
de la sección `.oa-choose` + `#chooseUI` en [`css/home.css`](css/home.css).

### 9.2 Ficha de cada coche — `car.html?slug=…`

Cada coche tiene ahora **su propia página** (`car.html?slug=audi-rs6`, etc.), generada desde
`js/fleet.js` por [`js/car.js`](js/car.js):

- **Héroe** (foto + specs + precio/día + botón WhatsApp) · **Especificaciones** completas ·
  **Tabla de tarifas** (1 día → 1 mes) + **fianza** · **destacados** · **galería**.
- **Póster Serres** (`css/car.css`): una recreación **en HTML/CSS** de los pósters de Sicurcars,
  **re-marcados a Serres** con la paleta plata/cromo (marca + modelo + precio día/semana/mes +
  “Barcelona”). No es una imagen editada: se dibuja en vivo, así que cambia solo con los datos.

### 9.3 De dónde salen las imágenes

- **Anillo / héroe de ficha** (`assets/img/cars/ring/*.jpg`, copiadas también a
  `assets/img/cars/*.jpg`): una **foto limpia** por coche, de **Wikimedia Commons** con licencia
  libre (CC0 / CC BY / CC BY-SA). La **atribución** de cada una está en
  [`assets/img/cars/ring/CREDITS.md`](assets/img/cars/ring/CREDITS.md) — las CC BY/CC BY-SA
  **requieren** mantener el crédito. (El G63 y el RS 6 usan tus renders propios.)
- **Galería “En la flota”** (`assets/img/cars/scrape/`): los pósters reales de **@sicurcars**
  descargados tal cual, mapeados a cada coche en [`js/media-map.js`](js/media-map.js).
- Nota: el **Macan** del anillo es un Macan **GTS** (misma carrocería que el Turbo); el resto
  coincide exactamente con el modelo.

---

## 10. Los tres módulos de animación  ⭐ (nuevo)

Tres componentes independientes, cada uno con su `.js` y su `.css`, con nombres de clase
propios (`pt-`, `ink-`, `fg-`) para que no toquen nada del resto del diseño.
**Los tres se degradan bien**: sin JavaScript, sin GSAP o con “reducir movimiento”
activado, la web sigue siendo navegable y **ningún contenido queda escondido**.

### 10.1 Transiciones entre páginas — `js/transitions.js`

Al pulsar un enlace interno, la página actual se **desplaza a la izquierda**
encogiéndose y atenuándose, mientras la siguiente **entra desde la derecha**,
sin recargar el navegador (`fetch` + `history.pushState`).

- Se intercambia solo lo que hay dentro de **`<div id="page-root">`**. La cabecera, el menú
  de tinta, el botón flotante de WhatsApp y los `<script>` quedan fuera y **no se tocan**.
- Si añades una página nueva, **cópiale ese envoltorio y la misma lista de `<script>`**,
  o quedará fuera del sistema (sería un viaje de ida sin vuelta).
- **`index.html` está excluida a propósito**: arranca three.js + Lenis, que no se pueden
  reiniciar después de un intercambio de DOM. Los enlaces a la portada hacen una carga
  normal. Es intencionado, no un fallo.
- Si algo falla (red caída, un módulo que peta), hay dos temporizadores de seguridad que
  desbloquean la página, y como último recurso hace una **carga normal**. Nunca se queda
  en blanco.

### 10.2 Menú móvil “mancha de tinta” — `js/nav-ink.js`

El botón circular de la cabecera abre el menú con una **mancha oscura que se expande**
desde el propio botón hasta llenar la pantalla, revelando los enlaces en sincronía.
Son dos capas (un `<circle>` en un `clipPath` de SVG y un `clip-path: circle()` en CSS)
movidas por **una sola línea de tiempo de GSAP**.

- Sustituye al antiguo menú hamburguesa. Aparece por debajo de **860 px** de ancho.
- Accesible: se abre con teclado, atrapa el tabulador dentro del menú, se cierra con
  **Esc**, y bloquea el desplazamiento del fondo mientras está abierto.

### 10.3 Galería de la flota — `js/fleet-gallery.js`

Los coches se muestran **de dos en dos**. Al mover el ratón sobre una fila, los dos
paneles **se reparten el ancho** con inercia (uno crece mientras el otro encoge).
Al pasar por encima de un coche, la foto **se amplía** y aparece **su nombre y su precio**
(antes están ocultos). Al hacer clic se abre **su página** (`car.html?slug=…`).

- **Filtros como los de Sicurcars**: *Tipo de coche* (Todos · Deportivo · SUV · Lujo ·
  Descapotable) y *Marca* (se construye sola a partir de los datos). **Se combinan** entre
  sí y muestran el número de resultados. La URL se actualiza (`fleet.html?cat=SUV&brand=Audi`),
  así que se puede compartir.
- En **móvil/táctil** pasa a un coche por fila y **los nombres se ven siempre**
  (el efecto de ratón no tendría sentido).
