# M&M Asociados — Sitio web (React + Express)

Proyecto sencillo y explicativo con frontend y backend separados.

## Estructura
```
mm-asociados/
├── backend/            API con Node.js + Express
│   ├── server.js       rutas: /api/servicios, /api/informes, /api/contacto
│   └── data/           informes.json (lectura) y contactos.json (se llena con el formulario)
└── frontend/           Interfaz con React + Vite
    └── src/App.jsx     página completa (servicios, informes, formulario)
```

## Cómo correrlo
Requisito: Node.js 18 o superior.

```bash
npm run instalar   # instala dependencias de raíz, backend y frontend
npm run dev        # arranca API (3001) y web (5173) a la vez
```
Abre http://localhost:5173

## Cómo funciona
1. React pide servicios e informes a la API al cargar (`useApi`).
2. El formulario envía un POST a `/api/contacto`; el backend valida y guarda en `backend/data/contactos.json`.
3. Vite redirige `/api` al backend (proxy en `vite.config.js`), por eso no hay problemas de CORS en desarrollo.

## Personalizar
- Servicios: editar el arreglo en `backend/server.js`.
- Informes: editar `backend/data/informes.json`.
- Foto del técnico: poner la imagen en `frontend/public/` y cambiar el bloque `.photo` en `App.jsx`.

## Envío de solicitudes por correo
1. En la cuenta de Gmail activa la verificación en 2 pasos y crea una "contraseña de aplicación" (myaccount.google.com/apppasswords).
2. Copia `backend/.env.example` como `backend/.env` y pon esa contraseña en `MAIL_PASS`.
3. Instala lo nuevo: `npm install --prefix backend` y reinicia `npm run dev`.
