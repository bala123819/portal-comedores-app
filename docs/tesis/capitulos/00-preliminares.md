# Resumen

El presente trabajo describe el diseño y la implementación de Portal Comedores, una aplicación
multiplataforma destinada a los referentes de las organizaciones sociales (comedores y merenderos)
que integran la red del Banco de Alimentos. La aplicación permite gestionar de forma autónoma la
relación con el Banco:

- el padrón de familias asistidas y de sus miembros;
- los pedidos de mercadería, con su catálogo, cupo mensual, seguimiento y remito;
- la consulta de lo recibido y de la cobertura nutricional por grupo de alimentos;
- la comunicación formal con el Banco;
- los contactos autorizados a retirar alimentos;
- el perfil, la logística y la documentación de la organización.

Se construyó con Expo y React Native sobre una única base de código, que se ejecuta en Android, iOS y
como aplicación web progresiva. Se integra con la API REST de la plataforma Mermab, en producción, que
pertenece al Banco y no es controlada por el equipo. El trabajo pone el foco en la construcción de un
cliente robusto frente a un backend externo con documentación incompleta. Para eso se diseñaron una
arquitectura en capas, un cliente HTTP con autolimitación y reintentos coordinados, claves de
idempotencia por intención del usuario, caché persistente para el uso sin conexión, interruptores de
módulos según la disponibilidad del backend y un entorno de simulación fiel a las respuestas reales. La
validación combinó análisis estático, pruebas de humo y verificación de supuestos contra el servidor
real, y pruebas funcionales de punta a punta. El proceso se documentó commit por commit, con un
registro de decisiones, problemas y brechas del backend.

**Palabras clave:** aplicación multiplataforma, React Native, Expo, integración de API REST,
idempotencia, uso sin conexión, banco de alimentos, organizaciones sociales.

# Abstract

This work describes the design and implementation of Portal Comedores, a cross-platform application
for the coordinators of the social organizations (community kitchens) in the Food Bank network. The
application lets them manage their relationship with the Food Bank on their own: the register of
assisted families and their members; food orders, with the catalog, the monthly quota, order tracking
and delivery notes; what they received and its nutritional coverage by food group; formal
communication with the Food Bank; the contacts authorized to pick up food; and the organization's
profile, logistics and documents.

It was built with Expo and React Native from a single codebase that runs on Android, iOS and as a
progressive web app. It integrates with the production REST API of the Mermab platform, which belongs
to the Food Bank and is outside the team's control. The work focuses on building a client that stays
robust against an external backend with incomplete documentation. To that end, the team designed a
layered architecture, an HTTP client with self-imposed rate limiting and coordinated retries,
per-intent idempotency keys, a persisted cache for offline use, module toggles that follow backend
availability, and a mock environment faithful to the real responses. Validation combined static
analysis, smoke tests and verification of assumptions against the real server, and end-to-end
functional tests. The process was documented commit by commit, with logs of decisions, problems and
backend gaps.

**Keywords:** cross-platform application, React Native, Expo, REST API integration, idempotency,
offline use, food bank, social organizations.

# Glosario

| Término | Definición |
|---|---|
| Banco de Alimentos | Organización sin fines de lucro que recupera alimentos y los distribuye entre organizaciones sociales. |
| Organización social | Comedor, merendero u otra entidad que asiste a familias y recibe mercadería del Banco. |
| Referente o coordinador | Persona que gestiona la organización frente al Banco; es el usuario de la aplicación (rol `organization_coordinator`). |
| Mermab | Plataforma de gestión del Banco, cuyo backend expone la API consumida por la aplicación. |
| Cupo mensual | Cantidad de kilogramos de mercadería que corresponde a una organización en un mes. |
| Pedido de mercadería (distribución) | Solicitud de productos del catálogo del Banco por parte de una organización. |
| Remito | Comprobante en PDF de un pedido listo para retirar. |
| Interacción | Mensaje formal de la organización al Banco: suceso, solicitud, consulta o reclamo. |
| Merma | Producto donado próximo a vencer o sin valor comercial que el Banco publica para su rescate. |
| Inquilino (*tenant*) | Cada banco de alimentos dentro de la plataforma multiinquilino. |
| Idempotencia | Propiedad de una operación cuya ejecución repetida produce el mismo efecto que una única ejecución. |
| *Idempotency-Key* | Encabezado HTTP con un identificador único que permite al servidor reconocer una operación repetida. |
| PWA | Aplicación web progresiva: aplicación web instalable y con capacidades sin conexión. |
| Prueba de humo (*smoke test*) | Verificación rápida de que las funciones principales de un sistema responden correctamente. |
| Modo simulado (*mocks*) | Configuración en la que la aplicación responde con una API simulada en lugar de la real. |
| Interruptor de módulo (*feature toggle*) | Mecanismo que activa o desactiva una funcionalidad sin modificar el código. |
| D-xx, P-xx, G-xx | Códigos del registro de decisiones de diseño, de problemas técnicos y de brechas del backend, respectivamente. |
