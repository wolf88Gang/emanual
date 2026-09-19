# Reposicionamiento público de Home Guide V2

## Objetivo
Ajustar la portada pública ya construida para presentar Home Guide como un sistema que conecta lugares físicos, activos, trabajo, personas e información operativa. Se conservarán su identidad visual, estructura modular, movimiento, precios y comportamiento técnico actuales.

## Estado confirmado
- La portada pública ya está separada en componentes y `Features.tsx` funciona como coordinador.
- La secuencia comercial, el fondo continuo, la navegación flotante, las animaciones, el precio interactivo y EN/ES/DE ya están implementados.
- El contenido actual todavía centra el hero en “cada propiedad”, usa una ruta de plantas como relación principal, muestra solo cuatro audiencias y presenta capacidades en seis filas demasiado generales.
- La taxonomía real admite servicios de plantas, paisajismo, servicios y administración de propiedades, activos, servicios generales e individuos. Plantas, cuidados y alquileres son módulos, no la categoría del producto.
- El SEO está repartido entre la metadata estática pública y el componente SEO de la portada; ambos conservan el dominio canónico `https://homeguide.casa/`.
- `/` mantiene la separación entre visitante y usuario autenticado; `/features` redirige a `/`; autenticación, checkout, administración y rutas privadas permanecen fuera de este trabajo.

## Implementación

### 1. Corregir la narrativa comercial completa
- Sustituir el copy de ES, EN y DE por la arquitectura y el significado definidos en el prompt, sin reinterpretaciones SaaS.
- Mantener español latinoamericano profesional con tratamiento de usted.
- Cambiar el hero a “Cada lugar tiene una operación. Home Guide la mantiene conectada.” y sus equivalentes naturales.
- Reescribir Problema, Cómo funciona, Datos conectados, Visibilidad, Diferenciadores, Confianza, FAQ y CTA final con el contenido indicado.
- Mantener el orden exacto de las doce preguntas comerciales.

### 2. Hacer visible el modelo operativo central
- Incorporar el diagrama conceptual:
```text
Cliente / propietario
        ↓
Sitio / propiedad
        ↓
Zona
        ↓
Activo
        ↓
Trabajo
        ↓
Persona
        ↓
Evidencia
```
- Mantener debajo las rutas de datos editoriales con línea animada.
- Reemplazar la ruta principal de plantas por la ruta genérica de activos: condición, mantenimiento, documentos e historial.
- Presentar plantas, cuidados y alquileres solamente como una configuración especializada posterior.
- Comunicar disponibilidad y continuidad de los datos, sin prometer automatizaciones inexistentes.
- Presentar la cadena como un modelo conceptual “cuando aplica”, no como una jerarquía obligatoria: una operación puede comenzar en un sitio; una tarea puede depender de un sitio o zona sin activo; documentos y evidencia pueden relacionarse con distintos niveles.
- No modificar el modelo de datos ni forzar que todos los registros recorran todos los niveles.
- Moderar “evidencia” en hero y problema; priorizar contexto, registro, historial, trabajo documentado e información operativa. Reservar “evidencia” para fotografías, check-ins, ubicación, visitas o comprobación del trabajo.

### 3. Ampliar audiencias sin convertirlas en industrias exclusivas
- Presentar ocho configuraciones operativas en este orden exacto: servicios y mantenimiento de propiedades; operaciones de campo; servicio de activos y equipos; paisajismo y áreas verdes; administración de propiedades; servicios de plantas; operación propia; configuración personalizada.
- Usar una lista editorial compacta de dos columnas, no una cuadrícula de tarjetas.
- Evitar que plantas, paisajismo, lujo o propiedad dominen el orden, las imágenes o el lenguaje.
- Dar a servicios de plantas exactamente la misma jerarquía visual que a las demás configuraciones; mencionar alquileres solo dentro de esa configuración o en capacidades especializadas.

### 4. Reorganizar capacidades reales por función
- Sustituir las seis filas actuales por una matriz editorial agrupada:
  - Lugares y contexto
  - Trabajo
  - Personas y recursos
  - Registros y evidencia
  - Entrega al cliente
  - Operaciones especializadas
