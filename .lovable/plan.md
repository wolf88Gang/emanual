# Envío automático de correos de recordatorio

## Qué pasa hoy

En la pantalla de Recordatorios, el botón "Abrir para enviar" abre una ventana nueva con un enlace `mailto:`. En muchos navegadores (y en el preview) eso deja una **pestaña en blanco**: no es un error de la app, es que el correo se delega al programa de correo del equipo. Además nada se envía por sí solo: alguien tiene que abrir el correo y marcarlo como enviado a mano.

El dominio de envío `notify.homeguide.casa` ya está verificado, así que la plataforma ya puede enviar correos propios de Home Guide.

## Qué se va a construir

1. **Envío real desde la página**
   - El botón de correo pasa a ser "Enviar ahora": envía el recordatorio desde Home Guide, sin abrir el programa de correo del usuario.
   - Al terminar, el mensaje queda marcado como enviado con fecha y hora (registro auditable), o marcado con el error si el correo no se pudo entregar.
   - Si el contacto no tiene correo, se avisa igual que hoy.
   - WhatsApp sigue funcionando como hoy (abre WhatsApp), porque ese canal no se envía por correo.
   - Se agrega un botón "Enviar todos los pendientes" para la lista de pendientes de correo.

2. **Envío automático diario**
   - Una tarea diaria genera los recordatorios que corresponden ese día y envía por correo los que estén configurados como automáticos, respetando la hora de envío y la zona horaria ya configuradas por proyecto.
   - Los recordatorios en modo manual siguen esperando en la cola para revisión.

3. **Correo con marca Home Guide**
   - Plantilla de correo propia (encabezado, instrucción destacada, fecha, pie) en español, inglés y alemán, según el idioma del contacto.

4. **La pantalla en blanco**
   - Se elimina la apertura de `mailto:` como acción principal, que es la causa de la pestaña vacía. Queda como opción secundaria "Abrir en mi correo" para quien la prefiera, abierta en la misma pestaña para no dejar ventanas vacías.

## Detalles técnicos

- Plantilla de correo de app con `email_domain--scaffold_transactional_email_templates`; nueva plantilla `client-reminder` en `supabase/functions/_shared/transactional-email-templates/` con props: encabezado, cliente/proyecto, cuerpo, fecha, idioma.
- Nueva función `plantops-send-reminder` (`verify_jwt = true`): recibe `messageId`, valida pertenencia a la organización del usuario, marca `sending`, envía con `sendTemplateEmail` (`idempotencyKey` = `reminder-<messageId>`) y actualiza `sent`/`failed` en `client_message_outbox` mediante RPC existente (`plantops_mark_message_sent`) o actualización de estado con `last_error`.
- Reescribir `supabase/functions/plantops-dispatch-messages/index.ts` para usar `sendTemplateEmail` en lugar de la API de Resend, manteniendo `plantops_enqueue_due_client_reminders` y dejando WhatsApp en cola.
- Cron diario que invoca la función de dispatch (una sola vez al día, a la hora de envío por defecto), usando `pg_cron` + `pg_net`.
- `src/lib/plantopsComms.ts`: agregar `sendMessageNow(messageId)` que invoca la función; `src/pages/PlantOpsReminders.tsx`: botón "Enviar ahora", envío masivo de pendientes, y `mailto` como acción secundaria.
- Sin migraciones de tablas de correo, colas ni suscripciones: la entrega, reintentos y bajas las gestiona la infraestructura de correo de la plataforma.
- Verificación: envío de prueba a un contacto real, revisión del registro de entrega y comprobación de que el estado en pantalla cambia a enviado.
