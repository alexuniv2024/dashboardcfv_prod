import { redirect } from "next/navigation";

export default function Home() {
  // El middleware ya maneja la redirección,
  // pero esto es un respaldo por si acaso
  redirect("/login");
}