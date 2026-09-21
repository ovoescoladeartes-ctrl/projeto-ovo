"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { ChecklistDoc, ChecklistItemDoc } from "@/core/checklist/consultas";
import {
	adicionarItemChecklistCustomizadoSchema,
	alternarItemChecklistCustomizadoSchema,
	alternarPinChecklistSchema,
	arquivarChecklistSchema,
	criarChecklistSchema,
	editarChecklistSchema,
	type ChecklistArea,
	type ChecklistPreferenciasDoc,
} from "@/core/checklist/schema";
import { CAIXA_ROLES, VAGOES_ROLES } from "@/core/dashboard/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

export interface ActionResult {
	status: "ok" | "error";
	message?: string;
}

const COLECAO = "checklists";
const COLECAO_PREFERENCIAS = "checklistsPreferencias";

/**
 * `area: "comum"` ainda não tem UI de criação (seção 5.6 da spec — fica reservada pra
 * `spec-checklist-ciclo-curso.md`, não implementada aqui) — restrita a admin por enquanto, só pra
 * não deixar a porta aberta sem dono caso a action seja chamada diretamente com essa área.
 */
function podeGerenciarArea(role: Role, area: ChecklistArea): boolean {
	if (area === "financeiro") {
		return CAIXA_ROLES.includes(role);
	}
	if (area === "comunicacao") {
		return VAGOES_ROLES.includes(role);
	}
	return role === "admin";
}

/** Deriva a área de um checklist "de sistema" a partir do prefixo do seu id fixo (ex.: "financeiro-ritual" → "financeiro") — os 3 ids cobertos por esta spec sempre seguem esse padrão (ver `core/checklist/adaptadores.ts`). */
function areaDoChecklistSistema(id: string): ChecklistArea {
	return id.startsWith("comunicacao-") ? "comunicacao" : "financeiro";
}

function revalidarChecklists(): void {
	// `/checklists` serve as duas áreas na mesma rota (abas Financeiro/Comunicação) — revalidar
	// sempre, independente da área do checklist alterado.
	revalidatePath("/");
	revalidatePath("/checklists");
}

export async function criarChecklist(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null) {
		return { status: "error", message: "Sessão expirada." };
	}

	const parsed = criarChecklistSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	if (!podeGerenciarArea(session.role, parsed.data.area)) {
		return { status: "error", message: "Sem permissão para criar checklist nesta área." };
	}

	try {
		const doc: Omit<ChecklistDoc, "criadoEm"> & { criadoEm: Date } = {
			titulo: parsed.data.titulo,
			area: parsed.data.area,
			tema: parsed.data.tema,
			descricao: parsed.data.descricao,
			pinado: false,
			arquivado: false,
			itens: [],
			criadoEm: new Date(),
			criadoPor: session.uid,
		};
		await getFirebaseAdminFirestore().collection(COLECAO).add(doc);
	} catch {
		return { status: "error", message: "Não foi possível criar o checklist. Tente novamente." };
	}

	revalidarChecklists();
	return { status: "ok" };
}

export async function editarChecklist(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null) {
		return { status: "error", message: "Sessão expirada." };
	}

	const parsed = editarChecklistSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection(COLECAO).doc(parsed.data.id);

	try {
		const atual = await ref.get();
		if (!atual.exists) {
			return { status: "error", message: "Checklist não encontrado." };
		}
		const areaAtual = (atual.data() as ChecklistDoc).area;
		if (!podeGerenciarArea(session.role, areaAtual)) {
			return { status: "error", message: "Sem permissão para editar este checklist." };
		}

		// Área nunca muda por aqui — não é campo editável do formulário (seção 5.5 da spec: vem
		// fixa pelo contexto da página); ignorar `parsed.data.area` evita mover um checklist de
		// área via payload adulterado direto na action.
		await ref.update({ titulo: parsed.data.titulo, tema: parsed.data.tema, descricao: parsed.data.descricao });
		revalidarChecklists();
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	return { status: "ok" };
}

export async function arquivarChecklist(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null) {
		return { status: "error", message: "Sessão expirada." };
	}

	const parsed = arquivarChecklistSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { id, origem, arquivado } = parsed.data;
	const firestore = getFirebaseAdminFirestore();

	try {
		if (origem === "customizado") {
			const ref = firestore.collection(COLECAO).doc(id);
			const atual = await ref.get();
			if (!atual.exists) {
				return { status: "error", message: "Checklist não encontrado." };
			}
			const doc = atual.data() as ChecklistDoc;
			if (!podeGerenciarArea(session.role, doc.area)) {
				return { status: "error", message: "Sem permissão para arquivar este checklist." };
			}
			// Arquivar remove o pin automaticamente — não faz sentido um card arquivado continuar
			// ocupando espaço na faixa (seção 7 da spec, caso de borda).
			await ref.update({ arquivado, pinado: arquivado ? false : doc.pinado });
			revalidarChecklists();
		} else {
			const area = areaDoChecklistSistema(id);
			if (!podeGerenciarArea(session.role, area)) {
				return { status: "error", message: "Sem permissão para arquivar este checklist." };
			}
			const ref = firestore.collection(COLECAO_PREFERENCIAS).doc(id);
			const atual = await ref.get();
			const pinadoAtual = atual.exists ? ((atual.data() as ChecklistPreferenciasDoc).pinado ?? false) : false;
			await ref.set({ arquivado, pinado: arquivado ? false : pinadoAtual }, { merge: true });
			revalidarChecklists();
		}
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	return { status: "ok" };
}

