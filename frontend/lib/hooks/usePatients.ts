import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatients, resetDemo } from "../api/patients";
import { QUERY_KEYS } from "../constants";

export function usePatients() {
  return useQuery({
    queryKey: QUERY_KEYS.patients,
    queryFn: getPatients,
  });
}

export function useResetDemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetDemo,
    onSuccess: () => {
      // Invalidate all query caches to refresh the entire UI securely
      queryClient.invalidateQueries();
    },
  });
}
