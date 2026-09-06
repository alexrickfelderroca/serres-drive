# Pendiente de confirmar con el propietario

Todo lo demás del encargo (`serresdrive-claude-code-task_2.md`) está
implementado. Estos puntos **no se han inventado**: donde falta el dato, la web
dice que se confirma por WhatsApp, o usa el dato que ya venía del propietario.

Ordenado por lo que más daño hace si está mal.

---

## 1. El teléfono / WhatsApp — ¿es de Serres Drive o del wrap center?

**Estado en la web:** se usa `+34 621 24 44 69` en todos los CTA, el `tel:` del
pie y el schema.

El encargo (BLOQUEADORES 1 y 2) pide un número propio de Serres Drive y prohíbe
usar los contactos del wrap center. **No se ha entregado ningún número nuevo**,
y este es el que ya estaba en la web y en el README anterior como canal de
reservas.

Se ha mantenido a propósito: poner un placeholder tipo `+34 600 000 000` en un
sitio en producción significa perder todas las reservas hasta que llegue el
número bueno. Eso es peor que el problema que el encargo quiere evitar.

- ✅ `info@serreswrapcenter.es` **eliminado de toda la web**. No se ha inventado
  ningún correo nuevo: hoy el único canal de contacto es WhatsApp.
- ⚠️ **Confirmar si `+34 621 24 44 69` es la línea de Serres Drive.** Si es la
  del wrap center, hay que sustituirlo en `_build/fleet-base.json` →
  `contact.whatsapp` y `contact.phoneDisplay`, y regenerar.
- ⚠️ Confirmar también la dirección postal (`Av. Can Fatjó dels Aurons 15, Sant
  Cugat del Vallès`), que va en el schema `AutoRental`.

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

**No se han puesto logos.** No hay SVG con licencia de Porsche, Lamborghini,
Mercedes-AMG, Audi, Range Rover ni Volkswagen a los que se pueda recurrir, y
dibujarlos a mano habría dado tres correctos (Audi, Mercedes, VW son geometría
pura) y tres aproximaciones malas (el escudo de Porsche, el toro de
Lamborghini). Un set inconsistente se ve peor que no tenerlo.

En su lugar, cada tarjeta lleva **la foto de un coche de esa marca + el nombre
en grande**, y sigue leyéndose como botón (borde, hover, foco, cursor). Si el
propietario consigue los SVG de los press kit, entran sin tocar la maqueta.

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
