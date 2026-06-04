import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGuardianCircle, mobilizeCircle } from "../api/guardians";
import { QUERY_KEYS } from "../constants";

export function useGuardianCircle(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.guardianCircle(patientId),
    queryFn: () => getGuardianCircle(patientId),
    enabled: !!patientId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // 30 seconds polling for live updates in demo
  });
}

export function useMobilizeCircle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => mobilizeCircle(patientId),
    onSuccess: (data, patientId) => {
      // Invalidate the circle queries to update the star map and status bars
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.guardianCircle(patientId),
      });
      // Invalidate patients list/detail too just in case
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.patient(patientId),
      });
    },
  });
}
