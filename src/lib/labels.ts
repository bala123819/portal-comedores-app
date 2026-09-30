/**
 * Etiquetas legibles para los enums de la API (que vienen en español con snake_case).
 * Nunca mostrar el valor crudo: usar `label(map, value)`, que tiene fallback legible.
 */

export function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return map[value] ?? humanize(value);
}

export const mermaStatusLabels: Record<string, string> = {
  activa: 'Disponible',
  asignada: 'Asignada',
  en_proceso: 'En proceso',
  completada: 'Entregada',
  cancelada: 'Cancelada',
  vencida: 'Vencida',
  perdida: 'No retirada',
};

export const priorityLabels: Record<string, string> = {
  baja: 'Prioridad baja',
  normal: 'Prioridad normal',
  alta: 'Prioridad alta',
  critica: 'Muy urgente',
};

export const applicationStatusLabels: Record<string, string> = {
  pendiente: 'En revisión',
  aprobada: 'Aprobado',
  rechazada: 'No aprobado',
  cancelada: 'Cancelado',
};

export const assignmentStatusLabels: Record<string, string> = {
  asignada: 'Para confirmar',
  confirmada: 'Confirmado',
  en_camino: 'En camino',
  completada: 'Retirado',
  cancelada: 'Cancelado',
  no_show: 'No se retiró',
};

export const organizationStatusLabels: Record<string, string> = {
  pendiente: 'Pendiente de aprobación',
  verificada: 'Verificada',
  aprobada: 'Aprobada',
  suspendida: 'Suspendida',
  inactiva: 'Inactiva',
};

export const organizationTypeLabels: Record<string, string> = {
  comedor: 'Comedor',
  hogar: 'Hogar',
  cocina_comunitaria: 'Cocina comunitaria',
  escuela: 'Escuela',
};

export const unitLabels: Record<string, { one: string; many: string; short: string }> = {
  kg: { one: 'kilo', many: 'kilos', short: 'kg' },
  litros: { one: 'litro', many: 'litros', short: 'l' },
  unidades: { one: 'unidad', many: 'unidades', short: 'u.' },
  paquetes: { one: 'paquete', many: 'paquetes', short: 'paq.' },
  cajas: { one: 'caja', many: 'cajas', short: 'cajas' },
  docenas: { one: 'docena', many: 'docenas', short: 'doc.' },
};

export const productCategoryLabels: Record<string, string> = {
  no_perecedero: 'No perecedero',
  fresco: 'Fresco',
  congelado: 'Congelado',
  enlatado: 'Enlatado',
  bebida: 'Bebida',
};

export const productConditionLabels: Record<string, string> = {
  excellent: 'Excelente estado',
  good: 'Buen estado',
  fair: 'Estado regular',
  poor: 'Mal estado',
};

export const nutritionalGroupLabels: Record<string, string> = {
  cereales: 'Cereales y legumbres',
  frutas_verduras: 'Frutas y verduras',
  lacteos: 'Lácteos',
  proteinas: 'Carnes, huevos y legumbres',
  aceites: 'Aceites y grasas',
  otros: 'Otros',
};

export const pickupScopeLabels: Record<string, string> = {
  all: 'Cualquier retiro',
  donor: 'Solo de un donante',
  donor_zone: 'Solo de una zona',
  branch: 'Solo de una sucursal',
};

export const programTypeLabels: Record<string, string> = {
  recurrente: 'Recurrente',
  por_demanda: 'Por demanda',
  evento: 'Evento',
  recoleccion: 'Recolección',
};

export const frequencyLabels: Record<string, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  unico: 'Única vez',
};

export const sessionStatusLabels: Record<string, string> = {
  programada: 'Programada',
  confirmada: 'Asistencia confirmada',
  completada: 'Realizada',
  cancelada: 'Cancelada',
  no_show: 'No asistimos',
};

export const familyStatusLabels: Record<string, string> = {
  activa: 'Activa',
  inactiva: 'Inactiva',
  suspendida: 'Suspendida',
};

