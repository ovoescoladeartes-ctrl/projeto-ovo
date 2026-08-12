import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
	ativo: "Ativo",
	banco_talentos: "Banco de talentos",
};

/**
 * Cores provisórias (seção 10 da spec de redesign de Cadastro) — só "Matriculado = verde" está
 * validado com o Rogério; o resto é proposta, fácil de trocar depois sem tocar em outro lugar.
 */
const STATUS_CORES: Record<string, string> = {
	matriculado: "bg-emerald-100 text-emerald-800",
	ativo: "bg-emerald-100 text-emerald-800",
	lead: "bg-amber-100 text-amber-800",
	banco_talentos: "bg-secondary text-secondary-foreground",
};

interface StatusBadgeProps {
	status: string;
	prefixo?: string;
}

export function StatusBadge({ status, prefixo }: StatusBadgeProps): React.ReactElement {
	return (
		<span
			className={cn(
				"inline-block rounded-full px-2 py-0.5 text-xs font-medium",
				STATUS_CORES[status] ?? "bg-secondary text-secondary-foreground",
			)}
		>
			{prefixo}
			{STATUS_LABELS[status] ?? status}
		</span>
	);
}
