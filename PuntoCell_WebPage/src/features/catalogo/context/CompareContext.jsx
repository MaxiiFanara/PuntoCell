import { createContext, useContext, useEffect, useState } from 'react';

const CompareContext = createContext();

export const useCompare = () => useContext(CompareContext);

export const MAX_COMPARAR = 3;

// Solo celulares y tablets tienen ficha técnica en el comparador.
export const esComparable = (product) =>
  ['smartphone', 'tablet'].includes((product?.category || '').toLowerCase().trim());

const STORAGE_KEY = 'puntoCell_compare';

export const CompareProvider = ({ children }) => {
  const [ids, setIds] = useState(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(guardado) ? guardado.slice(0, MAX_COMPARAR) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Sin localStorage la selección vive solo mientras la pestaña esté abierta.
    }
  }, [ids]);

  const isSelected = (id) => ids.includes(String(id));
  const isFull = ids.length >= MAX_COMPARAR;

  const toggle = (id) => {
    const key = String(id);
    setIds((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      return prev.length >= MAX_COMPARAR ? prev : [...prev, key];
    });
  };

  const remove = (id) => setIds((prev) => prev.filter((x) => x !== String(id)));
  const clear = () => setIds([]);

  return (
    <CompareContext.Provider value={{ ids, isSelected, isFull, toggle, remove, clear }}>
      {children}
    </CompareContext.Provider>
  );
};
