# Anexos

## Anexo A. Catálogo de servicios de la API consumidos

URL base: `https://cloud.mermab.com/api`. Todos los servicios, salvo el inicio de sesión, requieren
`Authorization: Bearer`. Las escrituras llevan `Idempotency-Key`.

| Módulo | Método | Ruta | Uso |
|---|---|---|---|
| Sesión | POST | `/auth/login` | Inicio de sesión |
| Sesión | POST | `/auth/refresh` | Rotación del token |
| Sesión | POST | `/auth/logout` | Cierre de sesión |
| Sesión | GET | `/auth/me` | Usuario autenticado |
| Perfil | PUT | `/auth/profile` | Datos del usuario |
| Perfil | PUT | `/auth/password` | Cambio de contraseña |
| Organización | GET / PUT | `/org/profile` | Perfil de la organización |
| Organización | GET | `/org/stats` | Impacto |
| Organización | PUT | `/org/address` | Dirección |
| Organización | GET / PUT | `/org/logistics` | Capacidad logística |
| Documentación | GET | `/org/requirements` | Requisitos documentales |
| Documentación | GET | `/org/documents` | Documentos presentados (y descarga) |
| Documentación | GET | `/org/social-data` | Ficha social |
| Familias | GET / POST | `/org/families` | Lista y alta |
| Familias | GET / PUT / DELETE | `/org/families/{id}` | Detalle, edición y baja |
| Familias | POST | `/org/families/{id}/members` | Alta de miembro |
| Familias | PUT / DELETE | `/org/families/{id}/members/{memberId}` | Edición y baja de miembro |
| Familias | GET | `/org/families/demographics` | Resumen demográfico |
| Familias | GET | `/org/families/form-config` | Configuración del formulario |
| Familias | GET | `/org/families/members/search` | Búsqueda por DNI |
| Familias | GET | `/org/family-types` | Tipos de familia |
| Contactos | GET / POST | `/org/contacts` | Lista y alta |
| Contactos | PUT / DELETE | `/org/contacts/{id}` | Edición y baja |
| Pedidos | GET | `/org/catalog` | Catálogo |
| Pedidos | GET | `/org/quota` | Cupo del mes |
| Pedidos | GET / POST | `/org/distributions` | Lista y alta de pedidos |
| Pedidos | GET | `/org/distributions/{id}` | Detalle |
| Pedidos | POST | `/org/distributions/{id}/cancel` | Cancelación |
| Pedidos | GET | `/org/distributions/{id}/receipt` | Remito PDF |
| Lo recibido | GET | `/org/received` | Entregas por período |
| Nutrición | GET | `/org/nutrition` | Cobertura por grupo |
| Comunicación | GET / POST | `/org/interactions` | Lista y alta |
| Comunicación | GET | `/org/interactions/{id}` | Detalle |
| Comunicación | GET | `/org/interactions/summary` | Contadores |
| Avisos | GET | `/notifications` | Lista |
| Avisos | GET | `/notifications/unread-count` | No leídos |
| Avisos | POST | `/notifications/{id}/read` · `/notifications/read-all` | Marcar como leído |
| Avisos | DELETE | `/notifications/{id}` · `/notifications` | Eliminar |
| Avisos | POST | `/notifications/subscribe` · `/unsubscribe` | Suscripción Web Push |
| Diagnóstico | GET | `/health` · `/capabilities` | Estado del servicio |

## Anexo B. Registro de decisiones de diseño

Se omiten D-10 y D-11, referidas a los agentes de IA, que se incorporarán en una versión posterior
del documento.

