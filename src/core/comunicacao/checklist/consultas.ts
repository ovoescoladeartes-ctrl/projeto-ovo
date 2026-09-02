import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type { Estagio } from "@/core/comunicacao/contatos/schema";
import { contatoEhPendente, diasDesde } from "@/core/comunicacao/pendencias";
import { toIso } from "@/core/shared/serialize";

import { TIME_BLOCK_DEFINICOES, type ChecklistBloco, type ChecklistComunicacaoDia, type ChecklistContatoItem, type ChecklistManualItem } from "./schema";

const COLECAO = "checklistComunicacaoDias";

/** Quantos dias anteriores checar em busca de item incompleto herdado — mesma ordem de grandeza de `SEMANAS_HISTORICO` do Ritual financeiro (8), adaptada de semanas pra dias porque aqui o ritmo é diário/3x-ao-dia, não semanal. */
const DIAS_HISTORICO = 8;

interface ContatoDoc {
	nome: string;
	canal: string;
	estagio: string;
	estagioAtualizadoEm?: Timestamp;
	ativo: boolean;
}

interface ContatoPendenteResumo {
	id: string;
	nome: string;
	canal: string;
	estagio: Estagio;
	estagioAtualizadoEm: string | null;
}

interface EstadoItemDoc {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

interface ManualItemDoc extends EstadoItemDoc {
	titulo: string;
}

interface ChecklistDiaDoc {
	contatos?: Record<string, EstadoItemDoc>;
	manuais?: Record<string, ManualItemDoc>;
}

/** Chave do dia (yyyy-MM-dd) a partir de uma data qualquer, no fuso local. */
export function chaveDia(data: Date): string {
	const ano = data.getFullYear();
	const mes = String(data.getMonth() + 1).padStart(2, "0");
	const diaDoMes = String(data.getDate()).padStart(2, "0");
	return `${ano}-${mes}-${diaDoMes}`;
}

/** Chave de `dia` deslocada por `offsetDias` (negativo = pra trás). */
function chaveDiaComOffset(dia: string, offsetDias: number): string {
	const data = new Date(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)));
	data.setDate(data.getDate() + offsetDias);
	return chaveDia(data);
}

async function listarContatosPendentes(firestore: FirebaseFirestore.Firestore, agora: Date): Promise<ContatoPendenteResumo[]> {
	const snapshot = await firestore.collection("contatos").where("ativo", "==", true).orderBy("estagioAtualizadoEm", "asc").get();

	return snapshot.docs
		.map((doc) => {
			const data = doc.data() as ContatoDoc;
			return {
				id: doc.id,
				nome: data.nome,
				canal: data.canal,
				estagio: data.estagio as Estagio,
				estagioAtualizadoEm: toIso(data.estagioAtualizadoEm ?? null),
			};
		})
		.filter((contato) => contatoEhPendente(contato.estagio, contato.estagioAtualizadoEm, agora));
}

/**
 * Defesa contra dado sujo pré-existente (achado em produção: um `contato.nome` com o HTML de uma
 * linha da tabela de Pessoas colado por engano) — remove qualquer trecho `<...>` antes de exibir.
 * Não é a correção da causa raiz (isso é a validação em `contatos/schema.ts`, que já impede um
 * nome novo assim de ser salvo daqui pra frente); resolve só a exibição de registros que ficaram
 * ruins antes dessa validação existir, sem precisar de limpeza manual do dado pra a tela parar de
 * quebrar.
 */
