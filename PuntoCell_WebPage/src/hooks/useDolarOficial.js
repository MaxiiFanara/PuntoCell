import { useState, useEffect } from 'react';
import { getDolarOficial } from '../services/dolarService';

// Dólar oficial (referencia, dolarapi.com). Carga al montar y refresca cada 10 min.
// Devuelve { dato: {compra, venta, fechaActualizacion, nombre} | null, cargando }.
export const useDolarOficial = () => {
  const [dato, setDato] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      const d = await getDolarOficial();
      if (!vivo) return;
      setDato(d);
      setCargando(false);
    };
    cargar();
    const id = setInterval(cargar, 10 * 60 * 1000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  return { dato, cargando };
};
