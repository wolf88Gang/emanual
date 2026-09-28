# Visual Service Brief — arquitectura corregida (v2)

## 1. Hallazgos verificados que cambian el diseño

- `tasks` ya tiene como atributos canónicos `estate_id`, `zone_id`, `asset_id`, `placement_id`, `assigned_to_user_id` y `assigned_vendor_id`. El brief no los duplica.
- No existe una taxonomía de servicios: `tasks.plantops_kind` está vacío en todas las filas. Por eso se crea una tabla de consulta `service_types`.
- El RLS de `tasks` hoy permite:
  - owner/manager de la org: todo;
  - cualquier miembro de la org: lectura;
  - crew: update solo si la tarea le está asignada;
  - vendor: lectura si la tarea está asignada a un vendor de su org.
- Hoy ninguna política da acceso a tasks al rol `client`.
- `task_status` no tiene un estado de reapertura. El ajuste pedido por el cliente se queda dentro del brief (ver §5).
- Las fotos de cierre se guardan en el bucket `photos`, con la ruta `{user_id}/tasks/...`.
- **Problema de privacidad existente (queda fuera de alcance, lo aviso):** cualquier usuario con sesión puede leer todo el bucket `photos`.
- **Problema de integridad existente:** el autor de una foto puede sobrescribirla o borrarla (políticas de UPDATE y DELETE sobre su propia carpeta). Esto se corrige solo para los objetos usados como evidencia de un brief (§6).
- `resolvePhotoUrl` ya guarda los links firmados en caché, pero los firma de uno en uno. Se agrega un camino por lote con `createSignedUrls`.

## 2. Esquema final (migración solo aditiva)

```text
service_types (lookup, extensible)
  key text PK, label_es, label_en, label_de, requires_after_photo bool default true,
  active bool, sort int
  seed: pruning, shaping, crown_reduction, cleanup, ornamental_maintenance,
        transplant, rearrangement, installation, arrangement, visual_recovery

service_visual_briefs  (extensión 1:1 de tasks)
  id uuid PK
  task_id uuid NOT NULL UNIQUE  FK tasks ON DELETE RESTRICT
  service_type text NOT NULL    FK service_types(key) ON DELETE RESTRICT
  status visual_brief_status NOT NULL default 'draft'
  client_description text
  requested_by uuid NOT NULL
  professional_assessment visual_assessment      -- viable|partial|not_recommended|inspect_first
  professional_notes text, assessed_by uuid, assessed_at timestamptz
  proposed_agreement visual_agreement            -- exact|approximate|modified
  proposed_scope text, proposed_by uuid, proposed_at
  agreed_scope text, agreed_by uuid, agreed_at
  client_match visual_match                      -- yes|partial|no  (percepción)
  client_action visual_review_action             -- approve|request_adjustment (acción)
  client_feedback text, reviewed_by uuid, reviewed_at
  created_at, updated_at (trigger)
  -- sin org_id / estate / zone / asset / placement: siempre se derivan de task

service_visual_assets
  id, brief_id FK briefs ON DELETE RESTRICT
  kind visual_asset_kind      -- before|target_reference|agreed_target|after
  bucket text, storage_path text NOT NULL
  source visual_asset_source  -- camera|upload|plant_history|completion
  source_ref_id uuid          -- id de task_completions o del asset visual original
  width int, height int, mime text, bytes int
  uploaded_by uuid NOT NULL, created_at
  frozen_at timestamptz       -- se llena al congelarse; luego la fila es inmutable
  removed_at timestamptz      -- baja lógica, solo mientras está en draft

visual_annotations            (V1: solo pins)
  id, visual_asset_id FK ON DELETE RESTRICT
  annotation_type text CHECK = 'pin'
  x numeric, y numeric CHECK 0..1   -- sobre la imagen canónica ya procesada
  label text, note text, created_by, created_at

service_visual_brief_events   (append-only)
  id, brief_id FK ON DELETE RESTRICT, actor_user_id, event_type text,
  from_status, to_status, payload jsonb, created_at
  -- sin políticas de UPDATE/DELETE; triggers que bloquean update y delete
```

