import { Heart, Package, Send, Star } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Header,
  Input,
  ListItem,
  NumberStepper,
  ProgressBar,
  Screen,
  SectionHeader,
  SegmentedControl,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
  Stepper,
  SwitchRow,
  Text,
  TextArea,
  toast,
  TrafficLight,
} from '@/components/ui';
import { ApiError } from '@/services/api/errors';

/** Showcase de la librería de UI (solo desarrollo). */
export default function UiShowcase() {
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [sw, setSw] = useState(true);
  const [n, setN] = useState(10);
  const [sel, setSel] = useState<string | null>(null);

  return (
    <Screen header={<Header title="Componentes" back backFallback="/mas" />}>
      <SectionHeader title="Texto" />
      <Text variant="display">Display</Text>
      <Text variant="title">Título</Text>
      <Text variant="heading">Encabezado</Text>
      <Text>Cuerpo de texto base 16 px.</Text>
      <Text variant="caption">Texto secundario</Text>

      <SectionHeader title="Botones" />
      <View className="gap-2">
        <Button title="Primario" icon={Send} />
        <Button title="Secundario" variant="secondary" />
        <Button title="Contorno" variant="outline" />
        <Button title="Fantasma" variant="ghost" />
        <Button title="Destructivo" variant="destructive" />
        <Button title="Cargando" loading />
        <Button title="Deshabilitado" disabled />
        <View className="flex-row gap-2">
          <Button title="Chico" size="sm" />
          <Button title="Grande" size="lg" className="flex-1" />
        </View>
      </View>

      <SectionHeader title="Badges y estados" />
      <View className="flex-row flex-wrap gap-2">
        <Badge label="Primario" tone="primary" icon={Star} />
        <Badge label="Éxito" tone="success" />
        <Badge label="Aviso" tone="warning" />
        <Badge label="Info" tone="info" />
        <Badge label="Error" tone="destructive" />
        <Badge label="Neutro" />
        {['asignada', 'confirmada', 'en_camino', 'completada', 'cancelada', 'no_show'].map((s) => (
          <StatusBadge key={s} kind="assignment" status={s} size="sm" />
        ))}
        {['pendiente', 'aprobada', 'rechazada', 'cancelada'].map((s) => (
          <StatusBadge key={s} kind="application" status={s} size="sm" />
        ))}
      </View>
      <TrafficLight level="ok" label="Cubierto" />
      <TrafficLight level="medio" label="A medias" />
      <TrafficLight level="bajo" label="Falta" />

      <SectionHeader title="Formularios" />
      <Input label="Campo" placeholder="Escribí algo" hint="Ayuda" />
      <Input label="Con error" value="mal" error="Este campo tiene un error" />
      <Input label="Contraseña" secureTextEntry value="secreto" />
      <TextArea label="Área de texto" />
      <Select label="Selector" value={sel} onChange={setSel} options={[{ label: 'Opción A', value: 'a' }, { label: 'Opción B', value: 'b' }]} />
      <SwitchRow label="Interruptor" description="Con descripción" value={sw} onChange={setSw} />
      <NumberStepper label="Personas" value={n} onChange={setN} />
      <View className="flex-row flex-wrap gap-2">
        <Chip label="Chip" />
        <Chip label="Seleccionado" selected />
        <Chip label="Con ícono" icon={Heart} />
      </View>
      <SegmentedControl value={seg} onChange={setSeg} options={[{ label: 'Uno', value: 'a' }, { label: 'Dos', value: 'b', count: 3 }]} />

      <SectionHeader title="Datos" />
      <View className="flex-row flex-wrap gap-3">
        <StatCard label="Kilos recibidos" value="1.250" icon={Package} />
        <StatCard label="Retiros" value="12" />
      </View>
      <ProgressBar value={0.6} />
      <Stepper steps={[{ key: '1', label: 'Asignado' }, { key: '2', label: 'Confirmado' }, { key: '3', label: 'En camino' }, { key: '4', label: 'Retirado' }]} current={1} />
      <Stepper steps={[{ key: '1', label: 'Asignado' }, { key: '2', label: 'Retirado' }]} current={0} failed="Cancelado" />
      <ListItem icon={Package} title="Ítem de lista" subtitle="Con subtítulo" onPress={() => {}} />
      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar name="Marta Gómez" />
          <Text>Avatar con iniciales</Text>
        </View>
      </Card>
      <Skeleton className="h-6 w-2/3" />

      <SectionHeader title="Estados" />
      <EmptyState title="Estado vacío" message="Mensaje de ayuda" actionLabel="Acción" onAction={() => {}} />
      <ErrorState error={new ApiError({ kind: 'network' })} onRetry={() => {}} />
      <ErrorState error={new ApiError({ kind: 'forbidden' })} />

      <SectionHeader title="Superposiciones" />
      <Button title="Abrir bottom sheet" variant="outline" onPress={() => setSheet(true)} />
      <Button title="Abrir confirmación" variant="outline" onPress={() => setDialog(true)} />
      <Button title="Toast de éxito" variant="outline" onPress={() => toast.success('¡Listo!')} />
      <Button title="Toast de error" variant="outline" onPress={() => toast.error('Algo salió mal')} />

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Bottom sheet">
        <Text>Contenido del bottom sheet.</Text>
      </BottomSheet>
      <ConfirmDialog visible={dialog} title="¿Seguro?" message="Esta acción no se puede deshacer." destructive onCancel={() => setDialog(false)} onConfirm={() => setDialog(false)} />
    </Screen>
  );
}
