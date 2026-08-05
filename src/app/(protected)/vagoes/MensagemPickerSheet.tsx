"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MENSAGEM_CATEGORIAS, type Mensagem, type MensagemCategoria } from "@/core/comunicacao/mensagens/schema";

const CATEGORIA_LABELS: Record<MensagemCategoria, string> = {
	duracao: "Duração",
	valor: "Valor",
	nivel: "Nível",
	faixa_etaria: "Faixa etária",
};

interface MensagemPickerSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mensagens: Mensagem[];
}

export function MensagemPickerSheet({ open, onOpenChange, mensagens }: MensagemPickerSheetProps): React.ReactElement {
	const [copiadoId, setCopiadoId] = useState<string | null>(null);

	async function copiar(mensagem: Mensagem): Promise<void> {
		await navigator.clipboard.writeText(mensagem.texto);
		setCopiadoId(mensagem.id);
		setTimeout(() => setCopiadoId((atual) => (atual === mensagem.id ? null : atual)), 1500);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Biblioteca de mensagens</SheetTitle>
				</SheetHeader>

				<Tabs defaultValue={MENSAGEM_CATEGORIAS[0]} className="mt-4">
					<TabsList className="grid w-full grid-cols-4">
						{MENSAGEM_CATEGORIAS.map((categoria) => (
							<TabsTrigger key={categoria} value={categoria} className="text-xs">
								{CATEGORIA_LABELS[categoria]}
							</TabsTrigger>
						))}
					</TabsList>

					{MENSAGEM_CATEGORIAS.map((categoria) => {
						const doCategoria = mensagens.filter((mensagem) => mensagem.categoria === categoria);
						return (
							<TabsContent key={categoria} value={categoria} className="space-y-2">
								{doCategoria.map((mensagem) => (
									<div key={mensagem.id} className="rounded-md border border-border p-3">
										<div className="mb-1 flex items-center justify-between gap-2">
											<p className="text-sm font-medium text-foreground">{mensagem.titulo}</p>
											<Button type="button" variant="ghost" size="sm" onClick={() => copiar(mensagem)}>
												<Copy className="mr-1 h-3.5 w-3.5" />
												{copiadoId === mensagem.id ? "Copiado!" : "Copiar"}
											</Button>
										</div>
										<p className="text-sm text-muted-foreground">{mensagem.texto}</p>
									</div>
								))}
								{doCategoria.length === 0 ? (
									<p className="py-6 text-center text-sm text-muted-foreground">Nenhuma mensagem nessa categoria.</p>
								) : null}
							</TabsContent>
						);
					})}
				</Tabs>
			</SheetContent>
		</Sheet>
	);
}
