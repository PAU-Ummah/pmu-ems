"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import type { Event } from "@/types";

export function useEvents(sessionId: string | null) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!sessionId) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "events"),
        where("academicSessionId", "==", sessionId)
      );
      const snapshot = await getDocs(q);
      const data: Event[] = [];
      snapshot.forEach((d) => {
        data.push({ id: d.id, ...d.data() } as Event);
      });
      setEvents(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refresh: fetchEvents };
}
