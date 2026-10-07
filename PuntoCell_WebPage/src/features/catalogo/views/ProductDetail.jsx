import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ProductInfoSection from './ProductInfoSection';
import ProductCard from '../components/ProductCard';
import ProductSpecs from '../components/ProductSpecs';
import CatalogBreadcrumbs from '../components/CatalogBreadcrumbs';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/whatsapp';
import { formatCategoria } from '../utils/categorias';
import { btn, muted, price as priceSx } from '../../../components/ui/publicStyles';

/**
 * Detalle de producto: contenido a la izquierda, caja de compra a la derecha.
 *
 * No hay fotografía y no la va a haber, así que el nombre a escala de display
 * ocupa el lugar que tendría la imagen. Por eso esta vista no llama a
 * `ProductImagePlaceholder`: un rectángulo gris con un ícono adentro no es
 * información, es relleno.
 *
 * La columna izquierda es lectura (qué es, cuánto sale, cómo es) y la derecha es
 * decisión (stock, cantidad, comprar). La derecha viaja con el scroll para que el
 * botón siga a mano mientras se leen las especificaciones.
 */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const { addToCart } = useCart();

  const product = products.find((p) => String(p.id) === String(id));
  const [selectedImage, setSelectedImage] = useState(null);

  const relacionados = products
    .filter((p) => p.id !== product?.id && p.category === product?.category)
    .slice(0, 4);

  if (loading) return null;

  if (!product) {
    return (
      <Box>
        <CatalogBreadcrumbs current="Producto no encontrado" />
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          No encontramos este producto. Puede que ya no esté publicado.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/catalogo')} sx={btn}>
          Volver al catálogo
        </Button>
      </Box>
    );
  }

  const currentImage = selectedImage || product.imagenPortada || product.imagenes?.[0];

  return (
    <Box>
      <CatalogBreadcrumbs current={product.name} />

      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: '16px !important' }} />}
        onClick={() => navigate(-1)}
        sx={{ ...btn, height: 38, px: 1.5, ml: -1.5, mb: { xs: 3, md: 4 }, color: 'text.secondary' }}
      >
        Volver
      </Button>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
          gap: { xs: 5, md: 'clamp(2.5rem, 5vw, 4.5rem)' },
        }}
      >
        <Box sx={{ gridColumn: { md: '1 / 8' } }}>
          {product.category && (
            <Typography sx={{ ...muted, fontSize: '.8125rem', mb: 1 }}>
              {formatCategoria(product.category)}
            </Typography>
          )}

          {product.imagenes && product.imagenes.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: { xs: 3, md: 4 } }}>
              <Box sx={{ width: '100%', aspectRatio: '4/3', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: 'divider' }}>
                <img src={currentImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
              </Box>
              {product.imagenes.length > 1 && (
                <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
                  {product.imagenes.map((img, idx) => (
                    <Box 
                      key={idx} 
                      onClick={() => setSelectedImage(img)}
                      sx={{ width: 80, height: 80, flexShrink: 0, borderRadius: 1, overflow: 'hidden', border: img === currentImage ? '2px solid' : '1px solid', borderColor: img === currentImage ? 'primary.main' : 'divider', cursor: 'pointer', bgcolor: 'background.paper' }}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Es el h1 de la vista: la página no tenía ninguno. */}
          <Typography component="h1" sx={{ typography: 'd1', mt: 0.75 }}>
            {product.name}
          </Typography>

          <Typography sx={{ ...priceSx(true), mt: { xs: 3, md: 4 } }}>
            ${formatCurrency(product.price)}
          </Typography>

          {/* Píldoras neutras, no chips verdes: el verde es del precio y de la
              acción primaria, y una promoción no es ninguna de las dos. */}
          {product.promotions?.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2.5 }}>
              {product.promotions.map((promo) => (
                <Typography
                  key={promo}
                  component="span"
                  sx={{
                    ...muted,
                    fontSize: '.8125rem',
                    px: 1.25,
                    py: 0.6,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 99,
                    lineHeight: 1,
                  }}
                >
                  {promo}
                </Typography>
              ))}
            </Box>
          )}

          <Typography
            sx={{
              typography: 'publicBody',
              color: 'text.secondary',
              maxWidth: '58ch',
              mt: { xs: 3, md: 4 },
            }}
          >
            {product.description || 'Sin descripción disponible.'}
          </Typography>

          <ProductSpecs product={product} />
        </Box>

        <Box sx={{ gridColumn: { md: '8 / -1' } }}>
          <ProductInfoSection product={product} addToCart={addToCart} />
        </Box>
      </Box>

      {relacionados.length > 0 && (
        <Box
          sx={{
            mt: { xs: 8, md: 12 },
            pt: { xs: 6, md: 8 },
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography component="h2" sx={{ typography: 'd3', mb: { xs: 3, md: 4 } }}>
            Más en {product.category ? product.category.toLowerCase() : 'el catálogo'}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 'clamp(1rem, 1.8vw, 1.5rem)',
              alignItems: 'stretch',
            }}
          >
            {relacionados.map((item) => <ProductCard key={item.id} product={item} />)}
          </Box>
        </Box>
      )}
    </Box>
  );
}
