# Índice del documento de tesis

**Portal Comedores: aplicación multiplataforma para las organizaciones sociales del Banco de Alimentos**

> Versión de trabajo. Quedan fuera de esta versión el módulo de mermas (postulaciones y retiros) y los
> agentes de IA y el canal de WhatsApp; se incorporarán en una revisión posterior. Los lugares donde
> encajan están marcados en los capítulos con `<!-- PENDIENTE: … -->`.

## Preliminares
- Resumen / Abstract
- Glosario (Banco de Alimentos, organización social, comedor, referente, cupo, distribución, remito,
  interacción, tenant, idempotencia, PWA, entre otros)

## Capítulo 1. Introducción y contexto
1.1 El Banco de Alimentos y su red de organizaciones sociales ·
1.2 Planteamiento del problema ·
1.3 Antecedentes y redefinición del proyecto ·
1.4 Justificación ·
1.5 Objetivos ·
1.6 Alcance y límites ·
1.7 Metodología de trabajo ·
1.8 Estructura del documento

## Capítulo 2. Marco teórico y tecnológico
2.1 Desarrollo de aplicaciones multiplataforma (nativas, híbridas, React Native, PWA) ·
2.2 Expo y Expo Router ·
2.3 TypeScript y contratos tipados (OpenAPI) ·
2.4 Estado del servidor y estado del cliente (TanStack Query, Zustand) ·
2.5 Formularios y validación en tiempo de ejecución (react-hook-form, zod) ·
2.6 Sistemas de diseño, Tailwind/NativeWind y accesibilidad ·
2.7 APIs REST: autenticación por token, multi-tenancy, idempotencia y limitación de tasa ·
2.8 Uso sin conexión y Progressive Web Apps

## Capítulo 3. Análisis y requerimientos
3.1 Actores ·
3.2 Relevamiento (inventario de la API, guía del Banco, serie "API organizaciones") ·
3.3 Requerimientos funcionales por módulo (sesión y perfil; organización, logística y documentación;
familias y miembros; contactos; pedidos de mercadería; lo recibido y cobertura nutricional;
comunicación con el Banco; avisos; recetario) ·
3.4 Requerimientos no funcionales ·
3.5 Historias de usuario y casos de uso ·
3.6 Reglas de negocio del Banco ·
3.7 Trazabilidad entre la propuesta y lo implementado ·
3.8 Brechas con el backend y su gestión

## Capítulo 4. Diseño y arquitectura del sistema
4.1 Arquitectura general (aplicación y API Mermab) ·
4.2 Arquitectura por capas del frontend ·
4.3 Modelo de dominio consumido ·
4.4 Diseño del cliente HTTP ·
4.5 Sesión y protección de rutas ·
4.6 Módulos condicionados al backend y modo simulado ·
4.7 Navegación y mapa de pantallas ·
4.8 Sistema de diseño y accesibilidad ·
4.9 Síntesis de decisiones de diseño

## Capítulo 5. Implementación y desarrollo
5.1 Entorno, herramientas y flujo de trabajo ·
5.2 Etapas del desarrollo ·
5.3 Infraestructura transversal ·
5.4 Implementación por módulo ·
5.5 Patrones aplicados ·
5.6 Herramientas propias ·
5.7 Problemas técnicos y soluciones

## Capítulo 6. Pruebas y validación
6.1 Estrategia de verificación ·
6.2 Prueba de humo contra la API real ·
6.3 Pruebas funcionales por módulo ·
6.4 Validación de requerimientos ·
6.5 Métricas

## Capítulo 7. Conclusiones y trabajos futuros
7.1 Cumplimiento de objetivos ·
7.2 Aportes ·
7.3 Lecciones aprendidas ·
7.4 Limitaciones ·
7.5 Trabajos futuros

## Anexos
A. Catálogo de endpoints consumidos ·
B. Registro de decisiones de diseño ·
C. Registro de problemas y soluciones ·
D. Extracto de la bitácora de desarrollo
