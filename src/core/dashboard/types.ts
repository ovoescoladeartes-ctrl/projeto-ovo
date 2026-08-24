export interface KpiCardData {
	label: string;
	value: string;
	subtitle: string;
}

/**
 * Chave semântica do ícone de cada pendência — o mapeamento pra um ícone real
 * (lucide-react) fica no componente de apresentação, não aqui.
 */
export type PendenciaIcon = "erro" | "aviso" | "info" | "prazo" | "documento" | "calendario";

export interface PendenciaItem {
	id: string;
	icon: PendenciaIcon;
	titulo: string;
	meta: string;
}

/**
 * "estagio" = um dos 5 estágios reais do board de Vagões (mini-prd.md).
 * "arquivado-motivo" = um motivo de arquivamento ("Ex-aluno", "Não convertido"
 * no Figma) — não é um estágio novo do funil, ver docs/design.md, seção de
 * perguntas em aberto, item 1.
 */
export interface FunnelStageCount {
	label: string;
	value: number;
	kind: "estagio" | "arquivado-motivo";
}
