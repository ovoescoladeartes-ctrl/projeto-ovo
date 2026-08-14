"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { StatusBadge } from "../StatusBadge";
import { confirmarImportacaoCsv, previewImportacaoCsv, type LinhaPreview } from "./actions";

export function ImportarForm(): React.ReactElement {
	const [arquivo, setArquivo] = useState<File | null>(null);
	const [csvTexto, setCsvTexto] = useState<string | null>(null);
	const [linhas, setLinhas] = useState<LinhaPreview[] | null>(null);
	const [totalValidas, setTotalValidas] = useState(0);
	const [resultadoImportacao, setResultadoImportacao] = useState<string | null>(null);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleArquivoChange(event: React.ChangeEvent<HTMLInputElement>): void {
		const selecionado = event.target.files?.[0] ?? null;
		setArquivo(selecionado);
		setCsvTexto(null);
		setLinhas(null);
		setResultadoImportacao(null);
		setErro(null);
	}

	function handleAnalisar(): void {
		if (arquivo === null) {
			return;
		}
		setErro(null);
		setResultadoImportacao(null);
		startTransition(async () => {
			const texto = await arquivo.text();
			const result = await previewImportacaoCsv(texto);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível analisar o arquivo.");
				return;
			}
			setCsvTexto(texto);
			setLinhas(result.linhas ?? []);
			setTotalValidas(result.totalValidas ?? 0);
		});
	}

	function handleConfirmar(): void {
		if (csvTexto === null) {
			return;
		}
		setErro(null);
		startTransition(async () => {
			const result = await confirmarImportacaoCsv(csvTexto);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível importar.");
				return;
			}
			setResultadoImportacao(`${result.importadas ?? 0} pessoas importadas com sucesso.`);
			setLinhas(null);
			setCsvTexto(null);
			setArquivo(null);
		});
	}

	return (
		<div className="max-w-3xl space-y-6">
			<div className="rounded-lg border border-border bg-card p-4">
				<p className="mb-3 text-sm text-muted-foreground">
					Arquivo CSV com colunas <code className="rounded bg-muted px-1">nome</code> (obrigatório),{" "}
					<code className="rounded bg-muted px-1">tipo</code> (aluno, professor ou A&P para papel duplo),{" "}
					<code className="rounded bg-muted px-1">status</code> (lead/matriculado para aluno,
					ativo/banco_talentos para professor — opcional),{" "}
					<code className="rounded bg-muted px-1">turma</code> (nome exato de uma ou mais turmas já
					cadastradas, separadas por vírgula, só para aluno),{" "}
					<code className="rounded bg-muted px-1">especialidade</code> (só para professor),{" "}
					<code className="rounded bg-muted px-1">email</code> e{" "}
					<code className="rounded bg-muted px-1">telefone</code> — os quatro últimos são opcionais e
					independentes entre si.
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<input
						type="file"
						accept=".csv,text/csv"
						onChange={handleArquivoChange}
						disabled={isPending}
						className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
					/>
					<Button type="button" onClick={handleAnalisar} disabled={isPending || arquivo === null}>
						{isPending ? "Analisando..." : "Analisar"}
					</Button>
				</div>
				{erro !== null ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
				{resultadoImportacao !== null ? (
					<p className="mt-2 text-xs text-muted-foreground">{resultadoImportacao}</p>
				) : null}
			</div>

			{linhas !== null ? (
				<div>
					<div className="mb-3 flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							Prévia — {totalValidas} de {linhas.length} linhas prontas para importar. Nada foi gravado ainda.
						</p>
						<Button type="button" onClick={handleConfirmar} disabled={isPending || totalValidas === 0}>
							{isPending ? "Importando..." : "Confirmar importação"}
						</Button>
					</div>

					<div className="overflow-x-auto rounded-lg border border-border bg-card">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th className="px-4 py-3 font-medium">Linha</th>
									<th className="px-4 py-3 font-medium">Nome</th>
									<th className="px-4 py-3 font-medium">Tipo</th>
									<th className="px-4 py-3 font-medium">Turma</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 font-medium">Situação</th>
								</tr>
							</thead>
							<tbody>
								{linhas.map((linha) => (
									<tr key={linha.linha} className="border-b border-border last:border-0">
										<td className="px-4 py-3 text-muted-foreground">{linha.linha}</td>
										<td className="px-4 py-3 text-foreground">{linha.nome}</td>
										<td className="px-4 py-3 text-muted-foreground">{linha.tipo}</td>
										<td className="px-4 py-3 text-muted-foreground">{linha.turma || "—"}</td>
										<td className="px-4 py-3">
											{linha.status !== "" ? <StatusBadge status={linha.status} /> : <span className="text-muted-foreground">—</span>}
										</td>
										<td className="px-4 py-3">
											{linha.erro !== null ? (
												<span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
													{linha.erro}
												</span>
											) : linha.duplicataProvavel ? (
												<span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
													Possível duplicata
												</span>
											) : (
												<span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
													Pronta
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			) : null}
		</div>
	);
}
