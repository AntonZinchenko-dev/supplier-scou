import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { NewSupplierInput, PipelineStatus, Settings } from './types';

export const keys = {
  settings: ['settings'] as const,
  recent: ['searches'] as const,
  search: (id: string) => ['search', id] as const,
  supplier: (id: string, searchId?: string | null) => ['supplier', id, searchId ?? null] as const,
  source: (id: string) => ['source', id] as const,
  shortlist: ['shortlist'] as const,
};

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: api.settings, staleTime: Infinity });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => api.saveSettings(patch),
    onSuccess: (s) => qc.setQueryData(keys.settings, s),
  });
}

export function useRecent() {
  return useQuery({ queryKey: keys.recent, queryFn: api.recent });
}

export function useSearchResult(id: string | undefined, enabled = true) {
  return useQuery({ queryKey: keys.search(id ?? ''), queryFn: () => api.search(id!), enabled: Boolean(id) && enabled, staleTime: Infinity });
}

export function useSupplierCard(id: string | undefined, searchId?: string | null) {
  return useQuery({ queryKey: keys.supplier(id ?? '', searchId), queryFn: () => api.supplier(id!, searchId), enabled: Boolean(id) });
}

export function useSource(id: string | null) {
  return useQuery({ queryKey: keys.source(id ?? ''), queryFn: () => api.source(id!), enabled: Boolean(id), staleTime: Infinity });
}

export function useShortlist() {
  return useQuery({ queryKey: keys.shortlist, queryFn: api.shortlist });
}

export function useShortlistActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.shortlist });
  return {
    add: useMutation({ mutationFn: (v: { id: string; searchId?: string | null }) => api.addToShortlist(v.id, v.searchId), onSuccess: refresh }),
    update: useMutation({
      mutationFn: (v: { id: string; status?: PipelineStatus; nextStep?: string | null; note?: string; removeNote?: string }) => {
        const { id, ...patch } = v;
        return api.updateShortlist(id, patch);
      },
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.removeFromShortlist(id), onSuccess: refresh }),
  };
}

export function useAddSupplier() {
  return useMutation({ mutationFn: (input: NewSupplierInput) => api.addSupplier(input) });
}
