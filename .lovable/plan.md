# Home Guide PlantOps — Plan técnico (piloto Raíz y Forma)

## A. Diagnóstico actual (verificado en código y base de datos)

Arquitectura encontrada:
- React 18 + Vite + Tailwind, rutas lazy en `src/App.tsx`, layout con `SidebarLayout` / `ModernAppLayout` / `AppSidebar` / `BottomNav`.
- Multi-tenant por `organizations.org_type` (valores reales hoy: `residential`, `landscaping_company`) y `profiles.org_id`. El menú ya se bifurca por tipo de organización (`isLandscaper`, `isPropManager`) en `AppSidebar.tsx`.
- Roles en tabla aparte `user_roles` + enum `app_role` (owner, manager, crew, vendor, worker_marketplace, client) y funciones `has_role`, `get_user_org_id`, `get_client_permissions`.
- Jerarquía espacial ya existente: `organizations → estates → zones → assets` con `asset_photos`, `tasks`, `task_completions`, `documents`, `qr_labels`, `inventory_items`, `tool_assignments`.
- CRM ya existente: `clients`, `product_catalog`, `invoices`, `invoice_items`, `client_payments`; pantalla `/crm` con pestañas de clientes, productos, facturas y pagos.
- Portal de cliente ya existente: `client_access` (8 flags de permisos por sede), `client_invites`, `useClientAccess`, `ClientAccessManager`.
- Botánica ya existente: `plant_profiles` (care_template_json multilingüe) y `plant_instances` ligado a `assets`.

Funciones reutilizables sin duplicar:
- `clients` cubre el cliente comercial de PlantOps (ya tiene `estate_id` opcional).
- `estates` puede representar la **sede** del cliente; `zones` el **edificio/área/piso**; `assets` el **punto + unidad instalada**.
- `tasks` + `task_completions` + `asset_photos` cubren visita de mantenimiento con evidencia.
- `qr_labels` cubre el código QR por planta.
- `plant_profiles` cubre especie/variedad y guía de cuidado.
- `product_catalog` + `invoices` cubren cotización/facturación de alquiler.

Brechas reales:
1. No existe estado de ciclo de vida de activo (disponible/reservado/instalado/en recuperación/baja). `assets` no tiene columna de estado ni condición.
2. No existe contrato de alquiler ni reserva por fechas → sin esto no hay eventos ni control de doble reserva.
3. No existe incidencia/reemplazo como entidad (hoy solo tareas).
4. No existe historial de movimientos del activo (cliente A → bodega → cliente B).
5. No existe ubicación interior descriptiva (piso, punto, foto de referencia, indicaciones de acceso); hoy solo `lat/lng`.
6. `assets.asset_type` es un enum cerrado sin `pot` / `accessory` / `composition`.
7. `enum org_type` es texto libre en `organizations.org_type`, pero `profiles.client_type` es enum sin valor para esta vertical.

Riesgos técnicos:
- `enum asset_type` requiere `ALTER TYPE ... ADD VALUE` (no reversible en la misma transacción; migración separada).
- `EstateContext` asume "una propiedad propia"; en PlantOps hay muchas sedes de terceros → la selección de sede debe seguir funcionando pero etiquetada como cliente/sede.
- `CRM.tsx` redirige fuera a `residential`; la nueva vertical debe entrar en la rama de acceso comercial explícitamente o quedará sin facturación.
- RLS actual está scoped por `org_id` vía `estates`; toda tabla nueva debe seguir el mismo patrón + GRANTs.

## B. Alcance exacto del MVP

Obligatorio:
- Tipo de organización `plant_rental` con navegación propia.
- Estado + condición de activo; tipos `pot` y `accessory`.
- Ubicación interior descriptiva por activo.
- Contratos de alquiler (recurrente y evento) con fechas y cliente.
- Reservas de activos por rango de fechas con validación anti doble reserva.
- Visitas de mantenimiento (reutilizando `tasks`) con evidencia fotográfica.
- Incidencias y reemplazos.
- Historial de movimientos del activo.
- Guía de cuidado combinada (especie + ubicación + reglas de contrato).
- Portal de cliente reutilizando `client_access`.

Conveniente (si el piloto lo pide):
- Inventario por cantidad además de serializado.
- Emparejamiento planta ↔ maceta con historial independiente.
- Cotización previa a contrato.

Pospuesto: IA de diagnóstico, IoT, rutas optimizadas, contabilidad completa, e-commerce, reconocimiento de especies, modelos predictivos, editor gráfico de planos.

## C. Mapeo de reutilización

