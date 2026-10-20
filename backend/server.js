// Servidor Express: expone una API REST muy simple.
import "dotenv/config"; // lee backend/.env
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const leer = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
const guardar = (f, d) => fs.writeFileSync(path.join(dataDir, f), JSON.stringify(d, null, 2));

// Correo: Gmail con "contraseña de aplicación" (ver README). Los datos salen de backend/.env
const { MAIL_USER, MAIL_PASS, MAIL_TO } = process.env;
const correoListo = Boolean(MAIL_USER && MAIL_PASS);
const transporter = correoListo ? nodemailer.createTransport({ service: "gmail", auth: { user: MAIL_USER, pass: MAIL_PASS } }) : null;
if (!correoListo) console.warn("⚠ Falta configurar backend/.env: los correos NO se enviarán.");
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const app = express();
app.use(cors());
app.use(express.json());

const servicios = [
  { id: 1, icono: "bolt", area: "Hogar y comercio", titulo: "Instalaciones", texto: "Residenciales e industriales, bajo norma RETIE" },
  { id: 2, icono: "build", area: "Industria", titulo: "Mantenimiento industrial", texto: "Preventivo y correctivo para plantas y maquinaria" },
  { id: 3, icono: "electrical_services", area: "Industria", titulo: "Media y baja tensión", texto: "Montajes y reparaciones MT/BT confiables" },
  { id: 4, icono: "description", area: "Trámites", titulo: "Matrículas residenciales", texto: "Trámite de matrículas eléctricas residenciales e industriales", nuevo: true },
  { id: 5, icono: "home_work", area: "Trámites", titulo: "Trámites con operador", texto: "Trámite y aprobación ante el operador de red" },
  { id: 6, icono: "solar_power", area: "Energía solar", titulo: "Proyectos fotovoltaicos", texto: "Diseño e instalación solar para ahorro energético", nuevo: true },
  { id: 7, icono: "verified", area: "Trámites", titulo: "Certificación RETIE", texto: "Inspección y dictamen certificado" },
  { id: 8, icono: "thermostat", area: "Industria", titulo: "Diagnóstico y termografía", texto: "Detección de puntos calientes y fallas" },
  { id: 9, icono: "water_pump", area: "Hogar y comercio", titulo: "Motobombas", texto: "Instalación y mantenimiento de motobombas" },
];

app.get("/api/servicios", (_req, res) => res.json(servicios));
app.get("/api/informes", (_req, res) => res.json(leer("informes.json")));

// Las mismas reglas del formulario, repetidas aquí: nunca confíes solo en el navegador.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
app.post("/api/contacto", async (req, res) => {
  const { nombre = "", tipo, contacto = "", servicio = "", mensaje = "", acepto, web } = req.body ?? {};
  if (web) return res.status(201).json({ ok: true }); // campo trampa para bots
  const errores = {};
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{3,60}$/.test(nombre.trim())) errores.nombre = "Nombre no válido.";
  const okContacto = tipo === "correo" ? EMAIL.test(contacto.trim()) : /^3\d{9}$/.test(contacto.replace(/\s/g, ""));
  if (!okContacto) errores.contacto = "Correo o celular no válido.";
  if (!servicios.some((x) => x.titulo === servicio)) errores.servicio = "Servicio no válido.";
  const n = mensaje.trim().length;
  if (n < 10 || n > 500) errores.mensaje = "El mensaje debe tener entre 10 y 500 caracteres.";
  if (acepto !== true) errores.acepto = "Debes aceptar el tratamiento de datos.";
  if (Object.keys(errores).length) return res.status(400).json({ errores });

  const lista = leer("contactos.json");
  lista.push({ id: Date.now(), fecha: new Date().toISOString(), nombre: nombre.trim(), tipo, contacto: contacto.trim(), servicio, mensaje: mensaje.trim() });
  guardar("contactos.json", lista); // copia de respaldo local

  if (!correoListo) return res.status(502).json({ errores: { general: "El envío por correo aún no está configurado en el servidor." } });
  try {
    await transporter.sendMail({
      from: `"Web M&M Asociados" <${MAIL_USER}>`,
      to: MAIL_TO || MAIL_USER,
      replyTo: tipo === "correo" ? contacto.trim() : undefined,
      subject: `Nueva solicitud: ${servicio} — ${nombre.trim()}`,
      html: `<h2>Nueva solicitud de cotización</h2>
        <p><b>Nombre:</b> ${esc(nombre.trim())}</p>
        <p><b>${tipo === "correo" ? "Correo" : "Celular"}:</b> ${esc(contacto.trim())}</p>
        <p><b>Servicio:</b> ${esc(servicio)}</p>
        <p><b>Mensaje:</b><br>${esc(mensaje.trim()).replace(/\n/g, "<br>")}</p>`,
    });
  } catch (e) {
    console.error("Error enviando correo:", e.message);
    return res.status(502).json({ errores: { general: "No pudimos enviar tu solicitud por correo. Intenta de nuevo o escríbenos por WhatsApp." } });
  }
  res.status(201).json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
