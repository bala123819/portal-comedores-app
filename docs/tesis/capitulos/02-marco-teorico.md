# Capítulo 2. Marco teórico y tecnológico

Este capítulo presenta los conceptos y las tecnologías sobre los que se construyó la aplicación. Para
cada tecnología se expone el problema que resuelve y el motivo de su elección en el contexto del
proyecto. La aplicación concreta de estos conceptos se desarrolla en los capítulos 4 y 5.

## 2.1 Desarrollo de aplicaciones multiplataforma

El desarrollo de aplicaciones móviles admite tres enfoques principales:

- **Aplicaciones nativas.** Se escriben en el lenguaje y con el SDK propios de cada sistema operativo
  (Kotlin o Java para Android; Swift u Objective-C para iOS). Ofrecen el máximo acceso al dispositivo y
  el mejor rendimiento, pero exigen mantener una base de código por plataforma.
- **Aplicaciones híbridas basadas en vistas web.** Empaquetan una aplicación web dentro de un
  contenedor nativo. Comparten el código, pero la interfaz se dibuja con tecnologías web y suele
  perder fluidez y coherencia con los controles del sistema.
- **Frameworks multiplataforma con interfaz nativa.** Permiten escribir la lógica una sola vez y
  generan, en tiempo de ejecución, componentes de interfaz nativos de cada plataforma. React Native
  pertenece a este grupo.

**React Native** es un framework de código abierto, mantenido por Meta y la comunidad, que aplica el
modelo de componentes de React al desarrollo móvil. Los componentes se escriben en JavaScript o
TypeScript y se traducen a vistas nativas de Android e iOS. La biblioteca **react-native-web** traduce
esos mismos componentes a elementos del DOM, lo que permite ejecutar la misma base de código en el
navegador.

Una **aplicación web progresiva** (*Progressive Web App*, PWA) es una aplicación web que, mediante un
manifiesto y un *service worker*, puede instalarse en el dispositivo, abrir sin conexión y recibir
notificaciones. Para este proyecto, la PWA es un canal de acceso sin instalación desde una tienda de
aplicaciones, útil en dispositivos con poco espacio de almacenamiento.

**Elección.** Se optó por React Native con react-native-web. Los usuarios del sistema usan
indistintamente Android, iOS o un navegador, y el equipo necesitaba mantener una única base de código
con un único lenguaje.

## 2.2 Expo y Expo Router

**Expo** es una plataforma y un conjunto de herramientas sobre React Native, y es el framework que la
documentación oficial de React Native recomienda para proyectos nuevos. Provee:

- un SDK de módulos nativos mantenidos y versionados en conjunto (almacenamiento seguro, sistema de
  archivos, ubicación, criptografía, entre otros);
- la **generación continua de proyectos nativos** (*Continuous Native Generation*): las carpetas
  `android/` e `ios/` se generan a partir de la configuración (`app.json` y *config plugins*), en
  lugar de editarse a mano;
- servicios en la nube (EAS) para compilar, firmar y distribuir la aplicación.

El proyecto utiliza **Expo SDK 57**, con React Native 0.86 y React 19.2.

**Expo Router** es el sistema de navegación de Expo y se basa en el sistema de archivos (*file-based
routing*): cada archivo dentro de `src/app/` es una pantalla, y la estructura de carpetas define las
URL. Los archivos `_layout.tsx` definen los navegadores (pilas, pestañas), y las carpetas entre
paréntesis, como `(auth)` o `(app)`, agrupan pantallas sin agregar segmentos a la URL. Este enfoque
ofrece enlaces profundos (*deep links*) y navegación web sin configuración adicional, y permite proteger
grupos completos de rutas en función del estado de la aplicación (`Stack.Protected`).

## 2.3 TypeScript y contratos tipados

