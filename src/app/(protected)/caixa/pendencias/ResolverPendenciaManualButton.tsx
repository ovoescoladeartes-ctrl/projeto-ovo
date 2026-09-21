"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { resolverPendenciaManual } from "./actions";

interface ResolverPendenciaManualButtonProps {
	id: string;
}

/** Botão preenchido ("Marcar como pago" no Figma) — só existe pra pendências manuais, únicas que `resolverPendenciaManual` sabe resolver. */
export function ResolverPendenciaManualButton({ id }: ResolverPendenciaManualButtonProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();

	function handleClick(): void {
		startTransition(async () => {
			await resolverPendenciaManual({ id });
		});
	}

	return (
		<Button type="button" size="sm" onClick={handleClick} disabled={isPending}>
			{isPending ? "Marcando..." : "Marcar como pago"}
		</Button>
	);
}