- Basar cada grupo en los módulos y capacidades existentes: clientes, sitios, mapas, zonas, activos, GPS, KML/KMZ, tareas, visitas, mantenimiento, cuidados, recordatorios, turnos, horas, tarifas, herramientas, inventario, fotos, documentos, check-ins, historial, reportes, manuales, portales, facturación, plantas y alquileres.
- No inventar integraciones, resultados, métricas ni automatizaciones.

### 5. Refinar la representación operativa
- Ampliar el registro demostrativo con cliente/propietario, sitio, zona, activo, trabajo, responsable, estado, evidencia, próxima acción, visibilidad del cliente y documentos relacionados.
- Usar datos genéricos y neutrales, claramente presentados como representación del modelo.
- Conservar el barrido sutil de aproximadamente 7 segundos y eliminar cualquier lectura de panel analítico o KPI.

### 6. Preservar y ajustar el sistema visual
- Mantener exactamente la paleta semántica Home Guide, Sora/Manrope solo en la portada, fotografía actual, fondo continuo y uno o dos momentos verdes de énfasis.
- Conservar composiciones editoriales, encabezados sticky, bordes finos, numeración tenue y movimiento restringido.
- Mantener los defaults reales de movimiento: `HGReveal` 720 ms/0.18/28 px o 34 px, `HGStaggerGroup` 90 ms, `HGTextReveal` 820 ms/108%, media 1100 ms/1.035, líneas 2800 ms y barrido 7 s.
- No agregar Framer Motion, partículas, tarjetas SaaS genéricas ni nuevas fotografías.
- Mejorar la navegación para reflejar Cómo funciona, Para quién es, Capacidades y Precios sin alterar sus destinos de acceso.

### 7. Mantener precio, SEO y rutas como fuentes únicas
- Conservar `PricingSection` encapsulado y conectado únicamente a `ADDONS`, `ANNUAL_MONTHS_CHARGED`, `BASE_PRICE_PER_PROPERTY_USD`, `quote(...)` y `CRC_PER_USD`.
- No modificar checkout, ONVO, suscripciones, validación del servidor ni reglas de pago.
- Actualizar title, description, Open Graph, Twitter y JSON-LD estáticos a la nueva categoría amplia; mantener canonical, robots, sitemap e imagen social existentes.
- Actualizar el SEO dinámico de la portada con títulos y descripciones naturales en ES/EN/DE, sin crear rutas nuevas.
- No clasificar Home Guide como software de alquiler de plantas, paisajismo, administración de propiedades o facilities. Si se usa `SoftwareApplication`, describirlo ampliamente como software de operaciones para trabajo ligado a lugares físicos, sin inventar categorías ni afirmaciones schema.org.
- No modificar `App.tsx`, autenticación, módulos, arquetipos, base de datos, paneles ni rutas protegidas.

## Validación
- Pruebas de movimiento: aparición única, defaults, fallback sin IntersectionObserver y contenido visible con movimiento reducido.
- Pruebas de precio: mensual, anual, propiedades, cada adicional, USD, CRC y estimado en vivo.
- Pruebas de navegación: EN/ES/DE, anclas, acceso, creación de cuenta y menú móvil.
- Verificación de rutas públicas y autenticadas sin cambios, incluyendo `/`, `/features`, `/auth`, checkout, administración y cuenta de organización.
- Comprobación de tipos, pruebas existentes y compilación de producción.
- Revisión visual real a 390, 768, 1024 y 1440 px: claridad comercial, ritmo, continuidad, sticky, densidad, rutas conectadas, capacidad de lectura, ausencia de desbordamiento, imágenes, consola, recursos y movimiento reducido.
- Revisión final contra las quince preguntas de aceptación comercial; no se considerará terminado si la página todavía parece centrada en plantas, propiedades o una plantilla SaaS genérica.

## Resultado esperado
Una portada reconociblemente Home Guide que explique con claridad que el producto conserva el contexto entre lugares físicos, activos, trabajo, personas y registros cuando cada relación aplica; que admite distintas configuraciones operativas; y que plantas o alquileres son capacidades opcionales, no la identidad de la plataforma.
