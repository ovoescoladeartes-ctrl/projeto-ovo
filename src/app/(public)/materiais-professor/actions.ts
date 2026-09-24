"use server";

import { criarItemMaterialPublicoSchema } from "@/core/comunicacao/materiais/schema";
import { revalidarColecoes } from "@/core/db/revalidar";
import { lerTurmas } from "@/core/db/turmas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const COLECAO = "materiaisChecklist";

/**
 * Cria um material pendente a partir do formulário público (`/materiais-professor`, sem login) —
 * NÃO tem gate de sessão/role de propósito, é o único ponto de escrita acessível sem autenticação
 * do app inteiro. Proteção contra abuso hoje é só validação de servidor (zod, limite de 200
 * caracteres no título) — o projeto não tem nenhum mecanismo de rate limit/captcha ainda; ver
 * `docs/spec-checklist-materiais.md`, seção "Segurança", pra decidir depois se precisa de mais.
 *
 * `turmaNome` nunca vem do cliente: resolvido aqui a partir de `turmaId` contra `lerTurmas()`, pra
 * não persistir texto livre arbitrário de quem não está autenticado. `turmaId` que não bate com
 * nenhuma turma ativa é rejeitado (evita registrar material preso a uma turma inexistente/inventada).
 */
export async function criarItemMaterialPublico(input: unknown): Promise<ActionResult> {
	const parsed = criarItemMaterialPublicoSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { titulo, turmaId } = parsed.data;

	let turmaNome: string | null = null;
	if (turmaId !== null) {
		const turmas = await lerTurmas();
		const turma = turmas.find((item) => item.id === turmaId && item.ativo);
		if (turma === undefined) {
			return { status: "error", message: "Turma inválida. Atualize a página e tente novamente." };
		}
		turmaNome = turma.nome;
	}

	try {
		await getFirebaseAdminFirestore()
			.collection(COLECAO)
			.add({
				titulo,
				turmaId,
				turmaNome,
				comprado: false,
				criadoEm: new Date(),
				// `null` em vez de omitido: sinaliza de propósito "sem usuário autenticado" (o único write
				// site deste app sem sessão), em vez de um `criadoPor` de sistema inventado.
				criadoPor: null,
			});
	} catch {
		return { status: "error", message: "Não foi possível enviar. Tente novamente." };
	}

	revalidarColecoes(["materiaisChecklist"], ["/", "/checklists"]);
	return { status: "ok" };
}
