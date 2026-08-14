"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PENDING_ACCESS, ROLES } from "@/core/auth/Role";

import { updateUserRole } from "./actions";

interface RoleEditDialogProps {
	uid: string;
	nome: string;
	currentRole: string;
}

export function RoleEditDialog({ uid, nome, currentRole }: RoleEditDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [role, setRole] = useState(currentRole);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await updateUserRole(uid, role);
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
					<Pencil className="h-4 w-4" />
					Editar
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Editar acesso de {nome}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor={`role-select-${uid}`}>Papel</Label>
						<Select value={role} onValueChange={setRole} disabled={isPending}>
							<SelectTrigger id={`role-select-${uid}`}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={PENDING_ACCESS}>Pendente (sem acesso)</SelectItem>
								{ROLES.map((roleOption) => (
									<SelectItem key={roleOption} value={roleOption}>
										{roleOption}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={isPending}>
							Cancelar
						</Button>
					</DialogClose>
					<Button type="button" onClick={handleSalvar} disabled={isPending || role === currentRole}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
