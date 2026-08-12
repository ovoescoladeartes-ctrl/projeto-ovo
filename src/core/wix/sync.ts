import type { RecebimentoStatus } from "@/core/financeiro/recebimentos/schema";
import type { WixContact, WixOrder, WixProduct } from "@/core/wix/types";

/**
 * Lógica pura de upsert/mapeamento Wix → Trilho: recebe dados já buscados da
 * Wix e já lidos do Firestore, devolve o que criar/atualizar/pular. Sem I/O —
 * facilita testar sem mockar rede/Firestore. A Server Action (actions.ts) é
 * quem busca os dados, aloca os doc refs do Firestore e grava o resultado
 * deste módulo em batch.
 */

export interface PessoaPlanoCriar {
	wixContactId: string;
	nome: string;
	email: string | null;
	telefone: string | null;
}

export interface PessoaPlanoAtualizar extends PessoaPlanoCriar {
	pessoaId: string;
}

export interface PlanoPessoas {
	criar: PessoaPlanoCriar[];
	atualizar: PessoaPlanoAtualizar[];
}

function nomeContato(contact: WixContact): string {
	const primeiro = contact.info?.name?.first ?? "";
	const ultimo = contact.info?.name?.last ?? "";
	const nome = `${primeiro} ${ultimo}`.trim();
	return nome !== "" ? nome : (contact.primaryInfo?.email ?? "Sem nome");
}

/**
 * Só considera contatos que aparecem como comprador em algum order (decisão de
 * escopo: importar toda a base de Contacts poluiria o cadastro com visitantes
 * que nunca compraram nada).
 */
export function planejarPessoas(
	orders: WixOrder[],
	contacts: WixContact[],
	pessoaIdExistentePorWixContactId: ReadonlyMap<string, string>,
): PlanoPessoas {
	const buyerContactIds = new Set(
		orders.map((order) => order.buyerInfo?.contactId).filter((id): id is string => id !== undefined),
	);
	const contactsPorId = new Map(contacts.map((contact) => [contact.id, contact]));

	const criar: PessoaPlanoCriar[] = [];
	const atualizar: PessoaPlanoAtualizar[] = [];

	for (const contactId of buyerContactIds) {
		const contact = contactsPorId.get(contactId);
		if (contact === undefined) {
			continue; // Wix não retornou esse contato (ex.: deletado) — o recebimento correspondente é pulado em planejarRecebimentos.
		}

		const nome = nomeContato(contact);
		const email = contact.primaryInfo?.email ?? null;
		const telefone = contact.primaryInfo?.phone ?? null;

		const pessoaIdExistente = pessoaIdExistentePorWixContactId.get(contactId);
		if (pessoaIdExistente !== undefined) {
			atualizar.push({ pessoaId: pessoaIdExistente, wixContactId: contactId, nome, email, telefone });
		} else {
			criar.push({ wixContactId: contactId, nome, email, telefone });
		}
	}

	return { criar, atualizar };
}

export interface TurmaPlanoCriar {
	wixProductId: string;
	nome: string;
	mensalidadeCentavos: number;
}

export interface TurmaPlanoAtualizar extends TurmaPlanoCriar {
	turmaId: string;
}

export interface PlanoTurmas {
	criar: TurmaPlanoCriar[];
	atualizar: TurmaPlanoAtualizar[];
}

/**
 * Ao contrário de Pessoas, sincroniza o catálogo inteiro (não só produtos com
 * order) — cursos são curados pela própria escola, não têm o problema de ruído
 * de visitante/lead que Contacts tem, então não há motivo pra esconder um
 * curso publicado sem venda ainda.
 */
export function planejarTurmas(products: WixProduct[], turmaIdExistentePorWixProductId: ReadonlyMap<string, string>): PlanoTurmas {
	const criar: TurmaPlanoCriar[] = [];
	const atualizar: TurmaPlanoAtualizar[] = [];

	for (const product of products) {
		const mensalidadeCentavos = Math.round((product.price?.price ?? 0) * 100);
		const turmaIdExistente = turmaIdExistentePorWixProductId.get(product.id);
		if (turmaIdExistente !== undefined) {
			atualizar.push({ turmaId: turmaIdExistente, wixProductId: product.id, nome: product.name, mensalidadeCentavos });
		} else {
			criar.push({ wixProductId: product.id, nome: product.name, mensalidadeCentavos });
		}
	}

	return { criar, atualizar };
}

