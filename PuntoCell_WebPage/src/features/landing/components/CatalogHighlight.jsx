import { Box, Card, CardMedia, CardContent, Typography, Button, Chip } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export default function CatalogHighlight() {
  const products = [
    {
      name: 'iPhone 15 Pro Max',
      capacity: '256GB',
      price: 'U$S 1.199',
      status: 'Nuevo',
      imagePlaceholder: 'https://placehold.co/400x500/f3f4f6/a1a1aa?text=Foto+iPhone+15' 
    },
    {
      name: 'iPhone 14 Pro',
      capacity: '128GB',
      price: 'U$S 899',
      status: 'Seminuevo',
      imagePlaceholder: 'https://placehold.co/400x500/f3f4f6/a1a1aa?text=Foto+iPhone+14'
    },
    {
      name: 'AirPods Pro',
      capacity: '2da Gen',
      price: 'U$S 249',
      status: 'Nuevo',
      imagePlaceholder: 'https://placehold.co/400x500/f3f4f6/a1a1aa?text=Foto+AirPods'
    },
    {
      name: 'Apple Watch Series 9',
      capacity: '45mm',
      price: 'U$S 399',
      status: 'Nuevo',
      imagePlaceholder: 'https://placehold.co/400x500/f3f4f6/a1a1aa?text=Foto+Watch'
    }
  ];

  return (
    <Box component="section" sx={{ py: 12, bgcolor: '#f9fafb' }}>
      <Box sx={{ px: 2, mx: 'auto', maxWidth: '1280px' }}>
        
        {/* Encabezado */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', mb: 6 }}>
          <Box>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.875rem', md: '2.25rem' }, fontWeight: 700, color: 'text.primary' }}>
              Equipos Destacados
            </Typography>
            <Typography sx={{ mt: 1, fontSize: '1.125rem', color: 'text.secondary' }}>
              Los modelos más buscados, con entrega inmediata.
            </Typography>
          </Box>
          <Button 
            variant="text" 
            href="/catalogo"
            sx={{ mt: { xs: 2, md: 0 }, color: 'primary.dark', fontWeight: 'bold', textTransform: 'none' }}
          >
            Ver todo el catálogo →
          </Button>
        </Box>

        {/* Grilla de Productos */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
          {products.map((product, index) => (
            <Card 
              key={index} 
              sx={{ 
                borderRadius: '16px', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  image={product.imagePlaceholder}
                  alt={product.name}
                  sx={{ height: 250, objectFit: 'cover' }}
                />
                <Chip 
                  label={product.status} 
                  size="small"
                  sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    bgcolor: product.status === 'Nuevo' ? '#10b981' : '#f59e0b', 
                    color: 'white',
                    fontWeight: 'bold'
                  }} 
                />
              </Box>

              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>
                  {product.capacity}
                </Typography>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 2, color: 'text.primary' }}>
                  {product.name}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', mb: 3 }}>
                  {product.price}
                </Typography>

                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<ShoppingCartIcon />}
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 'bold',
                    borderColor: '#e5e7eb',
                    color: '#374151',
                    '&:hover': { borderColor: 'primary.dark', bgcolor: '#eff6ff', color: 'primary.dark' }
                  }}
                >
                  Añadir al carrito
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>

      </Box>
    </Box>
  );
}