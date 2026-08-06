# Home Guide PlantOps — Plan final corregido (delta de implementación)

Correcciones aplicadas: ubicación actual desacoplada de `assets.estate_id`; relación canónica única cliente→sede; datos comerciales aislados en `plantops_asset_details`; `reservado` deja de ser estado persistente; operaciones vía RPC transaccionales; anti doble reserva para planta y maceta; identidad estable del punto (`placement_slot_id`); portal solo por RPC; `tasks` sin reclasificar; migraciones completas y ordenadas; páginas nuevas reducidas a dos.

Hallazgos verificados que cambian el plan anterior:
- `organizations.org_type` es **TEXT** con default `'residential'` → **no hace falta migrar ningún enum de tipo de organización**. Solo `profiles.client_type` es enum (`property_owner`, `landscaping_company`, `hybrid`, `other`, `property_management`) y necesita el valor `plant_rental` si el onboarding lo escribe.
- `tasks` **no tiene** ningún campo de tipo/categoría/template (columnas: estate_id, zone_id, asset_id, title(_es), description(_es), frequency, due_date, status, assigned_to_user_id, assigned_vendor_id, required_photo, priority) → no hay campo reutilizable; el nuevo será **nullable sin default**.
- `clients.estate_id` existe y es nullable.
- `btree_gist` **no está instalada** (consultado `pg_extension`) → hay que crearla.
- Las 51 tablas de `public` tienen RLS habilitada con políticas; la organización activa proviene de `profiles.org_id` (`AuthContext` → `EstateContext`) y de `get_user_org_id(auth.uid())`, nunca de `user.id`.

## A. Modelo canónico final

| Concepto | Fuente de verdad |
|---|---|
| Propiedad del activo | `assets.estate_id` = sede base/bodega de Raíz y Forma. **Nunca se mueve.** |
| Ubicación actual | `plant_placements` con `status='installed'` y `ended_on IS NULL`. Si no hay fila abierta, el activo está en bodega. |
| Estado operativo persistente | `plantops_asset_details.operational_status` ∈ `available`, `installed`, `recovery`, `retired`. |
| Disponibilidad por fecha | **Calculada**: no existe si hay solape en `plant_placements` (status `reserved` o `installed`) para el rango pedido. Nunca se persiste `reservado`. |
| Contrato | `rental_contracts` (cliente + sede opcional + vigencia + precio + frecuencia + reglas de reemplazo). |
| Punto de colocación | `plant_placements.placement_slot_id` (UUID estable) + `zone_id` + `spot_label`. |
| Historial | Secuencia de filas de `plant_placements` por `asset_id` (historial del activo) y por `placement_slot_id` (historial del punto), más `tasks`/`task_completions`/`asset_photos`. |
| Cliente ↔ sede | **Canónica: `estates.client_id`**. `clients.estate_id` queda **legacy** (sede principal de otras verticales): PlantOps **lee y escribe solo `estates.client_id`** y nunca `clients.estate_id`; las pantallas de otras verticales no cambian. Sin trigger de sincronización para evitar bucles. |

Efecto en queries/RLS/portal: como el activo sigue perteneciendo al estate bodega, un cliente **no** puede ver sus plantas por RLS de `assets` — su acceso se resuelve exclusivamente por RPC (sección E). Las pantallas de PlantOps hacen join `plant_placements → assets` filtrando por `plant_placements.org_id`; las pantallas de otras verticales siguen filtrando por `assets.estate_id` sin cambios de comportamiento.

## B. Tablas nuevas y extensiones

**Nuevas (3):**
1. `plantops_asset_details` — 1:1 con `assets` (`asset_id` PK/FK), `org_id`, `operational_status` (CHECK 4 valores, default `available`), `condition_rating` smallint, `acquisition_date`, `supplier_name`, `cost`, `replacement_value`, `rental_price`, `currency`, `retired_reason`, timestamps + trigger. RLS: **solo** `org_id = get_user_org_id(auth.uid())`; GRANT a `authenticated` y `service_role`; **ningún acceso para rol cliente**.
2. `rental_contracts` — `org_id`, `client_id`, `estate_id` (nullable), `contract_type` CHECK (`recurring`,`event`), `status` CHECK (`draft`,`active`,`ended`), `starts_on`, `ends_on`, `price_amount`, `currency`, `billing_period`, `maintenance_frequency` (enum existente `task_frequency`), `replacement_rules`, `client_dos_donts`, `internal_notes`, timestamps + trigger. RLS solo interna.
3. `plant_placements` — `org_id`, `placement_slot_id uuid not null`, `asset_id` (FK assets), `pot_asset_id` (FK assets, nullable), `estate_id` (FK estates, sede del cliente), `zone_id` (nullable), `contract_id` (nullable), `spot_label`, `spot_notes`, `access_notes`, `reference_photo_url`, `status` CHECK (`reserved`,`installed`,`collected`,`cancelled`), `starts_on date not null`, `ends_on date null` (**inclusivo**), `installed_at`, `collected_at`, `cancelled_at`, timestamps + trigger. RLS solo interna.

