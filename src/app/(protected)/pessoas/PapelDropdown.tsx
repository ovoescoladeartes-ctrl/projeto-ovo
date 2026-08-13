"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PapelDropdownProps {
	ehAluno: boolean;
	ehProfessor: boolean;
	onChange: (papel: "aluno" | "professor", marcado: boolean) => void;
	disabled?: boolean;
}

function rotulo(ehAluno: boolean, ehProfessor: boolean): string {
	if (ehAluno && ehProfessor) {
		return "Aluno, Professor";
	}
	if (ehAluno) {
		return "Aluno";
	}
	if (ehProfessor) {
		return "Professor";
	}
	return "Selecione o papel";
}

/**
 * Dropdown de múltipla seleção pro papel da pessoa (Aluno/Professor podem estar marcados os
 * dois ao mesmo tempo). Usado no formulário de criação e no de edição — diferente do chip da
 * barra de filtros da listagem, que é outro componente com outra lógica (filtro OR).
 */
export function PapelDropdown({ ehAluno, ehProfessor, onChange, disabled }: PapelDropdownProps): React.ReactElement {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" className="w-full justify-between font-normal" disabled={disabled}>
					{rotulo(ehAluno, ehProfessor)}
					<ChevronDown className="h-4 w-4 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
				<DropdownMenuCheckboxItem checked={ehAluno} onCheckedChange={(checked) => onChange("aluno", checked === true)}>
					Aluno
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem checked={ehProfessor} onCheckedChange={(checked) => onChange("professor", checked === true)}>
					Professor
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
