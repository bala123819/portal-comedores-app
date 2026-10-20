import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
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
  Snowflake,
  Truck,
  Users,
  Utensils,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  ListItem,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  toast,
} from '@/components/ui';
import { useContacts } from '@/features/contactos/hooks';
import { useOrgProfile, useUpdateAddress } from '@/features/org/hooks';
import type { Organization } from '@/features/org/types';
import { features } from '@/lib/features';
import { formatNumber, formatTimeRange } from '@/lib/format';
import {
  label,
  organizationStatusLabels,
  organizationTypeLabels,
  pickupDayLabels,
  pickupPreferenceLabels,
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

export default function OrganizacionScreen() {
  const profile = useOrgProfile();
  const org = profile.data;
  // Contactos: `/org/contacts` (docs/bda/04-contactos.md). Con el módulo apagado no se llaman.
  const contacts = useContacts(features.contactos);
  const [editAddress, setEditAddress] = useState(false);

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
          <ListItem
            icon={Users}
            title="Contactos de la organización"
            subtitle={
              contacts.data
                ? `${contacts.data.length} ${contacts.data.length === 1 ? 'persona' : 'personas'} · ${contacts.data.filter((c) => c.pickup_authorized).length} autorizadas a retirar`
                : 'Quiénes son y quién puede retirar alimentos'
            }
            onPress={() => router.push('/contactos')}
          />
        </>
      ) : null}

      <AddressSheet org={org} visible={editAddress} onClose={() => setEditAddress(false)} />
    </Screen>
  );
}
