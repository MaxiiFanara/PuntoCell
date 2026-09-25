import { useCallback, useRef, useState } from 'react';
import { Box, GlobalStyles, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';

// La transición circular sale del centro del propio botón: las variables --vt-x
// / --vt-y se setean al hacer clic. Van acá y no en el tema porque solo este
// componente las usa.
const estilos = (
  <GlobalStyles
    styles={{
      '::view-transition-old(root)': { animation: 'none', mixBlendMode: 'normal' },
      '::view-transition-new(root)': {
        animation: 'pc-vt-reveal 620ms cubic-bezier(0.4, 0, 0.2, 1) both',
        mixBlendMode: 'normal',
      },
      '@keyframes pc-vt-reveal': {
        from: { clipPath: 'circle(0px at var(--vt-x, 50%) var(--vt-y, 50%))' },
        to: { clipPath: 'circle(200vmax at var(--vt-x, 50%) var(--vt-y, 50%))' },
      },
      '@keyframes pc-icon-pop': {
        from: { transform: 'scale(.4) rotate(-35deg)', opacity: 0 },
        to: { transform: 'scale(1) rotate(0)', opacity: 1 },
      },
      '.pc-icon-pop': { animation: 'pc-icon-pop .38s cubic-bezier(.22,1,.36,1) both' },
      '@media (prefers-reduced-motion: reduce)': {
        '::view-transition-new(root)': { animation: 'none' },
        '.pc-icon-pop': { animation: 'none' },
      },
    }}
  />
);

/**
 * Botón flotante de tema, único para todo el sistema.
 * `useColorScheme` de MUI persiste la elección y respeta la del sistema.
 */
export default function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const [iconKey, setIconKey] = useState(0);
  const fabRef = useRef(null);

  const esOscuro = (mode === 'system' ? systemMode : mode) === 'dark';

  const alternar = useCallback(() => {
    const fab = fabRef.current;
    if (fab) {
      const r = fab.getBoundingClientRect();
      document.documentElement.style.setProperty('--vt-x', `${Math.round(r.left + r.width / 2)}px`);
      document.documentElement.style.setProperty('--vt-y', `${Math.round(r.top + r.height / 2)}px`);
    }
    const aplicar = () => { setMode(esOscuro ? 'light' : 'dark'); setIconKey((k) => k + 1); };
    if (document.startViewTransition) document.startViewTransition(aplicar);
    else aplicar();
  }, [esOscuro, setMode]);

  // Antes de montar, `mode` es undefined y no se sabe el tema real: no se
  // dibuja nada para no mostrar el ícono equivocado por un frame.
  if (!mode) return null;

  return (
    <>
      {estilos}
      <Tooltip title={esOscuro ? 'Modo claro' : 'Modo oscuro'} placement="left">
        <Box
          ref={fabRef}
          onClick={alternar}
          role="button"
          tabIndex={0}
          aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); } }}
          sx={(theme) => ({
            position: 'fixed',
            bottom: '112px',
            right: 28,
            // Queda siempre por encima del launcher del asistente para que no
            // compartan la misma franja visual en el borde inferior derecho.
            zIndex: 1202,
            width: 52, height: 52, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            bgcolor: 'primary.main',
            boxShadow: theme.vars.palette.pc.liftPop,
            transition: 'transform .15s',
            '&:hover': { transform: 'scale(1.10)' },
            '&:active': { transform: 'scale(0.92)' },
            '@media print': { display: 'none' },
          })}
        >
          <Box key={iconKey} className="pc-icon-pop" sx={{ display: 'flex' }}>
            {esOscuro
              ? <LightMode sx={{ color: 'warning.main', fontSize: 24 }} />
              : <DarkMode sx={{ color: 'primary.contrastText', fontSize: 22 }} />}
          </Box>
        </Box>
      </Tooltip>
    </>
  );
}
