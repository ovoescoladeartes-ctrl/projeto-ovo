"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PENDING_ACCESS, ROLES } from "@/core/auth/Role";

import { updateUserRole } from "./actions";

interface RoleSelectFormProps {
	uid: string;
	currentRole: string;
}

export function RoleSelectForm({ uid, currentRole }: RoleSelectFormProps): React.ReactElement {
	const [role, setRole] = useState(currentRole);
	const [isPending, startTransition] = useTransition();
	const [erro, setErro] = useState<string | null>(null);

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await updateUserRole(uid, role);
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
			}
		});
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Select value={role} onValueChange={setRole} disabled={isPending}>
				<SelectTrigger className="w-auto min-w-[10rem]">
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
			<Button type="button" size="sm" onClick={handleSalvar} disabled={isPending || role === currentRole}>
				{isPending ? "Salvando..." : "Salvar"}
			</Button>
			{erro !== null ? <p className="w-full text-xs text-destructive">{erro}</p> : null}
		</div>
	);
}
