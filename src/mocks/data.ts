/**
 * Datos simulados para EXPO_PUBLIC_USE_MOCKS=true. Solo campos que existen en el OpenAPI.
 * Nombres y datos ficticios.
 */
import type { Assignment, OrganizationContact, Picker } from '@/features/asignaciones/types';
import type { Family, FamilyMember } from '@/features/familias/types';
import type { Merma } from '@/features/mermas/types';
import type { AppNotification } from '@/features/notificaciones/types';
import type { NutritionalGroup } from '@/features/nutricion/types';
import type { DocumentRequirement, Organization } from '@/features/org/types';
import type { Application } from '@/features/postulaciones/types';
import type { CollectionSession, Program, Training } from '@/features/programas/types';

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const at = (offset: number, hour: string) => `${day(offset)} ${hour}`;

export const ORG_ID = 'org-0001';

export function createMockDb() {
  // Formas tomadas de las respuestas reales (docs/bda/02-sesion-perfil-organizacion.md)
  const organization: Organization = {
    id: ORG_ID,
    name: 'Comedor Los Girasoles',
    legal_name: 'Asociación Civil Los Girasoles',
    tax_id: '30-00000000-0',
    organization_type: 'comedor',
    email: 'contacto@girasoles.test',
    phone: '+54 299 555 0101',
    total_beneficiaries: 6,
    services_per_day: 1,
    monthly_quota_kg: 198,
    status: 'aprobada',
    pickup_preference: 'pickup',
    preferred_pickup_days: ['martes', 'jueves'],
    preferred_pickup_time_start: '09:00:00',
    preferred_pickup_time_end: '12:00:00',
    has_refrigeration: true,
    has_own_vehicle: false,
    vehicle_capacity_kg: null,
    compliance_score: 0,
    geographic_zone: null,
    address: {
      street: 'Calle 12',
      street_number: '345',
      neighborhood: 'Barrio San Martín',
      city: 'Neuquén',
      state: 'Neuquén',
      postal_code: '8300',
      full_address: 'Calle 12 345, Barrio San Martín, Neuquén, Neuquén (8300)',
      latitude: null,
      longitude: null,
    },
  };

  const me = {
    id: 'e2e1ba9d-0000-4000-8000-000000000001',
    email: 'referente@ejemplo.test',
    first_name: 'Marta',
    last_name: 'Gómez',
    full_name: 'Marta Gómez',
    phone: '+54 299 555 0101',
    avatar_url: null,
    tenant_id: 'b393b130-0000-4000-8000-000000000001',
    tenant: { id: 'b393b130-0000-4000-8000-000000000001', name: 'Banco de Alimentos (simulado)', timezone: 'America/Argentina/Buenos_Aires' },
    roles: ['organization_coordinator'],
    permissions: ['mermas.edit_own'],
    is_verified: false,
    is_active: true,
    last_login_at: new Date().toISOString(),
    preferences: [] as unknown,
  };

  const mermas: Merma[] = [
    {
      id: 'merma-001',
      merma_number: 'M-2026-0412',
      title: 'Frutas y verduras del día',
      description: 'Excedente de verdulería. Buen estado, consumir en 2 días.',
      status: 'activa',
      priority: 'alta',
      is_urgent: true,
      publication_date: at(0, '08:00'),
      deadline: at(1, '18:00'),
      pickup_date: day(1),
      pickup_time_start: '09:00',
      pickup_time_end: '12:00',
      requires_refrigerated_transport: false,
      requires_loading_help: true,
      returnable_containers: true,
      special_requirements: ['Llevar cajones'],
      contact_name: 'Encargado de depósito',
      contact_phone: '221 555-0200',
      total_products: 3,
      total_kg: 85,
      donor: { id: 'donor-1', name: 'Supermercados del Sur' },
      donor_branch: {
        id: 'branch-1',
        name: 'Sucursal Centro',
        address: 'Av. 7 Nº 1200',
        city: 'La Plata',
        province: 'Buenos Aires',
      },
      distance_km: 3.4,
      products: [
        { id: 'mp-1', name: 'Manzanas', quantity: 30, unit: 'kg', category: 'fresco', nutritional_group: 'frutas_verduras', condition: 'good', expiry_date: day(3) },
        { id: 'mp-2', name: 'Zanahorias', quantity: 25, unit: 'kg', category: 'fresco', nutritional_group: 'frutas_verduras', condition: 'good', expiry_date: day(5) },
        { id: 'mp-3', name: 'Papas', quantity: 30, unit: 'kg', category: 'fresco', nutritional_group: 'frutas_verduras', condition: 'fair', expiry_date: day(10) },
      ],
    },
    {
      id: 'merma-002',
      merma_number: 'M-2026-0413',
      title: 'Lácteos próximos a vencer',
      description: 'Yogures y leche larga vida.',
      status: 'activa',
      priority: 'critica',
      is_urgent: true,
      deadline: at(0, '20:00'),
      pickup_date: day(0),
      pickup_time_start: '14:00',
      pickup_time_end: '18:00',
      requires_refrigerated_transport: true,
      requires_gel_coolers: true,
      total_products: 2,
      total_kg: 40,
      donor: { id: 'donor-2', name: 'Lácteos La Pampa' },
      donor_branch: { id: 'branch-2', name: 'Planta Tolosa', address: 'Calle 1 Nº 520', city: 'Tolosa', province: 'Buenos Aires' },
      distance_km: 6.1,
      products: [
        { id: 'mp-4', name: 'Leche larga vida', quantity: 24, unit: 'litros', category: 'no_perecedero', nutritional_group: 'lacteos', expiry_date: day(4) },
        { id: 'mp-5', name: 'Yogur bebible', quantity: 40, unit: 'unidades', category: 'fresco', nutritional_group: 'lacteos', weight_per_unit_kg: 0.2, expiry_date: day(1) },
      ],
    },
    {
      id: 'merma-003',
      merma_number: 'M-2026-0414',
      title: 'Almacén: arroz y fideos',
      status: 'activa',
      priority: 'normal',
      is_urgent: false,
      deadline: null,
      pickup_date: day(3),
      pickup_time_start: '10:00',
      pickup_time_end: '16:00',
      total_products: 3,
      total_kg: 120,
      donor: { id: 'donor-3', name: 'Distribuidora Norte' },
      donor_branch: { id: 'branch-3', name: 'Depósito Ringuelet', address: 'Camino Gral. Belgrano km 7', city: 'Ringuelet', province: 'Buenos Aires' },
      distance_km: 8.9,
      products: [
        { id: 'mp-6', name: 'Arroz largo fino', quantity: 40, unit: 'paquetes', category: 'no_perecedero', nutritional_group: 'cereales', weight_per_unit_kg: 1 },
        { id: 'mp-7', name: 'Fideos secos', quantity: 60, unit: 'paquetes', category: 'no_perecedero', nutritional_group: 'cereales', weight_per_unit_kg: 0.5 },
        { id: 'mp-8', name: 'Lentejas', quantity: 20, unit: 'kg', category: 'no_perecedero', nutritional_group: 'proteinas' },
      ],
    },
    {
      id: 'merma-004',
      merma_number: 'M-2026-0409',
      title: 'Pollo congelado',
      status: 'asignada',
      priority: 'alta',
      deadline: at(2, '12:00'),
      pickup_date: day(2),
      pickup_time_start: '08:00',
      pickup_time_end: '10:00',
      requires_refrigerated_transport: true,
      total_products: 1,
      total_kg: 50,
      donor: { id: 'donor-1', name: 'Supermercados del Sur' },
      donor_branch: { id: 'branch-4', name: 'Sucursal City Bell', address: 'Calle 14 G Nº 400', city: 'City Bell', province: 'Buenos Aires' },
      products: [
        { id: 'mp-9', name: 'Pata muslo de pollo', quantity: 50, unit: 'kg', category: 'congelado', nutritional_group: 'proteinas', expiry_date: day(30) },
      ],
    },
  ];

  const applications: Application[] = [
    {
      id: 'app-001',
      merma_id: 'merma-004',
      organization_id: ORG_ID,
      status: 'aprobada',
      message: 'Tenemos freezer para conservarlo.',
      requires_transport_help: false,
      created_at: at(-1, '10:30'),
      merma: mermas[3],
    },
    {
      id: 'app-002',
      merma_id: 'merma-003',
      organization_id: ORG_ID,
      status: 'pendiente',
      message: null,
      can_pickup_immediately: true,
      created_at: at(0, '09:10'),
      merma: mermas[2],
    },
  ];

  const assignments: Assignment[] = [
    {
      id: 'asg-001',
      merma_id: 'merma-004',
      application_id: 'app-001',
      organization_id: ORG_ID,
      status: 'asignada',
      scheduled_pickup_date: day(2),
      scheduled_pickup_time_start: '08:00',
      scheduled_pickup_time_end: '10:00',
      products: [{ id: 'ap-1', merma_product_id: 'mp-9', quantity_assigned: 50, name: 'Pata muslo de pollo', unit: 'kg' }],
      merma: mermas[3],
    },
    {
      id: 'asg-000',
      merma_id: 'merma-000',
      organization_id: ORG_ID,
      status: 'completada',
      scheduled_pickup_date: day(-6),
      scheduled_pickup_time_start: '09:00',
      scheduled_pickup_time_end: '11:00',
      picked_up_by_name: 'Carlos Pérez',
      picked_up_by_dni: '28123456',
      completed_at: at(-6, '10:15'),
      products: [
        { id: 'ap-0', merma_product_id: 'mp-0', quantity_assigned: 30, quantity_received: 30, name: 'Tomates', unit: 'kg' },
      ],
      merma: {
        id: 'merma-000',
        title: 'Tomates y cebollas',
        status: 'completada',
        donor: { id: 'donor-1', name: 'Supermercados del Sur' },
        donor_branch: { id: 'branch-1', name: 'Sucursal Centro', address: 'Av. 7 Nº 1200', city: 'La Plata' },
      },
    },
  ];

  const contacts: OrganizationContact[] = [
    { id: 'c-1', name: 'Marta Gómez', position: 'Referente', phone: '221 555-0101', dni: '22111222', is_primary: true },
    { id: 'c-2', name: 'Carlos Pérez', position: 'Voluntario', phone: '221 555-0102', dni: '28123456', is_primary: false },
    { id: 'c-3', name: 'Lucía Fernández', position: 'Cocinera', phone: null, dni: null, is_primary: false },
  ];

  const pickers: Record<string, Picker[]> = { 'asg-001': [] };

  const notifications: AppNotification[] = [
    { id: 'a2dd8761-0000-4000-8000-000000000001', type: 'merma_nueva', title: 'Nuevos alimentos disponibles', body: 'Lácteos próximos a vencer — retiro hoy de 14 a 18 h.', data: { merma_id: 'merma-002' }, action_url: '/notifications', is_read: false, read_at: null, created_at: at(0, '08:05') },
    { id: 'a2dd8761-0000-4000-8000-000000000002', type: 'sistema', title: 'Actualizamos las familias', body: 'La cuota mensual se recalculó con las familias cargadas.', data: {}, action_url: '/notifications', is_read: false, read_at: null, created_at: at(-1, '15:00') },
    { id: 'a2dd8761-0000-4000-8000-000000000003', type: 'sistema', title: 'Notificación de Prueba', body: '¡Las notificaciones están funcionando correctamente!', data: { test: true }, action_url: '/notifications', is_read: true, read_at: at(-6, '11:00'), created_at: at(-6, '10:20') },
  ];

  const nutritionalGroups: NutritionalGroup[] = [
    { id: 'ng-1', name: 'Cereales y legumbres', code: 'cereales', daily_recommended_grams: 300, color: '#F9A91F', display_order: 1 },
    { id: 'ng-2', name: 'Frutas y verduras', code: 'frutas_verduras', daily_recommended_grams: 400, color: '#34B277', display_order: 2 },
    { id: 'ng-3', name: 'Lácteos', code: 'lacteos', daily_recommended_grams: 500, color: '#2B8CEE', display_order: 3 },
    { id: 'ng-4', name: 'Carnes y huevos', code: 'proteinas', daily_recommended_grams: 130, color: '#D74242', display_order: 4 },
    { id: 'ng-5', name: 'Aceites y grasas', code: 'aceites', daily_recommended_grams: 30, color: '#2A6F4F', display_order: 5 },
  ];

  // Formas de /org/families (docs/bda/03-familias-avisos.md). Ids UUID como en la API real.
  const member = (m: Partial<FamilyMember> & Pick<FamilyMember, 'id' | 'first_name' | 'last_name'>): FamilyMember => ({
    full_name: `${m.first_name} ${m.last_name}`,
    document_type: 'dni',
    is_head_of_household: false,
    is_pregnant: false,
    is_nursing_mother: false,
    is_diabetic: false,
    is_celiac: false,
    is_lactose_intolerant: false,
    has_disability: false,
    has_special_conditions: false,
    nutritional_weight: 1,
    status: 'activo',
    ...m,
  });
  const families: Family[] = [
    {
      id: '85126eb7-1356-4c69-b689-bcc689147c3e',
      organization_id: ORG_ID,
      source: 'manual',
      code: 'FAM-2026-0029',
      name: 'Familia Rodríguez',
      registration_date: day(-120),
      phone: '+54 299 555 0301',
      total_members: 3,
      status: 'activa',
      housing_situation: 'alquilado',
      family_type: { id: 'ft-1', code: 'familia_funcional', name: 'Composición Familiar', color: '#4CAF50' },
      members: [
        member({ id: '68b5e0e8-0000-4000-8000-000000000001', first_name: 'Ana', last_name: 'Rodríguez', document_number: '30111222', birth_date: '1988-03-12', age: 38, age_group: 'adults_18_64', gender: 'femenino', relationship: 'jefe_hogar', is_head_of_household: true }),
        member({ id: '68b5e0e8-0000-4000-8000-000000000002', first_name: 'Tomás', last_name: 'Rodríguez', birth_date: '2016-07-02', age: 10, age_group: 'children_3_12', gender: 'masculino', relationship: 'hijo', is_celiac: true, has_special_conditions: true, nutritional_weight: 0.8 }),
        member({ id: '68b5e0e8-0000-4000-8000-000000000003', first_name: 'Sofía', last_name: 'Rodríguez', birth_date: '2025-01-20', age: 1, age_group: 'infants_0_2', gender: 'femenino', relationship: 'hijo', nutritional_weight: 0.5 }),
      ],
      head_of_household: { id: '68b5e0e8-0000-4000-8000-000000000001', full_name: 'Ana Rodríguez', document_number: '30111222' },
    },
    {
      id: '87809bec-3a09-4245-aaed-1e840f530848',
      organization_id: ORG_ID,
      source: 'manual',
      code: 'FAM-2026-0030',
      name: 'Familia Benítez',
      registration_date: day(-60),
      total_members: 2,
      status: 'activa',
      housing_situation: 'propietario',
      family_type: { id: 'ft-2', code: 'madre_sola_con_hijos', name: 'Madre sola con hijos', color: '#E91E63' },
      members: [
        member({ id: '2555c237-0000-4000-8000-000000000001', first_name: 'Carla', last_name: 'Benítez', birth_date: '1990-11-22', age: 35, age_group: 'adults_18_64', gender: 'femenino', relationship: 'jefe_hogar', is_head_of_household: true, is_pregnant: true, has_special_conditions: true, nutritional_weight: 1.3 }),
        member({ id: '2555c237-0000-4000-8000-000000000002', first_name: 'Lucas', last_name: 'Benítez', birth_date: '2010-05-10', age: 16, age_group: 'teens_13_17', gender: 'masculino', relationship: 'hijo' }),
      ],
      head_of_household: { id: '2555c237-0000-4000-8000-000000000001', full_name: 'Carla Benítez', document_number: null },
    },
    {
      id: 'c3a1b2d4-0000-4000-8000-000000000003',
      organization_id: ORG_ID,
      source: 'manual',
      code: 'FAM-2026-0031',
      name: 'Jorge Paz',
      registration_date: day(-30),
      total_members: 1,
      status: 'activa',
      housing_situation: 'prestado',
      family_type: { id: 'ft-3', code: 'adultos_mayores', name: 'Adultos mayores (65+)', color: '#795548' },
      members: [
        member({ id: 'd4e5f6a7-0000-4000-8000-000000000001', first_name: 'Jorge', last_name: 'Paz', birth_date: '1955-01-30', age: 71, age_group: 'seniors_65_plus', gender: 'masculino', relationship: 'jefe_hogar', is_head_of_household: true, is_diabetic: true, has_special_conditions: true }),
      ],
      head_of_household: { id: 'd4e5f6a7-0000-4000-8000-000000000001', full_name: 'Jorge Paz', document_number: null },
    },
  ];

  const requirements: DocumentRequirement[] = [
    { id: 'r-1', document_type: 'personeria_juridica', label: 'Personería jurídica', is_required: true, has_expiration: false, status: 'presentado' },
    { id: 'r-2', document_type: 'estatuto', label: 'Estatuto social', is_required: true, has_expiration: false, status: 'faltante' },
  ];

  const programs: Program[] = [
    { id: 'prog-1', name: 'Recolección en supermercados', program_type: 'recoleccion', frequency: 'mensual' },
    { id: 'prog-2', name: 'Cocina saludable', program_type: 'evento', frequency: 'unico' },
  ];

  const sessions: CollectionSession[] = [
    { id: 'cs-1', program_id: 'prog-1', program: programs[0], session_date: day(9), organization_id: ORG_ID, status: 'programada', volunteers_count: 6 },
  ];

  const trainings: Record<string, Training[]> = {
    'prog-2': [
      { id: 'tr-1', title: 'Manipulación segura de alimentos', scheduled_at: at(14, '10:00'), duration_minutes: 120, location: 'Sede del Banco de Alimentos', facilitator_name: 'Equipo de nutrición' },
    ],
  };

  return {
    me,
    organization,
    mermas,
    applications,
    assignments,
    contacts,
    pickers,
    notifications,
    nutritionalGroups,
    families,
    requirements,
    programs,
    sessions,
    trainings,
    familyTypes: [
      { id: 'ft-1', code: 'nuclear', name: 'Nuclear' },
      { id: 'ft-2', code: 'monoparental', name: 'Monoparental' },
      { id: 'ft-3', code: 'persona_sola', name: 'Persona sola' },
    ],
  };
}

export type MockDb = ReturnType<typeof createMockDb>;
