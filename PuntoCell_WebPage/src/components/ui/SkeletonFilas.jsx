import { Skeleton, TableCell, TableRow } from '@mui/material';

// Filas de carga para las tablas del sistema. Extraído de TablaReparaciones, que
// ya usaba este patrón: la opacidad baja fila a fila para que la tabla se
// "desvanezca" hacia abajo en vez de cortarse de golpe.
//
// columnas: cantidad de celdas por fila, o un array de anchos para respetar el
// layout real de la tabla (ej. ['auto', 120, 90]).
const SkeletonFilas = ({ filas = 7, columnas = 5 }) => {
  const anchos = Array.isArray(columnas) ? columnas : Array(columnas).fill(null);

  return Array.from({ length: filas }).map((_, i) => (
    <TableRow key={`skeleton-${i}`}>
      {anchos.map((ancho, c) => (
        <TableCell key={c} sx={ancho ? { width: ancho } : undefined}>
          <Skeleton variant="rounded" height={14} sx={{ borderRadius: 1, opacity: 0.5 - i * 0.05 }} />
        </TableCell>
      ))}
    </TableRow>
  ));
};

export default SkeletonFilas;
