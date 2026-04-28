import { randomBytes } from "crypto";

/**
 * Gera um username a partir do full_name.
 * Padrão: FirstName_LastName (sem acentos, underscores para espaços)
 * Ex: "Nick Magalhães" -> "Nick_Magalhaes"
 */
export function generateUsername(fullName: string): string {
  const normalized = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return `Customer_${Date.now()}`;

  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  return lastName ? `${firstName}_${lastName}` : firstName;
}

/**
 * Gera uma senha segura e aleatória.
 * 12 bytes → 16 chars base64url (unguessable).
 */
export function generateSecurePassword(): string {
  return randomBytes(12).toString("base64url");
}
