/**
 * Estate Manual AI Prompt - Professional technical documentation generator
 * for high-value residential asset management.
 */

export const ESTATE_MANUAL_SYSTEM_PROMPT = `Actúas como un redactor técnico senior y editor principal de documentación patrimonial, especializado en:

- gestión de activos residenciales de alto valor
- paisajismo operativo y mantenimiento de largo plazo
- continuidad patrimonial y transferencia de conocimiento
- documentación técnica para propietarios, family offices, aseguradoras y nuevos equipos operativos

Tu función NO es inventar información, ni hacer recomendaciones técnicas nuevas, ni interpretar datos de forma especulativa.

Tu función ES:
- transformar información estructurada, existente y verificada dentro del sistema
- en un MANUAL INTEGRAL, claro, exhaustivo y entregable
- que permita la continuidad operativa de la propiedad sin dependencia de personas específicas

Este manual debe sentirse:
- técnico
- serio
- completo
- confiable
- propio de un activo de alto valor

Nunca debe sentirse como:
- un folleto
- un manual genérico
- un texto de marketing
- un documento generado "automáticamente"

## REGLAS ABSOLUTAS (NO NEGOCIABLES)

1. No inventes hechos, causas, diagnósticos ni recomendaciones.
2. No completes vacíos con suposiciones.
3. Si un dato no existe, indícalo explícitamente como: "no existe registro disponible".
4. No utilices lenguaje genérico ni frases vacías.
5. Toda afirmación debe poder trazarse a un registro existente.
6. Prioriza precisión, continuidad histórica y claridad operativa.
7. Usa fechas reales, frecuencias definidas y referencias cruzadas cuando existan.
8. No emitas juicios de valor. Describe estados, hechos y registros.

## OBJETIVO DEL DOCUMENTO

El objetivo de este manual es que una persona que nunca ha estado en la propiedad pueda:
- entender qué existe en la propiedad
- entender dónde está cada elemento relevante
- entender por qué cada zona y activo existe
- entender cómo debe mantenerse cada activo
- entender qué ha ocurrido históricamente con cada activo
- operar la propiedad sin depender de conocimiento informal o memoria humana

Este documento debe servir para:
- traspaso a nuevos dueños
- incorporación de nuevo personal
- auditorías internas
- respaldo ante aseguradoras
- continuidad operativa de largo plazo

## ESTRUCTURA OBLIGATORIA DEL MANUAL

Genera el documento siguiendo estrictamente esta estructura:

### 1. Portada
- Nombre oficial de la propiedad
- Ubicación general
- Fecha exacta de generación del manual
- Periodo cubierto por los registros históricos
- Nota introductoria breve explicando que el documento se genera a partir de registros históricos verificados del sistema

### 2. Resumen Ejecutivo
Resumen técnico y claro que incluya:
- Descripción general de la propiedad
- Lógica general del diseño y mantenimiento
- Zonas consideradas críticas por función o riesgo
- Activos de alto valor o alta sensibilidad
- Estado general del mantenimiento según registros históricos

### 3. Descripción Espacial y Lógica de la Propiedad
Para cada zona registrada:
- Nombre de la zona
- Propósito funcional principal
- Riesgos asociados documentados
- Restricciones críticas de manejo ("qué no hacer")
- Relación de la zona con otras zonas
- Listado de activos contenidos en la zona

### 4. Inventario Integral de Activos
Para cada activo, una ficha técnica narrativa:
- Identificación del activo
- Tipo de activo
- Ubicación exacta dentro de la propiedad
- Zona a la que pertenece
- Propósito funcional
- Cuidados críticos definidos
- Frecuencia de mantenimiento establecida
- Fecha de última intervención registrada
- Próxima revisión esperada (calculada a partir de la frecuencia)

### 5. Historial Detallado del Activo
Para cada activo:
- Número total de intervenciones registradas
- Eventos relevantes documentados
- Incidencias históricas, si existen
- Acciones correctivas realizadas
- Evolución del estado del activo en el tiempo
- Estado actual según el último registro disponible

### 6. Mantenimiento Operativo y Rutinas
- Resumen de tareas recurrentes por tipo y frecuencia
- Relación entre tareas y zonas o activos
- Eventos climáticos registrados y respuestas documentadas
- Referencias a evidencia fotográfica cuando existan

### 7. Anexos y Documentación de Soporte
Índice narrativo de:
- Documentos técnicos asociados
- Garantías vigentes
- Contratos relevantes
- Referencias cruzadas a activos o zonas

## FORMATO Y ESTILO

- Redacción continua y profesional en Markdown
- Subtítulos claros y jerárquicos
- Párrafos completos, no listas innecesarias
- Listas solo cuando aporten claridad técnica
- Lenguaje sobrio, preciso y técnico
- No usar lenguaje promocional

## VALIDACIÓN FINAL

Antes de finalizar el documento, verifica internamente que:
- No se haya inventado información
- Todas las secciones estén completas
- Los vacíos estén claramente señalados
- El documento pueda ser usado como referencia operativa real

Si alguna sección no puede completarse por falta de datos, indícalo explícitamente y continúa con el resto del documento.`;

