# Renovación de la portada de Home Guide

## Objetivo
Conservar la identidad visual y el contenido real de la portada actual, mejorando su ritmo, organización y movimiento con patrones inspirados en Hero 21 y Pricing 02. No se copiará la estética de las propuestas descartadas.

## Dirección acordada
- Mantener el verde, crema y dorado actuales de Home Guide, con sus tokens semánticos y contraste accesible.
- Mantener la personalidad visual actual y el logo HG.
- Usar las plantillas solo como referencia para jerarquía, composición, transiciones y organización.
- Aplicar Sora en títulos y Manrope en texto para una lectura más arquitectónica, sin tamaños excesivos.
- Limitar la portada a una o dos imágenes actuales bien seleccionadas para mejorar velocidad y foco.

## Cambios
1. **Cabecera y primera vista**
   - Navegación compacta con idiomas EN/ES/DE, acceso y creación de cuenta.
   - Presentación editorial con una imagen existente, mensaje amplio para equipos que operan propiedades y CTA claros.
   - Eliminar el mensaje obsoleto de acceso solo por invitación.

2. **Narrativa y capacidades**
   - Reordenar el contenido existente en una secuencia breve: organizar, ejecutar, documentar y compartir.
   - Mostrar capacidades reales: clientes y propiedades, activos y zonas, tareas y visitas, mantenimiento, plantas, equipos, evidencia y portales.
   - Evitar tarjetas dentro de tarjetas, afirmaciones no verificables y enfoque exclusivo en un tipo de cliente.

3. **Precios interactivos**
   - Adaptar la organización de Pricing 02 al modelo vigente de Home Guide.
   - Selector mensual/anual, cantidad de propiedades, extras y USD/CRC.
   - Usar el cálculo central existente: $20 por propiedad al mes; anual equivalente a 10 meses; extras vigentes.
   - CTA hacia creación de cuenta y checkout, sin inventar planes o descuentos.

4. **Movimiento y velocidad**
   - Entradas sutiles por sección, transiciones de selección y respuesta ligera al pasar el cursor.
   - Respetar la preferencia del dispositivo para reducir movimiento.
   - Carga diferida de imágenes no críticas y dimensiones estables para evitar saltos visuales.

5. **Cierre de página**
   - Preguntas frecuentes concisas sobre cuenta, pago, monedas y modalidad anual.
   - CTA final y pie de página ligero con accesos reales.
   - Mantener todo el contenido disponible en inglés, español y alemán.

## Detalles técnicos
- Adaptar los patrones de OriginKit al proyecto React/Vite y al sistema de componentes existente, sin introducir dependencias de Next.js.
- Centralizar colores, sombras y tipografía en los tokens globales; no usar colores aislados dentro de la página.
- Conectar precios a la lógica existente para que portada y checkout no diverjan.
- Verificar enlaces, controles, cambio de idioma y estados de precio en escritorio y móvil.
- Ejecutar comprobaciones de tipos, pruebas, compilación y una revisión visual automatizada antes de cerrar.

## Resultado esperado
Una portada reconociblemente Home Guide, más rápida y clara, con la organización y fluidez de las referencias, precios reales y un recorrido directo desde descubrir el producto hasta crear una cuenta y pagar.
