import { useMemo, useState } from 'react';

import CatalogSection from './CatalogSection';
import { useProducts } from '../context/ProductContext';

const ESTADO_INICIAL = { search: '', category: 'Todos', soloStock: false, orden: 'relevancia' };

// Sin stock siempre al fondo, cualquiera sea el orden elegido.
const porStock = (a, b) => (a.stock === 0) - (b.stock === 0);

const COMPARADORES = {
  relevancia: porStock,
  'precio-asc': (a, b) => porStock(a, b) || a.price - b.price,
  'precio-desc': (a, b) => porStock(a, b) || b.price - a.price,
  nombre: (a, b) => porStock(a, b) || a.name.localeCompare(b.name, 'es'),
};

export default function CatalogPage() {
  const { products, getCategories, loading } = useProducts();
  const [filtros, setFiltros] = useState(ESTADO_INICIAL);

  const setFiltro = (clave) => (valor) => setFiltros((f) => ({ ...f, [clave]: valor }));

  const filtered = useMemo(() => {
    const { search, category, soloStock, orden } = filtros;
    const q = search.trim().toLowerCase();

    const matches = products.filter((p) => {
      if (category !== 'Todos' && p.category !== category) return false;
      if (soloStock && !(p.stock > 0)) return false;
      if (!q) return true;
      return [p.name, p.description, p.category].some((campo) => campo?.toLowerCase().includes(q));
    });

    return matches.sort(COMPARADORES[orden] || porStock);
  }, [products, filtros]);

  return (
    <CatalogSection
      categories={getCategories()}
      filtros={filtros}
      setSearch={setFiltro('search')}
      setCategory={setFiltro('category')}
      setSoloStock={setFiltro('soloStock')}
      setOrden={setFiltro('orden')}
      limpiar={() => setFiltros(ESTADO_INICIAL)}
      filtered={filtered}
      totalCount={products.length}
      loading={loading}
    />
  );
}
