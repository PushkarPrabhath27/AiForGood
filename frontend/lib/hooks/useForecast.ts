import { useQuery } from "@tanstack/react-query";
import { getForecast } from "../api/forecasts";
import { QUERY_KEYS } from "../constants";

export function useForecast(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.forecast(patientId),
    queryFn: () => getForecast(patientId),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache TTL
    refetchInterval: 30 * 1000, // 30 seconds polling for live updates in demo
  });
}
