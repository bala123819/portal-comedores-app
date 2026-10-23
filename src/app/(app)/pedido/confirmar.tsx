import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router } from 'expo-router';
import { AlertTriangle, Plus, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import { QuantityControl } from '@/components/pedidos/CatalogItem';
import { QuotaCard } from '@/components/pedidos/QuotaCard';
import {
  Button,
  Card,
  Chip,
  Dialog,
  Header,
  Input,
  Screen,
  SectionHeader,
  SwitchRow,
  Text,
  TextArea,
} from '@/components/ui';
import { cartKg, cartLines, useCart } from '@/features/pedidos/cart';
import { useCreateDistribution, useQuota } from '@/features/pedidos/hooks';
import type { CreateDistributionResult } from '@/features/pedidos/types';
import { formatDay, formatNumber, formatQuantity, toISODate } from '@/lib/format';
import { timeSlotLabels } from '@/lib/labels';
import { goBack } from '@/lib/navigation';
import { humanMessage, isApiError } from '@/services/api/errors';
import { applyFieldErrors } from '@/services/api/use-action';
import { colors } from '@/theme/tokens';

/** Días que se ofrecen para retirar: desde hoy (regla del Banco) y las próximas dos semanas. */
const PICKUP_DAYS = 14;

function pickupDays(): string[] {
  const today = new Date();
  return Array.from({ length: PICKUP_DAYS }, (_, i) =>
    toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)),
  );
}

/** Campos de `POST /org/distributions` además de `items` (docs/bda/09-10, post 9). */
const schema = z
  .object({
    requested_distribution_date: z.string().min(1, 'Elegí el día de retiro'),
    time_slot: z.string().nullable(),
    notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
    is_urgent: z.boolean(),
    urgency_reason: z.string().max(255, 'Máximo 255 caracteres').optional(),
  })
  .superRefine((v, ctx) => {
    if (v.is_urgent && !v.urgency_reason?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['urgency_reason'],
        message: 'Contanos por qué es urgente',
      });
    }
  });
type FormValues = z.infer<typeof schema>;

