const STORAGE_KEY = "gs_burak_app_v1";
const BACKUP_KEY = "gs_burak_app_backups_v1";
const SERVER_MODE = location.protocol.startsWith("http");

const users = [
  { id: "admin", name: "VICTOR", role: "admin", password: "G5687vbm" },
  { id: "tecnico", name: "TECNICO", role: "operativo", password: "12345" },
];

const modules = [
  { id: "dashboard", label: "Dashboard", icon: "Inicio", roles: ["admin", "operativo"] },
  { id: "clientes", label: "Clientes", icon: "Clientes", roles: ["admin", "operativo"] },
  { id: "programacion", label: "Programacion", icon: "Agenda", roles: ["admin", "operativo"] },
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
let servicioSearch = "";
let servicioPagoFilter = "Todos";
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
    ciudad: "MERIDA",
    contacto: "",
    observaciones: "",
    ...cliente,
    ciudad: cliente.ciudad || "MERIDA",
    contacto: cliente.contacto || "",
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
    tecnico: programacion.tecnico === "SISPROVISA" ? "SANTOS" : programacion.tecnico || "SANTOS",
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

function clientesFiltradosVista() {
  const term = clienteSearch.trim().toLowerCase();
  return state.clientes
    .filter((c) => !clienteTipoFilter || (c.tipo || "Sin tipo") === clienteTipoFilter)
    .filter((c) => !clienteCiudadFilter || (c.ciudad || "MERIDA") === clienteCiudadFilter)
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
      return nombreCliente(s.clienteId).toLowerCase().includes(term);
    })
    .filter((s) => {
      if (servicioPagoFilter === "Por cobrar") return pendienteServicio(s) > 0;
      if (servicioPagoFilter === "Cobrados") return pendienteServicio(s) <= 0;
      return true;
    })
    .sort((a, b) => {
      const dateCompare = String(b.fecha || "").localeCompare(String(a.fecha || ""));
      if (dateCompare !== 0) return dateCompare;
      const clientCompare = nombreCliente(a.clienteId).localeCompare(nombreCliente(b.clienteId));
      if (clientCompare !== 0) return clientCompare;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
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
    ["Cliente", "Contacto", "Telefono", "Correo", "Ciudad", "Tipo", "Direccion principal", "Domicilios", "Observaciones", "Servicios", "Facturado", "Cobrado", "Por cobrar"],
    rows
  );
}

