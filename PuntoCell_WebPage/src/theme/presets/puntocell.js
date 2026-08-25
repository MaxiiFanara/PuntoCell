const puntocellTheme = {
  palette: {
    mode: 'light',
    // El azul vibrante de PuntoCell
    primary:    { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8', contrastText: '#fff' },
    secondary:  { main: '#64748b', light: '#94a3b8', dark: '#475569', contrastText: '#fff' },
    
    // Colores de estado
    success:    { main: '#059669', light: '#d1fae5', dark: '#047857', contrastText: '#fff' },
    warning:    { main: '#d97706', light: '#fef3c7', dark: '#b45309', contrastText: '#fff' },
    error:      { main: '#dc2626', light: '#fee2e2', dark: '#b91c1c', contrastText: '#fff' },
    info:       { main: '#0284c7', light: '#e0f2fe', dark: '#0369a1', contrastText: '#fff' },
    
    // Fondos limpios y modernos (Blanco y grises muy claros)
    background: { default: '#f8fafc', paper: '#ffffff' },
    text:       { primary: '#0f172a', secondary: '#475569', disabled: '#94a3b8' },
    divider:    '#e2e8f0',
  },
  
  typography: {
    fontFamily: '"DM Sans", "Inter", "Helvetica Neue", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 700 },
    body1:  { fontSize: '0.9375rem' },
    body2:  { fontSize: '0.875rem' },
    caption:{ fontSize: '0.75rem' },
    button: { fontWeight: 700, letterSpacing: '0.01em' },
  },
  
  shape: { borderRadius: 12 },

  // Estructura custom adaptada a los colores fríos/limpios
  custom: {
    navbar: {
      background: 'rgba(255,255,255,0.82)',
      blur: 'blur(10px)',
      border: '1px solid rgba(0,0,0,0.04)',
    },
    hero: {
      overlay: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 100%)',
      blur: 'rgba(255,255,255,0.05)',
      buttonGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    },
    cards: {
      hover: '0 14px 40px rgba(0,0,0,0.08)',
      border: '#f1f5f9',
      softBackground: '#f8fafc', // Gris muy sutil para chips y fondos secundarios
    },
    footer: {
      background: '#ffffff',
    },
    chips: {
      activeBg: '#2563eb',
      activeColor: '#FFFFFF',
      defaultBg: '#ffffff',
      defaultColor: '#475569',
      hoverBg: '#f1f5f9',
    },
    grid: {
      spacing: 3,
    },
  },

  // Overrides originales con los degradados azules de tu main.jsx
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 700,
          letterSpacing: '0.01em',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          transition: 'all 0.15s ease',
        },
        sizeSmall:  { padding: '5px 14px', fontSize: '0.8rem' },
        sizeMedium: { padding: '8px 20px', fontSize: '0.875rem' },
        sizeLarge:  { padding: '11px 28px', fontSize: '0.9375rem' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: '#ffffff',
          '&:hover': { 
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', 
            transform: 'translateY(-1px)', 
            boxShadow: '0 4px 12px rgba(37,99,235,0.35)' 
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation0: { boxShadow: 'none' },
        elevation1: { boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' },
        elevation2: { boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)' },
        elevation3: { boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.04)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: '#ffffff',
          backgroundColor: '#0f172a',
          borderBottom: 'none',
          paddingTop: 13,
          paddingBottom: 13,
          whiteSpace: 'nowrap',
        },
        body: {
          fontSize: '0.875rem',
          borderBottom: '1px solid #f1f5f9',
          color: '#1e293b',
          paddingTop: 13,
          paddingBottom: 13,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '0.72rem', borderRadius: 7, height: 24 },
        sizeSmall: { height: 22, fontSize: '0.7rem' },
        label: { paddingLeft: 9, paddingRight: 9 },
      },
    },
  },
};

export default puntocellTheme;