export default function ConfirmarPedidoScreen() {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const clear = useCart((s) => s.clear);
  const quota = useQuota();
  const [result, setResult] = useState<CreateDistributionResult | null>(null);
  const days = pickupDays();

  // El carrito se vacía recién al salir, para que detrás del diálogo de avisos siga el pedido.
  const goToOrder = (id: string) => {
    clear();
    router.dismissAll();
    router.push({ pathname: '/pedido/[id]', params: { id } });
  };

  const create = useCreateDistribution((res) => {
    // Si el pedido supera stock o cupo, entra igual: se muestran los avisos antes de seguir.
    if (res.warnings.length) setResult(res);
    else goToOrder(res.distribution.id);
  });

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      requested_distribution_date: days[1],
      time_slot: null,
      notes: '',
      is_urgent: false,
      urgency_reason: '',
    },
  });
  const isUrgent = useWatch({ control, name: 'is_urgent' });

  const selected = cartLines(lines);
  const kg = cartKg(selected);

  // Sin productos (p. ej. se abrió por URL) se vuelve al catálogo. Después de enviar el carrito
  // queda vacío a propósito: no redirigir mientras se navega al pedido o se muestran los avisos.
  if (!selected.length && !create.isPending && !create.isSuccess)
    return <Redirect href="/pedido/nuevo" />;

  const onSubmit = handleSubmit((v) => {
    create.mutate(
      {
        requested_distribution_date: v.requested_distribution_date,
        time_slot: v.time_slot,
        notes: v.notes?.trim() || null,
        is_urgent: v.is_urgent,
        urgency_reason: v.is_urgent ? v.urgency_reason?.trim() || null : null,
        items: selected.map((l) => ({
          product_id: l.product.product_id,
          quantity_requested: l.quantity,
        })),
      },
      { onError: (e) => applyFieldErrors(e, setError) },
    );
  });

  // Errores de un producto puntual (`items.0.quantity_requested`): se nombra el producto.
  const itemErrors =
    create.isError && isApiError(create.error) && create.error.fieldErrors
      ? Object.entries(create.error.fieldErrors).flatMap(([field, messages]) => {
          const m = /^items\.(\d+)\./.exec(field);
          if (!m) return [];
          const name = selected[Number(m[1])]?.product.name;
          return [name ? `${name}: ${messages[0]}` : messages[0]];
        })
      : [];
  const generalError =
    create.isError && !(create.error as { fieldErrors?: unknown })?.fieldErrors
      ? humanMessage(create.error)
      : null;

  return (
    <Screen
      header={<Header title="Revisar pedido" back backFallback="/pedido/nuevo" />}
      footer={
        <Button
          title="Enviar pedido"
          icon={Send}
          size="lg"
          fullWidth
          loading={create.isPending}
          onPress={onSubmit}
        />
      }
    >
      <SectionHeader
        title={selected.length === 1 ? '1 producto' : `${selected.length} productos`}
        action={
          <Button
            title="Agregar más"
            icon={Plus}
            variant="ghost"
            size="sm"
            onPress={() => goBack('/pedido/nuevo')}
          />
        }
      />
      <Card className="gap-4">
        {selected.map((l) => (
          <View key={l.product.product_id} className="gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <Text variant="label" className="flex-1">
                {l.product.name}
              </Text>
              {l.product.weight_per_unit_kg ? (
                <Text variant="caption">
                  {formatNumber(l.quantity * l.product.weight_per_unit_kg)} kg
                </Text>
              ) : null}
            </View>
            <View className="flex-row items-center justify-between gap-2">
              <Text variant="caption">{formatQuantity(l.quantity, l.product.unit)}</Text>
              <QuantityControl
                value={l.quantity}
                onChange={(q) => setQuantity(l.product, q)}
                label={l.product.name}
              />
            </View>
          </View>
        ))}
        <View className="flex-row justify-between border-t border-border pt-3">
          <Text variant="label">Total estimado</Text>
          <Text variant="label">{formatNumber(kg)} kg</Text>
        </View>
      </Card>

      {quota.data ? <QuotaCard quota={quota.data} extraKg={kg} compact /> : null}

      <View className="gap-1.5">
        <Text variant="label">¿Qué día lo retiran?</Text>
        <Controller
          control={control}
          name="requested_distribution_date"
          render={({ field }) => (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {days.map((d) => (
                <Chip
                  key={d}
                  label={formatDay(d).replace(/^./, (c) => c.toUpperCase())}
                  selected={field.value === d}
                  onPress={() => field.onChange(d)}
                />
              ))}
            </ScrollView>
          )}
        />
        {errors.requested_distribution_date ? (
          <Text variant="caption" tone="destructive">
            {errors.requested_distribution_date.message}
          </Text>
        ) : (
          <Text variant="caption">El Banco confirma el día al programar la entrega.</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text variant="label">¿En qué horario? (opcional)</Text>
        <Controller
          control={control}
          name="time_slot"
          render={({ field }) => (
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="Sin preferencia"
                selected={!field.value}
                onPress={() => field.onChange(null)}
              />
              {Object.entries(timeSlotLabels).map(([value, text]) => (
                <Chip
                  key={value}
                  label={text}
                  selected={field.value === value}
                  onPress={() => field.onChange(value)}
                />
              ))}
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextArea
            label="¿Para qué es el pedido? (opcional)"
            placeholder="Ej: se sumaron 12 chicos al comedor"
            value={field.value}
            onChangeText={field.onChange}
            maxLength={500}
            error={errors.notes?.message}
            hint={`${field.value?.length ?? 0}/500`}
          />
        )}
      />

      <Controller
        control={control}
        name="is_urgent"
        render={({ field }) => (
          <SwitchRow
            label="Es urgente"
            description="El Banco lo prioriza si le explicás por qué"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {isUrgent ? (
        <Controller
          control={control}
          name="urgency_reason"
          render={({ field }) => (
            <Input
              label="¿Por qué es urgente?"
              placeholder="Ej: nos quedamos sin leche para el desayuno"
              value={field.value}
              onChangeText={field.onChange}
              maxLength={255}
              error={errors.urgency_reason?.message}
            />
          )}
        />
      ) : null}

      {generalError || itemErrors.length ? (
        <View className="gap-1 rounded-lg bg-destructive/10 px-3 py-2" accessibilityRole="alert">
          {generalError ? <Text className="text-destructive">{generalError}</Text> : null}
          {itemErrors.map((m) => (
            <Text key={m} className="text-destructive">
              {m}
            </Text>
          ))}
          <Text variant="caption">Podés volver a intentar: no se va a duplicar el pedido.</Text>
        </View>
      ) : null}

      <Dialog
        visible={!!result}
        onClose={() => result && goToOrder(result.distribution.id)}
        title="Enviamos tu pedido, con un aviso"
        message="El Banco lo recibió igual y ajusta las cantidades al aprobarlo."
        footer={
          <Button
            title="Ver el pedido"
            fullWidth
            onPress={() => result && goToOrder(result.distribution.id)}
          />
        }
      >
        <View className="gap-2">
          {result?.warnings.map((w) => (
            <View key={`${w.code}-${w.field ?? ''}`} className="flex-row items-start gap-2">
              <AlertTriangle size={18} color={colors.foreground} />
              <Text className="flex-1">{w.message}</Text>
            </View>
          ))}
        </View>
      </Dialog>
    </Screen>
  );
}
