# PlantOps V2 — Raíz y Forma (plan de implementación reducido)

Objetivo: convertir Home Guide, para organizaciones `plant_rental`, en un sistema de servicio y cuidado de plantas: clientes → plantas → cuidado/riego → visitas → herramientas → manual → cobros → pagos. Sin mapas, sin cuentas para clientes.

## 0. Diagnóstico previo (obligatorio, antes de tocar features)

- Cuentas demo en el login: hoy `/auth` no muestra ninguna. Se añade un bloque "Cuentas de demostración" con acceso de 1 clic. Existen `owner@demo.com`, `manager@demo.com`, `crew@demo.com`, `vendor@demo.com` (Bahia Vista, landscaping). **No existe ninguna organización `plant_rental`**, por lo que hay que crear la demo `plantops@demo.com` + org "Raíz y Forma (Demo)" con 1 cliente, 1 sede, plantas, visita y manual.
- "Secciones que no cargan": pendiente de reproducir. Primer paso del trabajo = abrir cada ruta del sidebar con las 4 cuentas demo, capturar el error real (chunk stale, RLS, o consulta rota) y corregir. No se asume la causa antes de verla.

## A. Qué existe y se reutiliza

| Necesidad | Sistema actual | Acción |
|---|---|---|
| Empresa / usuarios | `organizations`, `profiles`, `user_roles` | Reutilizar |
| Clientes y contactos | `clients` | Reutilizar + campos de contacto |
| Sedes | `estates` (ya con `client_id`) | Reutilizar (sin mapa) |
| Áreas / pisos | `zones` (`floor_label`) | Reutilizar, sin geometría |
| Plantas y macetas | `assets` (`plant`, `pot`), `plant_instances` | Reutilizar |
| Especie / cuidado | `plant_profiles.care_template_json` | Extender (`light_requirement`, riego base) |
| Datos comerciales | `plantops_asset_details` | Reutilizar (nunca visible al cliente) |
| Ubicación puntual e historial de puesto | `plant_placements` (RPC-only) | Extender (riego + luz + override) |
| Contratos y frecuencia | `rental_contracts` | Reutilizar |
| Visitas | `worker_shifts` + `task_completions` | Reutilizar como visita (check-in/out) |
| Herramientas | `inventory_items`, `tool_assignments` | Reutilizar |
| Catálogo servicios/extras | `product_catalog` | Reutilizar (no crear tabla) |
| Facturas | `invoices`, `invoice_items` | Reutilizar |
| Pagos | `client_payments` | Reutilizar |
| Recordatorios | `notifications` | Reutilizar |
| Manual PDF | `src/lib/pdfExport.ts` (jsPDF) + `generate-estate-manual` | Extender, no reescribir |

Nuevo estrictamente necesario: **`plant_care_logs`** (historial de acciones de cuidado; el modelo actual no lo resuelve) y **`client_share_links`** (página pública por token).

## B. Fuera del alcance PlantOps

Se ocultan solo cuando `org_type = 'plant_rental'` (nunca se borran ni afectan otras verticales): Mapa, Topografía, Compost, Empleos/Marketplace, portal de cliente con login obligatorio (`/join-client` sigue existiendo para otras verticales).

## C. Navegación plant_rental

- Desktop: Inicio · Clientes · Plantas · Visitas · Cuidados · Facturación · Más (Contratos, Herramientas, Catálogo, Configuración, Reportes).
- Mobile (bottom nav): Inicio · Visitas · Cuidados · Clientes · Más.

## D. Wizard de nuevo cliente (10 pasos → entidades)

1 Cliente → `clients` · 2 Sede/áreas → `estates` + `zones` · 3 Servicios (checklist) → `rental_contracts.services_json` · 4 Frecuencia → `rental_contracts.maintenance_frequency` · 5 Plantas y macetas → `assets` + RPC `plantops_reserve/install` (`plant_placements`) · 6 Extras → `product_catalog` + cargos pendientes · 7 Cuidado (quién riega, luz, reglas) → campos de riego en `plant_placements` · 8 Página del cliente (qué mostrar) → `client_share_links` · 9 Cobro → `rental_contracts` (precio, moneda, día) · 10 Resumen → "Activar cliente".

