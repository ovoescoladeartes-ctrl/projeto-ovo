import { z } from "zod";

import type { Origem } from "@/core/financeiro/shared";

export const PENDENCIA_MANUAL_STATUS = ["aberta", "resolvida"] as const;
export type PendenciaManualStatus = (typeof PENDENCIA_MANUAL_STATUS)[number];

export const criarPendenciaManualSchema = z.object({
	titulo: z.string().min(1, "Título é obrigatório."),
	meta: z.string().min(1, "Descrição é obrigatória."),
});

export type CriarPendenciaManualInput = z.infer<typeof criarPendenciaManualSchema>;

export const resolverPendenciaManualSchema = z.object({
	id: z.string().min(1, "Pendência inválida."),
});

export type ResolverPendenciaManualInput = z.infer<typeof resolverPendenciaManualSchema>;

/** Pendência lançada manualmente (ex.: "Nota fiscal faltando" no Figma) — sem contraparte automática hoje em Recebimento/Repasse. */
export interface PendenciaManual {
	id: string;
	titulo: string;
	meta: string;
	status: PendenciaManualStatus;
	criadoEm: string | null;
	resolvidoEm: string | null;
}

/**
 * Pendência acionável pronta pra tela (Figma: frame "Checklist — Pendências") — `origem` é a
 * mesma taxonomia de `Origem` já usada em Recebimento/Repasse, exibida como "Origem: dado do Wix"
 * / "Origem: lançamento manual".
 */
export interface PendenciaAcionavel {
	id: string;
	titulo: string;
	meta: string;
	origem: Origem;
}
