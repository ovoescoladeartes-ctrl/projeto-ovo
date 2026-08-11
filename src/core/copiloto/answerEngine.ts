import {
	mockKpisComunicacao,
	mockKpisFinanceiro,
	mockPendenciasComunicacao,
} from "@/core/dashboard/mockData";

import { mockAlunosPendentes } from "./mockAlunosPendentes";
import type { CopilotoCta } from "./types";

interface CopilotoResposta {
	texto: string;
	cta?: CopilotoCta;
}

function normalizar(texto: string): string {
	return texto
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "");
}

function respostaPagamentosPendentes(): CopilotoResposta {
	const nomes = mockAlunosPendentes
		.map((aluno) => `${aluno.nome} (${aluno.motivo})`)
		.join(", ");

	return {
		texto: `Encontrei ${mockAlunosPendentes.length} alunos com pagamento pendente: ${nomes}.`,
		cta: { label: "Ver", href: "/caixa" },
	};
}

function respostaLeadsSemResposta(): CopilotoResposta {
	const nomes = mockPendenciasComunicacao.map((item) => item.meta.split(" · ")[0]).join(", ");

	return {
		texto: `Tem ${mockPendenciasComunicacao.length} pendências de comunicação em aberto: ${nomes}.`,
		cta: { label: "Ver", href: "/vagoes" },
	};
}

function respostaAlunosAtivos(): CopilotoResposta {
	const kpi = mockKpisComunicacao.find((item) => item.label === "Alunos ativos");

	return {
		texto: `A escola tem ${kpi?.value ?? "?"} alunos ativos no momento${kpi?.subtitle ? ` (${kpi.subtitle})` : ""}.`,
		cta: { label: "Ver", href: "/pessoas" },
	};
}

function respostaResumoDoDia(): CopilotoResposta {
	const recebido = mockKpisFinanceiro.find((item) => item.label === "Recebido no mês");
	const alunos = mockKpisComunicacao.find((item) => item.label === "Alunos ativos");
	const leads = mockKpisComunicacao.find((item) => item.label === "Leads da semana");

	return {
		texto: `Hoje: ${alunos?.value ?? "?"} alunos ativos, ${leads?.value ?? "?"} leads na semana e ${recebido?.value ?? "?"} recebidos no mês (${recebido?.subtitle ?? ""}).`,
	};
}

function respostaFallback(): CopilotoResposta {
	return {
		texto: "Ainda não sei responder isso — essa é uma pergunta pra guardar pro Copiloto de verdade (v5).",
	};
}

/**
 * Motor de resposta 100% mockado: casa a pergunta contra alguns padrões de
 * palavra-chave e monta a resposta a partir dos dados mocados do dashboard,
 * simulando uma consulta à base. Sem IA nenhuma por trás.
 */
export function gerarResposta(pergunta: string): CopilotoResposta {
	const texto = normalizar(pergunta);

	if (/pag|inadimpl|atras|cobranc/.test(texto)) {
		return respostaPagamentosPendentes();
	}

	if (/lead|sem resposta|esfriando|follow.?up/.test(texto)) {
		return respostaLeadsSemResposta();
	}

	if (/quantos alunos|alunos ativos|numero de alunos/.test(texto)) {
		return respostaAlunosAtivos();
	}

	if (/resumo|como esta|como anda|hoje|no dia/.test(texto)) {
		return respostaResumoDoDia();
	}

	return respostaFallback();
}
