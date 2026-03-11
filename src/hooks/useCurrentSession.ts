"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import type { AcademicSession } from "@/types";
import {
  CONFIG_COLLECTION,
  SETTINGS_DOC_ID,
  SESSIONS_COLLECTION,
  CURRENT_SESSION_ID_KEY,
} from "@/constants/session";

export function useCurrentSession() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<AcademicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const configRef = doc(db, CONFIG_COLLECTION, SETTINGS_DOC_ID);
      const configSnap = await getDoc(configRef);
      const sessionId =
        (configSnap.exists() && configSnap.data()?.[CURRENT_SESSION_ID_KEY]) ?? null;
      setCurrentSessionId(sessionId);

      if (sessionId) {
        const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          setCurrentSession({
            id: sessionSnap.id,
            ...sessionSnap.data(),
          } as AcademicSession);
        } else {
          setCurrentSession(null);
        }
      } else {
        setCurrentSession(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      setCurrentSessionId(null);
      setCurrentSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    currentSessionId,
    currentSession,
    loading,
    error,
    refresh,
  };
}
