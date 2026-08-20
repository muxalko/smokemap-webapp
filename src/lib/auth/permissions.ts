export type SmokemapRole = "guest" | "user" | "moderator" | "administrator";

export function canModerate(role: string | null | undefined): boolean {
  return role === "moderator" || role === "administrator";
}

export function canHardDelete(role: string | null | undefined): boolean {
  return role === "administrator";
}
