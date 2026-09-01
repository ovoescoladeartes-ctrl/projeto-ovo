import type { Turma } from "@/core/turmas/schema";
import { formatCentavos } from "@/lib/currency";

/** Compartilhado por `page.tsx` (tabela) e `TurmaCard.tsx` (mobile) — não duplicar. */
export function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarRepasse(turma: Turma): string {
	return turma.repasseTipo === "percentual" ? `${turma.repasseValor}%` : formatCentavos(turma.repasseValor);
}

export const TIPO_LABELS: Record<string, string> = { curso: "Curso", oficina: "Oficina" };
