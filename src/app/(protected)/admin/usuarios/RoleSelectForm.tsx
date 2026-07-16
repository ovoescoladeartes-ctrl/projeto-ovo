"use client";

import { useState, useTransition } from "react";

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
			<select
				value={role}
				onChange={(event) => setRole(event.target.value)}
				disabled={isPending}
				className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
			>
				<option value={PENDING_ACCESS}>Pendente (sem acesso)</option>
				{ROLES.map((roleOption) => (
					<option key={roleOption} value={roleOption}>
						{roleOption}
					</option>
				))}
			</select>
			<button
				type="button"
				onClick={handleSalvar}
				disabled={isPending || role === currentRole}
				className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
			>
				{isPending ? "Salvando..." : "Salvar"}
			</button>
			{erro !== null ? <p className="w-full text-xs text-red-600">{erro}</p> : null}
		</div>
	);
}
