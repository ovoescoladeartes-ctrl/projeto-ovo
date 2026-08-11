"use client";

import { MessageSquareText, MoveRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BUCKETS, bucketKeyDe, type Bucket } from "@/core/comunicacao/buckets";
import type { Contato } from "@/core/comunicacao/contatos/schema";
import { calcularUrgencia, type NivelUrgencia } from "@/core/comunicacao/urgencia";
import { cn } from "@/lib/utils";

const URGENCIA_CLASSES: Record<NivelUrgencia, string> = {
	recente: "border-border",
	atencao: "border-amber-400",
	urgente: "border-red-500",
};

function iniciais(nome: string): string {
	const partes = nome.trim().split(/\s+/);
	const primeira = partes[0]?.[0] ?? "";
	const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
	return (primeira + ultima).toUpperCase();
}

function diasDesde(iso: string | null): number {
	if (iso === null) {
		return 0;
	}
	return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

interface ContatoCardProps {
	contato: Contato;
	onMoverPara: (bucket: Bucket) => void;
	onAbrirBiblioteca: () => void;
}

export function ContatoCard({ contato, onMoverPara, onAbrirBiblioteca }: ContatoCardProps): React.ReactElement {
	const urgencia = calcularUrgencia(contato.estagioAtualizadoEm);
	const outrosBuckets = BUCKETS.filter((bucket) => bucket.key !== bucketKeyDe(contato));

	return (
		<div className={cn("rounded-lg border bg-card p-3 shadow-sm", URGENCIA_CLASSES[urgencia])}>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<Avatar className="h-7 w-7 shrink-0">
						<AvatarFallback className="text-xs">{iniciais(contato.nome)}</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-foreground">{contato.nome}</p>
						<p className="truncate text-xs text-muted-foreground">
							{contato.interesseInicial.slice(0, 24)} · {diasDesde(contato.estagioAtualizadoEm)}d
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						aria-label="Biblioteca de mensagens"
						onClick={onAbrirBiblioteca}
						onPointerDown={(event) => event.stopPropagation()}
						className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					>
						<MessageSquareText className="h-4 w-4" />
					</button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label="Mover para"
								onPointerDown={(event) => event.stopPropagation()}
								className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							>
								<MoveRight className="h-4 w-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{outrosBuckets.map((bucket) => (
								<DropdownMenuItem key={bucket.key} onSelect={() => onMoverPara(bucket)}>
									{bucket.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{contato.interesses.length > 0 ? (
				<div className="mt-2 flex flex-wrap gap-1">
					{contato.interesses.map((interesse) => (
						<Badge key={interesse} variant="secondary" className="text-[10px]">
							{interesse}
						</Badge>
					))}
				</div>
			) : null}
		</div>
	);
}
