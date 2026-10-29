import { useMemo, useState } from 'react';

import CatalogSection from './CatalogSection';
import { useProducts } from '../context/ProductContext';

const ESTADO_INICIAL = { search: '', category: 'Todos', orden: 'relevancia' };
const ITEMS_PER_PAGE = 12;

const COMPARADORES = {
  relevancia: () => 0,
  'precio-asc': (a, b) => a.price - b.price,
  'precio-desc': (a, b) => b.price - a.price,
  nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
};

export default function CatalogPage() {
  const { products, loading } = useProducts();
  const [filtros, setFiltros] = useState(ESTADO_INICIAL);
  const [page, setPage] = useState(1);

  const setFiltro = (clave) => (valor) => { setFiltros((f) => ({ ...f, [clave]: valor })); setPage(1); }

  const limpiarFiltros = () => {
    setFiltros(ESTADO_INICIAL);
    setPage(1);
  };

  // El catálogo lista únicamente productos con stock: búsqueda, orden y categorías
  // se aplican sobre este conjunto.
  const disponibles = useMemo(() => products.filter((p) => p.stock > 0), [products]);

  const categories = useMemo(
    () => ['Todos', ...new Set(disponibles.map((p) => p.category).filter(Boolean))],
    [disponibles]
  );

  const filtered = useMemo(() => {
    const { search, category, orden } = filtros;
    const q = search.trim().toLowerCase();

    const matches = disponibles.filter((p) => {
      if (category !== 'Todos' && p.category !== category) return false;
      if (!q) return true;
      return [p.name, p.description, p.category].some((campo) => campo?.toLowerCase().includes(q));
    });

    return matches.sort(COMPARADORES[orden] || COMPARADORES.relevancia);
  }, [disponibles, filtros]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <CatalogSection
      categories={categories}
      products={disponibles}
      filtros={filtros}
      setSearch={setFiltro('search')}
      setCategory={setFiltro('category')}
      setOrden={setFiltro('orden')}
      limpiar={limpiarFiltros}
      filtered={paginatedProducts}
      totalFiltered={filtered.length}
      totalCount={disponibles.length}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={(e, value) => setPage(value)}
    />
  );
}
