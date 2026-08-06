# Home Guide PlantOps — Plan revisado (delta mínimo, piloto Raíz y Forma)

Cambio principal frente a la versión anterior: se eliminan `client_sites`, `service_visits`, `asset_reservations`, `asset_incidents`, `asset_movements` y `asset_lifecycle` como entidades nuevas. Quedan **2 tablas nuevas** y **1 valor de enum**. Todo lo demás se resuelve extendiendo lo que ya existe.

## A. Estado real encontrado (verificado)

Rutas actuales (`src/App.tsx`): `/`, `/map`, `/tasks`, `/assets`, `/assets/:id`, `/documents`, `/admin`, `/inventory`, `/plants`, `/checkin`, `/reports`, `/estates`, `/labor`, `/topography`, `/subscription`, `/compost`, `/crm`, `/financials`, `/setup-wizard`, `/requests`, `/my-jobs`, `/my-profile`, `/jobs`, `/worker/:id`, `/jobs/post`.

Tablas relevantes ya existentes: `organizations`, `profiles`, `user_roles`, `estates`, `zones`, `assets`, `asset_photos`, `plant_profiles`, `plant_instances`, `tasks`, `task_templates`, `task_completions`, `clients`, `client_access`, `client_invites`, `documents`, `inventory_items`, `tool_assignments`, `qr_labels`, `vendors`, `invoices`, `invoice_items`, `product_catalog`, `client_payments`, `checkins`.

Componentes reutilizables: `ModernAppLayout`, `AppSidebar`, `BottomNav`, `EstateMap`, `LocationPickerDialog`, `AssetEditForm`, `AssetPhotoUpload`, `AssetQRCode`, `MaintenanceInfoCard`, `PlantProfileLinker`, `CareProtocolSheet`, `TaskCompletionDialog`, `TaskCalendar`, `ClientAccessManager`, `AssetTypeIcon`, `NoEstateGuide`, `CurrencyPicker`.

Hooks reutilizables: `useAuth`, `useEstate`, `useClientAccess`, `useGeolocation`, `usePhotoCapture`, `useLanguage`, `useCurrency`.

Roles y RLS (verificado): **las 51 tablas de `public` tienen RLS habilitada y al menos una política**. La organización activa **no** se deriva de `user.id`: viene de `profiles.org_id`, leído en `AuthContext` y usado por `EstateContext` (`estates` filtrados por `org_id`) y por las políticas mediante `get_user_org_id(auth.uid())`. Roles en `user_roles` con enum `app_role`: owner, manager, crew, vendor, worker_marketplace, client. Existe `get_client_permissions(user, estate)` con 8 flags y `has_role`.

Funciones que ya resuelven parcialmente PlantOps: jerarquía `estates → zones → assets`; evidencia con `asset_photos` + `task_completions` (foto + GPS obligatorio); QR por activo (`qr_labels` + `QRScannerView`); guía de cuidado por especie (`plant_profiles.care_template_json` EN/ES/DE); mantenimiento recurrente (`tasks.frequency` + `task_templates` + cron `auto-maintenance-tasks`); portal de cliente (`client_access` + `useClientAccess`).

## B. Cambios mínimos