| Necesidad PlantOps | Tabla/componente actual | Acción |
|---|---|---|
| Cliente | `clients` | reutilizar (+ tipo de cliente, contacto principal) |
| Sede | `estates` | reutilizar (+ `client_id`, `is_client_site`) |
| Edificio / piso / zona | `zones` | reutilizar (+ `floor_label`) |
| Punto de colocación + unidad instalada | `assets` | extender (estado, condición, ubicación interior, costo, precio alquiler) |
| Planta (especie/guía) | `plant_profiles` + `plant_instances` | reutilizar |
| Maceta / accesorio | `assets` con `asset_type` nuevo | extender enum |
| Mantenimiento | `tasks` + `task_completions` | reutilizar (+ `visit_id`) |
| Visita programada | — | crear `service_visits` |
| Contrato | — | crear `rental_contracts` |
| Reserva de evento | — | crear `asset_reservations` |
| Incidencia / reemplazo | — | crear `asset_incidents` |
| Historial de movimientos | — | crear `asset_movements` |
| Evidencia fotográfica | `asset_photos` | reutilizar |
| Documentos / contrato PDF | `documents` | reutilizar |
| Facturación | `invoices`, `product_catalog` | reutilizar |
| Portal cliente | `client_access`, `useClientAccess` | reutilizar |
| QR | `qr_labels` | reutilizar |

## D. Cambios de base de datos (sin ejecutar)

1. `assets`: `+ lifecycle_status` (enum nuevo `asset_lifecycle`: disponible, reservado, en_preparacion, instalado, requiere_atencion, en_recuperacion, muerto, dado_de_baja), `+ condition_rating` (1-5), `+ location_floor`, `+ location_spot_note`, `+ access_notes`, `+ acquisition_date`, `+ supplier_name`, `+ cost`, `+ replacement_value`, `+ rental_price`, `+ currency`, `+ parent_asset_id` (planta↔maceta), `+ quantity` (para no serializados), `+ current_client_id`, `+ contract_id`. Defaults no nulos donde aplique para no romper filas existentes.
2. `ALTER TYPE asset_type ADD VALUE 'pot' | 'accessory' | 'composition'` (migración independiente).
3. `estates`: `+ client_id uuid references clients(id)`, `+ site_type text`.
4. `zones`: `+ floor_label text`.
5. Nuevas tablas (todas con `org_id`/`estate_id`, `created_at`, `updated_at`, trigger de `updated_at`, GRANTs a `authenticated`/`service_role`, RLS por `get_user_org_id`):
   - `rental_contracts` (client_id, estate_id, contract_type recurrente|evento, status, start/end, monthly_amount, currency, terms, included_replacements).
   - `asset_reservations` (asset_id, contract_id, start_at, end_at, status) + índice `(asset_id, start_at, end_at)` y trigger de validación de solape (no CHECK).
   - `service_visits` (estate_id, contract_id, scheduled_for, status, assigned_to, arrived_at, completed_at, notes).
   - `asset_incidents` (asset_id, visit_id, status, cause, responsibility, replacement_asset_id, resolved_at).
   - `asset_movements` (asset_id, from_estate_id, to_estate_id, moved_at, reason, moved_by) — inmutable (sin UPDATE/DELETE).
6. `tasks`: `+ visit_id uuid`.
7. RLS de portal cliente: extender `get_client_permissions` o añadir política de lectura para `client` sobre `service_visits`, `asset_incidents` y `rental_contracts` limitada a su `estate_id`.
8. Estrategia: 3 migraciones (enum → columnas → tablas nuevas). Datos existentes intactos; `lifecycle_status` default `instalado` para activos ya creados.

## E. Cambios de frontend

| Ruta | Objetivo | Reutiliza | Nuevo |
|---|---|---|---|
| `/plantops` | Panel de operación: activos por estado, visitas de hoy, incidencias abiertas | ModernAppLayout, Card, Badge | `PlantOpsDashboard` |
| `/plantops/clients` | Clientes y sus sedes | `CRM.tsx` pestaña clientes, ClientAccessManager | `ClientSitesPanel` |
| `/plantops/inventory` | Inventario de plantas/macetas por estado | Assets.tsx patrones de tarjeta | `PlantInventoryGrid`, `AssetStatusBadge` |
| `/plantops/contracts` | Contratos y reservas de evento | Dialog, Table | `ContractList`, `ContractDialog`, `ReservationCalendar` |
| `/plantops/visits` | Programar y ejecutar visitas | tasks, TaskCompletionDialog, AssetPhotoUpload | `VisitScheduler`, `VisitExecutionSheet` |
| `/plantops/incidents` | Incidencias y reemplazos | asset_photos | `IncidentDialog`, `ReplacementFlow` |
| `/assets/:id` | Añadir ficha PlantOps: estado, ubicación interior, historial, guía | AssetDetail, MaintenanceInfoCard, CareProtocolSheet | pestañas `Historial` y `Ubicación` |
| Portal cliente | Vista restringida | `useClientAccess` | `ClientPlantPortal` + botón "Reportar problema" con foto |

Cada pantalla: query por `org_id`/`estate_id` con React Query, estado vacío con CTA, skeleton de carga, toast de error, y permisos: owner/manager escriben, crew ejecuta visitas, client solo lee.

## F. Navegación propuesta (org_type = `plant_rental`)

Operación: Panel · Clientes y Sedes · Inventario · Contratos · Visitas · Incidencias
Soporte: Plantas (especies) · Documentos · Facturación · Reportes · Admin

