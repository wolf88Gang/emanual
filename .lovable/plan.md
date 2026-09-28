# Visual Service Brief (Antes / Resultado deseado / Resultado final)

## 1. Auditoría — qué existe

| Área | Existe hoy | Reutilizar |
|---|---|---|
| Unidad de trabajo | `tasks` (estate, zone, asset, placement_id, assigned_to_user_id, assigned_vendor_id, status, required_photo). No hay tabla separada de "solicitudes de servicio". | Sí: el brief cuelga de `tasks`. |
| Plantas | `assets` (tipo plant), `plant_instances`, `plant_profiles` (especie), `plant_placements` (ubicación, `reference_photo_path`, instrucciones). | Sí: el brief apunta a asset y/o placement (ambos opcionales). |
| Evidencia final | `task_completions.photo_url` + `TaskCompletionDialog` (bucket `photos`). | Sí: la foto final se sube en el mismo diálogo. |
| Historial | `plant_care_logs` (photo_path), `task_completions`, `AssetDetail`. | Sí: el historial visual se muestra en AssetDetail. |
| Storage | Buckets privados `photos`, `asset-photos`, `plantops-photos`; `StoragePhoto` + `resolvePhotoUrl` (links firmados). | Sí: bucket `photos`, guardando solo el path. |
| Captura móvil | `usePhotoCapture` (cámara, preview, validación). | Sí, con compresión en el cliente añadida. |
| Notificaciones | `notifications` (user_id, type, link). | Sí, para los eventos. |
| Permisos | `get_user_org_id`, `has_role`, políticas de tasks (owner/manager, crew asignado, vendor asignado); rol `client` + `client_access`. | Sí: el brief copia las mismas reglas. |
| Cotizaciones | No existen (solo `invoices`). | La cotización queda fuera; solo se guarda un "alcance acordado". |
| Voz / analítica | No hay infraestructura de eventos; dictado solo en labor. | No se crea analítica nueva; el dictado nativo del teclado del teléfono funciona en el campo de texto. |

**Qué falta:** un registro estructurado de "resultado deseado", la evaluación del profesional, el acuerdo, la aprobación del cliente, las fotos por tipo y una biblioteca de referencias.

**Riesgos de duplicación:** crear una tabla genérica de adjuntos (no hace falta), un segundo flujo de completar tareas o un sistema de notificaciones paralelo. Los tres se evitan.

## 2. Lo que va a ver el usuario

- **Crear tarea** (tareas de tipo servicio visual): sección opcional "¿Cómo quiere que quede?" con Estado actual (tomar o subir foto, o reutilizar una foto reciente de la planta), Referencia del resultado (varias fotos, incluso de servicios anteriores de esa planta o de la biblioteca) y "¿Qué quiere cambiar?".
- **Ficha del profesional** en el detalle de la tarea: planta, especie, ubicación, últimas intervenciones, fotos lado a lado, la instrucción y cuatro botones de evaluación (Viable, Parcial, No recomendado, Inspeccionar primero) con comentario. Un aviso fijo aclara: "La referencia muestra un deseo estético, no una recomendación técnica."
- **Resultado acordado**: el profesional elige "Igual a la referencia", "Aproximación razonable" o "Modificado por recomendación" y escribe el alcance. El cliente o el administrador confirma. Queda guardado qué se pidió, qué se recomendó y qué se acordó.
- **Completar**: si la tarea tiene brief, se exige foto de "Resultado final", que se guarda como foto "después".
- **Comparación**: tres columnas responsivas Antes → Referencia → Después.
- **Aprobación**: "¿Se parece al resultado acordado?" Sí / Parcialmente / No, y Aprobar o Reportar ajuste con nota. Al reportar un ajuste, el trabajo vuelve a estado de ajuste.
- **Historial de la planta** (AssetDetail): lista de servicios visuales con fecha, profesional, estado y miniaturas antes, referencia y después.
- **Biblioteca**: el profesional marca "Guardar como referencia" sobre una foto final, con etiquetas (tipo de servicio, estilo, interior/exterior, tamaño). La biblioteca se ve dentro de la organización y se puede elegir desde el selector de referencias.
- **Anotaciones**: la tabla y la estructura de datos quedan listas. En esta versión, una capa simple permite tocar la foto para agregar pines con nota ("cortar aquí", "no tocar"). Círculos, flechas y líneas quedan para después.
- **Sin planta registrada**: el brief acepta solo ubicación (zona) y fotos. Luego se puede vincular a una planta.
- **Visualización con IA**: no se construye. Solo queda reservado un tipo de foto "simulación" para el futuro, marcado como "Visualización aproximada".

