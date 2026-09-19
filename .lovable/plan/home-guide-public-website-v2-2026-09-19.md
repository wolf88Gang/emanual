# Home Guide Public Website V2

## Objetivo
Convertir la portada pública actual en una narrativa comercial más clara, continua y cinematográfica, manteniendo intacta la identidad Home Guide: crema cálido, verde estate, dorado botánico, fotografía propia y lenguaje operativo.

La implementación se limita a la experiencia pública no autenticada. No se modificarán el producto autenticado, datos, permisos, acceso, organizaciones, suscripciones, ONVO ni las reglas de precio.

## Estado confirmado
- La portada pública se muestra desde `src/pages/Features.tsx` únicamente cuando no hay sesión.
- La sesión autenticada conserva su redirección actual desde `/`.
- La portada ya importa el cálculo canónico `quote()`, sus constantes de precio y la conversión USD/CRC.
- La imagen principal actual es `estate_guide_4.jpg` y la página utiliza una segunda fotografía existente.
- La paleta pública ya está aislada bajo los tokens semánticos de Home Guide.

## Implementación

### 1. Arquitectura pública modular
Separar la portada en componentes específicos de landing:
- navegación flotante
- presentación principal
- problema operativo
- funcionamiento
- rutas de datos conectados
- audiencias
- vista de registro operativo
- capacidades
- diferencias estructurales
- confianza
- precios
- preguntas frecuentes
- cierre y pie de página

`Features.tsx` quedará como un compositor liviano de la página. El estado, cálculo e interacción del estimador permanecerán encapsulados dentro de `PricingSection`; no se volverá a concentrar la implementación en un archivo monolítico.

### 2. Identidad visual y tipografía
- Mantener exactamente los tokens públicos verde, crema y dorado indicados, además de los colores `estate-*` existentes.
- Aplicar Sora a títulos y Manrope a texto/UI solo dentro de la portada pública, sin cambiar la tipografía del producto autenticado.
- Usar escalas contenidas, medidas de lectura cortas, bordes finos, numeración translúcida y contenedores redondeados solo cuando aporten estructura.
- Crear un fondo continuo y sutil con los tokens de Home Guide; reservar el verde sólido para pocos momentos de énfasis.

### 3. Secuencia comercial
Construir las doce respuestas en el orden solicitado:
1. qué es Home Guide
2. fragmentación de contexto
3. organizar, ejecutar, documentar y compartir
4. valor de conectar los datos
5. públicos operativos
6. visibilidad del registro
7. capacidades reales
8. diferencias estructurales
9. confianza y privacidad
10. precio
11. preguntas de compra
12. siguiente acción

Toda la redacción tendrá versiones equivalentes y naturales en inglés, español y alemán. No se incluirán métricas, clientes, testimonios, certificaciones, automatizaciones ni módulos inventados.

Las primeras cuatro secciones conservarán literalmente la tesis y el copy comercial definido en el encargo: qué es Home Guide, fragmentación de contexto, organizar → ejecutar → documentar → compartir y un registro → múltiples usos. No se sustituirá por lenguaje SaaS genérico. En español se usará una sola voz profesional de usted: “Organice”, “Planifique”, “Documente”, “Comparta” y “Cree su cuenta”. Inglés y alemán preservarán el significado con redacción natural, no traducción literal.

### 4. Presentación y navegación
- Usar `estate_guide_4.jpg` como imagen principal de ancho completo, con una capa legible construida con verde estate y tonos neutros.
- Incorporar el texto y las llamadas a la acción definidos; “Crear cuenta” seguirá usando `/auth?mode=signup` y “Ver cómo funciona” hará desplazamiento suave a la sección correspondiente.
- Implementar navegación flotante clara con selector EN/ES/DE, ingreso, registro, foco visible y menú móvil accesible.
- Añadir, solo si mejora la composición, líneas topográficas estáticas o de movimiento mínimo en la parte derecha; nunca partículas, resplandores o estética tecnológica ajena.

### 5. Lenguaje de interacción y movimiento
Crear primitivas reutilizables y exclusivas de la portada:
- `HGReveal` con direcciones, retraso, duración, umbral y ejecución única
- `HGStaggerGroup` para entradas secuenciales
- `HGTextReveal` con máscara para títulos
- `LandingSectionHeading` con animación separada de eyebrow, título, subtítulo y nota

Los valores del encargo serán defaults reales del sistema, no referencias aproximadas:
- `HGReveal`: 720 ms, umbral 0.18, `cubic-bezier(0.22, 1, 0.36, 1)`, 28 px verticales y 34 px horizontales
- `HGTextReveal`: 820 ms, `translateY(108%)` y `cubic-bezier(0.16, 1, 0.3, 1)`
- `HGStaggerGroup`: paso de 90 ms
- revelado de medios: escala 1.035 → 1 durante 1100 ms
- línea de flujo: 2800 ms
- barrido del registro operativo: aproximadamente 7 s

Estos valores solo se ajustarán puntualmente cuando una composición concreta lo exija; los defaults permanecerán intactos.

