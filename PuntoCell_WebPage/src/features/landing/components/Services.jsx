import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import HandymanIcon from '@mui/icons-material/Handyman';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function Services() {
  const services = [
    {
      title: 'Equipos Apple',
      description: 'Encuentra el iPhone, iPad o Mac perfecto para ti. Equipos nuevos y seminuevos verificados con garantía.',
      icon: <SmartphoneIcon sx={{ fontSize: 48, color: '#111827' }} />
    },
    {
      title: 'Servicio Técnico',
      description: 'Reparaciones en el día. Cambio de batería, módulos y diagnóstico especializado con repuestos de alta calidad.',
      icon: <HandymanIcon sx={{ fontSize: 48, color: '#111827' }} />
    },
    {
      title: 'Accesorios Premium',
      description: 'Fundas, cargadores originales, AirPods y todo lo que necesitas para proteger y potenciar tu dispositivo.',
      icon: <HeadphonesIcon sx={{ fontSize: 48, color: '#111827' }} />
    }
  ];

  return (
    <Box component="section" sx={{ py: 10, bgcolor: 'background.paper' }}>
      <Box sx={{ px: 2, mx: 'auto', maxWidth: '1280px' }}>
        
        {/* Encabezado de la sección */}
        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Typography 
            variant="h2" 
            sx={{ fontSize: { xs: '1.875rem', md: '2.25rem' }, fontWeight: 700, color: 'text.primary' }}
          >
            Todo para tu dispositivo en un solo lugar
          </Typography>
          <Typography 
            sx={{ maxWidth: '42rem', mx: 'auto', mt: 2, fontSize: '1.125rem', color: 'text.secondary' }}
          >
            Calidad, confianza y atención personalizada para que disfrutes al máximo de tu tecnología.
          </Typography>
        </Box>

        {/* Grilla de Servicios (3 columnas en PC, 1 en celular) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
          {services.map((service, index) => (
            <Card 
              key={index} 
              sx={{ 
                height: '100%', 
                borderRadius: '16px', 
                boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.05)',
                border: '1px solid #f3f4f6',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px -4px rgb(0 0 0 / 0.1)',
                  borderColor: '#e5e7eb'
                } 
              }}
            >
              <CardContent sx={{ p: 5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box 
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, mb: 3, bgcolor: '#f3f4f6', borderRadius: 4 }}
                >
                  {service.icon}
                </Box>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 2, color: '#111827' }}>
                  {service.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6, flexGrow: 1 }}>
                  {service.description}
                </Typography>
                
                {/* Botón sutil para ver más */}
                <Button 
                  variant="text" 
                  endIcon={<ArrowForwardIcon />}
                  sx={{ 
                    justifyContent: 'flex-start',
                    padding: 0,
                    color: 'primary.dark',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'transparent', color: '#1d4ed8', textDecoration: 'underline' }
                  }}
                >
                  Ver opciones
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>

      </Box>
    </Box>
  );
}