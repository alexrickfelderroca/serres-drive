# Pendiente de confirmar con el propietario

> **Actualizado 06-09-2026.** El propietario ha decidido:
> - **Contacto (punto 1): RESUELTO.** Correo `serresdrive@gmail.com` e Instagram
>   `@serres.drive` ya en la web. **07-09-2026:** el telefono de reservas pasa a
>   ser el del propietario, `+34 649 66 33 80` (WhatsApp, `tel:` y schema), y
>   **la direccion postal desaparece de la web** (contacto, schema y
>   coordenadas): no se puede publicar direccion. Queda solo "Sant Cugat del
>   Vallès, Barcelona" como localidad.
> - **A200 4Matic (punto 3): se deja como esta**, a peticion del propietario.
>   La ficha publica 163 CV y traccion AWD. Queda escrito abajo por si algun dia
>   se quiere corregir.
> - **Porsche rojo del hero (punto 5): se deja como esta.** El hero sigue con el
>   911 Cabrio (992) azul, que es un coche real de la flota.
> - **Logos (punto 7): el propietario los va a enviar.** Ver
>   `assets/brand/marcas/LEEME.md` para nombres, formato y sitio exacto.
> - **Fotos del Urus negro (punto 9): las va a enviar.** Las actuales son del
>   amarillo. Ver el punto 9.

Todo lo demás del encargo (`serresdrive-claude-code-task_2.md`) está
implementado. Estos puntos **no se han inventado**: donde falta el dato, la web
dice que se confirma por WhatsApp, o usa el dato que ya venía del propietario.

Ordenado por lo que más daño hace si está mal.

---

## 1. Contacto — RESUELTO

- Correo: **serresdrive@gmail.com** (pie, pagina de contacto, portada y schema).
- Instagram: **@serres.drive** — ojo, con punto; antes estaba mal como
  `instagram.com/serresdrive/`, que no es la cuenta.
- Telefono / WhatsApp: **+34 649 66 33 80**, confirmado por el propietario.
- `info@serreswrapcenter.es` sigue sin aparecer en ninguna pagina.

Si cambia algo: `_build/fleet-base.json` -> bloque `contact`, y regenerar.

## 2. ¿Los 150 km son por día o por todo el alquiler?

**Estado en la web:** «150 km incluidos», sin unidad de tiempo.

El encargo lo marca como bloqueador (nº 4) porque una condición de contrato no
puede ser aproximada. Se ha escrito sin la unidad justamente para no afirmar
algo que no está confirmado. En cuanto haya respuesta:
`_build/fleet-base.json` → `terms.kmIncluded` / `terms.kmUnitConfirmed`.

## 3. Mercedes A200 4Matic — el nombre y la mecánica no encajan

Este es el dato técnico con más riesgo de los 13.

El Clase A **W177 de 5 puertas nunca se vendió como A 200 gasolina con
4MATIC**. En gasolina, la tracción total empieza en el A 220 4MATIC (190 CV).
Las fotos muestran claramente un 5 puertas. Las posibilidades son:

| Si el coche real es… | Potencia | 0-100 | Tracción |
|---|---|---|---|
| A 200 (1.3 gasolina, W177 5p) | 163 CV | 8,2 s | Delantera |
| A 200 d 4MATIC (2.0 diésel, W177 5p) | 150 CV | 8,4 s | Total |
| A 220 4MATIC (2.0 gasolina) | 190 CV | 6,9 s | Total |

**Ahora mismo la web publica:** 163 CV, 8,2 s, 225 km/h, 7G-DCT, **tracción
AWD**, híbrido ligero. Se ha puesto AWD para no contradecir el propio nombre
del coche («4Matic») dentro de su misma ficha, pero **una de las dos cosas está
mal**. Hace falta mirar el distintivo del portón y decirlo.

El nombre y el slug `mercedes-a200-4matic` no se han tocado: el slug lleva
publicidad apuntando.

## 4. Fianza del Lamborghini Urus y del Audi RS 6 Avant

**Estado en la web:** «Fianza: te la confirmamos por WhatsApp» en la ficha, y
«Por WhatsApp» en la columna de `/tarifas`. **No se ha puesto 2.000 € por
analogía**, como pedía el encargo.

Cuando haya cifra: `_build/fleet-base.json` → `deposit` de esos dos coches.

## 5. El hero: no hay ningún Porsche rojo en las fotos entregadas

El encargo (ETAPA 2 y bloqueador 5) pide un **Porsche rojo con llantas negras o
doradas**, y las dos variantes de llanta para elegir.

