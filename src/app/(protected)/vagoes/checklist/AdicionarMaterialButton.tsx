"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { criarItemManualChecklist } from "./actions";

interface AdicionarMaterialButtonProps {
	dia: string;
}

/**
 * FAB + bottom sheet "Adicionar material" (Figma: frame "5 · Modal de Material") — item manual de
 * checklist, texto livre, independente de Contato (decisão aprovada).
 *
 * O botão vive no fluxo normal da página — não é `fixed`, não é portalado pra `document.body`, não
 * é `sticky`, sem `ResizeObserver`/medição. Três tentativas anteriores de tirá-lo do fluxo normal
 * (portal fixo simples, portal com medição via `ResizeObserver`, wrapper `sticky`) quebraram ou
 * ficaram instáveis no Safari. Alinhado à direita, logo depois do conteúdo do checklist, com
 * espaçamento normal (24px) acima — não flutua nem gruda durante o scroll, mas aparece de forma
 * previsível no canto inferior direito do conteúdo, igual ao Figma. O `Sheet`/bottom sheet continua
 * usando o portal próprio do Radix internamente (`SheetContent`, inalterado).
 */
export function AdicionarMaterialButton({ dia }: AdicionarMaterialButtonProps): React.ReactElement {
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

	function handleOpenChange(proximo: boolean): void {
		setOpen(proximo);
		if (!proximo) {
			setErro(null);
			setTitulo("");
		}
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<div className="mt-6 flex justify-end">
				<Button
					type="button"
					size="icon"
					className="h-14 w-14 rounded-full shadow-lg"
					aria-label="Adicionar material"
					onClick={() => setOpen(true)}
				>
					<Plus className="h-6 w-6" />
				</Button>
			</div>
			<SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-xl">
				<SheetHeader>
					<SheetTitle>Adicionar material</SheetTitle>
				</SheetHeader>

				<div className="space-y-1.5">
					<Label htmlFor="material-nome">Nome do item</Label>
					<Input
						id="material-nome"
						value={titulo}
						onChange={(event) => setTitulo(event.target.value)}
						placeholder="Nome do item"
						disabled={isPending}
					/>
					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<SheetFooter>
					<Button type="button" onClick={handleAdicionar} disabled={isPending || titulo.trim().length === 0}>
						Adicionar
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
