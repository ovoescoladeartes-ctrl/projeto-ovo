"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { adicionarItemChecklistCustomizado } from "@/app/(protected)/checklist/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdicionarItemChecklistCustomizadoDialogProps {
	checklistId: string;
}

/**
 * Item de um checklist customizado — sempre texto livre (seção 9 da spec: não há hoje necessidade
 * de item "derivado ao vivo" num checklist customizado, isso é particularidade dos de sistema).
 * Mesmo padrão de `AdicionarItemChecklistDialog`/`NovaPendenciaManualDialog` (Dialog central, 1
 * campo por linha).
 */
export function AdicionarItemChecklistCustomizadoDialog({ checklistId }: AdicionarItemChecklistCustomizadoDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [titulo, setTitulo] = useState("");
	const [explicacao, setExplicacao] = useState("");
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleAdicionar(): void {
		setErro(null);
		startTransition(async () => {
			const resultado = await adicionarItemChecklistCustomizado({
				checklistId,
				titulo,
				explicacao: explicacao.trim() === "" ? undefined : explicacao,
			});
			if (resultado.status === "error") {
				setErro(resultado.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setTitulo("");
			setExplicacao("");
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
					setExplicacao("");
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

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="checklist-customizado-item-titulo">Nome do item</Label>
						<Input
							id="checklist-customizado-item-titulo"
							value={titulo}
							onChange={(event) => setTitulo(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="checklist-customizado-item-explicacao">Explicação (opcional)</Label>
						<Textarea
							id="checklist-customizado-item-explicacao"
							placeholder="Ajuda a entender o que precisa ser feito — aparece num ícone de interrogação ao lado do item."
							value={explicacao}
							onChange={(event) => setExplicacao(event.target.value)}
							disabled={isPending}
							rows={2}
						/>
					</div>

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
