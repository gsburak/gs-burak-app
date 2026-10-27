/* One immutable context per browser tab. No shared "selected stage" storage. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const requested = new URLSearchParams(location.search).get("administracion") || "nueva";
  if (!["nueva", "anterior"].includes(requested)) throw new Error("Administración inválida");
  const context = window.BurakAdmin = {
    stage: null, requested, revision: null, failed: false,
    label: () => context.stage === "nueva" ? "Nueva administración — desde el 16/10/2026" : context.stage === "anterior" ? "Administración anterior — hasta el 15/10/2026" : "Administración actual — separación pendiente",
    storageKey: key => context.stage ? `burak-etapa-${context.stage}-v1:${key}` : key,
    url: value => {
      const url = new URL(value, location.href);
      if (context.stage) url.searchParams.set("administracion", context.stage);
      return url.href;
    }
  };
  context.ready = location.protocol.startsWith("http")
    ? nativeFetch("/api/administraciones", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("No se pudo verificar la administración. Recarga la página.");
      const data = await response.json();
      if (data.activa) context.stage = requested;
      return data;
    })
    : Promise.resolve({ activa: false });
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/administraciones")) return nativeFetch(input, options);
    await context.ready;
    // A failed write must block further writes, but never prevent a fresh read.
    if (context.failed && (options.method || "GET").toUpperCase() !== "GET") throw new Error("Recarga la página para recuperar la última información antes de guardar.");
    const headers = new Headers(options.headers || (typeof input !== "string" ? input.headers : undefined));
    if (context.stage) headers.set("X-Burak-Administracion", context.stage);
    if (context.stage && context.revision !== null) headers.set("X-Burak-Revision", String(context.revision));
    let body = options.body;
    if (context.stage && body && ["/api/state", "/api/restore"].includes(url.pathname)) {
      const data = JSON.parse(body);
      if (data.administracion?.id !== context.stage) throw new Error("La información pertenece a otra administración.");
      if (context.revision !== null) data.revisionAdministracion = context.revision;
      body = JSON.stringify(data);
    }
    const response = await nativeFetch(input, { ...options, headers, body }).catch(error => {
      if ((options.method || "GET") !== "GET") context.failed = true;
      throw error;
    });
    if (!response.ok) {
      const error = await response.clone().json().catch(() => ({}));
      if (response.status === 409 || (options.method || "GET") !== "GET") context.failed = true;
      throw new Error(error.error || "No se pudo completar la operación. No se cambiará de administración.");
    }
    if (context.stage && ["/api/state", "/api/record", "/api/restore", "/api/pendientes"].includes(url.pathname)) {
      const data = await response.clone().json();
      if (data.revisionAdministracion !== undefined) context.revision = data.revisionAdministracion;
    }
    return response;
  };
  // Every printed report and export carries the selected context.
  document.addEventListener("DOMContentLoaded", () => {
    if (location.pathname.includes("/netlify-sites/")) context.ready.then(() => {
      const banner = document.createElement("div");
      banner.textContent = context.label();
      banner.style.cssText = "padding:10px;background:#e5f5f0;color:#143f35;font:700 13px Arial;border:1px solid #86b3a6;";
      if (context.stage === "anterior") banner.style.background = "#fff0ce";
      document.body.prepend(banner);
    }).catch(() => {});
    const nativeOpen = window.open.bind(window);
    window.open = (...args) => {
      const popup = nativeOpen(...args);
      if (popup && (!args[0] || args[0] === "about:blank")) {
        const write = popup.document.write.bind(popup.document);
        popup.document.write = html => write(String(html).replace(/<body([^>]*)>/i, `<body$1><p style="font:700 12px Arial;padding:8px;border:1px solid #aaa">${context.label()}</p>`));
      }
      return popup;
    };
  });
})();