**En las carpetas de `Sicur Cars/` no hay ningún Porsche rojo:**

- `Porsche 911` → 911 Cabrio (992) **azul oscuro**, llantas negras
- `911 991` → 911 Carrera S (991) **negro**
- `Porsche Cayenne` → Cayenne **gris tiza**, interior rojo

El mismo encargo dice, y pesa más: «Brать реальную машину из парка… Не
абстрактный сток-Porsche модели, которой у нас нет» — coger un coche real de la
flota, no un Porsche de stock que no tenemos. Así que el hero lleva el **911
Cabrio (992) azul**, que es un coche real de la flota.

**Para hacer lo que pide el encargo hacen falta fotos del Porsche rojo.** Si
existe, con mandarlas se cambia en `_build/image-selection.json` y una línea de
`_build/build-site.js`. Lo de las dos variantes de llanta (negras / doradas) no
se ha podido preparar por lo mismo: no hay coche rojo del que hacerlas.

## 6. Fichas técnicas: 5 coches con variante asumida

Se han buscado y contrastado las cifras oficiales de fabricante para los 13
(cada una verificada después por un segundo pase que corrigió dos: las plazas
del 911 Cabrio, 2 → 4, y las del Cayenne Coupé, 5 → 4). En estos la **cifra es
correcta pero la variante es una suposición** — confirma cuál es el coche real:

| Coche | Variante asumida | Qué cambia si no es esa |
|---|---|---|
| **Porsche 911 Cabrio (992)** | Carrera S Cabriolet (450 CV, 3,9 s) | Si el distintivo pone «Carrera 4S»: tracción total, 3,8 s. Si pone solo «Carrera»: 385 CV |
| **Porsche Cayenne Hybrid** | E-Hybrid Coupé MY2024+ (470 CV, 4,9 s) | Si es de 2019-2023: 462 CV y 5,1 s |
| **Volkswagen Golf 8.5 R** | Mk8.5 estándar (333 CV, 250 km/h) | Con paquete R-Performance la punta sube a 270 km/h |
| **Range Rover Velar** | D200 MHEV diésel (204 CV, 8,3 s) | Cualquier otro motor cambia toda la ficha |
| **Mercedes A200 4Matic** | ver punto 3 | ver punto 3 |

Dos más, menores: el **G 63** se ha fichado como W463A (585 CV, 4,5 s); si la
unidad es MY2024+ es el W465, que hace 4,3 s y es híbrido ligero. El **RS 6**
publica 280 km/h, que solo son reales con el paquete dinámico (sin él, 250).

## 7. Logotipos de las seis marcas

El encargo (ETAPA 3) pide «logotipo (SVG) + nombre en texto» en las tarjetas de
marca de la portada.

**Los va a enviar el propietario.** No hay SVG con licencia de estas seis
marcas a los que se pueda recurrir, y dibujarlos a mano habría dado tres
correctos (Audi, Mercedes y VW son geometría pura) y tres aproximaciones malas
(el escudo de Porsche, el toro de Lamborghini). Un set inconsistente se ve peor
que no tenerlo, así que se esperan los originales.

**El hueco ya está montado.** Deja los seis SVG en `assets/brand/marcas/` con
estos nombres exactos y vuelve a generar:

```
porsche.svg   lamborghini.svg   mercedes-amg.svg
audi.svg      range-rover.svg   volkswagen.svg
```

`brandLogo()` en `_build/build-site.js` sólo pinta el logo **si el archivo
existe**, así que se pueden ir poniendo de uno en uno sin romper nada: la marca
que todavía no tenga SVG se sigue viendo como ahora. Formato, requisitos y
alturas ópticas: `assets/brand/marcas/LEEME.md`.

**Dónde salen:** en las seis tarjetas de marca de la portada (la rejilla 3×2
«Seis marcas en la flota»), encima del nombre. Cada tarjeta mantiene la foto de
fondo y el nombre en texto, como pedía la ETAPA 3.

Las alturas de `LOGO_H` son un punto de partida: cuando estén los seis hay que
mirarlos juntos y retocarlas hasta que **parezcan** iguales de grandes, que no
es lo mismo que serlo.

## 8. Condiciones que la web no menciona (a propósito)

El encargo prohíbe escribir nada sobre **seguro, franquicia, precio del
kilómetro extra y política de cancelación** mientras no haya datos. La web no
los menciona en ninguna página — comprobado automáticamente en
`_build/verify.js`. Cuando existan, añadir a `terms` y a
`/condiciones-de-alquiler/`.

---

## Nota sobre los archivos del propietario

