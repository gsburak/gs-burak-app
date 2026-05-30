const STORAGE_KEY = "gs_burak_app_v1";
const BACKUP_KEY = "gs_burak_app_backups_v1";
const SERVER_MODE = location.protocol.startsWith("http");

const users = [
  { id: "admin", name: "Administrador", role: "admin", password: "admin123" },
  { id: "tecnico", name: "Tecnico", role: "operativo", password: "tecnico123" },
];

const modules = [
  { id: "dashboard", label: "Dashboard", icon: "Inicio", roles: ["admin", "operativo"] },
  { id: "clientes", label: "Clientes", icon: "Clientes", roles: ["admin", "operativo"] },
  { id: "servicios", label: "Servicios", icon: "Ventas", roles: ["admin", "operativo"] },
  { id: "tiposServicio", label: "Tipos servicio", icon: "Servicios", roles: ["admin"] },
  { id: "productos", label: "Productos", icon: "Stock", roles: ["admin"] },
  { id: "compras", label: "Compras", icon: "Compras", roles: ["admin"] },
  { id: "gastos", label: "Gastos", icon: "Gastos", roles: ["admin"] },
  { id: "equipos", label: "Equipos", icon: "Equipos", roles: ["admin"] },
];

const seed = {
  schemaVersion: 2,
  clientes: [
    { id: uid(), nombre: "Residencial Montebello", telefono: "999 123 4567", correo: "admin@montebello.mx", direccion: "Merida, Yucatan", tipo: "Residencial", observaciones: "Cliente de ejemplo." },
    { id: uid(), nombre: "Restaurante Centro", telefono: "999 765 4321", correo: "contacto@restaurante.mx", direccion: "Centro, Merida", tipo: "Comercial", observaciones: "Cliente de ejemplo." },
  ],
  productos: [
    { id: uid(), producto: "Fendona", unidadCompra: "litro", unidadUso: "ml", factor: 1000, costo: 2500 },
    { id: uid(), producto: "Termidor CE", unidadCompra: "litro", unidadUso: "ml", factor: 1000, costo: 5800 },
    { id: uid(), producto: "Trampa Trapper Max", unidadCompra: "pieza", unidadUso: "pieza", factor: 1, costo: 42 },
    { id: uid(), producto: "Optigard Ant Gel", unidadCompra: "kilo", unidadUso: "gr", factor: 1000, costo: 7200 },
  ],
  tiposServicio: [
    { id: uid(), nombre: "Fumigacion General", precio: 0 },
    { id: uid(), nombre: "Desratizacion", precio: 0 },
    { id: uid(), nombre: "Control de Cucarachas", precio: 0 },
    { id: uid(), nombre: "Control de Hormigas", precio: 0 },
    { id: uid(), nombre: "Control de Termitas", precio: 0 },
    { id: uid(), nombre: "Control de Mosquitos", precio: 0 },
    { id: uid(), nombre: "Desinfeccion", precio: 0 },
    { id: uid(), nombre: "Nebulizacion", precio: 0 },
    { id: uid(), nombre: "Inspeccion", precio: 0 },
    { id: uid(), nombre: "Control de Roedores", precio: 0 },
    { id: uid(), nombre: "Otro", precio: 0 },
  ],
  servicios: [],
  compras: [],
  gastos: [
    { id: uid(), fecha: today(-6), categoria: "Gasolina / Combustible", descripcion: "Carga semanal", monto: 850, comprobante: "Ticket", pagadoPor: "VICTOR" },
    { id: uid(), fecha: today(-2), categoria: "Telefonia Celular", descripcion: "Plan mensual", monto: 399, comprobante: "Factura", pagadoPor: "SISPROVISA" },
  ],
  equipos: [
    { id: uid(), equipo: "Nebulizadora", unidad: "pieza", costo: 14500, fecha: "2026-01-10", vida: 4, residual: 1500, pagadoPor: "SISPROVISA" },
  ],
};

seed.compras = [
  { id: uid(), fecha: today(-20), productoId: seed.productos[0].id, cantidad: 1, costoUnitario: 2500, proveedor: "Proveedor local", factura: "F-001", notas: "", pagadoPor: "SISPROVISA" },
  { id: uid(), fecha: today(-12), productoId: seed.productos[2].id, cantidad: 25, costoUnitario: 42, proveedor: "Proveedor local", factura: "F-002", notas: "", pagadoPor: "VICTOR" },
];

seed.servicios = [
  {
    id: uid(),
    fecha: today(-9),
    clienteId: seed.clientes[0].id,
    ciudad: "Yucatan",
    tipo: "Fumigacion General",
    tecnico: "VICTOR",
    zona: "Norte",
    observaciones: "Servicio mensual",
    subtotal: 1800,
    cobrado: 2088,
    formaPago: "Transferencia",
    productos: [{ productoId: seed.productos[0].id, cantidad: 120 }],
  },
  {
    id: uid(),
    fecha: today(-3),
    clienteId: seed.clientes[1].id,
    ciudad: "Yucatan",
    tipo: "Control de Cucarachas",
    tecnico: "SANTOS",
    zona: "Centro",
    observaciones: "Quedo pendiente de pago",
    subtotal: 2600,
    cobrado: 0,
    formaPago: "Por cobrar",
    productos: [
      { productoId: seed.productos[0].id, cantidad: 80 },
      { productoId: seed.productos[3].id, cantidad: 30 },
    ],
  },
];

let state = null;
let currentUser = null;
let activeModule = "dashboard";
let modal = null;
let clienteSearch = "";
let clienteTipoFilter = "";
let servicioSearch = "";
let operacionFilter = "Todas";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function money(value) {
  return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function number(value) {
  return Number(value || 0).toLocaleString("es-MX");
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return migrateState(saved ? JSON.parse(saved) : structuredClone(seed));
}

async function loadInitialState() {
  if (!SERVER_MODE) return loadState();
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    const data = await response.json();
    const hasData = data && Object.keys(data).length > 0;
    const remoteState = migrateState(hasData ? data : structuredClone(seed));
    const localRecovery = bestLocalRecoveryState(remoteState);
    if (localRecovery) {
      await saveRemoteState(localRecovery);
      alert("Se recupero informacion guardada en este navegador y se subio a la nube. Revise los ultimos registros.");
      return migrateState(localRecovery);
    }
    return remoteState;
  } catch (error) {
    alert("No se pudo cargar la base compartida. Se usara modo local de este navegador.");
    return loadState();
  }
}

function bestLocalRecoveryState(remoteState) {
  const candidates = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) candidates.push(JSON.parse(saved));
  } catch (error) {
    console.warn("No se pudo leer respaldo local principal", error);
  }
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
    backups.forEach((backup) => {
      if (backup?.data) candidates.push(backup.data);
    });
  } catch (error) {
    console.warn("No se pudieron leer respaldos locales", error);
  }

  const best = candidates
    .map((candidate) => {
      try {
        return migrateState(structuredClone(candidate));
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => totalRecords(b) - totalRecords(a))[0];

  if (!best || !hasMoreRecords(best, remoteState)) return null;
  return mergeStatesById(remoteState, best);
}

function totalRecords(data) {
  return ["clientes", "productos", "tiposServicio", "servicios", "compras", "gastos", "equipos"]
    .reduce((sum, key) => sum + (Array.isArray(data[key]) ? data[key].length : 0), 0);
}

function hasMoreRecords(candidate, remoteState) {
  return ["clientes", "productos", "tiposServicio", "servicios", "compras", "gastos", "equipos"]
    .some((key) => (candidate[key] || []).length > (remoteState[key] || []).length);
}

function mergeStatesById(remoteState, localState) {
  const merged = structuredClone(remoteState);
  ["clientes", "productos", "tiposServicio", "servicios", "compras", "gastos", "equipos"].forEach((key) => {
    const rows = [...(remoteState[key] || [])];
    const seen = new Set(rows.map((row) => row.id || row.nombre).filter(Boolean));
    (localState[key] || []).forEach((row) => {
      const rowId = row.id || row.nombre;
      if (!rowId || seen.has(rowId)) return;
      rows.push(row);
      seen.add(rowId);
    });
    merged[key] = rows;
  });
  return merged;
}

async function saveRemoteState(nextState) {
  if (!SERVER_MODE) return;
  await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nextState),
  });
}

