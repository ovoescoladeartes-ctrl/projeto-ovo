import "server-only";

import type { Role } from "@/core/auth/Role";
import {
	CAIXA_ROLES,
	montarKpisEPendenciasComunicacao,
	montarKpisEPendenciasFinanceiro,
	VAGOES_ROLES,
} from "@/core/dashboard/consultas";
import type { KpiCardData, PendenciaItem } from "@/core/dashboard/types";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

function linhasKpi(kpis: KpiCardData[]): string {
	return kpis.map((kpi) => `- ${kpi.label}: ${kpi.value}${kpi.subtitle ? ` (${kpi.subtitle})` : ""}`).join("\n");
}

function linhasPendencia(pendencias: PendenciaItem[]): string {
	if (pendencias.length === 0) {
		return "- nenhuma";
	}
	return pendencias.map((item) => `- ${item.titulo}: ${item.meta}`).join("\n");
}

/**
 * Monta o contexto do Copiloto com dados reais do Firestore, restrito ao que
 * a role da pessoa logada já pode ver no dashboard (mesmas regras de
 * CAIXA_ROLES/VAGOES_ROLES de src/app/(protected)/page.tsx).
 */
export async function montarContextoCopiloto(role: Role): Promise<string> {
	const firestore = getFirebaseAdminFirestore();
	const agora = new Date();

	const [financeiro, comunicacao] = await Promise.all([
		CAIXA_ROLES.includes(role) ? montarKpisEPendenciasFinanceiro(firestore, agora) : null,
		VAGOES_ROLES.includes(role) ? montarKpisEPendenciasComunicacao(firestore, agora) : null,
	]);

	const partes: string[] = [];

	if (comunicacao !== null) {
		partes.push(`KPIs de comunicação:\n${linhasKpi(comunicacao.kpis)}`);
		partes.push(`Pendências de comunicação:\n${linhasPendencia(comunicacao.pendencias)}`);
	}

	if (financeiro !== null) {
		partes.push(`KPIs financeiros:\n${linhasKpi(financeiro.kpis)}`);
		partes.push(`Pendências financeiras:\n${linhasPendencia(financeiro.pendencias)}`);
	}

	if (partes.length === 0) {
		return "Sem dados de dashboard disponíveis para o perfil de acesso desta pessoa.";
	}

	return partes.join("\n\n");
}