La visibilidad se resolverá con `IntersectionObserver` y CSS, con contenido visible por defecto si el observador no existe. También se incorporarán:
- revelado suave de imágenes
- líneas de flujo animadas en “Datos conectados”
- barrido tenue de siete segundos sobre el registro operativo
- subrayados y desplazamientos mínimos al pasar el cursor
- pausa de efectos ambientales fuera de pantalla o con la pestaña oculta, si se usa ese efecto

`prefers-reduced-motion` eliminará animaciones y mostrará todo inmediatamente.

### 6. Composiciones clave
- **Problema:** título lateral fijo en escritorio y tres filas editoriales, sin tarjetas flotantes.
- **Cómo funciona:** línea temporal vertical con cuatro pasos y estados discretos.
- **Datos conectados:** visualización de relaciones con origen, línea animada, flecha y destinos; nunca cuatro tarjetas. Mantendrá explícitamente: Propiedad → Zonas → Activos → Tareas → Documentos; Tarea / visita → Responsable → Hora → Ubicación → Evidencia; Planta / ubicación → Protocolo → Cuidado → Historial → Reemplazo; Trabajo completado → Registro → Reporte → Portal del cliente → Seguimiento. En móvil se apilará sin desbordamiento.
- **Audiencias:** lista editorial en dos columnas con responsabilidades concretas.
- **Visibilidad operativa:** representación genérica y claramente demostrativa de propiedad, zona, trabajo, responsable, estado, evidencia, próxima acción y visibilidad del cliente; sin apariencia de datos reales, porcentajes, tendencias, clientes ficticios, KPI ni analítica inventada.
- **Capacidades:** composición editorial con capacidades existentes: sitios mapeados, tareas/visitas, evidencia, plantas, personal/herramientas y entrega al cliente.
- **Diferenciadores y confianza:** bordes estructurales, numeración discreta y afirmaciones respaldadas por funciones actuales.

Problema, Datos conectados, Audiencias y Diferenciadores conservarán composición editorial. No se convertirán en cuadrículas SaaS de tarjetas durante la implementación.

### 7. Precio y conversión
- Conservar `ADDONS`, `ANNUAL_MONTHS_CHARGED`, `BASE_PRICE_PER_PROPERTY_USD`, `quote()` y `CRC_PER_USD` como única fuente de verdad.
- Mantener mensual/anual, cantidad de propiedades, extras, USD/CRC, estimado en vivo y CTA de registro.
- Cambiar únicamente jerarquía, organización visual, transiciones y adaptación móvil.
- No tocar Checkout ni la integración ONVO.

### 8. Accesibilidad, rendimiento y estabilidad
- Jerarquía semántica de títulos, controles con nombre, estados `aria-pressed`, foco visible y navegación completa por teclado.
- Acordeón FAQ con transición máxima de 300 ms.
- Una o dos fotografías existentes, dimensiones estables y carga diferida para contenido no crítico.
- Sin dependencia pesada de animación, sin desplazamiento horizontal y sin contenido condicionado a que una animación termine.

## Detalles técnicos
- Componentes nuevos bajo un espacio exclusivo de landing, con estilos públicos acotados para no afectar la aplicación autenticada.
- Mantener el componente `Button` y los tokens semánticos existentes para todas las acciones.
- Añadir pruebas enfocadas a las primitivas de movimiento: revelado único, fallback sin observador y reducción de movimiento cuando sea práctico en el entorno actual.
- No introducir Framer Motion. El sistema se implementará con `IntersectionObserver` y CSS; cualquier excepción exigiría una limitación técnica demostrable antes de cambiar el enfoque.
- Preservar `Seo`, metadata, canonical actual, estructura indexable, titles, descriptions y rutas públicas existentes.
- No modificar el routing público: `/` conservará la decisión actual entre usuario autenticado y no autenticado, y `/features` seguirá redirigiendo como ahora. No se creará una landing paralela.

## Verificación final
- Ejecutar comprobación de tipos, pruebas existentes, pruebas nuevas y compilación.
- Probar navegación, idiomas, ingreso, registro y todos los controles del precio.
- Confirmar que una sesión autenticada mantiene su destino actual.
- Revisar visualmente 390, 768, 1024 y 1440 px.
- Confirmar ausencia de desbordamiento horizontal, saltos de imagen, errores de consola y recursos fallidos.
- Repetir la revisión con movimiento reducido y comprobar que todo el contenido sea visible.
- Realizar una revisión visual, no solo técnica, de continuidad entre secciones, ritmo del scroll, densidad de texto, jerarquía, sticky headings, motion y móvil a 390 px.
- Si la página compila pero se percibe genérica, fragmentada o excesivamente convertida en tarjetas, iterar antes de considerarla terminada.

## Resultado esperado
Una portada reconociblemente Home Guide que explica el sistema antes de presentar capacidades, conecta la historia comercial de principio a fin y se siente más intencional y premium sin adoptar la identidad de Nova Silva.
