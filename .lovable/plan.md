# Home Guide PlantOps — Correcciones finales (aprobado para implementación tras este delta)

## 1. Esquema final de las tres tablas

**`plantops_asset_details`** (1:1 con `assets`)
- `asset_id uuid primary key references public.assets(id) on delete cascade`
- `org_id uuid not null`
- `lifecycle_status text not null default 'active'` CHECK (`active`,`recovery`,`retired`) — **no persiste `installed` ni `available`**
- `condition_rating smallint null` (1–5), `acquisition_date date`, `supplier_name text`, `cost numeric`, `replacement_value numeric`, `rental_price numeric`, `currency text default 'CRC'`, `retired_reason text`
- `created_at`, `updated_at` + trigger `update_updated_at_column`
- Índice `(org_id, lifecycle_status)`

Condición operativa **calculada** (nunca almacenada): `retired` si `lifecycle_status='retired'`; `recovery` si `='recovery'`; `installed` si existe placement con `status='installed' and installed_at is not null and collected_at is null`; `available` si `active` y no existe placement activo.

**`rental_contracts`**
- `id`, `org_id not null`, `client_id not null references public.clients(id)`, `estate_id uuid null references public.estates(id)`
- `contract_type text not null` CHECK (`recurring`,`event`), `status text not null default 'draft'` CHECK (`draft`,`active`,`ended`)
- `starts_on date not null`, `ends_on date null`, `price_amount numeric`, `currency text default 'CRC'`, `billing_period text` CHECK (`monthly`,`event`,`other`), `maintenance_frequency public.task_frequency null`
- `replacement_rules text`, `client_dos_donts text`, `internal_notes text`, timestamps + trigger
- Índices `(org_id,status)`, `(client_id)`

**`plant_placements`** — fechas planificadas separadas de la ejecución real
- `id`, `org_id not null`, `placement_slot_id uuid not null`
- `asset_id uuid not null references public.assets(id)`, `pot_asset_id uuid null references public.assets(id)`
- `estate_id uuid not null references public.estates(id)`, `zone_id uuid null references public.zones(id)`, `contract_id uuid null references public.rental_contracts(id)`
- `spot_label text`, `spot_notes text`, `access_notes text`, `reference_photo_path text` (ruta en bucket privado, no URL)
- `status text not null` CHECK (`reserved`,`installed`,`collected`,`cancelled`)
- `reserved_from timestamptz not null`, `reserved_until timestamptz null` (rango semiabierto `[reserved_from, reserved_until)`; NULL = recurrente indefinido)
- `installed_at timestamptz null`, `collected_at timestamptz null`, `cancelled_at timestamptz null`
- `condition_at_collection smallint null`, timestamps + trigger

Constraints e índices:
- Trigger de validación: `reserved_until > reserved_from` cuando no es NULL; `installed_at`/`collected_at` coherentes; `collected_at >= installed_at`. **La recolección nunca sobrescribe `reserved_until`.**
- Único parcial: `(asset_id) WHERE status='installed' AND collected_at IS NULL`; igual para `(pot_asset_id) WHERE pot_asset_id IS NOT NULL AND status='installed' AND collected_at IS NULL`.
- Exclusión GIST sobre el **periodo efectivo** = `tstzrange(reserved_from, COALESCE(collected_at, reserved_until, 'infinity'), '[)')`:
  - `EXCLUDE USING gist (asset_id WITH =, <periodo> WITH &&) WHERE (status IN ('reserved','installed'))`
  - idéntica sobre `pot_asset_id` con `WHERE pot_asset_id IS NOT NULL AND status IN ('reserved','installed')`
  - `cancelled` y `collected` no bloquean; al recoger, el periodo se cierra en `collected_at`, por lo que **un reemplazo el mismo día no genera solape** (el sustituto arranca en `collected_at`).
- Índices `(placement_slot_id)`, `(estate_id,status)`, `(contract_id)`, `(asset_id,status)`.

## 2. Migraciones en orden

