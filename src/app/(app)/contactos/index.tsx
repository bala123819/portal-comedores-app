import { router } from 'expo-router';
import { UserPlus, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { ContactCard } from '@/components/contactos/ContactCard';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useContacts } from '@/features/contactos/hooks';

/** Padrón de la organización (`GET /org/contacts`): el principal primero, después por nombre */
export default function ContactosScreen() {
  const q = useContacts();
  const contacts = [...(q.data ?? [])].sort(
    (a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || a.name.localeCompare(b.name, 'es'),
  );
  const authorized = contacts.filter((c) => c.pickup_authorized);
  const others = contacts.filter((c) => !c.pickup_authorized);
  const open = (id: string) => router.push({ pathname: '/contactos/[id]', params: { id } });

  return (
    <Screen
      header={
        <Header
          title="Contactos"
          subtitle="Personas de la organización"
          back
          backFallback="/organizacion"
        />
      }
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      footer={
        <Button
          title="Agregar contacto"
          icon={UserPlus}
          size="lg"
          fullWidth
          onPress={() => router.push('/contactos/nuevo')}
        />
      }
    >
      <Card tone="info" className="gap-1">
        <Text variant="label">¿Quién puede retirar alimentos?</Text>
        <Text className="text-sm">
          Lo autoriza el Banco. Cargá a la persona con su DNI y, desde su ficha, tocá “Pedir
          autorización al Banco”.
        </Text>
      </Card>

      {q.isPending ? (
        <SkeletonList count={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !contacts.length ? (
        <EmptyState
          icon={Users}
          title="Todavía no hay contactos"
          message="Sumá a las personas de la organización: referentes, cocineras, voluntarios."
          actionLabel="Agregar contacto"
          onAction={() => router.push('/contactos/nuevo')}
        />
      ) : (
        <>
          {authorized.length ? (
            <>
              <SectionHeader title={`Autorizadas a retirar (${authorized.length})`} />
              <View className="gap-2">
                {authorized.map((c) => (
                  <ContactCard key={c.id} contact={c} onPress={() => open(c.id)} />
                ))}
              </View>
            </>
          ) : null}
          {others.length ? (
            <>
              <SectionHeader
                title={
                  authorized.length
                    ? `Otros contactos (${others.length})`
                    : `Contactos (${others.length})`
                }
              />
              <View className="gap-2">
                {others.map((c) => (
                  <ContactCard key={c.id} contact={c} onPress={() => open(c.id)} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
