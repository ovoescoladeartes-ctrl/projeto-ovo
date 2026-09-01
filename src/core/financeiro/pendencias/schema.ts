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

export type PendenciaAcionavelTipo = "repasse" | "recebimento" | "manual";

/**
 * Pendência acionável pronta pra tela (Figma: frame "Checklist — Pendências") — `origem` é a
 * mesma taxonomia de `Origem` já usada em Recebimento/Repasse (mantida como dado tipado; sem
 * rótulo "Origem: ..." na UI — ver regra 18 de docs/design.md, que já removeu um badge quase
 * idêntico de Turmas por baixo sinal).
 */
export interface PendenciaAcionavel {
	id: string;
	titulo: string;
	meta: string;
	origem: Origem;
	tipo: PendenciaAcionavelTipo;
	/** Preenchido só quando `tipo === "manual"` — id do doc em `pendenciasManuais`, usado por `resolverPendenciaManual`. Evita a UI ter que recuperar esse id fazendo parsing de `id` (mesmo cuidado de `RitualPendenciaHerdada.semana`). */
	pendenciaManualId: string | null;
}
