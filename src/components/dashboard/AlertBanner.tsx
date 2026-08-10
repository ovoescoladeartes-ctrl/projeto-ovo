"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Info, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const alertBannerVariants = cva(
	"flex items-center gap-3 rounded-xl px-4 py-3",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground",
				destructive: "bg-destructive text-destructive-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

interface AlertBannerProps extends VariantProps<typeof alertBannerVariants> {
	mensagem: string;
}

export function AlertBanner({
	mensagem,
	variant,
}: AlertBannerProps): React.ReactElement | null {
	const [aberto, setAberto] = useState(true);

	if (!aberto) {
		return null;
	}

	return (
		<div className={cn(alertBannerVariants({ variant }))}>
			<Info className="h-4 w-4 shrink-0" />
			<p className="flex-1 text-sm">{mensagem}</p>
			<Button
				type="button"
				size="sm"
				className={cn(
					variant === "destructive"
						? "bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
						: "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
				)}
			>
				Abrir pessoa
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Fechar alerta"
				onClick={() => setAberto(false)}
				className={cn(
					"h-7 w-7",
					variant === "destructive"
						? "text-destructive-foreground/70 hover:bg-destructive-foreground/10 hover:text-destructive-foreground"
						: "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
				)}
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);
}