| Necesidad | Reutilizar | Extender | Crear | Justificación |
|---|---|---|---|---|
| Cliente y contacto | `clients` (name, email, phone, address, notes, estate_id) | — | — | Ya cubre contacto principal; no se crea tabla `contacts` en el MVP. |
| Sede | `estates` | `+ client_id` | — | `estates` ya es el nodo de jerarquía usado por zonas, activos, tareas, documentos, mapa y RLS. Crear `client_sites` duplicaría toda esa cadena. |
| Piso / área / zona | `zones` | `+ floor_label` | — | `zones` ya agrupa activos y tiene color y geometría opcional. |
| Planta serializada | `assets` (+`plant_instances` para especie) | `+ availability`, `+ condition_rating`, costo, valor de reposición, precio de alquiler, proveedor, fecha de adquisición | — | `assets` ya tiene fotos, QR, tareas, mapa y RLS. |
| Maceta / accesorio serializado | `assets` | `asset_type += 'pot'` (accesorio usa `equipment`) | — | Maceta es un activo con historial propio; separada de la planta. |
| Inventario por cantidad (platos, sustrato, macetas genéricas) | `inventory_items` (`quantity`, `unit`, `condition`) | — | — | Ya es exactamente inventario por cantidad. |
| Instalación (planta en un punto de un cliente, con fechas) | — | — | **`plant_placements`** | Es la única relación que hoy no existe: activo × punto × contrato × rango de fechas. Resuelve a la vez instalación, ubicación actual, movimientos, historial y reserva por fechas. |
| Punto de colocación | `zones` + campos descriptivos en `plant_placements` | — | — | El punto es propiedad de la instalación, no una tabla nueva. |
| Contrato de alquiler y evento | — | — | **`rental_contracts`** | No existe; `invoices` es facturación, no vigencia ni reglas. |
| Visita de mantenimiento | `tasks` + `task_completions` + `asset_photos` | `+ placement_id` | — | `tasks` ya tiene frecuencia, vencimiento, asignación, foto obligatoria y estados. Crear `service_visits` duplicaría tareas. |
| Incidencia / reemplazo | `tasks` | `+ task_kind` ('maintenance' \| 'incident'), `+ replaced_asset_id` | — | Una incidencia es una tarea con origen distinto; evita duplicar órdenes de trabajo. |
| Movimientos e historial | `plant_placements` (filas cerradas con `ended_at`) | — | — | El historial es la secuencia de placements; no hace falta `asset_movements`. |
| Evidencia fotográfica | `asset_photos` + `task_completions.photo_url` | — | — | No se crea tabla de evidencias. |
| Documentos y contrato PDF | `documents` (categoría `vendor_contract`) | — | — | Ya existe. |
| Portal de cliente | `client_access`, `client_invites`, `useClientAccess`, `ClientAccessManager` | políticas de lectura para `client` en `plant_placements` y `rental_contracts` | — | Ya hay flags por sede y rol `client`. |
| Precio y facturación | `rental_contracts` (precio, modalidad) | — | — | Sin facturación nueva; `invoices` existente queda opcional. |

Los tres conceptos quedan separados así:
- **Inventario propio** = `assets` de la sede-bodega de Raíz y Forma (`estates.client_id IS NULL`), o `inventory_items` si es por cantidad.
- **Activo instalado temporalmente** = fila abierta en `plant_placements` (`ended_at IS NULL`).
- **Punto de colocación** = `zone_id` + descripción/foto/indicaciones dentro de `plant_placements`.

## C. Migraciones exactas (sin SQL todavía)

**M1 — enum de tipo de activo**
- Tabla: tipo `asset_type`. Añade `'pot'`. Migración aislada (ADD VALUE no admite uso en la misma transacción).
- Datos afectados: ninguno. Rollback: no se elimina el valor; queda inerte.

**M2 — extensiones de columnas**
- `estates`: `+ client_id uuid null references clients(id) on delete set null`, índice `(client_id)`.
- `zones`: `+ floor_label text null`.
- `assets`: `+ availability text not null default 'instalado'` con CHECK en 5 valores, `+ condition_rating smallint null` (1–5), `+ acquisition_date date`, `+ supplier_name text`, `+ cost numeric`, `+ replacement_value numeric`, `+ rental_price numeric`, `+ currency text default 'CRC'`, `+ retired_reason text`. Índice `(estate_id, availability)`.
- `tasks`: `+ task_kind text not null default 'maintenance'` con CHECK ('maintenance','incident'), `+ placement_id uuid null`, `+ replaced_asset_id uuid null references assets(id)`. Índice `(placement_id)`.
- Datos afectados: filas existentes toman los defaults; ninguna vertical actual cambia de comportamiento. Rollback: `DROP COLUMN` de cada columna nueva.

**M3 — `rental_contracts` (nueva)**
- Columnas: `id`, `org_id` (not null), `client_id` (not null), `estate_id` (null = multi-sede), `contract_type` CHECK ('recurring','event'), `status` CHECK ('draft','active','ended'), `starts_on`, `ends_on`, `price_amount`, `currency`, `billing_period` CHECK ('monthly','event','other'), `maintenance_frequency` (reutiliza enum `task_frequency`), `replacement_rules text`, `client_dos_donts text`, `internal_notes text`, `created_at`, `updated_at` + trigger.
- Índices: `(org_id, status)`, `(client_id)`.
- RLS: lectura/escritura para `authenticated` cuando `org_id = get_user_org_id(auth.uid())`; lectura para rol `client` cuando existe `client_access` sobre `estate_id` (sin exponer `internal_notes`: el portal selecciona columnas explícitas y una política aparte por vista o selección controlada en frontend con columnas limitadas).
- GRANTs: `authenticated` (CRUD) y `service_role` (ALL). Sin `anon`.
- Rollback: `DROP TABLE`.