- Tipos enum: `visual_brief_status` (draft, client_submitted, professional_review, needs_clarification, professionally_validated, scope_agreed, result_submitted, client_approved, adjustment_requested), `visual_assessment`, `visual_agreement`, `visual_match`, `visual_review_action`, `visual_asset_kind` (sin ai_simulation) y `visual_asset_source`.
- Índices:
  - `briefs(task_id)` único y `briefs(status)`;
  - `assets(brief_id, kind)` y `assets(bucket, storage_path)`;
  - `events(brief_id, created_at)`;
  - `annotations(visual_asset_id)`.
- Regla de ON DELETE: todo es RESTRICT hacia el historial. Borrar un asset, un placement o un usuario no borra nada, porque el brief no guarda FK directas a ellos. Los ids de usuario se guardan sin FK a auth.users (según las reglas del proyecto).
- La biblioteca de referencias **se pospone**. Esta migración no la crea. Se diseñará después con clasificación `private_evidence | internal_reference | client_approved`, curaduría explícita y acceso de clientes solo a `client_approved`.

## 3. Acceso (RLS heredado de tasks)

Función `can_access_visual_brief(brief_id, uid)`, de tipo security definer y con search_path fijo. Recrea el alcance real de lectura de la tarea:

| Actor | Lectura | Notas |
|---|---|---|
| Owner/manager de la org del estate | Sí | Igual que tasks |
| Crew | Solo si `task.assigned_to_user_id = uid` | Más estricto que la lectura general de tasks, a propósito |
| Vendor | Solo si `task.assigned_vendor_id` es de su org | Igual que tasks |
| Client | Solo si tiene `client_access` vigente sobre `task.estate_id` y es `requested_by` o el estate le está compartido | Acceso nuevo, limitado al brief |
| Otra org o usuario no asignado | Cero | |

- Todas las tablas nuevas tienen GRANT SELECT a authenticated y ALL a service_role.
- **No hay GRANT de INSERT, UPDATE ni DELETE** a authenticated. Toda escritura pasa por RPCs.
- Anon no tiene ningún permiso.

## 4. Matriz de transiciones (validada en cada RPC)

| RPC | Desde → hasta | Quién |
|---|---|---|
| `create_visual_service_request(estate, zone?, asset?, placement?, service_type, title, description)` | ∅ → draft (crea la task pending y el brief en una transacción) | Owner/manager; client con client_access sobre el estate |
| `add_visual_asset` / `remove_visual_asset` (before, target) | solo en draft o needs_clarification | Solicitante, owner/manager |
| `submit_visual_brief` | draft/needs_clarification → client_submitted → professional_review (congela before y target) | Solicitante, owner/manager |
| `request_clarification` | professional_review → needs_clarification | Asignado (crew/vendor), owner/manager |
| `assess_visual_brief` | professional_review → professionally_validated | Asignado, owner/manager |
| `propose_visual_scope` (tipo de acuerdo, alcance, agreed_target opcional) | professionally_validated → professionally_validated (evento scope_proposed) | Asignado, owner/manager |
| `agree_visual_scope` | professionally_validated con propuesta → scope_agreed (congela agreed_target) | Solicitante o client; owner/manager solo si el solicitante es interno |
| `complete_visual_brief(completion_id)` | scope_agreed/adjustment_requested → result_submitted | Autor del completion, que debe ser el asignado o un owner/manager |
| `review_visual_result(match, action, feedback)` | result_submitted → client_approved o adjustment_requested | Solicitante o client; el profesional no puede |

- Cada RPC:
  - usa `auth.uid()` y deriva la org desde la task;
  - valida el acceso, el rol o la asignación y el estado actual;
  - escribe un evento con `from` y `to`;
  - inserta en `notifications` para la otra parte.
- Permisos de ejecución: `REVOKE EXECUTE FROM public, anon` y `GRANT` solo a authenticated.
- `source_ref_id` se valida contra la misma org. Las transiciones no autorizadas y las de otra org se rechazan.
- `tasks.status` no cambia de significado. Al completar se sigue marcando `completed` como hoy.
- **Ajuste:** queda en el brief como `adjustment_requested`. El owner/manager puede crear una tarea de seguimiento enlazada, o el profesional puede volver a completar (nuevo completion, nuevo after y el anterior queda en el historial). No se reabre la tarea original.

