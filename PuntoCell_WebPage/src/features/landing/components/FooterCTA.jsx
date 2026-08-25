import { Box, Typography, Button } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

export default function FooterCTA() {
  return (
    <Box component="footer" sx={{ bgcolor: '#111827' }}>
      
      {/* Sección del Call to Action (El empujón final) */}
      <Box sx={{ px: 2, py: 10, mx: 'auto', textAlign: 'center', maxWidth: '1280px' }}>
        <Typography 
          variant="h2" 
          sx={{ mb: 3, fontSize: { xs: '1.875rem', md: '2.25rem' }, fontWeight: 700, color: '#ffffff' }}
        >
          ¿No encuentras el modelo que buscas?
        </Typography>
        <Typography 
          sx={{ maxWidth: '42rem', mx: 'auto', mb: 5, fontSize: '1.125rem', color: '#9ca3af' }}
        >
          Escríbenos directamente. Cotizamos equipos a pedido, tomamos permutas y resolvemos tus dudas técnicas al instante.
        </Typography>
        
        {/* Botón de WhatsApp */}
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<WhatsAppIcon />}
          sx={{ 
            bgcolor: '#22c55e', 
            color: 'white',
            padding: '14px 32px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            textTransform: 'none',
            borderRadius: '12px',
            '&:hover': { bgcolor: '#16a34a' }
          }}
        >
          Consultar por WhatsApp
        </Button>
      </Box>

      {/* El Footer real (Copyright y créditos) */}
      <Box 
        sx={{ 
          py: 4, 
          textAlign: 'center', 
          fontSize: '0.875rem', 
          color: '#6b7280', 
          borderTop: '1px solid #1f2937' 
        }}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          📍 La Calera, Córdoba, Argentina | Punto Cell
        </Typography>
        <Typography variant="body2">
          © {new Date().getFullYear()} E-commerce vinculado al sistema de gestión Punto Cell. Desarrollado como proyecto final.
        </Typography>
      </Box>
    </Box>
  );
}