El encargo (ETAPA 0) dice que los datos salen de archivos ya preparados:

```
~/Desktop/GOOGLE ADS/serresdrive/fleet.json
~/Desktop/GOOGLE ADS/serresdrive/seo/seo-meta.json
~/Desktop/GOOGLE ADS/serresdrive/seo/redirects/
~/Desktop/GOOGLE ADS/serresdrive/seo/sitemap.xml
```

**Ninguno existe en este equipo** — `~/Desktop/GOOGLE ADS/` está vacía. Así que
se han construido desde cero:

- `data/fleet.json` — precios, slugs, fianzas y páginas de marca **copiados
  literalmente de la tabla de la ETAPA 0** del propio encargo, que es la misma
  información. Verificado contra ella en `_build/verify.js` (212 comprobaciones).
- `data/seo-meta.json` — **26 páginas**, no 32. El encargo habla de 32 páginas y
  un sitemap de 29 URL; esa cuenta salía del archivo del propietario. La
  estructura que el propio encargo describe (portada + `/flota` + 6 marcas + 13
  coches + 5 páginas fijas) suma 26, y eso es lo que hay. Si aparece el
  `seo-meta.json` original, se sustituye.
- `.htaccess` — **61 destinos 301**, por encima de los 52 del encargo. Si
  aparece el `redirects/` original, conviene compararlos.

Si estos cuatro archivos aparecen, tienen prioridad sobre lo generado.


## 9. Fotos del Lamborghini Urus — son de otro coche

La unidad real es **negra**; las siete fotos de `Sicur Cars/URUS` son del
**amarillo** (Giallo). Están hoy en la tarjeta del catálogo, en la ficha, en el
carrusel de la portada y en la textura del tubo 3D.

Hace falta que el propietario deje en `Sicur Cars/URUS` las del coche negro.
Idealmente:

- **tres cuartos delantera** (es la foto 1 de todas las tarjetas)
- frontal
- tres cuartos trasera
- interior: salpicadero, asientos delanteros, plazas traseras

Los interiores actuales tampoco valen: el amarillo lleva costuras y respaldos
en amarillo, que un coche negro no tendrá.

Con las fotos dentro, se regenera todo de una tirada:

```bash
node _build/build-images.js      # tarjetas y galería
node _build/build-home-assets.js # carrusel + textura del tubo
node _build/build-data.js && node _build/build-seo-meta.js && node _build/build-site.js
```

También hay que corregir la frase comercial, que menciona el color: en
`_build/fleet-specs.json`, `lamborghini-urus.taglineEs` empieza por «En Giallo
y con cinco plazas…», y lo mismo en los cuatro diccionarios de idioma
(`_build/i18n/<idioma>.json` → `cars.lamborghini-urus`).

## 10. Resolución de las fotos: el techo son 1.290 px

Las fotos de la flota son **capturas de móvil de un anuncio**: entre 1.092 y
1.448 px de ancho. En el carrusel de la portada el slide ocupa la pantalla
entera —unos 2.000 px en un portátil— así que hay que ampliarlas.

Ya se hace lo posible (Lanczos + máscara de enfoque, y se parte siempre del
original, no de una copia reducida), y el estiramiento ha bajado de ×1,66 a
×1,11. Pero **por encima de eso no hay detalle que recuperar**.

Si el propietario tiene los originales de la sesión de fotos —o puede pedirlos
a Sicurcars— con 2.500-3.000 px de ancho, el carrusel pasaría a verse nítido
sin tocar una línea de código: basta sustituir los archivos y regenerar.

## 11. Idiomas: qué falta por revisar

La web está en **español, inglés, ruso, catalán y francés**, cada uno con sus
propias URLs. Las traducciones pasaron por un revisor nativo por idioma, que
encontró cosas de fondo — ya corregidas — como que en francés «CV» significa
caballos *fiscales* y la potencia se escribe «ch».

Lo que conviene que revise una persona antes de anunciar en esos mercados:

- **Ruso:** la concordancia de numerales («3 модели» / «5 моделей») se ha
  resuelto con la forma que cubre 2-4, porque las páginas de marca tienen 3 y 4
  coches. Si algún día una marca tiene 5 o más, esa cadena habrá que revisarla.
- **Los mensajes de WhatsApp** (`wa.general`, `wa.car`) son los que le llegan
  al cliente escritos en su idioma. Merece la pena leerlos en voz alta.
- **Los títulos y descripciones de Google** están medidos y dentro de rango,
  pero son lo primero que ve un cliente ruso o francés: si el propietario tiene
  a alguien nativo cerca, que les eche un ojo.
