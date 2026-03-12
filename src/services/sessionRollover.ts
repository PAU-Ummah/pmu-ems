import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import type { Person, AcademicSession } from "@/services/types";
import { isEngineeringDepartment } from "@/services/types";
import {
  CONFIG_COLLECTION,
  SETTINGS_DOC_ID,
  SESSIONS_COLLECTION,
  CURRENT_SESSION_ID_KEY,
} from "@/constants/session";

const BATCH_SIZE = 500; // Firestore writeBatch limit

export interface RolloverResult {
  success: boolean;
  newSessionId?: string;
  error?: string;
  graduatedCount: number;
  progressedCount: number;
}

/**
 * 1. Mark graduates (YR4 non-engineering, YR5 engineering).
 * 2. For remaining active: YR1→2, YR2→3, YR3→4, YR4→5.
 * 3. Create new session and set as current.
 * 4. Reassign active people to new session.
 */
export async function runSessionRollover(
  currentSessionId: string,
  newSessionName: string
): Promise<RolloverResult> {
  const peopleRef = collection(db, "people");
  const peopleQuery = query(
    peopleRef,
    where("academicSessionId", "==", currentSessionId)
  );
  const snapshot = await getDocs(peopleQuery);
  const people: (Person & { id: string })[] = [];
  snapshot.forEach((personDoc) => {
    people.push({ id: personDoc.id, ...personDoc.data() } as Person & { id: string });
  });

  const graduatedIds = new Set<string>();
  const activePeople: (Person & { id: string })[] = [];

  for (const person of people) {
    const year = typeof person.year === "number" ? person.year : 1;
    const dept = person.department ?? "";
    const isEng = isEngineeringDepartment(dept);
    const shouldGraduate =
      (year === 4 && !isEng) || (year === 5 && isEng);
    if (shouldGraduate) {
      graduatedIds.add(person.id);
    } else {
      activePeople.push(person);
    }
  }

  // 1. Mark graduates (in chunks)
  const toGraduate = people.filter((person) => graduatedIds.has(person.id));
  for (let batchIndex = 0; batchIndex < toGraduate.length; batchIndex += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = toGraduate.slice(batchIndex, batchIndex + BATCH_SIZE);
    for (const person of chunk) {
      batch.update(doc(db, "people", person.id), { status: "graduated" });
    }
    await batch.commit();
  }

  // 2. Year progression for active people (in chunks)
  for (let batchIndex = 0; batchIndex < activePeople.length; batchIndex += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = activePeople.slice(batchIndex, batchIndex + BATCH_SIZE);
    for (const person of chunk) {
      const year = typeof person.year === "number" ? person.year : 1;
      const newYear = Math.min(year + 1, 5);
      batch.update(doc(db, "people", person.id), { year: newYear });
    }
    if (chunk.length > 0) await batch.commit();
  }

  // 3. Create new session and set as current
  const newSessionRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
    name: newSessionName,
    isActive: true,
    startDate: new Date().toISOString().split("T")[0],
  } as Omit<AcademicSession, "id">);
  const newSessionId = newSessionRef.id;

  await updateDoc(doc(db, SESSIONS_COLLECTION, currentSessionId), { isActive: false });

  const configRef = doc(db, CONFIG_COLLECTION, SETTINGS_DOC_ID);
  await setDoc(configRef, { [CURRENT_SESSION_ID_KEY]: newSessionId }, { merge: true });

  // 4. Reassign active people to new session (in chunks)
  for (let batchIndex = 0; batchIndex < activePeople.length; batchIndex += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = activePeople.slice(batchIndex, batchIndex + BATCH_SIZE);
    for (const person of chunk) {
      batch.update(doc(db, "people", person.id), {
        academicSessionId: newSessionId,
      });
    }
    if (chunk.length > 0) await batch.commit();
  }

  return {
    success: true,
    newSessionId,
    graduatedCount: graduatedIds.size,
    progressedCount: activePeople.length,
  };
}