| Código | Fecha | Decisión | Fundamento |
|---|---|---|---|
| D-01 | 25/09 | Ubicar todo el código fuente bajo `src/` (rutas en `src/app/`), con el alias `@/`. Los directorios `scripts/` y `docs/` quedan en la raíz. | Convención de Expo Router; separación entre rutas y resto del código. |
| D-02 | 25/09 | Usar Expo SDK 57 sin actualizar durante el proyecto. | Era la versión estable al iniciar; estabilidad de las dependencias. |
| D-03 | 25/09 | Generar con `openapi-typescript` los tipos de las solicitudes y escribir a mano, con zod, los de las respuestas; usar un cliente HTTP propio en lugar de `openapi-fetch`. | La especificación no documenta las respuestas (G-01). |
| D-04 | 25/09 | Ejecutar el servidor web de desarrollo en el puerto 3000. | El CORS del backend no admite el puerto predeterminado de Expo. |
| D-05 | 25/09 | Exportar la web como aplicación de página única. | La aplicación está completamente autenticada; la generación estática no aporta beneficios. |
| D-06 | 25/09 | Enviar `Idempotency-Key` en todo método de escritura, salvo inicio, cierre y renovación de sesión. | Seguridad ante reintentos. |
| D-07 | 25/09 | Desactivar las rutas tipadas de Expo. | El generador producía rutas inválidas (P-02). |
| D-08 | 30/09 | Acoplar la aplicación al backend real: interruptores por módulo, rutas protegidas, simulación con las formas reales y sus defectos, rutas de familia en singular, rotación del token a las 12 h y reintentos coordinados. | La guía del Banco pasa a ser la fuente de verdad. |
| D-09 | 30/09 | Reescribir en TypeScript la prueba de humo provista por el Banco. | El script original requería herramientas no disponibles en Windows. |
| D-12 | 14/10 | Migrar familias a `/org/families*` y dar a cada módulo su propio archivo de servicios y sus claves de consulta. | El servidor resuelve la organización a partir del usuario; trabajo en paralelo sin conflictos. |
| D-13 | 14/10 | Implementar la comunicación con el Banco sin interruptor, sólo con alta y lectura, con seguimiento en tres pasos y límites de longitud del backend. | Servicio documentado con respuestas reales; la API no permite editar ni borrar. |
| D-14 | 14/10 | Activar el módulo de pedidos con la API real y presentarlo como "Mercadería". | Verificado con lecturas contra el servidor; se evita la confusión con otros usos de "pedido". |
| D-15 | 14/10 | Armar el pedido en dos pasos (catálogo y confirmación), con el borrador en memoria, fecha por chips, reglas del Banco aplicadas en el cliente y advertencias mostradas después del envío. | Revisión previa al envío; menos dependencias nativas; prevención de errores. |
| D-16 | 20/10 | Gestionar contactos sobre `/org/contacts`, con pantallas propias, identidad bloqueada si están autorizados y edición parcial. | Reglas del Banco; autorizar es atribución exclusiva del Banco. |
| D-17 | 20/10 | Resolver la solicitud de autorización reutilizando el formulario de comunicación, precompletado y con confirmación del usuario. | Indicación del Banco; reutilización de código. |
| D-18 | 20/10 | Activar el módulo de lo recibido y nutrición con la API real. | Verificado con la prueba de humo (25/25). |
| D-19 | 20/10 | Construir el panel nutricional sobre `/org/nutrition`, con mes navegable, cobertura total y por grupo, y niveles con ícono y texto. | Servicio indicado por el Banco para el rol de organización. |
| D-20 | 20/10 | Mostrar lo recibido con períodos predefinidos, resumen del período completo y filtro por origen. | Evita períodos inválidos; da contexto a la lista. |
| D-21 | 22/10 | Implementar perfil, logística y documentación sobre `/org/*`, con edición en hojas inferiores, envío de los campos modificados y lógica de formularios separada de la interfaz. | Servicios del rol de organización; verificado contra el servidor. |

## Anexo C. Registro de problemas técnicos y soluciones

