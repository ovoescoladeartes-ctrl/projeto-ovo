"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RepasseTipo, Turma } from "@/core/turmas/schema";
import { parseCentavosInput } from "@/lib/currency";

import { atualizarTurma } from "./actions";

function centavosParaInput(centavos: number): string {
	return (centavos / 100).toFixed(2).replace(".", ",");
}

function dataIsoParaInput(iso: string | null): string {
	return iso ? iso.slice(0, 10) : "";
}

interface TurmaEditDialogProps {
	turma: Turma;
}

export function TurmaEditDialog({ turma }: TurmaEditDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [nome, setNome] = useState(turma.nome);
	const [mensalidade, setMensalidade] = useState(centavosParaInput(turma.mensalidadeCentavos));
	const [repasseTipo, setRepasseTipo] = useState<RepasseTipo>(turma.repasseTipo);
	const [repasseValor, setRepasseValor] = useState(
		turma.repasseTipo === "fixo" ? centavosParaInput(turma.repasseValor) : String(turma.repasseValor).replace(".", ","),
	);
	const [dataInicio, setDataInicio] = useState(dataIsoParaInput(turma.dataInicio));
	const [dataFim, setDataFim] = useState(dataIsoParaInput(turma.dataFim));
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);

		const mensalidadeCentavos = parseCentavosInput(mensalidade);
		if (mensalidadeCentavos === null) {
			setErro("Mensalidade inválida.");
			return;
		}

		let repasseValorFinal: number | null;
		if (repasseTipo === "percentual") {
			const numero = Number(repasseValor.replace(",", "."));
			repasseValorFinal = Number.isFinite(numero) ? numero : null;
		} else {
			repasseValorFinal = parseCentavosInput(repasseValor);
		}
		if (repasseValorFinal === null) {
			setErro("Valor de repasse inválido.");
			return;
		}

		startTransition(async () => {
			const result = await atualizarTurma({
				id: turma.id,
				nome,
				mensalidadeCentavos,
				repasseTipo,
				repasseValor: repasseValorFinal,
				dataInicio,
				dataFim: dataFim === "" ? null : dataFim,
				educadorPessoaId: turma.educadorPessoaId,
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					Editar
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Editar turma</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor={`turma-nome-${turma.id}`}>Nome</Label>
						<Input
							id={`turma-nome-${turma.id}`}
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-mensalidade-${turma.id}`}>Mensalidade (R$)</Label>
						<Input
							id={`turma-mensalidade-${turma.id}`}
							inputMode="decimal"
							value={mensalidade}
							onChange={(event) => setMensalidade(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor={`turma-repasse-tipo-${turma.id}`}>Tipo de repasse</Label>
							<select
								id={`turma-repasse-tipo-${turma.id}`}
								value={repasseTipo}
								onChange={(event) => {
									setRepasseTipo(event.target.value as RepasseTipo);
									setRepasseValor("");
								}}
								disabled={isPending}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
							>
								<option value="percentual">Percentual</option>
								<option value="fixo">Fixo</option>
							</select>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={`turma-repasse-valor-${turma.id}`}>
								{repasseTipo === "percentual" ? "Repasse (%)" : "Repasse (R$)"}
							</Label>
							<Input
								id={`turma-repasse-valor-${turma.id}`}
								inputMode="decimal"
								value={repasseValor}
								onChange={(event) => setRepasseValor(event.target.value)}
								disabled={isPending}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor={`turma-data-inicio-${turma.id}`}>Início</Label>
							<Input
								id={`turma-data-inicio-${turma.id}`}
								type="date"
								value={dataInicio}
								onChange={(event) => setDataInicio(event.target.value)}
								disabled={isPending}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`turma-data-fim-${turma.id}`}>Fim (opcional)</Label>
							<Input
								id={`turma-data-fim-${turma.id}`}
								type="date"
								value={dataFim}
								onChange={(event) => setDataFim(event.target.value)}
								disabled={isPending}
							/>
						</div>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleSalvar} disabled={isPending || nome.trim() === "" || dataInicio === ""}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
