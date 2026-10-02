# Plan de acción hacia la entrega (noviembre 2026)

**Fecha:** 2026-10-02 · **Base:** [propuesta de tesis](../propuesta/propuesta-tesis.md) (reunión del 8/9 con el Banco),
guía de la API del Banco (`docs/bda/`), documentación de GoDubi (`docs/godubi/`) y estado del código.

## 1. Lectura clave de la propuesta

1. El **aporte técnico central** de la tesis son los **agentes de IA** (identificar procesos a automatizar y construir los agentes), no la app. La app es una de las dos interfaces.
2. Lo que se evalúa es una **demostración funcional + documentación del proceso** (y posiblemente un video).
3. **"Gestión de pedidos" de la propuesta no es lo mismo que las mermas.** La propuesta habla de que el comedor *solicite* alimentos e insumos indicando cantidades y motivo, y siga el estado. El backend lo nombra "Pedidos (`/org/distributions`)" y la guía del Banco dice que **todavía no existe**. Lo que construimos para mermas (postularse a una donación publicada) es otro flujo, que el Banco dejó fuera del alcance.
4. Tres funcionalidades de la propuesta **no tienen backend ni están planificadas en la guía del Banco**: stock interno del comedor (organización → familia), muro de necesidades y cursos/capacitación.
5. El canal **WhatsApp** es una de las dos interfaces principales y hoy está en cero; GoDubi no tiene conector de WhatsApp (sí de Telegram).

## 2. Propuesta vs. estado actual

| Funcionalidad (propuesta) | App | Backend (Banco) | Agente / WhatsApp | Estado |
|---|---|---|---|---|
| **Gestión de pedidos** (solicitar con cantidades y motivo, ver estado) | ❌ No hay pantalla de "nuevo pedido" (sí el flujo de mermas, apagado) | ❌ `/org/distributions` no existe | ❌ | **Falta casi todo** |
| **Registro de familias** (alta, composición, necesidades; por audio/texto vía agente) | ✅ Listado, detalle, resumen · 🟡 Alta hecha pero apagada | 🟡 Lectura sí; alta/edición no existe | ❌ Alta por audio/texto | **Parcial** |
| **Panel nutricional** (cobertura del aporte vs. necesidades) | 🟡 Cuota mensual, necesidades por edad/condición, g/persona/día | 🟡 Cuota y demografía sí; lo recibido por grupo nutricional no para este rol | ❌ | **Parcial** |
| **Cursos y capacitación** | 🟡 Pantalla de talleres (apagada, depende de programas) | ❌ Sin contenidos para comedores | ❌ | **Falta** |
| **Stock interno del comedor** (recibido → familias) | ❌ | ❌ No existe | ❌ | **Falta todo** (definir alcance) |
| **Muro / feed de necesidades** | ❌ | ❌ No existe | ❌ | **Falta todo** |
| Interfaz **app móvil** | ✅ Base, diseño, sesión, offline, PWA | — | — | **Avanzada** |
| Interfaz **chatbot WhatsApp + agentes** | 🟡 Chat in-app y contrato | — | ❌ Ningún agente construido; sin canal WhatsApp | **Inicial** |
| Extras construidos (no pedidos en la propuesta) | Recetario con escalado, avisos, perfil, organización | — | — | Suman a la demo |

### Avance estimado contra la propuesta

| Componente | Peso | Avance |
|---|---|---|
| Agentes de IA (aporte central) | 30 % | ~10 % (análisis, contrato, plan; nada construido) |
| Canal WhatsApp | 10 % | 0 % |
| App: base, diseño, sesión, infraestructura | 15 % | ~90 % |
| App: módulos de la propuesta (pedidos, familias, nutrición, cursos, stock, muro) | 20 % | ~30 % |
| Integración con el backend del Banco | 10 % | ~40 % |
| Documentación del proceso | 10 % | ~50 % |
| Demo y video | 5 % | 0 % |
| **Total** | | **≈ 30 %** |

> Es menor que la estimación anterior (~45 %) porque ahora se mide contra el alcance real de la propuesta,
> donde los agentes pesan más y aparecen módulos que no estaban en el plan inicial.

