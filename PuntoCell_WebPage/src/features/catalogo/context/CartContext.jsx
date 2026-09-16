import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // 1. Inicializamos el carrito leyendo el localStorage (si existe)
  const [items, setItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('puntoCell_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      return [];
    }
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // 2. Cada vez que "items" cambie, lo guardamos automáticamente en localStorage
  useEffect(() => {
    localStorage.setItem('puntoCell_cart', JSON.stringify(items));
  }, [items]);

  // Stock disponible del producto. Si el backend no lo manda, no se topea.
  const topeDe = (producto) =>
    Number.isFinite(Number(producto?.stock)) ? Number(producto.stock) : Infinity;

  // --- FUNCIONES DEL CARRITO ---
  // El tope por stock vive acá y no en cada botón: agregan al carrito la card,
  // el detalle y el drawer, y los tres tienen que respetar el mismo límite.
  // ponytail: el stock es el del momento en que se cargó el catálogo; la
  // disponibilidad real se confirma por WhatsApp al cerrar la consulta.
  const addToCart = (product, cantidad = 1) => {
    const tope = topeDe(product);
    const actual = items.find((item) => item.id === product.id)?.quantity ?? 0;
    const objetivo = Math.min(actual + cantidad, tope);

    if (objetivo <= actual) {
      setSnackbar({
        open: true,
        severity: 'info',
        message: tope === 0
          ? 'Este producto no tiene stock disponible'
          : tope === 1
            ? 'Ya tenés en el carrito la única unidad disponible'
            : `Ya tenés en el carrito las ${tope} unidades disponibles`,
      });
      return;
    }

    setItems((prev) =>
      prev.some((item) => item.id === product.id)
        ? prev.map((item) => (item.id === product.id ? { ...item, quantity: objetivo } : item))
        : [...prev, { ...product, quantity: objetivo }]
    );

    const agregadas = objetivo - actual;
    setSnackbar({
      open: true,
      severity: agregadas < cantidad ? 'info' : 'success',
      message: agregadas < cantidad
        ? `Agregamos ${agregadas} ${agregadas === 1 ? 'unidad' : 'unidades'}: es todo el stock disponible`
        : 'Producto agregado al carrito',
    });
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(Math.max(quantity, 1), topeDe(item)) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const closeSnack = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // --- CÁLCULOS TOTALES ---
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider 
      value={{ 
        items, 
        isOpen, 
        setIsOpen,
        addToCart, 
        removeFromCart, 
        updateQuantity, 
        clearCart,
        totalPrice, 
        totalItems,
        snackbar, 
        closeSnack 
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
