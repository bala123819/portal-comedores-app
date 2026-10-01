import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';
import {
  Building2,
  CalendarDays,
  Car,
  Clock,
  LocateFixed,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Scale,
  ShieldCheck,
  ShieldOff,
  Snowflake,
  Truck,
  UserPlus,
  Users,
  Utensils,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  ErrorState,
  Header,
  InfoRow,
  Input,
  Screen,
  SectionHeader,
  SkeletonList,
  SwitchRow,
  Text,
  toast,
} from '@/components/ui';
import {
  useAuthorizations,
  useAuthorizePickup,
  useContacts,
  useCreateContact,
  useRevokeAuthorization,
} from '@/features/asignaciones/hooks';
import type { OrganizationContact } from '@/features/asignaciones/types';
import { useOrgProfile, useUpdateAddress } from '@/features/org/hooks';
import type { Organization } from '@/features/org/types';
import { features } from '@/lib/features';
import { formatDate, formatNumber, formatTimeRange } from '@/lib/format';
import {
  label,
  organizationStatusLabels,
  organizationTypeLabels,
  pickupDayLabels,
  pickupPreferenceLabels,
  pickupScopeLabels,
} from '@/lib/labels';
import { humanMessage } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';

function addressText(o: Organization): string | null {
  const a = o.address;
  if (!a) return null;
  return a.full_address || [[a.street, a.street_number].filter(Boolean).join(' '), a.neighborhood, a.city, a.state].filter(Boolean).join(', ') || null;
}

/** La API manda las coordenadas como número o como string ("-38.95160000") */
function toCoord(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Campos de `PUT /org/address`: street*, city*, state*, latitude*, longitude* (+ opcionales) */
const addressSchema = z.object({
  street: z.string().trim().min(1, 'Escribí la calle').max(255),
  street_number: z.string().trim().max(50).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1, 'Escribí la localidad').max(100),
  state: z.string().trim().min(1, 'Escribí la provincia').max(100),
  postal_code: z.string().trim().max(20).optional(),
});
type AddressValues = z.infer<typeof addressSchema>;

function AddressSheet({ org, visible, onClose }: { org: Organization; visible: boolean; onClose: () => void }) {
  const update = useUpdateAddress();
  const a = org.address ?? null;
  const lat0 = toCoord(a?.latitude);
  const lng0 = toCoord(a?.longitude);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    lat0 !== null && lng0 !== null ? { latitude: lat0, longitude: lng0 } : null,
  );
  const [locating, setLocating] = useState(false);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: a?.street ?? '',
      street_number: a?.street_number ?? '',
      neighborhood: a?.neighborhood ?? '',
      city: a?.city ?? '',
      state: a?.state ?? '',
      postal_code: a?.postal_code ?? '',
    },
  });

  const locate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Necesitamos permiso de ubicación para ubicar la organización en el mapa.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      toast.error('No pudimos obtener la ubicación. Probá de nuevo al aire libre.');
    } finally {
      setLocating(false);
    }
  };

  const save = handleSubmit((v) => {
    if (!coords) {
      toast.error('Falta la ubicación en el mapa: tocá “Estoy en la organización”.');
      return;
    }
    update.mutate(
      {
        street: v.street,
        street_number: v.street_number || null,
        neighborhood: v.neighborhood || null,
        city: v.city,
        state: v.state,
        postal_code: v.postal_code || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      { onSuccess: onClose, onError: (e) => applyFieldErrors(e, setError) },
    );
  });
  const field = (name: keyof AddressValues, labelText: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => <Input label={labelText} value={f.value} onChangeText={f.onChange} error={errors[name]?.message} />}
    />
  );
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Dirección de la organización"
      footer={<Button title="Guardar dirección" onPress={save} loading={update.isPending} fullWidth />}
    >
      {field('street', 'Calle')}
      {field('street_number', 'Número')}
      {field('neighborhood', 'Barrio')}
      {field('city', 'Localidad')}
      {field('state', 'Provincia')}
      {field('postal_code', 'Código postal')}
      <Card tone={coords ? 'accent' : 'warning'} className="gap-2">
        <Text variant="label">Ubicación en el mapa</Text>
        <Text className="text-sm">
          {coords
            ? 'Ya tenemos la ubicación. Si la organización se mudó, actualizala estando en el lugar.'
            : 'El Banco usa la ubicación para calcular distancias. Tocá el botón estando en la organización.'}
        </Text>
        <Button title="Estoy en la organización" icon={LocateFixed} variant="outline" size="sm" className="self-start" loading={locating} onPress={locate} />
      </Card>
      {update.isError && !(update.error as { fieldErrors?: unknown }).fieldErrors ? <Text tone="destructive">{humanMessage(update.error)}</Text> : null}
    </BottomSheet>
  );
}

