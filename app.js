const STORAGE_KEY = "gs_burak_app_v1";
const BACKUP_KEY = "gs_burak_app_backups_v1";
const SERVER_MODE = location.protocol.startsWith("http");

const users = [
  { id: "admin", name: "VICTOR", role: "admin", password: "vicbus" },
  { id: "tecnico", name: "PROGRAMACION", role: "operativo", password: "12345" },
  { id: "consulta", name: "CONSULTA", role: "consulta", password: "12345" },
];

const modules = [
  { id: "dashboard", label: "Dashboard", icon: "Inicio", roles: ["admin", "operativo"] },
  { id: "clientes", label: "Clientes", icon: "Clientes", roles: ["admin", "operativo"] },
  { id: "programacion", label: "Programacion", icon: "Agenda", roles: ["admin", "operativo", "consulta"] },
  { id: "servicios", label: "Servicios / Ventas", icon: "Ventas", roles: ["admin", "operativo"] },
  { id: "tiposServicio", label: "Tipos servicio", icon: "Servicios", roles: ["admin"] },
  { id: "productos", label: "Productos", icon: "Stock", roles: ["admin"] },
  { id: "compras", label: "Compras", icon: "Compras", roles: ["admin"] },
  { id: "gastos", label: "Gastos", icon: "Gastos", roles: ["admin"] },
  { id: "equipos", label: "Equipos", icon: "Equipos", roles: ["admin"] },
];

const seed = {
  schemaVersion: 2,
  clientes: [
    { id: uid(), nombre: "Residencial Montebello", contacto: "Administrador", telefono: "999 123 4567", correo: "admin@montebello.mx", direccion: "Merida, Yucatan", tipo: "Residencial", observaciones: "Cliente de ejemplo." },
    { id: uid(), nombre: "Restaurante Centro", contacto: "Encargado", telefono: "999 765 4321", correo: "contacto@restaurante.mx", direccion: "Centro, Merida", tipo: "Comercial", observaciones: "Cliente de ejemplo." },
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
    { id: uid(), nombre: "Solo exteriores", precio: 0 },
    { id: uid(), nombre: "Presupuesto", precio: 0 },
    { id: uid(), nombre: "Otro", precio: 0 },
  ],
  servicios: [],
  programaciones: [],
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
let clienteCiudadFilter = "";
let clienteClasificacionFilter = "";
let servicioSearch = "";
let servicioPagoFilter = "Todos";
const SERVICIO_PAGO_COBRADO_EN_POR_COBRAR = "Cobrado en Por cobrar";
let servicioTipoFilter = "Todos";
let servicioProductoFilter = "Todos";
let servicioClienteClasificacionFilter = "Todos";
let compraSearch = "";
let operacionFilter = "Todas";
let programacionStatusFilter = "Activos";
let gastoCategoriaFilter = "";
let remoteSaveQueue = Promise.resolve();

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    const localRecovery = totalRecords(remoteState) === 0 ? bestLocalRecoveryState(remoteState) : null;
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
  return ["clientes", "productos", "tiposServicio", "servicios", "programaciones", "compras", "gastos", "equipos"]
    .reduce((sum, key) => sum + (Array.isArray(data[key]) ? data[key].length : 0), 0);
}

function hasMoreRecords(candidate, remoteState) {
  return ["clientes", "productos", "tiposServicio", "servicios", "programaciones", "compras", "gastos", "equipos"]
    .some((key) => (candidate[key] || []).length > (remoteState[key] || []).length);
}