## 3. Decisiones que hay que tomar ya

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| A | **¿Quién hace el backend de lo que no existe?** (pedidos, alta de familias, stock interno, muro, cursos) | 1) Pedírselo al Banco y esperar · 2) Backend propio liviano para la tesis (p. ej. Supabase, que además tiene conector en GoDubi) · 3) Demostrar esas partes con datos simulados | Pedir al Banco **pedidos** y **alta de familias** (son de su dominio). Para **muro, stock interno y cursos**, si el Banco no lo planifica en 1–2 semanas, backend propio liviano: permite una demo funcional real y lo pueden usar la app y los agentes. |
| B | **Canal conversacional** | WhatsApp Business API (requiere número, aprobación de Meta y conector) · Telegram (conector nativo en GoDubi) para la demo | Pedir al Banco el número y el camino de WhatsApp; en paralelo, preparar la demo por Telegram como plan B. |
| C | **Procesos a automatizar con agentes** (lo pide la propuesta explícitamente) | Ver sección 4 | Priorizar: pedido conversacional, registro de familia por audio/texto, consulta de estado, recetas/nutrición. |
| D | **Modelo de lenguaje** | OpenAI económico / DeepSeek (API key del Banco) dentro de GoDubi | Lo que soporte GoDubi con la key del Banco; medir costo por interacción contra los 3–5 centavos de referencia. |
| E | **Reunión con el área social** (Fernández y Adrián) | — | Hacerla en las próximas 2 semanas: valida pedidos, stock, muro y cursos antes de construirlos. |

## 4. Procesos candidatos a automatizar con agentes

| Proceso | Entrada | Qué hace el agente | Depende de |
|---|---|---|---|
| **Pedido conversacional** | "Necesitamos 20 kg de arroz y leche para 60 chicos, se nos terminó" | Extrae productos, cantidades y motivo; confirma con el usuario; crea el pedido | Endpoint de pedidos (A) |
| **Registro de familia por audio/texto** | Audio: "Llegó la familia Pérez, mamá con 3 chicos, uno celíaco" | Transcribe (STT), estructura los datos, confirma, da de alta | Alta de familias (A) |
| **Consulta de estado** | "¿Cómo va mi pedido?" / "¿Cuándo retiramos?" | Consulta y responde en lenguaje simple | Pedidos / conector Mermab |
| **Recetas con lo que hay** | Alimentos + cantidad de personas | Sugiere recetas del recetario y escala cantidades | Sólo recetario (**sin dependencias**) |
| **Consulta nutricional** | "¿Qué les falta a los chicos esta semana?" | Cruza necesidades (demografía) con lo recibido | Demografía (hay) + recibido por grupo |
| **Publicar una necesidad** | "Se rompió la heladera" | Crea la publicación en el muro | Muro (A) |
| **Capacitación** | "Quiero aprender a hacer pan" | Recomienda cursos/contenidos | Contenidos de cursos |

## 5. Cronograma propuesto

| Semana | Foco | Entregables |
|---|---|---|
| **1 · 2–9 oct** | Alineación y decisiones | Enviar mensaje al Banco (+ esta brecha: pedidos y alta de familias); decidir A–E; reunión con área social agendada; GoDubi: orden "Portal Comedores" + worker Recetas + conexión MCP; contratos propuestos para pedidos, muro, stock y cursos (`docs/api-gaps.md`) |
| **2 · 9–16 oct** | Primer agente + pedidos en la app | Agente de Recetas funcionando en GoDubi (knowledge base); pantallas de **Nuevo pedido** y **Mis pedidos** (con datos simulados hasta tener backend); gateway app ↔ GoDubi |
| **3 · 16–23 oct** | Agentes de pedidos y familias | Agente de pedido conversacional; agente de registro de familia por texto/audio; canal WhatsApp o Telegram conectado |
| **4 · 23–30 oct** | Módulos nuevos | Muro de necesidades, stock interno (versión acotada) y cursos en la app (+ backend propio si aplica); panel nutricional con cobertura |
| **5 · 30 oct–6 nov** | Validación | APK instalable; prueba con 2–3 referentes de comedores (protocolo y encuesta); ajustes |
| **6 · 6–13 nov** | Demo y video | Guion de demo; video explicativo; datos de demo |
| **7 · 13 nov →** | Cierre | Escritura final de la tesis a partir de `docs/tesis/`; ensayo de la presentación |

## 6. Responsabilidades sugeridas (a acordar en el equipo)

| Frente | Qué incluye |
|---|---|
| App | Pedidos, muro, stock, cursos, panel nutricional, validación técnica en celular |
| Agentes | Diseño de procesos, workers en GoDubi, prompts, knowledge base, pruebas y costos |
| Coordinación con el Banco | Mensajes, reuniones (Santiago Helguera, área social), credenciales, WhatsApp |
| Documentación y demo | Bitácora, escritura de capítulos, video, protocolo de validación |

## 7. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El Banco no habilita pedidos ni alta de familias a tiempo | Los dos procesos centrales quedan sin backend real | Decisión A: backend propio o simulación documentada; contratos propuestos listos |
| WhatsApp Business no se consigue a tiempo | Falta una de las dos interfaces | Telegram como canal de demo (conector nativo en GoDubi) |
| Créditos / costo de GoDubi y del modelo | Agentes sin poder ejecutarse | Confirmar cuenta y saldo; medir costo por interacción |
| Requerimientos del área social distintos a lo planeado | Retrabajo | Reunión en semana 1–2, antes de construir los módulos nuevos |
| Poco tiempo para validar con usuarios | Tesis sin evidencia de uso | APK en semana 5 como máximo; protocolo corto |
