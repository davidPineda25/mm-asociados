import { useEffect, useMemo, useState } from "react";

// Iconos: Google Material Symbols (ver index.html). Se usan por nombre: <Icon n="bolt" />
const Icon = ({ n, className = "" }) => <span className={`ms ${className}`} aria-hidden="true">{n}</span>;

function useApi(url) {
  const [data, setData] = useState([]);
  useEffect(() => { fetch(url).then((r) => r.json()).then(setData).catch(() => setData([])); }, [url]);
  return data;
}

/* ---------- Reglas de validación del formulario ---------- */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const validar = {
  nombre: (v) => (/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{3,60}$/.test(v.trim()) ? "" : "Escribe tu nombre (solo letras, mínimo 3)."),
  contacto: (v, f) =>
    f.tipo === "correo"
      ? EMAIL.test(v.trim()) ? "" : "Escribe un correo válido, por ejemplo nombre@correo.com."
      : /^3\d{9}$/.test(v.replace(/\s/g, "")) ? "" : "Celular de 10 dígitos que empiece por 3.",
  servicio: (v) => (v ? "" : "Elige el servicio que necesitas."),
  mensaje: (v) => { const n = v.trim().length; return n < 10 ? "Cuéntanos un poco más (mínimo 10 caracteres)." : n > 500 ? "Máximo 500 caracteres." : ""; },
  acepto: (v) => (v ? "" : "Debes aceptar el tratamiento de datos para continuar."),
};
const vacio = { nombre: "", tipo: "telefono", contacto: "", servicio: "", mensaje: "", acepto: false, web: "" };

