import { createContext, useContext, useState, useEffect } from 'react';
import { ventasService } from "../../../services/ventasServices";
import { inventarioService } from "../../../services/inventarioServices";
import { useAuth } from '../../../context/AuthContext';

const VentaContext = createContext();

export const VentaProvider = ({ children }) => {
    // idSucursal viene del usuario logueado (antes quedaba hardcodeado en Sucursal 1)
    const { usuario } = useAuth();
    const idSucursal = usuario?.sucursal ?? null;
    const [nombreSucursal, setNombreSucursal] = useState('');

    useEffect(() => {
        if (!idSucursal) return;
        inventarioService.getSucursales()
            .then((lista) => {
                const suc = (lista || []).find(s => (s.Id ?? s.id) === idSucursal);
                setNombreSucursal(suc?.Nombre ?? suc?.nombre ?? '');
            })
            .catch(() => {});
    }, [idSucursal]);

    const [carrito, setCarrito] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [cliente, setCliente] = useState(null);
    const [esMayorista, setEsMayorista] = useState(false);
    const [bonificacion, setBonificacion] = useState(0);

    const [datosConfig, setDatosConfig] = useState({
        idTurnoCaja: null,
        idCotizacionDolar: null,
        valorDolar: 0,
        metodosPago: [],
        loading: true
    });

    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                const [resMetodos, resCotizaciones] = await Promise.all([
                    ventasService.getMetodosPago(),
                    ventasService.getCotizaciones()
                ]);

                let listaCotizaciones = resCotizaciones.data || resCotizaciones || [];
                if (listaCotizaciones.data && Array.isArray(listaCotizaciones.data)) {
                    listaCotizaciones = listaCotizaciones.data;
                }
                // Cotizacion es historial append-only: nos quedamos con la más reciente
                // (CreatedAt, Id como desempate), no con la primera que matchee.
                const cotizacionesDolar = listaCotizaciones.filter(c =>
                    (c.Clave || c.clave || '').toLowerCase() === 'dolarblue'
                );
                const cotizacionDolar = cotizacionesDolar.reduce((masReciente, actual) => {
                    if (!masReciente) return actual;
                    const fechaActual = new Date(actual.CreatedAt || actual.createdAt || 0).getTime();
                    const fechaReciente = new Date(masReciente.CreatedAt || masReciente.createdAt || 0).getTime();
                    if (fechaActual !== fechaReciente) return fechaActual > fechaReciente ? actual : masReciente;
                    return (actual.Id ?? actual.id ?? 0) > (masReciente.Id ?? masReciente.id ?? 0) ? actual : masReciente;
                }, null);

                let listaMetodos = resMetodos.data || resMetodos || [];
                if (listaMetodos.data && Array.isArray(listaMetodos.data)) {
                    listaMetodos = listaMetodos.data;
                }

                const metodosFormateados = listaMetodos.map(m => {
                    // Si Sequelize manda el objeto crudo, los datos están adentro de dataValues
                    const obj = m.dataValues || m; 
                    return {
                        value: obj.Id ?? obj.id ?? Math.random(),
                        label: obj.Nombre ?? obj.nombre ?? 'Etiqueta Vacía'
                    };
                });

                setDatosConfig({
                    idTurnoCaja: 1, 
                    idCotizacionDolar: cotizacionDolar?.Id || cotizacionDolar?.id || 1,
                    valorDolar: parseFloat(cotizacionDolar?.Valor || cotizacionDolar?.valor) || 1000, 
                    metodosPago: metodosFormateados,
                    loading: false
                });
            } catch (error) {
                console.error("Error al sincronizar con el backend:", error);
                setDatosConfig(prev => ({ ...prev, loading: false }));
            }
        };
        cargarConfiguracion();
    }, []);
    
    // Registra un nuevo valor de dólar y lo refleja al instante en todo lo que
    // depende de datosConfig.valorDolar (navbar, historial, inventario, punto de venta).
    const actualizarCotizacion = async (nuevoValor) => {
        const valor = Number(nuevoValor);
        if (isNaN(valor) || valor <= 0) throw new Error('Ingresá un valor de dólar válido.');
        const creada = await ventasService.crearCotizacion(valor);
        setDatosConfig(prev => ({
            ...prev,
            idCotizacionDolar: creada?.Id ?? prev.idCotizacionDolar,
            valorDolar: valor,
        }));
        return valor;
    };

    // Recuperar estado previo (Persistencia local)
    useEffect(() => {
        const guardado = localStorage.getItem('pdv_estado');
        if (guardado) {
            try {
                const estado = JSON.parse(guardado);
                if (estado.carrito) setCarrito(estado.carrito);
                if (estado.cliente) setCliente(estado.cliente);
                if (estado.esMayorista) setEsMayorista(estado.esMayorista);
            } catch (e) {
                console.error('Error cargando estado:', e);
            }
        }
    }, []);

    // Guardar estado (Persistencia local)
    useEffect(() => {
        localStorage.setItem('pdv_estado', JSON.stringify({
            carrito,
            cliente,
            esMayorista
        }));
    }, [carrito, cliente, esMayorista]);

    // Totales
    const totalVenta = carrito.reduce((sum, item) => sum + item.Subtotal, 0);
    const totalAjustado = totalVenta - bonificacion;

    const agregarAlCarrito = (producto) => {
        const idInventario = producto.Id; // Id de la fila de stock
        const idArticulo = producto.IdArticulo;
        const stockDisponible = producto.Stock || 0;

        const nombreStr = producto.articulo?.Nombre || 'Producto';
        const precioBase = producto.PrecioMenor || 0;
        const precioMayor = producto.PrecioMayor || precioBase;

        const existente = carrito.find(x => x.IdInventario === idInventario);
        const cantActual = existente ? existente.Cantidad : 0;

        if (cantActual + 1 > stockDisponible) {
            alert(`⚠️ No hay suficiente stock. Disponibles: ${stockDisponible}`);
            return;
        }

        const precioAUsar = esMayorista ? precioMayor : precioBase;

        if (existente) {
            setCarrito(carrito.map(item =>
                item.IdInventario === idInventario
                    ? {
                        ...item,
                        Cantidad: item.Cantidad + 1,
                        Subtotal: (item.Cantidad + 1) * precioAUsar
                      }
                    : item
            ));
        } else {
            setCarrito([...carrito, {
                IdArticulo: idArticulo,
                IdInventario: idInventario,
                NombreProducto: nombreStr,
                Cantidad: 1,
                PrecioUnitario: precioAUsar,
                Subtotal: precioAUsar,
                PrecioMenor: precioBase,
                PrecioMayor: precioMayor,
                StockMax: stockDisponible
            }]);
        }
    };

    // Al cambiar mayorista/minorista, recalcula precio y subtotal de lo que ya está en el carrito
    useEffect(() => {
        setCarrito(prev => prev.map(item => {
            const precio = esMayorista ? (item.PrecioMayor ?? item.PrecioUnitario) : (item.PrecioMenor ?? item.PrecioUnitario);
            return { ...item, PrecioUnitario: precio, Subtotal: precio * item.Cantidad };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esMayorista]);

    const eliminarDelCarrito = (index) => {
        setCarrito(carrito.filter((_, i) => i !== index));
    };

    const vaciarTodo = () => {
        localStorage.removeItem('pdv_estado');
        setCarrito([]);
        setPagos([]);
        setCliente(null);
        setBonificacion(0);
        setEsMayorista(false);
    };

    return (
        <VentaContext.Provider value={{
            carrito, setCarrito,
            pagos, setPagos,
            cliente, setCliente,
            esMayorista, setEsMayorista,
            bonificacion, setBonificacion,
            idSucursal,
            nombreSucursal,
            datosConfig,
            dolarGlobal: datosConfig.valorDolar || 1000,
            actualizarCotizacion,
            totalVenta, totalAjustado,
            agregarAlCarrito, eliminarDelCarrito, vaciarTodo,
            toggleMayorista: setEsMayorista
        }}>
            {children}
        </VentaContext.Provider>
    );
};

export const useVenta = () => {
    const context = useContext(VentaContext);
    if (!context) throw new Error('useVenta debe usarse dentro de VentaProvider');
    return context;
};