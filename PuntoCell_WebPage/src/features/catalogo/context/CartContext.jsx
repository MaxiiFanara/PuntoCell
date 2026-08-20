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

  // --- FUNCIONES DEL CARRITO ---
  const addToCart = (product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        // Si ya está, sumamos 1 a la cantidad
        return prev.map((item) => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // Si no está, lo agregamos con cantidad 1
      return [...prev, { ...product, quantity: 1 }];
    });
    setSnackbar({ open: true, message: 'Producto agregado al carrito' });
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) return;
    setItems((prev) => 
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
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
