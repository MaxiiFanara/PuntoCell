import { createContext, useContext, useState, useEffect } from 'react';
import { catalogoService } from '../../../services/catalogoServices';

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const SUCURSAL_CATALOGO = 1;

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);

        // Endpoint público (sin login): ya viene filtrado a productos
        // vendibles/activos y sin datos internos sensibles (costo, proveedor, IMEI).
        const { productos, cotizacionDolar } = await catalogoService.getProductos(SUCURSAL_CATALOGO);

        const productosAdaptados = (productos || []).map((p) => ({
          id: p.id,
          name: p.name,
          description: `${p.modelo || p.categoria}${p.memoria ? ' - Memoria: ' + p.memoria : ''}${p.color ? ' - Color: ' + p.color : ''}`,
          price: p.priceUsd * (cotizacionDolar || 1),
          comparePrice: null,
          category: p.categoria,
          gallery: [],
          stock: p.stock,
          material: p.color || 'Estándar',
          dimensions: p.memoria ? `Memoria: ${p.memoria}` : null,
          featured: p.stock > 0,
          promotions: p.esSerializado ? ['Único'] : []
        }));

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