function migrateState(data) {
  const oldVersion = !data.schemaVersion;
  const oldProducts = new Map((data.productos || []).map((producto) => [producto.id, producto]));
  data.tiposServicio = data.tiposServicio || structuredClone(seed.tiposServicio);
  data.tiposServicio = data.tiposServicio.map((tipo) => ({
    id: tipo.id || uid(),
    nombre: tipo.nombre,
    precio: 0,
  }));
  data.clientes = (data.clientes || []).map((cliente) => ({
    observaciones: "",
    ...cliente,
  }));
  data.productos = (data.productos || []).map((producto) => {
    if (producto.unidadCompra && producto.unidadUso && producto.factor) return normalizeProduct(producto);
    const unidad = producto.unidad || "pieza";
    const esMl = unidad.toLowerCase() === "ml";
    const esGr = unidad.toLowerCase() === "gr";
    const factor = esMl || esGr ? 1000 : 1;
    const unidadCompra = esMl ? "litro" : esGr ? "kilo" : unidad;
    const costo = factor > 1 ? Number(producto.costo || 0) * factor : Number(producto.costo || 0);
    return normalizeProduct({
      ...producto,
      unidadCompra,
      unidadUso: unidad,
      factor,
      costo,
    });
  });
  data.productos = (data.productos || []).map(normalizeProduct);
  if (oldVersion) {
    data.compras = (data.compras || []).map((compra) => {
      const oldProduct = oldProducts.get(compra.productoId);
      const unit = String(oldProduct?.unidad || "").toLowerCase();
      const factor = unit === "ml" || unit === "gr" ? 1000 : 1;
      return factor > 1
        ? {
            ...compra,
            cantidad: Number(compra.cantidad || 0) / factor,
            costoUnitario: Number(compra.costoUnitario || 0) * factor,
          }
        : compra;
    });
  }
  data.compras = (data.compras || []).map((compra) => ({
    pagadoPor: "SISPROVISA",
    operacion: "Sin clasificar",
    ...compra,
    pagadoPor: compra.pagadoPor === "SANTOS" ? "SISPROVISA" : compra.pagadoPor || "SISPROVISA",
    operacion: compra.operacion || "Sin clasificar",
  }));
  data.gastos = (data.gastos || []).map((gasto) => ({
    operacion: "Sin clasificar",
    ...gasto,
    pagadoPor: gasto.pagadoPor === "SANTOS" ? "SISPROVISA" : gasto.pagadoPor,
    operacion: gasto.operacion || "Sin clasificar",
  }));
  data.equipos = (data.equipos || []).map((equipo) => ({
    pagadoPor: "SISPROVISA",
    operacion: "Sin clasificar",
    ...equipo,
    pagadoPor: equipo.pagadoPor === "SANTOS" ? "SISPROVISA" : equipo.pagadoPor || "SISPROVISA",
    operacion: equipo.operacion || "Sin clasificar",
  }));
  data.servicios = (data.servicios || []).map((servicio) => ({
    ciudad: "Yucatan",
    ...servicio,
    ciudad: servicio.ciudad || "Yucatan",
    tecnico: servicio.tecnico === "SISPROVISA" ? "SANTOS" : servicio.tecnico,
  }));
  data.schemaVersion = 2;
  return data;
}

function normalizeProduct(producto) {
  let next = { ...producto };
  const rawUso = String(next.unidadUso || "").trim().toLowerCase();
  const rawCompra = String(next.unidadCompra || "").trim().toLowerCase();
  const factor = Number(next.factor || 1);
  const numericUso = Number(rawUso);

  if (numericUso === 1000) {
    next.factor = 1000;
    next.unidadUso = rawCompra === "kilo" || rawCompra === "kg" ? "gr" : "ml";
  }

  if (rawUso === "1000 ml" || rawUso === "mililitros") {
    next.factor = 1000;
    next.unidadUso = "ml";
  }

  if (rawUso === "1000 gr" || rawUso === "gramos") {
    next.factor = 1000;
    next.unidadUso = "gr";
  }

  if (!next.unidadCompra) {
    next.unidadCompra = next.unidadUso === "gr" ? "kilo" : next.unidadUso === "ml" ? "litro" : "pieza";
  }

  if ((next.unidadCompra === "litro" || next.unidadCompra === "kilo") && Number(next.factor || 0) !== 1000) {
    next.unidadCompra = "envase";
  }

  if (!Number(next.factor || 0)) {
    next.factor = next.unidadUso === "ml" || next.unidadUso === "gr" ? 1000 : 1;
  }

  let cost = Number(next.costo || 0);
  const finalFactor = Number(next.factor || 1);
  const finalUnit = String(next.unidadUso || "").trim().toLowerCase();

  while ((finalUnit === "ml" || finalUnit === "gr") && cost / finalFactor > 50) {
    cost = cost / 1000;
  }
  next.costo = cost;
  return next;
}

function repairAllData() {
  state.productos = state.productos.map(normalizeProduct);
  saveState();
  render();
}

function saveState() {
  saveLocalBackup();
  if (!SERVER_MODE) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }
  saveRemoteState(state).catch(() => {
    alert("No se pudo guardar en la base compartida. Revise que el servidor siga abierto.");
  });
}

function saveLocalBackup() {
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
    backups.unshift({ savedAt: new Date().toISOString(), data: state });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, 25)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar respaldo local", error);
  }
}

function iva(subtotal) {
  return Number(subtotal || 0) * 0.16;
}

function totalServicio(servicio) {
  return Number(servicio.subtotal || 0);
}

function costoProducto(productoId) {
  const product = state.productos.find((p) => p.id === productoId);
  return Number(product?.costo || 0) / Number(product?.factor || 1);
}

function costoCompraPorUnidadUso(compra) {
  const product = state.productos.find((p) => p.id === compra.productoId);
  return Number(compra.costoUnitario || 0) / Number(product?.factor || 1);
}

function nombreProducto(productoId) {
  return state.productos.find((p) => p.id === productoId)?.producto || "Sin producto";
}

function unidadUsoProducto(productoId) {
  return state.productos.find((p) => p.id === productoId)?.unidadUso || "";
}

function unidadCompraProducto(productoId) {
  return state.productos.find((p) => p.id === productoId)?.unidadCompra || "";
}

function cantidadCompradaUso(productoId) {
  const product = state.productos.find((p) => p.id === productoId);
  const factor = Number(product?.factor || 1);
  return state.compras.filter((c) => c.productoId === product?.id).reduce((sum, c) => sum + Number(c.cantidad || 0) * factor, 0);
}

function cantidadCompradaUsoOperacion(productoId, operacion) {
  const product = state.productos.find((p) => p.id === productoId);
  const factor = Number(product?.factor || 1);
  return state.compras
    .filter((c) => c.productoId === product?.id && operacionRegistro(c) === operacion)
    .reduce((sum, c) => sum + Number(c.cantidad || 0) * factor, 0);
}

function cantidadConsumidaUso(productoId) {
  return state.servicios
    .flatMap((s) => s.productos || [])
    .filter((item) => item.productoId === productoId)
    .reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
}

function cantidadConsumidaUsoOperacion(productoId, operacion) {
  return state.servicios
    .filter((servicio) => operacionRegistro(servicio, "Yucatan") === operacion)
    .flatMap((s) => s.productos || [])
    .filter((item) => item.productoId === productoId)
    .reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
}

function nombreCliente(clienteId) {
  return state.clientes.find((c) => c.id === clienteId)?.nombre || "Sin cliente";
}

function costoServicio(servicio) {
  return costoServicioPorLotes(servicio);
}

