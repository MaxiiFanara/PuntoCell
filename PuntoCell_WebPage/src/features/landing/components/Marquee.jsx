import { Box } from '@mui/material'

import { DISPLAY, ESQUEMA_OSCURO, MENTA, NOCHE } from '../landingTokens'

const FRASES = [
  'Equipos nuevos',
  'Seminuevos verificados',
  'Servicio técnico',
  'Reparaciones en el día',
  'Accesorios',
  'Garantía del local',
  'Tomamos tu usado',
  'Pagá con Mercado Pago',
]

function Tanda({ copia }) {
  return (
    <Box
      component="ul"
      data-copia={copia ? '' : undefined}
      aria-hidden={copia ? 'true' : undefined}
      sx={{ display: 'flex', listStyle: 'none', m: 0, p: 0, flex: 'none' }}
    >
      {FRASES.map((f) => (
        <Box
          component="li"
          key={f}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'clamp(1.25rem, 3vw, 2.5rem)',
            pr: 'clamp(1.25rem, 3vw, 2.5rem)',
            fontFamily: DISPLAY,
            fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)',
            fontWeight: 600,
            letterSpacing: '-.02em',
            whiteSpace: 'nowrap',
            color: 'rgba(255,255,255,.9)',
          }}
        >
          {f}
          <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: MENTA, flex: 'none' }} />
        </Box>
      ))}
    </Box>
  )
}

/** Franja en movimiento con lo que ofrece el local. Decorativa: el detalle está más abajo. */
export default function Marquee() {
  return (
    <Box
      {...ESQUEMA_OSCURO}
      sx={{ bgcolor: NOCHE, py: 2.5, borderTop: '1px solid rgba(255,255,255,.1)', borderBottom: '1px solid rgba(255,255,255,.1)' }}
    >
      <div className="lp-marquee">
        <div className="lp-marquee__track">
          <Tanda />
          <Tanda copia />
        </div>
      </div>
    </Box>
  )
}
