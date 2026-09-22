import "server-only";

import { lerRitualSemana } from "@/core/db/ritual";
import { formatarDataCurta } from "@/core/financeiro/shared";

import type { RitualPendenciaHerdada, RitualSemana } from "./schema";

/** Quantas semanas anteriores checar em busca de itens não concluídos (v1, valor fixo). */
const SEMANAS_HISTORICO = 8;

/** Segunda-feira (00:00 local) da semana que contém `data` — semanas do Ritual sempre começam na segunda. */
export function segundaFeiraDaSemana(data: Date): Date {
	const resultado = new Date(data);
	const diaDaSemana = resultado.getDay(); // 0 = domingo
	const diffParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
	resultado.setDate(resultado.getDate() + diffParaSegunda);
	resultado.setHours(0, 0, 0, 0);
	return resultado;
}

/** Chave de semana (yyyy-MM-dd) a partir de uma segunda-feira já calculada por `segundaFeiraDaSemana`. */
export function chaveSemana(segunda: Date): string {
	const ano = segunda.getFullYear();
	const mes = String(segunda.getMonth() + 1).padStart(2, "0");
	const dia = String(segunda.getDate()).padStart(2, "0");
	return `${ano}-${mes}-${dia}`;
}

export async function buscarRitualDaSemana(semana: string): Promise<RitualSemana> {
	return lerRitualSemana(semana);
}

/**
 * Semanas anteriores (até `SEMANAS_HISTORICO` pra trás, sem contar a semana atual) que já tiveram
 * um Ritual iniciado (doc existe) mas ficaram com algum item não concluído — viram pendência
 * herdada nas telas de Pendências e no próprio Ritual (Figma: "Ritual de segunda: reconciliação
 * da semana 21/07 não concluída"). `semana` vem como campo próprio (não só embutida no `id`) pra
 * quem consome montar um link de volta ao Ritual daquela semana sem parsear o `id`.
 * Semanas sem doc (Ritual nunca iniciado ali) não contam — não há histórico anterior ao lançamento
 * da funcionalidade.
 */
export async function buscarPendenciasRitualHerdadas(agora: Date): Promise<RitualPendenciaHerdada[]> {
	const segundaAtual = segundaFeiraDaSemana(agora);
	const semanasAnteriores: Date[] = [];
	for (let i = 1; i <= SEMANAS_HISTORICO; i += 1) {
		const data = new Date(segundaAtual);
		data.setDate(data.getDate() - 7 * i);
		semanasAnteriores.push(data);
	}

	const resultados = await Promise.all(
		semanasAnteriores.map(async (segunda): Promise<RitualPendenciaHerdada | null> => {
			const semana = chaveSemana(segunda);
			const ritual = await lerRitualSemana(semana);
			if (!ritual.existiu) {
				return null;
			}

			const itensPendentesIds = ritual.itens.filter((item) => !item.concluido).map((item) => item.id);
			if (itensPendentesIds.length === 0) {
				return null;
			}

			return {
				id: `ritual-${semana}`,
				semana,
				itensPendentesIds,
				icon: "calendario",
				titulo: `Ritual de segunda: reconciliação da semana ${formatarDataCurta(segunda)} não concluída`,
				meta: "Item herdado do ciclo anterior • Requer revisão manual",
			};
		}),
	);

	return resultados.filter((item): item is RitualPendenciaHerdada => item !== null);
}
