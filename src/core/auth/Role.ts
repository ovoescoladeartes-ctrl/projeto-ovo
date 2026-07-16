/**
 * Papéis do sistema — ver constitution.md §2 ("Autenticação e sessão").
 * Qualquer role nova exige atualizar a constitution antes de ser usada em código.
 */
export type Role = "admin" | "financeiro" | "comunicacao" | "educador";

export const ROLES: readonly Role[] = ["admin", "financeiro", "comunicacao", "educador"];

export function isRole(value: unknown): value is Role {
	return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Status de quem está autenticado mas ainda não recebeu uma role de permissão.
 * NÃO é uma role (não entra em ROLES/constitution.md §2) — é o valor padrão do
 * campo `role` em Firestore/custom claims enquanto ninguém libera acesso. Existe
 * para que o campo `role` nunca seja `null`, sempre uma string.
 */
export const PENDING_ACCESS = "pendente" as const;

export type AccessRole = Role | typeof PENDING_ACCESS;

export function isAccessRole(value: unknown): value is AccessRole {
	return value === PENDING_ACCESS || isRole(value);
}
