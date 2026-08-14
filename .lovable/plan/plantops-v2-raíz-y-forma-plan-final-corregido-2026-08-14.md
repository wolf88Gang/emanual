# PlantOps V2 — Raíz y Forma (plan final corregido)

Producto para organizaciones `plant_rental`: instalaciones residenciales de plantas de interior con cuidado supervisado. Alquiler, contratos y eventos quedan disponibles pero **opcionales**.

Flujo prioritario: cliente → propiedad → plantas + macetas → configuración de cuidado → manual → recordatorios → visitas → historial → cargos/facturas/pagos.

## A. Arquitectura MVP definitiva

| Concepto | Entidad existente | Acción |
|---|---|---|
| Empresa / equipo | `organizations`, `profiles`, `user_roles` | Reutilizar |
| Cliente | `clients` (nombre, email, phone, address) | Reutilizar |
| Propiedad / sede | `estates` (ya tiene `client_id`) | Reutilizar, sin coordenadas ni mapa |
| Habitación / área | `zones` (`floor_label`, sin geometría) | Reutilizar |
| Plantas y macetas | `assets` (`plant`, `pot`) | Reutilizar |
| Planta instalada (punto) | `plant_placements` (RPC-only) | Extender con plan de cuidado |
| Guía de especie | `plant_profiles.care_template_json` | Solo conocimiento general |
| Datos comerciales / maceta | `plantops_asset_details` | Extender con atributos de maceta |
| Servicios contratados | `rental_contracts` (opcional) | No obligatorio para crear cliente |
| Visita | `worker_shifts` | Extender con `visit_kind` |
| Herramientas | `inventory_items`, `tool_assignments` | Reutilizar tal cual |
| Catálogo | `product_catalog` | Reutilizar |
| Facturación | `invoices` (draft) + `invoice_items` | Reutilizar (ver I) |
| Pagos | `client_payments` (tiene `invoice_id`) | Reutilizar |
| Recordatorios | `notifications` | Reutilizar (internos) |
| Manual PDF | `src/lib/pdfExport.ts` | Extender |

Nuevo estrictamente necesario: `plant_care_logs` (historial de acciones) y `estate_share_links` (página pública por propiedad). Nada más.

Un cliente válido en MVP = `clients` + `estates` + `assets`/`plant_placements` + plan de cuidado + manual + recordatorios. **Sin `rental_contracts`.** El wizard solo crea contrato si se marcó "alquiler".

## B. Modelo de cuidado definitivo

Plan efectivo por planta instalada, resuelto en capas:

```text
baseline de especie (plant_profiles.care_template_json)
  + condiciones de maceta (plantops_asset_details del pot_asset_id)
  + condiciones del punto (luz real, ventilación, interior/exterior)
  + estación (solo si la organización configuró factores)
  + override manual de Natalia   ← autoridad final
  = plan efectivo (intervalo, mínimo, cantidad, método, instrucciones, qué NO hacer)
```

Reglas:
- El override manual **siempre gana** y se guarda con motivo, autor y fecha.
- **No se hardcodea ninguna regla agronómica.** `plantops_effective_care(placement_id)` aplica únicamente los factores que la organización haya configurado en `organizations.plantops_care_settings_json` (maceta, ventilación, luz, estación/mes). Si no hay factores configurados, el sistema muestra baseline + condiciones y deja el valor en manos de Natalia.
- La UI siempre muestra: Recomendación de especie · Condiciones (maceta, ventilación, interior, época) · Configuración de Raíz y Forma · Motivo. Se ejecuta el valor de Raíz y Forma.
- El baseline de especie **nunca** se modifica al ajustar una planta concreta (punto F).
- `next_water_due` sí se materializa en `plant_placements` para poder listar/indexar "REGAR HOY / NO REGAR".
- Estado calculado: `REGAR` (hoy o vencido), `NO REGAR ANTES DE <fecha>`, `REVISAR` (incidencia abierta).

Campos nuevos en `plant_placements`: `last_watered_at`, `next_water_due`, `water_interval_days` (efectivo), `water_interval_override_days`, `min_interval_days`, `water_amount_note`, `water_method`, `light_required`, `light_actual`, `ventilation`, `care_responsibility` (`raiz_y_forma`|`cliente`|`compartido`), `reminder_contact` (texto/email/teléfono, sin usuario), `client_instructions`, `do_not_do`, `care_notes`, `care_override_reason`, `care_updated_by`, `care_updated_at`.