export const housingLabels: Record<string, string> = {
  propietario: 'Vivienda propia',
  alquilado: 'Alquila',
  prestado: 'Vivienda prestada',
  tomado: 'Vivienda tomada',
  en_situacion_de_calle: 'En situación de calle',
  otro: 'Otra situación',
};

export const genderLabels: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
  no_especificado: 'Sin especificar',
};

export const relationshipLabels: Record<string, string> = {
  jefe_hogar: 'Jefe/a de hogar',
  conyuge: 'Pareja',
  hijo: 'Hijo/a',
  padre_madre: 'Padre / madre',
  abuelo: 'Abuelo/a',
  nieto: 'Nieto/a',
  hermano: 'Hermano/a',
  tio: 'Tío/a',
  sobrino: 'Sobrino/a',
  otro_familiar: 'Otro familiar',
  no_familiar: 'No familiar',
};

export const documentTypeLabels: Record<string, string> = {
  dni: 'DNI',
  pasaporte: 'Pasaporte',
  otro: 'Otro',
};

export const employmentLabels: Record<string, string> = {
  empleado_formal: 'Trabajo registrado',
  empleado_informal: 'Trabajo no registrado',
  desempleado: 'Sin trabajo',
  jubilado_pensionado: 'Jubilado/a o pensionado/a',
  trabajo_domestico: 'Trabajo doméstico',
  otro: 'Otro',
};

export const educationLabels: Record<string, string> = {
  sin_instruccion: 'Sin estudios',
  primario_incompleto: 'Primaria incompleta',
  primario_completo: 'Primaria completa',
  secundario_incompleto: 'Secundaria incompleta',
  secundario_completo: 'Secundaria completa',
  terciario_universitario: 'Terciario / universitario',
  otro: 'Otro',
};

export const orgDocumentTypeLabels: Record<string, string> = {
  personeria_juridica: 'Personería jurídica',
  estatuto: 'Estatuto',
  inscripcion_renspa: 'Inscripción RENSPA',
};

export const requirementStatusLabels: Record<string, string> = {
  presentado: 'Presentado',
  aprobado: 'Aprobado',
  faltante: 'Falta presentar',
  pendiente: 'Pendiente',
  vencido: 'Vencido',
  rechazado: 'Rechazado',
};

export const socialDataLabels: Record<string, string> = {
  red_publica: 'Red pública',
  pozo: 'Pozo',
  bidon: 'Bidones',
  gas_red: 'Gas de red',
  gas_envasado: 'Garrafa',
  lena_carbon: 'Leña / carbón',
  estante: 'Estantes',
  tarima: 'Tarimas',
  piso: 'Piso',
  heladera: 'Heladera',
  freezer: 'Freezer',
  deposito: 'Depósito',
  propio: 'Propio',
  alquilado: 'Alquilado',
  comodato: 'Comodato',
  cedido: 'Cedido',
  desconocido: 'Sin dato',
  cuota_social: 'Cuota social',
  eventos: 'Eventos',
  otras: 'Otras',
  otro: 'Otro',
};

export const notificationTypeLabels: Record<string, string> = {
  merma_nueva: 'Nuevos alimentos',
};

/**
 * Etiquetas para claves de estadísticas cuya forma no está documentada
 * (`/org/stats`, demografía, resúmenes). Claves desconocidas → `humanize`.
 */
export const statLabels: Record<string, string> = {
  total_applications: 'Pedidos hechos',
  pending_applications: 'Pedidos en revisión',
  approved_applications: 'Pedidos aprobados',
  completed_assignments: 'Retiros realizados',
  total_assignments: 'Retiros asignados',
  total_kg_received: 'Kilos recibidos',
  total_kg: 'Kilos en total',
  kg_received: 'Kilos recibidos',
  total_families: 'Familias',
  total_members: 'Personas',
  total_beneficiaries: 'Personas asistidas',
  children: 'Niñas y niños',
  adults: 'Adultos',
  elderly: 'Personas mayores',
  pregnant: 'Embarazadas',
  celiac: 'Personas celíacas',
  diabetic: 'Personas diabéticas',
  scheduled: 'Jornadas programadas',
  attended: 'Jornadas asistidas',
  no_show: 'Ausencias',
  year: 'Año',
};
