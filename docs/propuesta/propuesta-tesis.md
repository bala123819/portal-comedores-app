# Propuesta de proyecto de tesis (transcripción)

> Transcripción de `propuesta_tesis.docx` (original en esta carpeta). Documento de la reunión del
> 8 de septiembre de 2026 con el Banco de Alimentos. Es el **alcance acordado** de la tesis.

**Portal digital y agentes de IA para organizaciones del Banco de Alimentos**
UNSTA · Seminario de Informática — Equipo: Balardini Tomás, Martina Gonella, Julieta Leiro · Referente institucional: Santiago Helguera (Banco de Alimentos) · 8 de septiembre de 2026

## 1. Contexto y antecedentes
La propuesta original se enfocaba en la logística de distribución entre las sucursales de La Anónima y las organizaciones sociales. En la reunión del 8/9, Santiago Helguera explicó que esa vertical ya la está implementando el propio Banco desde el 1/9 por una decisión estratégica de La Anónima, con tiempos incompatibles con una tesis. Se acordó redefinir el proyecto hacia la relación entre el Banco y las **organizaciones sociales (comedores)**, sin la misma urgencia operativa y con más libertad de diseño.

## 2. Decisión adoptada
- **Descarte de la logística comercial** (distribución con La Anónima), ya cubierta por una implementación corporativa.
- **Nueva vertical:** organizaciones sociales (comedores): distribución de pedidos, gestión de familias, información nutricional y capacitación.
- **Arquitectura:** portal para comedores con una **app móvil minimalista** y un **chatbot de WhatsApp con agentes de IA**, como dos interfaces de un mismo sistema.
- **Responsabilidades:** el backend Laravel lo desarrolla el Banco (~85–90 % avanzado); el equipo de tesis hace **el frontend completo y los agentes de IA**.

## 3. Idea del proyecto
Portal digital para los comedores de la red del Banco, con dos interfaces (app minimalista y chatbot de WhatsApp con agentes de IA), para digitalizar y agilizar la interacción con el Banco, reducir la intervención manual y facilitar el acceso a personas con distinto nivel de alfabetización digital.

### 3.1 Funcionalidades principales
1. **Gestión de pedidos:** solicitar alimentos e insumos (por app o por agente) indicando cantidades y motivo, y consultar el estado de pedidos anteriores.
2. **Registro de familias:** alta y administración de las familias asistidas (composición, edades, necesidades particulares), **incluso por audio o texto libre procesado por el agente**.
3. **Panel nutricional:** cómo el aporte del Banco cubre las necesidades nutricionales de la organización.
4. **Cursos y capacitación:** contenidos simples (cocina, oficios, formación básica), inspirado en programas existentes en Tucumán y Patagonia.
5. **Stock interno del comedor:** seguimiento de lo recibido del Banco y su distribución a las familias (trazabilidad organización → familia).
6. **Muro / feed de necesidades:** cada organización publica necesidades puntuales (p. ej. reparaciones), visibles para el Banco.

### 3.2 Interfaces de acceso
- **App móvil minimalista** para quienes tienen smartphone y prefieren app.
- **Chatbot de WhatsApp con agentes de IA** (texto o audio) para quienes prefieren o sólo tienen WhatsApp.

## 4. Herramientas y arquitectura técnica
| Componente | Herramienta | Responsable |
|---|---|---|
| Backend | Laravel (ya desarrollado, ~85–90 %) | Banco de Alimentos |
| Frontend / app móvil | A definir (desde cero) → **Expo / React Native** | Equipo de tesis |
| Agentes conversacionales | GoDubi (o n8n, a evaluar) → **GoDubi** | Equipo de tesis |
| Modelo de lenguaje | API de OpenAI (modelo económico) / alternativa DeepSeek | Equipo (API key del Banco) |
| Canal conversacional | WhatsApp Business API | Integración conjunta |
| Sistema de referencia | Mermab (mermas vía WhatsApp) y BAT / ERP del Banco | Banco de Alimentos |

Costos de referencia: cada interacción de agente (caso mermas) cuesta ~3–5 centavos de dólar por API. El Banco facilitará una API key para desarrollo y prueba de los agentes.

## 5. Alcance y requisitos académicos
- La tesis no exige profundizar en tecnicismos: exige una **demostración funcional** del sistema y **documentación del proceso**.
- Se evaluará un **video explicativo** del portal y los agentes, generado con apoyo de IA.
- El equipo debe **identificar los procesos a automatizar y construir los agentes de IA** (no sólo usar la plataforma): es el **aporte técnico central**.

## 6. Cronograma (de la reunión)
| Fecha | Acción | Responsable |
|---|---|---|
| 9/9 | Presentar la idea al profesor de la cátedra | Equipo |
| A la brevedad | Enviar notas de la reunión | Tomás → Santiago Helguera |
| Antes del viernes | Validar el enfoque con el equipo del Banco | Santiago Helguera |
| Viernes 11/9 | Reunión de seguimiento | Equipo + Santiago |
| A definir | Reunión con el área social del Banco (Fernández y Adrián) para validar requerimientos de comedores | Equipo + área social |
| Noviembre 2026 | Entrega / demostración | Equipo |

## 7. Observaciones
Pendientes de definición: herramienta de agentes (GoDubi vs n8n), detalle de la trazabilidad organización → familia y requerimientos que surjan de la validación con el área social.
