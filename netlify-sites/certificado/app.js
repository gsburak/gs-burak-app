const pests = [
  "Cucarachas",
  "Hormigas",
  "Termitas",
  "Aranas",
  "Chinches",
  "Garrapatas",
  "Moscas",
  "Mosquitos",
  "Roedores",
  "Alacranes",
  "Otros"
];

const areas = [
  "Sala",
  "Comedor",
  "Habitaciones",
  "Cocina",
  "Banos",
  "Drenajes",
  "Areas comunes",
  "Exteriores",
  "Oficinas",
  "Area comercial",
  "Area ventas",
  "Gimnasio",
  "Pasillos",
  "Bodegas",
  "Cuartos de basura",
  "Talleres",
  "Todo el inmueble"
];

const serviceTypes = [
  "Inspeccion",
  "Desinfeccion",
  "Control de plagas",
  "Control de roedores",
  "Servicio preventivo",
  "Presupuesto",
  "Perforacion e Inyeccion"
];

const methods = [
  "Trampa de goma",
  "Aplicacion en gel",
  "Aspersion residual",
  "Nebulizacion ULV",
  "Termonebulizacion",
  "Desratizacion",
  "Instalacion de cebaderas",
  "Cambio de cebos",
  "Perforacion e inyeccion"
];

const form = document.querySelector("#serviceForm");
const pestGrid = document.querySelector("#pestGrid");
const areaGrid = document.querySelector("#areaGrid");
const serviceTypeGrid = document.querySelector("#serviceTypeGrid");
const methodGrid = document.querySelector("#methodGrid");
const products = document.querySelector("#products");
const preview = document.querySelector("#certificatePreview");
const RESPONSABLE_SANITARIO_DEFAULT = "ANTUAN KARAM CHAIN";
const FIRMA_RESPONSABLE_DEFAULT = "assets/firma-antuan-karam.png";
const SUPABASE_URL = "https://xuswzuxtccpwlyizbrcj.supabase.co";
const SUPABASE_KEY = "sb_publishable_dBXdapkvlNFK2byoRHCLgw_mBAAF87-";
let clientesCatalogo = [];
let productosCatalogo = [];
let programacionesCatalogo = [];
let reporteEnProceso = false;
let ultimoPdf = null;
let ultimoPdfNombre = "";

const pestIcons = {
  Cucarachas: "M10 5c3 0 5 3 5 7s-2 7-5 7-5-3-5-7 2-7 5-7Zm0 0V2m0 17v3M5 8 2 6m13 2 3-2M5 16l-3 2m13-2 3 2M4 12H1m18 0h-3",
  Hormigas: "M6 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5 4a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 6 2 4m4 8-2 3m8-12V1m3 5 3-2m-2 9 3 3",
  Termitas: "M12 3c4 2 6 5 6 9s-2 7-6 9c-4-2-6-5-6-9s2-7 6-9Zm0 0v18M7 9h10M7 15h10",
  Aranas: "M12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 0V5m-4 5L4 7m12 3 4-3M8 16l-4 3m12-3 4 3M8 12H3m18 0h-5",
  Chinches: "M12 5c3 0 5 3 5 7s-2 7-5 7-5-3-5-7 2-7 5-7Zm0 0V2M8 9h8M8 13h8M8 17h8M6 10 3 8m15 2 3-2M6 15l-3 2m15-2 3 2",
  Garrapatas: "M12 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 0V3M8 8 5 5m11 3 3-3M7 13H3m18 0h-4M9 16l-3 3m9-3 3 3",
  Moscas: "M9 12c-3-1-5-3-4-6 3 0 5 1 6 4m4 2c3-1 5-3 4-6-3 0-5 1-6 4M12 9c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5Zm0 0V5m-2 14-2 2m6-2 2 2",
  Mosquitos: "M12 5v12m0-8 6-4M12 9 6 5m6 7 6 3m-6-3-6 3m6-7 4 4m-4-4-4 4M12 5l2-3m-2 3-2-3",
  Roedores: "M7 14c0-4 3-7 7-7 3 0 5 2 5 5 0 4-4 7-9 7-3 0-5-2-5-4 0-1 1-1 2-1Zm9-7 2-3m-9 5L5 6m2 8H3m16-2h2m-9 3h.01",
  Alacranes: "M6 13c0-3 2-5 5-5h5c2 0 3 1 3 3s-1 3-3 3h-3m-7-1-3-3m3 3-3 3m9-8V5c0-2 2-3 4-2 2 1 2 4 0 5m-3 7 2 4m-6-4-2 4",
  Otros: "M12 18h.01M9 9a3 3 0 1 1 5 2c-1 1-2 2-2 4"
};

function pestIcon(name) {
  return `<svg class="pest-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${pestIcons[name] || pestIcons.Otros}"/></svg>`;
}

