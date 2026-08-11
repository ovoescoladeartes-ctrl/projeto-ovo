"use client";

import { useState, useTransition } from "react";

import { PessoaCombobox } from "@/components/PessoaCombobox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PessoaBusca } from "@/core/pessoas/actions";
import type { RepasseTipo } from "@/core/turmas/schema";
import { parseCentavosInput } from "@/lib/currency";

import { criarTurma } from "./actions";

const ESTADO_INICIAL = {
	nome: "",
	assunto: "",
	mensalidade: "",
	repasseTipo: "percentual" as RepasseTipo,
	repasseValor: "",
	dataInicio: "",
	dataFim: "",
	capacidadeMaxima: "",
};

export function NovaTurmaDialog(): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(ESTADO_INICIAL);
	const [educadorPessoaId, setEducadorPessoaId] = useState<string | null>(null);
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

		const capacidadeMaxima = form.capacidadeMaxima.trim() === "" ? null : Number(form.capacidadeMaxima);
		if (capacidadeMaxima !== null && (!Number.isInteger(capacidadeMaxima) || capacidadeMaxima <= 0)) {
			setErro("Capacidade máxima inválida.");
			return;
		}

		startTransition(async () => {
			const result = await criarTurma({
				nome: form.nome,
				assunto: form.assunto,
				mensalidadeCentavos,
				repasseTipo: form.repasseTipo,
				repasseValor,
				dataInicio: form.dataInicio,
				dataFim: form.dataFim === "" ? null : form.dataFim,
				educadorPessoaId,
				capacidadeMaxima,
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setForm(ESTADO_INICIAL);
			setEducadorPessoaId(null);
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
							placeholder='Ex.: "Aquarela — Seg/Qua"'
							value={form.nome}
							onChange={(event) => setForm({ ...form, nome: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="turma-assunto">Assunto</Label>
						<Input
							id="turma-assunto"
							placeholder='Ex.: "Aquarela" — igual em turmas do mesmo curso em outro dia/horário'
							value={form.assunto}
							onChange={(event) => setForm({ ...form, assunto: event.target.value })}
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
							<Select
								value={form.repasseTipo}
								onValueChange={(value) => setForm({ ...form, repasseTipo: value as RepasseTipo, repasseValor: "" })}
								disabled={isPending}
							>
								<SelectTrigger id="turma-repasse-tipo">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="percentual">Percentual</SelectItem>
									<SelectItem value="fixo">Fixo</SelectItem>
								</SelectContent>
							</Select>
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

					<div className="space-y-1.5">
						<Label>Educador (opcional)</Label>
						<PessoaCombobox
							value={educadorPessoaId}
							onChange={(pessoa: PessoaBusca | null) => setEducadorPessoaId(pessoa?.id ?? null)}
							tipo="colaborador"
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="turma-capacidade">Capacidade máxima (opcional)</Label>
						<Input
							id="turma-capacidade"
							inputMode="numeric"
							placeholder="Sem limite"
							value={form.capacidadeMaxima}
							onChange={(event) => setForm({ ...form, capacidadeMaxima: event.target.value })}
							disabled={isPending}
						/>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || form.nome.trim() === "" || form.assunto.trim() === "" || form.dataInicio === ""}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