**Extensiones mínimas:**
- `estates`: `+ client_id uuid null → clients(id) on delete set null`, índice.
- `zones`: `+ floor_label text null`.
- `tasks`: `+ plantops_kind text null` CHECK (`maintenance`,`incident`) **sin default** (las tareas históricas quedan NULL y no se reclasifican); `+ placement_id uuid null → plant_placements(id)`; `+ replacement_asset_id uuid null → assets(id)` = **planta sustituta** (la planta afectada es `tasks.asset_id`).
- `assets`: **sin columnas comerciales**. Solo `asset_type += 'pot'`.
- `profiles.client_type`: `+ 'plant_rental'`.

## C. Migraciones en orden exacto

1. **M1 – enums** (aislada, ADD VALUE no combinable): `asset_type += 'pot'`; `client_type += 'plant_rental'`. Datos: sin efecto. Rollback: valores quedan inertes.
2. **M2 – extensión**: `CREATE EXTENSION IF NOT EXISTS btree_gist;` (idempotente; si ya existe no falla). Rollback: no se elimina.
3. **M3 – columnas en tablas existentes sin FK nuevas hacia tablas por crear**: `estates.client_id` (+FK a `clients`, ya existe), `zones.floor_label`. Rollback: DROP COLUMN.
4. **M4 – `plantops_asset_details`**: tabla + GRANTs + RLS + política interna + trigger `updated_at`. Índice `(org_id, operational_status)`.
5. **M5 – `rental_contracts`**: tabla + GRANTs + RLS + trigger. Índices `(org_id,status)`, `(client_id)`.
6. **M6 – `plant_placements`**: tabla + FKs a `assets`, `estates`, `zones`, `rental_contracts` (ya existen) + GRANTs + RLS + trigger `updated_at` + trigger de validación de fechas (`ends_on >= starts_on`, no CHECK por depender de datos) + índices:
   - único parcial `(asset_id) WHERE status='installed' AND ends_on IS NULL`;
   - exclusión `EXCLUDE USING gist (asset_id WITH =, daterange(starts_on, COALESCE(ends_on,'infinity'::date) + 1, '[)') WITH &&) WHERE (status IN ('reserved','installed'))` → rango semiabierto que hace válida una reserva de un solo día y excluye `cancelled`/`collected`;
   - exclusión equivalente sobre `pot_asset_id` (con `WHERE pot_asset_id IS NOT NULL AND status IN ('reserved','installed')`);
   - índices `(placement_slot_id)`, `(estate_id,status)`, `(contract_id)`.
7. **M7 – columnas en `tasks`** (después de M6 para poder crear la FK `placement_id`): `plantops_kind`, `placement_id`, `replacement_asset_id` + índice `(placement_id)`.
8. **M8 – RPC** (funciones transaccionales de D y RPC de portal de E), todas `SECURITY DEFINER SET search_path = public`.

Regeneración de tipos: **una sola vez al final**, tras M8. Rollback global: DROP de las funciones, DROP de las 3 tablas nuevas, DROP de las columnas añadidas; los enums y `btree_gist` quedan sin efecto adverso.

## D. RPC transaccionales (internas)

Todas validan: `auth.uid()` no nulo, `get_user_org_id(auth.uid()) = org_id` del activo/contrato, rol owner/manager/crew según corresponda, y fechas coherentes. Cualquier violación → `RAISE EXCEPTION` (transacción completa revertida).

