import { Box, Avatar, IconButton, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';

export default function Team() {
  const members = [
    {
      name: 'Simón',
      role: 'Desarrollador Full-Stack',
      avatarText: 'S', 
      linkedin: '#', 
      github: '#', 
    },
    {
      name: '[Nombre del Compañero]',
      role: 'Analista Funcional & QA',
      avatarText: 'C',
      linkedin: '#',
      github: '#',
    }
  ];

  return (
    <Box component="section" sx={{ py: 12, bgcolor: 'background.paper' }}>
      <Box sx={{ px: 2, mx: 'auto', maxWidth: '1280px' }}>
        
        {/* Encabezado */}
        <Box sx={{ mb: 10, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.875rem', md: '2.25rem' }, fontWeight: 700, color: 'text.primary' }}>
            El equipo detrás del código
          </Typography>
          <Typography sx={{ maxWidth: '42rem', mx: 'auto', mt: 2, fontSize: '1.125rem', color: 'text.secondary' }}>
            Somos estudiantes de la Facultad de Lenguas. Este ecosistema fue diseñado integrando una landing comercial conectada en tiempo real a nuestro sistema de administración integral.
          </Typography>
        </Box>

        {/* Grilla de Integrantes */}
        <Box 
          sx={{ 
            display: 'grid', 
            gap: 6, 
            gridTemplateColumns: members.length === 2 ? { xs: '1fr', md: 'repeat(2, 1fr)' } : { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            maxWidth: members.length === 2 ? '768px' : 'none',
            mx: 'auto'
          }}
        >
          {members.map((member, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                p: 4, 
                bgcolor: '#f9fafb', 
                borderRadius: 6, 
                border: '1px solid #f3f4f6',
                transition: 'box-shadow 0.3s',
                '&:hover': { boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  fontSize: '3rem', 
                  bgcolor: 'primary.dark',
                  mb: 4,
                  border: '4px solid white',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              >
                {member.avatarText}
              </Avatar>

              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {member.name}
              </Typography>
              
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500, color: 'primary.dark' }}>
                {member.role}
              </Typography>
              
              <Typography sx={{ mb: 3, fontSize: '0.875rem', lineHeight: 1.6, textAlign: 'center', color: 'text.secondary' }}>
                Enfocado en crear soluciones prácticas, eficientes y escalables para transformar la gestión de comercios reales.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  component="a" 
                  href={member.linkedin} 
                  target="_blank" 
                  sx={{ color: '#0a66c2', '&:hover': { bgcolor: '#0a66c210' } }}
                >
                  <LinkedInIcon />
                </IconButton>
                <IconButton 
                  component="a" 
                  href={member.github} 
                  target="_blank" 
                  sx={{ color: '#1f2328', '&:hover': { bgcolor: '#1f232810' } }}
                >
                  <GitHubIcon />
                </IconButton>
              </Box>

            </Box>
          ))}
        </Box>

      </Box>
    </Box>
  );
}