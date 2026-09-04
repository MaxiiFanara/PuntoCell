import { Container, Typography, Box, TextField, InputAdornment, Button, Stack } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { STORE_CONFIG } from '../config/store';
import { useTheme } from '@mui/material/styles';

export default function HeroSection({ productsCount, search, setSearch, scrollToCatalog }) {
  const { hero } = STORE_CONFIG;
  const theme = useTheme();
  return (
    <Box sx={{ position: 'relative', minHeight: { xs: '88vh', md: '100vh' }, overflow: 'hidden', display: 'flex', alignItems: 'center', mb: { xs: 6, md: 10 } }}>
      <Box component="img" src={hero.image} alt={hero.eyebrow} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.02)' }} />
      <Box sx={{ position: 'absolute', inset: 0, background: theme.custom.hero.overlay }} />
      <Box sx={{ position: 'absolute', top: -120, right: -120, width: 420, height: 420, borderRadius: '50%', background: theme.custom.hero.blur, filter: 'blur(40px)' }} />
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ maxWidth: 720, color: 'white', pt: { xs: 10, md: 0 } }}>
          <Typography sx={{ fontSize: '0.82rem', letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.78, mb: 2.5 }}>{hero.eyebrow}</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '4rem', md: '6rem' }, lineHeight: 0.95, letterSpacing: '-0.05em', mb: 3 }}>{hero.title}</Typography>
          <Typography variant="body1" sx={{ fontSize: { xs: '1rem', md: '1.18rem' }, lineHeight: 1.9, opacity: 0.9, maxWidth: 560, mb: 5 }}>{hero.description}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" size="medium"
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'rgba(0,0,0,0.45)' }} /></InputAdornment>) }}
              sx={{ bgcolor: 'rgba(255,255,255,0.96)', borderRadius: 3, width: { xs: '100%', sm: 420 }, backdropFilter: 'blur(10px)', '& .MuiOutlinedInput-root': { borderRadius: 3, height: 58, '& fieldset': { border: 'none' } } }}
            />
            <Button variant="contained" endIcon={<KeyboardArrowDownIcon />} onClick={scrollToCatalog} sx={{ height: 58, px: 4, background: theme.custom.hero.buttonGradient, color: theme.palette.primary.contrastText, fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 16px 40px rgba(0,0,0,0.22)' } }}>
              {hero.buttonText}
            </Button>
          </Box>
          <Stack direction="row" spacing={5} sx={{ mt: 7, flexWrap: 'wrap', rowGap: 2 }}>
            <Box><Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>+{productsCount}</Typography><Typography sx={{ opacity: 0.7 }}>Productos</Typography></Box>
            {hero.stats.map((item) => (
              <Box key={item.label}><Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{item.value}</Typography><Typography sx={{ opacity: 0.7 }}>{item.label}</Typography></Box>
            ))}
          </Stack>
        </Box>
      </Container>
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 180, background: `linear-gradient(to top, ${theme.palette.background.default} 0%, transparent 100%)` }} />
    </Box>
  );
}