function removerMarcacaoHtml(texto: string): string {
	return texto
		.replace(/<[^>]*>/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function montarItem(contato: ContatoPendenteResumo, estado: EstadoItemDoc | undefined, agora: Date): ChecklistContatoItem {
	return {
		contatoId: contato.id,
		nome: removerMarcacaoHtml(contato.nome),
		canal: contato.canal,
		diasAguardando: diasDesde(contato.estagioAtualizadoEm, agora),
		concluido: estado?.concluido ?? false,
		concluidoEm: toIso(estado?.concluidoEm ?? null),
		concluidoPor: estado?.concluidoPor ?? null,
	};
}

/**
 * Materializa (upsert transacional, idempotente) cada contato de `pendentesIds` que ainda não tem
 * entrada no doc do dia, com `concluido:false` — sem isso, um contato nunca marcado não deixaria
 * rastro pros dias seguintes saberem que ele já estava pendente e migrar pra "Pendências
 * anteriores". O Ritual financeiro não precisa disso porque seus itens são um conjunto fixo
 * conhecido de antemão; aqui o conjunto é dinâmico.
 *
 * Roda dentro de uma transação porque esta função só escreve os ids que **ela mesma** confirma
 * estarem ausentes no momento do commit — sem isso, uma leitura desatualizada poderia sobrescrever
 * com `concluido:false` uma conclusão genuína que acabou de chegar por `alternarItemChecklistComunicacao`
 * (mesmo contato, mesmo dia). O SDK do Firestore já reexecuta a transação sozinho se o doc mudar
 * entre a leitura e o commit, então uma corrida com o toggle nunca perde a marcação real.
 */
async function materializarChecklistDoDia(firestore: FirebaseFirestore.Firestore, dia: string, pendentesIds: readonly string[]): Promise<void> {
	if (pendentesIds.length === 0) {
		return;
	}

	const docRef = firestore.collection(COLECAO).doc(dia);
	await firestore.runTransaction(async (tx) => {
		const snapshot = await tx.get(docRef);
		const existentes = (snapshot.exists ? (snapshot.data() as ChecklistDiaDoc) : undefined)?.contatos ?? {};
		const faltantes = pendentesIds.filter((id) => existentes[id] === undefined);
		if (faltantes.length === 0) {
			return;
		}

		const seed: Record<string, EstadoItemDoc> = {};
		faltantes.forEach((id) => {
			seed[`contatos.${id}`] = { concluido: false };
		});
		tx.set(docRef, seed, { merge: true });
	});
}

/** Ids de contato com item incompleto (`concluido:false`) em algum dos `DIAS_HISTORICO` dias anteriores a `dia` — um dia sem doc (app não aberto naquele dia) não interrompe a busca, diferente de checar só "ontem". */
async function buscarIdsIncompletosDiasAnteriores(firestore: FirebaseFirestore.Firestore, dia: string): Promise<Set<string>> {
	const chavesAnteriores = Array.from({ length: DIAS_HISTORICO }, (_, indice) => chaveDiaComOffset(dia, -(indice + 1)));

	const snapshots = await Promise.all(chavesAnteriores.map((chave) => firestore.collection(COLECAO).doc(chave).get()));

	const ids = new Set<string>();
	snapshots.forEach((snapshot) => {
		if (!snapshot.exists) {
			return;
		}
		const contatos = (snapshot.data() as ChecklistDiaDoc).contatos ?? {};
		Object.entries(contatos).forEach(([id, estado]) => {
			if (!estado.concluido) {
				ids.add(id);
			}
		});
	});
	return ids;
}

/**
 * Checklist do Dia (Comunicação) — "hoje" sempre corresponde a `dia === chaveDia(agora)`; não há
 * navegação pra dias passados na v1 (diferente do Ritual financeiro, que tem itens fixos e por
 * isso consegue reconstruir qualquer semana; aqui o conjunto de itens é derivado ao vivo dos
 * contatos pendentes, então só "hoje" tem sentido de ser consultado).
 */
export async function buscarChecklistComunicacaoDoDia(firestore: FirebaseFirestore.Firestore, dia: string, agora: Date): Promise<ChecklistComunicacaoDia> {
	const [pendentes, docHoje, idsIncompletosAnteriores] = await Promise.all([
		listarContatosPendentes(firestore, agora),
		firestore.collection(COLECAO).doc(dia).get(),
		buscarIdsIncompletosDiasAnteriores(firestore, dia),
	]);

	await materializarChecklistDoDia(
		firestore,
		dia,
		pendentes.map((contato) => contato.id),
	);

	const contatosHoje = (docHoje.exists ? (docHoje.data() as ChecklistDiaDoc) : undefined)?.contatos ?? {};
	const idsAnteriores = new Set(pendentes.filter((contato) => idsIncompletosAnteriores.has(contato.id)).map((contato) => contato.id));

	const pendenciasAnteriores = pendentes
		.filter((contato) => idsAnteriores.has(contato.id))
		.filter((contato) => contatosHoje[contato.id]?.concluido !== true)
		.map((contato) => montarItem(contato, contatosHoje[contato.id], agora));

	const itensPendentesHoje = pendentes
		.filter((contato) => !idsAnteriores.has(contato.id))
		.filter((contato) => contatosHoje[contato.id]?.concluido !== true)
		.map((contato) => montarItem(contato, contatosHoje[contato.id], agora));

	const blocos: ChecklistBloco[] = TIME_BLOCK_DEFINICOES.map((definicao) => {
		const disponivel = agora.getHours() >= definicao.horaInicio;
		return {
			id: definicao.id,
			label: definicao.label,
			horaInicio: definicao.horaInicio,
			disponivel,
			itens: disponivel ? itensPendentesHoje : [],
		};
	});

	const manuaisDoc = (docHoje.exists ? (docHoje.data() as ChecklistDiaDoc) : undefined)?.manuais ?? {};
	const manuais: ChecklistManualItem[] = Object.entries(manuaisDoc).map(([id, item]) => ({
		id,
		titulo: item.titulo,
		concluido: item.concluido,
		concluidoEm: toIso(item.concluidoEm ?? null),
		concluidoPor: item.concluidoPor ?? null,
	}));

	return { dia, blocos, itensPendentesHoje, pendenciasAnteriores, manuais };
}
