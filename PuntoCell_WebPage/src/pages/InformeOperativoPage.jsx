import { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Button, TextField, Alert, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Skeleton, Collapse, IconButton, useTheme,
} from '@mui/material'
import { BarChart } from '@mui/x-charts'
import PrintIcon from '@mui/icons-material/Print'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PageHeader from '../components/ui/PageHeader'
import StatusPill from '../components/ui/StatusPill'
import FontSizeSelect from '../components/ui/FontSizeSelect'
import { informeOperativoService } from '../services/informeOperativoServices'
import { useAuth } from '../context/AuthContext'

// ── Helpers ────────────────────────────────────────────────────────────────
const aInputLocal = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fmtFecha = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' }) : '—')
const rangoRapido = (horas) => {
  const hasta = new Date()
  return { desde: aInputLocal(new Date(hasta.getTime() - horas * 3600 * 1000)), hasta: aInputLocal(hasta) }
}

const PRIORIDAD_UI = {
  alta:  { label: 'Alta',  tone: 'late' },
  media: { label: 'Media', tone: 'due' },
  baja:  { label: 'Baja',  tone: 'neutral' },
}

const Seccion = ({ titulo, subtitulo, children, sx }) => (
  <Paper sx={{ p: '14px 16px', display: 'flex', flexDirection: 'column', gap: 1.25, ...sx }} className="pc-print-block">
    <Box>
      <Box sx={{
        typography: 'eyebrow', fontSize: '1.05rem', fontWeight: 800, letterSpacing: '.02em',
        textDecoration: 'underline', textUnderlineOffset: '5px', textDecorationThickness: '2px',
        // negro puro en modo claro; en modo oscuro blanco para que siga siendo legible
        color: (t) => (t.palette.mode === 'dark' ? '#fff' : '#000'),
      }}>{titulo}</Box>
      {subtitulo && <Typography sx={{ fontSize: '.76rem', color: 'text.secondary', mt: '1px' }}>{subtitulo}</Typography>}
    </Box>
    {children}
  </Paper>
)

const Vacio = ({ children }) => (
  <Typography sx={{ fontSize: '.82rem', color: 'text.secondary', py: 0.5 }}>{children}</Typography>
)

