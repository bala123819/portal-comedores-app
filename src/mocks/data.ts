/**
 * Datos simulados para EXPO_PUBLIC_USE_MOCKS=true. Solo campos que existen en el OpenAPI.
 * Nombres y datos ficticios.
 */
import type { Assignment, OrganizationContact, Picker } from '@/features/asignaciones/types';
import type { Family } from '@/features/familias/types';
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
  const organization: Organization = {
    id: ORG_ID,
    name: 'Comedor Los Girasoles',
    organization_type: 'comedor',
    status: 'aprobada',
    address: 'Calle 12 Nº 345, Barrio San Martín',
    city: 'La Plata',
    state: 'Buenos Aires',
    phone: '221 555-0101',
    contact_person: 'Marta Gómez',
    service_count: 120,
    total_beneficiaries: 180,
    declared_families: 64,
    has_refrigeration: true,
    has_own_vehicle: false,
  };

  const me = {
    id: 'user-0001',
    email: 'referente@ejemplo.org',
    first_name: 'Marta',
    last_name: 'Gómez',
    phone: '221 555-0101',
    roles: ['organizacion'],
    permissions: ['org.portal'],
    organization_id: ORG_ID,
    tenant: { id: 'tenant-1', name: 'Banco de Alimentos La Plata' },
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
    { id: 'n-1', type: 'merma_nueva', title: 'Nuevos alimentos disponibles', message: 'Lácteos próximos a vencer — retiro hoy de 14 a 18 h.', read_at: null, created_at: at(0, '08:05'), data: { merma_id: 'merma-002' } },
    { id: 'n-2', type: 'postulacion_aprobada', title: 'Tu pedido fue aprobado', message: 'Pollo congelado: retiro el ' + day(2) + ' de 8 a 10 h.', read_at: null, created_at: at(-1, '15:00'), data: { assignment_id: 'asg-001' } },
    { id: 'n-3', type: 'retiro_completado', title: 'Retiro registrado', message: 'Gracias por retirar Tomates y cebollas.', read_at: at(-6, '11:00'), created_at: at(-6, '10:20'), data: { assignment_id: 'asg-000' } },
  ];

  const nutritionalGroups: NutritionalGroup[] = [
    { id: 'ng-1', name: 'Cereales y legumbres', code: 'cereales', daily_recommended_grams: 300, color: '#F9A91F', display_order: 1 },
    { id: 'ng-2', name: 'Frutas y verduras', code: 'frutas_verduras', daily_recommended_grams: 400, color: '#34B277', display_order: 2 },
    { id: 'ng-3', name: 'Lácteos', code: 'lacteos', daily_recommended_grams: 500, color: '#2B8CEE', display_order: 3 },
    { id: 'ng-4', name: 'Carnes y huevos', code: 'proteinas', daily_recommended_grams: 130, color: '#D74242', display_order: 4 },
    { id: 'ng-5', name: 'Aceites y grasas', code: 'aceites', daily_recommended_grams: 30, color: '#2A6F4F', display_order: 5 },
  ];

  const families: Family[] = [
    {
      id: 'fam-1',
      name: 'Familia Rodríguez',
      status: 'activa',
      housing_situation: 'alquilado',
      registration_date: day(-120),
      phone: '221 555-0301',
      members: [
        { id: 'fm-1', first_name: 'Ana', last_name: 'Rodríguez', relationship: 'jefe_hogar', is_head_of_household: true, gender: 'femenino', birth_date: '1988-03-12', employment_level: 'empleado_informal' },
        { id: 'fm-2', first_name: 'Tomás', last_name: 'Rodríguez', relationship: 'hijo', gender: 'masculino', birth_date: '2016-07-02', is_celiac: true },
        { id: 'fm-3', first_name: 'Sofía', last_name: 'Rodríguez', relationship: 'hijo', gender: 'femenino', birth_date: '2020-11-20' },
      ],
    },
    {
      id: 'fam-2',
      name: 'Familia Benítez',
      status: 'activa',
      housing_situation: 'propietario',
      registration_date: day(-60),
      members: [
        { id: 'fm-4', first_name: 'Jorge', last_name: 'Benítez', relationship: 'jefe_hogar', is_head_of_household: true, gender: 'masculino', birth_date: '1955-01-30', employment_level: 'jubilado_pensionado', is_diabetic: true },
      ],
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
