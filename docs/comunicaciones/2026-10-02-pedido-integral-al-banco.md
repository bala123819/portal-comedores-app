# Mensaje al Banco de Alimentos — 2026-10-02 (pedido integral)

**Para:** Santiago Helguera (referente del Banco y dueño de GoDubi) y equipo técnico del Banco. **Reemplaza** al borrador del 2026-10-01 (no enviado).
**Antes de enviar:** completar la línea del smoke test. **Adjuntos:** `docs/agentes-contrato.md` y la sección G-14 de `docs/api-gaps.md` (propuestas de contrato).

---

Hola Santiago, ¿cómo estás? Te escribimos con el estado del proyecto y con todo lo que necesitaríamos de su lado para llegar a la entrega de noviembre con una demo funcional, según lo que acordamos en la propuesta del 8/9.

## Cómo venimos

- **App:** conectada a la API con el usuario de prueba. Hoy funcionan login y sesión, perfil y clave, perfil y estadísticas de la organización, dirección, familias (lectura y resumen demográfico) y avisos. Respetamos todas las reglas de la guía (límite de pedidos, `Idempotency-Key`, validaciones, ids UUID). Smoke test: **[RESULTADO: … PASS, … FAIL]**. Las respuestas reales coinciden con la guía.
- **Ya construido y esperando backend:** pantallas de mermas y retiros, alta de familias, contactos que retiran, documentación y jornadas. Quedan apagadas hasta que se habiliten.
- **Agentes:** decidimos construirlos en **GoDubi**. Ya estudiamos su API y su MCP, y armamos un contrato de cómo la app les habla (adjunto).

## Lo que necesitaríamos

### 1. Backend (API Mermab) — lo más urgente

1. **Gestión de pedidos.** Es la primera funcionalidad de la propuesta (que el comedor pida alimentos e insumos con cantidades y motivo, y siga el estado). La guía dice que `/org/distributions` todavía no existe. ¿Está planificado? ¿Para cuándo? Adjuntamos una propuesta de cómo podría funcionar.
2. **Alta y edición de familias para la organización.** Hoy sólo lectura. Lo necesitamos para la app y para el agente que registra familias por audio o texto.
3. **Mermas y retiros para el rol de organización:** habilitar y probar `/org/mermas/available`, `/org/applications`, `/org/assignments` (y sus acciones) y `/assignments/{id}/pickers`, con alguna merma ficticia en el tenant de pruebas.
4. **Lo recibido por grupo nutricional** para la organización (para el panel nutricional: cuánto del aporte cubre las necesidades). ¿Podemos usar `/nutrition/summary` con este rol, o hay otra forma?
5. **Muro de necesidades, stock interno del comedor (trazabilidad organización → familia) y cursos/capacitación.** No figuran en la guía. ¿Los tienen en planes? Si no entran en sus tiempos, ¿están de acuerdo con que los resolvamos con un backend propio liviano sólo para la tesis, sin tocar el de ustedes?
6. **Menos urgente:** contactos y autorizaciones de retiro, documentos y ficha social, jornadas, editar teléfono y mail de la organización, recuperar contraseña.
7. **Bugs conocidos:** cuando puedan, que el servidor responda 422/404/429 en lugar de 500 (dirección inválida, id no UUID, límite de pedidos). La app ya los esquiva.

### 2. WhatsApp

8. **Número y cuenta de WhatsApp Business API** para el chatbot. ¿Podemos usar la misma infraestructura que ya tienen para Mermab (mermas por WhatsApp)? ¿Quién gestiona el número y la aprobación de Meta?
9. **Cómo se conecta WhatsApp con GoDubi:** en GoDubi no hay conector de WhatsApp (sí de Telegram). ¿Cómo lo resolvieron en Mermab? Si WhatsApp no llega a tiempo, ¿les parece bien que la demo de la tesis use **Telegram** como canal alternativo?

### 3. Agentes de IA y GoDubi

10. **Cuenta y créditos de GoDubi:** gracias por ofrecernos los créditos. ¿Cómo lo armamos? ¿Nos creás una cuenta u organización para el proyecto y le asignás los créditos ahí?
11. **API key del modelo de lenguaje** (OpenAI económico o DeepSeek) que mencionaste en la reunión, para que la usen los agentes.
12. **Conector Mermab de GoDubi:** ¿qué acciones tiene y con qué credencial se configura? Necesitaríamos que apunte al **tenant de pruebas** y con permisos mínimos.
13. **Brief de integración GoDubi ↔ Mermab** (el link de GitLab nos da 403) y, si es posible, acceso al catálogo de herramientas del **MCP server de Mermab** (`mcp-server/TOOLS.md`).
14. **Modo Builder de GoDubi** (beta, por invitación): ¿nos lo podés habilitar? Nos permitiría crear los agentes desde nuestro entorno de desarrollo.
15. **Canal de entrada:** ¿GoDubi tiene alguna forma oficial de que una app externa le hable a un agente y reciba la respuesta (API o webhook)? Si no, armamos un servicio intermedio propio que delegue en los workers.

### 4. Contenidos

16. **Recetarios del Banco** (en el formato que tengan: Excel, Word o PDF). La app ya tiene un recetario con escalado según cantidad de personas.
17. **Contenidos de cursos y capacitación** de los programas de Tucumán y Patagonia que mencionaste (videos, PDFs, links).
18. **Tablas o criterios nutricionales** que use el Banco (por ejemplo, cómo calculan la cuota y el peso nutricional de cada persona), para el panel nutricional y el agente nutricional.

### 5. Validación y avisos

19. **Reunión con el área social** (Fernández y Adrián) para validar pedidos, stock, muro y cursos antes de construirlos. ¿Podemos agendarla en las próximas dos semanas?
20. **Prueba con 2 o 3 referentes de comedores** entre fines de octubre y principios de noviembre, como parte de la validación de la tesis.
21. **Avisos en el celular:** `/notifications/subscribe` sólo acepta Web Push. ¿Se podría aceptar un token de Expo o FCM para la app nativa? Para la versión web, ¿nos pasan la **clave pública VAPID**?
22. **CORS:** cuando tengamos el dominio de la versión web, ¿lo pueden sumar a los orígenes permitidos?

## Prioridades

Si tuviéramos que elegir, lo más importante para la demo es: **(1) pedidos, (2) alta de familias, (8–9) WhatsApp, (10–12) cuenta y créditos de GoDubi, key del modelo y conector Mermab, y (19) la reunión con el área social.** Lo que no se pueda, lo dejamos documentado como trabajo futuro en la tesis.

¡Muchas gracias!
Tomás, Martina y Julieta
