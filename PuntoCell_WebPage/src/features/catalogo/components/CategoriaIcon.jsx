import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined'
import TabletMacOutlinedIcon from '@mui/icons-material/TabletMacOutlined'
import LaptopMacOutlinedIcon from '@mui/icons-material/LaptopMacOutlined'
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import DevicesOtherOutlinedIcon from '@mui/icons-material/DevicesOtherOutlined'

/**
 * Ícono según la categoría del producto. Solo decorativo: se usa de fondo cuando
 * el producto no tiene fotografía.
 */
export default function CategoriaIcon({ categoria, sx }) {
  const c = (categoria || '').toLowerCase()
  let Icon = DevicesOtherOutlinedIcon
  if (c.includes('smartphone') || c.includes('celular')) Icon = SmartphoneOutlinedIcon
  else if (c.includes('tablet')) Icon = TabletMacOutlinedIcon
  else if (c.includes('notebook') || c.includes('laptop')) Icon = LaptopMacOutlinedIcon
  else if (c.includes('accesorio')) Icon = HeadphonesOutlinedIcon
  else if (c.includes('repuesto')) Icon = BuildOutlinedIcon

  return <Icon aria-hidden sx={sx} />
}
