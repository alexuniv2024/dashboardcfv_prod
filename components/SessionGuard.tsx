"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verificar la sesión inmediatamente al cargar
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          // Token expirado o inválido → redirigir al login
          router.push("/login");
          return;
        }
        setChecking(false);
      } catch (error) {
        console.error("Error al verificar sesión:", error);
        setChecking(false);
      }
    };

    checkSession();

    // Verificar cada 60 segundos mientras el usuario está activo
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          clearInterval(interval);
          router.push("/login");
        }
      } catch (error) {
        // Ignorar errores de red temporales
      }
    }, 60000); // Cada 60 segundos

    return () => clearInterval(interval);
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Verificando sesión...</span>
      </div>
    );
  }

  return <>{children}</>;
}