function mergeStatesById(remoteState, localState) {
  const merged = structuredClone(remoteState);
  ["clientes", "productos", "tiposServicio", "servicios", "programaciones", "compras", "gastos", "equipos"].forEach((key) => {
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

async function restoreRemoteState(nextState) {
  if (!SERVER_MODE) return;
  const response = await fetch("/api/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nextState),
  });
  if (!response.ok) throw new Error("No se pudo restaurar el respaldo en la nube");
}

async function saveRemoteRecord(collection, record) {
  if (!SERVER_MODE) return;
  await fetch("/api/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection, record }),
  });
}

async function deleteRemoteRecord(collection, id) {
  if (!SERVER_MODE) return;
  await fetch(`/api/record?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function sendRemoteCalendarEvent(programacion, action = "create") {
  if (!SERVER_MODE) return null;
  const response = await fetch("/api/calendar-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      programacionId: programacion.id,
      eventId: programacion.calendarEventId || "",
      fecha: programacion.fecha,
      hora: programacion.hora,
      cliente: nombreCliente(programacion.clienteId),
      tipo: programacion.tipo,
      tecnico: programacion.tecnico,
      tecnicoAdicional: programacion.tecnicoAdicional || "",
      ciudad: programacion.ciudad,
      direccion: programacion.direccion,
      notas: programacion.notas,
      duracionMinutos: 90,
    }),
  });
  return response.json();
}

function createRemoteCalendarEvent(programacion) {
  return sendRemoteCalendarEvent(programacion, "create");
}

function updateRemoteCalendarEvent(programacion) {
  return sendRemoteCalendarEvent(programacion, "update");
}

function deleteRemoteCalendarEvent(programacion) {
  return sendRemoteCalendarEvent(programacion, "delete");
}

function isCalendarAlreadyDeleted(error) {
  const text = String(error || "").toLowerCase();
  return text.includes("does not exist")
    || text.includes("already been deleted")
    || text.includes("already deleted")
    || text.includes("no existe")
    || text.includes("ya fue borrado")
    || text.includes("ya fue eliminado")
    || text.includes("ya se elimino")
    || text.includes("ya se eliminó");
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
  if (!data.tiposServicio.some((tipo) => String(tipo.nombre || "").toLowerCase() === "solo exteriores")) {
    data.tiposServicio.push({ id: uid(), nombre: "Solo exteriores", precio: 0 });
  }
  if (!data.tiposServicio.some((tipo) => String(tipo.nombre || "").toLowerCase() === "presupuesto")) {
    data.tiposServicio.push({ id: uid(), nombre: "Presupuesto", precio: 0 });
  }
  data.clientes = (data.clientes || []).map((cliente) => ({
    ciudad: "MERIDA",
    contacto: "",
    clasificacion: "Sin clasificar",
    observaciones: "",
    ...cliente,
    ciudad: cliente.ciudad || "MERIDA",
    contacto: cliente.contacto || "",
    clasificacion: cliente.clasificacion || "Sin clasificar",
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
  data.clientes = (data.clientes || []).map((cliente) => {
    const domicilios = Array.isArray(cliente.domicilios)
      ? cliente.domicilios.filter((domicilio) => domicilio && (domicilio.direccion || domicilio.alias))
      : [];
    if (!domicilios.length && cliente.direccion) {
      domicilios.push({
        alias: "Principal",
        direccion: cliente.direccion,
        ciudad: cliente.ciudad || "MERIDA",
        referencia: "",
        contacto: "",
      });
    }
    return {
      ...cliente,
      domicilios,
    };
  });
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
  data.programaciones = (data.programaciones || []).map((programacion) => ({
    fecha: today(),
    hora: "09:00",
    ciudad: "Yucatan",
    tecnico: "SANTOS",
    estatus: "Programado",
    ...programacion,
    ciudad: programacion.ciudad || programacion.operacion || "Yucatan",
    tecnico: programacion.tecnico === "SISPROVISA" ? "SANTOS" : programacion.tecnico || "",
    tecnicoAdicional: programacion.tecnicoAdicional || "",
    estatus: programacion.estatus || "Programado",
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
  const snapshot = structuredClone(state);
  remoteSaveQueue = remoteSaveQueue
    .catch(() => {})
    .then(() => saveRemoteState(snapshot));
  remoteSaveQueue.catch(() => {
    alert("No se pudo guardar en la base compartida. Revise que el servidor siga abierto.");
  });
}

function queueRemoteTask(task) {
  remoteSaveQueue = remoteSaveQueue
    .catch(() => {})
    .then(task);
  remoteSaveQueue.catch(() => {
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

function backupFileName() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return `respaldo-gs-burak-${stamp}.json`;
}

function datedFileName(prefix, extension) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return `${prefix}-${stamp}.${extension}`;
}

function csvCell(value) {
  let textValue = String(value ?? "");
  if (/^[=+\-@]/.test(textValue)) textValue = `'${textValue}`;
  return `"${textValue.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName, headers, rows) {
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  const blob = new Blob([`\ufeff${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "GS Burak Control Operativo",
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBackupExcel() {
  const workbook = buildProfessionalBackupWorkbook();
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(datedFileName("respaldo-gs-burak-profesional", "xls"), blob);
}

function buildProfessionalBackupWorkbook() {
  const servicios = state.servicios || [];
  const gastos = state.gastos || [];
  const compras = state.compras || [];
  const equipos = state.equipos || [];
  const ventas = servicios.reduce((sum, item) => sum + totalServicio(item), 0);
  const cobrado = servicios.reduce((sum, item) => sum + Number(item.cobrado || 0), 0);
  const porCobrar = servicios.reduce((sum, item) => sum + pendienteServicio(item), 0);
  const productoUsado = servicios.reduce((sum, item) => sum + costoServicio(item), 0);
  const gastoTotal = gastos.reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const compraTotal = compras.reduce((sum, item) => sum + totalCompra(item), 0);
  const depreciacionMensual = gastoDepreciacionMensual(equipos);
  const utilidad = cobrado - productoUsado - gastoTotal - depreciacionMensual;

  const sheets = [
    {
      name: "Resumen",
      title: "Resumen ejecutivo",
      subtitle: `Generado el ${new Date().toLocaleString("es-MX")}`,
      columns: [
        { header: "Concepto", key: "concepto", width: 210 },
        { header: "Importe / cantidad", key: "valor", type: "currency", width: 150 },
        { header: "Comentario", key: "comentario", width: 360 },
      ],
      rows: [
        { concepto: "Ventas totales", valor: ventas, comentario: `${number(servicios.length)} servicios capturados` },
        { concepto: "Ingresos cobrados", valor: cobrado, comentario: "Dinero ya cobrado" },
        { concepto: "Por cobrar", valor: porCobrar, comentario: "Venta pendiente de cobro" },
        { concepto: "Producto usado", valor: productoUsado, comentario: "Costo del producto aplicado en servicios" },
        { concepto: "Gastos", valor: gastoTotal, comentario: "Gastos capturados en la seccion Gastos" },
        { concepto: "Depreciacion mensual", valor: depreciacionMensual, comentario: "Depreciacion mensual de equipos" },
        { concepto: "Utilidad neta", valor: utilidad, comentario: "Cobrado - producto usado - gastos - depreciacion mensual" },
        { concepto: "Compras de inventario", valor: compraTotal, comentario: "Referencia: no se resta aqui para no duplicar producto" },
        { concepto: "Inversion en equipos", valor: inversionEquipos(equipos), comentario: "Valor total de equipos capturados" },
      ],
    },
    {
      name: "Resumen por ciudad",
      title: "Resumen por ciudad de operacion",
      columns: [
        { header: "Ciudad", key: "ciudad", width: 120 },
        { header: "Ventas", key: "ventas", type: "currency" },
        { header: "Cobrado", key: "cobrado", type: "currency" },
        { header: "Por cobrar", key: "porCobrar", type: "currency" },
        { header: "Producto usado", key: "productoUsado", type: "currency" },
        { header: "Gastos", key: "gastos", type: "currency" },
        { header: "Deprec. mensual", key: "depreciacion", type: "currency" },
        { header: "Utilidad neta", key: "utilidad", type: "currency" },
        { header: "Compras inventario", key: "compras", type: "currency" },
        { header: "Equipos inversion", key: "equipos", type: "currency" },
      ],
      rows: resumenProfesionalPorCiudad(),
    },
    {
      name: "Servicios",
      title: "Servicios / ventas",
      subtitle: `${number(servicios.length)} registros`,
      columns: [
        { header: "Fecha", key: "fecha", width: 85 },
        { header: "Cliente", key: "cliente", width: 190 },
        { header: "Ciudad", key: "ciudad", width: 85 },
        { header: "Clasificacion cliente", key: "clasificacion", width: 130 },
        { header: "Tipo de servicio", key: "tipo", width: 150 },
        { header: "Tecnico", key: "tecnico", width: 95 },
        { header: "Tecnico adicional", key: "tecnicoAdicional", width: 115 },
        { header: "Zona / direccion", key: "direccion", width: 280 },
        { header: "Total", key: "total", type: "currency" },
        { header: "Cobrado", key: "cobrado", type: "currency" },
        { header: "Pendiente", key: "pendiente", type: "currency" },
        { header: "Forma de pago", key: "formaPago", width: 115 },
        { header: "Costo producto", key: "costoProducto", type: "currency" },
        { header: "% producto", key: "porcentajeProducto", type: "percent" },
        { header: "Productos usados", key: "productos", width: 260 },
      ],
      rows: servicios
        .slice()
        .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")))
        .map((servicio) => ({
          fecha: servicio.fecha || "",
          cliente: nombreCliente(servicio.clienteId, servicio),
          ciudad: operacionRegistro(servicio, "Yucatan"),
          clasificacion: clasificacionServicio(servicio),
          tipo: servicio.tipo || servicio.servicio || "",
          tecnico: servicio.tecnico || "",
          tecnicoAdicional: servicio.tecnicoAdicional || "",
          direccion: servicio.zona || servicio.direccion || "",
          total: totalServicio(servicio),
          cobrado: Number(servicio.cobrado || 0),
          pendiente: pendienteServicio(servicio),
          formaPago: servicio.formaPago || "",
          costoProducto: costoServicio(servicio),
          porcentajeProducto: porcentajeCostoProducto(servicio),
          productos: productosUsadosTexto(servicio),
        })),
    },
    {
      name: "Clientes",
      title: "Clientes",
      subtitle: `${number((state.clientes || []).length)} registros`,
      columns: [
        { header: "Cliente", key: "cliente", width: 220 },
        { header: "Clasificacion", key: "clasificacion", width: 110 },
        { header: "Tipo", key: "tipo", width: 110 },
        { header: "Ciudad principal", key: "ciudad", width: 115 },
        { header: "Contacto", key: "contacto", width: 160 },
        { header: "Telefono", key: "telefono", width: 120 },
        { header: "Correo", key: "correo", width: 180 },
        { header: "Direccion principal", key: "direccion", width: 290 },
        { header: "Domicilios", key: "domicilios", width: 330 },
        { header: "Observaciones", key: "observaciones", width: 240 },
        { header: "Servicios", key: "servicios", type: "number" },
        { header: "Facturado", key: "facturado", type: "currency" },
        { header: "Cobrado", key: "cobrado", type: "currency" },
        { header: "Por cobrar", key: "porCobrar", type: "currency" },
      ],
      rows: (state.clientes || [])
        .slice()
        .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")))
        .map((cliente) => {
          const delCliente = servicios.filter((servicio) => clienteDeServicio(servicio)?.id === cliente.id);
          const facturado = delCliente.reduce((sum, servicio) => sum + totalServicio(servicio), 0);
          const clienteCobrado = delCliente.reduce((sum, servicio) => sum + Number(servicio.cobrado || 0), 0);
          return {
            cliente: cliente.nombre || "",
            clasificacion: clasificacionCliente(cliente),
            tipo: cliente.tipo || "",
            ciudad: cliente.ciudad || "MERIDA",
            contacto: cliente.contacto || "",
            telefono: cliente.telefono || "",
            correo: cliente.correo || "",
            direccion: direccionPrincipalTexto(cliente),
            domicilios: domiciliosTexto(cliente),
            observaciones: cliente.observaciones || "",
            servicios: delCliente.length,
            facturado,
            cobrado: clienteCobrado,
            porCobrar: Math.max(0, facturado - clienteCobrado),
          };
        }),
    },
    {
      name: "Programacion",
      title: "Programacion",
      columns: [
        { header: "Fecha", key: "fecha", width: 85 },
        { header: "Hora", key: "hora", width: 70 },
        { header: "Cliente", key: "cliente", width: 200 },
        { header: "Ciudad", key: "ciudad", width: 90 },
        { header: "Tipo de servicio", key: "tipo", width: 150 },
        { header: "Tecnico", key: "tecnico", width: 110 },
        { header: "Tecnico adicional", key: "tecnicoAdicional", width: 125 },
        { header: "Estatus", key: "estatus", width: 110 },
        { header: "Calendario", key: "calendario", width: 110 },
        { header: "Direccion", key: "direccion", width: 290 },
        { header: "Notas", key: "notas", width: 330 },
      ],
      rows: (state.programaciones || []).map((item) => ({
        fecha: item.fecha || "",
        hora: item.hora || "",
        cliente: nombreCliente(item.clienteId, item),
        ciudad: operacionRegistro(item, "Yucatan"),
        tipo: item.tipo || item.servicio || "",
        tecnico: item.tecnico || "",
        tecnicoAdicional: item.tecnicoAdicional || "",
        estatus: item.estatus || "",
        calendario: item.calendarStatus || (item.calendarEventId ? "Calendario" : "Sin calendario"),
        direccion: item.direccion || item.zona || "",
        notas: item.notas || item.descripcion || "",
      })),
    },
    {
      name: "Gastos",
      title: "Gastos",
      columns: [
        { header: "Fecha", key: "fecha", width: 85 },
        { header: "Ciudad", key: "ciudad", width: 90 },
        { header: "Categoria", key: "categoria", width: 150 },
        { header: "Descripcion", key: "descripcion", width: 320 },
        { header: "Monto", key: "monto", type: "currency" },
        { header: "Pagado por", key: "pagadoPor", width: 110 },
      ],
      rows: gastos.map((item) => ({
        fecha: item.fecha || "",
        ciudad: operacionRegistro(item, "Sin clasificar"),
        categoria: item.categoria || "",
        descripcion: item.descripcion || "",
        monto: Number(item.monto || 0),
        pagadoPor: item.pagadoPor || "",
      })),
    },
    {
      name: "Compras",
      title: "Compras de inventario",
      columns: [
        { header: "Fecha", key: "fecha", width: 85 },
        { header: "Ciudad", key: "ciudad", width: 90 },
        { header: "Producto", key: "producto", width: 220 },
        { header: "Cantidad", key: "cantidad", type: "number" },
        { header: "Unidad compra", key: "unidad", width: 100 },
        { header: "Costo unitario", key: "costoUnitario", type: "currency" },
        { header: "Total", key: "total", type: "currency" },
        { header: "Pagado por", key: "pagadoPor", width: 110 },
      ],
      rows: compras.map((item) => ({
        fecha: item.fecha || "",
        ciudad: operacionRegistro(item, "Sin clasificar"),
        producto: nombreProducto(item.productoId),
        cantidad: Number(item.cantidad || 0),
        unidad: unidadCompraProducto(item.productoId),
        costoUnitario: Number(item.costoUnitario || 0),
        total: totalCompra(item),
        pagadoPor: item.pagadoPor || "",
      })),
    },
    {
      name: "Equipos",
      title: "Equipos",
      columns: [
        { header: "Equipo", key: "equipo", width: 250 },
        { header: "Ciudad", key: "ciudad", width: 90 },
        { header: "Cantidad", key: "cantidad", type: "number" },
        { header: "Costo unitario", key: "costo", type: "currency" },
        { header: "Total", key: "total", type: "currency" },
        { header: "Fecha compra", key: "fecha", width: 90 },
        { header: "Vida util anos", key: "vida", type: "number" },
        { header: "Valor residual", key: "residual", type: "currency" },
        { header: "Deprec. mensual", key: "depreciacionMensual", type: "currency" },
        { header: "Deprec. acumulada", key: "depreciacionAcumulada", type: "currency" },
        { header: "Valor neto", key: "valorNeto", type: "currency" },
        { header: "Pagado por", key: "pagadoPor", width: 110 },
      ],
      rows: equipos.map((item) => {
        const total = costoTotalEquipo(item);
        const base = total - Number(item.residual || 0);
        const vida = Number(item.vida || 0);
        const depMensual = vida > 0 ? base / vida / 12 : 0;
        const depAcum = depreciacionAcumulada(item);
        return {
          equipo: item.equipo || item.descripcion || "",
          ciudad: operacionRegistro(item, "Sin clasificar"),
          cantidad: Number(item.unidad || 1) || 1,
          costo: Number(item.costo || 0),
          total,
          fecha: item.fecha || "",
          vida,
          residual: Number(item.residual || 0),
          depreciacionMensual: depMensual,
          depreciacionAcumulada: depAcum,
          valorNeto: Math.max(Number(item.residual || 0), total - depAcum),
          pagadoPor: item.pagadoPor || "",
        };
      }),
    },
    {
      name: "Productos",
      title: "Productos",
      columns: [
        { header: "Producto", key: "producto", width: 240 },
        { header: "Unidad compra", key: "unidadCompra", width: 110 },
        { header: "Unidad uso", key: "unidadUso", width: 100 },
        { header: "Factor", key: "factor", type: "number" },
        { header: "Costo referencia", key: "costo", type: "currency" },
      ],
      rows: (state.productos || []).map((item) => ({
        producto: item.producto || "",
        unidadCompra: item.unidadCompra || "",
        unidadUso: item.unidadUso || "",
        factor: Number(item.factor || 0),
        costo: Number(item.costo || 0),
      })),
    },
  ];

  const worksheets = sheets.map((sheet) => professionalWorksheet(sheet)).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>Respaldo profesional GS Burak</Title><Author>GS Burak Control Operativo</Author><Created>${new Date().toISOString()}</Created></DocumentProperties><Styles><Style ss:ID="title"><Font ss:Bold="1" ss:Size="16" ss:Color="#0B2A35"/></Style><Style ss:ID="subtitle"><Font ss:Color="#5E6A7D"/></Style><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F766E" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="text"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style><Style ss:ID="money"><NumberFormat ss:Format="$#,##0.00"/></Style><Style ss:ID="number"><NumberFormat ss:Format="#,##0"/></Style><Style ss:ID="percent"><NumberFormat ss:Format="0.0%"/></Style></Styles>${worksheets}</Workbook>`;
}

function resumenProfesionalPorCiudad() {
  return ["Yucatan", "CDMX"].map((ciudad) => {
    const servicios = (state.servicios || []).filter((item) => operacionRegistro(item, "Yucatan") === ciudad);
    const gastos = (state.gastos || []).filter((item) => operacionRegistro(item, "Sin clasificar") === ciudad);
    const compras = (state.compras || []).filter((item) => operacionRegistro(item, "Sin clasificar") === ciudad);
    const equipos = (state.equipos || []).filter((item) => operacionRegistro(item, "Sin clasificar") === ciudad);
    const ventas = servicios.reduce((sum, item) => sum + totalServicio(item), 0);
    const cobrado = servicios.reduce((sum, item) => sum + Number(item.cobrado || 0), 0);
    const productoUsado = servicios.reduce((sum, item) => sum + costoServicio(item), 0);
    const gastoTotal = gastos.reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const depreciacion = gastoDepreciacionMensual(equipos);
    return {
      ciudad,
      ventas,
      cobrado,
      porCobrar: servicios.reduce((sum, item) => sum + pendienteServicio(item), 0),
      productoUsado,
      gastos: gastoTotal,
      depreciacion,
      utilidad: cobrado - productoUsado - gastoTotal - depreciacion,
      compras: compras.reduce((sum, item) => sum + totalCompra(item), 0),
      equipos: inversionEquipos(equipos),
    };
  });
}

function professionalWorksheet(sheet) {
  const columns = sheet.columns || [];
  const rows = sheet.rows || [];
  const columnXml = columns.map((column) => `<Column ss:Width="${Number(column.width || 115)}"/>`).join("");
  const titleRow = `<Row ss:Height="24"><Cell ss:MergeAcross="${Math.max(columns.length - 1, 0)}" ss:StyleID="title"><Data ss:Type="String">${xmlEscape(sheet.title || sheet.name)}</Data></Cell></Row>`;
  const subtitleRow = sheet.subtitle
    ? `<Row><Cell ss:MergeAcross="${Math.max(columns.length - 1, 0)}" ss:StyleID="subtitle"><Data ss:Type="String">${xmlEscape(sheet.subtitle)}</Data></Cell></Row>`
    : "";
  const spacerRow = "<Row></Row>";
  const headerRow = `<Row>${columns.map((column) => `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlEscape(column.header)}</Data></Cell>`).join("")}</Row>`;
  const dataRows = rows.map((row) => `<Row>${columns.map((column) => professionalCell(row?.[column.key], column.type)).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${xmlEscape(sheet.name).slice(0, 31)}"><Table>${columnXml}${titleRow}${subtitleRow}${spacerRow}${headerRow}${dataRows}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>4</SplitHorizontal><TopRowBottomPane>4</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
}

function professionalCell(value, type = "text") {
  if (type === "currency" || type === "number" || type === "percent") {
    const numberValue = Number(value || 0);
    const style = type === "currency" ? "money" : type;
    return `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${Number.isFinite(numberValue) ? numberValue : 0}</Data></Cell>`;
  }
  return `<Cell ss:StyleID="text"><Data ss:Type="String">${xmlEscape(value ?? "")}</Data></Cell>`;
}

function totalCompra(compra) {
  return Number(compra?.total || 0) || (Number(compra?.cantidad || 0) * Number(compra?.costoUnitario || 0));
}

function direccionPrincipalTexto(cliente) {
  const principal = domiciliosCliente(cliente)[0];
  return principal?.direccion || cliente?.direccion || "";
}

function domiciliosTexto(cliente) {
  return domiciliosCliente(cliente)
    .map((domicilio, index) => {
      const alias = domicilio.alias || `Domicilio ${index + 1}`;
      return [alias, domicilio.direccion, domicilio.ciudad, domicilio.contacto, domicilio.referencia]
        .filter(Boolean)
        .join(" - ");
    })
    .join(" | ");
}

function productosUsadosTexto(servicio) {
  return (servicio.productos || [])
    .filter((item) => item?.productoId)
    .map((item) => {
      const unidad = unidadUsoProducto(item.productoId);
      return `${nombreProducto(item.productoId)}: ${number(Number(item.cantidad || 0))}${unidad ? ` ${unidad}` : ""}`;
    })
    .join(" | ");
}

function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function excelWorksheet(name, rows) {
  const headers = excelHeaders(rows);
  const headerRow = `<Row>${headers.map((header) => `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`).join("")}</Row>`;
  const dataRows = rows
    .map((row) => `<Row>${headers.map((header) => excelCell(row?.[header])).join("")}</Row>`)
    .join("");
  return `<Worksheet ss:Name="${xmlEscape(name).slice(0, 31)}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
}

function excelHeaders(rows) {
  const headers = [];
  rows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((key) => {
      if (!headers.includes(key)) headers.push(key);
    });
  });
  return headers.length ? headers : ["sin_datos"];
}

function excelCell(value) {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const type = isNumber ? "Number" : "String";
  return `<Cell><Data ss:Type="${type}">${xmlEscape(excelValue(value))}</Data></Cell>`;
}

function excelValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => (item && typeof item === "object" ? JSON.stringify(item) : String(item))).join(" | ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clientesFiltradosVista() {
  const term = clienteSearch.trim().toLowerCase();
  return state.clientes
    .filter((c) => !clienteTipoFilter || (c.tipo || "Sin tipo") === clienteTipoFilter)
    .filter((c) => !clienteCiudadFilter || (c.ciudad || "MERIDA") === clienteCiudadFilter)
    .filter((c) => !clienteClasificacionFilter || clasificacionCliente(c) === clienteClasificacionFilter)
    .filter((c) => {
      if (!term) return true;
      const domiciliosText = domiciliosCliente(c)
        .map((domicilio) => [domicilio.alias, domicilio.direccion, domicilio.ciudad, domicilio.referencia, domicilio.contacto].join(" "))
        .join(" ");
      return [c.nombre, c.contacto, c.telefono, c.correo, c.direccion, c.tipo, c.ciudad, c.observaciones, domiciliosText]
        .some((value) => String(value || "").toLowerCase().includes(term));
    })
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
}

function serviciosFiltradosVista() {
  const term = servicioSearch.trim().toLowerCase();
  return serviciosFiltradosOperacion()
    .filter((s) => {
      if (!term) return true;
      return nombreCliente(s.clienteId, s).toLowerCase().includes(term);
    })
    .filter((s) => {
      if (servicioPagoFilter === SERVICIO_PAGO_COBRADO_EN_POR_COBRAR) {
        return String(s.formaPago || "") === "Por cobrar" && toNumber(s.cobrado) > 0;
      }
      if (servicioPagoFilter === "Por cobrar") return pendienteServicio(s) > 0;
      if (servicioPagoFilter === "Cobrados") return pendienteServicio(s) <= 0;
      return true;
    })
    .filter((s) => servicioTipoFilter === "Todos" || s.tipo === servicioTipoFilter)
    .filter((s) => {
      if (servicioProductoFilter === "Todos") return true;
      return (s.productos || []).some((item) => item.productoId === servicioProductoFilter);
    })
    .filter((s) => servicioClienteClasificacionFilter === "Todos" || clasificacionServicio(s) === servicioClienteClasificacionFilter)
    .sort((a, b) => {
      const dateCompare = String(b.fecha || "").localeCompare(String(a.fecha || ""));
      if (dateCompare !== 0) return dateCompare;
      const clientCompare = nombreCliente(a.clienteId, a).localeCompare(nombreCliente(b.clienteId, b));
      if (clientCompare !== 0) return clientCompare;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
}

function clasificacionCliente(cliente) {
  return cliente?.clasificacion || "Sin clasificar";
}

function clasificacionServicio(servicio) {
  const cliente = clienteDeServicio(servicio);
  if (!cliente) return "Servicio por revisar";
  return clasificacionCliente(cliente);
}

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function clienteDeServicio(servicio) {
  const exacto = state.clientes.find((item) => item.id === servicio.clienteId);
  if (exacto) return exacto;
  const nombre = normalizarTexto(nombreCliente(servicio.clienteId, servicio));
  if (!nombre || nombre === "sin cliente") return null;
  const exactoPorNombre = state.clientes.find((item) => normalizarTexto(item.nombre) === nombre);
  if (exactoPorNombre) return exactoPorNombre;

  const candidatos = state.clientes.filter((item) => {
    const clienteNombre = normalizarTexto(item.nombre);
    return clienteNombre.length >= 6 && (nombre.includes(clienteNombre) || clienteNombre.includes(nombre));
  });
  return candidatos.length === 1 ? candidatos[0] : null;
}

function clienteClasificacionOptions(includeTodos = false) {
  const options = [
    { value: "Nuevo", label: "Nuevo" },
    { value: "Antiguo", label: "Antiguo" },
    { value: "Sin clasificar", label: "Sin clasificar" },
  ];
  return includeTodos ? [{ value: "Todos", label: "Todos" }, ...options, { value: "Servicio por revisar", label: "Servicio por revisar" }] : options;
}

function exportClientesCsv() {
  const rows = clientesFiltradosVista().map((c) => {
    const servicios = state.servicios.filter((s) => s.clienteId === c.id);
    const facturado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
    const cobrado = servicios.reduce((sum, s) => sum + Number(s.cobrado || 0), 0);
    const domicilios = domiciliosCliente(c)
      .map((domicilio) => `${domicilio.alias || "Domicilio"}: ${domicilio.direccion || ""} ${domicilio.referencia ? `(${domicilio.referencia})` : ""}`)
      .join(" | ");
    return [
      c.nombre,
      c.contacto,
      c.telefono,
      c.correo,
      c.ciudad || "MERIDA",
      c.tipo || "",
      clasificacionCliente(c),
      c.direccion || "",
      domicilios,
      c.observaciones || "",
      servicios.length,
      facturado,
      cobrado,
      Math.max(0, facturado - cobrado),
    ];
  });
  downloadCsv(
    datedFileName("clientes-gs-burak", "csv"),
    ["Cliente", "Contacto", "Telefono", "Correo", "Ciudad", "Tipo", "Clasificacion", "Direccion principal", "Domicilios", "Observaciones", "Servicios", "Facturado", "Cobrado", "Por cobrar"],
    rows
  );
}

function exportServiciosCsv() {
  const rows = serviciosFiltradosVista().map((s) => [
    s.fecha,
    nombreCliente(s.clienteId, s),
    s.ciudad || "Yucatan",
    clasificacionServicio(s),
    s.tipo || "",
    s.tecnico || "",
    s.zona || "",
    s.observaciones || "",
    totalServicio(s),
    Number(s.cobrado || 0),
    pendienteServicio(s),
    costoServicio(s),
    `${(porcentajeCostoProducto(s) * 100).toFixed(1)}%`,
    pendienteServicio(s) > 0 ? "Por cobrar" : "Cobrado",
    s.formaPago || "",
  ]);
  downloadCsv(
    datedFileName("ventas-servicios-gs-burak", "csv"),
    ["Fecha", "Cliente", "Ciudad", "Clasificacion cliente", "Servicio", "Tecnico", "Zona / direccion", "Observaciones", "Total", "Cobrado", "Pendiente", "Costo producto", "% producto", "Estatus", "Forma de pago"],
    rows
  );
}

function exportDashboardExecutiveReport() {
  if (currentUser?.id !== "admin") {
    alert("Este reporte solo esta disponible para VICTOR.");
    return;
  }

  const m = metrics();
  const monthly = resumenMensualFinanciero();
  const utilidadCiudad = utilidadPorCiudad();
  const cobrosForma = cobrosPorFormaPago();
  const gastosMesPagador = gastosPorPagadorMes();
  const gastosCiudadPagador = gastosPorCiudadYPagador();
  const comprasCiudadPagador = comprasPorCiudadYPagador();
  const equiposCiudadPagador = equiposPorCiudadYPagador();
  const totalPagador = Object.entries(totalInversionYGastoPorPagador()).sort((a, b) => b[1] - a[1]);
  const periodo = operacionFilter === "Todas" ? "Todas las operaciones" : operacionFilter;
  const generatedAt = new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
  const row = (cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
  const header = (cells) => `<tr>${cells.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr>`;
  const emptyRow = (colspan, text) => `<tr><td colspan="${colspan}">${escapeHtml(text)}</td></tr>`;
  const table = (headers, rows, emptyText) => `
    <table>
      <thead>${header(headers)}</thead>
      <tbody>${rows.length ? rows.join("") : emptyRow(headers.length, emptyText)}</tbody>
    </table>
  `;

  const html = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Reporte ejecutivo GS Burak</title>
  <style>
    @page { size: letter; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #0f172a; font-family: Arial, Helvetica, sans-serif; background: #f4f7f7; }
    .page { max-width: 980px; margin: 0 auto; padding: 28px; }
    .toolbar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 16px; }
    .toolbar button { border: 0; border-radius: 6px; padding: 10px 16px; background: #0f766e; color: white; font-weight: 700; cursor: pointer; }
    .cover { background: #0b2230; color: white; border-radius: 10px; padding: 30px; margin-bottom: 18px; }
    .cover h1 { margin: 0 0 10px; font-size: 30px; letter-spacing: 0; }
    .cover p { margin: 4px 0; color: #c8f2ea; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
    .card { background: white; border: 1px solid #d7e1e4; border-radius: 8px; padding: 14px; }
    .card span { display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
    .card strong { display: block; font-size: 20px; color: #0f766e; }
    section { background: white; border: 1px solid #d7e1e4; border-radius: 8px; padding: 18px; margin: 14px 0; break-inside: avoid; }
    h2 { margin: 0 0 12px; font-size: 18px; color: #0b2230; }
    .note { color: #64748b; margin: 0 0 12px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #edf4f5; text-align: left; color: #12313f; }
    th, td { border-bottom: 1px solid #d7e1e4; padding: 9px 8px; vertical-align: top; }
    td strong { color: #0b2230; }
    .money { font-weight: 700; color: #0f766e; }
    .footer { color: #64748b; font-size: 11px; margin-top: 18px; }
    @media print {
      body { background: white; }
      .page { padding: 0; max-width: none; }
      .toolbar { display: none; }
      .cover, section, .card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
    <div class="cover">
      <h1>GS Burak - Reporte ejecutivo</h1>
      <p>Resumen financiero y operativo</p>
      <p>Operacion: ${escapeHtml(periodo)} · Generado: ${escapeHtml(generatedAt)}</p>
    </div>
    <div class="cards">
      <div class="card"><span>Ventas totales</span><strong>${money(m.facturado)}</strong></div>
      <div class="card"><span>Cobrado</span><strong>${money(m.cobrado)}</strong></div>
      <div class="card"><span>Por cobrar</span><strong>${money(m.porCobrar)}</strong></div>
      <div class="card"><span>Utilidad real</span><strong>${money(m.utilidad)}</strong></div>
    </div>
    <section>
      <h2>Resumen mensual financiero</h2>
      <p class="note">Utilidad real = cobrado - producto usado - gastos - depreciacion mensual. Las compras de inventario se muestran como referencia y no se restan otra vez.</p>
      ${table(
        ["Mes", "Ventas", "Cobrado", "Por cobrar", "Producto usado", "Gastos", "Deprec.", "Utilidad real", "Compras inventario"],
        monthly.map((item) => row([
          `<strong>${escapeHtml(item.mes)}</strong><br>${number(item.servicios)} servicios`,
          money(item.ventas),
          money(item.cobrado),
          money(item.porCobrar),
          money(item.productoUsado),
          money(item.gastos),
          money(item.depreciacion),
          `<span class="money">${money(item.utilidad)}</span>`,
          money(item.comprasInventario),
        ])),
        "Aun no hay informacion mensual para mostrar."
      )}
    </section>
    <section>
      <h2>Utilidad real por ciudad</h2>
      ${table(
        ["Ciudad", "Cobrado", "Producto usado", "Gastos", "Deprec. mensual", "Utilidad real", "Por cobrar", "Compras inventario"],
        utilidadCiudad.map((item) => row([
          `<strong>${escapeHtml(item.ciudad)}</strong>`,
          money(item.cobrado),
          money(item.productoUsado),
          money(item.gastos),
          money(item.depreciacion),
          `<span class="money">${money(item.utilidad)}</span>`,
          money(item.porCobrar),
          money(item.comprasInventario),
        ])),
        "Aun no hay informacion por ciudad."
      )}
    </section>
    <section>
      <h2>Cobros por forma de pago</h2>
      ${table(
        ["Forma de pago", "Monto cobrado", "Servicios"],
        cobrosForma.map((item) => row([
          `<strong>${escapeHtml(item.forma)}</strong>`,
          money(item.cobrado),
          number(item.servicios),
        ])),
        "Aun no hay cobros registrados."
      )}
    </section>
    <section>
      <h2>Gastos por mes y pagador</h2>
      ${table(
        ["Mes", "VICTOR", "SISPROVISA", "Otros", "Total gastos"],
        gastosMesPagador.map((item) => row([
          `<strong>${escapeHtml(item.month)}</strong>`,
          money(item.VICTOR),
          money(item.SISPROVISA),
          money(item.otros),
          `<span class="money">${money(item.total)}</span>`,
        ])),
        "Aun no hay gastos registrados."
      )}
    </section>
    <section>
      <h2>Gastos por ciudad y pagador</h2>
      <p class="note">Solo incluye gastos operativos capturados en la seccion Gastos, separados por ciudad de operacion y por quien los pago.</p>
      ${table(
        ["Ciudad", "VICTOR", "SISPROVISA", "Otros", "Total gastos"],
        gastosCiudadPagador.map((item) => row([
          `<strong>${escapeHtml(item.ciudad)}</strong>`,
          money(item.VICTOR),
          money(item.SISPROVISA),
          money(item.otros),
          `<span class="money">${money(item.total)}</span>`,
        ])),
        "Aun no hay gastos registrados."
      )}
    </section>
    <section>
      <h2>Compras por ciudad y pagador</h2>
      <p class="note">Solo incluye compras de producto e inventario capturadas en la seccion Compras.</p>
      ${table(
        ["Ciudad", "VICTOR", "SISPROVISA", "Otros", "Total compras"],
        comprasCiudadPagador.map((item) => row([
          `<strong>${escapeHtml(item.ciudad)}</strong>`,
          money(item.VICTOR),
          money(item.SISPROVISA),
          money(item.otros),
          `<span class="money">${money(item.total)}</span>`,
        ])),
        "Aun no hay compras registradas."
      )}
    </section>
    <section>
      <h2>Equipos por ciudad y pagador</h2>
      <p class="note">Solo incluye inversion en equipos capturada en la seccion Equipos.</p>
      ${table(
        ["Ciudad", "VICTOR", "SISPROVISA", "Otros", "Total equipos"],
        equiposCiudadPagador.map((item) => row([
          `<strong>${escapeHtml(item.ciudad)}</strong>`,
          money(item.VICTOR),
          money(item.SISPROVISA),
          money(item.otros),
          `<span class="money">${money(item.total)}</span>`,
        ])),
        "Aun no hay equipos registrados."
      )}
    </section>
    <section>
      <h2>Total pagado por socio</h2>
      <p class="note">Incluye gastos operativos, compras de inventario y equipos.</p>
      ${table(
        ["Pagador", "Total"],
        totalPagador.map(([pagador, total]) => row([`<strong>${escapeHtml(pagador)}</strong>`, `<span class="money">${money(total)}</span>`])),
        "Aun no hay informacion de pagos por socio."
      )}
    </section>
    <p class="footer">Reporte generado desde GS Burak Control Operativo. Este archivo es informativo y no da acceso a la aplicacion.</p>
  </div>
</body>
</html>`;

  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("El navegador bloqueo la ventana del reporte. Permite ventanas emergentes para esta pagina e intenta de nuevo.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function triggerBackupImport() {
  document.querySelector("#backupImportInput")?.click();
}

async function importBackupFile(file) {
  if (!file) return;
  try {
    const textContent = await file.text();
    const payload = JSON.parse(textContent);
    const nextState = payload?.data || payload;
    const required = ["clientes", "productos", "tiposServicio", "servicios", "programaciones", "compras", "gastos", "equipos"];
    const valid = required.every((collection) => Array.isArray(nextState?.[collection]));
    if (!valid) {
      alert("El archivo no parece ser un respaldo valido de GS Burak.");
      return;
    }
    const total = required.reduce((sum, collection) => sum + nextState[collection].length, 0);
    const ok = confirm(`Este respaldo contiene ${number(total)} registros. Si continuas, reemplazara la informacion actual de la nube. Deseas restaurarlo?`);
    if (!ok) return;
    state = migrateState(nextState);
    saveLocalBackup();
    if (SERVER_MODE) await restoreRemoteState(state);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    alert("Respaldo restaurado. La informacion se cargo en la app.");
    render();
  } catch (error) {
    alert(`No se pudo importar el respaldo: ${error.message}`);
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

function nombreCliente(clienteId, registro = {}) {
  return state.clientes.find((c) => c.id === clienteId)?.nombre
    || registro.cliente
    || registro.clienteNombre
    || registro.nombreCliente
    || registro.razonSocial
    || "Sin cliente";
}

function domiciliosCliente(cliente) {
  const domicilios = Array.isArray(cliente?.domicilios)
    ? cliente.domicilios.filter((domicilio) => domicilio && (domicilio.direccion || domicilio.alias))
    : [];
  if (domicilios.length) return domicilios;
  if (cliente?.direccion) {
    return [{
      alias: "Principal",
      direccion: cliente.direccion,
      ciudad: cliente.ciudad || "MERIDA",
      referencia: "",
      contacto: "",
    }];
  }
  return [];
}

function resumenDomiciliosCliente(cliente) {
  const domicilios = domiciliosCliente(cliente);
  if (!domicilios.length) return "";
  const principal = domicilios[0];
  const extra = domicilios.length > 1 ? `<br><span class="readonly">${number(domicilios.length)} domicilios registrados</span>` : "";
  return `<br><span class="readonly">${principal.alias ? `${principal.alias}: ` : ""}${principal.direccion || ""}</span>${extra}`;
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

function comprasOrdenadas(productoId, operacion = null) {
  return state.compras
    .filter((compra) => compra.productoId === productoId && (!operacion || operacionRegistro(compra) === operacion))
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

function lotesRestantesProducto(productoId, operacion = null) {
  const lots = comprasOrdenadas(productoId, operacion);

  for (const servicio of serviciosOrdenados()) {
    if (operacion && operacionRegistro(servicio, "Yucatan") !== operacion) continue;
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

function costoProximoLoteUso(productoId, operacion = null) {
  const lots = lotesRestantesProducto(productoId, operacion);
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

function resumenVentasPorClasificacionCliente() {
  const rows = {};
  const ensure = (clasificacion) => {
    if (!rows[clasificacion]) {
      rows[clasificacion] = {
        clasificacion,
        servicios: 0,
        ventas: 0,
        cobrado: 0,
        porCobrar: 0,
        productoUsado: 0,
        utilidadAntesGastos: 0,
      };
    }
    return rows[clasificacion];
  };
  serviciosFiltradosOperacion().forEach((servicio) => {
    const row = ensure(clasificacionServicio(servicio));
    row.servicios += 1;
    row.ventas += totalServicio(servicio);
    row.cobrado += Number(servicio.cobrado || 0);
    row.porCobrar += pendienteServicio(servicio);
    row.productoUsado += costoServicio(servicio);
  });
  return ["Nuevo", "Antiguo", "Sin clasificar", "Servicio por revisar"]
    .map((clasificacion) => {
      const row = ensure(clasificacion);
      return {
        ...row,
        utilidadAntesGastos: row.cobrado - row.productoUsado,
      };
    })
    .filter((row) => row.servicios || row.ventas || row.cobrado || row.porCobrar || row.productoUsado);
}

function serviciosPorRevisarClasificacionCliente() {
  return serviciosFiltradosOperacion()
    .filter((servicio) => clasificacionServicio(servicio) === "Servicio por revisar")
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
}

function serviciosConClienteSinClasificar() {
  return serviciosFiltradosOperacion()
    .map((servicio) => ({ servicio, cliente: clienteDeServicio(servicio) }))
    .filter((row) => row.cliente && clasificacionCliente(row.cliente) === "Sin clasificar")
    .sort((a, b) => String(b.servicio.fecha || "").localeCompare(String(a.servicio.fecha || "")));
}

function gastosPorPagador() {
  return gastosFiltradosOperacion().reduce((rows, gasto) => {
    const pagador = gasto.pagadoPor || "Sin dato";
    rows[pagador] = (rows[pagador] || 0) + Number(gasto.monto || 0);
    return rows;
  }, {});
}

function gastosPorPagadorMes() {
  const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rows = labels.map((month) => ({ month, VICTOR: 0, SISPROVISA: 0, otros: 0, total: 0 }));
  gastosFiltradosOperacion().forEach((gasto) => {
    if (!gasto.fecha) return;
    const idx = new Date(`${gasto.fecha}T00:00:00`).getMonth();
    if (Number.isNaN(idx)) return;
    const monto = Number(gasto.monto || 0);
    const pagador = String(gasto.pagadoPor || "Sin dato").toUpperCase();
    if (pagador === "VICTOR") rows[idx].VICTOR += monto;
    else if (pagador === "SISPROVISA") rows[idx].SISPROVISA += monto;
    else rows[idx].otros += monto;
    rows[idx].total += monto;
  });
  return rows.filter((row) => row.total > 0);
}

function gastosPorCiudadYPagador() {
  const order = { Yucatan: 1, CDMX: 2, "Sin clasificar": 3 };
  const rows = {};
  const ensure = (ciudad) => {
    const key = ciudad || "Sin clasificar";
    if (!rows[key]) rows[key] = { ciudad: key, VICTOR: 0, SISPROVISA: 0, otros: 0, total: 0 };
    return rows[key];
  };

  gastosFiltradosOperacion().forEach((gasto) => {
    const row = ensure(operacionRegistro(gasto));
    const monto = Number(gasto.monto || 0);
    const pagador = String(gasto.pagadoPor || "Sin dato").toUpperCase();
    if (pagador === "VICTOR") row.VICTOR += monto;
    else if (pagador === "SISPROVISA") row.SISPROVISA += monto;
    else row.otros += monto;
    row.total += monto;
  });

  return Object.values(rows)
    .filter((row) => row.total > 0)
    .sort((a, b) => (order[a.ciudad] || 99) - (order[b.ciudad] || 99));
}

function comprasPorCiudadYPagador() {
  const order = { Yucatan: 1, CDMX: 2, "Sin clasificar": 3 };
  const rows = {};
  const ensure = (ciudad) => {
    const key = ciudad || "Sin clasificar";
    if (!rows[key]) rows[key] = { ciudad: key, VICTOR: 0, SISPROVISA: 0, otros: 0, total: 0 };
    return rows[key];
  };

  comprasFiltradasOperacion().forEach((compra) => {
    const row = ensure(operacionRegistro(compra));
    const monto = Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0);
    const pagador = String(compra.pagadoPor || "Sin dato").toUpperCase();
    if (pagador === "VICTOR") row.VICTOR += monto;
    else if (pagador === "SISPROVISA") row.SISPROVISA += monto;
    else row.otros += monto;
    row.total += monto;
  });

  return Object.values(rows)
    .filter((row) => row.total > 0)
    .sort((a, b) => (order[a.ciudad] || 99) - (order[b.ciudad] || 99));
}

function equiposPorCiudadYPagador() {
  const order = { Yucatan: 1, CDMX: 2, "Sin clasificar": 3 };
  const rows = {};
  const ensure = (ciudad) => {
    const key = ciudad || "Sin clasificar";
    if (!rows[key]) rows[key] = { ciudad: key, VICTOR: 0, SISPROVISA: 0, otros: 0, total: 0 };
    return rows[key];
  };

  equiposFiltradosOperacion().forEach((equipo) => {
    const row = ensure(operacionRegistro(equipo));
    const monto = costoTotalEquipo(equipo);
    const pagador = String(equipo.pagadoPor || "Sin dato").toUpperCase();
    if (pagador === "VICTOR") row.VICTOR += monto;
    else if (pagador === "SISPROVISA") row.SISPROVISA += monto;
    else row.otros += monto;
    row.total += monto;
  });

  return Object.values(rows)
    .filter((row) => row.total > 0)
    .sort((a, b) => (order[a.ciudad] || 99) - (order[b.ciudad] || 99));
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

function utilidadPorCiudad() {
  const ciudades = ["Yucatan", "CDMX", "Sin clasificar"];
  const rows = {};
  const ensure = (ciudad) => {
    const key = ciudad || "Sin clasificar";
    if (!rows[key]) {
      rows[key] = {
        ciudad: key,
        facturado: 0,
        cobrado: 0,
        porCobrar: 0,
        productoUsado: 0,
        gastos: 0,
        depreciacion: 0,
        comprasInventario: 0,
        utilidad: 0,
        servicios: 0,
      };
    }
    return rows[key];
  };

  ciudades.forEach(ensure);

  state.servicios.forEach((servicio) => {
    const row = ensure(operacionRegistro(servicio, "Yucatan"));
    row.facturado += totalServicio(servicio);
    row.cobrado += Number(servicio.cobrado || 0);
    row.productoUsado += costoServicio(servicio);
    row.servicios += 1;
  });

  state.gastos.forEach((gasto) => {
    ensure(operacionRegistro(gasto)).gastos += Number(gasto.monto || 0);
  });

  state.equipos.forEach((equipo) => {
    ensure(operacionRegistro(equipo)).depreciacion += gastoDepreciacionMensual([equipo]);
  });

  state.compras.forEach((compra) => {
    ensure(operacionRegistro(compra)).comprasInventario += Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0);
  });

  return Object.values(rows)
    .map((row) => ({
      ...row,
      porCobrar: Math.max(0, row.facturado - row.cobrado),
      utilidad: row.cobrado - row.productoUsado - row.gastos - row.depreciacion,
    }))
    .filter((row) => row.cobrado || row.porCobrar || row.productoUsado || row.gastos || row.depreciacion || row.comprasInventario)
    .sort((a, b) => {
      const order = { Yucatan: 1, CDMX: 2, "Sin clasificar": 3 };
      return (order[a.ciudad] || 99) - (order[b.ciudad] || 99);
    });
}

function serviciosPorTecnico() {
  return serviciosFiltradosOperacion().reduce((rows, servicio) => {
    const tecnico = servicio.tecnico || "Sin tecnico";
    rows[tecnico] = (rows[tecnico] || 0) + 1;
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

function programacionesFiltradasOperacion() {
  return state.programaciones.filter((programacion) => matchesOperacion(programacion, "Yucatan"));
}

function tecnicosProgramacionOptions(includeNone = false) {
  const options = ["SANTOS", "VICTOR", "FREDDY", "CRISTIAN"];
  return (includeNone ? ["", ...options] : options).map((x) => ({ value: x, label: x || "Ninguno" }));
}

function tecnicosProgramacionTexto(programacion) {
  const principal = programacion.tecnico || "";
  const adicional = programacion.tecnicoAdicional || "";
  return [principal, adicional].filter(Boolean).join(" + ") || "Sin asignar";
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

function programacionStatusFilterControl() {
  const options = ["Activos", "Todos", "Programado", "Confirmado", "Reprogramar", "Realizado", "Cancelado"];
  return `
    <div class="field compact-filter">
      <label>Estatus</label>
      <select id="programacionStatusFilter">
        ${options.map((option) => `<option value="${option}" ${option === programacionStatusFilter ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </div>
  `;
}

function servicioPagoFilterControl() {
  const options = ["Todos", "Por cobrar", "Cobrados", SERVICIO_PAGO_COBRADO_EN_POR_COBRAR];
  return `
    <div class="field compact-filter">
      <label>Pago</label>
      <select id="servicioPagoFilter">
        ${options.map((option) => `<option value="${option}" ${option === servicioPagoFilter ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </div>
  `;
}

function dateKeyFromOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function shortDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  return `${days[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function metrics() {
  const servicios = serviciosFiltradosOperacion();
  const gastosRows = gastosFiltradosOperacion();
  const comprasRows = comprasFiltradasOperacion();
  const equiposRows = equiposFiltradosOperacion();
  const cobrado = servicios.reduce((sum, s) => sum + Number(s.cobrado || 0), 0);
  const facturado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
  const porCobrar = Math.max(0, facturado - cobrado);
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

function isProgramacionReadOnly() {
  return currentUser?.role === "consulta";
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

  if (!can(activeModule)) {
    activeModule = modules.find((module) => module.roles.includes(currentUser.role))?.id || "programacion";
  }
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
        <small>Acceso para usuarios autorizados.</small>
        <div class="field">
          <label>Usuario</label>
          <select name="user">
            <option value="admin">VICTOR</option>
            <option value="tecnico">PROGRAMACION</option>
            <option value="consulta">CONSULTA</option>
          </select>
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input name="password" type="password" value="" />
        </div>
        <div class="form-actions">
          <button class="primary" type="submit">Entrar</button>
        </div>
        <div class="hint">
          Acceso autorizado para usuarios registrados.
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
    activeModule = modules.find((module) => module.roles.includes(user.role))?.id || "programacion";
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
        <span>${currentUser.role === "admin" ? "Administrador" : currentUser.role === "consulta" ? "Consulta de programacion" : "Programacion"}</span>
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
    programacion: renderProgramacion,
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
  const maxMonthly = Math.max(...monthly.map((row) => row.facturado), 1);
  const cobradoRatio = m.facturado > 0 ? Math.min(100, Math.round((m.cobrado / m.facturado) * 100)) : 0;
  const pendienteRatio = m.facturado > 0 ? Math.min(100, Math.round((m.porCobrar / m.facturado) * 100)) : 0;
  const utilidadRatio = m.cobrado > 0 ? Math.max(0, Math.min(100, Math.round((m.utilidad / m.cobrado) * 100))) : 0;
  const executiveReportButton = currentUser.id === "admin" ? `<button class="secondary" data-action="exportDashboardReport">Reporte ejecutivo</button>` : "";
  const backupControls = showMoney
    ? `${operationFilterControl()}${executiveReportButton}<button class="secondary" data-action="exportBackupExcel">Exportar respaldo Excel</button><button class="secondary" data-action="exportBackup">Exportar respaldo JSON</button><button class="secondary" data-action="importBackup">Importar respaldo</button><input id="backupImportInput" type="file" accept="application/json" hidden />`
    : operationFilterControl();
  return `
    ${topbar("Dashboard", "Resumen automatico de la operacion y resultados.", backupControls)}
    ${currentUser.role !== "admin" ? `<div class="notice">Tu usuario puede capturar clientes y servicios. Las metricas financieras completas quedan reservadas para administrador.</div>` : ""}
    <section class="dashboard-hero">
      <div class="hero-card hero-main">
        <span>Ventas totales</span>
        <strong>${showMoney ? money(m.facturado) : "Restringido"}</strong>
        <small>${number(m.servicios)} servicios capturados</small>
      </div>
      <div class="hero-card cyan">
        <span>Ingresos cobrados</span>
        <strong>${showMoney ? money(m.cobrado) : "Restringido"}</strong>
        <small>${showMoney ? `${cobradoRatio}% de venta total` : "Pagos registrados"}</small>
      </div>
      <div class="hero-card violet">
        <span>Por cobrar</span>
        <strong>${showMoney ? money(m.porCobrar) : "Restringido"}</strong>
        <small>${showMoney ? `${pendienteRatio}% pendiente` : "Servicios pendientes"}</small>
      </div>
      <div class="hero-card amber">
        <span>Utilidad neta</span>
        <strong>${showMoney ? money(m.utilidad) : "Restringido"}</strong>
        <small>${showMoney ? `Margen ${(m.margen * 100).toFixed(1)}%` : "Reservado para admin"}</small>
      </div>
    </section>
    ${showMoney ? renderOperacionHeroCards() : ""}
    <section class="dashboard-grid">
      <div class="dash-panel wide">
        <div class="panel-head">
          <h2>Ventas por mes</h2>
          <span>${showMoney ? "Venta total" : "Servicios"}</span>
        </div>
        ${showMoney ? renderDashboardMonthlyChart(monthly, maxMonthly) : `<div class="bars">${monthly.map((row) => renderBar(row.month, row.servicios, Math.max(...monthly.map((r) => r.servicios), 1), true, "servicios")).join("")}</div>`}
      </div>
      <div class="dash-panel ring-panel">
        <div class="panel-head">
          <h2>Estado de cobro</h2>
          <span>${showMoney ? `${cobradoRatio}% cobrado` : "Resumen"}</span>
        </div>
        ${renderDashboardRing(cobradoRatio, showMoney ? "Cobrado" : "Servicios", showMoney ? money(m.cobrado) : number(m.servicios))}
        <div class="split-metrics">
          <span>Cobrado <strong>${showMoney ? money(m.cobrado) : "Restringido"}</strong></span>
          <span>Pendiente <strong>${showMoney ? money(m.porCobrar) : "Restringido"}</strong></span>
        </div>
      </div>
      <div class="dash-panel">
        <div class="panel-head">
          <h2>Operacion</h2>
          <span>${operacionFilter}</span>
        </div>
        <div class="metric-list">
          <div><span>Clientes</span><strong>${number(m.totalClientes)}</strong></div>
          <div><span>Ticket promedio</span><strong>${showMoney ? money(m.ticket) : "Restringido"}</strong></div>
          <div><span>Costo productos</span><strong>${showMoney ? money(m.costoProductos) : "Restringido"}</strong></div>
          <div><span>Gastos operativos</span><strong>${showMoney ? money(m.gastos) : "Restringido"}</strong></div>
        </div>
      </div>
      <div class="dash-panel">
        <div class="panel-head">
          <h2>Utilidad</h2>
          <span>${showMoney ? `${utilidadRatio}% sobre cobrado` : "Admin"}</span>
        </div>
        ${renderDashboardRing(utilidadRatio, "Margen", showMoney ? `${(m.margen * 100).toFixed(1)}%` : "Restringido", "profit")}
        <div class="metric-list compact">
          <div><span>Compras producto</span><strong>${showMoney ? money(m.comprasProductos) : "Restringido"}</strong></div>
          <div><span>Deprec. mensual</span><strong>${showMoney ? money(m.depreciacion) : "Restringido"}</strong></div>
        </div>
      </div>
      <div class="dash-panel">
        <div class="panel-head">
          <h2>Equipos</h2>
          <span>Inversion</span>
        </div>
        <div class="metric-list">
          <div><span>Inversion equipos</span><strong>${showMoney ? money(m.inversionEquipo) : "Restringido"}</strong></div>
          <div><span>Deprec. acumulada</span><strong>${showMoney ? money(m.depreciacionEquipoAcumulada) : "Restringido"}</strong></div>
          <div><span>Valor neto</span><strong>${showMoney ? money(m.valorNetoEquipo) : "Restringido"}</strong></div>
        </div>
      </div>
    </section>
    <section class="dashboard-insights">
      ${showMoney ? renderUtilidadCiudadResumen() : ""}
      ${showMoney ? renderResumenMensualFinanciero() : ""}
      ${showMoney ? renderCobrosMayoresVentaResumen() : ""}
      ${showMoney ? renderCostoLaboralPromedioResumen() : ""}
      ${showMoney ? renderCobrosFormaPagoResumen() : ""}
      ${showMoney ? renderVentasClasificacionClienteResumen() : ""}
      ${renderClientesTipoResumen()}
      ${renderServiciosTecnicoResumen()}
      ${showMoney ? renderVentasCiudadResumen() : ""}
      ${showMoney ? renderGastosPagadorResumen() : ""}
      ${showMoney ? renderComprasPagadorResumen() : ""}
      ${showMoney ? renderEquiposPagadorResumen() : ""}
      ${showMoney ? renderTotalPagadorResumen() : ""}
      ${showMoney ? renderGastosPagadorMensualResumen() : ""}
      ${showMoney ? renderGastosCiudadPagadorResumen() : ""}
      ${showMoney ? renderComprasCiudadPagadorResumen() : ""}
      ${showMoney ? renderEquiposCiudadPagadorResumen() : ""}
      ${showMoney ? renderPendientesResumen() : ""}
    </section>
  `;
}

function renderVentasClasificacionClienteResumen() {
  const rows = resumenVentasPorClasificacionCliente();
  const totalCobrado = rows.reduce((sum, row) => sum + row.cobrado, 0);
  const porRevisar = serviciosPorRevisarClasificacionCliente();
  const sinClasificar = serviciosConClienteSinClasificar();
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Ventas por cliente nuevo / antiguo (${money(totalCobrado)} cobrado)</h2>
      <p class="readonly">Separa servicios segun la clasificacion capturada en la ficha del cliente. "Sin clasificar" significa que el cliente existe, pero falta marcarlo como Nuevo o Antiguo. "Servicio por revisar" significa que la venta no encontro una ficha de cliente ligada. La utilidad aqui es antes de gastos generales: cobrado - producto usado.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Clasificacion</th><th>Servicios</th><th>Ventas</th><th>Cobrado</th><th>Por cobrar</th><th>Producto usado</th><th>Utilidad antes de gastos</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Clasificacion"><strong>${row.clasificacion}</strong></td><td data-label="Servicios">${number(row.servicios)}</td><td data-label="Ventas">${money(row.ventas)}</td><td data-label="Cobrado">${money(row.cobrado)}</td><td data-label="Por cobrar">${money(row.porCobrar)}</td><td data-label="Producto usado">${money(row.productoUsado)}</td><td data-label="Utilidad antes de gastos"><strong>${money(row.utilidadAntesGastos)}</strong></td></tr>`).join("")
                : `<tr><td colspan="7">Aun no hay servicios con clientes clasificados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${
        sinClasificar.length
          ? `<div class="table-card" style="margin-top:12px">
              <h3>Servicios con cliente sin clasificar</h3>
              <p class="readonly">Estos servicios si tienen cliente identificado. Solo falta abrir la ficha del cliente y marcarlo como Nuevo o Antiguo.</p>
              <table>
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Ciudad</th><th>Total</th><th>Cobrado</th><th>Acciones</th></tr></thead>
                <tbody>
                  ${sinClasificar.map(({ servicio, cliente }) => `<tr><td data-label="Fecha">${servicio.fecha || ""}</td><td data-label="Cliente"><strong>${cliente.nombre || nombreCliente(servicio.clienteId, servicio)}</strong></td><td data-label="Ciudad">${servicio.ciudad || cliente.ciudad || "Yucatan"}</td><td data-label="Total">${money(totalServicio(servicio))}</td><td data-label="Cobrado">${money(servicio.cobrado)}</td><td data-label="Acciones"><div class="actions"><button class="secondary" data-edit="cliente" data-id="${cliente.id}">Editar cliente</button><button class="secondary" data-edit="servicio" data-id="${servicio.id}">Editar servicio</button></div></td></tr>`).join("")}
                </tbody>
              </table>
            </div>`
          : ""
      }
      ${
        porRevisar.length
          ? `<div class="table-card" style="margin-top:12px">
              <h3>Servicios por revisar</h3>
              <p class="readonly">Estos servicios tienen venta capturada, pero no estan ligados claramente a un cliente del catalogo. Si el servicio es correcto, abre Editar y selecciona el cliente correcto; si fue una captura equivocada, corrigelo o borralo.</p>
              <table>
                <thead><tr><th>Fecha</th><th>Cliente en servicio</th><th>Ciudad</th><th>Total</th><th>Cobrado</th><th>Acciones</th></tr></thead>
                <tbody>
                  ${porRevisar.map((s) => `<tr><td data-label="Fecha">${s.fecha || ""}</td><td data-label="Cliente en servicio"><strong>${nombreCliente(s.clienteId, s)}</strong></td><td data-label="Ciudad">${s.ciudad || "Yucatan"}</td><td data-label="Total">${money(totalServicio(s))}</td><td data-label="Cobrado">${money(s.cobrado)}</td><td data-label="Acciones">${rowActions("servicio", s.id)}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>`
          : ""
      }
    </section>
  `;
}

function renderUtilidadCiudadResumen() {
  const rows = utilidadPorCiudad();
  const total = rows.reduce((sum, row) => sum + row.utilidad, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Utilidad real por ciudad (${money(total)})</h2>
      <p class="readonly">Formula: cobrado - producto usado - gastos - depreciacion mensual. Las compras de inventario se muestran como referencia, no se restan aqui para no duplicar el costo del producto.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Ciudad</th><th>Cobrado</th><th>Producto usado</th><th>Gastos</th><th>Deprec. mensual</th><th>Utilidad real</th><th>Por cobrar</th><th>Compras inventario</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Ciudad"><strong>${row.ciudad}</strong></td><td data-label="Cobrado">${money(row.cobrado)}</td><td data-label="Producto usado">${money(row.productoUsado)}</td><td data-label="Gastos">${money(row.gastos)}</td><td data-label="Deprec. mensual">${money(row.depreciacion)}</td><td data-label="Utilidad real"><strong>${money(row.utilidad)}</strong></td><td data-label="Por cobrar">${money(row.porCobrar)}</td><td data-label="Compras inventario">${money(row.comprasInventario)}</td></tr>`).join("")
                : `<tr><td colspan="8">Aun no hay informacion para calcular utilidad por ciudad.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderOperacionHeroCards() {
  const rows = utilidadPorCiudad().filter((row) => ["Yucatan", "CDMX"].includes(row.ciudad));
  if (!rows.length) return "";
  return `
    <section class="panel operation-cards-panel">
      <h2>Resumen por ciudad de operacion</h2>
      <p class="readonly">Mismos conceptos del resumen general, separados por Yucatan y CDMX. La utilidad neta mantiene la formula: cobrado - producto usado - gastos - depreciacion mensual.</p>
      ${rows.map((row) => {
        const margen = row.cobrado > 0 ? row.utilidad / row.cobrado : 0;
        const cobradoRatio = row.facturado > 0 ? Math.round((row.cobrado / row.facturado) * 100) : 0;
        const pendienteRatio = row.facturado > 0 ? Math.round((row.porCobrar / row.facturado) * 100) : 0;
        return `
          <div class="operation-card-group">
            <h3>${row.ciudad}</h3>
            <div class="dashboard-hero compact-hero">
              <div class="hero-card hero-main">
                <span>Ventas totales</span>
                <strong>${money(row.facturado)}</strong>
                <small>${number(row.servicios)} servicios capturados</small>
              </div>
              <div class="hero-card cyan">
                <span>Ingresos cobrados</span>
                <strong>${money(row.cobrado)}</strong>
                <small>${cobradoRatio}% de venta total</small>
              </div>
              <div class="hero-card violet">
                <span>Por cobrar</span>
                <strong>${money(row.porCobrar)}</strong>
                <small>${pendienteRatio}% pendiente</small>
              </div>
              <div class="hero-card amber">
                <span>Utilidad neta</span>
                <strong>${money(row.utilidad)}</strong>
                <small>Margen ${(margen * 100).toFixed(1)}%</small>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function monthKey(dateText) {
  if (!dateText) return "";
  return String(dateText).slice(0, 7);
}

function monthEndDate(key) {
  const [year, month] = String(key).split("-").map(Number);
  return new Date(year, month, 0, 23, 59, 59);
}

function monthLabel(key) {
  const labels = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const [year, month] = String(key).split("-").map(Number);
  return `${labels[(month || 1) - 1]} ${year || ""}`.trim();
}

function depreciacionMensualParaMes(key) {
  const end = monthEndDate(key);
  const equipos = equiposFiltradosOperacion().filter((equipo) => {
    if (!equipo.fecha) return true;
    return new Date(`${equipo.fecha}T00:00:00`) <= end;
  });
  return gastoDepreciacionMensual(equipos);
}

function resumenMensualFinanciero() {
  const rows = {};
  const ensure = (key) => {
    if (!key) return null;
    if (!rows[key]) {
      rows[key] = {
        key,
        mes: monthLabel(key),
        ventas: 0,
        cobrado: 0,
        porCobrar: 0,
        productoUsado: 0,
        gastos: 0,
        depreciacion: 0,
        comprasInventario: 0,
        utilidad: 0,
        servicios: 0,
      };
    }
    return rows[key];
  };

  serviciosFiltradosOperacion().forEach((servicio) => {
    const row = ensure(monthKey(servicio.fecha));
    if (!row) return;
    row.ventas += totalServicio(servicio);
    row.cobrado += Number(servicio.cobrado || 0);
    row.productoUsado += costoServicio(servicio);
    row.servicios += 1;
  });

  gastosFiltradosOperacion().forEach((gasto) => {
    const row = ensure(monthKey(gasto.fecha));
    if (!row) return;
    row.gastos += Number(gasto.monto || 0);
  });

  comprasFiltradasOperacion().forEach((compra) => {
    const row = ensure(monthKey(compra.fecha));
    if (!row) return;
    row.comprasInventario += Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0);
  });

  return Object.values(rows)
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
    .map((row) => {
      const depreciacion = depreciacionMensualParaMes(row.key);
      return {
        ...row,
        depreciacion,
        porCobrar: Math.max(0, row.ventas - row.cobrado),
        utilidad: row.cobrado - row.productoUsado - row.gastos - depreciacion,
      };
    });
}

const LABOR_CATEGORIES = ["nomina", "imss", "impuesto sobre nomina", "impuesto sobre nominas"];

function esGastoLaboral(gasto) {
  const categoria = normalizarTexto(gasto.categoria);
  return LABOR_CATEGORIES.some((item) => categoria === item || categoria.includes(item));
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function costoLaboralPromedioPorServicio() {
  const rows = {};
  const ensure = (key, ciudad) => {
    if (!key) return null;
    const rowKey = `${key}|${ciudad || "Sin clasificar"}`;
    if (!rows[rowKey]) {
      rows[rowKey] = {
        key,
        mes: monthLabel(key),
        ciudad: ciudad || "Sin clasificar",
        servicios: 0,
        costoLaboral: 0,
        promedio: 0,
        provisional: key === currentMonthKey(),
      };
    }
    return rows[rowKey];
  };

  serviciosFiltradosOperacion().forEach((servicio) => {
    const row = ensure(monthKey(servicio.fecha), operacionRegistro(servicio, "Yucatan"));
    if (!row) return;
    row.servicios += 1;
  });

  gastosFiltradosOperacion().filter(esGastoLaboral).forEach((gasto) => {
    const row = ensure(monthKey(gasto.fecha), operacionRegistro(gasto));
    if (!row) return;
    row.costoLaboral += Number(gasto.monto || 0);
  });

  return Object.values(rows)
    .filter((row) => row.servicios || row.costoLaboral)
    .sort((a, b) => String(a.key).localeCompare(String(b.key)) || String(a.ciudad).localeCompare(String(b.ciudad)))
    .map((row) => ({
      ...row,
      promedio: row.servicios > 0 ? row.costoLaboral / row.servicios : 0,
    }));
}

function renderResumenMensualFinanciero() {
  const rows = resumenMensualFinanciero();
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Resumen mensual financiero</h2>
      <p class="readonly">Formula de utilidad real: cobrado - producto usado - gastos - depreciacion mensual. Las compras de inventario se muestran como referencia, no se restan otra vez.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Mes</th><th>Ventas</th><th>Cobrado</th><th>Por cobrar</th><th>Producto usado</th><th>Gastos</th><th>Deprec.</th><th>Utilidad real</th><th>Compras inventario</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Mes"><strong>${row.mes}</strong><br><span class="readonly">${number(row.servicios)} servicios</span></td><td data-label="Ventas">${money(row.ventas)}</td><td data-label="Cobrado">${money(row.cobrado)}</td><td data-label="Por cobrar">${money(row.porCobrar)}</td><td data-label="Producto usado">${money(row.productoUsado)}</td><td data-label="Gastos">${money(row.gastos)}</td><td data-label="Deprec.">${money(row.depreciacion)}</td><td data-label="Utilidad real"><strong>${money(row.utilidad)}</strong></td><td data-label="Compras inventario">${money(row.comprasInventario)}</td></tr>`).join("")
                : `<tr><td colspan="9">Aun no hay informacion mensual para mostrar.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function cobrosMayoresVenta() {
  return serviciosFiltradosOperacion()
    .map((servicio) => {
      const venta = totalServicio(servicio);
      const cobrado = Number(servicio.cobrado || 0);
      return {
        servicio,
        venta,
        cobrado,
        diferencia: cobrado - venta,
      };
    })
    .filter((row) => row.diferencia > 0.009)
    .sort((a, b) => String(a.servicio.fecha || "").localeCompare(String(b.servicio.fecha || ""))
      || nombreCliente(a.servicio.clienteId, a.servicio).localeCompare(nombreCliente(b.servicio.clienteId, b.servicio)));
}

function renderCobrosMayoresVentaResumen() {
  const rows = cobrosMayoresVenta();
  if (!rows.length) return "";
  const totalDiferencia = rows.reduce((sum, row) => sum + row.diferencia, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Cobros por revisar (${money(totalDiferencia)} de diferencia)</h2>
      <p class="readonly">Estos servicios tienen el campo Cobrado mayor que el Importe del servicio. Corrigelos para que Ventas, Cobrado y Por cobrar cuadren.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Ciudad</th><th>Venta</th><th>Cobrado</th><th>Diferencia</th><th>Acciones</th></tr></thead>
          <tbody>
            ${rows.map(({ servicio, venta, cobrado, diferencia }) => `
              <tr>
                <td data-label="Fecha">${servicio.fecha || ""}</td>
                <td data-label="Cliente"><strong>${nombreCliente(servicio.clienteId, servicio)}</strong></td>
                <td data-label="Ciudad">${operacionRegistro(servicio, "Yucatan")}</td>
                <td data-label="Venta">${money(venta)}</td>
                <td data-label="Cobrado">${money(cobrado)}</td>
                <td data-label="Diferencia"><strong>${money(diferencia)}</strong></td>
                <td data-label="Acciones">${rowActions("servicio", servicio.id)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderCostoLaboralPromedioResumen() {
  const rows = costoLaboralPromedioPorServicio();
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Costo laboral promedio por servicio</h2>
      <p class="readonly">Formula: gastos de Nomina + IMSS + Impuesto sobre nominas, dividido entre los servicios realizados del mismo mes y ciudad. El mes actual se muestra como provisional.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Mes</th><th>Ciudad</th><th>Servicios</th><th>Costo laboral</th><th>Promedio por servicio</th><th>Estatus</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Mes"><strong>${row.mes}</strong></td><td data-label="Ciudad">${row.ciudad}</td><td data-label="Servicios">${number(row.servicios)}</td><td data-label="Costo laboral">${money(row.costoLaboral)}</td><td data-label="Promedio por servicio"><strong>${row.servicios ? money(row.promedio) : "Sin servicios"}</strong></td><td data-label="Estatus">${row.provisional ? "Provisional" : "Cerrado"}</td></tr>`).join("")
                : `<tr><td colspan="6">Aun no hay nomina, IMSS o impuesto sobre nominas capturados para calcular este costo.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function cobrosPorFormaPago() {
  const order = ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Por cobrar", "Cortesias / refuerzos sin cobro", "Sin dato"];
  const rows = {};
  const ensure = (forma) => {
    if (!rows[forma]) {
      rows[forma] = { forma, cobrado: 0, servicios: 0 };
    }
    return rows[forma];
  };

  serviciosFiltradosOperacion().forEach((servicio) => {
    const rawForma = String(servicio.formaPago || "").trim();
    const forma = ["Cortesia", "Refuerzo"].includes(rawForma)
      ? "Cortesias / refuerzos sin cobro"
      : rawForma || "Sin dato";
    const row = ensure(forma);
    row.cobrado += Number(servicio.cobrado || 0);
    row.servicios += 1;
  });

  return Object.values(rows).sort((a, b) => {
    const aIndex = order.indexOf(a.forma);
    const bIndex = order.indexOf(b.forma);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }
    return a.forma.localeCompare(b.forma);
  });
}

function renderCobrosFormaPagoResumen() {
  const rows = cobrosPorFormaPago();
  const total = rows.reduce((sum, row) => sum + row.cobrado, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Cobros por forma de pago (${money(total)})</h2>
      <p class="readonly">Suma el importe cobrado de cada servicio segun la forma de pago capturada. Las cortesias y refuerzos se muestran aparte como servicios sin cobro.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Forma de pago</th><th>Monto cobrado</th><th>Servicios</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Forma de pago"><strong>${row.forma}</strong></td><td data-label="Monto cobrado">${money(row.cobrado)}</td><td data-label="Servicios">${number(row.servicios)}</td></tr>`).join("")
                : `<tr><td colspan="3">Aun no hay cobros registrados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderDashboardMonthlyChart(monthly, max) {
  return `
    <div class="month-chart">
      ${monthly.map((row) => {
        const height = Math.max(7, Math.round((row.facturado / max) * 100));
        const cobradoHeight = row.facturado > 0 ? Math.max(5, Math.round((row.cobrado / max) * 100)) : 0;
        return `
          <div class="month-column">
            <div class="month-bars" title="${row.month}: ${money(row.facturado)}">
              <span class="month-bar billed" style="height:${height}%"></span>
              <span class="month-bar paid" style="height:${cobradoHeight}%"></span>
            </div>
            <strong>${row.month}</strong>
            <small>${money(row.facturado)}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderDashboardRing(percent, label, value, variant = "") {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  return `
    <div class="donut ${variant}" style="--value:${safePercent}%">
      <div>
        <strong>${value}</strong>
        <span>${label}</span>
      </div>
    </div>
  `;
}

function renderBar(label, value, max, showMoney, format = "money") {
  const width = Math.round((value / max) * 100);
  const display = format === "clientes"
    ? `${number(value)} clientes`
    : format === "servicios"
      ? `${number(value)} servicios`
      : showMoney ? money(value) : number(width) + "%";
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

function comprasPorMes(rowsSource = comprasFiltradasOperacion()) {
  const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rows = labels.map((month) => ({ month, total: 0, compras: 0 }));
  rowsSource.forEach((compra) => {
    if (!compra.fecha) return;
    const idx = new Date(compra.fecha + "T00:00:00").getMonth();
    if (Number.isNaN(idx)) return;
    rows[idx].total += Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0);
    rows[idx].compras += 1;
  });
  return rows.filter((row) => row.total || row.compras);
}

function gastosPorMes(rowsSource = gastosFiltradosOperacion()) {
  const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rows = labels.map((month) => ({ month, total: 0, gastos: 0 }));
  rowsSource.forEach((gasto) => {
    if (!gasto.fecha) return;
    const idx = new Date(gasto.fecha + "T00:00:00").getMonth();
    if (Number.isNaN(idx)) return;
    rows[idx].total += Number(gasto.monto || 0);
    rows[idx].gastos += 1;
  });
  return rows.filter((row) => row.total || row.gastos);
}

function gastosPorCategoria(rowsSource = gastosFiltradosOperacion()) {
  return Object.entries(rowsSource.reduce((rows, gasto) => {
    const categoria = gasto.categoria || "Sin categoria";
    if (!rows[categoria]) rows[categoria] = { total: 0, gastos: 0 };
    rows[categoria].total += Number(gasto.monto || 0);
    rows[categoria].gastos += 1;
    return rows;
  }, {}))
    .map(([categoria, data]) => ({ categoria, ...data }))
    .sort((a, b) => b.total - a.total);
}

function gastosPorMesYCategoria(rowsSource = gastosFiltradosOperacion()) {
  const categorias = [...new Set(rowsSource.map((gasto) => gasto.categoria || "Sin categoria"))].sort();
  const grouped = {};
  rowsSource.forEach((gasto) => {
    const key = monthKey(gasto.fecha);
    if (!key) return;
    const categoria = gasto.categoria || "Sin categoria";
    if (!grouped[key]) {
      grouped[key] = { key, mes: monthLabel(key), total: 0, gastos: 0, categorias: {} };
    }
    grouped[key].categorias[categoria] = (grouped[key].categorias[categoria] || 0) + Number(gasto.monto || 0);
    grouped[key].total += Number(gasto.monto || 0);
    grouped[key].gastos += 1;
  });
  return {
    categorias,
    rows: Object.values(grouped).sort((a, b) => String(a.key).localeCompare(String(b.key))),
  };
}

function renderMiniServices() {
  const rows = serviciosFiltradosOperacion()
    .sort((a, b) => {
      const dateCompare = String(b.fecha || "").localeCompare(String(a.fecha || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(b.id || "").localeCompare(String(a.id || ""));
    })
    .slice(0, 5);
  if (!rows.length) return `<p class="readonly">Aun no hay servicios capturados.</p>`;
  return `
    <div class="recent-services">
      ${rows.map((s) => `
        <div class="recent-service">
          <div>
            <strong>${nombreCliente(s.clienteId, s)}</strong>
            <span>${s.fecha} · ${s.tipo || "Servicio"}</span>
          </div>
          ${paymentPill(s)}
        </div>
      `).join("")}
    </div>
  `;
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

function renderServiciosTecnicoResumen() {
  const rows = Object.entries(serviciosPorTecnico()).sort((a, b) => b[1] - a[1]);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Servicios por tecnico</h2>
      <div class="bars">
        ${
          rows.length
            ? rows.map(([tecnico, total]) => renderBar(tecnico, total, Math.max(...rows.map((row) => row[1]), 1), true, "servicios")).join("")
            : `<p class="readonly">Aun no hay servicios registrados.</p>`
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

function renderGastosCategoriaResumen(rowsSource = gastosFiltradosOperacion()) {
  const rows = gastosPorCategoria(rowsSource);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Gastos historicos por tipo / categoria (${money(total)})</h2>
      <div class="table-card">
        <table>
          <thead><tr><th>Categoria</th><th>Gastos</th><th>Total</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Categoria"><strong>${row.categoria}</strong></td><td data-label="Gastos">${number(row.gastos)}</td><td data-label="Total"><strong>${money(row.total)}</strong></td></tr>`).join("")
                : `<tr><td colspan="3">Aun no hay gastos registrados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderGastosMensualesCategoriaResumen(rowsSource = gastosFiltradosOperacion()) {
  const { categorias, rows } = gastosPorMesYCategoria(rowsSource);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Gastos mensuales por tipo / categoria</h2>
      <p class="readonly">Muestra cuanto se gasto en cada rubro por mes. Respeta el filtro de ciudad de operacion.</p>
      <div class="table-card">
        <table>
          <thead>
            <tr><th>Mes</th>${categorias.map((categoria) => `<th>${categoria}</th>`).join("")}<th>Total</th></tr>
          </thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Mes"><strong>${row.mes}</strong><br><span class="readonly">${number(row.gastos)} gasto${row.gastos === 1 ? "" : "s"}</span></td>${categorias.map((categoria) => `<td data-label="${categoria}">${money(row.categorias[categoria] || 0)}</td>`).join("")}<td data-label="Total"><strong>${money(row.total)}</strong></td></tr>`).join("")
                : `<tr><td colspan="${categorias.length + 2}">Aun no hay gastos registrados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderGastosPagadorMensualResumen() {
  const rows = gastosPorPagadorMes();
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Gastos por mes y pagador</h2>
      <div class="table-card">
        <table>
          <thead><tr><th>Mes</th><th>VICTOR</th><th>SISPROVISA</th><th>Otros</th><th>Total gastos</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Mes">${row.month}</td><td data-label="VICTOR">${money(row.VICTOR)}</td><td data-label="SISPROVISA">${money(row.SISPROVISA)}</td><td data-label="Otros">${money(row.otros)}</td><td data-label="Total gastos"><strong>${money(row.total)}</strong></td></tr>`).join("")
                : `<tr><td colspan="5">Aun no hay gastos registrados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderGastosCiudadPagadorResumen() {
  const rows = gastosPorCiudadYPagador();
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Gastos por ciudad y pagador (${money(total)})</h2>
      <p class="readonly">Solo incluye gastos operativos capturados en la seccion Gastos, separados por ciudad de operacion y por quien los pago.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Ciudad</th><th>VICTOR</th><th>SISPROVISA</th><th>Otros</th><th>Total gastos</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Ciudad"><strong>${row.ciudad}</strong></td><td data-label="VICTOR">${money(row.VICTOR)}</td><td data-label="SISPROVISA">${money(row.SISPROVISA)}</td><td data-label="Otros">${money(row.otros)}</td><td data-label="Total gastos"><strong>${money(row.total)}</strong></td></tr>`).join("")
                : `<tr><td colspan="5">Aun no hay gastos registrados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderComprasCiudadPagadorResumen() {
  const rows = comprasPorCiudadYPagador();
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Compras por ciudad y pagador (${money(total)})</h2>
      <p class="readonly">Solo incluye compras de producto e inventario capturadas en la seccion Compras.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Ciudad</th><th>VICTOR</th><th>SISPROVISA</th><th>Otros</th><th>Total compras</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Ciudad"><strong>${row.ciudad}</strong></td><td data-label="VICTOR">${money(row.VICTOR)}</td><td data-label="SISPROVISA">${money(row.SISPROVISA)}</td><td data-label="Otros">${money(row.otros)}</td><td data-label="Total compras"><strong>${money(row.total)}</strong></td></tr>`).join("")
                : `<tr><td colspan="5">Aun no hay compras registradas.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderEquiposCiudadPagadorResumen() {
  const rows = equiposPorCiudadYPagador();
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return `
    <section class="panel" style="margin-top:14px">
      <h2>Equipos por ciudad y pagador (${money(total)})</h2>
      <p class="readonly">Solo incluye inversion en equipos capturada en la seccion Equipos.</p>
      <div class="table-card">
        <table>
          <thead><tr><th>Ciudad</th><th>VICTOR</th><th>SISPROVISA</th><th>Otros</th><th>Total equipos</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((row) => `<tr><td data-label="Ciudad"><strong>${row.ciudad}</strong></td><td data-label="VICTOR">${money(row.VICTOR)}</td><td data-label="SISPROVISA">${money(row.SISPROVISA)}</td><td data-label="Otros">${money(row.otros)}</td><td data-label="Total equipos"><strong>${money(row.total)}</strong></td></tr>`).join("")
                : `<tr><td colspan="5">Aun no hay equipos registrados.</td></tr>`
            }
          </tbody>
        </table>
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
      <h2>Total pagado por socio: gastos + compras + equipos (${money(totalGeneral)})</h2>
      <p class="readonly">Este total suma gastos operativos, compras de inventario y equipos. Para ver solo gastos usa la seccion "Gastos pagados por" o "Gastos por mes y pagador".</p>
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
  const tipos = [...new Set(state.clientes.map((c) => c.tipo || "Sin tipo"))].sort();
  const clasificaciones = clienteClasificacionOptions(false);
  const clientes = clientesFiltradosVista();
  return `
    ${topbar("Clientes", "Alta, contacto, direccion e historial financiero por cliente.", `<button class="secondary" data-action="exportClientes">Exportar clientes</button><button class="primary" data-open="cliente">Nuevo cliente</button>`)}
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
      <div class="field">
        <label>Ciudad</label>
        <select id="clienteCiudadFilter">
          <option value="">Todas</option>
          ${["MERIDA", "CDMX"].map((ciudad) => `<option value="${ciudad}" ${ciudad === clienteCiudadFilter ? "selected" : ""}>${ciudad}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Nuevo / antiguo</label>
        <select id="clienteClasificacionFilter">
          <option value="">Todas</option>
          ${clasificaciones.map((item) => `<option value="${item.value}" ${item.value === clienteClasificacionFilter ? "selected" : ""}>${item.label}</option>`).join("")}
        </select>
      </div>
      <div class="filter-count">
        ${number(clientes.length)} de ${number(state.clientes.length)} clientes
      </div>
    </section>
    <div class="table-card service-list client-list">
      <table>
        <thead><tr><th>Cliente</th><th>Contacto</th><th>Ciudad / tipo / clasif.</th><th>Servicios</th><th>Facturado</th><th>Por cobrar</th><th></th></tr></thead>
        <tbody>
          ${clientes.length ? clientes.map((c) => {
            const servicios = state.servicios.filter((s) => s.clienteId === c.id);
            const facturado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
            const cobrado = servicios.reduce((sum, s) => sum + Number(s.cobrado || 0), 0);
            const contacto = [c.contacto, c.telefono, c.correo].filter(Boolean).join(" · ");
            return `<tr><td data-label="Cliente"><strong>${c.nombre}</strong>${resumenDomiciliosCliente(c)}${c.observaciones ? `<br><span class="readonly">${c.observaciones}</span>` : ""}</td><td data-label="Contacto">${contacto || ""}</td><td data-label="Ciudad / tipo / clasif.">${c.ciudad || "MERIDA"}<br><span class="readonly">${c.tipo || ""}</span><br><span class="pill">${clasificacionCliente(c)}</span></td><td data-label="Servicios">${number(servicios.length)}</td><td data-label="Facturado">${money(facturado)}</td><td data-label="Por cobrar">${money(Math.max(0, facturado - cobrado))}</td><td data-label="Acciones">${rowActions("cliente", c.id)}</td></tr>`;
          }).join("") : `<tr><td colspan="7">No hay clientes que coincidan con la busqueda.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderProgramacion() {
  const readOnly = isProgramacionReadOnly();
  const rows = [...programacionesFiltradasOperacion()]
    .filter((programacion) => {
      const estatus = programacion.estatus || "Programado";
      if (programacionStatusFilter === "Todos") return true;
      if (programacionStatusFilter === "Activos") return estatus !== "Realizado" && estatus !== "Cancelado";
      return estatus === programacionStatusFilter;
    })
    .sort((a, b) => {
    const dateCompare = String(a.fecha || "").localeCompare(String(b.fecha || ""));
    if (dateCompare !== 0) return dateCompare;
    const timeCompare = String(a.hora || "").localeCompare(String(b.hora || ""));
    if (timeCompare !== 0) return timeCompare;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
  return `
    ${topbar("Programacion", "Agenda interna de servicios por fecha, tecnico y operacion.", `${operationFilterControl()}${programacionStatusFilterControl()}${readOnly ? "" : `<button class="primary" data-open="programacion">Nuevo programado</button>`}`)}
    ${renderProgramacionAgenda(rows)}
    <section class="panel">
      <h2>Servicios programados - ${programacionStatusFilter}</h2>
      <div class="table-card service-list programacion-list">
        <table>
          <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Ciudad</th><th>Servicio</th><th>Tecnico</th><th>Estatus</th><th>Calendar</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((p) => `<tr><td data-label="Fecha">${p.fecha || ""}</td><td data-label="Hora">${p.hora || ""}</td><td data-label="Cliente"><strong>${nombreCliente(p.clienteId)}</strong><br><span class="readonly">${p.direccion || ""}</span></td><td data-label="Ciudad">${p.ciudad || "Yucatan"}</td><td data-label="Servicio">${p.tipo || ""}<br><span class="readonly">${p.notas || ""}</span></td><td data-label="Tecnico">${tecnicosProgramacionTexto(p)}</td><td data-label="Estatus">${programacionPill(p.estatus)}</td><td data-label="Calendar">${calendarPill(p)}</td><td data-label="Acciones"><div class="actions"><button class="secondary" data-view-programacion="${p.id}">Consultar</button>${readOnly ? "" : `<button class="secondary" data-edit="programacion" data-id="${p.id}">Editar</button><button class="primary" data-convert-programacion="${p.id}">Pasar a ventas</button><button class="ghost" data-delete="programacion" data-id="${p.id}">Cancelar</button>`}</div></td></tr>`).join("") : `<tr><td colspan="9">Aun no hay servicios programados para este filtro.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProgramacionAgenda(rows) {
  const readOnly = isProgramacionReadOnly();
  const days = Array.from({ length: 7 }, (_, index) => dateKeyFromOffset(index));
  return `
    <section class="panel agenda-panel">
      <h2>Agenda proximos 7 dias</h2>
      <div class="agenda-grid">
        ${days.map((day) => {
          const eventos = rows
            .filter((programacion) => programacion.fecha === day)
            .sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || "")));
          return `
            <div class="agenda-day">
              <div class="agenda-date">${shortDateLabel(day)}</div>
              <div class="agenda-events">
                ${eventos.length
                  ? eventos.map((programacion) => `
                    <div class="agenda-event">
                      <strong>${programacion.hora || "--:--"} ${nombreCliente(programacion.clienteId)}</strong>
                      <span>${programacion.tipo || ""}</span>
                      <small>${tecnicosProgramacionTexto(programacion)} · ${programacion.ciudad || "Yucatan"} · ${programacion.estatus || "Programado"}</small>
                      ${readOnly ? "" : `
                        <div class="agenda-actions">
                          <button class="secondary" data-edit="programacion" data-id="${programacion.id}">Editar</button>
                          <button class="primary" data-convert-programacion="${programacion.id}">Pasar a ventas</button>
                          <button class="ghost" data-delete="programacion" data-id="${programacion.id}">Cancelar</button>
                        </div>
                      `}
                    </div>
                  `).join("")
                  : `<p class="readonly">Sin servicios</p>`}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function programacionPill(estatus) {
  const value = estatus || "Programado";
  const className = value === "Realizado" ? "good" : value === "Cancelado" ? "pending" : "";
  return `<span class="pill ${className}">${value}</span>`;
}

function calendarPill(programacion) {
  if (["Creado", "Actualizado"].includes(programacion.calendarStatus)) return `<span class="pill good">Calendario</span>`;
  if (programacion.calendarStatus === "Cancelado") return `<span class="pill pending">Calendario cancelado</span>`;
  if (programacion.calendarStatus) return `<span class="pill pending">Calendario error</span>`;
  return `<span class="pill">Sin calendario</span>`;
}

function renderServiciosAnterior() {
  return `
    ${topbar("Servicios / Ventas", "Captura de servicios, cobros, formas de pago y productos usados.", `<button class="primary" data-open="servicio">Nuevo servicio</button>`)}
    <div class="table-card">
      <table>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Ciudad</th><th>Servicio</th><th>Total</th><th>Cobrado</th><th>Pendiente</th><th>Costo prod.</th><th>% producto</th><th>Estatus</th><th></th></tr></thead>
        <tbody>
          ${state.servicios.map((s) => `<tr><td data-label="Fecha">${s.fecha}</td><td data-label="Cliente">${nombreCliente(s.clienteId, s)}</td><td data-label="Ciudad">${s.ciudad || "Yucatan"}</td><td data-label="Servicio">${s.tipo}<br><span class="readonly">${s.tecnico || ""} · ${s.zona || ""}</span></td><td data-label="Total">${money(totalServicio(s))}</td><td data-label="Cobrado">${money(s.cobrado)}</td><td data-label="Pendiente">${money(pendienteServicio(s))}</td><td data-label="Costo prod.">${currentUser.role === "admin" ? money(costoServicio(s)) : "Restringido"}</td><td data-label="% producto">${currentUser.role === "admin" ? `${(porcentajeCostoProducto(s) * 100).toFixed(1)}%` : "Restringido"}</td><td data-label="Estatus">${paymentPill(s)}</td><td data-label="Acciones">${rowActions("servicio", s.id)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderResumenServiciosPorCliente(servicios) {
  if (!servicioSearch.trim()) return "";

  const resumen = new Map();
  servicios.forEach((servicio) => {
    const cliente = nombreCliente(servicio.clienteId, servicio);
    const key = normalizarTexto(cliente);
    const actual = resumen.get(key) || {
      cliente,
      servicios: 0,
      ventas: 0,
      cobrado: 0,
      pendiente: 0,
      costoProducto: 0,
    };
    actual.servicios += 1;
    actual.ventas += totalServicio(servicio);
    actual.cobrado += Number(servicio.cobrado || 0);
    actual.pendiente += pendienteServicio(servicio);
    actual.costoProducto += costoServicio(servicio);
    resumen.set(key, actual);
  });

  const clientes = [...resumen.values()].sort((a, b) => b.ventas - a.ventas || a.cliente.localeCompare(b.cliente));
  if (!clientes.length) return "";

  const total = clientes.reduce((acc, item) => {
    acc.servicios += item.servicios;
    acc.ventas += item.ventas;
    acc.cobrado += item.cobrado;
    acc.pendiente += item.pendiente;
    acc.costoProducto += item.costoProducto;
    return acc;
  }, { servicios: 0, ventas: 0, cobrado: 0, pendiente: 0, costoProducto: 0 });

  const canSeeCosts = currentUser.role === "admin";
  const moneyIfAllowed = (value) => canSeeCosts ? money(value) : "Restringido";
  const utilidadAntesGastos = (item) => item.cobrado - item.costoProducto;
  const rows = clientes.map((item) => `
    <tr>
      <td data-label="Cliente">${item.cliente}</td>
      <td data-label="Servicios">${number(item.servicios)}</td>
      <td data-label="Vendido">${money(item.ventas)}</td>
      <td data-label="Cobrado">${money(item.cobrado)}</td>
      <td data-label="Pendiente">${money(item.pendiente)}</td>
      <td data-label="Costo prod.">${moneyIfAllowed(item.costoProducto)}</td>
      <td data-label="Utilidad antes gastos"><strong>${moneyIfAllowed(utilidadAntesGastos(item))}</strong></td>
    </tr>
  `).join("");

  return `
    <section class="table-card service-client-summary">
      <div class="section-heading">
        <div>
          <h3>Resumen por cliente encontrado</h3>
          <p>Consolida los servicios visibles para revisar lo vendido, cobrado, pendiente y costo de producto por cliente.</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Cliente</th><th>Servicios</th><th>Vendido</th><th>Cobrado</th><th>Pendiente</th><th>Costo prod.</th><th>Utilidad antes gastos</th></tr></thead>
        <tbody>
          ${rows}
          <tr>
            <td data-label="Cliente"><strong>Total encontrado</strong></td>
            <td data-label="Servicios"><strong>${number(total.servicios)}</strong></td>
            <td data-label="Vendido"><strong>${money(total.ventas)}</strong></td>
            <td data-label="Cobrado"><strong>${money(total.cobrado)}</strong></td>
            <td data-label="Pendiente"><strong>${money(total.pendiente)}</strong></td>
            <td data-label="Costo prod."><strong>${moneyIfAllowed(total.costoProducto)}</strong></td>
            <td data-label="Utilidad antes gastos"><strong>${moneyIfAllowed(utilidadAntesGastos(total))}</strong></td>
          </tr>
        </tbody>
      </table>
      <p class="readonly">El costo por cliente considera producto usado en servicios. No incluye nomina, gasolina u otros gastos generales porque esos gastos no estan ligados a un cliente especifico.</p>
    </section>
  `;
}

function renderServicios() {
  const term = servicioSearch.trim().toLowerCase();
  const servicios = serviciosFiltradosVista();
  const totalFiltrado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
  const rows = servicios.map((s) => {
    const costo = currentUser.role === "admin" ? money(costoServicio(s)) : "Restringido";
    const porcentaje = currentUser.role === "admin" ? `${(porcentajeCostoProducto(s) * 100).toFixed(1)}%` : "Restringido";
    return `<tr><td data-label="Fecha">${s.fecha}</td><td data-label="Cliente">${nombreCliente(s.clienteId, s)}<br><span class="readonly">${clasificacionServicio(s)}</span></td><td data-label="Ciudad">${s.ciudad || "Yucatan"}</td><td data-label="Servicio">${s.tipo}<br><span class="readonly">${s.tecnico || ""} - ${s.zona || ""}</span></td><td data-label="Total">${money(totalServicio(s))}</td><td data-label="Cobrado">${money(s.cobrado)}</td><td data-label="Pendiente">${money(pendienteServicio(s))}</td><td data-label="Costo prod.">${costo}</td><td data-label="% producto">${porcentaje}</td><td data-label="Estatus">${paymentPill(s)}</td><td data-label="Acciones">${rowActions("servicio", s.id)}</td></tr>`;
  }).join("");
  return `
    ${topbar("Servicios / Ventas", "Captura de servicios, cobros, formas de pago y productos usados.", `${operationFilterControl()}${servicioPagoFilterControl()}<button class="secondary" data-action="exportServicios">Exportar ventas</button><button class="primary" data-open="servicio">Nuevo servicio</button>`)}
    <section class="panel filters">
      <div class="field">
        <label>Buscar servicios por cliente</label>
        <input id="servicioSearch" type="search" placeholder="Escribe el nombre del cliente" value="${servicioSearch}" />
      </div>
      <div class="field">
        <label>Tipo de servicio</label>
        <select id="servicioTipoFilter">
          <option value="Todos">Todos</option>
          ${state.tiposServicio
            .map((tipo) => `<option value="${tipo.nombre}" ${servicioTipoFilter === tipo.nombre ? "selected" : ""}>${tipo.nombre}</option>`)
            .join("")}
        </select>
      </div>
      <div class="field">
        <label>Producto utilizado</label>
        <select id="servicioProductoFilter">
          <option value="Todos">Todos</option>
          ${[...state.productos]
            .sort((a, b) => String(a.producto || "").localeCompare(String(b.producto || "")))
            .map((producto) => `<option value="${producto.id}" ${servicioProductoFilter === producto.id ? "selected" : ""}>${producto.producto}</option>`)
            .join("")}
        </select>
      </div>
      <div class="field">
        <label>Cliente nuevo / antiguo</label>
        <select id="servicioClienteClasificacionFilter">
          ${clienteClasificacionOptions(true).map((item) => `<option value="${item.value}" ${servicioClienteClasificacionFilter === item.value ? "selected" : ""}>${item.label}</option>`).join("")}
        </select>
      </div>
      <div class="filter-count">
        ${number(servicios.length)} de ${number(serviciosFiltradosOperacion().length)} servicios en ${operacionFilter}
        ${servicioPagoFilter !== "Todos" ? `<br>${servicioPagoFilter}` : ""}
        ${servicioTipoFilter !== "Todos" ? `<br>${servicioTipoFilter}` : ""}
        ${servicioProductoFilter !== "Todos" ? `<br>Producto: ${nombreProducto(servicioProductoFilter)}` : ""}
        ${servicioClienteClasificacionFilter !== "Todos" ? `<br>Cliente: ${servicioClienteClasificacionFilter}` : ""}
        ${(term || servicioTipoFilter !== "Todos" || servicioProductoFilter !== "Todos" || servicioClienteClasificacionFilter !== "Todos") ? `<br><strong>${money(totalFiltrado)}</strong> en servicios encontrados` : ""}
      </div>
    </section>
    ${renderResumenServiciosPorCliente(servicios)}
    <div class="table-card service-list sales-list">
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
  const normalizeTerm = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const term = normalizeTerm(compraSearch.trim());
  const comprasRows = comprasFiltradasOperacion()
    .filter((compra) => {
      if (!term) return true;
      return [
        nombreProducto(compra.productoId),
        compra.proveedor,
        compra.pagadoPor,
        operacionRegistro(compra),
      ].some((value) => normalizeTerm(value).includes(term));
    })
    .sort((a, b) => {
      const dateCompare = String(b.fecha || "").localeCompare(String(a.fecha || ""));
      if (dateCompare !== 0) return dateCompare;
      return nombreProducto(a.productoId).localeCompare(nombreProducto(b.productoId));
    });
  const stockOperacion = operacionFilter === "Todas" ? null : operacionFilter;
  const stockRows = state.productos
    .map((p) => {
      const comprado = stockOperacion ? cantidadCompradaUsoOperacion(p.id, stockOperacion) : cantidadCompradaUso(p.id);
      const consumido = stockOperacion ? cantidadConsumidaUsoOperacion(p.id, stockOperacion) : cantidadConsumidaUso(p.id);
      const lotes = lotesRestantesProducto(p.id, stockOperacion);
      return { producto: p, comprado, consumido, stock: comprado - consumido, lotes };
    })
    .filter((row) => row.comprado > 0 || row.consumido > 0 || row.lotes.length > 0)
    .filter((row) => !term || normalizeTerm(row.producto.producto).includes(term))
    .sort((a, b) => String(a.producto.producto || "").localeCompare(String(b.producto.producto || "")));
  const comprasMensuales = comprasPorMes(comprasRows);
  const maxCompraMensual = Math.max(...comprasMensuales.map((row) => row.total), 1);
  return `
    ${topbar("Compras", "Entradas de producto para alimentar inventario.", `${operationFilterControl()}<button class="primary" data-open="compra">Nueva compra</button>`)}
    <section class="panel filters">
      <div class="field">
        <label>Buscar producto comprado</label>
        <input id="compraSearch" type="search" placeholder="Escribe el nombre del producto" value="${compraSearch}" />
      </div>
      <div class="filter-count">
        ${number(comprasRows.length)} de ${number(comprasFiltradasOperacion().length)} compras
        ${term ? `<br><strong>${money(comprasRows.reduce((sum, compra) => sum + Number(compra.cantidad || 0) * Number(compra.costoUnitario || 0), 0))}</strong> en compras encontradas` : ""}
      </div>
    </section>
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
      <h2>Stock por producto ${stockOperacion ? `- ${stockOperacion}` : "- global"}</h2>
      <div class="table-card service-list">
        <table>
          <thead><tr><th>Producto</th><th>Comprado</th><th>Usado</th><th>Stock disponible</th><th>Lotes abiertos</th><th>Proximo costo</th></tr></thead>
          <tbody>
            ${stockRows.length ? stockRows.map((row) => {
              const p = row.producto;
              return `<tr><td data-label="Producto"><strong>${p.producto}</strong></td><td data-label="Comprado">${number(row.comprado)} ${p.unidadUso || ""}</td><td data-label="Usado">${number(row.consumido)} ${p.unidadUso || ""}</td><td data-label="Stock disponible"><strong>${number(row.stock)} ${p.unidadUso || ""}</strong></td><td data-label="Lotes abiertos">${number(row.lotes.length)}</td><td data-label="Proximo costo">${money(costoProximoLoteUso(p.id, stockOperacion))} / ${p.unidadUso || "uso"}</td></tr>`;
            }).join("") : `<tr><td colspan="6">Aun no hay compras registradas para este filtro.</td></tr>`}
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
        <tbody>${comprasRows.length ? comprasRows.map((c) => `<tr><td data-label="Fecha">${c.fecha}</td><td data-label="Operacion">${operacionRegistro(c)}</td><td data-label="Producto">${nombreProducto(c.productoId)}</td><td data-label="Cantidad">${number(c.cantidad)} ${unidadCompraProducto(c.productoId)}</td><td data-label="Costo unidad">${money(c.costoUnitario)}</td><td data-label="Total">${money(Number(c.cantidad || 0) * Number(c.costoUnitario || 0))}</td><td data-label="Proveedor">${c.proveedor || ""}</td><td data-label="Pagado por">${c.pagadoPor || ""}</td><td data-label="Acciones">${rowActions("compra", c.id)}</td></tr>`).join("") : `<tr><td colspan="9">No hay compras que coincidan con la busqueda.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderGastos() {
  const gastosRows = gastosFiltradosOperacion();
  const categorias = [...new Set(gastosRows.map((g) => g.categoria || "Sin categoria"))].sort();
  const gastosFiltrados = gastosRows.filter((g) => !gastoCategoriaFilter || (g.categoria || "Sin categoria") === gastoCategoriaFilter);
  const gastosMensuales = gastosPorMes(gastosFiltrados);
  const maxGastoMensual = Math.max(...gastosMensuales.map((row) => row.total), 1);
  const gastosOrdenados = [...gastosFiltrados].sort((a, b) => {
    const dateCompare = String(b.fecha || "").localeCompare(String(a.fecha || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
  const totalCategoria = gastosFiltrados.reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0);
  return `
    ${topbar("Gastos", "Gastos operativos por categoria, comprobante y responsable.", `${operationFilterControl()}<button class="primary" data-open="gasto">Nuevo gasto</button>`)}
    <section class="panel">
      <h2>Gastos por mes${gastoCategoriaFilter ? ` - ${gastoCategoriaFilter}` : ""}</h2>
      <div class="bars">
        ${
          gastosMensuales.length
            ? gastosMensuales.map((row) => `${renderBar(row.month, row.total, maxGastoMensual, true)}<span class="readonly">${number(row.gastos)} gasto${row.gastos === 1 ? "" : "s"}</span>`).join("")
            : `<p class="readonly">Aun no hay gastos registrados.</p>`
        }
      </div>
    </section>
    ${renderGastosCategoriaResumen(gastosRows)}
    ${renderGastosMensualesCategoriaResumen(gastosRows)}
    ${renderGastosPagadorResumen()}
    <section class="panel" style="margin-top:14px">
      <h2>Historial de gastos</h2>
      <section class="filters" style="margin-bottom:0">
        <div class="field">
          <label>Tipo de gasto / Categoria</label>
          <select id="gastoCategoriaFilter">
            <option value="">Todas</option>
            ${categorias.map((categoria) => `<option value="${categoria}" ${categoria === gastoCategoriaFilter ? "selected" : ""}>${categoria}</option>`).join("")}
          </select>
        </div>
        <div class="filter-count">
          ${number(gastosFiltrados.length)} de ${number(gastosRows.length)} gastos · ${money(totalCategoria)}
        </div>
      </section>
    </section>
    <div class="table-card">
      <table>
        <thead><tr><th>Fecha</th><th>Operacion</th><th>Categoria</th><th>Descripcion</th><th>Monto</th><th>Pagado por</th><th></th></tr></thead>
        <tbody>${gastosOrdenados.length ? gastosOrdenados.map((g) => `<tr><td data-label="Fecha">${g.fecha}</td><td data-label="Operacion">${operacionRegistro(g)}</td><td data-label="Categoria">${g.categoria}</td><td data-label="Descripcion">${g.descripcion || ""}<br><span class="readonly">${g.comprobante || ""}</span></td><td data-label="Monto">${money(g.monto)}</td><td data-label="Pagado por">${g.pagadoPor || ""}</td><td data-label="Acciones">${rowActions("gasto", g.id)}</td></tr>`).join("") : `<tr><td colspan="7">No hay gastos que coincidan con este filtro.</td></tr>`}</tbody>
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
  if (type === "servicio") {
    return `<div class="actions"><button class="secondary" data-view-service="${id}">Consultar</button><button class="secondary" data-edit="${type}" data-id="${id}">Editar</button><button class="ghost" data-delete="${type}" data-id="${id}">Borrar</button></div>`;
  }
  return `<div class="actions"><button class="secondary" data-edit="${type}" data-id="${id}">Editar</button><button class="ghost" data-delete="${type}" data-id="${id}">Borrar</button></div>`;
}

function renderModal() {
  const { type, id } = modal;
  if (type === "programacionConsulta") return renderProgramacionConsultaModal(id);
  if (type === "servicioConsulta") return renderServicioConsultaModal(id);
  const data = modal.data || (id ? state[typeToCollection(type)].find((x) => x.id === id || x.nombre === id) : {});
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

function readField(label, value, extra = "") {
  return `<div class="field ${extra}"><label>${label}</label><div class="readonly">${value || "-"}</div></div>`;
}

function renderProgramacionConsultaModal(id) {
  const programacion = state.programaciones.find((item) => item.id === id);
  if (!programacion) {
    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <div><h2>Consultar programado</h2></div>
            <button class="ghost" data-action="close">Cerrar</button>
          </div>
          <p>No se encontro el servicio programado.</p>
          <div class="form-actions">
            <button class="primary" type="button" data-action="close">Cerrar</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Consultar programado</h2>
            <p class="readonly">Solo lectura. Este perfil no puede modificar la programacion.</p>
          </div>
          <button class="ghost" data-action="close">Cerrar</button>
        </div>
        <div class="form-grid">
          ${readField("Fecha", programacion.fecha)}
          ${readField("Hora", programacion.hora)}
          ${readField("Cliente", nombreCliente(programacion.clienteId), "wide")}
          ${readField("Ciudad", programacion.ciudad || "Yucatan")}
          ${readField("Tipo de servicio", programacion.tipo)}
          ${readField("Tecnico(s)", tecnicosProgramacionTexto(programacion), "wide")}
          ${readField("Estatus", programacion.estatus || "Programado")}
          ${readField("Calendario", programacion.calendarStatus || "Sin calendario")}
          ${readField("Direccion / referencia", programacion.direccion, "full")}
          ${readField("Notas para el tecnico", programacion.notas, "full")}
        </div>
        <div class="form-actions">
          <button class="primary" type="button" data-action="close">Cerrar</button>
        </div>
      </div>
    </div>
  `;
}

function renderServicioConsultaModal(id) {
  const servicio = state.servicios.find((item) => item.id === id);
  if (!servicio) {
    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <div><h2>Consultar servicio</h2></div>
            <button class="ghost" data-action="close">Cerrar</button>
          </div>
          <p>No se encontro el servicio.</p>
          <div class="form-actions">
            <button class="primary" type="button" data-action="close">Cerrar</button>
          </div>
        </div>
      </div>
    `;
  }

  const productos = servicio.productos || [];
  const productosRows = productos.length
    ? productos.map((producto) => `<tr><td data-label="Producto">${nombreProducto(producto.productoId)}</td><td data-label="Cantidad">${number(producto.cantidad)} ${unidadUsoProducto(producto.productoId)}</td></tr>`).join("")
    : `<tr><td colspan="2">Sin productos registrados.</td></tr>`;
  const costo = currentUser.role === "admin" ? money(costoServicio(servicio)) : "Restringido";
  const porcentaje = currentUser.role === "admin" ? `${(porcentajeCostoProducto(servicio) * 100).toFixed(1)}%` : "Restringido";

  return `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Consultar servicio</h2>
            <p class="readonly">Solo lectura. Para modificar usa el boton Editar.</p>
          </div>
          <button class="ghost" data-action="close">Cerrar</button>
        </div>
        <div class="form-grid">
          ${readField("Fecha", servicio.fecha)}
          ${readField("Cliente", nombreCliente(servicio.clienteId, servicio), "wide")}
          ${readField("Ciudad", servicio.ciudad || "Yucatan")}
          ${readField("Tipo de servicio", servicio.tipo)}
          ${readField("Tecnico", servicio.tecnico)}
          ${readField("Direccion / zona", servicio.zona, "wide")}
          ${readField("Total", money(totalServicio(servicio)))}
          ${readField("Cobrado", money(servicio.cobrado))}
          ${readField("Pendiente", money(pendienteServicio(servicio)))}
          ${readField("Forma de pago", servicio.formaPago)}
          ${readField("Costo producto", costo)}
          ${readField("% producto", porcentaje)}
          ${readField("Observaciones", servicio.observaciones, "full")}
          <div class="full panel">
            <h2>Productos usados</h2>
            <div class="table-card">
              <table>
                <thead><tr><th>Producto</th><th>Cantidad</th></tr></thead>
                <tbody>${productosRows}</tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="primary" type="button" data-action="close">Cerrar</button>
        </div>
      </div>
    </div>
  `;
}

function modalTitle(type) {
  return { cliente: "cliente", programacion: "programado", servicio: "servicio", tipoServicio: "tipo de servicio", producto: "producto", compra: "compra", gasto: "gasto", equipo: "equipo" }[type];
}

function typeToCollection(type) {
  return { cliente: "clientes", programacion: "programaciones", servicio: "servicios", tipoServicio: "tiposServicio", producto: "productos", compra: "compras", gasto: "gastos", equipo: "equipos" }[type];
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

function programacionClienteFields(value) {
  const selectedClient = state.clientes.find((cliente) => String(cliente.id) === String(value));
  return `
    <div class="field wide" style="position:relative">
      <label>Cliente</label>
      <input
        id="programacionClienteSearch"
        type="search"
        value="${selectedClient?.nombre || ""}"
        placeholder="Escribe el nombre del cliente"
        autocomplete="off"
      />
      <input id="programacionClienteId" name="clienteId" type="hidden" value="${selectedClient?.id || ""}" />
      <div
        id="programacionClienteResults"
        style="display:none;position:absolute;z-index:20;top:100%;left:0;right:0;max-height:260px;overflow-y:auto;background:#fff;border:1px solid #cbd5e1;box-shadow:0 8px 20px rgba(15,23,42,.16)"
      ></div>
      <small id="programacionClienteCount" class="readonly">${selectedClient ? "Cliente seleccionado" : "Escribe al menos 2 letras y toca el cliente"}</small>
    </div>
  `;
}

function formDomiciliosCliente(data) {
  const domicilios = domiciliosCliente(data);
  const rows = Array.from({ length: 3 }, (_, index) => domicilios[index] || {});
  return `
    <div class="full panel">
      <h2>Domicilios del cliente</h2>
      <div class="domicilios-grid">
        ${rows.map((domicilio, index) => `
          <div class="domicilio-block">
            <h3>Domicilio ${index + 1}</h3>
            <div class="form-grid">
              ${input(`domicilioAlias${index}`, "Alias", domicilio.alias || (index === 0 ? "Principal" : ""))}
              ${select(`domicilioCiudad${index}`, "Ciudad", domicilio.ciudad || data.ciudad || "MERIDA", ["MERIDA", "CDMX"].map((x) => ({ value: x, label: x })))}
              ${input(`domicilioDireccion${index}`, "Direccion", domicilio.direccion || "", "text", "full")}
              ${input(`domicilioContacto${index}`, "Contacto en sitio", domicilio.contacto || "")}
              ${input(`domicilioReferencia${index}`, "Referencia / notas", domicilio.referencia || "", "text", "wide")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function formFor(type, data) {
  if (type === "cliente") {
    return `<div class="form-grid">${input("nombre", "Cliente", data.nombre, "text", "wide")}${select("ciudad", "Ciudad principal", data.ciudad || "MERIDA", ["MERIDA", "CDMX"].map((x) => ({ value: x, label: x })))}${select("clasificacion", "Nuevo / antiguo", data.clasificacion || "Sin clasificar", clienteClasificacionOptions(false))}${input("contacto", "Contacto", data.contacto)}${input("telefono", "Telefono", data.telefono)}${input("correo", "Correo", data.correo)}${select("tipo", "Tipo", data.tipo, ["Residencial", "Comercial", "Industrial", "Gobierno", "Otro"].map((x) => ({ value: x, label: x })))}${text("observaciones", "Observaciones", data.observaciones, "full")}${formDomiciliosCliente(data)}</div>`;
  }
  if (type === "producto") {
    return `<div class="form-grid">${input("producto", "Producto", data.producto, "text", "wide")}${select("unidadCompra", "Unidad de compra", data.unidadCompra, ["litro", "kilo", "envase", "pieza", "galon", "caja"].map((x) => ({ value: x, label: x })))}${select("unidadUso", "Unidad de uso", data.unidadUso, ["ml", "gr", "pieza"].map((x) => ({ value: x, label: x })))}${input("factor", "Equivalencia por unidad comprada", data.factor || 1000, "number")}${input("costo", "Costo por unidad de compra", data.costo, "number", "wide")}</div>`;
  }
  if (type === "tipoServicio") {
    return `<div class="form-grid">${input("nombre", "Tipo de servicio", data.nombre, "text", "wide")}</div>`;
  }
  if (type === "programacion") {
    const tipoOptions = state.tiposServicio.map((x) => ({ value: x.nombre, label: x.nombre }));
    return `<div class="form-grid">${input("fecha", "Fecha", data.fecha || today(), "date")}${input("hora", "Hora", data.hora || "09:00", "time")}${programacionClienteFields(data.clienteId)}${select("ciudad", "Ciudad", data.ciudad || "Yucatan", ["Yucatan", "CDMX"].map((x) => ({ value: x, label: x })))}${select("tipo", "Tipo de servicio", data.tipo, tipoOptions)}${select("tecnico", "Tecnico principal", data.tecnico || "", tecnicosProgramacionOptions(true))}${select("tecnicoAdicional", "Tecnico adicional", data.tecnicoAdicional || "", tecnicosProgramacionOptions(true))}${select("estatus", "Estatus", data.estatus || "Programado", ["Programado", "Confirmado", "Reprogramar", "Realizado", "Cancelado"].map((x) => ({ value: x, label: x })))}${text("direccion", "Direccion / referencia", data.direccion, "full")}${text("notas", "Notas para el tecnico", data.notas, "full")}</div>`;
  }
  if (type === "compra") {
    return `<div class="form-grid">${input("fecha", "Fecha", data.fecha || today(), "date")}${select("operacion", "Operacion", data.operacion || "Yucatan", ["Yucatan", "CDMX", "Sin clasificar"].map((x) => ({ value: x, label: x })))}${select("productoId", "Producto", data.productoId, state.productos.map((p) => ({ value: p.id, label: `${p.producto} (${p.unidadCompra || "unidad"})` })), "wide")}${input("cantidad", "Cantidad comprada", data.cantidad, "number")}${input("costoUnitario", "Costo por unidad comprada", data.costoUnitario, "number")}${input("proveedor", "Proveedor", data.proveedor)}${select("pagadoPor", "Pagado por", data.pagadoPor, ["SISPROVISA", "VICTOR"].map((x) => ({ value: x, label: x })))}${input("factura", "Factura / ref.", data.factura)}${text("notas", "Notas", data.notas, "full")}</div>`;
  }
  if (type === "gasto") {
    const categorias = ["Nomina", "Gasolina / Combustible", "IMSS", "INFONAVIT", "Impuesto sobre nominas", "Impuestos / ISR", "Telefonia Celular", "Internet", "Renta / Local", "Papeleria / Oficina", "Equipo / Herramientas", "Publicidad / Marketing", "Mantenimiento Vehiculo", "Uniforme / EPP", "Capacitacion", "Otros Gastos"];
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
  const clienteLigado = state.clientes.some((c) => String(c.id) === String(data.clienteId || ""));
  const clienteManualNombre = clienteLigado ? "" : nombreCliente("", data);
  const clienteOptionsFinal = [
    { value: "", label: clienteLigado ? "Sin cliente ligado" : "Selecciona cliente del catalogo" },
    ...clienteOptions,
  ];
  const avisoCliente = !clienteLigado
    ? `<div class="notice full">Este servicio no esta ligado a un cliente del catalogo. Si corresponde, selecciona el cliente correcto antes de guardar.</div>`
    : "";
  return `<div class="form-grid">
    ${input("fecha", "Fecha", data.fecha || today(), "date")}
    ${select("clienteId", "Cliente", clienteLigado ? data.clienteId : "", clienteOptionsFinal, "wide")}
    ${!clienteLigado ? input("cliente", "Cliente manual / referencia anterior", clienteManualNombre === "Sin cliente" ? "" : clienteManualNombre, "text", "wide") : ""}
    ${avisoCliente}
    ${select("ciudad", "Ciudad", data.ciudad || "Yucatan", ["Yucatan", "CDMX"].map((x) => ({ value: x, label: x })))}
    ${select("tipo", "Tipo de servicio", data.tipo, tipoOptions)}
    ${select("tecnico", "Tecnico", data.tecnico, ["SANTOS", "VICTOR", "FREDDY", "CRISTIAN"].map((x) => ({ value: x, label: x })))}
    ${input("zona", "Zona / direccion", data.zona, "text", "wide")}
    ${input("subtotal", "Importe del servicio", data.subtotal, "number")}
    ${input("cobrado", "Cobrado", data.cobrado, "number")}
    ${select("formaPago", "Forma de pago", data.formaPago, ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Por cobrar", "Cortesia", "Refuerzo"].map((x) => ({ value: x, label: x })))}
    ${data.programacionId ? `<input type="hidden" name="programacionId" value="${data.programacionId}" />` : ""}
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
  document.querySelectorAll("[data-view-service]").forEach((button) => {
    button.addEventListener("click", () => {
      modal = { type: "servicioConsulta", id: button.dataset.viewService };
      render();
    });
  });
  document.querySelectorAll("[data-view-programacion]").forEach((button) => {
    button.addEventListener("click", () => {
      modal = { type: "programacionConsulta", id: button.dataset.viewProgramacion };
      render();
    });
  });
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      modal = { type: button.dataset.edit, id: button.dataset.id };
      render();
    });
  });
  document.querySelectorAll("[data-convert-programacion]").forEach((button) => {
    button.addEventListener("click", () => {
      const programacion = state.programaciones.find((item) => item.id === button.dataset.convertProgramacion);
      if (!programacion) return;
      if (!confirm("Esto abrira el formulario para crear una venta/servicio real. No es para cambiar fecha u hora. Deseas continuar?")) return;
      modal = {
        type: "servicio",
        data: {
          fecha: programacion.fecha,
          clienteId: programacion.clienteId,
          ciudad: programacion.ciudad,
          tipo: programacion.tipo,
          tecnico: programacion.tecnico,
          zona: programacion.direccion,
          observaciones: programacion.notas,
          formaPago: "Por cobrar",
          subtotal: 0,
          cobrado: 0,
          programacionId: programacion.id,
        },
      };
      render();
    });
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const collection = typeToCollection(button.dataset.delete);
      const deletedEntity = state[collection].find((x) => x.id === button.dataset.id);
      const isProgramacion = collection === "programaciones";
      const message = isProgramacion
        ? "Esto cancelara el servicio programado, lo borrara de la app y tambien intentara borrar el evento de Google Calendar. Quieres continuar?"
        : "Quieres borrar este registro?";
      if (!confirm(message)) return;
      button.disabled = true;

      if (isProgramacion && deletedEntity?.calendarEventId) {
        try {
          const calendarResult = await deleteRemoteCalendarEvent(deletedEntity);
          if (calendarResult && calendarResult.ok === false) {
            const calendarError = calendarResult.error || "error desconocido";
            if (!isCalendarAlreadyDeleted(calendarError)) {
              const continueDelete = confirm(`No se pudo borrar del calendario: ${calendarError}. Quieres borrar de todos modos el servicio de la app?`);
              if (!continueDelete) {
                render();
                return;
              }
            }
          }
        } catch (error) {
          const continueDelete = confirm("No se pudo conectar con Google Calendar. Quieres borrar de todos modos el servicio de la app?");
          if (!continueDelete) {
            render();
            return;
          }
        }
      }

      state[collection] = state[collection].filter((x) => x.id !== button.dataset.id);
      saveLocalBackup();
      queueRemoteTask(async () => {
        await deleteRemoteRecord(collection, button.dataset.id);
      });
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
  document.querySelectorAll("[data-action='exportBackup']").forEach((button) => {
    button.addEventListener("click", exportBackup);
  });
  document.querySelectorAll("[data-action='exportBackupExcel']").forEach((button) => {
    button.addEventListener("click", exportBackupExcel);
  });
  document.querySelectorAll("[data-action='importBackup']").forEach((button) => {
    button.addEventListener("click", triggerBackupImport);
  });
  document.querySelectorAll("[data-action='exportClientes']").forEach((button) => {
    button.addEventListener("click", exportClientesCsv);
  });
  document.querySelectorAll("[data-action='exportServicios']").forEach((button) => {
    button.addEventListener("click", exportServiciosCsv);
  });
  document.querySelectorAll("[data-action='exportDashboardReport']").forEach((button) => {
    button.addEventListener("click", exportDashboardExecutiveReport);
  });
  const backupImportInput = document.querySelector("#backupImportInput");
  if (backupImportInput) {
    backupImportInput.addEventListener("change", (event) => {
      importBackupFile(event.target.files?.[0]);
      event.target.value = "";
    });
  }
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
  const clienteCiudadSelect = document.querySelector("#clienteCiudadFilter");
  if (clienteCiudadSelect) {
    clienteCiudadSelect.addEventListener("change", (event) => {
      clienteCiudadFilter = event.target.value;
      render();
    });
  }
  const clienteClasificacionSelect = document.querySelector("#clienteClasificacionFilter");
  if (clienteClasificacionSelect) {
    clienteClasificacionSelect.addEventListener("change", (event) => {
      clienteClasificacionFilter = event.target.value;
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
  const servicioPagoSelect = document.querySelector("#servicioPagoFilter");
  if (servicioPagoSelect) {
    servicioPagoSelect.addEventListener("change", (event) => {
      servicioPagoFilter = event.target.value;
      render();
    });
  }
  const servicioTipoSelect = document.querySelector("#servicioTipoFilter");
  if (servicioTipoSelect) {
    servicioTipoSelect.addEventListener("change", (event) => {
      servicioTipoFilter = event.target.value;
      render();
    });
  }
  const servicioProductoSelect = document.querySelector("#servicioProductoFilter");
  if (servicioProductoSelect) {
    servicioProductoSelect.addEventListener("change", (event) => {
      servicioProductoFilter = event.target.value;
      render();
    });
  }
  const servicioClienteClasificacionSelect = document.querySelector("#servicioClienteClasificacionFilter");
  if (servicioClienteClasificacionSelect) {
    servicioClienteClasificacionSelect.addEventListener("change", (event) => {
      servicioClienteClasificacionFilter = event.target.value;
      render();
    });
  }
  const compraSearchInput = document.querySelector("#compraSearch");
  if (compraSearchInput) {
    compraSearchInput.addEventListener("input", (event) => {
      compraSearch = event.target.value;
      render();
      const nextInput = document.querySelector("#compraSearch");
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
    });
  }
  const programacionStatusSelect = document.querySelector("#programacionStatusFilter");
  if (programacionStatusSelect) {
    programacionStatusSelect.addEventListener("change", (event) => {
      programacionStatusFilter = event.target.value;
      render();
    });
  }
  const gastoCategoriaSelect = document.querySelector("#gastoCategoriaFilter");
  if (gastoCategoriaSelect) {
    gastoCategoriaSelect.addEventListener("change", (event) => {
      gastoCategoriaFilter = event.target.value;
      render();
    });
  }
  bindProgramacionClienteSearch();
  const form = document.querySelector("#entityForm");
  if (form) form.addEventListener("submit", saveEntity);
}

function bindProgramacionClienteSearch() {
  const searchInput = document.querySelector("#programacionClienteSearch");
  const clientIdInput = document.querySelector("#programacionClienteId");
  const resultsBox = document.querySelector("#programacionClienteResults");
  const countLabel = document.querySelector("#programacionClienteCount");
  if (!searchInput || !clientIdInput || !resultsBox) return;

  const clientes = [...state.clientes]
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

  const matchesSearch = (cliente, term) => {
    const domicilios = domiciliosCliente(cliente);
    const searchable = [
      cliente.nombre,
      cliente.telefono,
      cliente.direccion,
      cliente.contacto,
      ...domicilios.flatMap((domicilio) => [
        domicilio.alias,
        domicilio.direccion,
        domicilio.contacto,
        domicilio.referencia,
      ]),
    ];
    return searchable.some((value) => String(value || "").toLowerCase().includes(term));
  };

  const selectClient = (cliente) => {
    searchInput.value = cliente.nombre || "";
    clientIdInput.value = cliente.id;
    resultsBox.style.display = "none";
    resultsBox.innerHTML = "";
    if (countLabel) countLabel.textContent = "Cliente seleccionado";
  };

  const updateResults = () => {
    const term = searchInput.value.trim().toLowerCase();
    clientIdInput.value = "";
    resultsBox.innerHTML = "";

    if (term.length < 2) {
      resultsBox.style.display = "none";
      if (countLabel) countLabel.textContent = "Escribe al menos 2 letras y toca el cliente";
      return;
    }

    const filtered = clientes.filter((cliente) => matchesSearch(cliente, term)).slice(0, 15);
    if (countLabel) {
      countLabel.textContent = `${filtered.length} ${filtered.length === 1 ? "cliente encontrado" : "clientes encontrados"}`;
    }

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.textContent = "No se encontraron clientes";
      empty.style.padding = "14px";
      resultsBox.appendChild(empty);
      resultsBox.style.display = "block";
      return;
    }

    filtered.forEach((cliente) => {
      const button = document.createElement("button");
      button.type = "button";
      button.style.cssText = "display:block;width:100%;padding:14px;text-align:left;background:#fff;border:0;border-bottom:1px solid #e2e8f0;color:#0f172a;font:inherit;";

      const name = document.createElement("strong");
      name.textContent = cliente.nombre || "Sin nombre";
      button.appendChild(name);

      const domicilio = domiciliosCliente(cliente)[0]?.direccion || cliente.direccion || "";
      if (domicilio) {
        const detail = document.createElement("small");
        detail.textContent = domicilio;
        detail.style.cssText = "display:block;margin-top:4px;color:#64748b;";
        button.appendChild(detail);
      }

      button.addEventListener("click", () => selectClient(cliente));
      resultsBox.appendChild(button);
    });
    resultsBox.style.display = "block";
  };

  searchInput.addEventListener("input", updateResults);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const firstResult = resultsBox.querySelector("button");
    if (firstResult) firstResult.click();
  });
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length >= 2 && !clientIdInput.value) updateResults();
  });
  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      resultsBox.style.display = "none";
    }, 200);
  });
}

function saveEntity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.type;
  const id = form.dataset.id;
  const data = Object.fromEntries(new FormData(form));
  if (type === "programacion" && !data.clienteId) {
    alert("Escribe el nombre y toca un cliente de la lista antes de guardar.");
    document.querySelector("#programacionClienteSearch")?.focus();
    return;
  }
  const entity = normalize(type, data);
  const collection = typeToCollection(type);
  let savedEntity = null;
  let updatedProgramacion = null;
  const isNewEntity = !id;
  if (id) {
    state[collection] = state[collection].map((x) => {
      if (x.id !== id && x.nombre !== id) return x;
      savedEntity = { ...x, ...entity, id: x.id || id };
      return savedEntity;
    });
  } else {
    savedEntity = { ...entity, id: uid() };
    state[collection].push(savedEntity);
  }
  if (type === "servicio" && entity.programacionId) {
    state.programaciones = state.programaciones.map((programacion) =>
      programacion.id === entity.programacionId
        ? (updatedProgramacion = { ...programacion, estatus: "Realizado" })
        : programacion
    );
    activeModule = "servicios";
  }
  saveLocalBackup();
  queueRemoteTask(async () => {
    if (savedEntity) await saveRemoteRecord(collection, savedEntity);
    if (type === "programacion" && savedEntity) {
      let calendarResult = null;
      if (savedEntity.estatus === "Cancelado" && savedEntity.calendarEventId) {
        calendarResult = await deleteRemoteCalendarEvent(savedEntity);
        savedEntity.calendarEventId = "";
        savedEntity.calendarEventUrl = "";
        savedEntity.calendarStatus = calendarResult?.ok ? "Cancelado" : `Error: ${calendarResult?.error || "No se pudo cancelar evento"}`;
      } else if (isNewEntity && !savedEntity.calendarEventId) {
        calendarResult = await createRemoteCalendarEvent(savedEntity);
        savedEntity.calendarEventId = calendarResult?.eventId || "";
        savedEntity.calendarEventUrl = calendarResult?.eventUrl || "";
        savedEntity.calendarStatus = calendarResult?.ok ? "Creado" : `Error: ${calendarResult?.error || "No se pudo crear evento"}`;
      } else if (!isNewEntity && savedEntity.calendarEventId) {
        calendarResult = await updateRemoteCalendarEvent(savedEntity);
        savedEntity.calendarEventId = calendarResult?.eventId || savedEntity.calendarEventId || "";
        savedEntity.calendarEventUrl = calendarResult?.eventUrl || savedEntity.calendarEventUrl || "";
        savedEntity.calendarStatus = calendarResult?.ok ? "Actualizado" : `Error: ${calendarResult?.error || "No se pudo actualizar evento"}`;
      }
      if (calendarResult) {
        state.programaciones = state.programaciones.map((programacion) =>
          programacion.id === savedEntity.id ? { ...programacion, ...savedEntity } : programacion
        );
        saveLocalBackup();
        await saveRemoteRecord("programaciones", savedEntity);
        render();
      }
    }
    if (updatedProgramacion) await saveRemoteRecord("programaciones", updatedProgramacion);
  });
  modal = null;
  render();
}

function normalize(type, data) {
  const numericFields = ["costo", "factor", "cantidad", "costoUnitario", "monto", "vida", "residual", "subtotal", "cobrado", "precio"];
  numericFields.forEach((field) => {
    if (field in data) data[field] = toNumber(data[field]);
  });
  if (type === "cliente") {
    data.clasificacion = data.clasificacion || "Sin clasificar";
    data.domicilios = [0, 1, 2]
      .map((index) => ({
        alias: String(data[`domicilioAlias${index}`] || "").trim(),
        ciudad: data[`domicilioCiudad${index}`] || data.ciudad || "MERIDA",
        direccion: String(data[`domicilioDireccion${index}`] || "").trim(),
        contacto: String(data[`domicilioContacto${index}`] || "").trim(),
        referencia: String(data[`domicilioReferencia${index}`] || "").trim(),
      }))
      .filter((domicilio) => domicilio.direccion || domicilio.alias || domicilio.contacto || domicilio.referencia);
    [0, 1, 2].forEach((index) => {
      delete data[`domicilioAlias${index}`];
      delete data[`domicilioCiudad${index}`];
      delete data[`domicilioDireccion${index}`];
      delete data[`domicilioContacto${index}`];
      delete data[`domicilioReferencia${index}`];
    });
    data.direccion = data.domicilios[0]?.direccion || "";
    data.ciudad = data.domicilios[0]?.ciudad || data.ciudad || "MERIDA";
  }
  if (type === "servicio") {
    const clienteExiste = state.clientes.some((c) => String(c.id) === String(data.clienteId || ""));
    if (data.clienteId && !clienteExiste) data.clienteId = "";
    if (data.clienteId && clienteExiste) {
      delete data.cliente;
      delete data.clienteNombre;
      delete data.nombreCliente;
      delete data.razonSocial;
      delete data.clienteManual;
    }
    if (!data.clienteId && data.cliente) {
      data.clienteNombre = data.cliente;
      data.nombreCliente = data.cliente;
      data.razonSocial = data.cliente;
      data.clienteManual = true;
    }
    data.productos = [0, 1, 2, 3]
      .map((i) => ({ productoId: data[`productoId${i}`], cantidad: toNumber(data[`cantidad${i}`]) }))
      .filter((item) => item.productoId && item.cantidad > 0);
    [0, 1, 2, 3].forEach((i) => {
      delete data[`productoId${i}`];
      delete data[`cantidad${i}`];
    });
  }
  if (type === "programacion") {
    data.tecnico = data.tecnico || "";
    data.tecnicoAdicional = data.tecnicoAdicional || "";
    if (data.tecnico && data.tecnicoAdicional === data.tecnico) data.tecnicoAdicional = "";
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
