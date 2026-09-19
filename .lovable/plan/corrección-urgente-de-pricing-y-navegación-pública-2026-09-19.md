# Corrección urgente de pricing y navegación pública

## Objetivo
Corregir únicamente la sección de precio/módulos y el encabezado público. La intervención conservará la estética oscura de Home Guide, la lógica de precios, checkout, ONVO, autenticación, rutas y producto privado.

## Diagnóstico confirmado
- La referencia cargada fue **OriginKit Pricing 02**. El archivo generado original ya no permanece en el proyecto, pero la implementación actual conserva su estructura principal: selector mensual/anual, panel dividido de configuración y resumen, y CTA. Se mantendrá esa base y se adaptará con mayor fidelidad en jerarquía y espaciado; no se copiará código incompatible de Next.js.
- La sección actual muestra cuatro opciones en filas de solo 40 px aproximados, con nombre y precio separados por 6 px y el divisor inmediatamente debajo. Por eso los precios se sienten atrapados.
- Home Guide tiene 17 módulos funcionales registrados. La portada actualmente mezcla esos módulos con paquetes comerciales: `plantops` es una opción de cobro, pero no es una clave de módulo; topografía pertenece funcionalmente a mapa/riesgo.
- El encabezado actual suma 88 px, combina una franja exterior sólida con una cápsula interior de 64 px, radio de 19.2 px, borde dorado y una línea superior decorativa. Esa doble capa explica el aspecto pesado y separado del hero.

## Implementación

### 1. Pricing 02 adaptado y con aire real
- Mantener la composición de Pricing 02: configuración a la izquierda y estimado persistente a la derecha en escritorio; apilado ordenado en móvil.
- Rehacer el selector como filas editoriales amplias, no como una lista comprimida:
  - nombre y descripción completa;
  - precio en un bloque propio, claramente separado;
  - control de selección estable;
  - padding vertical generoso, divisores suaves y estados seleccionado/no seleccionado inequívocos;
  - altura y distribución responsivas para que ninguna línea toque el precio.
- Mantener mensual/anual, USD/CRC, cantidad de propiedades, total y CTA conectados a `quote(...)` y a las constantes canónicas actuales.

### 2. Jerarquía correcta: operación, complementos y módulos
- Dividir visualmente las opciones cobrables en:
  - **Módulos y capacidades opcionales:** mano de obra y turnos, topografía/mapa/riesgo, facturación y finanzas.
  - **Configuración operativa especializada:** servicios de plantas. La opción técnica `plantops` seguirá calculándose igual, pero se presentará como configuración para colocaciones, cuidado, visitas, reemplazos/rotaciones y alquiler cuando aplique; nunca como “módulo de alquiler de plantas”.
- No modificar `ADDONS`, IDs, importes ni cálculo. Solo cambiar su presentación y nombre visible en la portada.
- Sustituir la afirmación ambigua de “14 incluidos” por un **mapa completo de capacidades reales** basado en el registro canónico de 17 módulos, agrupado editorialmente. Indicará que la disponibilidad depende de la configuración elegida, evitando afirmar que todo es gratuito.
- Mantener alquiler subordinado a servicios de plantas/capacidades especializadas y no mostrarlo como módulo comercial aislado.
- Actualizar el texto visible en español, inglés y alemán con el mismo significado.

### 3. Encabezado ligero e integrado
- Eliminar la doble barra visual: retirar la franja sólida pesada, su sombra inferior y la línea dorada superior.
- Reducir altura, padding vertical y radio; usar una geometría más contenida que conserve una intención flotante sin parecer una cápsula gigante.
- Aplicar un solo fondo de alta opacidad con blur moderado, borde neutro muy fino y sombra sutil.
- Incorporar una transición/scrim discreto alrededor del encabezado para ocultar contenido en desplazamiento sin crear otro bloque visible.
- Ajustar el espacio seguro del hero respecto al encabezado y revisar alineación de logo, enlaces, idioma y acciones.
- Mantener el menú móvil funcional, más compacto y correctamente separado del hero.

## Validación
- Comprobar los cálculos con mensual/anual, 1 y varias propiedades, todos los estados de selección y USD/CRC.
- Confirmar que los cuatro IDs cobrables siguen llegando sin cambios a `quote(...)` y que ningún precio fue alterado.
- Verificar que “alquiler de plantas” no aparezca como módulo aislado y que las 17 capacidades reales estén representadas sin inventar funciones.
- Revisar visualmente la sección y el encabezado a 390 px, 946 px y 1280 px: aire, alineación, divisores, estados, menú móvil, scroll y ausencia de texto legible detrás del nav.
- Ejecutar pruebas focalizadas, comprobación de tipos y compilación antes de cerrar.

## Archivos previstos
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/LandingSections.tsx`
- `src/components/landing/copy.ts`
- `src/index.css`
- pruebas de la landing/pricing si corresponde

## Límites
No se cambiarán precios, `quote(...)`, `ADDONS`, constantes monetarias, ONVO, checkout, autenticación, backend, suscripciones, rutas ni módulos internos.
