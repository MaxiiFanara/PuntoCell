import {
  Box,
  Chip,
  Stack,
} from '@mui/material';

import { useTheme } from '@mui/material/styles';

export default function CategoryFilter({
  categories,
  selected,
  onChange,
}) {

  const theme = useTheme();

  return (
    <Box
      sx={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        pb: 1,
        pt: 1,
        px: { xs: 2, md: 0 }, 
        mx: { xs: -2, md: 0 },

        '&::-webkit-scrollbar': {
          display: 'none',
        },

        scrollbarWidth: 'none',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          minWidth: 'max-content',
        }}
      >
        {categories.map((cat) => {

          const isSelected =
            selected === cat;

          return (
            <Chip
              key={cat}
              label={cat}
              clickable
              onClick={() => onChange(cat)}
              variant="filled"
              sx={{
                height: 42,

                px: 1,

                borderRadius: '999px',

                fontWeight: 500,

                fontSize: '0.9rem',

                transition: 'all 0.25s ease',

                backgroundColor: isSelected
                  ? theme.custom.chips.activeBg
                  : theme.custom.chips.defaultBg,

                color: isSelected
                  ? theme.custom.chips.activeColor
                  : theme.custom.chips.defaultColor,

                border: `1px solid ${theme.palette.divider}`,

                '&:hover': {
                  backgroundColor: isSelected
                    ? theme.custom.chips.activeBg
                    : theme.custom.chips.hoverBg,
                },
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}