function Contacto({ servicios, servicio }) {
  const [f, setF] = useState(vacio);
  const [tocado, setTocado] = useState({});
  const [estado, setEstado] = useState("idle"); // idle | enviando | ok | error
  const [errServer, setErrServer] = useState({});

  useEffect(() => { if (servicio) setF((p) => ({ ...p, servicio })); }, [servicio]);

  const errores = useMemo(() => Object.fromEntries(Object.keys(validar).map((k) => [k, validar[k](f[k], f)])), [f]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const campo = (k) => ({ name: k, value: f[k], onChange: (e) => set(k, e.target.value), onBlur: () => setTocado((t) => ({ ...t, [k]: true })), "aria-invalid": !!(tocado[k] && errores[k]) });
  const error = (k) => { const m = (tocado[k] && errores[k]) || errServer[k]; return m ? <small className="err" role="alert"><Icon n="error" />{m}</small> : null; };
  const clase = (k) => (tocado[k] ? (errores[k] ? "mal" : "bien") : "");

  async function enviar(e) {
    e.preventDefault();
    setTocado({ nombre: 1, contacto: 1, servicio: 1, mensaje: 1, acepto: 1 });
    if (Object.values(errores).some(Boolean)) return;
    setEstado("enviando"); setErrServer({});
    try {
      const r = await fetch("/api/contacto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (r.ok) { setEstado("ok"); return; }
      setErrServer((await r.json()).errores || {}); setEstado("idle");
    } catch { setEstado("error"); }
  }

  if (estado === "ok")
    return (
      <div className="exito" role="status">
        <Icon n="check_circle" className="grande" />
        <h3>¡Solicitud enviada!</h3>
        <p>Un asesor de M&amp;M te contactará pronto por {f.tipo === "correo" ? "correo" : "teléfono"}.</p>
        <button className="btn ghost" onClick={() => { setF(vacio); setTocado({}); setEstado("idle"); }}>Enviar otra solicitud</button>
      </div>
    );

  return (
    <form onSubmit={enviar} noValidate>
      <label className={clase("nombre")}>Nombre completo
        <input {...campo("nombre")} autoComplete="name" placeholder="Ej: Laura Gómez" maxLength={60} />{error("nombre")}</label>

      <fieldset>
        <legend>¿Cómo prefieres que te contactemos?</legend>
        <div className="seg">
          {[["telefono", "call", "Celular"], ["correo", "mail", "Correo"]].map(([v, ic, t]) => (
            <button type="button" key={v} className={f.tipo === v ? "on" : ""} aria-pressed={f.tipo === v}
              onClick={() => { setF({ ...f, tipo: v, contacto: "" }); setTocado((x) => ({ ...x, contacto: false })); }}><Icon n={ic} />{t}</button>
          ))}
        </div>
        <label className={clase("contacto")}>{f.tipo === "correo" ? "Correo electrónico" : "Número de celular"}
          <input name="contacto" value={f.contacto} inputMode={f.tipo === "correo" ? "email" : "numeric"}
            placeholder={f.tipo === "correo" ? "nombre@correo.com" : "301 351 5847"}
            onChange={(e) => set("contacto", f.tipo === "correo" ? e.target.value : e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
            onBlur={() => setTocado((t) => ({ ...t, contacto: true }))} aria-invalid={!!(tocado.contacto && errores.contacto)} />{error("contacto")}</label>
      </fieldset>

      <label className={clase("servicio")}>Servicio
        <select {...campo("servicio")}>
          <option value="">Selecciona un servicio…</option>
          {servicios.map((s) => <option key={s.id}>{s.titulo}</option>)}
        </select>{error("servicio")}</label>

      <label className={clase("mensaje")}>¿Qué necesitas?
        <textarea {...campo("mensaje")} maxLength={500} placeholder="Ej: Necesito certificar la instalación de mi local en Tunja." />
        <span className="cuenta">{f.mensaje.length}/500</span>{error("mensaje")}</label>

      <input className="trampa" name="web" tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set("web", e.target.value)} aria-hidden="true" />

      <label className="check">
        <input type="checkbox" checked={f.acepto} onChange={(e) => { set("acepto", e.target.checked); setTocado((t) => ({ ...t, acepto: true })); }} />
        <span>Acepto el tratamiento de mis datos personales para recibir la cotización.</span></label>
      {error("acepto")}

      <button className="btn" disabled={estado === "enviando"}>{estado === "enviando" ? "Enviando…" : "Solicitar cotización"}<Icon n="send" /></button>
      {errServer.general && <small className="err" role="alert"><Icon n="error" />{errServer.general}</small>}
      {estado === "error" && <small className="err" role="alert"><Icon n="error" />No se pudo enviar. Revisa que el servidor esté activo.</small>}
    </form>
  );
}

const SECCIONES = ["inicio", "servicios", "informes", "nosotros", "contacto"];
const PASOS = [["chat", "Cuéntanos", "Describe tu necesidad por el formulario o WhatsApp."], ["engineering", "Visita técnica", "Un técnico certificado evalúa y cotiza."], ["verified", "Ejecución y certificado", "Trabajamos bajo RETIE y entregamos el dictamen."]];

export default function App() {
  const servicios = useApi("/api/servicios");
  const informes = useApi("/api/informes");
  const [activa, setActiva] = useState("inicio");
  const [area, setArea] = useState("Todos");
  const [estadoInf, setEstadoInf] = useState("Todos");
  const [sel, setSel] = useState("");

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActiva(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    SECCIONES.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const areas = ["Todos", ...new Set(servicios.map((s) => s.area))];
  const visibles = servicios.filter((s) => area === "Todos" || s.area === area);
  const filas = informes.filter((i) => estadoInf === "Todos" || i.estado === estadoInf);
  const cotizar = (t) => { setSel(t); document.getElementById("contacto").scrollIntoView({ behavior: "smooth" }); };
  const luz = (e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`); };

  return (
    <>
      <header>
        <div className="wrap bar">
          <a className="brand" href="#inicio"><Icon n="bolt" className="logo" />M&amp;M<small>ASOCIADOS</small></a>
          <nav>{SECCIONES.map((s) => <a key={s} href={`#${s}`} className={activa === s ? "act" : ""}>{s === "informes" ? "informes técnicos" : s}</a>)}</nav>
        </div>
      </header>

      <main className="wrap">
        <section id="inicio" className="hero">
          <div>
            <h1>Soluciones eléctricas seguras y operativas</h1>
            <p>Servicios eléctricos profesionales en todo Boyacá: instalaciones, mantenimiento, certificaciones RETIE y proyectos fotovoltaicos con los más altos estándares de seguridad y calidad.</p>
            <div className="acciones">
              <a className="btn" href="https://wa.me/573212355211" target="_blank" rel="noreferrer"><Icon n="chat" />Cotiza por WhatsApp · 321 235 5211</a>
              <a className="btn ghost" href="#servicios">Ver servicios</a>
            </div>
            <ul className="confianza">
              <li><Icon n="schedule" />Atención rápida en Boyacá</li>
              <li><Icon n="engineering" />Técnicos certificados</li>
              <li><Icon n="verified" />Cumplimiento RETIE</li>
            </ul>
          </div>
          <div className="photo"><img src="/assets/tecnicoelectrico.jpg" alt="Técnico eléctrico revisando un tablero"/></div>
        </section>

        <section id="servicios">
          <h2>Nuestros servicios</h2>
          <p className="sub">Filtra por lo que necesitas y cotiza con un clic.</p>
          <div className="chips" role="tablist">{areas.map((a) => <button key={a} className={area === a ? "on" : ""} onClick={() => setArea(a)}>{a}</button>)}</div>
          <div className="grid">
            {visibles.map((s) => (
              <article className="card" key={s.id} onMouseMove={luz}>
                {s.nuevo && <span className="new">Nuevo</span>}
                <Icon n={s.icono} className="ico" /><h3>{s.titulo}</h3><p>{s.texto}</p>
                <button className="link" onClick={() => cotizar(s.titulo)}>Cotizar este servicio<Icon n="arrow_forward" /></button>
              </article>
            ))}
          </div>
        </section>

        <section id="informes">
          <h2>Informes técnicos</h2>
          <p className="sub">Consulta nuestros últimos informes elaborados y certificados.</p>
          <div className="chips">{["Todos", "Aprobado", "Observado"].map((e) => <button key={e} className={estadoInf === e ? "on" : ""} onClick={() => setEstadoInf(e)}>{e}</button>)}</div>
          <div className="tablebox"><table>
            <thead><tr><th>Fecha</th><th>Informe</th><th>Ubicación</th><th>Estado</th><th>Descargar</th></tr></thead>
            <tbody>{filas.map((i) => (
              <tr key={i.informe}><td>{i.fecha}</td><td>{i.informe}</td><td>{i.ubicacion}</td>
                <td><span className={`tag ${i.estado}`}><Icon n={i.estado === "Aprobado" ? "check_circle" : "visibility"} />{i.estado}</span></td>
                <td><a className="dl" href={i.archivo}>Descargar PDF<Icon n="download" /></a></td></tr>))}
            </tbody>
          </table></div>
        </section>

        <section id="nosotros">
          <h2>Nosotros</h2>
          <p className="sub">Empresa eléctrica especializada en soluciones seguras y operativas en Boyacá. Así trabajamos:</p>
          <div className="pasos">{PASOS.map(([ic, t, d], i) => <div key={t}><span className="num">{i + 1}</span><Icon n={ic} className="ico" /><h3>{t}</h3><p>{d}</p></div>)}</div>
        </section>

        <section id="contacto">
          <h2>Solicita tu cotización</h2>
          <p className="sub">Te respondemos en horario laboral.</p>
          <div className="contact">
            <Contacto servicios={servicios} servicio={sel} />
            <aside>
              <h3><Icon n="call" />Contacto</h3><p>Tel: +57 321 235 5211<br />contacto@mmasociados.com<br />Boyacá, Colombia</p>
              <h3><Icon n="location_on" />Ubicación</h3><p>Cra 10 #15-32, Tunja, Boyacá</p>
              <h3><Icon n="schedule" />Horario</h3><p>Lun - Sáb 8:00am - 6:00pm</p>
            </aside>
          </div>
        </section>
      </main>

      <a className="wapp" href="https://wa.me/573212355211" target="_blank" rel="noreferrer" aria-label="Escribir por WhatsApp"><Icon n="chat" /></a>
      <footer><p>© 2025 M&amp;M ASOCIADOS — Todos los derechos reservados.</p></footer>
    </>
  );
}