## C. Modelo de maceta y variables

Verificado: **no existe ningún campo jsonb/metadata libre** en `assets`, `plantops_asset_details`, `plant_placements` ni `plant_instances` (solo `plant_profiles.care_template_json`, `estates.boundary_geojson`, `zones.geometry_geojson`). Por tanto no hay dónde guardar atributos de maceta hoy.

Decisión: **no se crea tabla nueva**. Se añaden columnas a `plantops_asset_details` (que ya es 1:1 con `assets` y ya es la tabla de atributos PlantOps), nulas para plantas: `pot_material` (`ceramica|plastico|barro|fibra|metal|otro`), `pot_diameter_cm`, `pot_height_cm`, `pot_volume_liters`, `pot_has_drainage` (bool), `pot_drainage_holes` (int, opcional), `pot_has_saucer` (bool), `pot_reservoir` (bool), `pot_notes`.

Estos atributos se **muestran siempre como contexto** en el Care Editor y en el manual, y solo afectan el intervalo si la organización configuró un factor para ese material/tamaño en `organizations.plantops_care_settings_json`. Sin configuración no hay ajuste automático: el valor lo fija Natalia.

## D. Wizard de cliente simplificado (6 pasos, con borrador)

1. **Cliente y propiedad** — cliente, contacto, dirección, nombre de propiedad (`clients` + `estates`, sin coordenadas).
2. **Servicios** — checklist: instalación, mantenimiento, recordatorios, manual, alquiler, reemplazo, otros. Sin exigir contrato; "alquiler" activa `rental_contracts`.
3. **Plantas y macetas** — alta rápida repetible: planta, maceta, área (`zones`) y punto descriptivo; se puede seguir agregando después.
4. **Cuidados y recordatorios** — quién riega, frecuencia, contacto de recordatorio, luz, ventilación, overrides.
5. **Precio y extras** — servicio base, productos, macetas, instalación, extras, frecuencia de cobro (`product_catalog`, `rental_contracts` si aplica).
6. **Compartir** — generar manual, elegir qué ve el cliente, generar página privada, revisar, activar.

Borrador: el wizard persiste incrementalmente en las entidades reales con la propiedad en estado `setup` y se puede retomar.

## E. Care Editor

Acción **EDITAR CUIDADO** desde una planta instalada (y desde la visita). Campos: intervalo recomendado, intervalo mínimo, cantidad aproximada, método, luz requerida, luz actual, ventilación, notas específicas, instrucciones visibles al cliente, qué NO hacer.

Muestra siempre:

```text
Recomendación de especie      7 días
Condiciones                   Maceta cerámica 35 cm · Ventilación baja · Interior · Época lluviosa
Configuración de Raíz y Forma  10 días
Motivo                        Maceta grande y baja evaporación
```

Home Guide registra y ejecuta los 10 días. Sin llamadas a IA para editar. Guarda vía RPC `plantops_set_care_plan` y recalcula `next_water_due` (respetando `min_interval_days`).

## F. Separación especie vs planta instalada

`plant_profiles.care_template_json` = conocimiento general de la especie (compartido). El plan operativo vive en `plant_placements`. Editar una Monstera concreta no toca ninguna otra Monstera; el editor lo indica explícitamente.

## G. Página compartida por propiedad

- Clave: **org + client + estate** (`estate_share_links`). Se guarda solo el hash del token (32 bytes aleatorios); URL `/c/<token>`.
- Servida por Edge Function `estate-share` con service role: la tabla no se expone a `anon`; la función valida token, revocación y expiración y devuelve solo los campos permitidos por los flags.
- Contenido: encabezado (Raíz y Forma + nombre de la propiedad), **PRÓXIMO CUIDADO** ("No regar antes del 18 de agosto"), SUS PLANTAS (foto, nombre, ubicación textual, riego, luz), MANUAL (ver + descargar), ÚLTIMA VISITA, CONTACTAR A RAÍZ Y FORMA.
- Nunca: costos, margen, valor de reposición, notas internas, herramientas, otros clientes, dashboards administrativos.
- Gestión desde la propiedad: crear, copiar, desactivar, regenerar.
- Página agregada por cliente: fuera de MVP (el modelo lo permite después).