function serviciosOrdenados() {
  return [...state.servicios].sort((a, b) => {
    const dateCompare = String(a.fecha || "").localeCompare(String(b.fecha || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function comprasOrdenadas(productoId) {
  return state.compras
    .filter((compra) => compra.productoId === productoId)
    .map((compra) => {
      const product = state.productos.find((p) => p.id === productoId);
      return {
        id: compra.id,
        fecha: compra.fecha,
        remaining: Number(compra.cantidad || 0) * Number(product?.factor || 1),
        costPerUse: costoCompraPorUnidadUso(compra),
      };
    })
    .sort((a, b) => {
      const dateCompare = String(a.fecha || "").localeCompare(String(b.fecha || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
}

function lotesRestantesProducto(productoId) {
  const lots = comprasOrdenadas(productoId);

  for (const servicio of serviciosOrdenados()) {
    for (const item of servicio.productos || []) {
      if (item.productoId !== productoId) continue;
      let remainingUse = Number(item.cantidad || 0);
      for (const lot of lots) {
        if (remainingUse <= 0) break;
        if (lot.remaining <= 0) continue;
        const used = Math.min(remainingUse, lot.remaining);
        lot.remaining -= used;
        remainingUse -= used;
      }
    }
  }

  return lots.filter((lot) => lot.remaining > 0);
}

function costoProximoLoteUso(productoId) {
  const lots = lotesRestantesProducto(productoId);
  return lots.length ? lots[0].costPerUse : costoProducto(productoId);
}

function compraPorId(id) {
  return state.compras.find((compra) => compra.id === id);
}

function costoServicioPorLotes(targetService) {
  const lotsByProduct = {};
  let targetCost = 0;

  for (const servicio of serviciosOrdenados()) {
    for (const item of servicio.productos || []) {
      const productId = item.productoId;
      if (!lotsByProduct[productId]) {
        lotsByProduct[productId] = comprasOrdenadas(productId);
      }

      let remainingUse = Number(item.cantidad || 0);
      let itemCost = 0;
      const lots = lotsByProduct[productId];

      for (const lot of lots) {
        if (remainingUse <= 0) break;
        if (lot.remaining <= 0) continue;
        const used = Math.min(remainingUse, lot.remaining);
        itemCost += used * lot.costPerUse;
        lot.remaining -= used;
        remainingUse -= used;
      }

      if (remainingUse > 0) {
        itemCost += remainingUse * costoProducto(productId);
      }

      if (servicio.id === targetService.id) {
        targetCost += itemCost;
      }
    }

    if (servicio.id === targetService.id) {
      return targetCost;
    }
  }

  return targetCost;
}

function pendienteServicio(servicio) {
  return Math.max(0, totalServicio(servicio) - Number(servicio.cobrado || 0));
}

function porcentajeCostoProducto(servicio) {
  const base = Number(servicio.cobrado || 0) || totalServicio(servicio);
  return base > 0 ? costoServicio(servicio) / base : 0;
}

function serviciosPendientes() {
  return state.servicios.filter((servicio) => pendienteServicio(servicio) > 0);
}

function clientesPorTipo() {
  return state.clientes.reduce((rows, cliente) => {
    const tipo = cliente.tipo || "Sin tipo";
    rows[tipo] = (rows[tipo] || 0) + 1;
    return rows;
  }, {});
}

function gastosPorPagador() {
  return gastosFiltradosOperacion().reduce((rows, gasto) => {
    const pagador = gasto.pagadoPor || "Sin dato";
    rows[pagador] = (rows[pagador] || 0) + Number(gasto.monto || 0);
    return rows;
  }, {});
}

function comprasPorPagador() {
  return comprasFiltradasOperacion().reduce((rows, compra) => {
    const pagador = compra.pagadoPor || "Sin dato";
    const total = Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0);
    rows[pagador] = (rows[pagador] || 0) + total;
    return rows;
  }, {});
}

function totalComprasProductos() {
  return comprasFiltradasOperacion().reduce((sum, compra) => sum + Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0), 0);
}

function equiposPorPagador() {
  return equiposFiltradosOperacion().reduce((rows, equipo) => {
    const pagador = equipo.pagadoPor || "Sin dato";
    rows[pagador] = (rows[pagador] || 0) + costoTotalEquipo(equipo);
    return rows;
  }, {});
}

function totalInversionYGastoPorPagador() {
  const rows = {};
  const add = (pagador, value) => {
    const key = pagador || "Sin dato";
    rows[key] = (rows[key] || 0) + Number(value || 0);
  };

  gastosFiltradosOperacion().forEach((gasto) => add(gasto.pagadoPor, gasto.monto));
  comprasFiltradasOperacion().forEach((compra) => add(compra.pagadoPor, Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0)));
  equiposFiltradosOperacion().forEach((equipo) => add(equipo.pagadoPor, costoTotalEquipo(equipo)));

  return rows;
}

function ventasPorCiudad() {
  return serviciosFiltradosOperacion().reduce((rows, servicio) => {
    const ciudad = servicio.ciudad || "Yucatan";
    rows[ciudad] = (rows[ciudad] || 0) + totalServicio(servicio);
    return rows;
  }, {});
}

function gastoDepreciacionMensual(rows = state.equipos) {
  return rows.reduce((sum, item) => {
    const base = costoTotalEquipo(item) - Number(item.residual || 0);
    const vida = Number(item.vida || 0);
    return sum + (vida > 0 ? base / vida / 12 : 0);
  }, 0);
}

function inversionEquipos(rows = state.equipos) {
  return rows.reduce((sum, item) => sum + costoTotalEquipo(item), 0);
}

function depreciacionAcumuladaEquipos(rows = state.equipos) {
  return rows.reduce((sum, item) => sum + depreciacionAcumulada(item), 0);
}

function depreciacionAcumulada(item) {
  if (!item.fecha || !item.vida) return 0;
  const base = costoTotalEquipo(item) - Number(item.residual || 0);
  const mensual = base / Number(item.vida) / 12;
  const months = Math.max(0, (new Date() - new Date(item.fecha)) / (1000 * 60 * 60 * 24 * 30.44));
  return Math.min(base, months * mensual);
}

function costoTotalEquipo(item) {
  const cantidad = Number(item.unidad || 1) || 1;
  return cantidad * Number(item.costo || 0);
}

function operacionRegistro(registro, fallback = "Sin clasificar") {
  return registro.operacion || registro.ciudad || fallback;
}

function matchesOperacion(registro, fallback = "Sin clasificar") {
  return operacionFilter === "Todas" || operacionRegistro(registro, fallback) === operacionFilter;
}

function serviciosFiltradosOperacion() {
  return state.servicios.filter((servicio) => matchesOperacion(servicio, "Yucatan"));
}

function comprasFiltradasOperacion() {
  return state.compras.filter((compra) => matchesOperacion(compra));
}

function gastosFiltradosOperacion() {
  return state.gastos.filter((gasto) => matchesOperacion(gasto));
}

function equiposFiltradosOperacion() {
  return state.equipos.filter((equipo) => matchesOperacion(equipo));
}

function operationFilterControl() {
  const options = ["Todas", "Yucatan", "CDMX", "Sin clasificar"];
  return `
    <div class="field compact-filter">
      <label>Operacion</label>
      <select id="operacionFilter">
        ${options.map((option) => `<option value="${option}" ${option === operacionFilter ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </div>
  `;
}

function metrics() {
  const servicios = serviciosFiltradosOperacion();
  const gastosRows = gastosFiltradosOperacion();
  const comprasRows = comprasFiltradasOperacion();
  const equiposRows = equiposFiltradosOperacion();
  const cobrado = servicios.reduce((sum, s) => sum + Number(s.cobrado || 0), 0);
  const facturado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
  const porCobrar = servicios.reduce((sum, s) => sum + pendienteServicio(s), 0);
  const costoProductos = servicios.reduce((sum, s) => sum + costoServicio(s), 0);
  const gastos = gastosRows.reduce((sum, g) => sum + Number(g.monto || 0), 0);
  const comprasProductos = comprasRows.reduce((sum, compra) => sum + Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0), 0);
  const depreciacion = gastoDepreciacionMensual(equiposRows);
  const inversionEquipo = inversionEquipos(equiposRows);
  const depreciacionEquipoAcumulada = depreciacionAcumuladaEquipos(equiposRows);
  const totalClientes = state.clientes.length;
  const utilidad = cobrado - costoProductos - gastos - depreciacion;
  const margen = cobrado > 0 ? utilidad / cobrado : 0;
  return {
    cobrado,
    facturado,
    porCobrar,
    costoProductos,
    gastos,
    comprasProductos,
    depreciacion,
    inversionEquipo,
    depreciacionEquipoAcumulada,
    valorNetoEquipo: Math.max(0, inversionEquipo - depreciacionEquipoAcumulada),
    utilidad,
    margen,
    servicios: servicios.length,
    totalClientes,
    ticket: state.servicios.length ? facturado / state.servicios.length : 0,
  };
}

function can(moduleId) {
  return modules.find((m) => m.id === moduleId)?.roles.includes(currentUser.role);
}

function render() {
  const app = document.querySelector("#app");
  if (!state) {
    app.innerHTML = `<div class="main"><div class="panel"><h2>Cargando GS Burak...</h2><p class="readonly">Preparando datos.</p></div></div>`;
    return;
  }
  if (!currentUser) {
    app.innerHTML = renderLogin();
    bindLogin();
    return;
  }

  if (!can(activeModule)) activeModule = "dashboard";
  app.innerHTML = `
    <div class="shell">
      ${renderSidebar()}
      <main class="main">
        ${renderModule()}
      </main>
    </div>
    ${modal ? renderModal() : ""}
  `;
  bindApp();
}

function renderLogin() {
  return `
    <section class="login-shell">
      <div class="login-copy">
        <h1>GS Burak Control Operativo</h1>
        <p>Plataforma administrativa GS BURAK</p>
      </div>
      <form class="login-card" id="loginForm">
        <h2>Entrar</h2>
        <small>Prototipo de prueba con dos usuarios.</small>
        <div class="field">
          <label>Usuario</label>
          <select name="user">
            <option value="admin">Administrador</option>
            <option value="tecnico">Tecnico</option>
          </select>
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input name="password" type="password" value="admin123" />
        </div>
        <div class="form-actions">
          <button class="primary" type="submit">Entrar</button>
        </div>
        <div class="hint">
          Administrador: admin123<br />
          Tecnico: tecnico123
        </div>
      </form>
    </section>
  `;
}

function bindLogin() {
  document.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const user = users.find((u) => u.id === data.user && u.password === data.password);
    if (!user) {
      alert("Usuario o contraseña incorrectos.");
      return;
    }
    currentUser = user;
    render();
  });
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-logo" src="logo-gs-burak.png" alt="GS Burak" />
      </div>
      <nav class="nav">
        ${modules
          .filter((m) => m.roles.includes(currentUser.role))
          .map((m) => `<button data-module="${m.id}" class="${activeModule === m.id ? "active" : ""}"><span>${m.icon}</span>${m.label}</button>`)
          .join("")}
      </nav>
      <div class="user-box">
        <strong>${currentUser.name}</strong>
        <span>${currentUser.role === "admin" ? "Administrador" : "Operativo / Tecnico"}</span>
        <button class="ghost" data-action="logout">Salir</button>
      </div>
    </aside>
  `;
}

function topbar(title, subtitle, button = "") {
  return `
    <div class="topbar">
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="toolbar">${button}</div>
    </div>
  `;
}

function renderModule() {
  const map = {
    dashboard: renderDashboard,
    clientes: renderClientes,
    servicios: renderServicios,
    tiposServicio: renderTiposServicio,
    productos: renderProductos,
    compras: renderCompras,
    gastos: renderGastos,
    equipos: renderEquipos,
  };
  return map[activeModule]();
}

function renderDashboard() {
  const m = metrics();
  const showMoney = currentUser.role === "admin";
  const monthly = groupByMonth();
  return `
    ${topbar("Dashboard", "Resumen automatico de la operacion y resultados.", operationFilterControl())}
    ${currentUser.role !== "admin" ? `<div class="notice">Tu usuario puede capturar clientes y servicios. Las metricas financieras completas quedan reservadas para administrador.</div>` : ""}
    <section class="grid kpis">
      <div class="kpi"><span>Ventas totales</span><strong>${showMoney ? money(m.facturado) : "Restringido"}</strong><small>Todos los servicios</small></div>
      <div class="kpi"><span>Ingresos cobrados</span><strong>${showMoney ? money(m.cobrado) : "Restringido"}</strong><small>Pagos registrados</small></div>
      <div class="kpi"><span>Por cobrar</span><strong>${showMoney ? money(m.porCobrar) : "Restringido"}</strong><small>Servicios pendientes</small></div>
      <div class="kpi"><span>Servicios</span><strong>${number(m.servicios)}</strong><small>Capturados</small></div>
      <div class="kpi"><span>Clientes</span><strong>${number(m.totalClientes)}</strong><small>Registrados</small></div>
      <div class="kpi"><span>Ticket promedio</span><strong>${showMoney ? money(m.ticket) : "Restringido"}</strong><small>Importe por servicio</small></div>
      ${showMoney ? `
      <div class="kpi"><span>Costo productos</span><strong>${money(m.costoProductos)}</strong><small>Consumo registrado</small></div>
      <div class="kpi"><span>Gastos operativos</span><strong>${money(m.gastos)}</strong><small>Gastos capturados</small></div>
      <div class="kpi"><span>Compra productos</span><strong>${money(m.comprasProductos)}</strong><small>Inversion en inventario</small></div>
      <div class="kpi"><span>Depreciacion mensual</span><strong>${money(m.depreciacion)}</strong><small>Equipos</small></div>
      <div class="kpi"><span>Utilidad neta</span><strong>${money(m.utilidad)}</strong><small>Margen ${(m.margen * 100).toFixed(1)}%</small></div>
      <div class="kpi"><span>Inversion equipos</span><strong>${money(m.inversionEquipo)}</strong><small>Costo de adquisicion</small></div>
      <div class="kpi"><span>Deprec. acumulada</span><strong>${money(m.depreciacionEquipoAcumulada)}</strong><small>Desgaste registrado</small></div>
      <div class="kpi"><span>Valor neto equipos</span><strong>${money(m.valorNetoEquipo)}</strong><small>Inversion menos depreciacion</small></div>` : ""}
    </section>
    <section class="grid two" style="margin-top:14px">
      <div class="panel">
        <h2>Resumen mensual</h2>
        <div class="bars">
          ${monthly.map((row) => renderBar(row.month, row.facturado, Math.max(...monthly.map((r) => r.facturado), 1), showMoney)).join("")}
        </div>
      </div>
      <div class="panel">
        <h2>Servicios recientes</h2>
        ${renderMiniServices()}
      </div>
    </section>
    ${renderClientesTipoResumen()}
    ${showMoney ? renderGastosPagadorResumen() : ""}
    ${showMoney ? renderComprasPagadorResumen() : ""}
    ${showMoney ? renderEquiposPagadorResumen() : ""}
    ${showMoney ? renderTotalPagadorResumen() : ""}
    ${showMoney ? renderVentasCiudadResumen() : ""}
    ${showMoney ? renderPendientesResumen() : ""}
  `;
}

function renderBar(label, value, max, showMoney, format = "money") {
  const width = Math.round((value / max) * 100);
  const display = format === "clientes" ? `${number(value)} clientes` : showMoney ? money(value) : number(width) + "%";
  return `
    <div class="bar-row">
      <span>${label}</span>
      <div class="bar-track"><div class="bar" style="width:${width}%"></div></div>
      <strong>${display}</strong>
    </div>
  `;
}

function groupByMonth() {
  const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rows = labels.map((month) => ({ month, facturado: 0, cobrado: 0, servicios: 0 }));
  serviciosFiltradosOperacion().forEach((s) => {
    const idx = new Date(s.fecha + "T00:00:00").getMonth();
    rows[idx].facturado += totalServicio(s);
    rows[idx].cobrado += Number(s.cobrado || 0);
    rows[idx].servicios += 1;
  });
  return rows.filter((row) => row.facturado || row.cobrado || row.servicios).length ? rows : [{ month: "Sin datos", facturado: 0, cobrado: 0, servicios: 0 }];
}

function comprasPorMes() {
  const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rows = labels.map((month) => ({ month, total: 0, compras: 0 }));
  comprasFiltradasOperacion().forEach((compra) => {
    if (!compra.fecha) return;
    const idx = new Date(compra.fecha + "T00:00:00").getMonth();
    if (Number.isNaN(idx)) return;
    rows[idx].total += Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0);
    rows[idx].compras += 1;
  });
  return rows.filter((row) => row.total || row.compras);
}

function gastosPorMes() {
  const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rows = labels.map((month) => ({ month, total: 0, gastos: 0 }));
  gastosFiltradosOperacion().forEach((gasto) => {
    if (!gasto.fecha) return;
    const idx = new Date(gasto.fecha + "T00:00:00").getMonth();
    if (Number.isNaN(idx)) return;
    rows[idx].total += Number(gasto.monto || 0);
    rows[idx].gastos += 1;
  });
  return rows.filter((row) => row.total || row.gastos);
}

function renderMiniServices() {
  const rows = [...state.servicios].slice(-5).reverse();
  if (!rows.length) return `<p class="readonly">Aun no hay servicios capturados.</p>`;
  return `<div class="table-card"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Estatus</th></tr></thead><tbody>${rows
    .map((s) => `<tr><td data-label="Fecha">${s.fecha}</td><td data-label="Cliente">${nombreCliente(s.clienteId)}</td><td data-label="Estatus">${paymentPill(s)}</td></tr>`)
    .join("")}</tbody></table></div>`;
}

function renderPendientesResumen() {
  const rows = clientesPendientesResumen();
  const total = rows.reduce((sum, row) => sum + row.pendiente, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Clientes con saldo pendiente (${money(total)})</h2>
      <div class="table-card">
        <table>
          <thead><tr><th>Cliente</th><th>Servicios pendientes</th><th>Ultimo servicio</th><th>Total</th><th>Cobrado</th><th>Pendiente</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Cliente"><strong>${row.cliente}</strong></td><td data-label="Servicios pendientes">${number(row.servicios)} servicio${row.servicios === 1 ? "" : "s"}</td><td data-label="Ultimo servicio">${row.ultimaFecha || ""}<br><span class="readonly">${row.ultimoTipo || ""}</span></td><td data-label="Total">${money(row.total)}</td><td data-label="Cobrado">${money(row.cobrado)}</td><td data-label="Pendiente"><strong>${money(row.pendiente)}</strong></td></tr>`).join("")
                : `<tr><td colspan="6">No hay saldos pendientes.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function clientesPendientesResumen() {
  const grouped = {};
  serviciosPendientes().forEach((servicio) => {
    const clienteId = servicio.clienteId || "sin-cliente";
    if (!grouped[clienteId]) {
      grouped[clienteId] = {
        cliente: nombreCliente(clienteId),
        servicios: 0,
        total: 0,
        cobrado: 0,
        pendiente: 0,
        ultimaFecha: "",
        ultimoTipo: "",
      };
    }
    const row = grouped[clienteId];
    row.servicios += 1;
    row.total += totalServicio(servicio);
    row.cobrado += Number(servicio.cobrado || 0);
    row.pendiente += pendienteServicio(servicio);
    if (String(servicio.fecha || "") >= String(row.ultimaFecha || "")) {
      row.ultimaFecha = servicio.fecha || "";
      row.ultimoTipo = servicio.tipo || "";
    }
  });
  return Object.values(grouped).sort((a, b) => {
    const pendingCompare = b.pendiente - a.pendiente;
    if (pendingCompare !== 0) return pendingCompare;
    return a.cliente.localeCompare(b.cliente);
  });
}

function renderClientesTipoResumen() {
  const rows = Object.entries(clientesPorTipo()).sort((a, b) => b[1] - a[1]);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Clientes por tipo</h2>
      <div class="bars">
        ${
          rows.length
            ? rows.map(([tipo, total]) => renderBar(tipo, total, Math.max(...rows.map((row) => row[1]), 1), true, "clientes")).join("")
            : `<p class="readonly">Aun no hay clientes registrados.</p>`
        }
      </div>
    </section>
  `;
}

function renderGastosPagadorResumen() {
  const rows = Object.entries(gastosPorPagador()).sort((a, b) => b[1] - a[1]);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Gastos pagados por</h2>
      <div class="bars">
        ${
          rows.length
            ? rows.map(([pagador, total]) => renderBar(pagador, total, Math.max(...rows.map((row) => row[1]), 1), true)).join("")
            : `<p class="readonly">Aun no hay gastos registrados.</p>`
        }
      </div>
    </section>
  `;
}

function renderComprasPagadorResumen() {
  const rows = Object.entries(comprasPorPagador()).sort((a, b) => b[1] - a[1]);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Compras pagadas por</h2>
      <div class="bars">
        ${
          rows.length
            ? rows.map(([pagador, total]) => renderBar(pagador, total, Math.max(...rows.map((row) => row[1]), 1), true)).join("")
            : `<p class="readonly">Aun no hay compras registradas.</p>`
        }
      </div>
    </section>
  `;
}

function renderEquiposPagadorResumen() {
  const rows = Object.entries(equiposPorPagador()).sort((a, b) => b[1] - a[1]);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Equipos pagados por</h2>
      <div class="bars">
        ${
          rows.length
            ? rows.map(([pagador, total]) => renderBar(pagador, total, Math.max(...rows.map((row) => row[1]), 1), true)).join("")
            : `<p class="readonly">Aun no hay equipos registrados.</p>`
        }
      </div>
    </section>
  `;
}

function renderTotalPagadorResumen() {
  const rows = Object.entries(totalInversionYGastoPorPagador()).sort((a, b) => b[1] - a[1]);
  const totalGeneral = rows.reduce((sum, row) => sum + row[1], 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Total inversion y gasto por socio (${money(totalGeneral)})</h2>
      <div class="bars">
        ${
          rows.length
            ? rows.map(([pagador, total]) => renderBar(pagador, total, Math.max(...rows.map((row) => row[1]), 1), true)).join("")
            : `<p class="readonly">Aun no hay compras, gastos o equipos registrados.</p>`
        }
      </div>
    </section>
  `;
}

function renderVentasCiudadResumen() {
  const rows = Object.entries(ventasPorCiudad()).sort((a, b) => b[1] - a[1]);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Ventas por ciudad</h2>
      <div class="bars">
        ${
          rows.length
            ? rows.map(([ciudad, total]) => renderBar(ciudad, total, Math.max(...rows.map((row) => row[1]), 1), true)).join("")
            : `<p class="readonly">Aun no hay ventas registradas.</p>`
        }
      </div>
    </section>
  `;
}

function paymentPill(s) {
  const pendiente = pendienteServicio(s);
  return pendiente > 0 ? `<span class="pill pending">Por cobrar</span>` : `<span class="pill good">Cobrado</span>`;
}

function renderClientes() {
  const term = clienteSearch.trim().toLowerCase();
  const tipos = [...new Set(state.clientes.map((c) => c.tipo || "Sin tipo"))].sort();
  const clientes = state.clientes
    .filter((c) => !clienteTipoFilter || (c.tipo || "Sin tipo") === clienteTipoFilter)
    .filter((c) => {
      if (!term) return true;
      return [c.nombre, c.telefono, c.correo, c.direccion, c.tipo, c.observaciones]
        .some((value) => String(value || "").toLowerCase().includes(term));
    })
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
  return `
    ${topbar("Clientes", "Alta, contacto, direccion e historial financiero por cliente.", `<button class="primary" data-open="cliente">Nuevo cliente</button>`)}
    <section class="panel filters">
      <div class="field">
        <label>Buscar cliente</label>
        <input id="clienteSearch" type="search" placeholder="Nombre, telefono, direccion u observaciones" value="${clienteSearch}" />
      </div>
      <div class="field">
        <label>Tipo</label>
        <select id="clienteTipoFilter">
          <option value="">Todos</option>
          ${tipos.map((tipo) => `<option value="${tipo}" ${tipo === clienteTipoFilter ? "selected" : ""}>${tipo}</option>`).join("")}
        </select>
      </div>
      <div class="filter-count">
        ${number(clientes.length)} de ${number(state.clientes.length)} clientes
      </div>
    </section>
    <div class="table-card service-list">
      <table>
        <thead><tr><th>Cliente</th><th>Telefono</th><th>Tipo</th><th>Servicios</th><th>Facturado</th><th>Por cobrar</th><th></th></tr></thead>
        <tbody>
          ${clientes.length ? clientes.map((c) => {
            const servicios = state.servicios.filter((s) => s.clienteId === c.id);
            const facturado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
            const cobrado = servicios.reduce((sum, s) => sum + Number(s.cobrado || 0), 0);
            return `<tr><td data-label="Cliente"><strong>${c.nombre}</strong><br><span class="readonly">${c.direccion || ""}</span>${c.observaciones ? `<br><span class="readonly">${c.observaciones}</span>` : ""}</td><td data-label="Telefono">${c.telefono || ""}</td><td data-label="Tipo">${c.tipo || ""}</td><td data-label="Servicios">${servicios.length}</td><td data-label="Facturado">${money(facturado)}</td><td data-label="Por cobrar">${money(Math.max(0, facturado - cobrado))}</td><td data-label="Acciones">${rowActions("cliente", c.id)}</td></tr>`;
          }).join("") : `<tr><td colspan="7">No hay clientes que coincidan con la busqueda.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderServiciosAnterior() {
  return `
    ${topbar("Servicios / Ventas", "Captura de servicios, cobros, formas de pago y productos usados.", `<button class="primary" data-open="servicio">Nuevo servicio</button>`)}
    <div class="table-card">
      <table>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Ciudad</th><th>Servicio</th><th>Total</th><th>Cobrado</th><th>Pendiente</th><th>Costo prod.</th><th>% producto</th><th>Estatus</th><th></th></tr></thead>
        <tbody>
          ${state.servicios.map((s) => `<tr><td data-label="Fecha">${s.fecha}</td><td data-label="Cliente">${nombreCliente(s.clienteId)}</td><td data-label="Ciudad">${s.ciudad || "Yucatan"}</td><td data-label="Servicio">${s.tipo}<br><span class="readonly">${s.tecnico || ""} · ${s.zona || ""}</span></td><td data-label="Total">${money(totalServicio(s))}</td><td data-label="Cobrado">${money(s.cobrado)}</td><td data-label="Pendiente">${money(pendienteServicio(s))}</td><td data-label="Costo prod.">${currentUser.role === "admin" ? money(costoServicio(s)) : "Restringido"}</td><td data-label="% producto">${currentUser.role === "admin" ? `${(porcentajeCostoProducto(s) * 100).toFixed(1)}%` : "Restringido"}</td><td data-label="Estatus">${paymentPill(s)}</td><td data-label="Acciones">${rowActions("servicio", s.id)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderServicios() {
  const term = servicioSearch.trim().toLowerCase();
  const servicios = serviciosFiltradosOperacion()
    .filter((s) => {
      if (!term) return true;
      return nombreCliente(s.clienteId).toLowerCase().includes(term);
    })
    .sort((a, b) => {
      const dateCompare = String(b.fecha || "").localeCompare(String(a.fecha || ""));
      if (dateCompare !== 0) return dateCompare;
      const clientCompare = nombreCliente(a.clienteId).localeCompare(nombreCliente(b.clienteId));
      if (clientCompare !== 0) return clientCompare;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  const totalFiltrado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
  const rows = servicios.map((s) => {
    const costo = currentUser.role === "admin" ? money(costoServicio(s)) : "Restringido";
    const porcentaje = currentUser.role === "admin" ? `${(porcentajeCostoProducto(s) * 100).toFixed(1)}%` : "Restringido";
    return `<tr><td data-label="Fecha">${s.fecha}</td><td data-label="Cliente">${nombreCliente(s.clienteId)}</td><td data-label="Ciudad">${s.ciudad || "Yucatan"}</td><td data-label="Servicio">${s.tipo}<br><span class="readonly">${s.tecnico || ""} - ${s.zona || ""}</span></td><td data-label="Total">${money(totalServicio(s))}</td><td data-label="Cobrado">${money(s.cobrado)}</td><td data-label="Pendiente">${money(pendienteServicio(s))}</td><td data-label="Costo prod.">${costo}</td><td data-label="% producto">${porcentaje}</td><td data-label="Estatus">${paymentPill(s)}</td><td data-label="Acciones">${rowActions("servicio", s.id)}</td></tr>`;
  }).join("");
  return `
    ${topbar("Servicios / Ventas", "Captura de servicios, cobros, formas de pago y productos usados.", `${operationFilterControl()}<button class="primary" data-open="servicio">Nuevo servicio</button>`)}
    <section class="panel filters">
      <div class="field">
        <label>Buscar servicios por cliente</label>
        <input id="servicioSearch" type="search" placeholder="Escribe el nombre del cliente" value="${servicioSearch}" />
      </div>
      <div class="filter-count">
        ${number(servicios.length)} de ${number(serviciosFiltradosOperacion().length)} servicios en ${operacionFilter}
        ${term ? `<br><strong>${money(totalFiltrado)}</strong> en servicios encontrados` : ""}
      </div>
    </section>
    <div class="table-card service-list">
      <table>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Ciudad</th><th>Servicio</th><th>Total</th><th>Cobrado</th><th>Pendiente</th><th>Costo prod.</th><th>% producto</th><th>Estatus</th><th></th></tr></thead>
        <tbody>
          ${rows || `<tr><td colspan="11">No hay servicios para ese cliente.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderTiposServicio() {
  return `
    ${topbar("Tipos de servicio", "Catalogo editable para clasificar los servicios vendidos.", `<button class="primary" data-open="tipoServicio">Nuevo tipo</button>`)}
    <div class="table-card">
      <table>
        <thead><tr><th>Tipo de servicio</th><th></th></tr></thead>
        <tbody>
          ${state.tiposServicio.map((tipo) => `<tr><td data-label="Tipo de servicio"><strong>${tipo.nombre}</strong></td><td data-label="Acciones">${rowActions("tipoServicio", tipo.id || tipo.nombre)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderProductos() {
  const productosConCompras = state.productos.filter((p) => state.compras.some((c) => c.productoId === p.id));
  const stockOperacionRows = state.productos.map((p) => {
    const yucatanComprado = cantidadCompradaUsoOperacion(p.id, "Yucatan");
    const yucatanConsumido = cantidadConsumidaUsoOperacion(p.id, "Yucatan");
    const cdmxComprado = cantidadCompradaUsoOperacion(p.id, "CDMX");
    const cdmxConsumido = cantidadConsumidaUsoOperacion(p.id, "CDMX");
    const sinClasificarComprado = cantidadCompradaUsoOperacion(p.id, "Sin clasificar");
    const sinClasificarConsumido = cantidadConsumidaUsoOperacion(p.id, "Sin clasificar");
    return {
      producto: p,
      yucatan: yucatanComprado - yucatanConsumido,
      cdmx: cdmxComprado - cdmxConsumido,
      sinClasificar: sinClasificarComprado - sinClasificarConsumido,
      total: cantidadCompradaUso(p.id) - cantidadConsumidaUso(p.id),
    };
  });
  const lotesHtml = productosConCompras.map((p) => {
    const lotes = lotesRestantesProducto(p.id);
    const allLots = comprasOrdenadas(p.id);
    return `
      <section class="lot-group">
        <h3>${p.producto}</h3>
        <div class="table-card">
          <table>
            <thead><tr><th>Fecha</th><th>Comprado</th><th>Costo unidad</th><th>Costo uso</th><th>Restante</th><th>Pagado por</th></tr></thead>
            <tbody>
              ${allLots.map((lot) => {
                const compra = compraPorId(lot.id);
                const remainingLot = lotes.find((x) => x.id === lot.id);
                const remaining = remainingLot ? remainingLot.remaining : 0;
                return `<tr><td data-label="Fecha">${compra?.fecha || ""}</td><td data-label="Comprado">${number(Number(compra?.cantidad || 0) * Number(p.factor || 1))} ${p.unidadUso || ""}</td><td data-label="Costo unidad">${money(compra?.costoUnitario)}</td><td data-label="Costo uso">${money(lot.costPerUse)} / ${p.unidadUso || "uso"}</td><td data-label="Restante">${number(remaining)} ${p.unidadUso || ""}</td><td data-label="Pagado por">${compra?.pagadoPor || ""}</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }).join("");
  return `
    ${topbar("Productos / Inventario", "Catalogo, costo unitario, compras, consumo y stock actual.", `<button class="secondary" data-action="repairData">Reparar unidades</button><button class="primary" data-open="producto">Nuevo producto</button>`)}
    <div class="table-card">
      <table>
        <thead><tr><th>Producto</th><th>Compra</th><th>Uso</th><th>Costo ref.</th><th>Próximo costo FIFO</th><th>Lotes disponibles</th><th>Comprado</th><th>Consumido</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          ${state.productos.map((p) => {
            const comprado = cantidadCompradaUso(p.id);
            const consumido = cantidadConsumidaUso(p.id);
            const lotes = lotesRestantesProducto(p.id);
            return `<tr><td data-label="Producto"><strong>${p.producto}</strong></td><td data-label="Compra">1 ${p.unidadCompra || ""}</td><td data-label="Uso">${p.factor || 1} ${p.unidadUso || ""}</td><td data-label="Costo ref.">${money(p.costo)}</td><td data-label="Próximo costo FIFO">${money(costoProximoLoteUso(p.id))} / ${p.unidadUso || "uso"}</td><td data-label="Lotes disponibles">${number(lotes.length)}</td><td data-label="Comprado">${number(comprado)} ${p.unidadUso || ""}</td><td data-label="Consumido">${number(consumido)} ${p.unidadUso || ""}</td><td data-label="Stock">${number(comprado - consumido)} ${p.unidadUso || ""}</td><td data-label="Acciones">${rowActions("producto", p.id)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <section class="panel" style="margin-top:14px">
      <h2>Stock por operacion</h2>
      <div class="table-card">
        <table>
          <thead><tr><th>Producto</th><th>Yucatan</th><th>CDMX</th><th>Sin clasificar</th><th>Total global</th></tr></thead>
          <tbody>
            ${stockOperacionRows.map((row) => `<tr><td data-label="Producto"><strong>${row.producto.producto}</strong><br><span class="readonly">${row.producto.unidadUso || ""}</span></td><td data-label="Yucatan">${number(row.yucatan)} ${row.producto.unidadUso || ""}</td><td data-label="CDMX">${number(row.cdmx)} ${row.producto.unidadUso || ""}</td><td data-label="Sin clasificar">${number(row.sinClasificar)} ${row.producto.unidadUso || ""}</td><td data-label="Total global"><strong>${number(row.total)} ${row.producto.unidadUso || ""}</strong></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="readonly">Vista informativa: el costo FIFO y los lotes siguen calculandose de forma global hasta clasificar las compras existentes.</p>
    </section>
    <section class="panel lotes-panel">
      <h2>Lotes por producto</h2>
      ${lotesHtml || `<p class="readonly">Aun no hay compras registradas.</p>`}
    </section>
  `;
}

function renderCompras() {
  const comprasRows = comprasFiltradasOperacion();
  const productosConMovimiento = state.productos
    .filter((p) => comprasRows.some((c) => c.productoId === p.id) || cantidadConsumidaUso(p.id) > 0)
    .sort((a, b) => String(a.producto || "").localeCompare(String(b.producto || "")));
  const comprasMensuales = comprasPorMes();
  const maxCompraMensual = Math.max(...comprasMensuales.map((row) => row.total), 1);
  return `
    ${topbar("Compras", "Entradas de producto para alimentar inventario.", `${operationFilterControl()}<button class="primary" data-open="compra">Nueva compra</button>`)}
    <section class="panel">
      <h2>Compras por mes</h2>
      <div class="bars">
        ${
          comprasMensuales.length
            ? comprasMensuales.map((row) => `${renderBar(row.month, row.total, maxCompraMensual, true)}<span class="readonly">${number(row.compras)} compra${row.compras === 1 ? "" : "s"}</span>`).join("")
            : `<p class="readonly">Aun no hay compras registradas.</p>`
        }
      </div>
    </section>
    ${renderComprasPagadorResumen()}
    <section class="panel" style="margin-top:14px">
      <h2>Stock por producto</h2>
      <div class="table-card service-list">
        <table>
          <thead><tr><th>Producto</th><th>Comprado</th><th>Usado</th><th>Stock disponible</th><th>Lotes abiertos</th><th>Proximo costo</th></tr></thead>
          <tbody>
            ${productosConMovimiento.length ? productosConMovimiento.map((p) => {
              const comprado = cantidadCompradaUso(p.id);
              const consumido = cantidadConsumidaUso(p.id);
              const stock = comprado - consumido;
              const lotes = lotesRestantesProducto(p.id);
              return `<tr><td data-label="Producto"><strong>${p.producto}</strong></td><td data-label="Comprado">${number(comprado)} ${p.unidadUso || ""}</td><td data-label="Usado">${number(consumido)} ${p.unidadUso || ""}</td><td data-label="Stock disponible"><strong>${number(stock)} ${p.unidadUso || ""}</strong></td><td data-label="Lotes abiertos">${number(lotes.length)}</td><td data-label="Proximo costo">${money(costoProximoLoteUso(p.id))} / ${p.unidadUso || "uso"}</td></tr>`;
            }).join("") : `<tr><td colspan="6">Aun no hay compras registradas.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel" style="margin-top:14px">
      <h2>Historial de compras</h2>
    </section>
    <div class="table-card">
      <table>
        <thead><tr><th>Fecha</th><th>Operacion</th><th>Producto</th><th>Cantidad comprada</th><th>Costo unidad compra</th><th>Total</th><th>Proveedor</th><th>Pagado por</th><th></th></tr></thead>
        <tbody>${comprasRows.map((c) => `<tr><td data-label="Fecha">${c.fecha}</td><td data-label="Operacion">${operacionRegistro(c)}</td><td data-label="Producto">${nombreProducto(c.productoId)}</td><td data-label="Cantidad">${number(c.cantidad)} ${unidadCompraProducto(c.productoId)}</td><td data-label="Costo unidad">${money(c.costoUnitario)}</td><td data-label="Total">${money(Number(c.cantidad || 0) * Number(c.costoUnitario || 0))}</td><td data-label="Proveedor">${c.proveedor || ""}</td><td data-label="Pagado por">${c.pagadoPor || ""}</td><td data-label="Acciones">${rowActions("compra", c.id)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderGastos() {
  const gastosRows = gastosFiltradosOperacion();
  const gastosMensuales = gastosPorMes();
  const maxGastoMensual = Math.max(...gastosMensuales.map((row) => row.total), 1);
  const gastosOrdenados = [...gastosRows].sort((a, b) => {
    const dateCompare = String(b.fecha || "").localeCompare(String(a.fecha || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
  return `
    ${topbar("Gastos", "Gastos operativos por categoria, comprobante y responsable.", `${operationFilterControl()}<button class="primary" data-open="gasto">Nuevo gasto</button>`)}
    <section class="panel">
      <h2>Gastos por mes</h2>
      <div class="bars">
        ${
          gastosMensuales.length
            ? gastosMensuales.map((row) => `${renderBar(row.month, row.total, maxGastoMensual, true)}<span class="readonly">${number(row.gastos)} gasto${row.gastos === 1 ? "" : "s"}</span>`).join("")
            : `<p class="readonly">Aun no hay gastos registrados.</p>`
        }
      </div>
    </section>
    ${renderGastosPagadorResumen()}
    <section class="panel" style="margin-top:14px">
      <h2>Historial de gastos</h2>
    </section>
    <div class="table-card">
      <table>
        <thead><tr><th>Fecha</th><th>Operacion</th><th>Categoria</th><th>Descripcion</th><th>Monto</th><th>Pagado por</th><th></th></tr></thead>
        <tbody>${gastosOrdenados.map((g) => `<tr><td data-label="Fecha">${g.fecha}</td><td data-label="Operacion">${operacionRegistro(g)}</td><td data-label="Categoria">${g.categoria}</td><td data-label="Descripcion">${g.descripcion || ""}<br><span class="readonly">${g.comprobante || ""}</span></td><td data-label="Monto">${money(g.monto)}</td><td data-label="Pagado por">${g.pagadoPor || ""}</td><td data-label="Acciones">${rowActions("gasto", g.id)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderEquipos() {
  const equiposRows = equiposFiltradosOperacion();
  return `
    ${topbar("Equipos", "Activos, vida util, depreciacion mensual y acumulada.", `${operationFilterControl()}<button class="primary" data-open="equipo">Nuevo equipo</button>`)}
    ${renderEquiposPagadorResumen()}
    <section class="panel" style="margin-top:14px">
      <h2>Historial de equipos</h2>
    </section>
    <div class="table-card">
      <table>
        <thead><tr><th>Equipo</th><th>Operacion</th><th>Cantidad</th><th>Costo unitario</th><th>Costo total</th><th>Compra</th><th>Vida util</th><th>Pagado por</th><th>Deprec. mensual</th><th>Deprec. acum.</th><th></th></tr></thead>
        <tbody>${equiposRows.map((e) => {
          const monthly = Number(e.vida || 0) > 0 ? (costoTotalEquipo(e) - Number(e.residual || 0)) / Number(e.vida) / 12 : 0;
          return `<tr><td data-label="Equipo">${e.equipo}</td><td data-label="Operacion">${operacionRegistro(e)}</td><td data-label="Cantidad">${e.unidad || 1}</td><td data-label="Costo unitario">${money(e.costo)}</td><td data-label="Costo total">${money(costoTotalEquipo(e))}</td><td data-label="Compra">${e.fecha || ""}</td><td data-label="Vida util">${e.vida || 0} anos</td><td data-label="Pagado por">${e.pagadoPor || ""}</td><td data-label="Deprec. mensual">${money(monthly)}</td><td data-label="Deprec. acum.">${money(depreciacionAcumulada(e))}</td><td data-label="Acciones">${rowActions("equipo", e.id)}</td></tr>`;
        }).join("")}</tbody>
      </table>
    </div>
  `;
}

function rowActions(type, id) {
  return `<div class="actions"><button class="secondary" data-edit="${type}" data-id="${id}">Editar</button><button class="ghost" data-delete="${type}" data-id="${id}">Borrar</button></div>`;
}

function renderModal() {
  const { type, id } = modal;
  const data = id ? state[typeToCollection(type)].find((x) => x.id === id || x.nombre === id) : {};
  return `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>${id ? "Editar" : "Nuevo"} ${modalTitle(type)}</h2>
          </div>
          <button class="ghost" data-action="close">Cerrar</button>
        </div>
        <form id="entityForm" data-type="${type}" data-id="${id || ""}">
          ${formFor(type, data || {})}
          <div class="form-actions">
            <button class="secondary" type="button" data-action="close">Cancelar</button>
            <button class="primary" type="submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function modalTitle(type) {
  return { cliente: "cliente", servicio: "servicio", tipoServicio: "tipo de servicio", producto: "producto", compra: "compra", gasto: "gasto", equipo: "equipo" }[type];
}

function typeToCollection(type) {
  return { cliente: "clientes", servicio: "servicios", tipoServicio: "tiposServicio", producto: "productos", compra: "compras", gasto: "gastos", equipo: "equipos" }[type];
}

function input(name, label, value = "", type = "text", extra = "") {
  const attrs = type === "number" ? ` step="any" inputmode="decimal"` : "";
  return `<div class="field ${extra}"><label>${label}</label><input name="${name}" type="${type}" value="${value ?? ""}"${attrs} /></div>`;
}

function select(name, label, value, options, extra = "") {
  return `<div class="field ${extra}"><label>${label}</label><select name="${name}">${options.map((o) => `<option value="${o.value}" ${String(o.value) === String(value) ? "selected" : ""}>${o.label}</option>`).join("")}</select></div>`;
}

function text(name, label, value = "", extra = "") {
  return `<div class="field ${extra}"><label>${label}</label><textarea name="${name}">${value ?? ""}</textarea></div>`;
}

function formFor(type, data) {
  if (type === "cliente") {
    return `<div class="form-grid">${input("nombre", "Cliente", data.nombre, "text", "wide")}${input("telefono", "Telefono", data.telefono)}${input("correo", "Correo / contacto", data.correo)}${input("direccion", "Direccion", data.direccion, "text", "wide")}${select("tipo", "Tipo", data.tipo, ["Residencial", "Comercial", "Industrial", "Gobierno", "Otro"].map((x) => ({ value: x, label: x })))}${text("observaciones", "Observaciones", data.observaciones, "full")}</div>`;
  }
  if (type === "producto") {
    return `<div class="form-grid">${input("producto", "Producto", data.producto, "text", "wide")}${select("unidadCompra", "Unidad de compra", data.unidadCompra, ["litro", "kilo", "envase", "pieza", "galon", "caja"].map((x) => ({ value: x, label: x })))}${select("unidadUso", "Unidad de uso", data.unidadUso, ["ml", "gr", "pieza"].map((x) => ({ value: x, label: x })))}${input("factor", "Equivalencia por unidad comprada", data.factor || 1000, "number")}${input("costo", "Costo por unidad de compra", data.costo, "number", "wide")}</div>`;
  }
  if (type === "tipoServicio") {
    return `<div class="form-grid">${input("nombre", "Tipo de servicio", data.nombre, "text", "wide")}</div>`;
  }
  if (type === "compra") {
    return `<div class="form-grid">${input("fecha", "Fecha", data.fecha || today(), "date")}${select("operacion", "Operacion", data.operacion || "Yucatan", ["Yucatan", "CDMX", "Sin clasificar"].map((x) => ({ value: x, label: x })))}${select("productoId", "Producto", data.productoId, state.productos.map((p) => ({ value: p.id, label: `${p.producto} (${p.unidadCompra || "unidad"})` })), "wide")}${input("cantidad", "Cantidad comprada", data.cantidad, "number")}${input("costoUnitario", "Costo por unidad comprada", data.costoUnitario, "number")}${input("proveedor", "Proveedor", data.proveedor)}${select("pagadoPor", "Pagado por", data.pagadoPor, ["SISPROVISA", "VICTOR"].map((x) => ({ value: x, label: x })))}${input("factura", "Factura / ref.", data.factura)}${text("notas", "Notas", data.notas, "full")}</div>`;
  }
  if (type === "gasto") {
    const categorias = ["Nomina", "Gasolina / Combustible", "IMSS", "INFONAVIT", "Impuestos / ISR", "Telefonia Celular", "Internet", "Renta / Local", "Papeleria / Oficina", "Equipo / Herramientas", "Publicidad / Marketing", "Mantenimiento Vehiculo", "Uniforme / EPP", "Capacitacion", "Otros Gastos"];
    return `<div class="form-grid">${input("fecha", "Fecha", data.fecha || today(), "date")}${select("operacion", "Operacion", data.operacion || "Yucatan", ["Yucatan", "CDMX", "Sin clasificar"].map((x) => ({ value: x, label: x })))}${select("categoria", "Categoria", data.categoria, categorias.map((x) => ({ value: x, label: x })), "wide")}${input("monto", "Monto", data.monto, "number")}${input("comprobante", "Comprobante / ref.", data.comprobante)}${select("pagadoPor", "Pagado por", data.pagadoPor, ["SISPROVISA", "VICTOR"].map((x) => ({ value: x, label: x })))}${text("descripcion", "Descripcion", data.descripcion, "full")}</div>`;
  }
  if (type === "equipo") {
    return `<div class="form-grid">${input("equipo", "Equipo / descripcion", data.equipo, "text", "wide")}${select("operacion", "Operacion", data.operacion || "Yucatan", ["Yucatan", "CDMX", "Sin clasificar"].map((x) => ({ value: x, label: x })))}${input("unidad", "Cantidad", data.unidad || 1, "number")}${input("costo", "Costo unitario", data.costo, "number")}${input("fecha", "Fecha compra", data.fecha || today(), "date")}${input("vida", "Vida util anos", data.vida, "number")}${input("residual", "Valor residual total", data.residual, "number")}${select("pagadoPor", "Pagado por", data.pagadoPor, ["SISPROVISA", "VICTOR"].map((x) => ({ value: x, label: x })))}</div>`;
  }
  return formServicio(data);
}

function formServicio(data) {
  const productRows = [0, 1, 2, 3].map((index) => {
    const item = (data.productos || [])[index] || {};
    return `${select(`productoId${index}`, `Producto ${index + 1}`, item.productoId, [{ value: "", label: "Sin producto" }, ...state.productos.map((p) => ({ value: p.id, label: `${p.producto} (${p.unidadUso || ""})` }))])}${input(`cantidad${index}`, "Cantidad usada en ml, gramos o piezas", item.cantidad, "number")}`;
  }).join("");
  const tipoOptions = state.tiposServicio.map((x) => ({ value: x.nombre, label: x.nombre }));
  const clienteOptions = [...state.clientes]
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")))
    .map((c) => ({ value: c.id, label: c.nombre }));
  return `<div class="form-grid">
    ${input("fecha", "Fecha", data.fecha || today(), "date")}
    ${select("clienteId", "Cliente", data.clienteId, clienteOptions, "wide")}
    ${select("ciudad", "Ciudad", data.ciudad || "Yucatan", ["Yucatan", "CDMX"].map((x) => ({ value: x, label: x })))}
    ${select("tipo", "Tipo de servicio", data.tipo, tipoOptions)}
    ${select("tecnico", "Tecnico", data.tecnico, ["SANTOS", "VICTOR", "FREDDY"].map((x) => ({ value: x, label: x })))}
    ${input("zona", "Zona / direccion", data.zona, "text", "wide")}
    ${input("subtotal", "Importe del servicio", data.subtotal, "number")}
    ${input("cobrado", "Cobrado", data.cobrado, "number")}
    ${select("formaPago", "Forma de pago", data.formaPago, ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Por cobrar", "Cortesia"].map((x) => ({ value: x, label: x })))}
    <div class="full panel"><h2>Productos usados</h2><div class="form-grid">${productRows}</div></div>
    ${text("observaciones", "Observaciones", data.observaciones, "full")}
  </div>`;
}

function bindApp() {
  document.querySelectorAll("[data-module]").forEach((button) => {
    button.addEventListener("click", () => {
      activeModule = button.dataset.module;
      render();
    });
  });
  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => {
      modal = { type: button.dataset.open };
      render();
    });
  });
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      modal = { type: button.dataset.edit, id: button.dataset.id };
      render();
    });
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirm("Quieres borrar este registro?")) return;
      const collection = typeToCollection(button.dataset.delete);
      state[collection] = state[collection].filter((x) => x.id !== button.dataset.id);
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-action='close']").forEach((button) => {
    button.addEventListener("click", () => {
      modal = null;
      render();
    });
  });
  document.querySelectorAll("[data-action='logout']").forEach((button) => {
    button.addEventListener("click", () => {
      currentUser = null;
      render();
    });
  });
  document.querySelectorAll("[data-action='repairData']").forEach((button) => {
    button.addEventListener("click", () => {
      repairAllData();
      alert("Listo. Revise productos y servicios; las unidades fueron recalculadas.");
    });
  });
  const clienteSearchInput = document.querySelector("#clienteSearch");
  if (clienteSearchInput) {
    clienteSearchInput.addEventListener("input", (event) => {
      clienteSearch = event.target.value;
      render();
      const nextInput = document.querySelector("#clienteSearch");
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
    });
  }
  const clienteTipoSelect = document.querySelector("#clienteTipoFilter");
  if (clienteTipoSelect) {
    clienteTipoSelect.addEventListener("change", (event) => {
      clienteTipoFilter = event.target.value;
      render();
    });
  }
  const servicioSearchInput = document.querySelector("#servicioSearch");
  if (servicioSearchInput) {
    servicioSearchInput.addEventListener("input", (event) => {
      servicioSearch = event.target.value;
      render();
      const nextInput = document.querySelector("#servicioSearch");
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
    });
  }
  const operacionSelect = document.querySelector("#operacionFilter");
  if (operacionSelect) {
    operacionSelect.addEventListener("change", (event) => {
      operacionFilter = event.target.value;
      render();
    });
  }
  const form = document.querySelector("#entityForm");
  if (form) form.addEventListener("submit", saveEntity);
}

function saveEntity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.type;
  const id = form.dataset.id;
  const data = Object.fromEntries(new FormData(form));
  const entity = normalize(type, data);
  const collection = typeToCollection(type);
  if (id) {
    state[collection] = state[collection].map((x) => (x.id === id || x.nombre === id ? { ...x, ...entity, id: x.id || id } : x));
  } else {
    state[collection].push({ ...entity, id: uid() });
  }
  saveState();
  modal = null;
  render();
}

function normalize(type, data) {
  const numericFields = ["costo", "factor", "cantidad", "costoUnitario", "monto", "vida", "residual", "subtotal", "cobrado", "precio"];
  numericFields.forEach((field) => {
    if (field in data) data[field] = toNumber(data[field]);
  });
  if (type === "servicio") {
    data.productos = [0, 1, 2, 3]
      .map((i) => ({ productoId: data[`productoId${i}`], cantidad: toNumber(data[`cantidad${i}`]) }))
      .filter((item) => item.productoId && item.cantidad > 0);
    [0, 1, 2, 3].forEach((i) => {
      delete data[`productoId${i}`];
      delete data[`cantidad${i}`];
    });
  }
  return data;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "0").replace(",", "."));
}

async function init() {
  state = await loadInitialState();
  render();
}

init();
