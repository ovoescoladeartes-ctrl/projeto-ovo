"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { criarItemMaterial } from "@/app/(protected)/vagoes/materiais/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mesmo padrão de `NovoContatoDialog`/`AdicionarItemChecklistDialog` — adiciona um material à lista de compras; marcar como comprado é feito depois, direto no checkbox do item. */
export function AdicionarMaterialDialog(): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [titulo, setTitulo] = useState("");
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleAdicionar(): void {
		setErro(null);
		startTransition(async () => {
			const resultado = await criarItemMaterial({ titulo });
			if (resultado.status === "error") {
				setErro(resultado.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setTitulo("");
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(proximo) => {
				setOpen(proximo);
				if (!proximo) {
					setErro(null);
					setTitulo("");
				}
			}}
		>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					<Plus className="h-4 w-4" />
					Adicionar material
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Adicionar material</DialogTitle>
				</DialogHeader>

				<div className="space-y-1.5">
					<Label htmlFor="material-titulo">Nome do material</Label>
					<Input
						id="material-titulo"
						value={titulo}
						onChange={(event) => setTitulo(event.target.value)}
						disabled={isPending}
					/>
					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleAdicionar} disabled={isPending || titulo.trim().length === 0}>
						{isPending ? "Salvando..." : "Adicionar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
