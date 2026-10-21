import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../../shared/api/client';
import { keys, useSettings } from '../../shared/api/queries';
import type { SearchFilters, Weights } from '../../shared/api/types';

export function useStartSearch() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const settings = useSettings();
  return useMutation({
    mutationFn: async (v: { query: string; filters?: SearchFilters; weights?: Weights | null }) => {
      const filters = v.filters ?? (await api.parse(v.query)).filters;
      const weights = v.weights === undefined ? settings.data?.weights ?? null : v.weights;
      const { id } = await api.startSearch(v.query, filters, weights);
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: keys.recent });
      navigate(`/search/${id}`, { state: { fresh: true } });
    },
  });
}