## 3. Detalles técnicos

**Migración (solo agrega, no destructiva):**
- Enums: `visual_brief_status` (draft, client_submitted, professional_review, needs_clarification, professionally_validated, scope_agreed, completed, client_approved, adjustment_requested). "En progreso" se toma de `tasks.status` y no se duplica. También `visual_assessment` (viable, partial, not_recommended, inspect_first), `visual_agreement` (exact, approximate, modified), `visual_asset_kind` (before, target_reference, agreed_target, after, ai_simulation) y `client_match` (yes, partial, no).
- `service_visual_briefs`: org_id, task_id (único, nullable para borradores), asset_id, placement_id, zone_id, estate_id, service_type (texto de vocabulario controlado: pruning, shaping, crown_reduction, cleanup, ornamental, transplant, arrangement, installation…), status, client_description, requested_by, professional_assessment, professional_notes, assessed_by/at, agreement_type, agreed_description, agreed_by/at, client_match, client_feedback, approved_by/at y timestamps con trigger de updated_at.
- `service_visual_assets`: brief_id, kind, storage_path (bucket `photos`, path `{org}/briefs/{brief}/…`), source (camera, upload, plant_history, library, completion), source_ref_id, uploaded_by, metadata jsonb (dimensiones, orientación) y created_at. Registros inmutables (sin update; solo quien lo subió puede borrarlo mientras el brief está en borrador).
- `visual_annotations`: visual_asset_id, annotation_type (pin|circle|arrow|line|zone), geometry jsonb (coordenadas normalizadas 0–1), label, note, created_by.
- `visual_reference_library`: org_id, source_asset_id, plant_profile_id, genus, category, service_type, style, setting (interior|exterior), size_class, title, created_by.
- GRANT a authenticated/service_role y RLS. Lectura: miembros de la org de la tarea o estate (misma lógica que tasks), vendor o crew asignado y rol client con `client_access` sobre el estate. Escritura: el cliente o solicitante escribe campos de cliente; el asignado u owner/manager escribe la evaluación. Las transiciones pasan por RPCs `security definer` (`submit_visual_brief`, `assess_visual_brief`, `agree_visual_scope`, `complete_visual_brief`, `review_visual_result`) que validan rol y estado, e insertan en `notifications` para la otra parte. Storage: se revisan las políticas del bucket `photos` y se agrega una política para el prefijo `{org}/briefs/` si las actuales solo cubren `{user}/`.

**Frontend (componentes nuevos en `src/components/visual-brief/`):**
- `src/lib/visualBriefs.ts`: consultas, RPCs, subida con compresión (canvas a ≤1600px JPEG 0.82, respetando orientación EXIF), progreso y reintento.
- `VisualReferenceUploader`, `VisualServiceBriefForm`, `ProfessionalAssessmentPanel`, `ScopeAgreementPanel`, `BeforeTargetAfter`, `ResultReviewPanel`, `PlantVisualHistory`, `ReferenceLibraryPicker`, `AnnotationPinLayer`. Todos se muestran con `StoragePhoto`.
- Integración: diálogo de creación de tareas (sección opcional), detalle de tarea en Tasks, `TaskCompletionDialog` (foto final obligatoria con brief; también guarda la fila after) y `AssetDetail` (historial).
- Textos en EN/ES/DE, con prioridad en español.

**Sin cambios:** precios, checkout/ONVO, autenticación, navegación principal ni el esquema existente (solo se agrega).

**Validación:** typecheck, vitest (se agregan pruebas de transiciones de estado y del helper de compresión), linter de seguridad y un recorrido en Playwright a 390px: crear brief → evaluar → acordar → completar con foto → aprobar → ver historial.

## 4. Fases
1. Migración, RLS, storage y capa de servicios. 2. Brief del cliente. 3. Evaluación y acuerdo. 4. Completar, comparar y aprobar. 5. Historial y reutilización de fotos anteriores. 6. Biblioteca de referencias. Futuro: visualización con IA.
