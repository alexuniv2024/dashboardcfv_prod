import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as unknown as { sub: number; email: string; rol: string };
    return decoded;
  } catch {
    return null;
  }
}