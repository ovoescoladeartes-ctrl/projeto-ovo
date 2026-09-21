import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { formatarDataCurta } from "@/core/financeiro/shared";
import { buscarRitualDaSemana, chaveSemana, segundaFeiraDaSemana } from "@/core/financeiro/ritual/consultas";
import { RITUAL_ITENS } from "@/core/financeiro/ritual/schema";
import { toIso } from "@/core/shared/serialize";

import {
	FECHAMENTO_ITENS,
	type FechamentoConsolidado,
	type FechamentoItemId,
	type FechamentoLinhaEstado,
	type FechamentoTarefaRecorrentePendente,
} from "./schema";

const COLECAO = "fechamentosMensais";

interface FechamentoItemDoc {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

type FechamentoMesDoc = Partial<Record<FechamentoItemId, FechamentoItemDoc>>;

/** `periodo` sempre tem o formato fixo "yyyy-MM" (ver `periodoSchema`) — `slice` evita a checagem de índice de array que `split("-")` exigiria sob `noUncheckedIndexedAccess`. */
function parsePeriodo(periodo: string): { ano: number; mes: number } {
	return { ano: Number(periodo.slice(0, 4)), mes: Number(periodo.slice(5, 7)) };
}

function formatarPeriodoLabel(periodo: string): string {
	const { ano, mes } = parsePeriodo(periodo);
	const data = new Date(ano, mes - 1, 1);
	const formatada = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(data);
	return formatada.charAt(0).toUpperCase() + formatada.slice(1);
}

/** Chave de período (yyyy-MM) a partir de uma data qualquer daquele mês. */
export function chavePeriodoDoMes(data: Date): string {
	return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

/** Segundas-feiras contidas no mês de `periodo` — cada uma pode contribuir semanas pendentes pros agrupamentos de tarefa recorrente. */
function segundasDoMes(periodo: string): Date[] {
	const { ano, mes } = parsePeriodo(periodo);
	const primeiroDia = new Date(ano, mes - 1, 1);
	const ultimoDia = new Date(ano, mes, 0);

	const segundas: Date[] = [];
	for (const cursor = new Date(primeiroDia); cursor <= ultimoDia; cursor.setDate(cursor.getDate() + 1)) {
		if (cursor.getDay() === 1) {
			segundas.push(new Date(cursor));
		}
	}
	return segundas;
}

/**
 * Antes, cada semana do mês virava uma linha resumo só ("Reconciliar Semana N") e, na correção
 * seguinte, cada semana pendente virou um grupo com os itens reais — mas isso repetia a mesma
 * tarefa recorrente (ex.: "Conferir entradas novas") uma vez por semana pendente, parecendo
 * erro/duplicação (item 2 da 7ª rodada de feedback). Agora agrupa por **tarefa**: cada tarefa
 * recorrente do Ritual com pelo menos 1 semana do mês ainda pendente vira uma entrada só, com a
 * lista de semanas pendentes dentro (pra expandir e marcar/exportar). Tarefa concluída em todas as
 * semanas do mês não aparece em lugar nenhum.
 */
export async function buscarFechamentoDoMes(firestore: FirebaseFirestore.Firestore, periodo: string): Promise<FechamentoConsolidado> {
	const segundas = segundasDoMes(periodo);

	const [doc, semanas] = await Promise.all([
		firestore.collection(COLECAO).doc(periodo).get(),
		Promise.all(
			segundas.map(async (segunda, index) => {
				const semana = chaveSemana(segundaFeiraDaSemana(segunda));
				const ritual = await buscarRitualDaSemana(firestore, semana);
				const domingo = new Date(segunda);
				domingo.setDate(domingo.getDate() + 6);
				return {
					semana,
					segunda,
					domingo,
					label: `Semana ${index + 1} (${formatarDataCurta(segunda)} a ${formatarDataCurta(domingo)})`,
					itens: ritual.itens,
				};
			}),
		),
	]);

	const fechamentoDoc = doc.exists ? (doc.data() as FechamentoMesDoc) : undefined;

	const linhas: FechamentoLinhaEstado[] = FECHAMENTO_ITENS.map((definicao) => {
		const estado = fechamentoDoc?.[definicao.id];
		return {
			id: definicao.id,
			label: definicao.label,
			concluido: estado?.concluido ?? false,
			concluidoEm: toIso(estado?.concluidoEm ?? null),
			concluidoPor: estado?.concluidoPor ?? null,
			explicacao: definicao.explicacao,
		};
	});

	const tarefasRecorrentesPendentes: FechamentoTarefaRecorrentePendente[] = [];
	for (const definicao of RITUAL_ITENS) {
		const semanasComPendencia = semanas.filter((semana) =>
			semana.itens.some((item) => item.id === definicao.id && !item.concluido),
		);
		if (semanasComPendencia.length === 0) {
			continue;
		}

		const inicios = semanasComPendencia.map((semana) => semana.segunda.getTime());
		const fins = semanasComPendencia.map((semana) => semana.domingo.getTime());
		const primeiraSegunda = new Date(Math.min(...inicios));
		const ultimoDomingo = new Date(Math.max(...fins));
		const total = semanasComPendencia.length;

		tarefasRecorrentesPendentes.push({
			itemId: definicao.id,
			label: definicao.label,
			explicacao: definicao.explicacao,
			periodoLabel: `${total} semana${total === 1 ? "" : "s"} pendente${total === 1 ? "" : "s"} (${formatarDataCurta(primeiraSegunda)} a ${formatarDataCurta(ultimoDomingo)})`,
			semanas: semanasComPendencia.map((semana) => ({ semana: semana.semana, label: semana.label })),
		});
	}

	const semanasFechadas = semanas.filter((semana) => semana.itens.every((item) => item.concluido)).length;

	return {
		periodo,
		periodoLabel: formatarPeriodoLabel(periodo),
		linhas,
		tarefasRecorrentesPendentes,
		semanasFechadas,
		totalSemanas: semanas.length,
	};
}
