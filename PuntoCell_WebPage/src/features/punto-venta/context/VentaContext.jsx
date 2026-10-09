import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ventasService } from "../../../services/ventasServices";
import { inventarioService } from "../../../services/inventarioServices";
import { fetchApi } from "../../../services/api";
import {
    preciosService, mapVigentePorInventario, idsListasMayoristas, resolverPrecioInventario
} from "../../../services/preciosServices";
import { useAuth } from '../../../context/AuthContext';

const VentaContext = createContext();

export const VentaProvider = ({ children }) => {
    const { usuario } = useAuth();
    const idSucursal = usuario?.sucursal ?? null;
    const [nombreSucursal, setNombreSucursal] = useState('');

    const mostrarAlerta = (mensaje, severity = 'warning') => {
        if (severity === 'error') toast.error(mensaje);
        else if (severity === 'success') toast.success(mensaje);
        else toast.warning(mensaje);
    };

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

    const [preciosMap, setPreciosMap] = useState({});
    const [listasMayoristas, setListasMayoristas] = useState([]);

    const recargarPrecios = useCallback(async () => {
        try {
            const [precios, listas] = await Promise.all([
                preciosService.getPreciosArticulos(),
                preciosService.getListas(),
            ]);
            setPreciosMap(mapVigentePorInventario(precios));
            setListasMayoristas(idsListasMayoristas(listas || []));
        } catch (e) {
            console.error('No se pudieron cargar los precios:', e);
        }
    }, []);

    useEffect(() => { recargarPrecios(); }, [recargarPrecios]);

    const resolverPrecios = useCallback(
        (idInventario) => resolverPrecioInventario(preciosMap, idInventario, listasMayoristas),
        [preciosMap, listasMayoristas]
    );

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

    useEffect(() => {
        const guardado = localStorage.getItem('pdv_estado');
        if (!guardado) return;
        let estado;
        try {
            estado = JSON.parse(guardado);
        } catch (e) {
            console.error('Error cargando estado:', e);
            localStorage.removeItem('pdv_estado');
            return;
        }
        if (estado.esMayorista) setEsMayorista(estado.esMayorista);

        if (estado.cliente?.id) {
            fetchApi(`/usuarios/${estado.cliente.id}`)
                .then((res) => {
                    const u = res?.data ?? res;
                    if (u && (u.Id ?? u.id)) setCliente(estado.cliente);
                    else setCliente(null);
                })
                .catch(() => setCliente(null));
        }

        if (Array.isArray(estado.carrito) && estado.carrito.length) {
            inventarioService.getAll({ IdSucursal: usuario?.sucursal })
                .then((items) => {
                    const lista = Array.isArray(items) ? items : (items?.data || []);
                    const stockPorId = {};
                    lista.forEach((it) => { stockPorId[it.Id ?? it.id] = Number(it.Stock) || 0; });
                    const validos = estado.carrito.filter((c) => (stockPorId[c.IdInventario] ?? 0) >= c.Cantidad);
                    if (validos.length) setCarrito(validos);
                })
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        localStorage.setItem('pdv_estado', JSON.stringify({
            carrito,
            cliente,
            esMayorista
        }));
    }, [carrito, cliente, esMayorista]);

    const totalVenta = carrito.reduce((sum, item) => sum + item.Subtotal, 0);
    const totalAjustado = totalVenta - bonificacion;
    const totalCosto = carrito.reduce((sum, item) => sum + (item.CostoReal || 0) * item.Cantidad, 0);

    const agregarAlCarrito = (producto) => {
        const idInventario = producto.Id ?? producto.id;
        const idArticulo = producto.IdArticulo ?? producto.idArticulo;
        const stockDisponible = producto.Stock || 0;

        const nombreStr = producto.articulo?.Nombre || producto.NombreProducto || 'Producto';
        const { minorista: precioBase, mayorista: precioMayor, costoReal } = resolverPrecios(idInventario);

        const min = precioBase || producto.PrecioMenor || 0;
        const may = precioMayor || producto.PrecioMayor || min;

        if (min <= 0 && may <= 0) {
            mostrarAlerta('Este producto no tiene un precio de venta vigente cargado. Definilo en la pantalla de Precios.', 'error');
            return;
        }

        const existente = carrito.find(x => x.IdInventario === idInventario);
        const cantActual = existente ? existente.Cantidad : 0;

        if (cantActual + 1 > stockDisponible) {
            mostrarAlerta(`No hay suficiente stock. Disponibles: ${stockDisponible}`, 'warning');
            return;
        }

        const precioAUsar = esMayorista ? may : min;

        if (existente) {
            setCarrito(carrito.map(item =>
                item.IdInventario === idInventario
                    ? {
                        ...item,
                        Cantidad: item.Cantidad + 1,
                        PrecioUnitario: precioAUsar,
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
                PrecioMenor: min,
                PrecioMayor: may,
                CostoReal: costoReal || producto.CostoReal || 0,
                StockMax: stockDisponible
            }]);
        }
    };

    useEffect(() => {
        setCarrito(prev => prev.map(item => {
            const { minorista, mayorista, costoReal } = resolverPrecios(item.IdInventario);
            
            const min = minorista || item.PrecioMenor || 0;
            const may = mayorista || item.PrecioMayor || min;
            const precio = esMayorista ? may : min;

            return {
                ...item,
                PrecioUnitario: precio,
                Subtotal: precio * item.Cantidad,
                PrecioMenor: min,
                PrecioMayor: may,
                CostoReal: costoReal || item.CostoReal || 0,
            };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esMayorista, resolverPrecios]);

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
            totalVenta, totalAjustado, totalCosto,
            preciosMap, listasMayoristas, resolverPrecios, recargarPrecios,
            agregarAlCarrito, eliminarDelCarrito, vaciarTodo,
            toggleMayorista: setEsMayorista,
            mostrarAlerta // Exportado para usar en ProductoSearch o cualquier otro componente
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