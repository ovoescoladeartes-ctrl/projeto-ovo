import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { formatarDataCurta } from "@/core/financeiro/shared";
import { buscarRitualDaSemana, chaveSemana, segundaFeiraDaSemana } from "@/core/financeiro/ritual/consultas";
import { toIso } from "@/core/shared/serialize";

import { FECHAMENTO_ITENS, FECHAMENTO_ITEM_IDS, type FechamentoConsolidado, type FechamentoItemId, type FechamentoLinhaEstado } from "./schema";

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

/** Segundas-feiras contidas no mês de `periodo` — cada uma vira uma linha "Reconciliar Semana N" derivada do Ritual daquela semana. */
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

export async function buscarFechamentoDoMes(firestore: FirebaseFirestore.Firestore, periodo: string): Promise<FechamentoConsolidado> {
	const segundas = segundasDoMes(periodo);

	const [doc, linhasSemana] = await Promise.all([
		firestore.collection(COLECAO).doc(periodo).get(),
		Promise.all(
			segundas.map(async (segunda, index): Promise<FechamentoLinhaEstado> => {
				const semana = chaveSemana(segundaFeiraDaSemana(segunda));
				const ritual = await buscarRitualDaSemana(firestore, semana);
				const domingo = new Date(segunda);
				domingo.setDate(domingo.getDate() + 6);
				return {
					id: `semana-${semana}`,
					label: `Reconciliar Semana ${index + 1} (${formatarDataCurta(segunda)} a ${formatarDataCurta(domingo)})`,
					concluido: ritual.itens.every((item) => item.concluido),
					concluidoEm: null,
					concluidoPor: null,
					tipo: "semana",
				};
			}),
		),
	]);

	const fechamentoDoc = doc.exists ? (doc.data() as FechamentoMesDoc) : undefined;

	const linhasFixas: FechamentoLinhaEstado[] = FECHAMENTO_ITENS.map((definicao) => {
		const estado = fechamentoDoc?.[definicao.id];
		return {
			id: definicao.id,
			label: definicao.label,
			concluido: estado?.concluido ?? false,
			concluidoEm: toIso(estado?.concluidoEm ?? null),
			concluidoPor: estado?.concluidoPor ?? null,
			tipo: "fixo",
		};
	});

	const primeiroFixoId = FECHAMENTO_ITEM_IDS[0];
	const itemAbertura = linhasFixas.find((linha) => linha.id === primeiroFixoId);
	const restoFixos = linhasFixas.filter((linha) => linha.id !== primeiroFixoId);

	const linhas = itemAbertura !== undefined ? [itemAbertura, ...linhasSemana, ...restoFixos] : [...linhasSemana, ...restoFixos];

	const semanasFechadas = linhasSemana.filter((linha) => linha.concluido).length;
	const pendenciasRestantes = linhas.filter((linha) => !linha.concluido).length;

	return {
		periodo,
		periodoLabel: formatarPeriodoLabel(periodo),
		linhas,
		semanasFechadas,
		totalSemanas: linhasSemana.length,
		pendenciasRestantes,
	};
}