**TypeScript** es un superconjunto de JavaScript que agrega un sistema de tipos estático. En una
aplicación cliente que consume una API externa, el beneficio principal es detectar en tiempo de
compilación las discrepancias entre lo que el código espera y lo que el contrato de la API define. Se
adoptó el modo estricto, que exige tratar explícitamente los valores posiblemente nulos.

**OpenAPI** es una especificación estándar para describir APIs REST: rutas, parámetros, cuerpos de
solicitud y respuestas. A partir de un documento OpenAPI, herramientas como **openapi-typescript**
generan automáticamente los tipos de TypeScript correspondientes. Cuando la especificación es
incompleta (por ejemplo, cuando no documenta las respuestas), los tipos se complementan con
definiciones escritas a mano y con validación en tiempo de ejecución.

## 2.4 Estado del servidor y estado del cliente

En las aplicaciones React conviene distinguir dos clases de estado:

- **Estado del servidor.** Son datos cuya fuente de verdad es remota (por ejemplo, el padrón de
  familias). Se obtienen de forma asíncrona, pueden quedar desactualizados y se comparten entre
  pantallas. Su gestión implica caché, revalidación, reintentos, paginación y deduplicación de
  solicitudes.
- **Estado del cliente.** Son datos que sólo existen en la aplicación, como la sesión activa o un
  pedido a medio armar.

**TanStack Query** (antes React Query) es una biblioteca especializada en el estado del servidor.
Cada consulta se identifica por una clave (*query key*) y se almacena en una caché que se revalida
según criterios configurables: tiempo de frescura (*stale time*), recuperación del foco o
reconexión. Las escrituras se modelan como **mutaciones**, que al terminar pueden invalidar las
consultas afectadas. La biblioteca incluye, además, un mecanismo de **persistencia** que guarda la
caché en el almacenamiento del dispositivo y la restaura al abrir la aplicación.

**Zustand** es una biblioteca mínima de estado global basada en *hooks*. Se eligió para el estado del
cliente por su bajo costo de adopción: no requiere proveedores ni código repetitivo.

## 2.5 Formularios y validación en tiempo de ejecución

**react-hook-form** gestiona formularios con componentes no controlados, lo que reduce la cantidad de
renderizados, un aspecto relevante en dispositivos de gama baja. Permite asignar errores a campos
individuales, incluidos los que devuelve el servidor.

**zod** es una biblioteca de esquemas que valida datos en tiempo de ejecución y, a la vez, deriva de
ellos los tipos de TypeScript. Se usa con dos fines: validar las entradas del usuario antes de enviarlas
y verificar que las respuestas de la API tengan la forma esperada, en los casos en que el contrato no lo
garantiza.

## 2.6 Sistemas de diseño, Tailwind y accesibilidad

Un **sistema de diseño** es un conjunto de decisiones visuales (colores, tipografía, espaciados,
radios) expresadas como *tokens*, más una biblioteca de componentes que las aplica de forma
consistente.

**Tailwind CSS** es un framework de estilos basado en clases utilitarias. **NativeWind** lleva ese
modelo a React Native: las mismas clases se traducen a estilos nativos en Android e iOS y a CSS en la
web. Así se mantiene un único lenguaje de estilos en las tres plataformas.

La **accesibilidad** se rige por las Pautas de Accesibilidad para el Contenido Web (WCAG 2.1) del W3C.
Para este proyecto resultan especialmente relevantes tres criterios: el tamaño mínimo de las áreas
táctiles, el contraste entre texto y fondo, y que la información no se transmita únicamente mediante el
color. La población usuaria incluye personas con baja alfabetización digital y dispositivos de pantalla
pequeña, por lo que también se consideró un principio de simplicidad: lenguaje llano, una acción
principal por pantalla y textos en español rioplatense.

## 2.7 APIs REST: autenticación, multiinquilino, idempotencia y limitación de tasa