1. `plantops_reserve_asset(asset_id, pot_asset_id, estate_id, zone_id, contract_id, spot_label, starts_on, ends_on)` → valida org, que el activo no esté `retired`/`recovery`, y deja que la constraint de exclusión rechace solapes; inserta placement `reserved` con `placement_slot_id` nuevo (o el recibido opcionalmente). Devuelve el placement.
2. `plantops_install_asset(placement_id)` → placement `reserved`→`installed`, `installed_at=now()`, y `operational_status='installed'` para planta y maceta.
3. `plantops_collect_asset(placement_id, condition_rating, next_status)` → placement→`collected`, `ends_on=current_date`, `collected_at`, y `operational_status` = `available` | `recovery` | `retired` según inspección.
4. `plantops_replace_plant(placement_id, replacement_asset_id, cause, retired_status)` → en una sola transacción: cierra el placement actual (`collected`), marca la planta retirada (`recovery`/`retired` + `retired_reason`), crea el placement sustituto **con el mismo `placement_slot_id`, `zone_id`, `spot_label`, `contract_id` y maceta**, lo pone `installed`, y crea la tarea de incidencia (`plantops_kind='incident'`, `asset_id`=planta afectada, `replacement_asset_id`=sustituta).
5. `plantops_cancel_reservation(placement_id, reason)` → `reserved`→`cancelled` + `cancelled_at`, conservando el historial y liberando disponibilidad.
6. Auxiliar de lectura `plantops_check_availability(asset_id, starts_on, ends_on)` → boolean, para que la UI muestre "reservado" por fecha sin persistirlo.

## E. RLS y seguridad del cliente

Acceso directo por RLS (`org_id = get_user_org_id(auth.uid())`, roles internos owner/manager/crew): `plantops_asset_details`, `rental_contracts`, `plant_placements`, más las tablas existentes tal como están hoy.

Rol `client`: **sin ninguna política nueva** sobre las 3 tablas nuevas (RLS limita filas, no columnas). Obtiene datos únicamente por RPC `SECURITY DEFINER SET search_path = public` que validan `auth.uid()` contra `client_access` de esa `estate_id` y el flag correspondiente, devolviendo solo columnas autorizadas:
- `get_client_plant_placements(p_estate_id)` → especie, nombre comercial, foto, zona, `spot_label`, fecha de instalación. Sin `cost`, `replacement_value`, `rental_price`, `access_notes`, `spot_notes`, `internal_notes`.
- `get_client_rental_contracts(p_estate_id)` → tipo, vigencia, frecuencia, reglas de reemplazo y do/don't. Sin `internal_notes` ni `price_amount` (queda para segunda fase si Natalia lo autoriza).
- `get_client_maintenance_history(p_estate_id)` → visitas completadas, fecha, foto de evidencia, próxima visita, incidencias abiertas.
Cero confianza en el filtrado del frontend.

## F. Rutas y archivos reducidos

Nuevas rutas: **solo 2** → `/plantops` (dashboard y punto de entrada) y `/plantops/contracts` (dominio nuevo).

Se extienden con comportamiento condicionado a `org_type='plant_rental'`: `/assets` (estado operativo, disponibilidad por fecha, ubicación actual desde placement), `/estates` (sede vinculada a cliente + `floor_label` en zonas), `/crm` (clientes y sus sedes; permitir la vertical en el guard de `org_type`), `/tasks` (visitas e incidencias), `AssetDetail` (ubicación actual, historial del activo y del punto, reemplazos).

Eliminados del plan anterior: `src/pages/plantops/PlantInventory.tsx`, `src/pages/plantops/ClientSites.tsx`, `src/pages/plantops/Contracts.tsx` (renombrada a la única página de contratos), `src/components/plantops/AvailabilityBadge.tsx` como página, `ClientPlantPortal`, `PlantOpsDashboard` genérico, y toda pantalla nueva de portal de cliente.

Archivos modificados: `src/App.tsx`, `src/components/layout/AppSidebar.tsx`, `src/components/layout/BottomNav.tsx`, `src/pages/Onboarding.tsx`, `src/pages/CRM.tsx`, `src/pages/Assets.tsx`, `src/pages/AssetDetail.tsx`, `src/pages/Tasks.tsx`, `src/pages/EstateManagement.tsx`, `src/components/assets/AssetEditForm.tsx`, `src/lib/i18n.ts`, `src/integrations/supabase/types.ts` (regenerado una vez).

Archivos nuevos (7): `src/pages/plantops/PlantOpsHome.tsx`, `src/pages/plantops/PlantOpsContracts.tsx`, `src/components/plantops/PlacementDialog.tsx`, `src/components/plantops/PlacementHistoryList.tsx`, `src/components/plantops/ReplacementDialog.tsx`, `src/hooks/usePlacements.ts`, `src/hooks/usePlantOpsAsset.ts`.

Inventario por cantidad — alcance explícito: las plantas y macetas reservables para eventos **serán activos serializados** en `assets`; `inventory_items` sigue cubriendo consumibles y genéricos por cantidad; **el MVP no reserva por fecha artículos controlados solo por cantidad** (no existe entidad de líneas y cantidades y no se creará ahora).

## G. Casos de aceptación

