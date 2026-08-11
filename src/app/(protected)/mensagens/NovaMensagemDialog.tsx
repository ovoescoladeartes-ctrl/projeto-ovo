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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MENSAGEM_CATEGORIAS, type MensagemCategoria } from "@/core/comunicacao/mensagens/schema";

import { criarMensagem } from "./actions";

const CATEGORIA_LABELS: Record<MensagemCategoria, string> = {
	duracao: "Duração",
	valor: "Valor",
	nivel: "Nível",
	faixa_etaria: "Faixa etária",
};

const ESTADO_INICIAL = { categoria: "duracao" as MensagemCategoria, titulo: "", texto: "" };

export function NovaMensagemDialog(): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(ESTADO_INICIAL);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await criarMensagem(form);
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
				<Button type="button">Nova mensagem</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nova mensagem</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="mensagem-categoria">Categoria</Label>
						<Select
							value={form.categoria}
							onValueChange={(value) => setForm({ ...form, categoria: value as MensagemCategoria })}
							disabled={isPending}
						>
							<SelectTrigger id="mensagem-categoria">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MENSAGEM_CATEGORIAS.map((categoria) => (
									<SelectItem key={categoria} value={categoria}>
										{CATEGORIA_LABELS[categoria]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="mensagem-titulo">Título</Label>
						<Input
							id="mensagem-titulo"
							value={form.titulo}
							onChange={(event) => setForm({ ...form, titulo: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="mensagem-texto">Texto</Label>
						<Textarea
							id="mensagem-texto"
							value={form.texto}
							onChange={(event) => setForm({ ...form, texto: event.target.value })}
							disabled={isPending}
							rows={5}
						/>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || form.titulo.trim() === "" || form.texto.trim() === ""}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
