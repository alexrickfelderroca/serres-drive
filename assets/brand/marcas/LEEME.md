# Logos de las seis marcas

Deja aquí los SVG con **exactamente** estos nombres:

```
porsche.svg
lamborghini.svg
mercedes-amg.svg
audi.svg
range-rover.svg
volkswagen.svg
```

Con que esté el archivo, `_build/build-site.js` lo mete solo en la tarjeta de
esa marca de la portada al regenerar. Se pueden ir poniendo de uno en uno: la
marca que no tenga SVG sigue mostrándose como ahora (foto + nombre), sin
romperse.

## Cómo tienen que ser

- **SVG**, no PNG ni JPG. Es un logo: tiene que verse nítido en pantalla retina
  y a cualquier tamaño.
- **Fondo transparente**, sin rectángulo blanco ni negro detrás.
- **De un solo color, o monocromo.** La web los pinta en blanco
  (`filter: brightness(0) invert(1)`), así que un logo a todo color se verá
  igualmente blanco. Si la marca tiene una versión "monocroma" o "para fondo
  oscuro" en su press kit, ésa es la buena.
- Con `viewBox` y **sin** `width`/`height` fijos en el propio archivo.
- Recortado al contenido, sin márgenes vacíos alrededor: el aire lo pone el CSS.

## De dónde salen

De los *press kit* / *brand portal* de cada marca, o de los que os pase el
proveedor. **No los descargues de un banco de iconos cualquiera**: suelen venir
deformados, mal trazados o con la versión antigua del logo.

## Altura óptica

Cada logo se alinea a mano en `LOGO_H`, dentro de `_build/build-site.js`. No se
puede usar la misma altura para todos: el escudo de Porsche es vertical y las
cuatro aros de Audi son una tira horizontal, así que con la misma `height` el
Porsche se comería la tarjeta. Los valores de partida son:

| Marca | Altura |
|---|---|
| porsche | 54 px |
| lamborghini | 52 px |
| mercedes-amg | 44 px |
| audi | 26 px |
| range-rover | 30 px |
| volkswagen | 44 px |

Cuando estén los seis archivos se miran juntos en la portada y se retocan esos
números hasta que **parezcan** del mismo tamaño, que no es lo mismo que serlo.