1. Activo con `operational_status='available'` hoy y placement `reserved` el próximo mes: aparece disponible hoy y no disponible para ese rango vía `plantops_check_availability`.
2. Segunda reserva solapada de la misma planta → rechazada por la exclusión gist.
3. Segunda reserva solapada de la misma maceta (`pot_asset_id`) → rechazada.
4. `plantops_cancel_reservation` → placement `cancelled` conservado en historial y el rango vuelve a estar disponible.
5. `plantops_replace_plant` → el placement sustituto conserva `placement_slot_id`, `zone_id` y `spot_label`; el historial del punto muestra ambas plantas; la planta retirada conserva su historial.
6. Usuario con rol `client` autenticado: `select` directo a `plantops_asset_details`, `rental_contracts` y `plant_placements` devuelve 0 filas; las RPC devuelven solo columnas seguras.
7. Verticales `residential`, `landscaping_company`, `property_management`: rutas, tareas y activos se comportan igual; `tasks.plantops_kind` queda NULL en todo lo histórico.
8. Usuario de otra organización: 0 filas en las 3 tablas nuevas y excepción en toda RPC interna.
9. Una planta instalada nunca cambia `assets.estate_id`; su ubicación mostrada proviene del placement abierto.

## H. Prompt de implementación actualizado

"Implementa Home Guide PlantOps para la organización tipo `plant_rental` (campo TEXT `organizations.org_type`, no requiere enum) sin alterar las verticales residential, landscaping_company ni property_management.

Migraciones, en este orden exacto y en llamadas separadas donde se indica: M1 (aislada) `asset_type += 'pot'` y `client_type += 'plant_rental'`; M2 `CREATE EXTENSION IF NOT EXISTS btree_gist`; M3 columnas `estates.client_id` (FK a clients, índice) y `zones.floor_label`; M4 tabla `plantops_asset_details` 1:1 con assets (`operational_status` CHECK available/installed/recovery/retired default available, condition_rating, acquisition_date, supplier_name, cost, replacement_value, rental_price, currency, retired_reason) con GRANTs a authenticated/service_role, RLS solo `org_id = get_user_org_id(auth.uid())` y trigger updated_at; M5 tabla `rental_contracts`; M6 tabla `plant_placements` con `placement_slot_id uuid not null`, status CHECK reserved/installed/collected/cancelled, `ends_on` inclusivo, índice único parcial de activo instalado y dos constraints EXCLUDE USING gist (una por `asset_id`, otra por `pot_asset_id`) sobre `daterange(starts_on, coalesce(ends_on,'infinity')+1,'[)')` con `WHERE status IN ('reserved','installed')`, más trigger de validación de fechas; M7 columnas en `tasks`: `plantops_kind text null` CHECK maintenance/incident **sin default**, `placement_id` FK a plant_placements, `replacement_asset_id` FK a assets (planta sustituta; la afectada es `tasks.asset_id`); M8 funciones SECURITY DEFINER SET search_path = public: `plantops_reserve_asset`, `plantops_install_asset`, `plantops_collect_asset`, `plantops_replace_plant`, `plantops_cancel_reservation`, `plantops_check_availability`, `get_client_plant_placements`, `get_client_rental_contracts`, `get_client_maintenance_history` (las tres últimas validan `client_access` y devuelven solo columnas seguras, sin costos, precios, notas internas ni `access_notes`). Regenera tipos una sola vez al final.

Reglas de modelo: `assets.estate_id` es la bodega y nunca se mueve; la ubicación actual se calcula desde el placement abierto; `estates.client_id` es la relación canónica cliente→sede y PlantOps no lee ni escribe `clients.estate_id`; no se añaden columnas comerciales a `assets`; `reservado` no se persiste como estado.

Frontend: crea solo `/plantops` (dashboard) y `/plantops/contracts`; extiende `/assets`, `/estates`, `/crm`, `/tasks` y `AssetDetail` condicionando por `org_type='plant_rental'`; archivos nuevos: `src/pages/plantops/PlantOpsHome.tsx`, `src/pages/plantops/PlantOpsContracts.tsx`, `src/components/plantops/PlacementDialog.tsx`, `src/components/plantops/PlacementHistoryList.tsx`, `src/components/plantops/ReplacementDialog.tsx`, `src/hooks/usePlacements.ts`, `src/hooks/usePlantOpsAsset.ts`. Toda mutación de reserva, instalación, recolección, reemplazo y cancelación se hace por RPC, nunca con updates sueltos desde el cliente. No construyas pantallas nuevas de portal de cliente. Textos EN/ES/DE en `src/lib/i18n.ts`, sin iconos ni menciones de IA."
