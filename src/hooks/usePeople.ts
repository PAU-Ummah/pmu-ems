"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import type { Person } from "@/types";

export interface UsePeopleOptions {
  /** If true, only return people with status "active". Default true. */
  activeOnly?: boolean;
}

export function usePeople(
  sessionId: string | null,
  options: UsePeopleOptions = {}
) {
  const { activeOnly = true } = options;
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPeople = useCallback(async () => {
    if (!sessionId) {
      setPeople([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const constraints = [where("academicSessionId", "==", sessionId)];
      if (activeOnly) {
        constraints.push(where("status", "==", "active"));
      }
      const q = query(collection(db, "people"), ...constraints);
      const snapshot = await getDocs(q);
      const data: Person[] = [];
      snapshot.forEach((d) => {
        data.push({ id: d.id, ...d.data() } as Person);
      });
      setPeople(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, activeOnly]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  return { people, loading, error, refresh: fetchPeople };
}
