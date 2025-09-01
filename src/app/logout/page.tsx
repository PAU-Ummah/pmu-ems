// src/app/logout/page.tsx
"use client";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      await logout();
      router.push("/login");
    };
    performLogout();
  }, [logout, router]);

  return <Loading />;
}