function mapearStatusRecebimento(paymentStatus: string): RecebimentoStatus {
	if (paymentStatus === "PAID") {
		return "confirmado";
	}
	if (paymentStatus === "FULLY_REFUNDED" || paymentStatus === "PARTIALLY_REFUNDED") {
		return "cancelado";
	}
	return "pendente"; // NOT_PAID, PENDING, PARTIALLY_PAID e qualquer status futuro desconhecido — nunca conta como recebido sem confirmação.
}

export interface RecebimentoPlanoCriar {
	wixOrderId: string;
	wixLineItemId: string;
	pessoaId: string;
	turmaId: string | null;
	valorCentavos: number;
	status: RecebimentoStatus;
	dataRecebimento: string;
}

export interface RecebimentoPulado {
	wixOrderId: string;
	wixLineItemId: string;
	motivo: string;
}

export interface RecebimentoAviso {
	wixOrderId: string;
	wixLineItemId: string;
	aviso: string;
}

export interface PlanoRecebimentos {
	criar: RecebimentoPlanoCriar[];
	pulados: RecebimentoPulado[];
	avisos: RecebimentoAviso[];
}

function chaveRecebimento(orderId: string, lineItemId: string): string {
	return `${orderId}:${lineItemId}`;
}

/**
 * Um Recebimento por line item (não por order) — a chave de idempotência é o
 * par (wixOrderId, wixLineItemId). pessoaId não resolvido → pula (é campo
 * obrigatório no schema). turmaId não resolvido → NÃO pula, grava com
 * turmaId: null e reporta aviso (dinheiro não pode sumir silenciosamente).
 */
export function planejarRecebimentos(
	orders: WixOrder[],
	pessoaIdPorWixContactId: ReadonlyMap<string, string>,
	turmaIdPorWixProductId: ReadonlyMap<string, string>,
	recebimentosExistentes: ReadonlySet<string>,
): PlanoRecebimentos {
	const criar: RecebimentoPlanoCriar[] = [];
	const pulados: RecebimentoPulado[] = [];
	const avisos: RecebimentoAviso[] = [];

	for (const order of orders) {
		const dataRecebimento = order.createdDate ?? new Date().toISOString();
		const contactId = order.buyerInfo?.contactId;

		for (const lineItem of order.lineItems) {
			if (recebimentosExistentes.has(chaveRecebimento(order.id, lineItem.id))) {
				continue; // já sincronizado em execução anterior — não é problema, é o caso normal de re-sync.
			}

			if (contactId === undefined) {
				pulados.push({ wixOrderId: order.id, wixLineItemId: lineItem.id, motivo: "Order sem comprador identificado." });
				continue;
			}

			const pessoaId = pessoaIdPorWixContactId.get(contactId);
			if (pessoaId === undefined) {
				pulados.push({ wixOrderId: order.id, wixLineItemId: lineItem.id, motivo: "Contato do comprador não encontrado na Wix." });
				continue;
			}

			const valorRaw = lineItem.price?.amount;
			const valorCentavos = valorRaw !== undefined ? Math.round(Number.parseFloat(valorRaw) * 100) : Number.NaN;
			if (!Number.isFinite(valorCentavos)) {
				pulados.push({ wixOrderId: order.id, wixLineItemId: lineItem.id, motivo: "Valor do item não pôde ser interpretado." });
				continue;
			}

			const catalogItemId = lineItem.catalogReference?.catalogItemId;
			const turmaId = catalogItemId !== undefined ? (turmaIdPorWixProductId.get(catalogItemId) ?? null) : null;
			if (turmaId === null) {
				avisos.push({
					wixOrderId: order.id,
					wixLineItemId: lineItem.id,
					aviso: "Produto não identificado como turma — recebimento gravado sem turma vinculada.",
				});
			}

			criar.push({
				wixOrderId: order.id,
				wixLineItemId: lineItem.id,
				pessoaId,
				turmaId,
				valorCentavos,
				status: mapearStatusRecebimento(order.paymentStatus),
				dataRecebimento,
			});
		}
	}

	return { criar, pulados, avisos };
}
