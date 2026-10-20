import { ShieldCheck, Star } from 'lucide-react-native';
import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import {
  isAuthorizationActive,
  type ContactAuthorization,
  type OrganizationContact,
} from '@/features/contactos/types';
import { formatDate } from '@/lib/format';
import { label, pickupScopeLabels } from '@/lib/labels';

/** "Cualquier retiro · sin vencimiento" / "Cualquier retiro · hasta el 3 dic 2026" */
export function authorizationText(a: ContactAuthorization): string {
  const scope = label(pickupScopeLabels, a.scope_type);
  if (!a.valid_from && !a.valid_until) return `${scope} · sin vencimiento`;
  const from = a.valid_from ? `desde el ${formatDate(a.valid_from)}` : null;
  const until = a.valid_until ? `hasta el ${formatDate(a.valid_until)}` : null;
  return [scope, [from, until].filter(Boolean).join(' ')].join(' · ');
}

export function ContactCard({
  contact: c,
  onPress,
}: {
  contact: OrganizationContact;
  onPress?: () => void;
}) {
  const active = (c.authorizations ?? []).some((a) => isAuthorizationActive(a));
  return (
    <Card onPress={onPress} className="gap-1.5" accessibilityHint="Abre el contacto">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="label" className="flex-1">
          {c.name}
        </Text>
        {c.is_primary ? <Badge label="Principal" tone="accent" icon={Star} size="sm" /> : null}
      </View>
      <Text variant="caption">
        {[c.position, c.dni ? `DNI ${c.dni}` : 'Sin DNI', c.phone].filter(Boolean).join(' · ')}
      </Text>
      {c.pickup_authorized ? (
        <View className="flex-row">
          <Badge
            label={active ? 'Autorizada por el Banco a retirar' : 'Autorización vencida'}
            tone={active ? 'success' : 'warning'}
            icon={ShieldCheck}
            size="sm"
          />
        </View>
      ) : null}
    </Card>
  );
}
