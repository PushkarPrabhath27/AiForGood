import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCityInventory, approveMatch } from "../api/grid";
import { QUERY_KEYS, DEMO } from "../constants";

export function useCityInventory(cityCode: string) {
  return useQuery({
    queryKey: QUERY_KEYS.cityInventory(cityCode),
    queryFn: () => getCityInventory(cityCode),
    enabled: !!cityCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useApproveMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => approveMatch(matchId),
    onSuccess: () => {
      // Invalidate the city inventory queries to reload matches & stock counts
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cityInventory(DEMO.CITY_CODE),
      });
    },
  });
}
