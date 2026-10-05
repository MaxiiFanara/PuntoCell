import { useMemo, useState } from 'react';

import CatalogSection from './CatalogSection';
import { useProducts } from '../context/ProductContext';

const ESTADO_INICIAL = { search: '', category: 'Todos', soloStock: false, orden: 'relevancia' };
const ITEMS_PER_PAGE = 12;

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
  const [page, setPage] = useState(1);

  const setFiltro = (clave) => (valor) => { setFiltros((f) => ({ ...f, [clave]: valor })); setPage(1); }

  const limpiarFiltros = () => {
    setFiltros(ESTADO_INICIAL);
    setPage(1);
  };

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

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <CatalogSection
      categories={getCategories()}
      filtros={filtros}
      setSearch={setFiltro('search')}
      setCategory={setFiltro('category')}
      setSoloStock={setFiltro('soloStock')}
      setOrden={setFiltro('orden')}
      limpiar={limpiarFiltros}
      filtered={paginatedProducts}
      totalFiltered={filtered.length}
      totalCount={products.length}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={(e, value) => setPage(value)}
    />
  );
}