function ContactSheet({ orgId, contact, onClose }: { orgId: string; contact: OrganizationContact; onClose: () => void }) {
  const auths = useAuthorizations(orgId, contact.id);
  const authorize = useAuthorizePickup(orgId, contact.id);
  const revoke = useRevokeAuthorization(orgId, contact.id);
  const active = (auths.data ?? []).filter((a) => !a.revoked_at);
  return (
    <BottomSheet visible onClose={onClose} title={contact.name}>
      <Text variant="caption">{[contact.position, contact.dni ? `DNI ${contact.dni}` : null, contact.phone].filter(Boolean).join(' · ')}</Text>
      <Text variant="label">Autorizaciones para retirar</Text>
      {auths.isPending ? (
        <SkeletonList count={1} />
      ) : auths.isError ? (
        <ErrorState error={auths.error} onRetry={() => auths.refetch()} />
      ) : active.length ? (
        active.map((a) => (
          <Card key={a.id} className="gap-2">
            <Text variant="label">{label(pickupScopeLabels, a.scope_type)}</Text>
            {a.valid_until ? <Text variant="caption">Hasta el {formatDate(a.valid_until)}</Text> : null}
            <Button title="Quitar autorización" icon={ShieldOff} variant="ghost" size="sm" className="self-start" loading={revoke.isPending} onPress={() => revoke.mutate(a.id)} />
          </Card>
        ))
      ) : (
        <Text tone="muted">No tiene autorización para retirar.</Text>
      )}
      {!active.length && !auths.isError ? (
        contact.dni ? (
          <Button
            title="Autorizar para cualquier retiro"
            icon={ShieldCheck}
            loading={authorize.isPending}
            onPress={() => authorize.mutate({ scope_type: 'all', created_via: 'web' })}
          />
        ) : (
          <Text variant="caption">Para autorizarla a retirar hace falta cargar su DNI (pedíselo al Banco).</Text>
        )
      ) : null}
    </BottomSheet>
  );
}

/** Campos de `POST /organizations/{id}/contacts` */
const contactSchema = z.object({
  name: z.string().trim().min(2, 'Escribí nombre y apellido'),
  position: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  dni: z.string().trim().refine((v) => v === '' || /^\d{7,8}$/.test(v), 'El DNI tiene 7 u 8 números').optional(),
  pickup_authorized: z.boolean(),
});
type ContactValues = z.infer<typeof contactSchema>;