1. **M1** (aislada): `asset_type += 'pot'`; `client_type += 'plant_rental'`.
2. **M2**: `CREATE EXTENSION IF NOT EXISTS btree_gist;` (idempotente).
3. **M3**: `estates.client_id` (FK a `clients`, índice), `zones.floor_label`.
4. **M4**: `plantops_asset_details` + GRANTs + RLS + políticas + trigger.
5. **M5**: `rental_contracts` + GRANTs + RLS + políticas + trigger.
6. **M6**: `plant_placements` + FKs + GRANTs + RLS + políticas + triggers + índices únicos parciales + 2 exclusiones GIST.
7. **M7**: `tasks.plantops_kind text null` CHECK(`maintenance`,`incident`) sin default, `tasks.placement_id` FK a `plant_placements`, `tasks.replacement_asset_id` FK a `assets`.
8. **M8**: las 10 funciones + `REVOKE`/`GRANT EXECUTE`.
9. Bucket privado de fotos (herramienta de storage, no SQL) + políticas en `storage.objects`.
10. Regeneración de tipos **una sola vez** al final. Rollback: DROP de funciones, de las 3 tablas y de las columnas nuevas.

## 3. Políticas RLS exactas por rol

Para las tres tablas nuevas, `anon` sin GRANT; `authenticated` con CRUD; `service_role` con ALL.

- **SELECT interno**: `TO authenticated USING (org_id = public.get_user_org_id(auth.uid()) AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'crew')))` → un perfil con rol `client` en la misma organización obtiene **cero filas**.
- **INSERT/UPDATE/DELETE en `plantops_asset_details` y `rental_contracts`**: solo `owner`/`manager`, con `USING` y `WITH CHECK` que exigen `org_id = get_user_org_id(auth.uid())`.
- **`plant_placements`**: sin políticas de INSERT/UPDATE/DELETE para `authenticated` (ni owner, ni manager, ni crew). Todas las mutaciones pasan exclusivamente por las 5 RPC; `service_role` conserva acceso administrativo. Crew tiene solo SELECT.
- **`client`**: ninguna política de SELECT/INSERT/UPDATE/DELETE en las tres tablas. Su único acceso son las 3 RPC de portal.

## 4. Firmas y efectos de las RPC

Todas: `SECURITY DEFINER`, `SET search_path = public`, tablas calificadas con `public.`, `IF auth.uid() IS NULL THEN RAISE EXCEPTION`, organización resuelta con `get_user_org_id(auth.uid())` (**nunca desde parámetros**), `REVOKE ALL ON FUNCTION ... FROM PUBLIC`, `GRANT EXECUTE TO authenticated` (y `service_role` en las internas).

Validaciones de dominio comunes: `asset_id` es `asset_type='plant'`; `pot_asset_id` es `'pot'`; planta ≠ maceta; ambos activos de la organización; ninguno en `recovery`/`retired`; `estate_id` pertenece a la organización y su `client_id` coincide con el del contrato; si `rental_contracts.estate_id` no es NULL debe igualar el `estate_id` del placement; `zone_id` pertenece a ese `estate_id`; contrato en `draft` o `active`; transición de estado válida.