**REST** (*Representational State Transfer*) es un estilo arquitectónico para sistemas distribuidos
basado en recursos identificados por URL y manipulados con los métodos del protocolo HTTP. Cada método
tiene una semántica: GET para leer, POST para crear, PUT para reemplazar o actualizar, DELETE para
eliminar. Los códigos de estado comunican el resultado: 2xx éxito, 4xx error del cliente, 5xx error del
servidor.

**Autenticación por token portador (*Bearer*).** El cliente obtiene un token al iniciar sesión y lo
envía en el encabezado `Authorization` de cada solicitud. La seguridad del esquema depende de que el
token se almacene de forma segura y tenga una vigencia acotada.

**Multiinquilino (*multi-tenancy*).** Un único despliegue del sistema sirve a varias organizaciones
(*tenants*), con aislamiento lógico de los datos. En el caso de estudio, la plataforma atiende a varios
bancos de alimentos, y cada usuario de una organización sólo accede a los datos de su propia
organización, que el servidor resuelve a partir del usuario autenticado.

**Idempotencia.** Una operación es idempotente si ejecutarla varias veces produce el mismo efecto que
ejecutarla una vez. Los métodos GET, PUT y DELETE lo son por definición; POST no lo es. En redes
inestables, un cliente que no recibió la respuesta de un POST no puede saber si la operación se
completó, y reintentarla puede duplicarla: dos pedidos de mercadería en lugar de uno, por ejemplo. El
patrón de la **clave de idempotencia** (*Idempotency-Key*), propuesto como encabezado estándar en un
borrador de la IETF, resuelve este problema. El cliente genera un identificador único por operación
lógica y lo envía en el encabezado. Si el servidor ya procesó una solicitud con esa clave, devuelve el
resultado original en lugar de repetir la operación.

**Limitación de tasa (*rate limiting*).** Los servidores limitan la cantidad de solicitudes por unidad
de tiempo para protegerse de abusos y sobrecargas. La respuesta convencional a un exceso es el código
429 (*Too Many Requests*), acompañado opcionalmente del encabezado `Retry-After`. Un cliente bien
diseñado respeta ese límite y espacia sus reintentos con espera exponencial (*exponential backoff*) y
una componente aleatoria (*jitter*), para no agravar la congestión.

## 2.8 Uso sin conexión

Las aplicaciones con estrategia *offline-first* asumen que la conexión puede faltar en cualquier
momento y muestran la última información conocida, en lugar de una pantalla de error. Para eso se
combinan tres mecanismos:

- la persistencia local de los datos leídos;
- la detección del estado de la red (en este proyecto, con **NetInfo**), que pausa y reanuda las
  solicitudes;
- la revalidación automática al reconectarse o al volver a la aplicación.

En la web, el *service worker* complementa estos mecanismos almacenando el esqueleto de la aplicación
(*app shell*), de modo que pueda abrirse aun sin conexión.

## 2.9 Síntesis del stack tecnológico

| Necesidad | Tecnología elegida | Motivo principal |
|---|---|---|
| Android, iOS y web desde un código | Expo SDK 57, React Native 0.86, react-native-web | Una base de código; recomendado por React Native |
| Navegación | Expo Router | Rutas por archivos, enlaces profundos y web automáticos |
| Lenguaje | TypeScript (estricto) | Detección temprana de errores de contrato |
| Estilos | NativeWind 4 (Tailwind) y tokens | Sistema de diseño único en las tres plataformas |
| Estado del servidor | TanStack Query con persistencia | Caché, reintentos, paginación y uso sin conexión |
| Estado del cliente | Zustand | Simplicidad |
| Formularios | react-hook-form y zod | Validación tipada y errores por campo |
| Tipos de la API | openapi-typescript y tipos propios | Contrato parcialmente documentado |
| Almacenamiento del token | expo-secure-store (nativo) | Almacenamiento cifrado del sistema operativo |
| Listas extensas | FlashList | Rendimiento en dispositivos de gama baja |
| Íconos | lucide-react-native | Livianos y consistentes |
