import type { RecebimentoStatus } from "@/core/financeiro/recebimentos/schema";
import type { TurmaTipo } from "@/core/turmas/schema";
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
	tipo: TurmaTipo | null;
	dataInicio: string | null;
	mensalidadeCentavos: number;
}

/**
 * Turma já existente (casada por `wixProductId`) só recebe `mensalidadeCentavos`/`origem` num
 * re-sync — `nome`/`tipo`/`dataInicio` são tratados só na criação (`TurmaPlanoCriar`). Antes essa
 * interface herdava de `TurmaPlanoCriar` e o `nome` cru da Wix era regravado a cada sync,
 * desfazendo qualquer limpeza manual feita pela tela de editar — bug corrigido em 2026-08-13
 * (round de limpeza de dados de Turmas).
 */
export interface TurmaPlanoAtualizar {
	turmaId: string;
	wixProductId: string;
	mensalidadeCentavos: number;
}

export interface PlanoTurmas {
	criar: TurmaPlanoCriar[];
	atualizar: TurmaPlanoAtualizar[];
}

const MESES_ABREVIADOS: Record<string, string> = {
	JAN: "01",
	FEV: "02",
	MAR: "03",
	ABR: "04",
	MAI: "05",
	JUN: "06",
	JUL: "07",
	AGO: "08",
	SET: "09",
	OUT: "10",
	NOV: "11",
	DEZ: "12",
};

/** Ano fixo pra data extraída do nome da Wix (que nunca inclui ano) — decisão do Rogério em 2026-08-13. */
const ANO_PADRAO_DATA_TURMA = 2026;

const PALAVRAS_MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "em", "e", "a", "o", "com", "para"]);

function paraTituloCase(texto: string): string {
	return texto
		.toLowerCase()
		.split(" ")
		.map((palavra, indice) => {
			if (palavra === "") {
				return palavra;
			}
			if (indice > 0 && PALAVRAS_MINUSCULAS.has(palavra)) {
				return palavra;
			}
			return palavra.charAt(0).toUpperCase() + palavra.slice(1);
		})
		.join(" ");
}

export interface TurmaNomeLimpo {
	tipo: TurmaTipo | null;
	dataInicio: string | null;
	nome: string;
}

/**
 * O nome de produto da Wix mistura até 3 informações numa string só: data da sessão
 * ("12/SET"), tipo de atividade ("CURSO"/"OFICINA") e só então o título de verdade — ex.:
 * "12/SET - OFICINA Jogo, Palavra e Presença: Ferramentas para Contação de história". Essa
 * função reconhece o prefixo de data e de tipo (com ou sem "-"/":"/"DE" entre eles, os produtos
 * da Wix não seguem um separador único) e devolve os três já separados. Quando o nome não bate
 * em nenhum padrão reconhecido, devolve o nome original intacto (tipo/data `null`) — sem
 * regressão em relação ao comportamento anterior a essa função existir.
 */
export function limparNomeTurmaWix(nomeCru: string): TurmaNomeLimpo {
	let resto = nomeCru.trim();
	let dataInicio: string | null = null;

	const dataMatch = /^(\d{1,2})\/([A-ZÇ]{3})\.?\s*-?\s*/i.exec(resto);
	const dia = dataMatch?.[1];
	const mesAbreviado = dataMatch?.[2];
	if (dataMatch && dia !== undefined && mesAbreviado !== undefined) {
		const mes = MESES_ABREVIADOS[mesAbreviado.toUpperCase()];
		if (mes !== undefined) {
			dataInicio = `${ANO_PADRAO_DATA_TURMA}-${mes}-${dia.padStart(2, "0")}`;
			resto = resto.slice(dataMatch[0].length).trim();
		}
	}

	let tipo: TurmaTipo | null = null;
	const tipoMatch = /^(CURSO|OFICINA)\b\s*:?\s*(DE\s+)?-?\s*/i.exec(resto);
	const tipoTexto = tipoMatch?.[1];
	if (tipoMatch && tipoTexto !== undefined) {
		tipo = tipoTexto.toUpperCase() === "CURSO" ? "curso" : "oficina";
		resto = resto.slice(tipoMatch[0].length).trim();
	}

	// Convenção observada nos dados reais: só o nome dos "CURSO ..." sem data vem gravado em
	// caixa alta inteira na Wix — os com data (todos "OFICINA") já vêm em caixa mista de
	// verdade, não mexe nesses pra não estragar um título que já está certo.
	const nome = dataInicio === null && tipo !== null && resto === resto.toUpperCase() ? paraTituloCase(resto) : resto;

	return { tipo, dataInicio, nome: nome.trim() || nomeCru };
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
			atualizar.push({ turmaId: turmaIdExistente, wixProductId: product.id, mensalidadeCentavos });
		} else {
			const limpo = limparNomeTurmaWix(product.name);
			criar.push({
				wixProductId: product.id,
				nome: limpo.nome,
				tipo: limpo.tipo,
				dataInicio: limpo.dataInicio,
				mensalidadeCentavos,
			});
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

export interface RecebimentoParaMatricula {
	pessoaId: string;
	turmaId: string | null;
	valorCentavos: number;
	status: RecebimentoStatus;
	dataRecebimento: string;
}

export interface MatriculaCandidata {
	pessoaId: string;
	turmaId: string;
	dataMatricula: string;
	mensalidadeCombinadaCentavos: number;
}

/**
 * "Se pagou, está matriculado": pra cada par (pessoaId, turmaId) com pelo menos um recebimento
 * "confirmado", devolve uma matrícula candidata com a data e o valor do recebimento confirmado
 * mais antigo do par (snapshot do que foi realmente pago, não a mensalidade atual da turma).
 * Puro e sem I/O — usado tanto pelo sync em tempo real (Fase B, a partir do plano de
 * Recebimentos recém-calculado) quanto pelo script de correção retroativa (Fase A, a partir dos
 * Recebimentos já persistidos no Firestore).
 */
export function planejarMatriculasRetroativas(recebimentos: readonly RecebimentoParaMatricula[]): MatriculaCandidata[] {
	const recebimentosConfirmadosPorPar = new Map<string, RecebimentoParaMatricula[]>();
	for (const recebimento of recebimentos) {
		if (recebimento.status !== "confirmado" || recebimento.turmaId === null) {
			continue;
		}
		const chave = `${recebimento.pessoaId}:${recebimento.turmaId}`;
		const lista = recebimentosConfirmadosPorPar.get(chave) ?? [];
		lista.push(recebimento);
		recebimentosConfirmadosPorPar.set(chave, lista);
	}

	const candidatas: MatriculaCandidata[] = [];
	recebimentosConfirmadosPorPar.forEach((lista) => {
		const maisAntigo = lista.reduce((a, b) => (a.dataRecebimento <= b.dataRecebimento ? a : b));
		candidatas.push({
			pessoaId: maisAntigo.pessoaId,
			// turmaId nunca é null aqui — filtrado na montagem do Map acima.
			turmaId: maisAntigo.turmaId as string,
			dataMatricula: maisAntigo.dataRecebimento,
			mensalidadeCombinadaCentavos: maisAntigo.valorCentavos,
		});
	});

	return candidatas;
}