1. `plantops_reserve_asset(p_asset_id, p_pot_asset_id, p_estate_id, p_zone_id, p_contract_id, p_spot_label, p_reserved_from timestamptz, p_reserved_until timestamptz, p_placement_slot_id uuid default null)` → inserta placement `reserved` (slot nuevo si no se envía). Efecto: fila `reserved`; la exclusión GIST rechaza solapes de planta o maceta.
2. `plantops_install_asset(p_placement_id, p_installed_at default now())` → exige `status='reserved'`; pasa a `installed`, fija `installed_at`. No toca `lifecycle_status`.
3. `plantops_collect_asset(p_placement_id, p_condition_rating, p_next_lifecycle text)` → exige `status='installed' AND collected_at IS NULL`; pasa a `collected`, fija `collected_at=now()`, conserva `reserved_until`; ajusta `lifecycle_status` a `active`, `recovery` o `retired` (nunca `installed`/`available`).
4. `plantops_replace_plant(p_placement_id, p_replacement_asset_id, p_cause, p_retired_lifecycle)` → transacción única: recoge el placement actual; marca la planta retirada (`recovery`/`retired` + `retired_reason`); verifica que la sustituta esté disponible para el periodo restante; crea placement `installed` con el **mismo `placement_slot_id`**, `zone_id`, `spot_label`, `contract_id` y maceta, con `reserved_from = collected_at`; crea tarea `plantops_kind='incident'` (`asset_id`=planta afectada, `replacement_asset_id`=sustituta).
5. `plantops_cancel_reservation(p_placement_id, p_reason)` → exige `status='reserved'`; pasa a `cancelled` + `cancelled_at`; libera disponibilidad y conserva historial.
6. `plantops_check_availability(p_asset_id, p_pot_asset_id, p_from timestamptz, p_to timestamptz)` → boolean; comprueba `lifecycle_status='active'` y ausencia de solape en el periodo efectivo para planta **y** maceta.
7. `plantops_get_current_location(p_asset_id)` → estate, zona, `spot_label`, `placement_slot_id`, `installed_at`, cliente; NULL si está en bodega.
8. `get_client_plant_placements(p_estate_id)` → valida `client_access.can_view_assets` para `auth.uid()` en esa sede; devuelve especie, nombre, foto firmada, zona, `spot_label`, `installed_at`. Sin costos, precios, `spot_notes`, `access_notes`.
9. `get_client_rental_contracts(p_estate_id)` → valida `can_view_documents`; devuelve tipo, vigencia, frecuencia, `replacement_rules`, `client_dos_donts`. Sin `internal_notes` ni `price_amount`.
10. `get_client_maintenance_history(p_estate_id)` → valida `can_view_tasks` (y `can_view_photos` para las fotos); devuelve visitas completadas, fecha, evidencia, próxima visita, incidencias abiertas.

## 5. Transiciones de estado

`reserved → installed` · `reserved → cancelled` · `installed → collected` · `installed → collected` + nuevo placement `installed` en el mismo slot (reemplazo). Cualquier otra transición → excepción. `lifecycle_status`: `active ↔ recovery`, `active|recovery → retired` (terminal).

## 6. Fotografías

No se reutilizan `asset-photos` ni `photos` porque ambos son **públicos** y expondrían fotos de sedes de otros clientes por URL. Se crea un bucket **privado** `plantops-photos` (vía herramienta de storage, nunca SQL sobre `storage.buckets`).
- Ruta: `{org_id}/{placement_id}/{uuid}.jpg`.
- Subida: solo `authenticated` cuyo `get_user_org_id(auth.uid())` coincida con el primer segmento de la ruta (política en `storage.objects` con función auxiliar equivalente a la existente `user_can_write_asset_photo`).
- Lectura interna: misma condición de organización.
- Cliente: no lee el bucket; las RPC de portal devuelven **URL firmada** de corta duración solo para placements de sus sedes autorizadas.
- Al ser privado, ninguna URL pública puede filtrar fotos de otras sedes.

## 7. Ajustes al prompt de implementación

