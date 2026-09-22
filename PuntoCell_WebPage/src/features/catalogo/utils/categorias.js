// Valores tal como los devuelve CategoriaProducto en la base
// (ver db/init/init.sql, tabla CategoriaProducto).
//
// El mapa de íconos por categoría y `getCategoriaIcon` vivían acá para alimentar
// a ProductImagePlaceholder, que dibujaba un rectángulo gris con un ícono al 45%
// de opacidad en lugar de la foto que la base no tiene. La vitrina ya no usa ese
// relleno: el nombre y el precio ocupan ese lugar. Con el placeholder borrado,
// el mapa quedó sin consumidores.

export const formatCategoria = (categoria) =>
  categoria ? categoria.charAt(0).toUpperCase() + categoria.slice(1) : 'Otros';
