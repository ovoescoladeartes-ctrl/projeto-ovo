import "server-only";

import type { Estagio } from "@/core/comunicacao/contatos/schema";
import { contatoEhPendente, diasDesde } from "@/core/comunicacao/pendencias";
import type { ChecklistDiaLido } from "@/core/db/checklistComunicacao";
import type { ContatoResumo } from "@/core/db/contatos";

import { TIME_BLOCK_DEFINICOES, type ChecklistBloco, type ChecklistComunicacaoDia, type ChecklistContatoItem, type ChecklistManualItem } from "./schema";

/** Quantos dias anteriores checar em busca de item incompleto herdado — mesma ordem de grandeza de `SEMANAS_HISTORICO` do Ritual financeiro (8), adaptada de semanas pra dias porque aqui o ritmo é diário/3x-ao-dia, não semanal. */
const DIAS_HISTORICO = 8;

interface ContatoPendenteResumo {
	id: string;
	nome: string;
	canal: string;
	estagio: Estagio;
	estagioAtualizadoEm: string | null;
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

/** As `DIAS_HISTORICO` chaves de dia anteriores a `dia`, na ordem em que `buscarChecklistComunicacaoDoDia` espera — quem chama usa isso pra saber quais dias ler via `lerChecklistDia` antes de montar o checklist. */
export function diasAnterioresParaHistorico(dia: string): string[] {
	return Array.from({ length: DIAS_HISTORICO }, (_, indice) => chaveDiaComOffset(dia, -(indice + 1)));
}

/**
 * Filtra em memória os contatos pendentes a partir dos contatos ativos já lidos por
 * `src/core/db/contatos.ts` (`lerContatosAtivos`) — não faz query própria, pra não duplicar a
 * mesma leitura que `montarKpisEPendenciasComunicacao` já faz no mesmo render da Home. Também usada
 * por quem chama pra saber quais ids materializar (ver `materializar.ts`).
 */
export function listarContatosPendentes(contatosAtivos: readonly ContatoResumo[], agora: Date): ContatoPendenteResumo[] {
	return contatosAtivos
		.map((contato) => ({
			id: contato.id,
			nome: contato.nome,
			canal: contato.canal,
			estagio: contato.estagio as Estagio,
			estagioAtualizadoEm: contato.estagioAtualizadoEm,
		}))
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

function montarItem(contato: ContatoPendenteResumo, estado: { concluido: boolean; concluidoEm: string | null; concluidoPor: string | null } | undefined, agora: Date): ChecklistContatoItem {
	return {
		contatoId: contato.id,
		nome: removerMarcacaoHtml(contato.nome),
		canal: contato.canal,
		diasAguardando: diasDesde(contato.estagioAtualizadoEm, agora),
		concluido: estado?.concluido ?? false,
		concluidoEm: estado?.concluidoEm ?? null,
		concluidoPor: estado?.concluidoPor ?? null,
	};
}

/**
 * Checklist do Dia (Comunicação) — "hoje" sempre corresponde a `dia === chaveDia(agora)`; não há
 * navegação pra dias passados na v1 (diferente do Ritual financeiro, que tem itens fixos e por
 * isso consegue reconstruir qualquer semana; aqui o conjunto de itens é derivado ao vivo dos
 * contatos pendentes, então só "hoje" tem sentido de ser consultado).
 *
 * Função pura (Fase 2.3 do plano de redução de leituras) — recebe `docHoje` e os
 * `diasAnteriores` (na ordem de `diasAnterioresParaHistorico`) já lidos via `lerChecklistDia`, não
 * toca o Firestore. A materialização (escrita) saiu daqui — ver `materializar.ts` e o `after()` em
 * quem chama (`page.tsx`).
 */
export function buscarChecklistComunicacaoDoDia(
	contatosAtivos: readonly ContatoResumo[],
	dia: string,
	agora: Date,
	docHoje: ChecklistDiaLido,
	diasAnteriores: readonly ChecklistDiaLido[],
): ChecklistComunicacaoDia {
	const pendentes = listarContatosPendentes(contatosAtivos, agora);

	const idsIncompletosAnteriores = new Set<string>();
	diasAnteriores.forEach((diaLido) => {
		Object.entries(diaLido.contatos).forEach(([id, estado]) => {
			if (!estado.concluido) {
				idsIncompletosAnteriores.add(id);
			}
		});
	});

	const contatosHoje = docHoje.contatos;
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

	const manuais: ChecklistManualItem[] = Object.entries(docHoje.manuais).map(([id, item]) => ({
		id,
		titulo: item.titulo,
		concluido: item.concluido,
		concluidoEm: item.concluidoEm,
		concluidoPor: item.concluidoPor,
	}));

	return { dia, blocos, itensPendentesHoje, pendenciasAnteriores, manuais };
}
