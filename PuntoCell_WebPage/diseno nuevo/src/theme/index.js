import { createTheme } from '@mui/material/styles'

// Único tema del sistema. Traduce los tokens de mockups/mockup-financiero-azul-verde.html.
// Ver PuntoCell/docs/plan-rediseno-frontend.md para el contrato completo.

export const MONO = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace'
export const SANS = 'Archivo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

export const ROW_HEIGHT = 46
export const CONTROL_HEIGHT = 32

const light = {
  primary:   { main: '#12684e', light: '#e7f1ec', dark: '#0d5240', contrastText: '#ffffff' },
  secondary: { main: '#625e57', light: '#f0eee9', dark: '#3f3c37', contrastText: '#ffffff' },
  success:   { main: '#12684e', light: '#e7f1ec', dark: '#0d5240', contrastText: '#ffffff' },
  warning:   { main: '#9a6510', light: '#fbf1df', dark: '#7a5008', contrastText: '#ffffff' },
  error:     { main: '#a93b32', light: '#faebe9', dark: '#872e26', contrastText: '#ffffff' },
  info:      { main: '#12684e', light: '#e7f1ec', dark: '#0d5240', contrastText: '#ffffff' },
  background: { default: '#f6f5f2', paper: '#ffffff' },
  text:      { primary: '#1d1b18', secondary: '#625e57', disabled: '#918c83' },
  divider:   '#e7e4de',
  pc: {
    surfaceMuted: '#fbfaf8',
    dividerSoft:  '#f0eee9',
    accentSoft:   '#e7f1ec',
    lift:    '0 1px 1px rgba(15,23,41,.04), 0 2px 8px -3px rgba(15,23,41,.08)',
    liftPop: '0 2px 4px rgba(15,23,41,.08), 0 24px 48px -16px rgba(15,23,41,.32)',
  },
}

const dark = {
  primary:   { main: '#4cbf93', light: '#163026', dark: '#3aa87d', contrastText: '#0f1f19' },
  secondary: { main: '#a39d93', light: '#26231e', dark: '#7a746a', contrastText: '#141311' },
  success:   { main: '#4cbf93', light: '#163026', dark: '#3aa87d', contrastText: '#0f1f19' },
  warning:   { main: '#dfa758', light: '#2c2317', dark: '#c08d42', contrastText: '#141311' },
  error:     { main: '#e88478', light: '#2e1b18', dark: '#c96a5f', contrastText: '#141311' },
  info:      { main: '#4cbf93', light: '#163026', dark: '#3aa87d', contrastText: '#0f1f19' },
  background: { default: '#141311', paper: '#1c1a17' },
  text:      { primary: '#f0ede7', secondary: '#a39d93', disabled: '#7a746a' },
  divider:   '#2e2b26',
  pc: {
    surfaceMuted: '#221f1b',
    dividerSoft:  '#26231e',
    accentSoft:   '#163026',
    lift:    '0 1px 1px rgba(0,0,0,.3), 0 2px 8px -3px rgba(0,0,0,.5)',
    liftPop: '0 2px 4px rgba(0,0,0,.4), 0 24px 48px -16px rgba(0,0,0,.72)',
  },
}

