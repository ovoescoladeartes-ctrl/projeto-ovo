"use client";

import { useState } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface AlunoMatriculado {
	matriculaId: string;
	pessoaId: string;
	pessoaNome: string;
	dataMatricula: string | null;
}

interface TurmaMatriculasSheetProps {
	turmaNome: string;
	alunos: AlunoMatriculado[];
}

function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Somente leitura — criar/encerrar matrícula continua exclusivo da tela da Pessoa. */
export function TurmaMatriculasSheet({ turmaNome, alunos }: TurmaMatriculasSheetProps): React.ReactElement {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<DropdownMenuItem onSelect={(event) => event.preventDefault()}>Ver alunos ({alunos.length})</DropdownMenuItem>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Alunos matriculados — {turmaNome}</SheetTitle>
				</SheetHeader>
				<div className="mt-4 space-y-2">
					{alunos.map((aluno) => (
						<div key={aluno.matriculaId} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
							<a href={`/pessoas/${aluno.pessoaId}`} className="text-foreground hover:underline">
								{aluno.pessoaNome}
							</a>
							<span className="text-xs text-muted-foreground">desde {formatarData(aluno.dataMatricula)}</span>
						</div>
					))}
					{alunos.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">Nenhum aluno matriculado.</p>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}
