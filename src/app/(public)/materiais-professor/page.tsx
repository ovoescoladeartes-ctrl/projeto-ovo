import { MateriaisProfessorForm } from "./MateriaisProfessorForm";

import { lerTurmas } from "@/core/db/turmas";

/**
 * Formulário público (sem login) pra professor reportar material em falta — vira um item pendente
 * do checklist de Materiais, agrupado por turma no dashboard (`docs/spec-checklist-materiais.md`).
 *
 * Só expõe `{id, nome}` das turmas ativas ao cliente — nunca o objeto `Turma` inteiro (que carrega
 * `mensalidadeCentavos`/`educadorPessoaId`/etc., dado que não tem por que chegar em quem não está
 * autenticado).
 */
export default async function MateriaisProfessorPage(): Promise<React.ReactElement> {
	const turmas = await lerTurmas();
	const turmasAtivas = turmas
		.filter((turma) => turma.ativo)
		.map((turma) => ({ id: turma.id, nome: turma.nome }))
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
			<div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
				<h1 className="text-lg font-semibold text-foreground sm:text-xl">Material em falta</h1>
				<p className="mt-1 mb-6 text-sm text-muted-foreground">
					Avise a equipe sobre um material em falta pra sua turma — sem precisar entrar no sistema.
				</p>
				<MateriaisProfessorForm turmasAtivas={turmasAtivas} />
			</div>
		</main>
	);
}