const theme = createTheme({
  cssVariables: { cssVarPrefix: 'pc', colorSchemeSelector: 'data' },
  colorSchemes: {
    light: { palette: light },
    dark:  { palette: dark },
  },
  shape: { borderRadius: 10 },
  // Escala anclada al mockup: base 13px sobre htmlFontSize 16 (13/16 = .8125rem).
  // Todas las variantes van explícitas, por eso no se toca `fontSize` — ese campo
  // reescala las variantes por defecto y acá no hay ninguna por defecto.
  typography: {
    fontFamily: SANS,
    htmlFontSize: 16,
    h1: { fontSize: '2rem',      fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.1 },
    h2: { fontSize: '1.75rem',   fontWeight: 600, letterSpacing: '-.03em',  lineHeight: 1.15 },
    h3: { fontSize: '1.5625rem', fontWeight: 600, letterSpacing: '-.028em', lineHeight: 1.15 },
    h4: { fontSize: '1.4375rem', fontWeight: 600, letterSpacing: '-.025em', lineHeight: 1.2 },
    h5: { fontSize: '1.1875rem', fontWeight: 600, letterSpacing: '-.02em' },
    h6: { fontSize: '.95rem',    fontWeight: 600, letterSpacing: '-.01em' },
    subtitle1: { fontSize: '.84rem', fontWeight: 600 },
    subtitle2: { fontSize: '.8rem',  fontWeight: 600 },
    body1: { fontSize: '.8125rem', lineHeight: 1.45 },
    body2: { fontSize: '.78rem',   lineHeight: 1.45 },
    caption: { fontSize: '.72rem' },
    button: { fontWeight: 600, letterSpacing: 0 },
    // Eyebrow: la etiqueta chica en mayúsculas que encabeza cada bloque del mockup.
    eyebrow: {
      fontFamily: SANS,
      fontSize: '.59rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.11em',
      lineHeight: 1.4,
    },
  },
  components: {
    // Ojo: en CssBaseline el callback recibe el tema directo, no { theme }.
    MuiCssBaseline: {
      styleOverrides: (t) => ({
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        // Números, IMEI, fechas e IDs. Espejo de la clase .mono del mockup.
        '.mono': { fontFamily: MONO, fontVariantNumeric: 'tabular-nums' },
        '.num':  { fontVariantNumeric: 'tabular-nums' },
        ':focus-visible': {
          outline: `2px solid ${t.vars.palette.primary.main}`,
          outlineOffset: 2,
          borderRadius: 4,
        },
      }),
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeSmall:  { height: 27, padding: '0 10px', fontSize: '.75rem', borderRadius: 7 },
        sizeMedium: { height: CONTROL_HEIGHT, padding: '0 12px', fontSize: '.8125rem' },
        sizeLarge:  { height: 38, padding: '0 18px', fontSize: '.875rem' },
        outlined: ({ theme: t }) => ({
          borderColor: t.vars.palette.divider,
          color: t.vars.palette.text.primary,
          '&:hover': {
            borderColor: t.vars.palette.text.disabled,
            background: t.vars.palette.pc.surfaceMuted,
          },
        }),
        text: ({ theme: t }) => ({
          color: t.vars.palette.text.secondary,
          '&:hover': {
            background: t.vars.palette.pc.surfaceMuted,
            color: t.vars.palette.text.primary,
          },
        }),
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundImage: 'none',
          border: `1px solid ${t.vars.palette.divider}`,
          boxShadow: t.vars.palette.pc.lift,
        }),
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: ({ theme: t }) => ({
          ...t.typography.eyebrow,
          color: t.vars.palette.text.disabled,
          background: t.vars.palette.pc.surfaceMuted,
          borderBottom: `1px solid ${t.vars.palette.divider}`,
          padding: '8px 14px',
          whiteSpace: 'nowrap',
        }),
        body: ({ theme: t }) => ({
          fontSize: '.8125rem',
          height: ROW_HEIGHT,
          padding: '0 14px',
          color: t.vars.palette.text.primary,
          borderBottom: `1px solid ${t.vars.palette.pc.dividerSoft}`,
        }),
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          '&:hover td': { background: t.vars.palette.pc.surfaceMuted },
          '&:last-child td': { borderBottom: 0 },
        }),
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '.72rem', height: 23, borderRadius: 999 },
        sizeSmall: { height: 21, fontSize: '.7rem' },
        label: { paddingLeft: 10, paddingRight: 10 },
      },
    },

    MuiTextField: { defaultProps: { size: 'small' } },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 7,
          fontSize: '.78rem',
          background: t.vars.palette.pc.surfaceMuted,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.vars.palette.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.vars.palette.text.disabled },
          '&.Mui-focused': {
            background: t.vars.palette.background.paper,
            boxShadow: `0 0 0 3px ${t.vars.palette.pc.accentSoft}`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: t.vars.palette.primary.main,
            borderWidth: 1,
          },
        }),
        // Se dimensiona con padding y minHeight, NO con un `height` fijo: un
        // TextField renderiza un <input> (centra su texto solo) pero un Select
        // renderiza un <div>, y ahí un height rígido con padding 0 lo colapsa.
        inputSizeSmall: {
          minHeight: CONTROL_HEIGHT,
          boxSizing: 'border-box',
          padding: '7px 11px',
        },
      },
    },

    // El control cerrado necesita reglas propias: hereda de OutlinedInput pero
    // su nodo interno es un div, no un input.
    MuiSelect: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        select: {
          display: 'flex',
          alignItems: 'center',
          minHeight: `${CONTROL_HEIGHT}px !important`,
          boxSizing: 'border-box',
          paddingRight: '30px !important',
        },
        icon: ({ theme: t }) => ({ color: t.vars.palette.text.disabled, right: 7 }),
      },
    },

    // El menú desplegado antes se veía bien solo porque heredaba MuiPaper.
    // Acá queda explícito y alineado con la escala densa del resto.
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          marginTop: 4,
          borderRadius: 9,
          boxShadow: t.vars.palette.pc.liftPop,
        }),
        list: { padding: 4 },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontSize: '.8125rem',
          minHeight: CONTROL_HEIGHT,
          borderRadius: 6,
          padding: '6px 10px',
          '&:hover': { background: t.vars.palette.pc.surfaceMuted },
          '&.Mui-selected': {
            background: t.vars.palette.pc.accentSoft,
            color: t.vars.palette.primary.main,
            fontWeight: 600,
            '&:hover': { background: t.vars.palette.pc.accentSoft },
          },
        }),
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme: t }) => ({ fontSize: '.78rem', color: t.vars.palette.text.disabled }),
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: 13,
          boxShadow: t.vars.palette.pc.liftPop,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontSize: '.95rem',
          fontWeight: 600,
          letterSpacing: '-.015em',
          padding: '15px 16px 12px',
          borderBottom: `1px solid ${t.vars.palette.pc.dividerSoft}`,
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '15px 16px',
          // MUI define `.MuiDialogTitle-root + & { paddingTop: 0 }`, un selector
          // compuesto que le gana al padding plano de arriba. Sin esto el
          // contenido queda pegado al título.
          '.MuiDialogTitle-root + &': { paddingTop: 15 },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          padding: '12px 16px',
          borderTop: `1px solid ${t.vars.palette.pc.dividerSoft}`,
          background: t.vars.palette.pc.surfaceMuted,
        }),
      },
    },

    // Los grupos de toggle son filtros, no una barra de herramientas: van como
    // píldoras sueltas, mismo lenguaje que StatusPill. Sin esto MUI le saca el
    // radio y el borde a los hijos del medio y queda un bloque macizo.
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { flexWrap: 'wrap', gap: '6px' },
        grouped: ({ theme: t }) => ({
          margin: 0,
          border: `1px solid ${t.vars.palette.divider} !important`,
          borderRadius: '999px !important',
        }),
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '.72rem',
          height: 26,
          padding: '0 11px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
          color: t.vars.palette.text.secondary,
          borderColor: t.vars.palette.divider,
          background: t.vars.palette.background.paper,
          '&:hover': { background: t.vars.palette.pc.surfaceMuted, color: t.vars.palette.text.primary },
          '&.Mui-selected': {
            background: t.vars.palette.primary.main,
            color: t.vars.palette.primary.contrastText,
            borderColor: `${t.vars.palette.primary.main} !important`,
            '&:hover': { background: t.vars.palette.primary.dark, color: t.vars.palette.primary.contrastText },
          },
        }),
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 9, fontSize: '.8125rem', fontWeight: 500 },
        standard: ({ theme: t }) => ({ border: `1px solid ${t.vars.palette.divider}` }),
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: ({ theme: t }) => ({ borderColor: t.vars.palette.divider }),
      },
    },

    MuiSnackbar: {
      defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } },
    },
  },
})

export default theme
