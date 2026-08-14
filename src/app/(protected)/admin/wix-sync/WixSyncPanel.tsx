"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { confirmarSincronizacaoWix, previewSincronizacaoWix, type ConfirmWixResult, type PreviewWixResult } from "./actions";

function Contagem({ label, criar, atualizar }: { label: string; criar: number; atualizar?: number }): React.ReactElement {
	return (
		<div className="min-w-0 rounded-lg border border-border bg-card p-4">
			<p className="break-words text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 break-words text-2xl font-bold text-foreground">{criar}</p>
			<p className="break-words text-xs text-muted-foreground">
				a criar{atualizar !== undefined ? ` · ${atualizar} a atualizar` : ""}
			</p>
		</div>
	);
}

export function WixSyncPanel(): React.ReactElement {
	const [preview, setPreview] = useState<PreviewWixResult | null>(null);
	const [resultado, setResultado] = useState<ConfirmWixResult | null>(null);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleBuscarPreview(): void {
		setErro(null);
		setResultado(null);
		startTransition(async () => {
			const result = await previewSincronizacaoWix();
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível buscar dados da Wix.");
				setPreview(null);
				return;
			}
			setPreview(result);
		});
	}

	function handleConfirmar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await confirmarSincronizacaoWix();
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível sincronizar.");
				return;
			}
			setResultado(result);
			setPreview(null);
		});
	}

	return (
		<div className="max-w-3xl space-y-6">
			<div className="rounded-lg border border-border bg-card p-4">
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" onClick={handleBuscarPreview} disabled={isPending}>
						{isPending ? "Buscando..." : "Buscar prévia"}
					</Button>
				</div>
				{erro !== null ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
				{resultado !== null ? (
					<div className="mt-3 text-sm text-muted-foreground">
						<p className="font-medium text-foreground">Sincronização concluída.</p>
						<p>
							Pessoas: {resultado.pessoasCriadas} criadas, {resultado.pessoasAtualizadas} atualizadas.
						</p>
						<p>
							Turmas: {resultado.turmasCriadas} criadas, {resultado.turmasAtualizadas} atualizadas.
						</p>
						<p>Recebimentos: {resultado.recebimentosCriados} criados.</p>
						<p>Matrículas: {resultado.matriculasCriadas} criadas.</p>
					</div>
				) : null}
			</div>

			{preview !== null ? (
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<Contagem label="Pessoas" criar={preview.pessoas?.criar ?? 0} atualizar={preview.pessoas?.atualizar ?? 0} />
						<Contagem label="Turmas" criar={preview.turmas?.criar ?? 0} atualizar={preview.turmas?.atualizar ?? 0} />
						<Contagem label="Recebimentos" criar={preview.recebimentos?.criar ?? 0} />
						<Contagem label="Matrículas" criar={preview.matriculas?.criar ?? 0} />
					</div>

					{(preview.recebimentos?.avisos ?? 0) > 0 ? (
						<p className="text-xs text-amber-600">
							{preview.recebimentos?.avisos} recebimento(s) serão gravados sem turma vinculada (produto não
							identificado no catálogo).
						</p>
					) : null}

					{preview.recebimentos !== undefined && preview.recebimentos.pulados.length > 0 ? (
						<div className="rounded-lg border border-border bg-card p-4">
							<p className="mb-2 text-sm font-medium text-foreground">Recebimentos que serão pulados</p>
							<ul className="space-y-1 text-xs text-muted-foreground">
								{preview.recebimentos.pulados.map((pulado) => (
									<li key={pulado.motivo}>
										{pulado.quantidade}× — {pulado.motivo}
									</li>
								))}
							</ul>
						</div>
					) : null}

					<p className="text-sm text-muted-foreground">Nada foi gravado ainda. Confira os números acima antes de confirmar.</p>

					<Button type="button" onClick={handleConfirmar} disabled={isPending}>
						{isPending ? "Sincronizando..." : "Confirmar sincronização"}
					</Button>
				</div>
			) : null}
		</div>
	);
}