| Código | Problema | Causa | Solución |
|---|---|---|---|
| P-01 | Los tipos generados mezclaban operaciones distintas. | Identificadores de operación duplicados en OpenAPI. | Normalizar la especificación antes de generar los tipos. |
| P-02 | Rutas tipadas de Expo inválidas. | El generador incluía archivos que no son pantallas. | Desactivar las rutas tipadas (D-07). |
| P-03 | Error del modo oscuro de NativeWind en la web. | Conflicto entre el modo `media` y el manejo de esquema de color de Expo. | Modo `class` y aplicación sólo en modo claro. |
| P-04 | Botones anidados (HTML inválido) en la web. | `Pressable` se representa como `<button>`. | Zonas presionables hermanas en lugar de anidadas. |
| P-05 | Diálogos que no se cerraban en la web. | El modal esperaba un evento de fin de animación que no llegaba. | Sin animación en la web para diálogos y hojas inferiores. |
| P-06 | Estado desactualizado restaurado desde la caché. | La caché persistida se consideraba fresca. | Tiempo de frescura cero en entidades con máquina de estados. |
| P-07 | Advertencia de `useNativeDriver` en la web. | Driver nativo de animación inexistente en la web. | Usarlo sólo en plataformas nativas. |
| P-08 | Errores de las reglas del React Compiler. | Acceso a referencias durante el renderizado y uso de `watch()`. | `useState` y `useWatch`. |
| P-09 | Escalado de recetas poco práctico. | Unidades caseras sin conversión. | Conversión a ml o litros desde unos 120 ml. |
| P-10 | Colisión de rutas `/familias`. | La pestaña y la carpeta de la pila resolvían la misma URL. | Rutas de detalle en singular. |
| P-11 | Pantallas ocultas accesibles por URL. | Ocultar una pestaña no deshabilita su ruta. | `Stack.Protected` y redirección. |
| P-12 | Reintentos que se multiplicaban. | Reintentos en el cliente HTTP y en la caché. | Reintentos coordinados y autolimitación. |
| P-13 | Credenciales rechazadas en la prueba de humo. | Formato incorrecto en el archivo de configuración. | Corrección del formato, con un diagnóstico que no expone la clave. |
| P-14 | La documentación afirmaba que `null` no borra un dato, y el servidor sí lo borraba. | Diferencia entre la documentación y la implementación del backend. | Edición parcial; simulación ajustada; brecha informada al Banco (G-15). |
| P-15 | Servicios de interacciones ausentes de OpenAPI. | La documentación vigente es más nueva que la especificación. | Tipos escritos a partir de las respuestas reales. |
| P-16 | `watch()` incompatible con el React Compiler. | Valores que no pueden memoizarse sin riesgo. | `useWatch`. |
| P-17 | Sin credenciales para probar un módulo contra la API real. | Configuración local incompleta. | Desarrollo contra respuestas documentadas y prueba en simulación; verificación real pendiente. |
| P-18 | El error 422 del servidor no se mostraba en el formulario de contactos. | El componente memoizado no se suscribía a los cambios de errores. | Leer el error desde `fieldState` de cada campo. |
| P-19 | "Mi organización" fallaba con la API real. | Un número llegaba como texto (`"300.00"`). | Formateadores que aceptan número o texto. |
| P-20 | Lista vacía en lo recibido. | `/org/received` usa otra forma de paginación. | Servicio específico que devuelve resumen, ítems y metadatos. |
| P-21 | El navegador integrado no recibía interacciones durante las pruebas. | Ventana sin dibujarse. | Chrome sin interfaz controlado por CDP, con pantalla de celular. |

## Anexo D. Extracto de la bitácora de desarrollo

Commits de trabajo del repositorio (se excluyen las integraciones de ramas, los commits que sólo completan la bitácora y los referidos a los agentes de IA). El detalle de cada entrada se encuentra en `docs/tesis/bitacora.md`.

| Commit | Fecha | Descripción |
|---|---|---|
| `456bf60` | 2026-09-25 | Initial commit |
| `ff0d176` | 2026-09-25 | chore: proyecto inicial Expo con soporte web |
| `d40260e` | 2026-09-25 | Testng borrar |
| `9451c0d` | 2026-09-25 | docs: relevamiento fase 0 (inventario de API, gaps, decisiones y mapa de pantallas) |
| `e14c185` | 2026-09-30 | Commit con esqueleto basico app front |
| `0d00782` | 2026-09-30 | feat: acoplar la app a la API real del Banco de Alimentos |
| `01d4acf` | 2026-10-01 | docs: documentación de tesis (bitácora, arquitectura, problemas y estado) |
| `ba74931` | 2026-10-02 | docs: propuesta de tesis y plan de acción |
| `914005c` | 2026-10-02 | docs: pedido integral al Banco y propuestas de contrato |
| `4b2d1c0` | 2026-10-14 | commit final |
| `23fa3f4` | 2026-10-14 | feat(familias): migrar el alta a /org/families y sumar la capa de edición |
| `d184ac1` | 2026-10-14 | feat: comunicación de la organización con el Banco (interacciones) |
| `e90ab0d` | 2026-10-14 | feat(familias): edición, baja y miembros desde la app |
| `a05df72` | 2026-10-14 | feat(familias): prender el alta y la edición con la API real |
| `a43f9a0` | 2026-10-14 | fix(familias): ajustar la app a lo verificado contra el servidor |
| `3466ed8` | 2026-10-14 | chore(bitacora): ignorar los commits de merge |
| `9e15ec1` | 2026-10-14 | cambios "mercaderia" |
| `6cfd9ce` | 2026-10-20 | feat(recibido): lo recibido y panel nutricional (post 11/14) |
| `61d675b` | 2026-10-20 | test(smoke): verificar lo recibido y panel nutricional contra la API real |
| `380f583` | 2026-10-20 | Contacto |
| `bbc55ee` | 2026-10-20 | docs: renumerar las decisiones del pilar 1 para integrar con main |
| `b276976` | 2026-10-22 | feat(perfil): perfil de la organización (post 3/14) |
