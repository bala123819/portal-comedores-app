import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { WhatsAppButton } from '@/components/agentes/WhatsAppButton';
import { Button, Card, Header, Screen, SectionHeader, Text } from '@/components/ui';
import { env } from '@/lib/env';
import { features } from '@/lib/features';
import { whatsappAvailable } from '@/lib/whatsapp';
import { colors } from '@/theme/tokens';

/** Las preguntas de pedidos y retiros sólo aparecen si el módulo de mermas está activo */
const FAQ_MERMAS = [
  {
    q: '¿Cómo pido alimentos?',
    a: 'Entrá a “Disponibles”, elegí una donación y tocá “Quiero retirarlo”. El Banco revisa los pedidos y te avisa si te los asigna.',
  },
  {
    q: '¿Qué hago cuando me asignan un retiro?',
    a: 'En “Mis retiros” vas a ver el retiro “Para confirmar”. Confirmá que pueden ir y avisá quién va a retirar. El día del retiro tocá “Salimos para allá” y, cuando lo tengan, “Ya lo retiramos”.',
  },
  {
    q: '¿Quién puede retirar?',
    a: 'Las personas de tu organización autorizadas con DNI. Si va alguien que no está en la lista, podés cargar su nombre y DNI en “Quién va a retirar”.',
  },
  {
    q: '¿Y si no podemos ir?',
    a: 'Entrá al retiro y tocá “No podemos ir”. Así los alimentos quedan disponibles para otra organización. Avisá lo antes posible.',
  },
];

const FAQ_GENERAL = [
  {
    q: '¿Cómo se calcula la cuota mensual?',
    a: 'El Banco la calcula solo, a partir de las familias cargadas: cada persona pesa según su necesidad nutricional. Si falta una familia o cambió algún dato, avisale al Banco.',
  },
  {
    q: '¿Puedo cargar o corregir familias?',
    a: 'Por ahora las familias las carga el Banco de Alimentos. En la app podés verlas; para agregar o corregir, comunicate con el Banco.',
  },
  {
    q: '¿Cómo uso el recetario?',
    a: 'En “Recetas” elegí una receta y poné para cuántas personas cocinan: las cantidades se calculan solas. Con “Cocinar paso a paso” ves un paso por pantalla con letra grande.',
  },
  {
    q: '¿Funciona sin internet?',
    a: 'Podés ver lo último que se cargó y el recetario. Para guardar cambios necesitás conexión; si falla, podés reintentar sin que se duplique.',
  },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="min-h-10 flex-row items-center gap-2"
      >
        <Text variant="label" className="flex-1">
          {q}
        </Text>
        {open ? <ChevronUp size={20} color={colors.mutedForeground} /> : <ChevronDown size={20} color={colors.mutedForeground} />}
      </Pressable>
      {open ? <Text>{a}</Text> : null}
    </Card>
  );
}

export default function AyudaScreen() {
  return (
    <Screen header={<Header title="Ayuda y contacto" back backFallback="/mas" />}>
      <Card tone="accent" className="gap-3">
        <Text variant="label">¿Necesitás hablar con alguien?</Text>
        <Text className="text-sm">
          {whatsappAvailable()
            ? 'Escribinos por WhatsApp y te respondemos.'
            : 'Comunicate con el Banco de Alimentos por los canales habituales.'}
        </Text>
        <WhatsAppButton context={{ kind: 'general' }} variant="primary" />
        <Button title="Preguntarle al asistente" icon={Sparkles} variant="outline" onPress={() => router.push('/asistente')} />
      </Card>

      <SectionHeader title="Preguntas frecuentes" />
      <View className="gap-2">
        {[...(features.mermas ? FAQ_MERMAS : []), ...FAQ_GENERAL].map((f) => (
          <Faq key={f.q} {...f} />
        ))}
      </View>

      <Text variant="caption" className="text-center">
        Portal Comedores{env.useMocks ? ' · modo de prueba' : ''}
      </Text>
    </Screen>
  );
}
