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
import { MENSAGEM_CATEGORIAS, type Mensagem, type MensagemCategoria } from "@/core/comunicacao/mensagens/schema";

import { atualizarMensagem } from "./actions";

const CATEGORIA_LABELS: Record<MensagemCategoria, string> = {
	duracao: "Duração",
	valor: "Valor",
	nivel: "Nível",
	faixa_etaria: "Faixa etária",
};

interface MensagemEditDialogProps {
	mensagem: Mensagem;
}

export function MensagemEditDialog({ mensagem }: MensagemEditDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [categoria, setCategoria] = useState(mensagem.categoria);
	const [titulo, setTitulo] = useState(mensagem.titulo);
	const [texto, setTexto] = useState(mensagem.texto);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await atualizarMensagem({ id: mensagem.id, categoria, titulo, texto });
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
					<DialogTitle>Editar mensagem</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor={`mensagem-categoria-${mensagem.id}`}>Categoria</Label>
						<Select value={categoria} onValueChange={(value) => setCategoria(value as MensagemCategoria)} disabled={isPending}>
							<SelectTrigger id={`mensagem-categoria-${mensagem.id}`}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MENSAGEM_CATEGORIAS.map((opcao) => (
									<SelectItem key={opcao} value={opcao}>
										{CATEGORIA_LABELS[opcao]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`mensagem-titulo-${mensagem.id}`}>Título</Label>
						<Input
							id={`mensagem-titulo-${mensagem.id}`}
							value={titulo}
							onChange={(event) => setTitulo(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`mensagem-texto-${mensagem.id}`}>Texto</Label>
						<Textarea
							id={`mensagem-texto-${mensagem.id}`}
							value={texto}
							onChange={(event) => setTexto(event.target.value)}
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
						disabled={isPending || titulo.trim() === "" || texto.trim() === ""}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