## E. Wizard inicial de la organización

Checklist "¿Qué quiere gestionar?" (clientes, plantas, macetas, recordatorios, visitas, herramientas, contratos, facturas, pagos, manuales, eventos) guardado en `organizations.modules_json`. La navegación se filtra por esa configuración; no se borran datos.

## F. Página personalizada del cliente

- URL: `/c/<token>` (token aleatorio de 32 bytes, no adivinable; se guarda solo el hash).
- Acceso público **read-only** mediante Edge Function `client-share` con service role: la tabla no queda expuesta al rol `anon`; la función valida token, revocación y expiración, y devuelve únicamente los campos permitidos por los flags del enlace.
- Muestra: encabezado (identidad Raíz y Forma, cliente, sede, contacto, próxima visita), plantas (foto, nombre, ubicación textual, riego: último / próximo / "NO REGAR ANTES DE…", luz), manual (ver + descargar PDF), historial y saldo solo si el flag está activo.
- Nunca: costos, margen, valor de reposición, notas internas, herramientas ni otros clientes.
- Gestión: crear, copiar, desactivar, regenerar enlace desde la ficha del cliente.

## G. Motor de riego

Datos por planta instalada (en `plant_placements`): `last_watered_at`, `watering_interval_days`, `min_interval_days`, `next_water_due`, `care_responsibility` (raiz_y_forma | cliente | compartido), `reminder_contact_id`, `actual_light_condition`.
Resolución: especie (`plant_profiles`) → override de ubicación → programa efectivo. Al registrar riego (`plant_care_logs` vía RPC): actualiza último riego, recalcula próximo, cierra recordatorio anterior y programa el siguiente. Si es demasiado pronto: advertencia con fecha recomendada y override permitido registrando quién/cuándo/motivo. Idempotencia: no duplicar recordatorios abiertos por planta.

## H. Visitas y herramientas

Visita = `worker_shifts` con `visit_kind='plantops'`: check-in (GPS/QR opcional) → herramientas llevadas (`tool_assignments`) → lista "REGAR HOY / NO REGAR / REVISAR / INCIDENCIAS" → acciones por planta (regar, limpiar, podar, fertilizar, plagas, luz, mover, reemplazar, foto, problema) en `plant_care_logs` → extras → confirmación de herramientas (bloquea checkout si faltan; cierre excepcional con motivo) → resumen → historial. Mobile-first.

## I. Servicios, extras, facturas y pagos

Catálogo en `product_catalog` (nombre, categoría, precio, moneda, unidad, activo). Extras registrados en visita quedan como cargos pendientes ligados a cliente + visita, y se convierten en `invoice_items` al facturar. Pagos en `client_payments`. Cuenta corriente del cliente = vista calculada (facturado / pagado / pendiente / vencido + línea de movimientos), sin doble contabilidad.

## J. Historial por sede

Timeline construido por consulta unificada sobre registros existentes (visitas, `plant_care_logs`, incidencias/tareas, extras, fotos) ordenada por fecha, con filtros por fecha, planta, tipo de acción y técnico. Sin tablas de resumen duplicadas.

## K. Tipografía y design system

Auditado: hoy conviven `Inter` (sans) y `Cormorant Garamond` (`font-serif`, usado en muchos títulos). Cambio centralizado: cargar **Montserrat** en `index.html`, definirla como `sans` y también como `serif` en `tailwind.config.ts` (así los `font-serif` existentes pasan a Montserrat sin tocar cada componente), y fijar la escala tipográfica en `src/index.css` (body 16px, secundario 14px, caption 12px mínimo, H1 30–36 / 26–30 móvil, H2 24–28, H3 18–22). Se corrigen solo los casos extremos (texto de 10–11px funcional, títulos de 48–60px dentro del dashboard).

## L. Base de datos (sin SQL todavía)