**M4 — `plant_placements` (nueva, corazón del módulo)**
- Columnas: `id`, `org_id`, `asset_id` (not null → `assets`), `pot_asset_id` (null → `assets`), `estate_id` (not null), `zone_id` (null), `contract_id` (null → `rental_contracts`), `spot_label text`, `spot_notes text`, `access_notes text`, `reference_photo_url text`, `status` CHECK ('reserved','installed','collected'), `starts_on date not null`, `ends_on date null`, `installed_at`, `collected_at`, `created_at`, `updated_at` + trigger.
- Constraints/índices: índice único parcial `(asset_id) where status='installed' and ends_on is null` (un activo no puede estar instalado en dos puntos); constraint de exclusión sobre `(asset_id, daterange(starts_on, coalesce(ends_on,'infinity')))` para bloquear doble reserva de eventos (requiere `btree_gist`); índices `(estate_id, status)`, `(contract_id)`.
- Validaciones dependientes de fechas mediante **trigger**, no CHECK.
- RLS: igual patrón `org_id = get_user_org_id(auth.uid())`; lectura para rol `client` limitada a `estate_id` con `client_access.can_view_assets`.
- Datos afectados: ninguno (tabla nueva). Rollback: `DROP TABLE`.

**M5 — políticas de portal** (puede ir junto a M3/M4): añadir SELECT para `client` en `plant_placements` y `rental_contracts`; no se toca ninguna política existente.

## D. Archivos exactos

Se modifican: `src/App.tsx` (4 rutas nuevas), `src/components/layout/AppSidebar.tsx` (rama `plant_rental`), `src/components/layout/BottomNav.tsx`, `src/pages/Onboarding.tsx` (tipo de organización), `src/pages/CRM.tsx` (permitir la vertical en el guard de `org_type`), `src/pages/Assets.tsx` (badge de disponibilidad y filtro), `src/pages/AssetDetail.tsx` (bloque de ubicación actual + historial), `src/pages/Tasks.tsx` (distinguir `task_kind`), `src/components/assets/AssetEditForm.tsx` (campos comerciales), `src/lib/i18n.ts`, `src/integrations/supabase/types.ts` (regenerado).

Se crean: `src/pages/plantops/PlantOpsHome.tsx`, `src/pages/plantops/PlantInventory.tsx`, `src/pages/plantops/Contracts.tsx`, `src/pages/plantops/ClientSites.tsx`, `src/components/plantops/PlacementDialog.tsx`, `src/components/plantops/PlacementHistoryList.tsx`, `src/components/plantops/AvailabilityBadge.tsx`, `src/components/plantops/ContractDialog.tsx`, `src/components/plantops/EventReservationDialog.tsx`, `src/components/plantops/IncidentDialog.tsx`, `src/hooks/usePlacements.ts`, `src/hooks/useContracts.ts`.

## E. Flujo vertical completo

Alquiler recurrente:
1. Cliente → `clients` en `/plantops/clients`.
2. Sede → `estates` con `client_id`; zona/piso → `zones` con `floor_label`.
3. Planta → `assets` (`asset_type='plant'`, `availability='disponible'`, sede-bodega) + `plant_instances` para especie. Maceta → `assets` (`asset_type='pot'`).
4. Instalación → `plant_placements` con `asset_id` = planta, `pot_asset_id` = maceta, `zone_id`, `spot_label`, `reference_photo_url`, `status='installed'`. Ambos activos conservan su ficha e historial propios.
5. Contrato → `rental_contracts`; la instalación se vincula con `contract_id`.
6. Visita → `tasks` (`task_kind='maintenance'`, `frequency` del contrato, `estate_id`, `placement_id`).
7. Mantenimiento → `TaskCompletionDialog` genera `task_completions` con foto + GPS; fotos adicionales a `asset_photos`.
8. Deterioro → `assets.condition_rating` bajo + `tasks` con `task_kind='incident'`.
9. Retiro → placement se cierra (`status='collected'`, `ended_at`), el activo pasa a `en_recuperacion`; la fila queda como historial.
10. Sustituta → nuevo `plant_placements` en el mismo `zone_id`/`spot_label`, con `replaced_asset_id` en la tarea de incidencia.
11. Retirada → `availability='en_recuperacion'` o `'dado_de_baja'` con `retired_reason`.
12. Cliente ve solo lo autorizado: `client_access` sobre su `estate_id`; el portal consulta columnas explícitas y nunca `cost`, `replacement_value`, `internal_notes` ni activos de otras sedes.

