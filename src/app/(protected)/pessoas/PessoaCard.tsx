"use client";

import { MoreVertical } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { formatarData, MAX_TURMAS_VISIVEIS, type PessoaListagemRow } from "./PessoasListagem";
import { PessoaArquivarMenuItem } from "./PessoaArquivarMenuItem";
import { PessoaDesarquivarMenuItem } from "./PessoaDesarquivarMenuItem";
import { StatusBadge } from "./StatusBadge";

interface PessoaCardProps {
	pessoa: PessoaListagemRow;
	selecionado: boolean;
	onToggleSelecionado: (marcado: boolean) => void;
}

/**
 * Equivalente em card de uma linha da tabela de `PessoasListagem`, mostrado abaixo de `md` no
 * lugar da tabela (regra do design.md sobre listagem virar cards no mobile — tabela com 6+
 * colunas forçava scroll horizontal). Mesmos dados/ações da linha, só a apresentação muda.
 */
export function PessoaCard({ pessoa, selecionado, onToggleSelecionado }: PessoaCardProps): React.ReactElement {
	const tipo = [pessoa.ehAluno ? "Aluno" : null, pessoa.ehProfessor ? "Professor" : null].filter(Boolean).join(", ");
	const turmasVisiveis = pessoa.turmas.slice(0, MAX_TURMAS_VISIVEIS).join(", ");
	const restante = pessoa.turmas.length - MAX_TURMAS_VISIVEIS;
	const turmasTexto = pessoa.turmas.length === 0 ? "—" : `${turmasVisiveis}${restante > 0 ? ` +${restante}` : ""}`;

	return (
		<div className="flex gap-3 rounded-xl border border-border bg-card p-4">
			<Checkbox
				checked={selecionado}
				onCheckedChange={(checked) => onToggleSelecionado(checked === true)}
				aria-label={`Selecionar ${pessoa.nome}`}
				className="mt-1"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<Link href={`/pessoas/${pessoa.id}`} className="tap-target-44 truncate font-medium text-foreground hover:underline">
						{pessoa.nome}
					</Link>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="ghost" size="icon" className="shrink-0" title="Mais ações" aria-label="Mais ações">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{pessoa.ativo ? (
								<PessoaArquivarMenuItem id={pessoa.id} nome={pessoa.nome} />
							) : (
								<PessoaDesarquivarMenuItem id={pessoa.id} nome={pessoa.nome} />
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{tipo !== "" ? <p className="text-sm text-muted-foreground">{tipo}</p> : null}

				<div className="mt-2 flex flex-wrap gap-1">
					{pessoa.ehAluno && pessoa.statusAluno !== null ? (
						<StatusBadge status={pessoa.statusAluno} prefixo={pessoa.ehProfessor ? "Aluno: " : undefined} />
					) : null}
					{pessoa.ehProfessor && pessoa.statusProfessor !== null ? (
						<StatusBadge status={pessoa.statusProfessor} prefixo={pessoa.ehAluno ? "Professor: " : undefined} />
					) : null}
				</div>

				<div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
					<span className="truncate" title={pessoa.turmas.join(", ")}>
						{turmasTexto}
					</span>
					<span className="shrink-0">{formatarData(pessoa.criadoEm)}</span>
				</div>
			</div>
		</div>
	);
}
