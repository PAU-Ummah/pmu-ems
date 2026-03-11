import {
  collection,
  getDocs,
  doc,
  addDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { DocumentData, UpdateData } from "firebase/firestore";
import { db } from "@/firebase";
import { normalizeYear } from "@/types";
import {
  CONFIG_COLLECTION,
  SETTINGS_DOC_ID,
  SESSIONS_COLLECTION,
  CURRENT_SESSION_ID_KEY,
} from "@/constants/session";

export interface MigrationResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  peopleUpdated: number;
  eventsUpdated: number;
}

/**
 * Create the first academic session and backfill all existing people and events
 * with academicSessionId (and for people: year, status).
 */
export async function runInitialSessionMigration(
  sessionName: string
): Promise<MigrationResult> {
  const sessionRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
    name: sessionName,
    isActive: true,
    startDate: new Date().toISOString().split("T")[0],
  });
  const sessionId = sessionRef.id;

  const configRef = doc(db, CONFIG_COLLECTION, SETTINGS_DOC_ID);
  await setDoc(configRef, { [CURRENT_SESSION_ID_KEY]: sessionId }, { merge: true });

  const peopleSnap = await getDocs(collection(db, "people"));
  let peopleUpdated = 0;
  const peopleBatch = writeBatch(db);
  for (const d of peopleSnap.docs) {
    const data = d.data();
    const update: UpdateData<DocumentData> = {
      academicSessionId: sessionId,
      status: "active",
    };
    if (data.year === undefined || data.year === null) {
      update.year = normalizeYear(data.class ?? data.year ?? 1);
    }
    peopleBatch.update(doc(db, "people", d.id), update);
    peopleUpdated++;
  }
  if (peopleUpdated > 0) await peopleBatch.commit();

  const eventsSnap = await getDocs(collection(db, "events"));
  let eventsUpdated = 0;
  const eventsBatch = writeBatch(db);
  for (const d of eventsSnap.docs) {
    const data = d.data();
    if (data.academicSessionId === undefined || data.academicSessionId === null) {
      eventsBatch.update(doc(db, "events", d.id), { academicSessionId: sessionId });
      eventsUpdated++;
    }
  }
  if (eventsUpdated > 0) await eventsBatch.commit();

  return {
    success: true,
    sessionId,
    peopleUpdated,
    eventsUpdated,
  };
}
