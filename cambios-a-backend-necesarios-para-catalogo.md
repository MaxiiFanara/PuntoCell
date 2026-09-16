# Cambios a backend necesarios para el catálogo

Nota de traspaso para el equipo de backend. Resume lo que esta rama
(`feat/mejora-catalogo-landing`) tocó en `PuntoCell_API` y lo que queda
pendiente de su lado. Archivo temporal: se puede borrar una vez revisado.

---

## 1. Cambio ya aplicado en esta rama

**Archivo:** `PuntoCell_API/src/modules/catalogo/catalogo.service.js`
**Commit:** `c0b392f` — "Expone la categoria real del producto en el catalogo publico"

### Problema

El filtro de categorías del catálogo público no agrupaba nada útil. El endpoint
devolvía en `category` el nombre del **modelo** (`iPhone 15 Pro`, `Galaxy S24`),
no el tipo de producto. Con un modelo por producto, cada producto terminaba
siendo prácticamente su propia categoría.

### Qué se cambió

Se amplía el `include` de `modelo` para traer también su `categoria`. La
asociación ya existía en los modelos de Sequelize, así que no se tocó el modelo
de datos, ni las asociaciones, ni la base.

El objeto de salida pasa a exponer dos campos separados en lugar de uno ambiguo:

| Campo       | Origen                    | Uso                                  |
|-------------|---------------------------|--------------------------------------|
| `categoria` | `CategoriaProducto.Nombre`| Agrupar y filtrar                    |
| `modelo`    | `ModeloProducto.Nombre`   | Mostrar. No sirve para filtrar       |

### Cambio de contrato (romper cuidado)

`GET /api/catalogo/productos` **ya no devuelve `category`**. Cualquier otro
consumidor que lea ese campo va a recibir `undefined` sin error visible.

```jsonc
// antes
{ "id": "4", "name": "Apple iPhone 14 Pro", "category": "iPhone 14 Pro" }

// ahora
{ "id": "4", "name": "Apple iPhone 14 Pro", "categoria": "smartphone", "modelo": "iPhone 14 Pro" }
```

Hasta donde se relevó, el único consumidor es el frontend público, que ya está
adaptado. Conviene confirmarlo antes de mergear.

### Cómo revertir

El cambio está acotado a dos lugares del mismo archivo y tiene comentarios en el
código: el `include` de la asociación `categoria` y el objeto que se retorna en
el `map`. Revirtiendo esos dos bloques vuelve el comportamiento anterior.

---

## 2. Pendiente del lado de backend (no se tocó)

### 2.1 El campo `priceUsd` devuelve pesos

En el mismo endpoint, el campo se llama `priceUsd` pero lo que sale es
`PrecioArticulo.ValorFinal`, que está guardado **en pesos**:

| Producto           | `ValorFinal` en la base |
|--------------------|-------------------------|
| Apple iPhone 14 Pro| 1871100.00              |
| Apple iPhone 13    | 1360800.00              |
| Funda Silicona     | 3024.00                 |

Son precios en pesos, no en dólares. El nombre del campo indujo al frontend a
multiplicar el valor por la cotización del dólar, y toda la vitrina mostraba
precios 1450 veces más altos (el iPhone 14 Pro aparecía a $2.713.095.000).

Ya se corrigió del lado del frontend: ahora el valor se usa tal cual llega. Pero
el nombre del campo sigue mintiendo y es una trampa para el próximo que lo
consuma.

**Sugerencia:** renombrar `priceUsd` a `precio` (o `precioArs`), o bien definir
que `ValorFinal` pase efectivamente a dólares y convertir en un solo lugar. Si
se decide lo segundo, hay que volver a multiplicar por la cotización en
`PuntoCell_WebPage/src/features/catalogo/context/ProductContext.jsx`, donde
quedó un comentario avisando.

### 2.2 No hay campo de imagen de producto

Ni `Producto` ni `Inventario` tienen columna de imagen. Mientras tanto el
catálogo dibuja un ícono por categoría como placeholder. Para fotos reales hace
falta campo en la base, endpoint de upload y storage.

### 2.3 El endpoint no está documentado

`GET /api/catalogo/productos` no figura en `PuntoCell_API/GUIA_TESTING_ENDPOINTS.md`.
Al ser el único endpoint público (sin login) del sistema, convendría que esté.

---

## 3. Trabajo de frontend en esta rama

Todo dentro de `PuntoCell_WebPage/`. Resumen de lo que se hizo:

**Correcciones de comportamiento**

- El scroll no volvía al tope al entrar al detalle de un producto. Se resuelve
  en el layout del catálogo, así cubre también los enlaces que vienen de la landing.
- No había tope de stock en ningún lado: se podían cargar 50 unidades de un
  producto con stock 2. El límite ahora vive en `CartContext`, que es por donde
  pasan los tres lugares que agregan al carrito (tarjeta, detalle y carrito).
- Se agregó el selector de cantidad en el detalle, que no existía.
- El botón flotante de WhatsApp estaba encima del switch de tema y lo tapaba,
  por eso no se podía volver a modo claro desde el catálogo. Ahora se apilan.
- Varias lecturas de `theme.palette.*` en JS quedaban congeladas en el esquema
  claro (el tema usa `cssVariables`), y en modo oscuro salía texto negro sobre
  fondo oscuro. Se pasaron a `theme.vars.palette.*`.
- El panel del carrito tenía el fondo blanco fijo y era ilegible en modo oscuro.

**Rediseño**

- Landing y catálogo compartían dos barras y dos pies de página distintos. Ahora
  hay uno de cada uno. La barra del catálogo además pedía la tipografía
  `Playfair Display`, que nunca se carga: `index.html` sólo trae Archivo e IBM
  Plex Mono, así que caía a un serif del sistema.
- El catálogo abría con un bloque de bienvenida que ocupaba la primera pantalla.
  Ahora entra directo al listado, con buscador, orden, filtro por disponibilidad,
  categorías y breadcrumbs.
- La grilla del catálogo y la vitrina de la landing usaban dos tarjetas distintas,
  con el precio en gris en una y en verde en la otra. Ahora es un solo componente.
- El placeholder de imagen no tenía proporción propia y heredaba la del
  contenedor, por eso en el detalle salía como una tira vertical.
- Se actualizaron los integrantes en la sección de equipo de la landing.

**Datos**

- Los colores llegan en minúscula desde la base y se muestran capitalizados.
- El ícono de disponibilidad mostraba un tilde incluso cuando no había stock.
