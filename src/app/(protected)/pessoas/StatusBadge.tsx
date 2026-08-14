import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<string, string> = {
	lead: "Lead",
	matriculado: "Matriculado",
	ex_aluno: "Ex-aluno",
	ativo: "Ativo",
	banco_talentos: "Banco de talentos",
};

/**
 * Cores indicativas de status (regra 18 do design.md): verde=ativo/matriculado (estado positivo
 * em curso), amarelo=lead/banco_talentos (aguardando — o par "pendente" de aluno e professor,
 * ainda não vinculado a uma matrícula/turma ativa), azul=ex_aluno (encerrado sem ter sido uma
 * falha — mesma semântica de "encerrada" na Matrícula, não é "pendente" nem "erro").
 */
const STATUS_CORES: Record<string, string> = {
	matriculado: "bg-emerald-100 text-emerald-800",
	ativo: "bg-emerald-100 text-emerald-800",
	lead: "bg-amber-100 text-amber-800",
	banco_talentos: "bg-amber-100 text-amber-800",
	ex_aluno: "bg-blue-100 text-blue-800",
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