function NewContactSheet({ orgId, visible, onClose }: { orgId: string; visible: boolean; onClose: () => void }) {
  const create = useCreateContact(orgId, onClose);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', position: '', phone: '', dni: '', pickup_authorized: true },
  });
  const pickupAuthorized = useWatch({ control, name: 'pickup_authorized' });
  const save = handleSubmit((v) => {
    if (v.pickup_authorized && !v.dni) {
      setError('dni', { message: 'Para autorizar a retirar hace falta el DNI' });
      return;
    }
    create.mutate(
      {
        name: v.name,
        position: v.position || null,
        phone: v.phone || null,
        dni: v.dni || null,
        pickup_authorized: v.pickup_authorized,
        ...(v.pickup_authorized ? { pickup_scope_type: 'all' } : {}),
      },
      { onError: (e) => applyFieldErrors(e, setError) },
    );
  });
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Agregar contacto" footer={<Button title="Guardar contacto" onPress={save} loading={create.isPending} fullWidth />}>
      <Controller control={control} name="name" render={({ field }) => <Input label="Nombre y apellido" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="position" render={({ field }) => <Input label="Rol (opcional)" placeholder="Ej: voluntaria" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="phone" render={({ field }) => <Input label="Teléfono (opcional)" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />} />
      <Controller control={control} name="dni" render={({ field }) => <Input label="DNI" value={field.value} onChangeText={(t) => field.onChange(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} error={errors.dni?.message} hint={pickupAuthorized ? 'Obligatorio para retirar' : undefined} />} />
      <Controller control={control} name="pickup_authorized" render={({ field }) => <SwitchRow label="Puede retirar alimentos" value={field.value} onChange={field.onChange} />} />
      {create.isError && !(create.error as { fieldErrors?: unknown }).fieldErrors ? <Text tone="destructive">{humanMessage(create.error)}</Text> : null}
    </BottomSheet>
  );
}

export default function OrganizacionScreen() {
  const profile = useOrgProfile();
  const org = profile.data;
  // Contactos y autorizaciones: el backend no los ofrece hoy (docs/bda 1/6 §6) → no se llaman.
  const contacts = useContacts(features.contactos ? (org?.id ?? null) : null);
  const [editAddress, setEditAddress] = useState(false);
  const [newContact, setNewContact] = useState(false);
  const [selected, setSelected] = useState<OrganizationContact | null>(null);

  if (!org) {
    return (
      <Screen header={<Header title="Mi organización" back backFallback="/mas" />}>
        {profile.isPending ? <SkeletonList count={2} /> : <ErrorState error={profile.error} onRetry={() => profile.refetch()} />}
      </Screen>
    );
  }

  const pickupDays = (org.preferred_pickup_days ?? []).map((d) => label(pickupDayLabels, d)).join(', ');
  const pickupHours = formatTimeRange(org.preferred_pickup_time_start, org.preferred_pickup_time_end);
  const yesNo = (v?: boolean | null) => (v == null ? null : v ? 'Sí' : 'No');

  return (
    <Screen
      header={<Header title="Mi organización" back backFallback="/mas" />}
      refreshing={profile.isRefetching}
      onRefresh={() => {
        void profile.refetch();
        if (features.contactos) void contacts.refetch();
      }}
    >
      <Card className="gap-4">
        <View className="gap-1">
          <Text variant="title">{org.name}</Text>
          {org.legal_name && org.legal_name !== org.name ? <Text variant="caption">{org.legal_name}</Text> : null}
          <View className="flex-row flex-wrap gap-2 pt-1">
            {org.organization_type ? <Badge label={label(organizationTypeLabels, org.organization_type)} tone="accent" icon={Building2} /> : null}
            {org.status ? <Badge label={label(organizationStatusLabels, org.status)} tone={org.status === 'aprobada' ? 'success' : 'warning'} /> : null}
          </View>
        </View>
        <InfoRow icon={MapPin} label="Dirección" value={addressText(org)} />
        <InfoRow icon={Phone} label="Teléfono" value={org.phone} />
        <InfoRow icon={Mail} label="Email" value={org.email} />
        <Button title="Actualizar dirección" icon={Pencil} variant="outline" size="sm" className="self-start" onPress={() => setEditAddress(true)} />
        <Text variant="caption">Para cambiar el teléfono o el email, comunicate con el Banco de Alimentos.</Text>
      </Card>

      <SectionHeader title="Personas y cuota" />
      <Card className="gap-4">
        <InfoRow icon={Users} label="Personas asistidas" value={org.total_beneficiaries != null ? formatNumber(org.total_beneficiaries) : null} />
        <InfoRow icon={Utensils} label="Servicios por día" value={org.services_per_day != null ? formatNumber(org.services_per_day) : null} />
        <InfoRow icon={Scale} label="Cuota mensual" value={org.monthly_quota_kg != null ? `${formatNumber(org.monthly_quota_kg)} kg` : null} />
        <Text variant="caption">Las personas asistidas y la cuota se calculan solas a partir de las familias cargadas.</Text>
      </Card>

      <SectionHeader title="Retiro de alimentos" />
      <Card className="gap-4">
        <InfoRow icon={Truck} label="Modalidad" value={org.pickup_preference ? label(pickupPreferenceLabels, org.pickup_preference) : null} />
        <InfoRow icon={CalendarDays} label="Días preferidos" value={pickupDays || null} />
        <InfoRow icon={Clock} label="Horario preferido" value={pickupHours || null} />
        <InfoRow icon={Snowflake} label="Tienen heladera o freezer" value={yesNo(org.has_refrigeration)} />
        <InfoRow icon={Car} label="Tienen vehículo propio" value={yesNo(org.has_own_vehicle)} />
        {org.vehicle_capacity_kg ? <InfoRow icon={Car} label="Capacidad del vehículo" value={`${formatNumber(org.vehicle_capacity_kg)} kg`} /> : null}
      </Card>

      {features.contactos ? (
        <>
          <SectionHeader title="Contactos y quién puede retirar" />
          {contacts.isPending ? (
            <SkeletonList count={2} />
          ) : contacts.isError ? (
            <ErrorState error={contacts.error} onRetry={() => contacts.refetch()} />
          ) : (
            <View className="gap-2">
              {(contacts.data ?? []).map((c) => (
                <Card key={c.id} onPress={() => setSelected(c)} className="gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text variant="label" className="flex-1">{c.name}</Text>
                    {c.is_primary ? <Badge label="Referente principal" tone="accent" size="sm" /> : null}
                  </View>
                  <Text variant="caption">{[c.position, c.dni ? `DNI ${c.dni}` : 'Sin DNI', c.phone].filter(Boolean).join(' · ')}</Text>
                </Card>
              ))}
              <Button title="Agregar contacto" icon={UserPlus} variant="outline" onPress={() => setNewContact(true)} />
            </View>
          )}
          <NewContactSheet orgId={org.id} visible={newContact} onClose={() => setNewContact(false)} />
          {selected ? <ContactSheet orgId={org.id} contact={selected} onClose={() => setSelected(null)} /> : null}
        </>
      ) : null}

      <AddressSheet org={org} visible={editAddress} onClose={() => setEditAddress(false)} />
    </Screen>
  );
}
