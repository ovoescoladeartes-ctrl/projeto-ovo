"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Copia o link do formulário público de Materiais (`/materiais-professor`) — mesmo padrão de
 * `copiarParaAreaDeTransferencia` de `ExportarDropdown.tsx` (só avisa sucesso depois que o
 * navegador confirma a escrita; clipboard pode ser bloqueado).
 */
export function CopiarLinkMateriaisProfessor(): React.ReactElement {
	function handleCopiar(): void {
		const url = `${window.location.origin}/materiais-professor`;
		navigator.clipboard.writeText(url).then(
			() => toast.success("Link copiado", { description: "Cole no WhatsApp/e-mail pra compartilhar com os professores." }),
			() => toast.error("Não foi possível copiar", { description: "O navegador bloqueou o acesso à área de transferência." }),
		);
	}

	return (
		<Button type="button" variant="outline" size="sm" onClick={handleCopiar}>
			<Copy className="h-4 w-4" />
			Copiar link do formulário
		</Button>
	);
}
