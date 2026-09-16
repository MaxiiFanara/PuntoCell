import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import BuildIcon from '@mui/icons-material/Build';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';

// Valores tal como los devuelve CategoriaProducto en la base
// (ver db/init/init.sql, tabla CategoriaProducto).
const CATEGORIA_ICONS = {
  smartphone: SmartphoneIcon,
  tablet: TabletMacIcon,
  notebook: LaptopMacIcon,
  accesorio: HeadphonesIcon,
  repuesto: BuildIcon,
};

export const getCategoriaIcon = (categoria) =>
  CATEGORIA_ICONS[(categoria || '').toLowerCase().trim()] || DevicesOtherIcon;

export const formatCategoria = (categoria) =>
  categoria ? categoria.charAt(0).toUpperCase() + categoria.slice(1) : 'Otros';