Sin cambios para `residential`, `landscaping_company`, `property_management`. Móvil (BottomNav): Panel · Visitas · Inventario · Incidencias.

## G. Orden de implementación

1. Migración enum + columnas en `assets`/`estates`/`zones`. Riesgo bajo. Aceptación: tipos regenerados, app sigue compilando. Rollback: drop de columnas.
2. Migración tablas nuevas + RLS + GRANTs. Riesgo medio (RLS). Aceptación: consulta cruzada entre organizaciones devuelve 0 filas.
3. Tipo de organización + navegación (`AppSidebar.tsx`, `Onboarding.tsx`, `CRM.tsx` guard). Riesgo bajo.
4. Inventario de activos + estados (`/plantops/inventory`, ficha de activo). Riesgo bajo.
5. Clientes y sedes. Riesgo bajo.
6. Contratos y reservas + validación anti solape. Riesgo medio.
7. Visitas y ejecución con evidencia. Riesgo medio.
8. Incidencias y reemplazo (mueve estado + crea movimiento). Riesgo medio.
9. Portal de cliente y guía de cuidado combinada. Riesgo bajo.

## H. Plan de pruebas
Crear cliente · crear sede · registrar planta y maceta · asignar a ubicación interior · crear contrato recurrente · crear reserva de evento · intentar doble reserva (debe fallar) · programar visita · ejecutar visita con foto · reportar incidencia · reemplazar planta (estado y movimiento correctos) · portal cliente ve solo sus sedes · usuario de otra organización no ve nada.

## I. Plan de despliegue
Migraciones en el orden 1→2 con aprobación; regeneración de tipos; sin nuevas variables de entorno ni secretos; build y typecheck; validación manual del checklist H en preview; publicación; rollback por migración inversa (drop de tablas/columnas nuevas) sin afectar datos existentes.

## J. Decisiones que requieren aprobación
1. **Sede = `estates`** (reutilizar) en lugar de tabla `client_sites` nueva. Recomendado: reutilizar.
2. **Activos serializados como base** y cantidad solo para accesorios. Recomendado: serializado.
3. **Maceta como activo separado** vinculado por `parent_asset_id`. Recomendado: sí.
4. **Ubicación interior descriptiva** (piso + punto + foto) sin editor de planos en el MVP.
5. Nombre de la vertical y del tipo de organización: `plant_rental`.

---

## Plan recomendado
1. Migración A: enum `asset_type` (+pot/accessory/composition) y enum `asset_lifecycle`.
2. Migración B: columnas nuevas en `assets`, `estates`, `zones`, `tasks`.
3. Migración C: `rental_contracts`, `asset_reservations`, `service_visits`, `asset_incidents`, `asset_movements` con RLS y GRANTs.
4. Tipo de organización `plant_rental` + navegación + onboarding.
5. Inventario y ficha de activo PlantOps.
6. Clientes y sedes.
7. Contratos y reservas con anti solape.
8. Visitas con evidencia.
9. Incidencias y reemplazos.
10. Portal de cliente + guía de cuidado combinada.

## Archivos que probablemente cambiarán
`src/App.tsx`, `src/components/layout/AppSidebar.tsx`, `src/components/layout/BottomNav.tsx`, `src/pages/Onboarding.tsx`, `src/pages/CRM.tsx`, `src/pages/Assets.tsx`, `src/pages/AssetDetail.tsx`, `src/contexts/EstateContext.tsx`, `src/lib/i18n.ts`, nuevas carpetas `src/pages/plantops/` y `src/components/plantops/`, `src/integrations/supabase/types.ts` (regenerado).

## Migraciones requeridas (sin ejecutar)
A) enums · B) columnas en tablas existentes · C) 5 tablas nuevas con RLS/GRANTs/triggers · D) política de lectura para rol `client`.

## Alcance que se va a posponer
IA de diagnóstico, IoT, marketplace, rutas optimizadas, contabilidad completa, e-commerce, reconocimiento de especies, predicción de mortalidad, apps separadas, automatizaciones no esenciales, editor gráfico de planos.

## Prompt de implementación sugerido
"Implementa Home Guide PlantOps según el plan aprobado, en este orden: (1) migraciones A, B y C exactamente como se describen, con RLS por `get_user_org_id` y GRANTs a authenticated/service_role; (2) tipo de organización `plant_rental` con navegación propia en AppSidebar/BottomNav/Onboarding y acceso a facturación; (3) rutas `/plantops`, `/plantops/inventory`, `/plantops/clients`, `/plantops/contracts`, `/plantops/visits`, `/plantops/incidents` reutilizando ModernAppLayout y los componentes existentes de assets/tasks/photos; (4) pestañas de Historial y Ubicación en AssetDetail; (5) validación por trigger de doble reserva; (6) portal de cliente con `client_access`. No toques las verticales residential, landscaping_company ni property_management. Todo el texto en EN/ES/DE vía i18n, sin iconos ni menciones de IA."
