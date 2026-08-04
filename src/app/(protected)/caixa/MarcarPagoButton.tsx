"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { marcarRepasseComoPago } from "./actions";

interface MarcarPagoButtonProps {
	id: string;
}

export function MarcarPagoButton({ id }: MarcarPagoButtonProps): React.ReactElement {
	const [isPending, startTransition] = useTransition();

	function handleClick(): void {
		startTransition(async () => {
			await marcarRepasseComoPago(id);
		});
	}

	return (
		<Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
			{isPending ? "Marcando..." : "Marcar como pago"}
		</Button>
	);
}
