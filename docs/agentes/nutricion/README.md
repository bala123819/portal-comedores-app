# Agente "Nutrición y Cocina" — guía paso a paso en GoDubi

Primer agente del proyecto. Responde **qué cocinar** con lo que tiene el comedor (o qué conseguir si no tiene nada),
adaptado a **quiénes comen** (edades, celiaquía, diabetes, embarazo, lactancia, intolerancia a la lactosa), y
preguntas de nutrición en lenguaje simple.

> Las pantallas de GoDubi se describen según su documentación (`docs/godubi/`). Los nombres exactos de los botones
> pueden variar: si algo no coincide, anotarlo acá.

## Archivos de esta carpeta

| Archivo | Para qué |
|---|---|
| [persona.md](persona.md) | Configuración y **system prompt** del worker (para pegar en GoDubi) |
| [instrucciones-orden.md](instrucciones-orden.md) | Instrucciones de la orden y **formato de respuesta JSON** |
| [conocimiento/recetario.md](conocimiento/recetario.md) | Recetario exportado de la app (`npm run agentes:conocimiento`) |
| [conocimiento/pautas-alimentarias.md](conocimiento/pautas-alimentarias.md) | Reglas por condición (borrador, a validar por nutricionista) |
| [casos-de-prueba.md](casos-de-prueba.md) | 12 casos para validar el agente y registro de resultados |

## Paso a paso

### Paso 1 · Cuenta y orden
1. Entrar a **godubi.com** con la cuenta del proyecto (la que habilite Santiago con los créditos).
2. Crear una **orden** (proyecto) llamada **`Portal Comedores`**. Todos los agentes del proyecto van a estar asignados a esta orden.

### Paso 2 · Crear el AI Worker
1. Ir a **AI Workers → Crear worker**.
2. Nombre: **`Nutrición y Cocina — Portal Comedores`**.
3. **Proveedor y modelo:** GoDubi permite elegir proveedor (OpenAI, Anthropic, Gemini, DeepSeek, entre otros). Según la propuesta, usar uno **económico** (por ejemplo de la línea "mini" de OpenAI o DeepSeek). Recomendación: arrancar con uno de calidad media para validar los casos de prueba y después probar uno más barato y comparar.
4. **Capabilities** (permisos), sólo estas:
   - `read_order_context`, `read_files`, `knowledge_search`
   - `knowledge_write` **sólo mientras se carga el conocimiento** (después se puede sacar)
   - **Nada más:** sin tareas, sin web, sin conectores, sin workspace, sin `external_api_call`.

### Paso 3 · Persona
Crear una **Persona** con los campos y el **system prompt** de [persona.md](persona.md) y asignarla al worker.

### Paso 4 · Asignar el worker a la orden e instrucciones
1. Asignar el worker a la orden **Portal Comedores**.
2. Cargar las **Instrucciones** de la asignación con [instrucciones-orden.md](instrucciones-orden.md) (projectContext, objectives, constraints, formato de respuesta).

### Paso 5 · Base de conocimiento
Cargar en el knowledge base del worker:
1. `conocimiento/recetario.md` (regenerarlo con `npm run agentes:conocimiento` si cambió el recetario).
2. `conocimiento/pautas-alimentarias.md`.
3. **Guías Alimentarias para la Población Argentina** (PDF oficial del Ministerio de Salud): https://www.argentina.gob.ar/sites/default/files/bancos/2020-08/guias-alimentarias-para-la-poblacion-argentina.pdf
4. Cuando lleguen: **recetarios del Banco** y sus **criterios nutricionales** (Excel/Word/PDF: GoDubi los procesa).

Dos formas de cargarlo:
- **Desde la UI** de GoDubi (subiendo los archivos al knowledge base o a la orden).
- **Desde Claude Code por MCP** (lo hago yo): ver paso 7.

### Paso 6 · Probar el worker
Mandarle consultas con este formato (es lo que va a mandar el gateway desde la app):

```
CONSULTA
Modo: con_ingredientes
Personas a cocinar: 60
Ingredientes disponibles: lentejas, arroz, papas, zanahorias, cebolla
Organización:
- Edades: bebés 0-2: 3 · niños 3-12: 20 · adolescentes 13-17: 5 · adultos 18-64: 27 · mayores 65+: 5
- Condiciones: celíacos: 2 · diabéticos: 1 · embarazadas: 1 · madres que amamantan: 0 · intolerantes a la lactosa: 0
- Equivalente en adultos: 52,4 · Cuota mensual: 1.700 kg
Pregunta: ¿Qué cocino hoy?
```
- `Modo` puede ser `con_ingredientes`, `sin_ingredientes` o `pregunta`.
- Recorrer los 12 casos de [casos-de-prueba.md](casos-de-prueba.md) y anotar resultado, costo y tiempo.
- **Cómo dispararlo desde GoDubi:** la documentación habla de órdenes, tareas, posts y triggers; confirmar con Santiago cuál es la forma de "chatear" o probar un worker desde la UI.

### Paso 7 · Conectarme por MCP (para cargar el conocimiento y correr las pruebas)
En una terminal, en la carpeta del proyecto:
```bash
claude mcp add --transport http godubi https://mcp.godubi.com/mcp
```
Después abrir `claude` en esa terminal, escribir `/mcp` → `godubi` → autenticar → en el navegador elegir el worker **Nutrición y Cocina** → Aprobar. Abrir una conversación nueva conmigo y pedirme "listá las herramientas del servidor godubi". Con eso puedo: cargar el knowledge base (`knowledge_save`), probar búsquedas (`knowledge_search`) y leer archivos de la orden (`file_read`).

> Ojo: conectado por MCP, yo actúo **como** el worker (uso sus herramientas), pero no ejecuto su modelo. Las respuestas del agente con su modelo se prueban desde GoDubi (paso 6) o, más adelante, desde el gateway.

### Paso 8 · Conectar con la app (después)
Gateway propio que recibe la consulta de la app (con los datos de demografía de la organización logueada), arma el texto del paso 6, delega en el worker y devuelve el JSON. Ver `docs/godubi/analisis.md` y `docs/agentes-contrato.md`.

## Por qué así (para la tesis)
- **No se entrena un modelo:** se combina un modelo general con instrucciones (persona), conocimiento propio (RAG) y el contexto de cada organización. Es más barato, se actualiza subiendo documentos y se puede auditar.
- **Los datos de la organización van en la consulta** (sólo cantidades, nunca nombres ni DNI): el agente no necesita acceso a la API del Banco (decisión D-10).
- **Las cuentas las hace la app:** el agente devuelve recetas para su base de porciones y la app escala.
- **Seguridad alimentaria** en tres capas: reglas en el system prompt, pautas en el knowledge base y casos de prueba que verifican que nunca recomiende algo inseguro.