Evento:
Contrato `contract_type='event'` con fechas → un `plant_placements` por planta con `status='reserved'` y rango → la constraint de exclusión impide doble reserva → despacho: `status='installed'` + `installed_at` → recolección: `status='collected'` + `collected_at` → inspección: `condition_rating` → activo vuelve a `disponible`, `en_recuperacion` o `dado_de_baja`.

Estados finales (mínimos y justificados):
- `assets.availability`: `disponible` (se puede reservar), `reservado` (bloqueado por fechas), `instalado` (en cliente), `en_recuperacion` (no ofertable), `dado_de_baja` (fuera de inventario). Cada uno controla el filtro del selector de inventario y el tablero de PlantOps.
- `plant_placements.status`: `reserved`, `installed`, `collected` — habilitan reserva → despacho → cierre e historial.
- `rental_contracts.status`: `draft`, `active`, `ended` — controlan qué contratos generan visitas.
- Sin enums nuevos de visita ni de incidencia: se usan `task_status` y `task_kind`.

## F. Alcance por prioridad

MVP obligatorio: M1–M5; tipo de organización y navegación; clientes y sedes; inventario de plantas y macetas con disponibilidad; instalación y ubicación actual; contratos recurrentes y de evento con precio y fechas; visitas desde `tasks`; incidencias y reemplazo; historial y evidencia; portal de cliente restringido.

Segunda fase: tabla de contactos múltiples por cliente; cotizaciones; facturación automática desde contrato; coordenadas sobre imagen de plano; reportes PDF de PlantOps; alertas de próxima visita.

No construir: IA, IoT, rutas, marketplace, contabilidad completa, e-commerce, automatizaciones complejas, diseñador de planos, app móvil separada, analítica avanzada, rentabilidad por cliente o especie.

## G. Costo técnico relativo

- Bajo: M1, M2, navegación y tipo de organización, badges y filtros en `Assets.tsx`, clientes y sedes.
- Medio: `rental_contracts` + pantalla de contratos; visitas sobre `tasks`; incidencias y reemplazo; portal de cliente.
- Alto: `plant_placements` con constraint de exclusión y trigger anti solape, más el diálogo de instalación/reserva y el historial en `AssetDetail`. Es el bloque que más créditos y riesgo concentra; conviene ejecutarlo solo y validarlo antes de seguir.
- Riesgo secundario: regeneración de `types.ts` tras cada migración obliga a re-tocar pantallas; por eso se agrupan M2–M5 en el menor número de pasos posible.

## H. Prompt final de implementación

"Implementa Home Guide PlantOps con alcance reducido, en este orden y sin tocar las verticales residential, landscaping_company ni property_management:
1. Migración M1: añade `'pot'` al enum `asset_type`.
2. Migración M2: columnas nuevas en `estates` (`client_id`), `zones` (`floor_label`), `assets` (`availability` con CHECK de 5 valores y default `instalado`, `condition_rating`, `acquisition_date`, `supplier_name`, `cost`, `replacement_value`, `rental_price`, `currency`, `retired_reason`) y `tasks` (`task_kind`, `placement_id`, `replaced_asset_id`), con sus índices.
3. Migración M3/M4/M5: crea `rental_contracts` y `plant_placements` con GRANTs a authenticated/service_role, RLS por `get_user_org_id(auth.uid())`, lectura para rol `client` vía `client_access`, índice único parcial de activo instalado y exclusión por rango de fechas con btree_gist, más triggers de `updated_at` y de validación de fechas.
4. Tipo de organización `plant_rental`: navegación en `AppSidebar.tsx` y `BottomNav.tsx`, opción en `Onboarding.tsx`, y acceso permitido en el guard de `CRM.tsx`.
5. Rutas `/plantops`, `/plantops/inventory`, `/plantops/clients`, `/plantops/contracts` en `src/App.tsx`, reutilizando `ModernAppLayout` y los patrones de tarjeta de `Assets.tsx`.
6. Instalaciones: `PlacementDialog`, `EventReservationDialog`, `PlacementHistoryList`, `usePlacements`, más bloque de ubicación actual e historial en `AssetDetail.tsx`.
7. Visitas e incidencias sobre `tasks` reutilizando `TaskCompletionDialog` y `AssetPhotoUpload`; `IncidentDialog` cierra el placement, marca el activo y crea el placement sustituto.
8. Portal de cliente con `useClientAccess`, seleccionando columnas explícitas y nunca `cost`, `replacement_value` ni `internal_notes`.
No crees `client_sites`, `service_visits`, `asset_reservations`, `asset_incidents` ni `asset_movements`. Todo el texto en EN/ES/DE vía `src/lib/i18n.ts`, sin iconos ni menciones de IA."
