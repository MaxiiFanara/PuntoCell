import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ventasService } from "../../../services/ventasServices";
import { inventarioService } from "../../../services/inventarioServices";
import { fetchApi } from "../../../services/api";
import {
    preciosService, mapVigentePorInventario, LISTA_MINORISTA_ID
} from "../../../services/preciosServices";
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

    // Precios del modelo nuevo (ListaPrecio + PrecioArticulo). Se cargan una vez y se
    // resuelven client-side por renglón de Inventario.
    const [preciosMap, setPreciosMap] = useState({});
    const [idListaMayorista, setIdListaMayorista] = useState(null);

    const recargarPrecios = useCallback(async () => {
        try {
            const [precios, listas] = await Promise.all([
                preciosService.getPreciosArticulos(),
                preciosService.getListas(),
            ]);
            setPreciosMap(mapVigentePorInventario(precios));
            const mayorista = (listas || []).find(l =>
                /mayor/i.test(l.Nombre || '') && (l.Activo === true || l.Activo === 1)
            );
            setIdListaMayorista(mayorista ? (mayorista.Id ?? mayorista.id) : null);
        } catch (e) {
            console.error('No se pudieron cargar los precios:', e);
        }
    }, []);

    useEffect(() => { recargarPrecios(); }, [recargarPrecios]);

    // Precio de venta vigente (ValorFinal) + costo real de un renglón de Inventario.
    const resolverPrecios = useCallback((idInventario) => {
        const porLista = preciosMap[idInventario] || {};
        const minoristaP = porLista[LISTA_MINORISTA_ID];
        const mayoristaP = idListaMayorista ? porLista[idListaMayorista] : null;
        const minorista = minoristaP ? Number(minoristaP.ValorFinal) || 0 : 0;
        return {
            minorista,
            mayorista: mayoristaP ? Number(mayoristaP.ValorFinal) || 0 : minorista,
            costoReal: minoristaP ? Number(minoristaP.CostoReal) || 0
                : (mayoristaP ? Number(mayoristaP.CostoReal) || 0 : 0),
        };
    }, [preciosMap, idListaMayorista]);

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

    // Recuperar estado previo (Persistencia local). El cliente y el carrito se validan
    // contra el backend: un `pdv_estado` viejo puede referenciar un cliente o un renglón
    // de inventario que ya no existen (ej. tras reinicializar la base) y eso reventaba
    // la venta con un error de FK.
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

        // Cliente: solo se restaura si sigue existiendo.
        if (estado.cliente?.id) {
            fetchApi(`/usuarios/${estado.cliente.id}`)
                .then((res) => {
                    const u = res?.data ?? res;
                    if (u && (u.Id ?? u.id)) setCliente(estado.cliente);
                    else setCliente(null);
                })
                .catch(() => setCliente(null));
        }

        // Carrito: solo se restauran los renglones cuyo Inventario sigue con stock.
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
    // Costo real total (para Venta.TotalCosto) — del PrecioArticulo vigente
    const totalCosto = carrito.reduce((sum, item) => sum + (item.CostoReal || 0) * item.Cantidad, 0);

    const agregarAlCarrito = (producto) => {
        const idInventario = producto.Id; // Id de la fila de stock
        const idArticulo = producto.IdArticulo;
        const stockDisponible = producto.Stock || 0;

        const nombreStr = producto.articulo?.Nombre || producto.NombreProducto || 'Producto';
        // Precio del modelo nuevo: PrecioArticulo vigente por lista (minorista/mayorista)
        const { minorista: precioBase, mayorista: precioMayor, costoReal } = resolverPrecios(idInventario);

        if (precioBase <= 0 && precioMayor <= 0) {
            alert('⚠️ Este producto no tiene un precio de venta vigente cargado. Definilo en la pantalla de Precios.');
            return;
        }

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
                CostoReal: costoReal,
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
            totalVenta, totalAjustado, totalCosto,
            preciosMap, idListaMayorista, resolverPrecios, recargarPrecios,
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