"use client";

import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PessoaBusca } from "@/core/pessoas/actions";
import type { Turma } from "@/core/turmas/schema";
import { formatCentavos } from "@/lib/currency";

import { formatarData, formatarRepasse, TIPO_LABELS } from "./turmasFormat";
import { TurmaEditDialog } from "./TurmaEditDialog";
import { TurmaExcluirMenuItem } from "./TurmaExcluirMenuItem";
import { TurmaMatriculasSheet } from "./TurmaMatriculasSheet";

interface AlunoMatriculado {
	matriculaId: string;
	pessoaId: string;
	pessoaNome: string;
	dataMatricula: string | null;
}

interface TurmaCardProps {
	turma: Turma;
	alunos: AlunoMatriculado[];
	educadorInicial: PessoaBusca | null;
	podeExcluir: boolean;
}

/**
 * Equivalente em card de uma linha da tabela de `page.tsx`, mostrado abaixo de `md` no lugar da
 * tabela — mesmo padrão de `PessoaCard.tsx` (regra 36 do design.md: listagem com tabela vira
 * cards no mobile, mesmos dados/ações, só a apresentação muda). Sem link de detalhe (Turma não
 * tem página própria): editar é sempre via `TurmaEditDialog`, por isso o botão fica junto do
 * kebab no topo do card, espelhando a célula de ações da tabela.
 */
export function TurmaCard({ turma, alunos, educadorInicial, podeExcluir }: TurmaCardProps): React.ReactElement {
	const tipoLabel = turma.tipo !== null ? (TIPO_LABELS[turma.tipo] ?? turma.tipo) : null;

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate font-medium text-foreground">{turma.nome}</p>
					{tipoLabel !== null ? <p className="text-sm text-muted-foreground">{tipoLabel}</p> : null}
				</div>
				<div className="flex shrink-0 gap-1">
					<TurmaEditDialog turma={turma} educadorInicial={educadorInicial} matriculasAtivasCount={alunos.length} />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="ghost" size="icon" title="Mais ações" aria-label="Mais ações">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<TurmaMatriculasSheet turmaNome={turma.nome} alunos={alunos} />
							{podeExcluir ? <TurmaExcluirMenuItem id={turma.id} nome={turma.nome} /> : null}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				<div>
					<p className="text-xs text-muted-foreground">Assunto</p>
					<p className="text-foreground">{turma.assunto || "—"}</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Mensalidade</p>
					<p className="text-foreground">{formatCentavos(turma.mensalidadeCentavos)}</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Repasse</p>
					<p className="text-foreground">{formatarRepasse(turma)}</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Vagas</p>
					<p className="text-foreground">
						{alunos.length}
						{turma.capacidadeMaxima !== null ? ` / ${turma.capacidadeMaxima}` : ""}
					</p>
				</div>
				<div className="col-span-2">
					<p className="text-xs text-muted-foreground">Período</p>
					<p className="text-foreground">
						{formatarData(turma.dataInicio)} – {formatarData(turma.dataFim)}
					</p>
				</div>
			</div>
		</div>
	);
}
