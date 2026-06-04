import { useQuery } from "@tanstack/react-query";
import { getPatient } from "../api/patients";
import { QUERY_KEYS } from "../constants";

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.patient(patientId),
    queryFn: () => getPatient(patientId),
    enabled: !!patientId,
  });
}
