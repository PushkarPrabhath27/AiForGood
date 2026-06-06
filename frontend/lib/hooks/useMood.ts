"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMoodLogs, getLatestMood, triggerMoodCheck } from "../api/mood";
import { QUERY_KEYS } from "../constants";
import type { MoodLog } from "@/../shared/contracts/api.types";

export function useMoodLogs(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.moodLogs(patientId),
    queryFn: () => getMoodLogs(patientId),
    enabled: !!patientId,
    refetchInterval: 30_000,
  });
}

export function useLatestMood(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.moodLatest(patientId),
    queryFn: () => getLatestMood(patientId),
    enabled: !!patientId,
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useTriggerMoodCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => triggerMoodCheck(patientId),
    onSuccess: (_data, patientId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moodLogs(patientId) });
    },
  });
}

const SSE_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface SSEEventData {
  type: "mood_update";
  data: MoodLog;
}

export function useMoodSSE(patientId: string, onMoodUpdate?: (mood: MoodLog) => void) {
  const [latestMood, setLatestMood] = useState<MoodLog | null>(null);
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const onMoodUpdateRef = useRef(onMoodUpdate);
  onMoodUpdateRef.current = onMoodUpdate;

  useEffect(() => {
    if (!patientId) return;

    const url = `${SSE_BASE_URL}/api/v1/mood/stream/${patientId}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const parsed: SSEEventData = JSON.parse(event.data);
        if (parsed.type === "mood_update") {
          const mood = parsed.data as MoodLog;
          setLatestMood(mood);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moodLogs(patientId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moodLatest(patientId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.forecast(patientId) });
          onMoodUpdateRef.current?.(mood);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // EventSource will auto-reconnect
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [patientId, queryClient]);

  return latestMood;
}
