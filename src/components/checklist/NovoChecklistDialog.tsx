"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { criarChecklist } from "@/app/(protected)/checklist/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChecklistArea } from "@/core/checklist/schema";

interface NovoChecklistDialogProps {
	/** Fixa pela aba ativa em `/checklists` (Financeiro ou Comunicação) — não é campo do
	 * formulário, evita erro de criar um checklist financeiro dentro da aba de comunicação
	 * (seção 5.5 da spec). */
	area: ChecklistArea;
}

const ESTADO_INICIAL = { titulo: "", tema: "", descricao: "" };

/**
 * Checklist nasce vazio — itens são adicionados depois, de dentro dele (US-3, segundo cenário de
 * aceite), mantendo este dialog curto. Mesmo padrão de `NovaPendenciaManualDialog` (Dialog
 * central, 1 campo por linha).
 */
export function NovoChecklistDialog({ area }: NovoChecklistDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(ESTADO_INICIAL);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const resultado = await criarChecklist({ ...form, area });
			if (resultado.status === "error") {
				setErro(resultado.message ?? "Não foi possível criar o checklist.");
				return;
			}
			setOpen(false);
			setForm(ESTADO_INICIAL);
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(proximo) => {
				setOpen(proximo);
				if (!proximo) {
					setErro(null);
					setForm(ESTADO_INICIAL);
				}
			}}
		>
			<DialogTrigger asChild>
				<Button type="button">
					<Plus className="h-4 w-4" />
					Novo checklist
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo checklist</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="novo-checklist-titulo">Título</Label>
						<Input
							id="novo-checklist-titulo"
							value={form.titulo}
							onChange={(event) => setForm({ ...form, titulo: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="novo-checklist-tema">Tema</Label>
						<Input
							id="novo-checklist-tema"
							placeholder="Ex.: Bolsistas"
							value={form.tema}
							onChange={(event) => setForm({ ...form, tema: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="novo-checklist-descricao">Descrição</Label>
						<Input
							id="novo-checklist-descricao"
							value={form.descricao}
							onChange={(event) => setForm({ ...form, descricao: event.target.value })}
							disabled={isPending}
						/>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || form.titulo.trim() === "" || form.tema.trim() === ""}
					>
						{isPending ? "Criando..." : "Criar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
