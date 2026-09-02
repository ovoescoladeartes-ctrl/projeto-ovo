"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { criarItemManualChecklist } from "@/app/(protected)/vagoes/checklist/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdicionarItemChecklistDialogProps {
	dia: string;
}

/**
 * Item manual avulso do Checklist do Dia — texto livre, independente de Contato. Antes se chamava
 * "Adicionar material" (copy do Figma, frame "5 · Modal de Material") e usava `Sheet`/FAB; o rótulo
 * não tinha nenhuma relação com compra de suprimentos (era só um item genérico), e o padrão de
 * criação do resto do app é `Dialog` central (`NovoContatoDialog`, `NovaPendenciaManualDialog`) —
 * ajustado aqui pros dois.
 */
export function AdicionarItemChecklistDialog({ dia }: AdicionarItemChecklistDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [titulo, setTitulo] = useState("");
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleAdicionar(): void {
		setErro(null);
		startTransition(async () => {
			const resultado = await criarItemManualChecklist({ dia, titulo });
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
					Adicionar item
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Adicionar item</DialogTitle>
				</DialogHeader>

				<div className="space-y-1.5">
					<Label htmlFor="checklist-item-titulo">Nome do item</Label>
					<Input
						id="checklist-item-titulo"
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
