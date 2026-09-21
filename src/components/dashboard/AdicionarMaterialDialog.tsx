"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { criarItemMaterial } from "@/app/(protected)/vagoes/materiais/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdicionarMaterialDialogProps {
	turmasAtivas: { id: string; nome: string }[];
}

/** Sentinela do Select — Radix não aceita `value=""` (mesmo padrão de `SEM_TURMA` em `NovaPessoaDialog`). */
const GERAL = "__geral__";

/**
 * Mesmo padrão de `NovoContatoDialog`/`AdicionarItemChecklistDialog` — adiciona um material à
 * lista de compras; marcar como comprado é feito depois, direto no checkbox do item. Turma
 * (ou "Geral") escolhida na criação, não um checklist customizado — dentro de Materiais os cards
 * nascem sozinhos a partir de item cadastrado, nunca de "criar checklist do zero" (item 3 da 8ª
 * rodada de feedback).
 */
export function AdicionarMaterialDialog({ turmasAtivas }: AdicionarMaterialDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [titulo, setTitulo] = useState("");
	const [turmaId, setTurmaId] = useState(GERAL);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function resetar(): void {
		setTitulo("");
		setTurmaId(GERAL);
		setErro(null);
	}

	function handleAdicionar(): void {
		setErro(null);
		startTransition(async () => {
			const turma = turmaId === GERAL ? null : (turmasAtivas.find((item) => item.id === turmaId) ?? null);
			const resultado = await criarItemMaterial({
				titulo,
				turmaId: turma?.id ?? null,
				turmaNome: turma?.nome ?? null,
			});
			if (resultado.status === "error") {
				setErro(resultado.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			resetar();
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(proximo) => {
				setOpen(proximo);
				if (!proximo) {
					resetar();
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

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="material-turma">Turma</Label>
						<Select value={turmaId} onValueChange={setTurmaId} disabled={isPending}>
							<SelectTrigger id="material-turma">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={GERAL}>Geral</SelectItem>
								{turmasAtivas.map((turma) => (
									<SelectItem key={turma.id} value={turma.id}>
										{turma.nome}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="material-titulo">Nome do material</Label>
						<Input
							id="material-titulo"
							value={titulo}
							onChange={(event) => setTitulo(event.target.value)}
							disabled={isPending}
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
