import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { familiasApi } from '@/services/api/endpoints/familias';
import { useAction } from '@/services/api/use-action';
import { features } from '@/lib/features';
import type {
  CreateFamilyInput,
  FamiliesFilter,
  MemberInput,
  UpdateFamilyInput,
  UpdateMemberInput,
} from './types';

const formConfigKey = ['family-form-config'] as const;

/** Cambiar miembros (embarazo, lactancia, nacimiento, baja) recalcula el cupo de la organización. */
const afterChange = [qk.familiesAll, qk.orgProfile, qk.orgStats];

export function useFamilies(filter: FamiliesFilter = {}) {
  return useInfiniteQuery({
    queryKey: [...qk.families, filter],
    queryFn: ({ pageParam }) => familiasApi.list(pageParam, 20, filter),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    meta: { persist: true },
  });
}

export function useFamily(id: string) {
  return useQuery({
    queryKey: qk.family(id),
    queryFn: () => familiasApi.get(id),
    enabled: !!id,
    meta: { persist: true },
  });
}

export function useDemographics() {
  return useQuery({ queryKey: qk.demographics, queryFn: familiasApi.demographics, meta: { persist: true } });
}

// ─── Alta y edición: sólo con el módulo `familiasAlta` ────────────────────────────────────────

export function useFamilyTypes() {
  return useQuery({
    enabled: features.familiasAlta,
    queryKey: qk.familyTypes,
    queryFn: familiasApi.types,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

/** Campos obligatorios y opciones de cada lista: el banco los define, no se escriben fijos. */
export function useFamilyFormConfig() {
  return useQuery({
    enabled: features.familiasAlta,
    queryKey: formConfigKey,
    queryFn: familiasApi.formConfig,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCreateFamily(onSuccess?: (id: string) => void) {
  return useAction((body: CreateFamilyInput, key) => familiasApi.create(body, key), {
    invalidate: afterChange,
    successMessage: 'Registramos la familia',
    onSuccess: (data) => onSuccess?.(data?.id),
    errorToast: false,
  });
}

export function useUpdateFamily(familyId: string, onSuccess?: () => void) {
  return useAction((body: UpdateFamilyInput, key) => familiasApi.update(familyId, body, key), {
    invalidate: afterChange,
    successMessage: 'Guardamos los cambios',
    onSuccess: () => onSuccess?.(),
    errorToast: false,
  });
}

export function useDeleteFamily(familyId: string, onSuccess?: () => void) {
  return useAction((_: void, key) => familiasApi.remove(familyId, key), {
    invalidate: afterChange,
    successMessage: 'Dimos de baja la familia',
    onSuccess: () => onSuccess?.(),
    errorToast: false,
  });
}

export function useAddMember(familyId: string, onSuccess?: () => void) {
  return useAction((body: MemberInput, key) => familiasApi.addMember(familyId, body, key), {
    invalidate: afterChange,
    successMessage: 'Agregamos a la persona',
    onSuccess: () => onSuccess?.(),
    errorToast: false,
  });
}

export function useUpdateMember(familyId: string, memberId: string, onSuccess?: () => void) {
  return useAction(
    (body: UpdateMemberInput, key) => familiasApi.updateMember(familyId, memberId, body, key),
    {
      invalidate: afterChange,
      successMessage: 'Guardamos los cambios',
      onSuccess: () => onSuccess?.(),
      errorToast: false,
    },
  );
}

export function useRemoveMember(familyId: string, memberId: string, onSuccess?: () => void) {
  return useAction((_: void, key) => familiasApi.removeMember(familyId, memberId, key), {
    invalidate: afterChange,
    successMessage: 'Quitamos a la persona de la familia',
    onSuccess: () => onSuccess?.(),
    errorToast: false,
  });
}
