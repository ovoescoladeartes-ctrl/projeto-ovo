import { Archive } from "lucide-react";
import Link from "next/link";

import type { ChecklistArea } from "@/core/checklist/schema";

interface LinkVerArquivadasProps {
	area: ChecklistArea;
	mostrarArquivados: boolean;
	quantidade: number;
}

/**
 * Substitui a aba "Arquivadas" (item 2 da 8ª rodada de feedback) — duas fileiras de aba com o
 * mesmo estilo visual (área + ativos/arquivados) sugeriam hierarquia entre duas escolhas
 * independentes. Vira um link discreto, só visível quando existe pelo menos 1 checklist arquivado
 * — nada a mostrar, nada a esconder atrás de um clique vazio. O estado por trás continua o mesmo
 * searchParam `arquivados` de sempre, só a UI do gatilho muda de aba pra link.
 */
export function LinkVerArquivadas({ area, mostrarArquivados, quantidade }: LinkVerArquivadasProps): React.ReactElement | null {
	if (!mostrarArquivados && quantidade === 0) {
		return null;
	}

	const href = mostrarArquivados ? `/checklists?aba=${area}` : `/checklists?aba=${area}&arquivados=1`;

	return (
		<Link href={href} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
			<Archive className="h-4 w-4" />
			{mostrarArquivados ? "Ver ativas" : `Ver arquivadas (${quantidade})`}
		</Link>
	);
}