## H. Manual personalizado (snapshot aprobado)

El manual se construye desde el **plan efectivo de esa propiedad** (riego, luz, ventilación, instrucciones, qué NO hacer por planta), no del protocolo genérico.

`estate_share_links` se extiende con `manual_snapshot_json`, `manual_approved_at`, `manual_approved_by`. Flujo: configurar cuidado → previsualizar → **aprobar** → se guarda el snapshot → la página pública y el PDF descargable se generan desde ese mismo snapshot (manual web = manual PDF).

Si el plan cambia después de la última aprobación, la interfaz interna muestra "El plan de cuidado cambió después de la última versión compartida. [Revisar nuevo manual]"; el cliente sigue viendo la versión aprobada hasta que Natalia apruebe de nuevo (reemplaza snapshot, fecha y responsable). Sin tabla de versiones en MVP.

## I. Visitas y herramientas

Visita = `worker_shifts` con `visit_kind='plantops'`:
check-in → herramientas llevadas (`tool_assignments`) → checklist "REGAR HOY / NO REGAR / REVISAR" → acciones por planta (regar, limpiar, podar, fertilizar, plagas, luz, mover, foto, incidencia) en `plant_care_logs` → extras → confirmación de herramientas (advierte si falta algo; cierre excepcional con motivo) → resumen. Mobile-first, sin logística avanzada.

## J. Historial (central)

Sección **HISTORIAL** en la propiedad, timeline por consulta unificada (visitas + `plant_care_logs` + incidencias + extras + fotos), con detalle expandible:

```text
14 agosto — Visita de Natalia
  Riego: 7 plantas · Limpieza: 4 · Poda: 2
  Luz insuficiente: 1 · Fotos: 5 · Extras: 1 maceta
```

Filtros: fecha, planta, tipo de acción, técnico. Sin tablas de resumen duplicadas.

## K. Extras, facturación y pagos (arquitectura resuelta)

Verificado: `invoices` tiene `status` con valor `draft`, `invoice_items` referencia `invoice_id` + `product_id`, `client_payments` referencia `invoice_id` y `client_id` sin restricción de unicidad. **El esquema existente lo permite sin tabla nueva.**

- RPC `plantops_add_charge(client_id, product_id|descripción, cantidad, precio, visit_id?)`: obtiene o crea la factura `draft` del cliente en el periodo y agrega el `invoice_item`; recalcula `subtotal`/`total`.
- Al emitir (`draft → sent`) ese conjunto se cierra; extras posteriores abren la siguiente draft.
- Trazabilidad de la visita: columna `invoice_items.source_shift_id` (nullable) — evita una tabla de "extras pendientes" y no duplica contabilidad.
- Pagos: `client_payments`, múltiples por factura. Saldo derivado (facturado / pagado / saldo / vencido) por consulta; sin ledger adicional.

## L. Tipografía (auditada)

Estado real: `index.html` carga Inter + Cormorant Garamond; `tailwind.config.ts` define `serif: 'Cormorant Garamond'`; `src/index.css:183` aplica esa familia; hay **75 usos de `font-serif`** en el código.

Corrección explícita (sin trucos de alias):
- Cargar Montserrat en `index.html` y retirar Cormorant e Inter.
- `tailwind.config.ts`: `sans: Montserrat`; se elimina la familia `serif` decorativa y se introduce `display: Montserrat` para títulos.
- Reemplazar los 75 `font-serif` por `font-display` (búsqueda y reemplazo mecánico), y actualizar `src/index.css` (headings y body en Montserrat).
- Escala en `src/index.css`: body 16px · secundario 14px · caption mínimo 12px · label 14px · botón 14–16px · H1 30–36 (móvil 26–30) · H2 24–28 · H3 18–22. Se corrigen los casos fuera de rango (texto funcional de 10–11px, títulos de 48–60px en el dashboard).

## M. Navegación plant_rental (sin mapas)

- Desktop: Inicio · Clientes · Plantas · Visitas · Cuidados · Facturación · Más (Contratos, Herramientas, Catálogo, Reportes, Configuración).
- Mobile: Inicio · Visitas · Cuidados · Clientes · Más.
- Ocultos para `plant_rental`: Mapa, Topografía, Compost, Empleos. No se borran datos ni se afectan otras verticales.
- Ubicación textual: Cliente → Propiedad → Habitación/Área → Punto.

