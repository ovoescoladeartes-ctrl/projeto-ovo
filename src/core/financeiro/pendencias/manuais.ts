export const PENDENCIA_MANUAL_IDS = ["nota-fiscal-2025-07"] as const;

export type PendenciaManualId = (typeof PENDENCIA_MANUAL_IDS)[number];

export interface PendenciaManualDefinicao {
	id: PendenciaManualId;
	titulo: string;
	meta: string;
}

/**
 * Lista fixa em código (v1) — não existe modelo de nota fiscal no domínio nem UI de criação;
 * "resolver" aqui só liga uma flag de reconhecimento manual, não integra com nenhuma máquina de
 * status real (recebimento/repasse). Adicionar uma nova pendência manual exige mudança de código.
 */
export const PENDENCIAS_MANUAIS_FIXAS: readonly PendenciaManualDefinicao[] = [
	{ id: "nota-fiscal-2025-07", titulo: "Nota fiscal faltando", meta: "competência Jul/2025" },
];