function exportServiciosCsv() {
  const rows = serviciosFiltradosVista().map((s) => [
    s.fecha,
    nombreCliente(s.clienteId),
    s.ciudad || "Yucatan",
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
    ["Fecha", "Cliente", "Ciudad", "Servicio", "Tecnico", "Zona / direccion", "Observaciones", "Total", "Cobrado", "Pendiente", "Costo producto", "% producto", "Estatus", "Forma de pago"],
    rows
  );
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

function nombreCliente(clienteId) {
  return state.clientes.find((c) => c.id === clienteId)?.nombre || "Sin cliente";
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
  const options = ["Todos", "Por cobrar", "Cobrados"];
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
            <option value="admin">VICTOR</option>
            <option value="tecnico">TECNICO</option>
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
  const backupControls = showMoney
    ? `${operationFilterControl()}<button class="secondary" data-action="exportBackup">Exportar respaldo</button><button class="secondary" data-action="importBackup">Importar respaldo</button><input id="backupImportInput" type="file" accept="application/json" hidden />`
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
      <div class="dash-panel wide">
        <div class="panel-head">
          <h2>Servicios recientes</h2>
          <span>Ultimos registros</span>
        </div>
        ${renderMiniServices()}
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
      ${renderClientesTipoResumen()}
      ${renderServiciosTecnicoResumen()}
      ${showMoney ? renderVentasCiudadResumen() : ""}
      ${showMoney ? renderGastosPagadorResumen() : ""}
      ${showMoney ? renderComprasPagadorResumen() : ""}
      ${showMoney ? renderEquiposPagadorResumen() : ""}
      ${showMoney ? renderTotalPagadorResumen() : ""}
      ${showMoney ? renderGastosPagadorMensualResumen() : ""}
      ${showMoney ? renderPendientesResumen() : ""}
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
            <strong>${nombreCliente(s.clienteId)}</strong>
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
  const tipos = [...new Set(state.clientes.map((c) => c.tipo || "Sin tipo"))].sort();
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
      <div class="filter-count">
        ${number(clientes.length)} de ${number(state.clientes.length)} clientes
      </div>
    </section>
    <div class="table-card service-list">
      <table>
        <thead><tr><th>Cliente</th><th>Contacto</th><th>Telefono</th><th>Correo</th><th>Ciudad</th><th>Tipo</th><th>Servicios</th><th>Facturado</th><th>Por cobrar</th><th></th></tr></thead>
        <tbody>
          ${clientes.length ? clientes.map((c) => {
            const servicios = state.servicios.filter((s) => s.clienteId === c.id);
            const facturado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
            const cobrado = servicios.reduce((sum, s) => sum + Number(s.cobrado || 0), 0);
            return `<tr><td data-label="Cliente"><strong>${c.nombre}</strong>${resumenDomiciliosCliente(c)}${c.observaciones ? `<br><span class="readonly">${c.observaciones}</span>` : ""}</td><td data-label="Contacto">${c.contacto || ""}</td><td data-label="Telefono">${c.telefono || ""}</td><td data-label="Correo">${c.correo || ""}</td><td data-label="Ciudad">${c.ciudad || "MERIDA"}</td><td data-label="Tipo">${c.tipo || ""}</td><td data-label="Servicios">${servicios.length}</td><td data-label="Facturado">${money(facturado)}</td><td data-label="Por cobrar">${money(Math.max(0, facturado - cobrado))}</td><td data-label="Acciones">${rowActions("cliente", c.id)}</td></tr>`;
          }).join("") : `<tr><td colspan="10">No hay clientes que coincidan con la busqueda.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderProgramacion() {
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
    ${topbar("Programacion", "Agenda interna de servicios por fecha, tecnico y operacion.", `${operationFilterControl()}${programacionStatusFilterControl()}<button class="primary" data-open="programacion">Nuevo programado</button>`)}
    ${renderProgramacionAgenda(rows)}
    <section class="panel">
      <h2>Servicios programados - ${programacionStatusFilter}</h2>
      <div class="table-card service-list">
        <table>
          <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Ciudad</th><th>Servicio</th><th>Tecnico</th><th>Estatus</th><th>Calendar</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((p) => `<tr><td data-label="Fecha">${p.fecha || ""}</td><td data-label="Hora">${p.hora || ""}</td><td data-label="Cliente"><strong>${nombreCliente(p.clienteId)}</strong><br><span class="readonly">${p.direccion || ""}</span></td><td data-label="Ciudad">${p.ciudad || "Yucatan"}</td><td data-label="Servicio">${p.tipo || ""}<br><span class="readonly">${p.notas || ""}</span></td><td data-label="Tecnico">${p.tecnico || ""}</td><td data-label="Estatus">${programacionPill(p.estatus)}</td><td data-label="Calendar">${calendarPill(p)}</td><td data-label="Acciones"><div class="actions"><button class="secondary" data-edit="programacion" data-id="${p.id}">Editar</button><button class="primary" data-convert-programacion="${p.id}">Pasar a ventas</button><button class="ghost" data-delete="programacion" data-id="${p.id}">Borrar</button></div></td></tr>`).join("") : `<tr><td colspan="9">Aun no hay servicios programados para este filtro.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProgramacionAgenda(rows) {
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
                      <small>${programacion.tecnico || ""} · ${programacion.ciudad || "Yucatan"} · ${programacion.estatus || "Programado"}</small>
                      <div class="agenda-actions">
                        <button class="secondary" data-edit="programacion" data-id="${programacion.id}">Editar</button>
                        <button class="primary" data-convert-programacion="${programacion.id}">Pasar a ventas</button>
                      </div>
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
          ${state.servicios.map((s) => `<tr><td data-label="Fecha">${s.fecha}</td><td data-label="Cliente">${nombreCliente(s.clienteId)}</td><td data-label="Ciudad">${s.ciudad || "Yucatan"}</td><td data-label="Servicio">${s.tipo}<br><span class="readonly">${s.tecnico || ""} · ${s.zona || ""}</span></td><td data-label="Total">${money(totalServicio(s))}</td><td data-label="Cobrado">${money(s.cobrado)}</td><td data-label="Pendiente">${money(pendienteServicio(s))}</td><td data-label="Costo prod.">${currentUser.role === "admin" ? money(costoServicio(s)) : "Restringido"}</td><td data-label="% producto">${currentUser.role === "admin" ? `${(porcentajeCostoProducto(s) * 100).toFixed(1)}%` : "Restringido"}</td><td data-label="Estatus">${paymentPill(s)}</td><td data-label="Acciones">${rowActions("servicio", s.id)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderServicios() {
  const term = servicioSearch.trim().toLowerCase();
  const servicios = serviciosFiltradosVista();
  const totalFiltrado = servicios.reduce((sum, s) => sum + totalServicio(s), 0);
  const rows = servicios.map((s) => {
    const costo = currentUser.role === "admin" ? money(costoServicio(s)) : "Restringido";
    const porcentaje = currentUser.role === "admin" ? `${(porcentajeCostoProducto(s) * 100).toFixed(1)}%` : "Restringido";
    return `<tr><td data-label="Fecha">${s.fecha}</td><td data-label="Cliente">${nombreCliente(s.clienteId)}</td><td data-label="Ciudad">${s.ciudad || "Yucatan"}</td><td data-label="Servicio">${s.tipo}<br><span class="readonly">${s.tecnico || ""} - ${s.zona || ""}</span></td><td data-label="Total">${money(totalServicio(s))}</td><td data-label="Cobrado">${money(s.cobrado)}</td><td data-label="Pendiente">${money(pendienteServicio(s))}</td><td data-label="Costo prod.">${costo}</td><td data-label="% producto">${porcentaje}</td><td data-label="Estatus">${paymentPill(s)}</td><td data-label="Acciones">${rowActions("servicio", s.id)}</td></tr>`;
  }).join("");
  return `
    ${topbar("Servicios / Ventas", "Captura de servicios, cobros, formas de pago y productos usados.", `${operationFilterControl()}${servicioPagoFilterControl()}<button class="secondary" data-action="exportServicios">Exportar ventas</button><button class="primary" data-open="servicio">Nuevo servicio</button>`)}
    <section class="panel filters">
      <div class="field">
        <label>Buscar servicios por cliente</label>
        <input id="servicioSearch" type="search" placeholder="Escribe el nombre del cliente" value="${servicioSearch}" />
      </div>
      <div class="filter-count">
        ${number(servicios.length)} de ${number(serviciosFiltradosOperacion().length)} servicios en ${operacionFilter}
        ${servicioPagoFilter !== "Todos" ? `<br>${servicioPagoFilter}` : ""}
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
  const term = compraSearch.trim().toLowerCase();
  const comprasRows = comprasFiltradasOperacion()
    .filter((compra) => !term || nombreProducto(compra.productoId).toLowerCase().includes(term))
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
    .sort((a, b) => String(a.producto.producto || "").localeCompare(String(b.producto.producto || "")));
  const comprasMensuales = comprasPorMes();
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
  const gastosMensuales = gastosPorMes();
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
      <section class="filters" style="margin-bottom:0">
        <div class="field">
          <label>Categoria</label>
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
  return `<div class="actions"><button class="secondary" data-edit="${type}" data-id="${id}">Editar</button><button class="ghost" data-delete="${type}" data-id="${id}">Borrar</button></div>`;
}

function renderModal() {
  const { type, id } = modal;
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
    return `<div class="form-grid">${input("nombre", "Cliente", data.nombre, "text", "wide")}${select("ciudad", "Ciudad principal", data.ciudad || "MERIDA", ["MERIDA", "CDMX"].map((x) => ({ value: x, label: x })))}${input("contacto", "Contacto", data.contacto)}${input("telefono", "Telefono", data.telefono)}${input("correo", "Correo", data.correo)}${select("tipo", "Tipo", data.tipo, ["Residencial", "Comercial", "Industrial", "Gobierno", "Otro"].map((x) => ({ value: x, label: x })))}${text("observaciones", "Observaciones", data.observaciones, "full")}${formDomiciliosCliente(data)}</div>`;
  }
  if (type === "producto") {
    return `<div class="form-grid">${input("producto", "Producto", data.producto, "text", "wide")}${select("unidadCompra", "Unidad de compra", data.unidadCompra, ["litro", "kilo", "envase", "pieza", "galon", "caja"].map((x) => ({ value: x, label: x })))}${select("unidadUso", "Unidad de uso", data.unidadUso, ["ml", "gr", "pieza"].map((x) => ({ value: x, label: x })))}${input("factor", "Equivalencia por unidad comprada", data.factor || 1000, "number")}${input("costo", "Costo por unidad de compra", data.costo, "number", "wide")}</div>`;
  }
  if (type === "tipoServicio") {
    return `<div class="form-grid">${input("nombre", "Tipo de servicio", data.nombre, "text", "wide")}</div>`;
  }
  if (type === "programacion") {
    const clienteOptions = [...state.clientes]
      .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")))
      .map((c) => ({ value: c.id, label: c.nombre }));
    const tipoOptions = state.tiposServicio.map((x) => ({ value: x.nombre, label: x.nombre }));
    return `<div class="form-grid">${input("fecha", "Fecha", data.fecha || today(), "date")}${input("hora", "Hora", data.hora || "09:00", "time")}${select("clienteId", "Cliente", data.clienteId, clienteOptions, "wide")}${select("ciudad", "Ciudad", data.ciudad || "Yucatan", ["Yucatan", "CDMX"].map((x) => ({ value: x, label: x })))}${select("tipo", "Tipo de servicio", data.tipo, tipoOptions)}${select("tecnico", "Tecnico", data.tecnico || "SANTOS", ["SANTOS", "VICTOR", "FREDDY"].map((x) => ({ value: x, label: x })))}${select("estatus", "Estatus", data.estatus || "Programado", ["Programado", "Confirmado", "Reprogramar", "Realizado", "Cancelado"].map((x) => ({ value: x, label: x })))}${input("direccion", "Direccion / referencia", data.direccion, "text", "wide")}${text("notas", "Notas para el tecnico", data.notas, "full")}</div>`;
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
    button.addEventListener("click", () => {
      if (!confirm("Quieres borrar este registro?")) return;
      const collection = typeToCollection(button.dataset.delete);
      const deletedEntity = state[collection].find((x) => x.id === button.dataset.id);
      state[collection] = state[collection].filter((x) => x.id !== button.dataset.id);
      saveLocalBackup();
      queueRemoteTask(async () => {
        if (collection === "programaciones" && deletedEntity?.calendarEventId) {
          await deleteRemoteCalendarEvent(deletedEntity);
        }
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
  document.querySelectorAll("[data-action='importBackup']").forEach((button) => {
    button.addEventListener("click", triggerBackupImport);
  });
  document.querySelectorAll("[data-action='exportClientes']").forEach((button) => {
    button.addEventListener("click", exportClientesCsv);
  });
  document.querySelectorAll("[data-action='exportServicios']").forEach((button) => {
    button.addEventListener("click", exportServiciosCsv);
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
