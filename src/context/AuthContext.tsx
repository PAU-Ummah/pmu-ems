// src/context/AuthContext.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { useRouter } from "next/navigation";
import { User } from "@/types";

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData({ id: firebaseUser.uid, ...userDoc.data() } as User);
          } else {
            // If user document doesn't exist, create a default one
            setUserData({
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: "event-organizer", // Default role
              displayName: firebaseUser.displayName || firebaseUser.email || "",
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);