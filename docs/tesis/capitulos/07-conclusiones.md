# Capítulo 7. Conclusiones y trabajos futuros

## 7.1 Cumplimiento de objetivos

| Objetivo específico | Grado de cumplimiento |
|---|---|
| 1. Relevar la API, sus reglas y sus brechas | **Cumplido.** Se documentaron las reglas de negocio de cada módulo y 20 brechas, que se comunicaron al Banco. Varias derivaron en la habilitación de servicios nuevos. |
| 2. Arquitectura en capas extensible por módulos | **Cumplido.** Los módulos se incorporaron a medida que el Banco los habilitó, sin modificar la infraestructura, y los integrantes del equipo trabajaron en paralelo en ramas independientes. |
| 3. Autenticación y sesión segura | **Cumplido.** Almacenamiento cifrado, rotación del token, protección declarativa de rutas y cierre de sesión con borrado de datos. |
| 4. Gestión de familias y miembros | **Cumplido.** Ciclo completo de alta, edición, baja y resumen, verificado contra el servidor. |
| 5. Circuito de pedidos de mercadería | **Cumplido.** Falta ejecutar el alta y la cancelación contra el servidor real. |
| 6. Lo recibido y cobertura nutricional | **Cumplido.** El criterio de niveles de cobertura queda pendiente de validación con el área social. |
| 7. Canal de comunicación con el Banco | **Cumplido.** Pendiente de verificación contra el servidor real. |
| 8. Contactos y perfil institucional | **Cumplido.** |
| 9. Requerimientos no funcionales | **Cumplido en su mayoría.** Falta medir el rendimiento y recorrer la aplicación en dispositivos reales. |
| 10. Documentación sistemática del proceso | **Cumplido.** Cada commit tiene su entrada de bitácora, verificada automáticamente. |

El objetivo general se alcanzó en la medida en que la aplicación permite al referente gestionar de
forma autónoma los aspectos de su relación con el Banco que el backend ofrece hoy al rol de
organización. Las funcionalidades de la propuesta que no se implementaron (stock interno, muro de
necesidades, cursos) no dependían del cliente, sino de servicios que el backend no provee.

<!-- PENDIENTE: evaluación del objetivo referido a los agentes de IA y al canal de WhatsApp, y del
módulo de mermas. -->

## 7.2 Aportes

1. **Una aplicación multiplataforma funcional**, integrada con un sistema real en producción, que
   cubre los procesos centrales de la relación entre las organizaciones sociales y el Banco.
2. **Un cliente robusto frente a un backend externo e imperfecto.** El trabajo aporta un conjunto de
   técnicas que puede reutilizarse en otros clientes de la misma plataforma: autolimitación,
   reintentos coordinados, idempotencia por intención, traducción de errores, normalización de
   formatos y activación de módulos por disponibilidad.
3. **Un entorno de simulación fiel a la API real**, que permite desarrollar, probar y demostrar sin
   afectar datos de producción.
4. **Retroalimentación al Banco.** El relevamiento de brechas, las propuestas de contrato y los
   defectos detectados (como la diferencia en el borrado con `null`) se entregaron al equipo del
   Banco como insumo para su backend.
5. **Un proceso de desarrollo documentado de forma trazable**: decisiones, problemas y verificaciones
   vinculados a cada commit.

## 7.3 Lecciones aprendidas

- **La documentación de una API no reemplaza la verificación.** En varias oportunidades, la
  especificación o la guía difirieron del comportamiento real del servidor: respuestas sin documentar,
  números enviados como texto, el borrado con `null`, formas de paginación distintas. La práctica de
  verificar cada supuesto antes de mostrarlo al usuario evitó errores en producción.
- **Depender de un backend ajeno exige diseñar para el cambio.** Los interruptores por módulo y el
  modo simulado permitieron avanzar en paralelo con el Banco, sin bloquearse y sin invocar servicios
  todavía no habilitados.
- **En redes inestables, la idempotencia es parte de la experiencia de usuario.** Un pedido duplicado
  por un reintento es un problema operativo concreto para la organización y para el Banco.
- **Ocultar no es proteger.** Las rutas deben protegerse de forma explícita, sobre todo en la web,
  donde el usuario puede escribir la URL.
- **La simulación debe reproducir también lo incorrecto.** Las simulaciones que omitían defectos o
  tipos reales del servidor ocultaron errores que aparecieron recién con la API real (P-19).
- **Documentar en cada commit reduce el costo final.** El registro continuo permitió redactar este
  documento a partir de evidencia y no de la memoria.
- **El trabajo en paralelo requiere convenciones de integración.** Al integrar las ramas hubo que
  renumerar decisiones y problemas que compartían códigos, lo que sugiere reservar rangos por
  integrante.

## 7.4 Limitaciones

- La aplicación depende por completo de la disponibilidad y del alcance del backend del Banco. Algunas
  funcionalidades de la propuesta quedaron fuera por falta de servicios.
- El entorno de pruebas es producción compartida, lo que limitó las pruebas de escritura reales.
- No hay una suite de pruebas automatizadas permanente (unitarias o de punta a punta).
- No se validó con usuarios reales ni se midió el rendimiento en dispositivos de gama baja.
- En la web, la aplicación sólo funciona desde los orígenes que admite el CORS del backend, y las
  notificaciones *push* nativas dependen de un ajuste del backend.
- El recetario contiene recetas de ejemplo; faltan los recetarios oficiales del Banco.

## 7.5 Trabajos futuros

- **Agentes de IA y WhatsApp.** Integrar el canal conversacional previsto en la propuesta.
- **Módulo de mermas.** Postulación a donaciones publicadas, retiros y declaración de quién retira,
  cuando el Banco lo habilite para el rol de organización.
- **Distribución.** Generar el APK y las compilaciones para tiendas con EAS Build, y probar en
  dispositivos reales de gama baja.
- **Validación con usuarios.** Definir un protocolo con referentes de comedores y medir la
  usabilidad.
- **Pruebas automatizadas.** Incorporar pruebas unitarias para la lógica de dominio (escalado de
  recetas, formularios, carrito) y pruebas de punta a punta versionadas en integración continua.
- **Notificaciones *push* nativas y recuperación de contraseña**, sujetas a cambios en el backend.
- **Funcionalidades de la propuesta sin backend:** stock interno del comedor, muro de necesidades y
  cursos de capacitación, a coordinar con el Banco.
- **Optimización de la versión web**, para reducir el tamaño del paquete (4,6 MB) y el tiempo de
  carga en conexiones lentas.
- **Recetarios oficiales del Banco**, mediante la herramienta de conversión ya desarrollada.

<!-- PENDIENTE: completar con lo que surja al incorporar mermas y agentes. -->
