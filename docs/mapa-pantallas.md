# Propuesta de mapa de pantallas y navegación

Principio: una acción principal por pantalla, 4 pestañas + "Más". Términos de la interfaz pensados para referentes (entre paréntesis, el nombre técnico de la API). Las decisiones marcadas con ❓ se validan antes de la Fase 3.

## Navegación

```
(auth)
  /login                          Ingresar
  /sin-organizacion               "Esta app es solo para organizaciones" (me sin organización)

(app)  ── Tabs ─────────────────────────────────────────────────────────────
  1. Inicio          /                       Dashboard
  2. Disponibles ❓  /disponibles            Alimentos para retirar  (mermas disponibles)
  3. Mis retiros ❓  /retiros                Segmento: Pedidos (postulaciones) | Retiros (asignaciones)
  4. Recetas         /recetas                Recetario
  5. Más             /mas                    Menú del resto de módulos

  Header global: campana de notificaciones con badge de no leídas + botón WhatsApp.

(app) ── Stacks ────────────────────────────────────────────────────────────
  /disponibles/[id]                     Detalle de merma → CTA "Quiero retirarlo" (postularme)
  /disponibles/[id]/postular            Formulario de postulación (bottom sheet en mobile)
  /retiros/pedidos/[id]                 Detalle de postulación → "Cancelar pedido"
  /retiros/[id]                         Detalle de asignación: Stepper de estado + acción según estado
  /retiros/[id]/quien-retira            Contactos habilitados, declarar quién va, declarados
  /retiros/[id]/completar               Formulario: nombre + DNI de quien retiró + notas
  /recetas/[id]                         Detalle: ingredientes escalables + pasos
  /recetas/[id]/cocinar                 Modo paso a paso, letra grande
  /recetas/sugerir                      Agente de recetas: "¿Qué tenés y para cuántos?"
  /notificaciones                       Bandeja
  /mas/nutricion                        Grupos, resumen de lo recibido, cuota (si existe)
  /mas/familias, /mas/familias/[id]     Familias + resumen demográfico
  /mas/jornadas                         Jornadas de recolección y talleres (si hay permiso)
  /mas/documentacion                    Requerimientos, documentos, ficha social, carta
  /mas/perfil                           Perfil de usuario, contraseña, organización, cerrar sesión
  /mas/ayuda                            WhatsApp + preguntas frecuentes

dev/ (solo __DEV__)
  /dev/diagnostico, /dev/ui
```

## Pantallas clave

| Pantalla | Contenido | Acción principal | Endpoints |
|---|---|---|---|
| Inicio | Saludo + organización; 3 StatCards (org/stats); "Próximo retiro" (asignación más cercana); "Nuevos alimentos" (3 mermas); acceso a notificaciones | Ver próximo retiro | `/org/profile`, `/org/stats`, `/org/assignments?status=pending`, `/org/mermas/available?per_page=3`, `/notifications/unread-count` |
| Disponibles | Lista infinita: título, donante/sucursal, vencimiento (badge urgente), ventana de retiro, cantidad de productos. Filtros: urgentes, prioridad, distancia | Abrir detalle | `/org/mermas/available` |
| Detalle merma | Productos y cantidades, vencimientos, donante/sucursal, ventana de retiro, requisitos (frío, ayuda de carga…), resumen nutricional en barras, recetas sugeridas | **Quiero retirarlo** | `/org/mermas/{id}`, `/nutrition/merma/{id}/summary` |
| Mis retiros → Pedidos | Postulaciones con StatusBadge | Abrir / cancelar | `/org/applications` |
| Mis retiros → Retiros | Asignaciones agrupadas: "Para confirmar", "Próximos", "Historial" | Abrir | `/org/assignments` |
| Detalle retiro | Stepper `asignada → confirmada → en camino → completada`; fecha/hora; dirección de la sucursal; productos; quién retira | Según estado: **Confirmar** / **Salimos para allá** / **Ya lo retiramos**; secundaria: cancelar (con confirmación) | `/org/assignments/{id}` + acciones |
| Recetas | Búsqueda, chips de categoría, cards | Abrir | local |
| Detalle receta | Selector "¿Para cuántas personas?" (+/−), ingredientes escalados, pasos | **Empezar a cocinar** | local |

## Preguntas de UX para validar

1. ❓ **Nombre de "mermas" en la interfaz.** ¿Los referentes usan la palabra "merma"? Propuesta: "Alimentos disponibles" en la UI.
2. ❓ **Postulaciones y asignaciones en una sola pestaña** ("Mis retiros", con segmento Pedidos/Retiros) vs. dos pestañas separadas. Propuesta: una sola, para no pasar de 5 pestañas.
3. ❓ **Nombres de acciones**: "Postularme" → "Quiero retirarlo"; "Marcar en camino" → "Salimos para allá"; "Completar" → "Ya lo retiramos".
