import { createContext, useContext, useState, useEffect } from 'react';
import { catalogoService } from '../../../services/catalogoServices';

// "titanio negro" -> "Titanio Negro"
const capitalizar = (texto) =>
  (texto || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');

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
          return {
            id: p.id,
            name: p.name,
            description: `${p.modelo || p.categoria}${p.memoria ? ' - Memoria: ' + p.memoria : ''}${color ? ' - Color: ' + color : ''}`,
            // `priceUsd` es un nombre engañoso del endpoint: PrecioArticulo.ValorFinal
            // ya viene en PESOS (iPhone 14 Pro = 1.871.100, Funda = 3.024). Multiplicarlo
            // por la cotización lo convertía de nuevo y dejaba toda la vitrina 1450x
            // inflada. Se toma tal cual llega.
            // Si el backend algún día pasa ValorFinal a dólares, acá hay que volver a
            // multiplicar por la cotización; el cambio es de ellos, no nuestro.
            price: p.priceUsd,
            comparePrice: null,
            category: p.categoria,
            gallery: [],
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
