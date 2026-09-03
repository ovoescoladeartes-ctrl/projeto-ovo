"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { criarPendenciaManual } from "@/app/(protected)/caixa/pendencias/actions";

const ESTADO_INICIAL = { titulo: "", meta: "" };

/** Mesmo padrão de `NovoContatoDialog`/`NovoRepasseDialog` (Dialog central, não Sheet) — cria uma pendência manual (ex.: "Nota fiscal faltando"); schema já existia (`criarPendenciaManualSchema`), faltava esta UI. */
export function NovaPendenciaManualDialog(): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(ESTADO_INICIAL);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const resultado = await criarPendenciaManual(form);
			if (resultado.status === "error") {
				setErro(resultado.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setForm(ESTADO_INICIAL);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					<Plus className="h-4 w-4" />
					Nova pendência
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nova pendência</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="pendencia-titulo">Título</Label>
						<Input
							id="pendencia-titulo"
							value={form.titulo}
							onChange={(event) => setForm({ ...form, titulo: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="pendencia-meta">Descrição</Label>
						<Input
							id="pendencia-meta"
							value={form.meta}
							onChange={(event) => setForm({ ...form, meta: event.target.value })}
							disabled={isPending}
						/>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleSalvar} disabled={isPending || form.titulo.trim() === "" || form.meta.trim() === ""}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