## N. Wizard inicial de la organización

Checklist "¿Qué quiere gestionar con Home Guide?" (Clientes, Plantas y macetas, Cuidados, Recordatorios, Visitas, Herramientas, Manuales, Facturas y pagos, Alquileres, Eventos) guardado en `organizations.modules_json`; la navegación se filtra por esa configuración. Editable después.

## O. Recordatorios sin cuenta

Contactos de recordatorio son datos (`clients`, `reminder_contact` del placement): **nunca** `profiles`, `user_roles` ni miembros de la organización. MVP: recordatorio interno en `notifications` + destinatario preparado; email solo si la infraestructura existente lo hace trivial. WhatsApp = segunda fase, sin integrar ningún proveedor en esta iteración.

## P. Migraciones necesarias

1. **M1** `plant_placements`: columnas de cuidado del punto B + índices `(org_id, next_water_due)`, `(estate_id, status)`.
2. **M2** `plantops_asset_details`: atributos de maceta del punto C + checks de valores positivos.
3. **M3** `plant_care_logs` (org_id, estate_id, placement_id, asset_id, shift_id, action_type, performed_at, performed_by, amount_note, photo_path, notes, override_reason) + GRANTs + RLS + índices `(placement_id, performed_at desc)`, `(estate_id, performed_at desc)`.
4. **M4** `estate_share_links` (org_id, client_id, estate_id, token_hash, flags de visibilidad, `manual_snapshot_json`, `manual_approved_at`, `manual_approved_by`, expires_at, revoked_at) + GRANTs + RLS solo org (sin `anon`).
5. **M5** `organizations.modules_json`, `organizations.plantops_care_settings_json`, `worker_shifts.visit_kind`, `rental_contracts.services_json`, `invoice_items.source_shift_id`, `estates.setup_status`.
6. **M6** `plantops_effective_care(placement_id)`: resuelve el plan efectivo aplicando solo los factores presentes en `organizations.plantops_care_settings_json`. **No se crea la tabla `plantops_care_settings`** — únicamente esas dos tablas nuevas (`plant_care_logs`, `estate_share_links`).
7. **M7** RPCs: `plantops_set_care_plan`, `plantops_log_care` (recalcula próximo riego, cierra recordatorio, exige motivo si se riega antes), `plantops_add_charge`, `plantops_create_share_link` / `revoke`, `plantops_approve_manual`, `plantops_start_visit` / `close_visit`. Todas SECURITY DEFINER, `search_path=public`, sin `EXECUTE` para `anon`.
8. **QA fuera de migraciones**: la organización `Raíz y Forma QA` (`plant_rental`) y sus datos demo se crean por un mecanismo separado de desarrollo/testing. **Ninguna migración crea usuarios, correos ni contraseñas**, y `/auth` no muestra cuentas demo.

## Q. Archivos

- Nuevos: `src/pages/PlantOpsClients.tsx`, `src/pages/PlantOpsClientWizard.tsx`, `src/pages/PlantOpsEstate.tsx` (plantas + historial + manual + compartir), `src/pages/PlantOpsCare.tsx` (REGAR/NO REGAR), `src/pages/PlantOpsVisit.tsx`, `src/pages/PublicEstatePage.tsx` (`/c/:token`), `src/components/plantops/CareEditorDialog.tsx`, `src/components/plantops/PotAttributesForm.tsx`, `src/components/plantops/CareHistoryTimeline.tsx`, `src/components/plantops/ToolCheckPanel.tsx`, `src/components/plantops/ShareLinkPanel.tsx`, `src/lib/plantopsCare.ts`, `src/lib/plantopsManual.ts`, `supabase/functions/estate-share/index.ts`.
- Modificados: `src/lib/plantops.ts`, `src/hooks/usePlantOps.ts`, `src/pages/PlantOps.tsx`, `src/components/layout/AppSidebar.tsx`, `src/components/layout/BottomNav.tsx`, `src/App.tsx`, `src/lib/pdfExport.ts`, `tailwind.config.ts`, `src/index.css`, `index.html`, y los archivos con `font-serif`.
- **No** se toca `src/pages/Auth.tsx` para añadir credenciales demo.

