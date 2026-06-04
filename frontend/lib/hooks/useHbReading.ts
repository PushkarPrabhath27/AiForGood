import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logHbReading } from "../api/forecasts";
import { QUERY_KEYS } from "../constants";
import type { HbReadingInput } from "@/../shared/contracts/api.types";

interface LogHbReadingVars {
  patientId: string;
  data: HbReadingInput;
}

export function useLogHbReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, data }: LogHbReadingVars) => logHbReading(patientId, data),
    onSuccess: (response, vars) => {
      // Invalidate the forecast query to force retraining/regeneration on the charts
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.forecast(vars.patientId),
      });
      // Invalidate specific patient detail queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.patient(vars.patientId),
      });
    },
  });
}