## 5. Una sola foto final y evidencia congelada

- `TaskCompletionDialog` mantiene su subida actual (sin compresión nueva). Después del insert en `task_completions`, si la tarea tiene brief, llama a `complete_visual_brief(completion_id)`.
- La RPC crea la fila `after` con el mismo bucket y path y con `source_ref_id = completion.id`. No hay una segunda subida.
- Si el tipo de servicio exige foto, el diálogo la marca obligatoria.
- **Integridad (opción B, sin copias):**
  - se reemplazan las políticas UPDATE y DELETE del bucket `photos` (y de `asset-photos`) por versiones que además exigen `NOT is_frozen_visual_evidence(bucket, name)`;
  - las fotos del brief se guardan en `photos/{org_id}/briefs/{brief_id}/...` con una política de INSERT nueva, validada por `can_write_visual_brief(name)`;
  - no hay UPDATE ni DELETE mientras estén congeladas.
- Una referencia tomada del historial de la planta apunta al mismo objeto, que ya está protegido por la misma regla. Así nada desaparece después.

## 6. Captura, anotaciones y fotos por lote

- Pipeline solo para las fotos del brief:
  - decodificar con `createImageBitmap(file, {imageOrientation:'from-image'})`, con respaldo a `<img>`;
  - si el navegador no puede decodificar HEIC, mostrar un error claro;
  - redimensionar a 1600px como máximo y convertir a JPEG 0.82;
  - límite de 15MB de entrada;
  - progreso, tres reintentos con espera creciente y botón "Reintentar".
- Las anotaciones se hacen sobre la imagen ya procesada. V1 solo tiene pins.
- `resolvePhotoUrls` (por lote) comparte la caché actual y lo usan el historial y la comparación.

## 7. Interfaz (se mantiene el diseño actual)

- Componentes nuevos en `src/components/visual-brief/`: `VisualBriefForm`, `VisualPhotoPicker`, `AnnotationPins`, `ProfessionalAssessmentPanel`, `ScopeAgreementPanel`, `BeforeTargetAfter`, `ResultReviewPanel`, `PlantVisualHistory` y `VisualBriefTimeline` (lee los eventos).
- Dónde aparecen:
  - crear tarea: sección opcional "¿Cómo quiere que quede?", con estado solo en el navegador hasta que se crea la tarea;
  - detalle de tarea: ficha del profesional, acuerdo, revisión y línea de tiempo;
  - `TaskCompletionDialog`;
  - `AssetDetail`: historial.
- Textos en ES/EN/DE. Aviso fijo: "La referencia muestra un deseo estético; no es una recomendación técnica."

## 8. Pruebas y definición de terminado

- SQL de seguridad, ejecutado con sesiones reales de usuarios de prueba etiquetados `AUDIT_TEST_VSB` y borrados al final. Debe ser DENIED en cada uno de estos casos:
  - otra org lee;
  - vendor no asignado lee;
  - client de otro estate lee;
  - crew no asignado evalúa;
  - client ejecuta assess;
  - profesional aprueba;
  - salto de estados;
  - `source_ref_id` de otra org;
  - subida a `{otra_org}/briefs/`;
  - borrar una foto congelada.
- Camino feliz completo: crear → before → target → submit → evaluar → proponer → acordar → completar con el flujo actual → el mismo path aparece como after → revisión → historial → eventos reconstruyen la secuencia.
- Vitest para la matriz de transiciones y el pipeline de imagen. Además typecheck, tests, linter de seguridad y Playwright a 390px.

## 9. Orden de ejecución

1. Migración (tipos, tablas, índices, funciones de acceso, RPCs, políticas de storage) y pruebas negativas.
2. Capa `src/lib/visualBriefs.ts` y pipeline de imagen.
3. Brief del cliente.
4. Evaluación y acuerdo.
5. Integración con el cierre.
6. Comparación y revisión.
7. Historial.
8. E2E y limpieza de datos de prueba.

Fuera de alcance: biblioteca de referencias (fase siguiente) y visualización con IA.
