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
import { Textarea } from "@/components/ui/textarea";
import { CANAIS, type Canal } from "@/core/comunicacao/contatos/schema";

import { criarContato } from "./actions";

const CANAL_LABELS: Record<Canal, string> = {
	whatsapp: "WhatsApp",
	instagram: "Instagram",
	indicacao: "Indicação",
	site: "Site",
	outro: "Outro",
};

const ESTADO_INICIAL = { nome: "", canal: "whatsapp" as Canal, interesseInicial: "" };

export function NovoContatoDialog(): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(ESTADO_INICIAL);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await criarContato(form);
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
				<Button type="button">Novo contato</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo contato</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="contato-nome">Nome</Label>
						<Input
							id="contato-nome"
							value={form.nome}
							onChange={(event) => setForm({ ...form, nome: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="contato-canal">Canal</Label>
						<select
							id="contato-canal"
							value={form.canal}
							onChange={(event) => setForm({ ...form, canal: event.target.value as Canal })}
							disabled={isPending}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
						>
							{CANAIS.map((canal) => (
								<option key={canal} value={canal}>
									{CANAL_LABELS[canal]}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="contato-interesse">O que a pessoa perguntou</Label>
						<Textarea
							id="contato-interesse"
							value={form.interesseInicial}
							onChange={(event) => setForm({ ...form, interesseInicial: event.target.value })}
							disabled={isPending}
							rows={3}
						/>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || form.nome.trim() === "" || form.interesseInicial.trim() === ""}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
