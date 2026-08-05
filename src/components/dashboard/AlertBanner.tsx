"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface AlertBannerProps {
	mensagem: string;
}

export function AlertBanner({ mensagem }: AlertBannerProps): React.ReactElement | null {
	const [aberto, setAberto] = useState(true);

	if (!aberto) {
		return null;
	}

	return (
		<div className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
			<Info className="h-4 w-4 shrink-0" />
			<p className="flex-1 text-sm">{mensagem}</p>
			<Button
				type="button"
				size="sm"
				className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
			>
				Abrir pessoa
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Fechar alerta"
				onClick={() => setAberto(false)}
				className="h-7 w-7 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);
}
