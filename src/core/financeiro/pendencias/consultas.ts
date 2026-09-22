import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";
import { destinoRepasseLabel, formatarDataCurta } from "@/core/financeiro/shared";
import { listarRepassesAVencer } from "@/core/financeiro/saldo";
import type { Pessoa } from "@/core/pessoas/schema";
import { formatCentavos } from "@/lib/currency";

import type { PendenciaAcionavel, PendenciaManual } from "./schema";

const REPASSES_JANELA_DIAS = 7;

export interface DadosPendenciasAcionaveis {
	repasses: readonly Repasse[];
	recebimentos: readonly Recebimento[];
	pessoas: readonly Pessoa[];
	pendenciasManuais: readonly PendenciaManual[];
}

/**
 * Monta a lista completa de "Pendências Acionáveis" (Figma: frame "Checklist — Pendências"):
 * repasses a vencer/vencidos, recebimentos via Pix ainda pendentes de confirmação, e pendências
 * manuais abertas. "Falha de cobrança" do Figma não tem hoje um status equivalente em
 * `RecebimentoStatus` (só confirmado/pendente/cancelado) — por ora esse tipo só entra via
 * pendência manual, até existir um sinal real de falha de cobrança nos dados.
 *
 * Pura — recebe os arrays já lidos por `src/core/db/` (`lerRepasses`, `lerRecebimentos`,
 * `lerPessoas`, `lerPendenciasManuaisAbertas`), não acessa o Firestore diretamente.
 */
export function montarPendenciasAcionaveis(dados: DadosPendenciasAcionaveis, agora: Date): PendenciaAcionavel[] {
	const pessoasNomes: Record<string, string> = {};
	dados.pessoas.forEach((pessoa) => {
		pessoasNomes[pessoa.id] = pessoa.nome;
	});

	const repassesAtivos = dados.repasses.filter((repasse) => repasse.ativo);
	const repassesAVencer = listarRepassesAVencer(repassesAtivos, REPASSES_JANELA_DIAS, agora);

	const itensRepasse: PendenciaAcionavel[] = repassesAVencer.map((repasse) => {
		const destino = destinoRepasseLabel(repasse, pessoasNomes);
		const vencimentoLabel = repasse.vencimento !== null ? `vencimento ${formatarDataCurta(new Date(repasse.vencimento))}` : "sem data de vencimento";
		return {
			id: `repasse-${repasse.id}`,
			titulo: "Repasse a vencer",
			meta: `${destino} · ${vencimentoLabel}`,
			origem: repasse.origem,
			tipo: "repasse",
			pendenciaManualId: null,
		};
	});

	const itensPix: PendenciaAcionavel[] = dados.recebimentos
		.filter((recebimento) => recebimento.ativo && recebimento.status === "pendente" && recebimento.formaPagamento === "pix")
		.map((recebimento) => ({
			id: `recebimento-${recebimento.id}`,
			titulo: "Pix pendente",
			meta: `${pessoasNomes[recebimento.pessoaId] ?? "Pessoa"} · ${formatCentavos(recebimento.valorCentavos)} aguardando confirmação`,
			origem: recebimento.origem,
			tipo: "recebimento",
			pendenciaManualId: null,
		}));

	const itensManuais: PendenciaAcionavel[] = dados.pendenciasManuais.map((pendencia) => ({
		id: `manual-${pendencia.id}`,
		titulo: pendencia.titulo,
		meta: pendencia.meta,
		origem: "manual",
		tipo: "manual",
		pendenciaManualId: pendencia.id,
	}));

	return [...itensRepasse, ...itensPix, ...itensManuais];
}