export async function alternarPinChecklist(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null) {
		return { status: "error", message: "Sessão expirada." };
	}

	const parsed = alternarPinChecklistSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { id, origem, pinado } = parsed.data;
	const firestore = getFirebaseAdminFirestore();

	try {
		if (origem === "customizado") {
			const ref = firestore.collection(COLECAO).doc(id);
			const atual = await ref.get();
			if (!atual.exists) {
				return { status: "error", message: "Checklist não encontrado." };
			}
			const doc = atual.data() as ChecklistDoc;
			if (!podeGerenciarArea(session.role, doc.area)) {
				return { status: "error", message: "Sem permissão para fixar este checklist." };
			}
			await ref.update({ pinado });
			revalidarChecklists();
		} else {
			const area = areaDoChecklistSistema(id);
			if (!podeGerenciarArea(session.role, area)) {
				return { status: "error", message: "Sem permissão para fixar este checklist." };
			}
			await firestore.collection(COLECAO_PREFERENCIAS).doc(id).set({ pinado }, { merge: true });
			revalidarChecklists();
		}
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	return { status: "ok" };
}

export async function adicionarItemChecklistCustomizado(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null) {
		return { status: "error", message: "Sessão expirada." };
	}

	const parsed = adicionarItemChecklistCustomizadoSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const ref = getFirebaseAdminFirestore().collection(COLECAO).doc(parsed.data.checklistId);

	try {
		const atual = await ref.get();
		if (!atual.exists) {
			return { status: "error", message: "Checklist não encontrado." };
		}
		const doc = atual.data() as ChecklistDoc;
		if (!podeGerenciarArea(session.role, doc.area)) {
			return { status: "error", message: "Sem permissão para alterar este checklist." };
		}

		const novoItem: ChecklistItemDoc = {
			id: randomUUID(),
			titulo: parsed.data.titulo,
			concluido: false,
			concluidoEm: null,
			concluidoPor: null,
			...(parsed.data.actionHref !== undefined ? { actionHref: parsed.data.actionHref } : {}),
			...(parsed.data.actionLabel !== undefined ? { actionLabel: parsed.data.actionLabel } : {}),
			...(parsed.data.explicacao !== undefined && parsed.data.explicacao !== "" ? { explicacao: parsed.data.explicacao } : {}),
		};

		await ref.update({ itens: [...doc.itens, novoItem] });
		revalidarChecklists();
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	return { status: "ok" };
}

export async function alternarItemChecklistCustomizado(input: unknown): Promise<ActionResult> {
	const session = await getServerSession();
	if (session === null) {
		return { status: "error", message: "Sessão expirada." };
	}

	const parsed = alternarItemChecklistCustomizadoSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
	}

	const { checklistId, itemId, concluido } = parsed.data;
	const ref = getFirebaseAdminFirestore().collection(COLECAO).doc(checklistId);

	try {
		const atual = await ref.get();
		if (!atual.exists) {
			return { status: "error", message: "Checklist não encontrado." };
		}
		const doc = atual.data() as ChecklistDoc;
		if (!podeGerenciarArea(session.role, doc.area)) {
			return { status: "error", message: "Sem permissão para alterar este checklist." };
		}

		// Escreve `Date`, não `Timestamp`, no item alterado — o Admin SDK converte na gravação;
		// `ChecklistItemDoc.concluidoEm` é tipado como `Timestamp` só pro formato de leitura (mesmo
		// padrão de `montarEstadoConclusaoChecklist` em `core/financeiro/shared.ts`, cujo retorno
		// também usa `Date`). Sem anotação de tipo explícita no array: os itens não alterados
		// carregam `Timestamp` (já lido do doc), o alterado carrega `Date` — união estrutural
		// inevitável entre leitura e escrita, mesma folga que o resto do app aceita ao gravar no
		// Admin SDK.
		const itens = doc.itens.map((item) =>
			item.id === itemId
				? { ...item, concluido, concluidoEm: concluido ? new Date() : null, concluidoPor: concluido ? session.uid : null }
				: item,
		);

		await ref.update({ itens });
		revalidarChecklists();
	} catch {
		return { status: "error", message: "Não foi possível salvar. Tente novamente." };
	}

	return { status: "ok" };
}
