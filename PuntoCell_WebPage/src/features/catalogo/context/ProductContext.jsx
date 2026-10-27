import { createContext, useContext, useState, useEffect } from 'react';
import { catalogoService } from '../../../services/catalogoServices';

// "titanio negro" -> "Titanio Negro"
const capitalizar = (texto) =>
  (texto || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');

// Bucket de imágenes del catálogo. La base guarda solo la ruta relativa
// ("smartphones/apple-iphone-11.webp"); acá se le antepone el dominio.
const IMAGES_BASE_URL = (
  import.meta.env.VITE_CATALOGO_IMAGES_URL ||
  'https://puntocell-catalogo-imagenes-2.s3.us-east-2.amazonaws.com/'
).replace(/\/+$/, '');

const urlImagen = (img) => (img.startsWith('http') ? img : `${IMAGES_BASE_URL}/${img}`);

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);

        // Endpoint público (sin login): ya viene filtrado a productos
        // vendibles/activos y sin datos internos sensibles (costo, proveedor, IMEI).
        // Sin sucursal: se muestra el stock de las dos sedes, y cada producto
        // dice de cuál viene.
        const { productos } = await catalogoService.getProductos();

        const productosAdaptados = (productos || []).map((p) => {
          // La base guarda los colores en minúscula ("titanio negro"). Se
          // capitaliza acá, una vez, y no en cada vista que lo muestra.
          const color = capitalizar(p.color);
          p = { ...p, memoria: p.almacenamiento || p.memoria };
          return {
            id: p.id,
            name: p.name,
            description: `${p.modelo || p.categoria}${p.memoria ? ' - Memoria: ' + p.memoria : ''}${color ? ' - Color: ' + color : ''}`,
            price: p.priceUsd,
            comparePrice: null,
            category: p.categoria,
            imagenes: (p.imagenes || []).map(urlImagen),
            imagenPortada: p.imagenPortada ? urlImagen(p.imagenPortada) : null,
            gallery: (p.imagenes || []).map(urlImagen),
            stock: p.stock,
            material: color || 'Estándar',
            sucursal: p.sucursal,
            dimensions: p.memoria ? `Memoria: ${p.memoria}` : null,
            promotions: p.esSerializado ? ['Único'] : [],
          };
        });

        const productosValidos = productosAdaptados.filter(p => p.price > 0);
        setProducts(productosValidos);
      } catch (error) {
        console.error("Error al cargar productos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  const getCategories = () => {
    const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];
    return categories;
  };

  return (
    <ProductContext.Provider value={{ products, getCategories, loading }}>
      {children}
    </ProductContext.Provider>
  );
};