// ── Grupo de error (expandible) ───────────────────────────────────────────
function FilaGrupo({ g, expandido }) {
  const [abierto, setAbierto] = useState(false)
  const visible = abierto || expandido
  const pr = PRIORIDAD_UI[g.prioridad]
  return (
    <>
      <TableRow hover sx={{ '& td': { borderBottom: visible ? 0 : undefined, verticalAlign: 'top' } }}>
        <TableCell sx={{ width: 36, p: 0.5 }} className="no-print">
          <IconButton size="small" onClick={() => setAbierto((v) => !v)} aria-label="Ver detalle">
            <ExpandMoreIcon sx={{ fontSize: 18, transform: visible ? 'rotate(180deg)' : 'none', transition: '.15s' }} />
          </IconButton>
        </TableCell>
        <TableCell><StatusPill tone={pr.tone} label={pr.label} /></TableCell>
        <TableCell><Chip size="small" label={g.nivel === 'error' ? 'error' : 'warn'} color={g.nivel === 'error' ? 'error' : 'warning'} variant="outlined" /></TableCell>
        <TableCell>{g.modulo}{g.origenModulo && <Typography component="span" sx={{ fontSize: '.68rem', color: 'text.disabled' }}> ({g.origenModulo})</Typography>}</TableCell>
        <TableCell sx={{ maxWidth: 420, wordBreak: 'break-word' }}>
          {g.mensaje}
        </TableCell>
        <TableCell align="right">{g.ocurrencias}</TableCell>
        <TableCell>{fmtFecha(g.primera)}</TableCell>
        <TableCell>{fmtFecha(g.ultima)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0, border: visible ? undefined : 0 }}>
          <Collapse in={visible} unmountOnExit>
            <Box sx={{ p: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 0.75, bgcolor: 'pc.surfaceMuted' }}>
              <Typography sx={{ fontSize: '.78rem' }}><b>Por qué esta prioridad:</b> {g.motivos.join('; ')}.</Typography>
              <Typography sx={{ fontSize: '.78rem' }}>
                <b>Contexto:</b> {g.cantidadUsuarios ? `usuarios afectados (Id): ${g.usuariosAfectados.join(', ')}${g.cantidadUsuarios > g.usuariosAfectados.length ? '…' : ''}` : 'sin usuario asociado'}
                {g.sucursales.length ? ` · sucursales (Id): ${g.sucursales.join(', ')}` : ''}
                {g.ips.length ? ` · IP: ${g.ips.map((i) => i.replace('::ffff:', '')).join(', ')}` : ''}
              </Typography>
              {g.endpoint && <Typography sx={{ fontSize: '.78rem' }}><b>Endpoint:</b> <code>{g.endpoint}</code></Typography>}
              {g.ejemplo?.sqlMessage && <Typography sx={{ fontSize: '.78rem' }}><b>Mensaje SQL:</b> {g.ejemplo.sqlMessage}</Typography>}
              {g.ejemplo?.stack && (
                <Box component="pre" sx={{ m: 0, p: 1, fontSize: '.7rem', overflow: 'auto', maxHeight: 220, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                  {g.ejemplo.stack}
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

// ── Página ────────────────────────────────────────────────────────────────
export default function InformeOperativoPage() {
  const { usuario, cerrarSesion } = useAuth()
  const theme = useTheme()
  const [rango, setRango] = useState(() => rangoRapido(24))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imprimiendo, setImprimiendo] = useState(false)

  const cargar = useCallback(async (r) => {
    setLoading(true); setError('')
    try {
      setData(await informeOperativoService.get(r))
    } catch (e) {
      setError(e.message || 'No se pudo generar el informe.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial (últimas 24 h). `loading` ya arranca en true, por eso no se llama a cargar().
  useEffect(() => {
    let cancelado = false
    informeOperativoService.get(rangoRapido(24))
      .then((d) => { if (!cancelado) setData(d) })
      .catch((e) => { if (!cancelado) setError(e.message || 'No se pudo generar el informe.') })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    const fin = () => setImprimiendo(false)
    window.addEventListener('afterprint', fin)
    return () => window.removeEventListener('afterprint', fin)
  }, [])

  const aplicarRapido = (horas) => { const r = rangoRapido(horas); setRango(r); cargar(r) }
  const imprimir = () => { setImprimiendo(true); setTimeout(() => window.print(), 250) }
  const rangoInvalido = !rango.desde || !rango.hasta || new Date(rango.desde) >= new Date(rango.hasta)

  const labels = data?.linea.puntos.map((p) => {
    const d = new Date(p.t)
    return data.linea.unidad === 'hora'
      ? d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  }) ?? []

  return (
    <Box className="pc-informe" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <style>{`
        @media print {
          /* comprobante.css (catálogo) está cargado en toda la app y oculta todo el body al imprimir
             (body * { visibility: hidden }); acá se revierte solo mientras este informe está montado. */
          html body * { visibility: visible !important; }
          .no-print { display: none !important; }
          .pc-print-block { break-inside: avoid; box-shadow: none !important; }
          /* El papel es claro: en modo oscuro el texto saldría blanco sobre blanco */
          .pc-informe, .pc-informe * { color: #000 !important; background: transparent !important; }
          .pc-informe svg text { fill: #000 !important; }
          .pc-informe { min-height: 0 !important; }
          .pc-informe .MuiPaper-root { border: 1px solid #ccc; }
        }
      `}</style>

      <Box sx={{ maxWidth: 1280, mx: 'auto', p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PageHeader
          eyebrow="Informe técnico"
          title="Estado del sistema"
          meta={data ? `Período: ${fmtFecha(data.periodo.desde)} → ${fmtFecha(data.periodo.hasta)} · generado ${fmtFecha(data.generadoEn)}` : 'Logs internos (Winston) registrados en la bitácora'}
          action={
            <Box className="no-print" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '.78rem', color: 'text.secondary' }}>{usuario?.nombre}</Typography>
              <FontSizeSelect />
              <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={imprimir} disabled={!data}>Exportar PDF</Button>
              <Button size="small" startIcon={<LogoutIcon />} onClick={cerrarSesion}>Cerrar sesión</Button>
            </Box>
          }
        />

        {/* Filtros */}
        <Paper className="no-print" sx={{ p: '12px 16px', display: 'flex', gap: 1.25, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField label="Desde" type="datetime-local" size="small" value={rango.desde}
            onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Hasta" type="datetime-local" size="small" value={rango.hasta}
            onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<RefreshIcon />} disabled={rangoInvalido || loading} onClick={() => cargar(rango)}>Generar</Button>
          <Box sx={{ display: 'flex', gap: 0.75, ml: { md: 'auto' } }}>
            <Button size="small" onClick={() => aplicarRapido(24)}>24 h</Button>
            <Button size="small" onClick={() => aplicarRapido(24 * 7)}>7 días</Button>
            <Button size="small" onClick={() => aplicarRapido(24 * 30)}>30 días</Button>
          </Box>
          {rangoInvalido && <Typography sx={{ width: '100%', fontSize: '.76rem', color: 'error.main' }}>“Desde” debe ser anterior a “Hasta”.</Typography>}
        </Paper>

        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

        {loading && !data ? (
          <Skeleton variant="rounded" height={220} />
        ) : data && (
          <>
            {/* C+D. Investigar primero */}
            <Seccion titulo="Qué investigar primero" subtitulo="Ordenado por prioridad, repeticiones y última ocurrencia">
              {data.investigarPrimero.length === 0 ? (
                <Vacio>No hay problemas de prioridad alta o media en este período.</Vacio>
              ) : data.investigarPrimero.map((g, i) => (
                <Box key={g.clave} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, color: 'text.disabled', minWidth: 18 }}>{i + 1}</Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.25 }}>
                      <StatusPill tone={PRIORIDAD_UI[g.prioridad].tone} label={`Prioridad ${PRIORIDAD_UI[g.prioridad].label.toLowerCase()}`} />
                      <Typography sx={{ fontSize: '.78rem', color: 'text.secondary' }}>{g.modulo} · {g.ocurrencias} {g.ocurrencias === 1 ? 'vez' : 'veces'} · última {fmtFecha(g.ultima)}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '.84rem', wordBreak: 'break-word' }}>{g.mensaje}</Typography>
                    <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>Motivo: {g.motivos.join('; ')}.</Typography>
                  </Box>
                </Box>
              ))}
            </Seccion>

            {/* Línea de tiempo */}
            <Seccion titulo="Evolución en el período" subtitulo={`Errores, advertencias y logins rechazados por ${data.linea.unidad} (UTC)`}>
              <BarChart
                height={220}
                xAxis={[{ scaleType: 'band', data: labels }]}
                series={[
                  { data: data.linea.puntos.map((p) => p.error), label: 'Errores', stack: 'a', color: theme.palette.error.main },
                  { data: data.linea.puntos.map((p) => p.warn), label: 'Advertencias', stack: 'a', color: theme.palette.warning.main },
                  { data: data.linea.puntos.map((p) => p.login), label: 'Logins rechazados', stack: 'a', color: theme.palette.info.main },
                ]}
              />
            </Seccion>

            {/* C. Errores agrupados */}
            <Seccion titulo="Eventos agrupados">
              {data.grupos.length === 0 ? <Vacio>No se registraron errores ni advertencias del sistema en este período.</Vacio> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell className="no-print" />
                        <TableCell>Prioridad</TableCell><TableCell>Nivel</TableCell><TableCell>Módulo</TableCell>
                        <TableCell>Mensaje</TableCell><TableCell align="right">Veces</TableCell>
                        <TableCell>Primera</TableCell><TableCell>Última</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.grupos.map((g) => <FilaGrupo key={g.clave} g={g} expandido={imprimiendo} />)}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Seccion>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
              {/* E. Módulos */}
              <Seccion titulo="Análisis por módulo" subtitulo="Solo eventos técnicos (warn y error)">
                {data.modulos.length === 0 ? <Vacio>Sin eventos.</Vacio> : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Módulo</TableCell><TableCell align="right">Eventos</TableCell><TableCell align="right">Warn</TableCell><TableCell align="right">Errores</TableCell><TableCell align="right">Repetidos</TableCell><TableCell>Último error</TableCell></TableRow></TableHead>
                      <TableBody>
                        {data.modulos.map((m) => (
                          <TableRow key={m.modulo}>
                            <TableCell>{m.modulo}</TableCell><TableCell align="right">{m.eventos}</TableCell>
                            <TableCell align="right">{m.warns}</TableCell><TableCell align="right">{m.errores}</TableCell>
                            <TableCell align="right">{m.erroresRepetidos}</TableCell>
                            <TableCell sx={{ fontSize: '.74rem' }}>{m.ultimoError ? fmtFecha(m.ultimoError.fecha) : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Seccion>

              {/* Rutas */}
              <Seccion titulo="Rutas con más errores y advertencias">
                {data.rutas.length === 0 ? <Vacio>Ninguna ruta registró errores en este período.</Vacio> : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Ruta</TableCell><TableCell align="right">Errores</TableCell><TableCell align="right">Warn</TableCell><TableCell>Última</TableCell></TableRow></TableHead>
                      <TableBody>
                        {data.rutas.map((r) => (
                          <TableRow key={r.ruta}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '.74rem', wordBreak: 'break-all' }}>{r.ruta}</TableCell>
                            <TableCell align="right">{r.errores}</TableCell><TableCell align="right">{r.warns}</TableCell>
                            <TableCell sx={{ fontSize: '.74rem' }}>{fmtFecha(r.ultima)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Seccion>
            </Box>

            {/* Seguridad y accesos */}
            <Seccion titulo="Seguridad y accesos" subtitulo="Intentos de inicio de sesión rechazados (advertencias de login registradas por el sistema)">
              {data.seguridad.total === 0 ? <Vacio>Sin intentos de login rechazados en este período.</Vacio> : (
                <>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Total: ${data.seguridad.total}`} />
                    <Chip size="small" variant="outlined" label={`Contraseña incorrecta: ${data.seguridad.porTipo.contraseñaIncorrecta}`} />
                    <Chip size="small" variant="outlined" label={`Usuario inexistente o inactivo: ${data.seguridad.porTipo.usuarioInexistente}`} />
                    <Chip size="small" variant="outlined" label={`Bloqueo por captcha: ${data.seguridad.porTipo.captcha}`} />
                  </Box>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>IP</TableCell><TableCell align="right">Intentos</TableCell><TableCell align="right">Contraseña</TableCell><TableCell align="right">Inexistente</TableCell><TableCell align="right">Captcha</TableCell><TableCell>Primero</TableCell><TableCell>Último</TableCell></TableRow></TableHead>
                      <TableBody>
                        {data.seguridad.ips.map((x) => (
                          <TableRow key={x.ip}>
                            <TableCell>{x.ip}{x.sospechosa && <Chip size="small" color="warning" label="5+ intentos" sx={{ ml: 0.75, height: 18 }} />}</TableCell>
                            <TableCell align="right">{x.total}</TableCell><TableCell align="right">{x.contraseñaIncorrecta}</TableCell>
                            <TableCell align="right">{x.usuarioInexistente}</TableCell><TableCell align="right">{x.captcha}</TableCell>
                            <TableCell sx={{ fontSize: '.74rem' }}>{fmtFecha(x.primera)}</TableCell><TableCell sx={{ fontSize: '.74rem' }}>{fmtFecha(x.ultima)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </>
              )}
            </Seccion>
          </>
        )}
      </Box>
    </Box>
  )
}
