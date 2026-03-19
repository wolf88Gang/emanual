# Demo Vendible — Guía para Ventas

## Objetivo

Convertir la app en una **demo que se vende sola**: primera impresión clara, flujo guiado y datos coherentes.

---

## Flujo de Demo (30 segundos)

1. **Landing** (`/` o `/features`) → CTA "Probar Demo"
2. **Auth** (`/auth`) → "Try Demo (no signup)" → Seleccionar rol (Owner, Manager, Crew, Vendor)
3. **Login** con `Demo1234!` → Redirección a WorkView o Map
4. **Banner demo** visible cuando el usuario es `*@demo.com`

---

## Cuentas Demo

| Rol    | Email           | Password   |
|--------|-----------------|------------|
| Owner  | owner@demo.com  | Demo1234!  |
| Manager| manager@demo.com| Demo1234!  |
| Crew   | crew@demo.com   | Demo1234!  |
| Vendor | vendor@demo.com | Demo1234!  |

---

## Pre-requisitos (una vez)

1. **Crear demo org y cuentas** (Supabase Edge Function):
   ```bash
   curl -X POST "https://<PROJECT>.supabase.co/functions/v1/setup-demo-accounts" \
     -H "Authorization: Bearer <ANON_KEY>" \
     -H "Content-Type: application/json"
   ```

2. **Org "Bahia Vista Holdings"** debe existir con al menos un estate (crear manualmente o vía seed si aplica).

---

## Rutas Clave para Mostrar

| Ruta   | Qué mostrar                          |
|--------|--------------------------------------|
| `/map` | Mapa con zonas, activos, pins        |
| `/tasks` | Tareas pendientes, asignaciones    |
| `/assets` | Registro de activos               |
| `/assets/:id` | Detalle de activo con QR        |
| `/checkin` | Check-in por QR, turnos          |
| `/reports` | Informes PDF (si trial activo)   |

---

## Checklist Pre-Demo

- [ ] Demo accounts creados (`setup-demo-accounts`)
- [ ] Org "Bahia Vista Holdings" con estate y datos de ejemplo
- [ ] Imágenes en `/public/images/` (estate_guide_*.jpg, hg-logo.png)
- [ ] Probar login con owner@demo.com en navegador y emulador