function slug(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function idServicioReporte(data) {
  const referencia = data.programacionId || data.folio || `${data.fecha}_${data.hora}_${data.clienteId || data.cliente}`;
  return `reporte_${slug(String(referencia))}`;
}

function toNumber(value) {
  return Number(String(value || "0").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
}

function productoUsado(producto) {
  const dosis = toNumber(producto.dosis);
  const cantidadPreparada = toNumber(producto.cantidad);
  if (dosis > 0 && cantidadPreparada > 0) {
    return dosis * cantidadPreparada;
  }
  return cantidadPreparada;
}

function nombreNormalizado(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function productoIdResuelto(producto) {
  if (producto.productoId) return producto.productoId;
  const nombre = nombreNormalizado(producto.formula);
  if (!nombre) return "";
  const encontrado = productosCatalogo.find((item) => nombreNormalizado(item.producto) === nombre);
  return encontrado?.id || "";
}

function productoNombreResuelto(producto) {
  const productoId = productoIdResuelto(producto);
  const encontrado = productosCatalogo.find((item) => String(item.id) === String(productoId));
  return encontrado?.producto || producto.formula || "";
}

function buildChecks() {
  pestGrid.innerHTML = pests.map((pest) => {
    const key = slug(pest);
    return `
      <div class="check-item">
        <input type="checkbox" name="plaga_${key}" id="plaga_${key}">
        <label class="pest-label" for="plaga_${key}">${pestIcon(pest)}<span>${pest}</span></label>
        <div class="level-row">
          <label><input type="radio" name="nivel_${key}" value="Bajo"> Bajo</label>
          <label><input type="radio" name="nivel_${key}" value="Medio"> Medio</label>
          <label><input type="radio" name="nivel_${key}" value="Alto"> Alto</label>
        </div>
      </div>`;
  }).join("");

  areaGrid.innerHTML = areas.map((area) => {
    const key = slug(area);
    return `
      <label class="check-item" for="area_${key}">
        <input type="checkbox" name="area_${key}" id="area_${key}">
        <span>${area}</span>
      </label>`;
  }).join("");

  serviceTypeGrid.innerHTML = serviceTypes.map((type) => {
    const key = slug(type);
    return `
      <label class="check-item" for="tipo_${key}">
        <input type="checkbox" name="tipo_${key}" id="tipo_${key}">
        <span>${type}</span>
      </label>`;
  }).join("");

  methodGrid.innerHTML = methods.map((method) => {
    const key = slug(method);
    return `
      <label class="check-item" for="metodo_${key}">
        <input type="checkbox" name="metodo_${key}" id="metodo_${key}">
        <span>${method}</span>
      </label>`;
  }).join("");
}

async function fetchCatalog(table) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=data`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json"
    }
  });
  if (!response.ok) throw new Error(`No se pudo cargar ${table}`);
  const rows = await response.json();
  return rows.map((row) => row.data).filter(Boolean);
}

async function saveSupabaseRecord(table, record) {
  const payload = [{
    id: String(record.id),
    data: record,
    updated_at: new Date().toISOString()
  }];
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se pudo guardar en Supabase");
  }
  return response.json();
}

function fillCliente(cliente) {
  if (!cliente) return;
  document.querySelector("#clienteNombre").value = cliente.nombre || "";
  document.querySelector("#clienteContacto").value = cliente.contacto || "";
  document.querySelector("#clienteDomicilio").value = cliente.direccion || "";
  document.querySelector("#clienteTelefono").value = cliente.telefono || "";
  document.querySelector("#clienteEmail").value = cliente.correo || "";
  const giro = document.querySelector("#clienteGiro");
  const tipo = cliente.tipo || "";
  if (tipo && !Array.from(giro.options).some((option) => option.value === tipo)) {
    giro.add(new Option(tipo, tipo));
  }
  giro.value = tipo;
}

function setSelectValue(select, value) {
  if (!select) return;
  const text = value || "";
  if (text && !Array.from(select.options).some((option) => option.value === text)) {
    select.add(new Option(text, text));
  }
  select.value = text;
}

function setCheckedValues(container, prefix, values) {
  if (!container) return;
  const selected = String(values || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    const label = checkbox.closest("label")?.querySelector("span")?.textContent || "";
    checkbox.checked = selected.includes(label.trim().toLowerCase());
  });
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function programacionLabel(programacion) {
  const cliente = clientesCatalogo.find((item) => String(item.id) === String(programacion.clienteId));
  const clienteNombre = cliente?.nombre || programacion.cliente || "Cliente sin nombre";
  return `${programacion.fecha || ""} ${programacion.hora || ""} - ${clienteNombre} - ${programacion.ciudad || "Yucatan"}`;
}

function fillProgramacion(programacion) {
  if (!programacion) return;
  const clienteSelect = document.querySelector("#clienteSelect");
  if (clienteSelect) {
    const cliente = clientesCatalogo.find((item) => String(item.id) === String(programacion.clienteId));
    clienteSelect.value = programacion.clienteId || "";
    document.querySelector("#clienteSearchInput").value = cliente?.nombre || "";
    fillCliente(cliente);
  }
  if (programacion.fecha) form.elements.fecha.value = programacion.fecha;  setSelectValue(form.elements.ciudad, programacion.ciudad || "Yucatan");
  setSelectValue(form.elements.tecnico, programacion.tecnico || "");
  if (programacion.direccion) document.querySelector("#clienteDomicilio").value = programacion.direccion;
  setCheckedValues(serviceTypeGrid, "tipo", programacion.tipo);
  form.elements.observaciones.value = "";
}

async function setupProgramacionesCatalog() {
  const select = document.querySelector("#programacionSelect");
  if (!select) return;
  try {
    programacionesCatalogo = await fetchCatalog("app_programaciones");
    const validDates = new Set([dateOffset(-1), dateOffset(0), dateOffset(1)]);
    programacionesCatalogo = programacionesCatalogo
      .filter((programacion) => validDates.has(programacion.fecha || ""))
      .filter((programacion) => !["Realizado", "Cancelado"].includes(programacion.estatus || "Programado"))
      .sort((a, b) => String(`${a.fecha || ""} ${a.hora || ""}`).localeCompare(String(`${b.fecha || ""} ${b.hora || ""}`)));
    select.innerHTML = [
      `<option value="">Capturar manualmente</option>`,
      ...programacionesCatalogo.map((programacion) => `<option value="${cell(programacion.id)}">${cell(programacionLabel(programacion))}</option>`)
    ].join("");
  } catch (error) {
    select.innerHTML = `<option value="">Capturar manualmente</option>`;
    console.warn(error);
  }
  select.addEventListener("change", () => {
    const programacion = programacionesCatalogo.find((item) => String(item.id) === String(select.value));
    fillProgramacion(programacion);
  });
}

async function setupClientesCatalog() {
  const hidden = document.querySelector("#clienteSelect");
  const search = document.querySelector("#clienteSearchInput");
  const options = document.querySelector("#clienteOptions");
  if (!hidden || !search || !options) return;

  function selectedClient() {
    const value = search.value.trim().toLowerCase();
    return clientesCatalogo.find((item) => String(item.nombre || "").trim().toLowerCase() === value);
  }

  function syncClient() {
    const cliente = selectedClient();
    hidden.value = cliente?.id || "";
    if (cliente) fillCliente(cliente);
  }

  try {
    clientesCatalogo = await fetchCatalog("app_clientes");
    clientesCatalogo.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
    options.innerHTML = clientesCatalogo
      .map((cliente) => `<option value="${cell(cliente.nombre)}"></option>`)
      .join("");
  } catch (error) {
    options.innerHTML = "";
    console.warn(error);
  }
  search.addEventListener("input", () => {
    hidden.value = "";
    syncClient();
  });
  search.addEventListener("change", syncClient);
  search.addEventListener("blur", syncClient);
}

function productOptionsHtml(selected = "") {
  return [
    `<option value="">Capturar manualmente</option>`,
    ...productosCatalogo.map((producto) => `<option value="${cell(producto.id)}" ${String(producto.id) === String(selected) ? "selected" : ""}>${cell(producto.producto)}</option>`)
  ].join("");
}

function refreshProductSelects() {
  document.querySelectorAll(".product-select").forEach((select) => {
    const current = select.value;
    select.innerHTML = productOptionsHtml(current);
  });
}

async function setupProductosCatalog() {
  try {
    productosCatalogo = await fetchCatalog("app_productos");
    productosCatalogo.sort((a, b) => String(a.producto || "").localeCompare(String(b.producto || "")));
    refreshProductSelects();
  } catch (error) {
    productosCatalogo = [];
    console.warn(error);
  }
}

function productRow(index) {
  const row = document.createElement("div");
  row.className = "product-row";
  row.dataset.productIndex = String(index);
  row.innerHTML = `
    <label class="product-dose">Dosis
      <input name="producto_${index}_dosis" type="text">
    </label>
    <label class="product-registered">Producto registrado
      <select class="product-select" name="producto_${index}_id">
        ${productOptionsHtml()}
      </select>
    </label>
    <label class="product-formula">Producto / Formula
      <input name="producto_${index}_formula" type="text">
    </label>
    <label class="product-expiration">Caducidad
      <input name="producto_${index}_caducidad" type="date">
    </label>
    <label class="product-lot">Lote
      <input name="producto_${index}_lote" type="text">
    </label>
    <label class="product-quantity">Cantidad preparada o aplicada
      <input name="producto_${index}_cantidad_preparada" type="text">
    </label>
    <label class="product-notes">Observaciones
      <input name="producto_${index}_observacion" type="text">
    </label>
    <button type="button" class="ghost-button small remove-product">Limpiar</button>
  `;
  row.querySelector(".remove-product").addEventListener("click", () => {
    row.querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
    row.querySelectorAll("select").forEach((select) => {
      select.value = "";
    });
  });
  row.querySelector(".product-select").addEventListener("change", (event) => {
    const producto = productosCatalogo.find((item) => String(item.id) === String(event.target.value));
    if (!producto) return;
    row.querySelector(`[name="producto_${index}_formula"]`).value = producto.producto || "";
  });
  return row;
}

function addProduct() {
  if (products.children.length >= 4) {
    alert("El formato permite hasta 4 productos aplicados.");
    return;
  }
  products.appendChild(productRow(products.children.length + 1));
}

function setupNextService() {
  const type = document.querySelector("#proximoServicioTipo");
  const wrap = document.querySelector("#proximoServicioFechaWrap");
  const date = document.querySelector("#proximoServicioFecha");

  function sync() {
    const needsDate = type.value === "Fecha programada";
    wrap.classList.toggle("hidden-field", !needsDate);
    date.disabled = !needsDate;
    date.required = needsDate;
    if (!needsDate) date.value = "";
  }

  type.addEventListener("change", sync);
  sync();
}

function setupFolio() {
  const folio = document.querySelector("#folio");
  if (folio.value) return;
  const year = new Date().getFullYear();
  const key = `certificado_folio_${year}`;
  const next = Number(localStorage.getItem(key) || "0");
  folio.value = `GS-${String(next).padStart(5, "0")}-${year}`;
}

function setupResponsableSanitario() {
  const responsable = form.elements.responsableSanitario;
  if (responsable && !responsable.value) {
    responsable.value = RESPONSABLE_SANITARIO_DEFAULT;
  }
}

function commitFolio() {
  const year = new Date().getFullYear();
  const key = `certificado_folio_${year}`;
  const current = Number(localStorage.getItem(key) || "0");
  localStorage.setItem(key, String(current + 1));
}

function setupSignature(canvas) {
  const ctx = canvas.getContext("2d");
  let drawing = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const image = canvas.toDataURL();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    if (image.length > 100) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = image;
    }
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  canvas.addEventListener("pointerup", () => {
    drawing = false;
  });

  resize();
  window.addEventListener("resize", resize);
  return {
    clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
    data: () => canvas.toDataURL("image/png")
  };
}

function dataFromForm() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.plagas = pests
    .filter((pest) => form.elements[`plaga_${slug(pest)}`]?.checked)
    .map((pest) => ({
      nombre: pest === "Otros" && fd.get("plaga_otros_detalle")
        ? `Otros: ${fd.get("plaga_otros_detalle")}`
        : pest,
      nivel: fd.get(`nivel_${slug(pest)}`) || ""
    }));
  data.areas = areas.filter((area) => form.elements[`area_${slug(area)}`]?.checked);
  if (data.otrasAreas) data.areas.push(data.otrasAreas);

  if (data.proximoServicioTipo !== "Fecha programada") {
    data.proximoServicio = data.proximoServicioTipo || "No aplica";
  }

  data.tiposServicio = serviceTypes.filter((type) => form.elements[`tipo_${slug(type)}`]?.checked);
  data.tipoServicio = data.tiposServicio.join(", ");
  data.metodos = methods.filter((method) => form.elements[`metodo_${slug(method)}`]?.checked);
  if (data.metodoOtros) data.metodos.push(`Otros: ${data.metodoOtros}`);
  data.metodo = data.metodos.join(", ");

  data.productos = Array.from(products.querySelectorAll(".product-row")).map((row) => {
    const n = row.dataset.productIndex;
    return {
      dosis: row.querySelector(`[name="producto_${n}_dosis"]`)?.value || "",
      productoId: row.querySelector(`[name="producto_${n}_id"]`)?.value || "",
      formula: row.querySelector(`[name="producto_${n}_formula"]`)?.value || "",
      caducidad: row.querySelector(`[name="producto_${n}_caducidad"]`)?.value || "",
      lote: row.querySelector(`[name="producto_${n}_lote"]`)?.value || "",
      cantidad: row.querySelector(`[name="producto_${n}_cantidad_preparada"]`)?.value || "",
      observacion: row.querySelector(`[name="producto_${n}_observacion"]`)?.value || ""
    };
  }).filter((p) => Object.values(p).some(Boolean));

  return data;
}

function buildServicioPendiente(data) {
  const clienteManualNombre = data.cliente || data.clienteNombre || data.nombreCliente || data.razonSocial || "Cliente manual";
  return {
    id: idServicioReporte(data),
    programacionId: data.programacionId || "",
    fecha: data.fecha || new Date().toISOString().slice(0, 10),
    clienteId: data.clienteId || "",
    cliente: clienteManualNombre,
    clienteNombre: clienteManualNombre,
    nombreCliente: clienteManualNombre,
    razonSocial: clienteManualNombre,
    clienteManual: !data.clienteId,
    contacto: data.contacto || "",
    telefono: data.telefono || "",
    email: data.email || "",
    domicilio: data.domicilio || "",
    ciudad: data.ciudad || "Yucatan",
    tipo: data.tipoServicio || "Reporte de servicio",
    tecnico: data.tecnico || data.nombreTecnicoFirma || "",
    zona: data.domicilio || "",
    subtotal: 0,
    cobrado: 0,
    formaPago: "Por cobrar",
    observaciones: [
      `Reporte generado en campo. Folio: ${data.folio || "sin folio"}.`,
      data.observaciones || ""
    ].filter(Boolean).join("\n"),
    productos: data.productos
      .map((producto) => ({
        productoId: productoIdResuelto(producto),
        producto: productoNombreResuelto(producto),
        formula: producto.formula || productoNombreResuelto(producto),
        dosis: producto.dosis || "",
        cantidadPreparada: producto.cantidad || "",
        cantidad: productoUsado(producto)
      }))
      .filter((producto) => producto.productoId && producto.cantidad > 0),
    reporte: {
      folio: data.folio || "",
      tiempoReentrada: data.tiempoReentrada || "",
      metodos: data.metodos || [],
      plagas: data.plagas || [],
      areas: data.areas || [],
      responsableSanitario: data.responsableSanitario || RESPONSABLE_SANITARIO_DEFAULT,
      clienteFirma: data.nombreClienteFirma || data.cliente || ""
    }
  };
}

async function saveReporteComoServicio(data) {
  const servicio = buildServicioPendiente(data);
  await saveSupabaseRecord("app_servicios", servicio);
  if (data.programacionId) {
    const programacion = programacionesCatalogo.find((item) => String(item.id) === String(data.programacionId));
    if (programacion) {
      await saveSupabaseRecord("app_programaciones", {
        ...programacion,
        estatus: "Realizado",
        servicioId: servicio.id
      });
    }
  }
  return {
    guardado: true,
    mensaje: data.clienteId
      ? "Servicio guardado una sola vez en Servicios / Ventas."
      : "Servicio guardado en Servicios / Ventas como cliente manual."
  };
}

function nombreArchivoPdf(data) {
  const folio = String(data.folio || "reporte-de-servicio").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `Reporte-${folio}.pdf`;
}

function crearPdfEditable(data) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    const tituloAnterior = document.title;
    document.title = nombreArchivoPdf(data).replace(/\.pdf$/i, "");
    window.print();
    setTimeout(() => {
      document.title = tituloAnterior;
    }, 1000);
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const page = { w: 612, h: 792, m: 28 };
  const navy = [18, 51, 95];
  const red = [178, 31, 50];
  const line = [143, 167, 194];
  const pale = [242, 246, 250];
  let y = 30;

  const clean = (value, fallback = "") => String(value || fallback).trim();
  const split = (text, width, size = 8) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(clean(text), width);
  };
  const text = (value, x, yy, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 8);
    doc.setTextColor(...(opts.color || [0, 0, 0]));
    doc.text(clean(value), x, yy, opts.align ? { align: opts.align } : undefined);
  };
  const rect = (x, yy, w, h, color) => {
    if (color) {
      doc.setFillColor(...color);
      doc.rect(x, yy, w, h, "F");
    }
    doc.setDrawColor(...line);
    doc.setLineWidth(0.7);
    doc.rect(x, yy, w, h);
  };
  const section = (title) => {
    doc.setFillColor(...navy);
    doc.rect(page.m, y, page.w - page.m * 2, 15, "F");
    doc.setFillColor(...red);
    doc.rect(page.m, y, 4, 15, "F");
    text(title, page.m + 10, y + 10.5, { bold: true, size: 7.6, color: [255, 255, 255] });
    y += 18;
  };
  const fitCellText = (value, x, yy, w, h, size = 7.4, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    const rows = doc.splitTextToSize(clean(value, " "), w - 6).slice(0, Math.max(1, Math.floor((h - 4) / (size + 1))));
    doc.text(rows, x + 3, yy + 9);
  };
  const labeledBox = (label, value, x, yy, w, h) => {
    rect(x, yy, w, h, pale);
    text(label.toUpperCase(), x + 5, yy + 9, { bold: true, size: 5.8, color: navy });
    fitCellText(value, x + 2, yy + 11, w - 4, h - 11, 7.2, true);
  };
  const tableRow = (cells, widths, rowH = 18, header = false) => {
    let x = page.m;
    cells.forEach((cellValue, index) => {
      rect(x, y, widths[index], rowH, header ? pale : null);
      fitCellText(cellValue, x, y, widths[index], rowH, header ? 5.8 : 7.1, header);
      x += widths[index];
    });
    y += rowH;
  };
  const ensurePage = (needed = 70) => {
    if (y + needed < page.h - page.m) return;
    doc.addPage();
    applyFormalMark();
    y = page.m;
  };
  const withOpacity = (opacity, draw) => {
    if (!doc.GState) {
      draw();
      return;
    }
    try {
      doc.setGState(new doc.GState({ opacity }));
      draw();
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch (_) {
      draw();
    }
  };
  const applyFormalMark = () => {
    const logo = preview.querySelector(".brand-block img")?.src || "";
    withOpacity(0.07, () => {
      if (logo) {
        try { doc.addImage(logo, "JPEG", 156, 300, 300, 135); } catch (_) {}
      }
    });
    withOpacity(0.08, () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(38);
      doc.setTextColor(...navy);
      doc.text("GS BURAK CONTROL DE PLAGAS", 306, 430, {
        align: "center",
        angle: -35
      });
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(125, 135, 148);
    doc.text("Documento generado por GS Burak - Sistema de Control", 306, 772, { align: "center" });
  };

  applyFormalMark();
  doc.setDrawColor(...navy);
  doc.setLineWidth(1.5);
  doc.rect(22, 22, 568, 748);

  const logo = preview.querySelector(".brand-block img")?.src || "";
  if (logo) {
    try { doc.addImage(logo, "JPEG", 45, 42, 125, 58); } catch (_) {}
  }
  text("CERTIFICADO / REPORTE DE SERVICIO", 568, 64, { bold: true, size: 20, color: navy, align: "right" });
  text("Fumigacion - Control de plagas - Desinfeccion", 568, 80, { bold: true, size: 8, color: red, align: "right" });
  rect(478, 88, 90, 20);
  text(`Folio: ${clean(data.folio)}`, 523, 101, { bold: true, size: 9, color: navy, align: "center" });
  doc.setDrawColor(...red);
  doc.setLineWidth(2.5);
  doc.line(45, 116, 568, 116);
  y = 124;

  const boxW = (page.w - page.m * 2 - 18) / 4;
  labeledBox("Fecha", data.fecha, page.m, y, boxW, 27);
  labeledBox("Hora", data.hora, page.m + boxW + 6, y, boxW, 27);
  labeledBox("Tecnico", data.tecnico, page.m + (boxW + 6) * 2, y, boxW, 27);
  labeledBox("Tiempo de reentrada", data.tiempoReentrada, page.m + (boxW + 6) * 3, y, boxW, 27);
  y += 36;

  section("DATOS DEL CLIENTE");
  tableRow(["Cliente / Razon social", data.cliente, "Contacto", data.contacto], [95, 245, 75, 141], 22);
  tableRow(["Domicilio del servicio", data.domicilio], [95, 461], 26);
  tableRow(["Telefono", data.telefono, "Email", data.email], [95, 125, 75, 261], 20);
  tableRow(["Giro / Sector", data.giro, "Proximo servicio", data.proximoServicio, "Forma de pago", data.formaPago], [95, 110, 100, 120, 88, 43], 20);

  y += 7;
  section("SERVICIO REALIZADO");
  const tipoLines = split(data.tipoServicio, 455, 7.1);
  const metodoLines = split(data.metodo, 455, 7.1);
  const tipoRowH = Math.max(24, Math.min(50, tipoLines.length * 8 + 10));
  const metodoRowH = Math.max(24, Math.min(66, metodoLines.length * 8 + 10));
  tableRow(["Tipo de servicio", data.tipoServicio], [95, 461], tipoRowH);
  tableRow(["Metodo aplicado", data.metodo], [95, 461], metodoRowH);

  y += 7;
  section("PLAGAS DETECTADAS Y AREAS TRATADAS");
  const plagas = data.plagas.length ? data.plagas.map((p) => `${p.nombre}${p.nivel ? ` (${p.nivel})` : ""}`).join(", ") : "Sin registrar";
  const plagasLines = split(plagas, 455, 7.1);
  const plagasRowH = Math.max(24, Math.min(58, plagasLines.length * 8 + 10));
  const areasTratadas = joinList(data.areas);
  const areasLines = split(areasTratadas, 455, 7.1);
  const areasRowH = Math.max(24, Math.min(58, areasLines.length * 8 + 10));
  tableRow(["Plagas detectadas", plagas], [95, 461], plagasRowH);
  tableRow(["Areas tratadas", areasTratadas], [95, 461], areasRowH);

  y += 7;
  section("PRODUCTOS APLICADOS");
  tableRow(["Dosis", "Producto / Formula", "Cad.", "Lote", "Cantidad preparada o aplicada", "Observaciones"], [48, 160, 72, 76, 126, 74], 16, true);
  const productos = data.productos.length ? data.productos : [{ dosis: "", formula: "Sin productos registrados", caducidad: "", lote: "", cantidad: "", observacion: "" }];
  productos.forEach((p) => {
    tableRow([p.dosis, p.formula, p.caducidad, p.lote, p.cantidad, p.observacion], [48, 160, 72, 76, 126, 74], 20);
  });

  y += 7;
  section("OBSERVACIONES Y RECOMENDACIONES");
  const notas = split(data.observaciones || "Sin observaciones", 545, 7.2);
  const noteH = Math.max(34, Math.min(82, notas.length * 9 + 10));
  rect(page.m, y, 556, noteH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(0, 0, 0);
  doc.text(notas.slice(0, 8), page.m + 6, y + 11);
  y += noteH + 8;

  ensurePage(98);
  const signW = (556 - 16) / 3;
  const signSources = Array.from(preview.querySelectorAll(".sign-box img")).map((img) => img.src);
  [
    ["Nombre y firma del responsable sanitario", data.responsableSanitario, signSources[0]],
    ["Nombre y firma del tecnico", data.nombreTecnicoFirma || data.tecnico, signSources[1]],
    ["Nombre y firma del cliente", data.nombreClienteFirma || data.cliente, signSources[2]]
  ].forEach((item, index) => {
    const x = page.m + index * (signW + 8);
    rect(x, y, signW, 58);
    text(item[0].toUpperCase(), x + signW / 2, y + 9, { bold: true, size: 5.6, color: navy, align: "center" });
    if (item[2]) {
      try { doc.addImage(item[2], "PNG", x + 32, y + 15, signW - 64, 22); } catch (_) {}
    }
    doc.setDrawColor(...line);
    doc.line(x + 12, y + 42, x + signW - 12, y + 42);
    text(item[1], x + signW / 2, y + 53, { size: 6.2, align: "center" });
  });
  y += 70;

  doc.setDrawColor(...navy);
  doc.line(page.m, y, page.w - page.m, y);
  text("Matriz: Peten #98 Narvarte, C.P. 03020 CDMX | Suc. Yucatan: Calle 20 #151 x 15 y 19, Col. Altabrisa, Merida, Yucatan", page.m, y + 10, { size: 5.8, color: [75, 75, 75] });
  text("Tel: 999 120 8854 | SINTOX 24 HRS 800 009 2800 | Intoxicacion - Gratuito", page.m, y + 18, { size: 5.8, color: [75, 75, 75] });
  text(`Generado: ${new Date().toLocaleString("es-MX")}`, page.m, y + 26, { size: 5.8, color: [75, 75, 75] });

  doc.save(nombreArchivoPdf(data));
}

function descargarPdf(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function compartirPdf() {
  if (!ultimoPdf) return;
  const archivo = new File([ultimoPdf], ultimoPdfNombre, { type: "application/pdf" });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [archivo] }))) {
    await navigator.share({
      title: "Reporte de servicio GS Burak",
      text: "Reporte de servicio en PDF",
      files: [archivo]
    });
    return;
  }
  descargarPdf(ultimoPdf, ultimoPdfNombre);
  alert("El PDF se descargo. Abre Descargas para enviarlo por WhatsApp o correo.");
}

function cell(value) {
  if (!value) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(value, fallback = "&nbsp;") {
  return cell(value) || fallback;
}

function joinList(items) {
  return items.length ? items.map(cell).join(", ") : "Sin registrar";
}

function renderCertificate(data, signatures) {
  preview.classList.remove("hidden");
  document.title = `Certificado Reporte ${data.folio || "de servicio"}`;
  const generatedAt = new Date().toLocaleString("es-MX");
  preview.innerHTML = `
    <div class="cert-border">
      <div class="cert-head">
        <div class="brand-block">
          <img src="assets/gs-burak-logo.jpeg" alt="GS Burak">
          <div class="license-line">Lic. sanitaria 08 AP 09 003 0009</div>
        </div>
        <div class="title-block">
          <div class="cert-title">CERTIFICADO / REPORTE DE SERVICIO</div>
          <div class="cert-subtitle">Fumigacion - Control de plagas - Desinfeccion</div>
          <div class="folio-pill">Folio: ${display(data.folio, "Pendiente")}</div>
        </div>
      </div>

      <div class="cert-meta">
        <div><span>Fecha</span><strong>${display(data.fecha)}</strong></div>
        <div><span>Hora</span><strong>${display(data.hora)}</strong></div>
        <div><span>Tecnico</span><strong>${display(data.tecnico)}</strong></div>
        <div><span>Tiempo de reentrada</span><strong>${display(data.tiempoReentrada)}</strong></div>
      </div>

      <div class="cert-section">
        <h3>DATOS DEL CLIENTE</h3>
        <table class="cert-table">
          <tr><th>Cliente / Razon social</th><td colspan="3">${display(data.cliente)}</td><th>Contacto</th><td>${display(data.contacto)}</td></tr>
          <tr><th>Domicilio del servicio</th><td colspan="5">${display(data.domicilio)}</td></tr>
          <tr><th>Telefono</th><td>${display(data.telefono)}</td><th>Email</th><td colspan="3">${display(data.email)}</td></tr>
        <tr><th>Giro / Sector</th><td>${display(data.giro)}</td><th>Proximo servicio</th><td>${display(data.proximoServicio)}</td><th>Forma de pago</th><td>${display(data.formaPago)}</td></tr>
        </table>
      </div>

      <div class="cert-section">
        <h3>SERVICIO REALIZADO</h3>
        <div class="cert-summary-grid">
          <div><span>Tipo de servicio</span><strong>${display(data.tipoServicio)}</strong></div>
          <div><span>Metodo aplicado</span><strong>${display(data.metodo)}</strong></div>
        </div>
      </div>

      <div class="cert-section">
        <h3>PLAGAS DETECTADAS Y AREAS TRATADAS</h3>
        <table class="cert-table">
          <tr>
            <th>Plagas detectadas</th>
            <td>${data.plagas.length ? data.plagas.map((p) => `${cell(p.nombre)}${p.nivel ? ` <span class="level-badge">${cell(p.nivel)}</span>` : ""}`).join(" ") : "Sin registrar"}</td>
          </tr>
          <tr>
            <th>Areas tratadas</th>
            <td>${joinList(data.areas)}</td>
          </tr>
        </table>
      </div>

      <div class="cert-section">
        <h3>PRODUCTOS APLICADOS</h3>
        <table class="cert-table products-print">
        <tr><th>Dosis</th><th>Producto / Formula</th><th>Cad.</th><th>Lote</th><th>Cantidad preparada o aplicada</th><th>Observaciones</th></tr>
          ${data.productos.length ? data.productos.map((p) => `<tr><td>${display(p.dosis)}</td><td>${display(p.formula)}</td><td>${display(p.caducidad)}</td><td>${display(p.lote)}</td><td>${display(p.cantidad)}</td><td>${display(p.observacion)}</td></tr>`).join("") : `<tr><td colspan="6">Sin productos registrados</td></tr>`}
        </table>
      </div>

      <div class="cert-section">
        <h3>OBSERVACIONES Y RECOMENDACIONES</h3>
        <div class="notes-box">${display(data.observaciones, "Sin observaciones")}</div>
      </div>

      <div class="signatures-print three">
        <div class="sign-box">
          <strong>Nombre y firma del responsable sanitario</strong>
          <img src="${signatures.responsable}" alt="Firma responsable sanitario">
          <span>${display(data.responsableSanitario)}</span>
        </div>
        <div class="sign-box">
          <strong>Nombre y firma del tecnico</strong>
          <img src="${signatures.tecnico}" alt="Firma tecnico">
          <span>${display(data.nombreTecnicoFirma || data.tecnico)}</span>
        </div>
        <div class="sign-box">
          <strong>Nombre y firma del cliente</strong>
          <img src="${signatures.cliente}" alt="Firma cliente">
          <span>${display(data.nombreClienteFirma || data.cliente)}</span>
        </div>
      </div>

      <div class="cert-footer">
        <div>Matriz: Peten #98 Narvarte, C.P. 03020 CDMX | Suc. Yucatan: Calle 20 #151 x 15 y 19, Col. Altabrisa, Merida, Yucatan</div>
        <div>Tel: 999 120 8854 | SINTOX 24 HRS 800 009 2800 | Intoxicacion - Gratuito</div>
        <div>La efectividad del servicio depende de condiciones sanitarias, frecuencia de aplicacion, practicas de limpieza, retiro de basura y danos estructurales del inmueble.</div>
        <div class="generated-line">Generado: ${generatedAt}</div>
      </div>
    </div>
  `;
}

async function init() {
  buildChecks();
  await setupClientesCatalog();
  await setupProgramacionesCatalog();
  setupProductosCatalog();
  setupNextService();
  setupFolio();
  setupResponsableSanitario();
  for (let i = 0; i < 4; i += 1) addProduct();
}

init();

const signaturePads = {
  firmaTecnico: setupSignature(document.querySelector("#firmaTecnico")),
  firmaCliente: setupSignature(document.querySelector("#firmaCliente"))
};

document.querySelector("#addProduct").addEventListener("click", addProduct);

document.querySelectorAll("[data-clear]").forEach((button) => {
  button.addEventListener("click", () => signaturePads[button.dataset.clear].clear());
});

document.querySelector("#saveDraft").addEventListener("click", () => {
  localStorage.setItem("certificadoBorrador", JSON.stringify(dataFromForm()));
  alert("Borrador guardado en esta tableta.");
});

document.querySelector("#resetForm").addEventListener("click", () => {
  if (confirm("Limpiar todo el formulario?")) {
    form.reset();
    setupFolio();
    setupResponsableSanitario();
    products.innerHTML = "";
    for (let i = 0; i < 4; i += 1) addProduct();
    document.querySelector("#proximoServicioTipo").dispatchEvent(new Event("change"));
    Object.values(signaturePads).forEach((pad) => pad.clear());
    preview.classList.add("hidden");
    document.querySelector("#reportResult").classList.add("hidden");
    ultimoPdf = null;
    ultimoPdfNombre = "";
  }
});

document.querySelector("#downloadPdf").addEventListener("click", () => {
  const data = dataFromForm();
  renderCertificate(data, {
    responsable: FIRMA_RESPONSABLE_DEFAULT,
    tecnico: signaturePads.firmaTecnico.data(),
    cliente: signaturePads.firmaCliente.data()
  });
  crearPdfEditable(data);
});

document.querySelector("#sharePdf").addEventListener("click", () => {
  compartirPdf().catch((error) => {
    if (error?.name !== "AbortError") alert(`No se pudo compartir: ${error.message}`);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity() || reporteEnProceso) return;

  reporteEnProceso = true;
  const boton = document.querySelector("#generateReport");
  const resultado = document.querySelector("#reportResult");
  const estado = document.querySelector("#reportStatus");
  boton.disabled = true;
  boton.textContent = "Guardando y creando PDF...";
  resultado.classList.add("hidden");

  const data = dataFromForm();
  renderCertificate(data, {
    responsable: FIRMA_RESPONSABLE_DEFAULT,
    tecnico: signaturePads.firmaTecnico.data(),
    cliente: signaturePads.firmaCliente.data()
  });

  try {
    const guardado = await saveReporteComoServicio(data);
    ultimoPdfNombre = nombreArchivoPdf(data);
    ultimoPdf = null;
    crearPdfEditable(data);

    const folioConfirmado = `certificado_folio_confirmado_${data.folio}`;
    if (!localStorage.getItem(folioConfirmado)) {
      commitFolio();
      localStorage.setItem(folioConfirmado, "1");
    }

    estado.textContent = `${guardado.mensaje} Se abrio la ventana para guardar el PDF.`;
    resultado.classList.remove("hidden");
    resultado.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error(error);
    estado.textContent = `No se completo el proceso: ${error.message || "Revisa la conexion a internet."}`;
    resultado.classList.remove("hidden");
  } finally {
    reporteEnProceso = false;
    boton.disabled = false;
    boton.textContent = "Guardar servicio y generar PDF";
  }
});
