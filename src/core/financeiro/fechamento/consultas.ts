import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { toIso } from "@/core/shared/serialize";

import { buscarRituaisDasSemanas } from "../ritual/consultas";
import { FECHAMENTO_ITENS, type FechamentoItemId } from "./itens";
import { chavePeriodoValida, formatarPeriodo, semanasDoPeriodo } from "./periodo";
import type { FechamentoConsolidado, FechamentoLinhaEstado } from "./schema";

const COLECAO = "fechamentos_mensais";

interface FechamentoItemDoc {
	concluido: boolean;
	concluidoEm?: Timestamp;
	concluidoPor?: string | null;
}

interface FechamentoDoc {
	itensManuais?: Partial<Record<FechamentoItemId, FechamentoItemDoc>>;
}

export async function buscarFechamentoDoMes(
	firestore: FirebaseFirestore.Firestore,
	periodo: string,
): Promise<FechamentoConsolidado> {
	if (!chavePeriodoValida(periodo)) {
		throw new Error("Período inválido.");
	}

	const semanas = semanasDoPeriodo(periodo);

	const [fechamentoDoc, ritualDasSemanas] = await Promise.all([
		firestore.collection(COLECAO).doc(periodo).get(),
		buscarRituaisDasSemanas(
			firestore,
			semanas.map((semana) => semana.chaveSemana),
		),
	]);

	const itensManuaisDoc = (fechamentoDoc.exists ? (fechamentoDoc.data() as FechamentoDoc) : undefined)?.itensManuais ?? {};

	const linhasSemanas: FechamentoLinhaEstado[] = semanas.map((semana, index) => {
		const ritual = ritualDasSemanas[index];
		const completa = ritual !== undefined && ritual.itens.every((item) => item.concluido);
		return {
			id: `semana-${semana.chaveSemana}`,
			label: `Reconciliar Semana ${index + 1} (${semana.label})`,
			concluido: completa,
			concluidoEm: null,
			concluidoPor: null,
			editavel: false,
		};
	});

	const linhasManuais: FechamentoLinhaEstado[] = FECHAMENTO_ITENS.map((definicao) => {
		const itemDoc = itensManuaisDoc[definicao.id];
		return {
			id: definicao.id,
			label: definicao.label,
			concluido: itemDoc?.concluido ?? false,
			concluidoEm: toIso(itemDoc?.concluidoEm ?? null),
			concluidoPor: itemDoc?.concluidoPor ?? null,
			editavel: true,
		};
	});

	const linhas = [...linhasManuais, ...linhasSemanas];
	const semanasFechadas = linhasSemanas.filter((linha) => linha.concluido).length;

	return {
		periodo,
		periodoLabel: formatarPeriodo(periodo),
		linhas,
		semanasFechadas,
		totalSemanas: linhasSemanas.length,
		pendenciasRestantes: linhas.filter((linha) => !linha.concluido).length,
	};
}
