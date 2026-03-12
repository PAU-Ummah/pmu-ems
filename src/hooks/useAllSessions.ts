'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { AcademicSession } from '@/services/types';
import { SESSIONS_COLLECTION } from '@/constants/session';

export function useAllSessions() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, SESSIONS_COLLECTION));
      const data: AcademicSession[] = [];
      snapshot.forEach((sessionDoc) => {
        data.push({ id: sessionDoc.id, ...sessionDoc.data() } as AcademicSession);
      });
      data.sort((sessionA, sessionB) =>
        (sessionB.name ?? '').localeCompare(sessionA.name ?? '')
      );
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refresh: fetchSessions };
}
