"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { Event } from "@/services/types";

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
      const eventsQuery = query(
        collection(db, "events"),
        where("academicSessionId", "==", sessionId)
      );
      const snapshot = await getDocs(eventsQuery);
      const data: Event[] = [];
      snapshot.forEach((eventDoc) => {
        data.push({ id: eventDoc.id, ...eventDoc.data() } as Event);
      });
      setEvents(data);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
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