Añadir al prompt aprobado, reemplazando lo correspondiente:
- `plant_placements` usa `reserved_from`/`reserved_until`/`installed_at`/`collected_at`/`cancelled_at` y `reference_photo_path`; las exclusiones GIST operan sobre `tstzrange(reserved_from, coalesce(collected_at, reserved_until,'infinity'),'[)')` para `asset_id` y para `pot_asset_id`, con `WHERE status IN ('reserved','installed')`; la recolección no altera `reserved_until`.
- `plantops_asset_details` usa `lifecycle_status` (`active`,`recovery`,`retired`); la condición operativa se calcula, nunca se persiste `installed`/`available`.
- RLS por rol con `has_role()` + `get_user_org_id()`, `WITH CHECK` en toda escritura, `crew` limitado a ejecución, `client` sin acceso directo.
- Las 10 funciones con `SECURITY DEFINER`, `SET search_path = public`, validación de `auth.uid()`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated`, todas las validaciones de dominio y de transición listadas.
- Bucket privado `plantops-photos` con ruta `{org_id}/{placement_id}/` y URLs firmadas para el cliente.
- Sin páginas, módulos ni tablas adicionales: solo `/plantops`, `/plantops/contracts` y las extensiones condicionadas por `org_type='plant_rental'`.

## 8. Casos de aceptación actualizados

1. Planta con `lifecycle_status='active'` y reserva futura: disponible hoy, no disponible en ese rango (`plantops_check_availability`).
2. Evento instalado con `reserved_until` futuro aparece como ubicación actual (`installed_at` no nulo, `collected_at` nulo).
3. Reserva solapada de la misma planta → rechazada; de la misma maceta → rechazada.
4. Reserva de un solo día (`reserved_until = reserved_from + 1 día`) → aceptada.
5. Reemplazo el mismo día → aceptado sin falso solape; el sustituto conserva `placement_slot_id`.
6. Recolección → `collected_at` fijado, `reserved_until` intacto, historial cerrado.
7. Cancelación → `cancelled`, rango liberado, historial conservado.
8. Usuario con rol `client` de la misma organización → 0 filas en las tres tablas; solo las RPC devuelven datos, sin costos ni notas internas, y falla si el flag de `client_access` está apagado.
9. Usuario de otra organización → 0 filas y excepción en toda RPC interna.
10. Verticales existentes sin cambios: `tasks.plantops_kind` NULL en histórico, `assets.estate_id` inalterado.
11. Foto de placement no accesible por URL pública; el bucket es privado y el rol `client` no puede leerlo.

## 9. Correcciones obligatorias durante la implementación (aprobadas)

1. `plant_placements`: SELECT directo solo para owner/manager/crew de la organización. **Sin INSERT/UPDATE/DELETE para `authenticated`** (tampoco owner/manager); todas las mutaciones pasan por las 5 RPC. `service_role` conserva acceso administrativo. `plantops_asset_details` y `rental_contracts`: CRUD directo para owner/manager, solo lectura para crew.
2. Las RPC del portal devuelven `reference_photo_path`, nunca una URL pública ni firmada. La generación de URLs firmadas queda **pendiente explícito de segunda fase** (no se crea Edge Function nueva ahora).
3. Políticas de `plantops-photos` (privado): exigen usuario autenticado, `get_user_org_id(auth.uid())` igual al primer segmento de la ruta y rol interno owner/manager/crew. El rol `client` no puede leer, subir, modificar ni borrar. Ruta `{org_id}/{placement_id}/{uuid}.jpg`.
4. Constraints: `condition_rating` y `condition_at_collection` entre 1 y 5 o NULL; `cost`, `replacement_value`, `rental_price`, `price_amount` ≥ 0 o NULL; `ends_on >= starts_on` o NULL; `reserved_until > reserved_from` o NULL; `pot_asset_id <> asset_id`; coherencia estado/timestamps por trigger; rangos con `'infinity'::timestamptz` explícito.
5. Todo activo `plant`/`pot` creado o editado en una organización `plant_rental` crea o actualiza su fila en `plantops_asset_details`; reservar sin esa fila falla. No se generan detalles para activos históricos de otras verticales.
6. `plantops_replace_plant` cierra la instalación anterior, conserva `placement_slot_id` y la maceta, marca la planta retirada, instala la sustituta y crea la tarea de incidencia **ya completada** con su `task_completions` correspondiente.
7. Orden de ejecución: M1–M8 → bucket y políticas → regeneración única de tipos → hooks y servicios → `/plantops` → `/plantops/contracts` → extensiones condicionadas de CRM/estates/assets/AssetDetail/tasks → flujos por RPC → textos EN/ES/DE → pruebas → build → deploy solo si todo pasa.
8. Validaciones previas al deploy: crew no puede actualizar `plant_placements` directamente; owner tampoco; `client` no lee el bucket aunque comparta organización; no existe URL pública de fotos PlantOps; crear una planta PlantOps crea sus detalles; un activo sin detalles no se puede reservar; las RPC fallan con activos de otra organización; las verticales históricas no cambian.
9. Reporte final con migraciones, funciones, políticas RLS y de Storage, archivos modificados y nuevos, pruebas, typecheck, lint, build, deploy, desviaciones y pendientes de segunda fase.