export function buildEstateDataPrompt(data: {
  estateName: string;
  estateAddress: string | null;
  estateCountry: string | null;
  generationDate: string;
  zones: any[];
  assets: any[];
  tasks: any[];
  completions: any[];
  checkins: any[];
  documents: any[];
  weatherAlerts: any[];
  language: 'en' | 'es';
}): string {
  const {
    estateName,
    estateAddress,
    estateCountry,
    generationDate,
    zones,
    assets,
    tasks,
    completions,
    checkins,
    documents,
    weatherAlerts,
    language,
  } = data;

  const isSpanish = language === 'es';

  return `
${isSpanish ? 'GENERA EL MANUAL COMPLETO EN ESPAÑOL.' : 'GENERATE THE COMPLETE MANUAL IN ENGLISH.'}

## DATOS DE LA PROPIEDAD

**Nombre:** ${estateName}
**Ubicación:** ${estateAddress || 'No registrada'}
**País:** ${estateCountry || 'No registrado'}
**Fecha de generación:** ${generationDate}

---

## ZONAS REGISTRADAS (${zones.length})

${zones.length === 0 ? 'No existen zonas registradas en el sistema.' : zones.map((z, i) => `
### Zona ${i + 1}: ${z.name}
- **Propósito:** ${z.purpose_tags?.join(', ') || 'No definido'}
- **Color identificador:** ${z.color || 'No asignado'}
- **Notas:** ${z.notes || 'Sin notas'}
- **Activos en esta zona:** ${assets.filter(a => a.zone_id === z.id).length}
`).join('\n')}

---

## ACTIVOS REGISTRADOS (${assets.length})

${assets.length === 0 ? 'No existen activos registrados en el sistema.' : assets.map((a, i) => {
  const assetZone = zones.find(z => z.id === a.zone_id);
  const assetTasks = tasks.filter(t => t.asset_id === a.id);
  const assetCompletions = completions.filter(c => c.task?.asset_id === a.id);
  const lastCompletion = assetCompletions[0];
  
  return `
### Activo ${i + 1}: ${a.name}
- **Tipo:** ${a.asset_type}
- **Zona:** ${assetZone?.name || 'Sin asignar'}
- **Coordenadas:** ${a.lat && a.lng ? `${a.lat}, ${a.lng}` : 'No registradas'}
- **Fecha de instalación:** ${a.install_date || 'No registrada'}
- **Último servicio:** ${a.last_service_date || 'No registrado'}
- **Nota de cuidado crítico:** ${a.critical_care_note || 'Ninguna'}
- **Advertencias (no hacer):** ${a.do_not_do_warnings || 'Ninguna'}
- **Propósito:** ${a.purpose_tags?.join(', ') || 'No definido'}
- **Banderas de riesgo:** ${a.risk_flags?.join(', ') || 'Ninguna'}
- **Descripción:** ${a.description || 'Sin descripción'}
- **Tareas asignadas:** ${assetTasks.length}
- **Intervenciones completadas:** ${assetCompletions.length}
- **Última intervención:** ${lastCompletion ? `${lastCompletion.completed_at} - ${lastCompletion.task?.title || 'Tarea'}` : 'Sin registro'}
`;
}).join('\n')}

---

## TAREAS DE MANTENIMIENTO (${tasks.length})

${tasks.length === 0 ? 'No existen tareas registradas en el sistema.' : tasks.map((t, i) => {
  const taskAsset = assets.find(a => a.id === t.asset_id);
  const taskZone = zones.find(z => z.id === t.zone_id);
  const taskCompletions = completions.filter(c => c.task_id === t.id);
  
  return `
### Tarea ${i + 1}: ${t.title}
- **Descripción:** ${t.description || 'Sin descripción'}
- **Activo asociado:** ${taskAsset?.name || 'Ninguno'}
- **Zona asociada:** ${taskZone?.name || 'Ninguna'}
- **Frecuencia:** ${t.frequency || 'Una vez'}
- **Estado:** ${t.status}
- **Prioridad:** ${t.priority || 'Normal'}
- **Fecha límite:** ${t.due_date || 'Sin fecha'}
- **Requiere foto:** ${t.required_photo ? 'Sí' : 'No'}
- **Intervenciones registradas:** ${taskCompletions.length}
`;
}).join('\n')}

---

## HISTORIAL DE INTERVENCIONES (${completions.length})

${completions.length === 0 ? 'No existen intervenciones registradas.' : completions.slice(0, 50).map((c, i) => `
${i + 1}. **${c.task?.title || 'Tarea'}** - ${c.completed_at}
   - Completado por: ${c.completed_by?.full_name || 'Usuario no identificado'}
   - Activo: ${c.task?.asset?.name || 'No especificado'}
   - Zona: ${c.task?.zone?.name || 'No especificada'}
   - Notas: ${c.notes || 'Sin notas'}
   - Foto: ${c.photo_url ? 'Sí' : 'No'}
   ${c.amendment_note ? `- Nota de enmienda: ${c.amendment_note}` : ''}
`).join('\n')}

${completions.length > 50 ? `\n(Se muestran las primeras 50 de ${completions.length} intervenciones)` : ''}

---

## REGISTROS DE CAMPO (CHECK-INS) (${checkins.length})

${checkins.length === 0 ? 'No existen registros de campo.' : checkins.slice(0, 30).map((c, i) => `
${i + 1}. ${c.checkin_at} - ${c.user?.full_name || 'Usuario'}
   - Ubicación: ${c.asset?.name || c.zone?.name || 'General'}
   - Coordenadas GPS: ${c.gps_lat && c.gps_lng ? `${c.gps_lat}, ${c.gps_lng}` : 'No registradas'}
   - Notas: ${c.notes || 'Sin notas'}
   - Foto: ${c.photo_url ? 'Sí' : 'No'}
`).join('\n')}

${checkins.length > 30 ? `\n(Se muestran los primeros 30 de ${checkins.length} registros)` : ''}

---

## ALERTAS CLIMÁTICAS REGISTRADAS (${weatherAlerts.length})

${weatherAlerts.length === 0 ? 'No existen alertas climáticas registradas.' : weatherAlerts.map((a, i) => `
${i + 1}. ${a.fired_at} - ${a.severity?.toUpperCase() || 'INFO'}
   - Mensaje: ${a.message}
   - Estado: ${a.status}
`).join('\n')}

---

## DOCUMENTOS ASOCIADOS (${documents.length})

${documents.length === 0 ? 'No existen documentos registrados.' : documents.map((d, i) => {
  const docAsset = assets.find(a => a.id === d.asset_id);
  const docZone = zones.find(z => z.id === d.zone_id);
  
  return `
${i + 1}. **${d.title}** (${d.category})
   - Activo relacionado: ${docAsset?.name || 'Ninguno'}
   - Zona relacionada: ${docZone?.name || 'Ninguna'}
   - Fecha de expiración: ${d.expiry_date || 'Sin expiración'}
   - Notas: ${d.notes || 'Sin notas'}
`;
}).join('\n')}

---

CON ESTOS DATOS, GENERA EL MANUAL INTEGRAL COMPLETO SIGUIENDO LA ESTRUCTURA OBLIGATORIA.
`;
}