## R. RLS y seguridad

- Todo nuevo dato es org-scoped mediante el patrón existente (`profiles.org_id` / `has_role`); escritura de placements y cargos solo por RPC.
- `plant_care_logs`: inserción solo por RPC, sin UPDATE/DELETE (historial inmutable).
- `estate_share_links`: sin acceso `anon`; la Edge Function valida token, expiración y revocación, y devuelve un payload filtrado (nunca costos, márgenes, notas internas ni herramientas).
- Rol `client` sigue sin ver `plantops_asset_details` comercial.
- Login público sin cuentas demo visibles; el acceso QA es una organización aislada con usuario controlado, no un botón en producción.

## S. Orden exacto de implementación

**Piloto core**
1. Tipografía y escala (auditoría + Montserrat).
2. Navegación `plant_rental` sin mapas + wizard inicial (`modules_json`).
3. M1–M6 (esquema) y M7 (RPCs).
4. Cliente + propiedad (wizard 6 pasos, con borrador).
5. Plantas + macetas (incluye atributos de maceta).
6. Care Editor + motor de cuidado efectivo.
7. Estado REGAR / NO REGAR + recordatorios internos.
8. Historial de cuidados por propiedad.
9. Manual personalizado desde el plan efectivo.
10. Página privada por propiedad (`/c/:token` + Edge Function).
11. Visita simple + checklist + herramientas check-in/out.

**Operación comercial**
12. Catálogo → extras → factura draft → emisión → pagos → saldo.

**Después**
13. Email automático · WhatsApp · eventos/logística avanzada · analítica.

## T. Criterios de aceptación

1. Se crea `Casa Natalia Test` + propiedad `Casa Escazú` **sin contrato de alquiler** y el cliente queda activo.
2. Se agrega Monstera + maceta cerámica 35 cm (material, diámetro, drenaje) en Sala / "junto a ventana".
3. Se configura luz requerida indirecta brillante, luz actual media, ventilación baja, intervalo base 7 días, override 10 días con motivo; la Monstera de otro cliente no cambia.
4. Se registra riego hoy → cliente ve "Planta regada hoy. No volver a regar antes del 24 de agosto"; Natalia ve próximo riego, historial y motivo del override.
5. Se genera el manual con el plan efectivo, se revisa y se comparte; el enlace abre sin login y permite descargar el PDF.
6. Se realiza una visita: herramientas llevadas, cuidados registrados, herramientas confirmadas al cierre.
7. Se agrega una maceta extra (₡18.000) → aparece en la factura draft del cliente; se emite la factura y se registra un pago parcial y otro posterior; el saldo cuadra.
8. Natalia carga sus propios checklists, cuidados, macetas, plantas y clientes, y ajusta los parámetros de cuidado **desde la interfaz, sin cambios de código**.
9. `/auth` en producción no muestra credenciales ni acceso demo de un clic.
10. Ninguna pantalla `plant_rental` pide coordenadas ni muestra Mapa; las demás verticales conservan sus mapas.

## U. Prompt final de implementación

> Implemente PlantOps V2 para `plant_rental` en este orden: tipografía Montserrat con escala auditada; navegación sin mapas y wizard inicial de módulos; migraciones M1–M7 (cuidado en `plant_placements`, atributos de maceta en `plantops_asset_details`, `plant_care_logs`, `estate_share_links`, `modules_json`/`visit_kind`/`services_json`/`source_shift_id`, `plantops_care_settings`, RPCs SECURITY DEFINER sin `anon`); wizard de cliente en 6 pasos con borrador y sin contrato obligatorio; Care Editor con comparación base/personalizado y override con motivo; motor de cuidado en capas (especie + maceta + punto + estación + override); estado REGAR/NO REGAR y recordatorios internos sin cuentas de cliente; historial por propiedad; manual PDF desde el plan efectivo con revisión previa; página privada por propiedad vía Edge Function con payload filtrado; visita con checklist y herramientas check-in/out; y finalmente catálogo/extras a factura draft, emisión y pagos con saldo derivado. No agregue cuentas demo al login público, no cree tablas de extras ni de macetas, y no integre WhatsApp en esta iteración.
