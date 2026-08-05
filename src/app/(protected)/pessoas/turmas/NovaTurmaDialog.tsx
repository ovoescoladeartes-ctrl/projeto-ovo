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
import type { RepasseTipo } from "@/core/turmas/schema";
import { parseCentavosInput } from "@/lib/currency";

import { criarTurma } from "./actions";

const ESTADO_INICIAL = {
	nome: "",
	mensalidade: "",
	repasseTipo: "percentual" as RepasseTipo,
	repasseValor: "",
	dataInicio: "",
	dataFim: "",
};

export function NovaTurmaDialog(): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(ESTADO_INICIAL);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);

		const mensalidadeCentavos = parseCentavosInput(form.mensalidade);
		if (mensalidadeCentavos === null) {
			setErro("Mensalidade inválida.");
			return;
		}

		let repasseValor: number | null;
		if (form.repasseTipo === "percentual") {
			const numero = Number(form.repasseValor.replace(",", "."));
			repasseValor = Number.isFinite(numero) ? numero : null;
		} else {
			repasseValor = parseCentavosInput(form.repasseValor);
		}
		if (repasseValor === null) {
			setErro("Valor de repasse inválido.");
			return;
		}

		startTransition(async () => {
			const result = await criarTurma({
				nome: form.nome,
				mensalidadeCentavos,
				repasseTipo: form.repasseTipo,
				repasseValor,
				dataInicio: form.dataInicio,
				dataFim: form.dataFim === "" ? null : form.dataFim,
				educadorPessoaId: null,
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setForm(ESTADO_INICIAL);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button">Nova turma</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nova turma</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="turma-nome">Nome</Label>
						<Input
							id="turma-nome"
							value={form.nome}
							onChange={(event) => setForm({ ...form, nome: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="turma-mensalidade">Mensalidade (R$)</Label>
						<Input
							id="turma-mensalidade"
							inputMode="decimal"
							placeholder="150,00"
							value={form.mensalidade}
							onChange={(event) => setForm({ ...form, mensalidade: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="turma-repasse-tipo">Tipo de repasse</Label>
							<select
								id="turma-repasse-tipo"
								value={form.repasseTipo}
								onChange={(event) =>
									setForm({ ...form, repasseTipo: event.target.value as RepasseTipo, repasseValor: "" })
								}
								disabled={isPending}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
							>
								<option value="percentual">Percentual</option>
								<option value="fixo">Fixo</option>
							</select>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="turma-repasse-valor">
								{form.repasseTipo === "percentual" ? "Repasse (%)" : "Repasse (R$)"}
							</Label>
							<Input
								id="turma-repasse-valor"
								inputMode="decimal"
								placeholder={form.repasseTipo === "percentual" ? "30" : "45,00"}
								value={form.repasseValor}
								onChange={(event) => setForm({ ...form, repasseValor: event.target.value })}
								disabled={isPending}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="turma-data-inicio">Início</Label>
							<Input
								id="turma-data-inicio"
								type="date"
								value={form.dataInicio}
								onChange={(event) => setForm({ ...form, dataInicio: event.target.value })}
								disabled={isPending}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="turma-data-fim">Fim (opcional)</Label>
							<Input
								id="turma-data-fim"
								type="date"
								value={form.dataFim}
								onChange={(event) => setForm({ ...form, dataFim: event.target.value })}
								disabled={isPending}
							/>
						</div>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || form.nome.trim() === "" || form.dataInicio === ""}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