- Columnas nuevas: `organizations.modules_json`; `plant_profiles.light_requirement` + riego base; `plant_placements` (campos de riego y luz del punto G); `worker_shifts.visit_kind`; `rental_contracts.services_json`.
- Tablas nuevas: `plant_care_logs`, `client_share_links` (+ tabla o campo para extras pendientes si `invoice_items` no lo cubre sin factura).
- Índices: `(org_id, next_water_due)`, `(placement_id, performed_at)`, hash de token único.
- Constraints: intervalos positivos, `min_interval_days <= watering_interval_days`, enums de acción y de luz.
- RLS: todo scoped por `org_id`; escrituras de cuidado y de enlaces solo vía RPC/Edge Function; `anon` sin acceso directo. GRANTs explícitos en cada tabla nueva.

## M. Archivos

Modificar: `index.html`, `tailwind.config.ts`, `src/index.css`, `src/pages/Auth.tsx` (demos), `src/components/layout/AppSidebar.tsx`, `BottomNav.tsx`, `src/App.tsx`, `src/pages/PlantOps.tsx`, `PlantOpsContracts.tsx`, `src/lib/plantops.ts`, `src/hooks/usePlantOps.ts`, `src/lib/pdfExport.ts`, `src/pages/CRM.tsx`.
Nuevos: `src/pages/plantops/{Dashboard,Clients,ClientDetail,Visits,VisitRunner,Care,Catalog}.tsx`, `src/components/plantops/NewClientWizard.tsx`, `OrgSetupWizard.tsx`, `WateringBadge.tsx`, `ToolChecklist.tsx`, `src/pages/ClientShare.tsx`, `src/lib/watering.ts`, `src/lib/clientManual.ts`, `supabase/functions/client-share/index.ts`, `supabase/functions/care-reminders/index.ts`.

## N. Coste relativo

Bajo: tipografía, navegación, cuentas demo, catálogo. Medio: wizards, motor de riego, manual PDF, cuenta corriente. Alto (mayor consumo): visita completa mobile-first + care logs, y página pública con Edge Function y seguridad de token.

## O. Orden de implementación

1. Diagnóstico de secciones que no cargan + cuentas demo (incl. demo `plant_rental`).
2. Tipografía/escala + navegación filtrada por `org_type` y módulos.
3. Migraciones (columnas, `plant_care_logs`, `client_share_links`, RLS/RPC).
4. Clientes/sedes + wizard de nuevo cliente.
5. Motor de riego + vista Cuidados + recordatorios internos.
6. Visitas con herramientas, care logs y extras.
7. Página pública + manual PDF.
8. Facturación, pagos y cuenta corriente.
9. Dashboard "Hoy / Negocio / Próximamente" con métricas clickeables.

## P. Alcance MVP

- MVP: diagnóstico y demos, tipografía, navegación, wizard de cliente, riego + registro + advertencia de sobre-riego, visitas con herramientas y extras, historial por sede, página pública + manual, facturas/pagos/saldo, dashboard.
- Segunda fase: wizard de organización avanzado, email al cliente, eventos con logística, reportes analíticos.
- No construir: mapas/GIS en PlantOps, login obligatorio de cliente, WhatsApp/SMS, IoT, IA diagnóstica, marketplace, contabilidad completa, app nativa.

## Q. Prompt final de implementación (al aprobar)

"Implementar PlantOps V2 según el plan aprobado, en el orden O. Reutilizar organizations/clients/estates/zones/assets/plant_profiles/plant_placements/rental_contracts/inventory_items/tool_assignments/worker_shifts/product_catalog/invoices/invoice_items/client_payments/notifications y el generador PDF existente. Crear solo `plant_care_logs` y `client_share_links` más las columnas listadas en L, con GRANTs, RLS por org y escrituras vía RPC. Ocultar Mapa/Topografía/Compost/Empleos solo para `org_type='plant_rental'`. Montserrat como única familia tipográfica con la escala definida. Página pública read-only en `/c/<token>` mediante Edge Function con service role, revocable y regenerable, sin datos internos. No tocar otras verticales."
