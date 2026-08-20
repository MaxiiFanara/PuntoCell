import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import App from './App'
import './index.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8', contrastText: '#fff' },
    secondary:  { main: '#64748b', light: '#94a3b8', dark: '#475569' },
    success:    { main: '#059669', light: '#d1fae5', dark: '#047857', contrastText: '#fff' },
    warning:    { main: '#d97706', light: '#fef3c7', dark: '#b45309', contrastText: '#fff' },
    error:      { main: '#dc2626', light: '#fee2e2', dark: '#b91c1c', contrastText: '#fff' },
    info:       { main: '#0284c7', light: '#e0f2fe', dark: '#0369a1', contrastText: '#fff' },
    background: { default: '#eef2f7', paper: '#ffffff' },
    text:       { primary: '#0f172a', secondary: '#475569', disabled: '#94a3b8' },
    divider:    '#e2e8f0',
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", "Helvetica Neue", "Arial", sans-serif',
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
          '&:hover': { background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' },
        },
        containedSuccess: {
          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(5,150,105,0.35)' },
        },
        containedError: {
          background: 'linear-gradient(135deg, #f87171 0%, #b91c1c 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(220,38,38,0.35)' },
        },
        containedInfo: {
          background: 'linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #0ea5e9 0%, #075985 100%)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(2,132,199,0.35)' },
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
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.12s',
          '&:hover': { backgroundColor: '#f8fafc' },
          '&.Mui-selected': {
            backgroundColor: '#eff6ff !important',
            '&:hover': { backgroundColor: '#dbeafe !important' },
          },
          '&:last-child td': { borderBottom: 'none' },
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
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#f8fafc',
            fontSize: '0.875rem',
            transition: 'background-color 0.15s',
            '&:hover': { backgroundColor: '#f1f5f9' },
            '&.Mui-focused': { backgroundColor: '#fff' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb', borderWidth: '2px' },
          },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
          '& .MuiInputLabel-root': { fontSize: '0.875rem', color: '#64748b' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 18, boxShadow: '0 25px 60px rgba(0,0,0,0.18)' } },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { padding: '20px 24px 18px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '20px 24px' } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          borderRadius: '9px !important',
          border: '1.5px solid #e2e8f0 !important',
          color: '#64748b',
          padding: '5px 14px',
          transition: 'all 0.12s',
          '&:hover': { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1 !important' },
          '&.Mui-selected': {
            backgroundColor: '#2563eb',
            color: '#fff',
            borderColor: '#2563eb !important',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            '&:hover': { backgroundColor: '#1d4ed8' },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontSize: '0.875rem', fontWeight: 500 },
        standardInfo:    { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
        standardSuccess: { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
        standardWarning: { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
        standardError:   { backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#e2e8f0' } },
    },
    MuiSnackbar: {
      defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
