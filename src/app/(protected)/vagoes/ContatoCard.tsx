"use client";

import { MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BUCKETS, bucketKeyDe, type Bucket } from "@/core/comunicacao/buckets";
import type { Contato } from "@/core/comunicacao/contatos/schema";
import { calcularUrgencia, type NivelUrgencia } from "@/core/comunicacao/urgencia";
import { cn } from "@/lib/utils";

function diasDesde(iso: string | null): number {
	if (iso === null) {
		return 0;
	}
	return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

// Mesma semântica de 3 das 4 cores da regra 18 de docs/design.md: verde=dentro do esperado,
// amarelo=precisa de atenção, vermelho=crítico. Limiares vêm de calcularUrgencia (provisórios,
// a validar com a Katlin — não é escopo deste componente).
const URGENCIA_CORES: Record<NivelUrgencia, string> = {
	recente: "bg-emerald-100 text-emerald-800",
	atencao: "bg-amber-100 text-amber-800",
	urgente: "bg-red-100 text-red-800",
};

interface ContatoCardProps {
	contato: Contato;
	onMoverPara: (bucket: Bucket) => void;
	onAbrirDetalhes: () => void;
}

/** Clicar no card sempre abre o detalhe (nunca navega direto pra Pessoa) — dentro do
 * detalhe, o nome vira o link pra `/pessoas/[id]` quando já existe Pessoa vinculada. */
export function ContatoCard({ contato, onMoverPara, onAbrirDetalhes }: ContatoCardProps): React.ReactElement {
	const outrosBuckets = BUCKETS.filter((bucket) => bucket.key !== bucketKeyDe(contato));
	const [primeiraTag, ...resto] = contato.interesses;
	const dias = `${diasDesde(contato.estagioAtualizadoEm)}d`;
	const urgencia = calcularUrgencia(contato.estagioAtualizadoEm);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onAbrirDetalhes}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onAbrirDetalhes();
				}
			}}
			className="block w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-1.5">
					<p className="truncate text-sm font-semibold text-foreground">{contato.nome}</p>
					<div className="flex min-w-0 flex-wrap items-center gap-1.5">
						<span
							className={cn(
								"inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
								URGENCIA_CORES[urgencia],
							)}
						>
							{dias}
						</span>
						{primeiraTag !== undefined ? (
							<Badge variant="secondary" className="shrink-0 truncate font-normal">
								{primeiraTag}
							</Badge>
						) : null}
						{resto.length > 0 ? (
							<Badge variant="secondary" className="shrink-0 font-normal">
								+{resto.length}
							</Badge>
						) : null}
					</div>
				</div>

				{/* Só existe no mobile: lá não tem drag, então esse kebab é o único jeito de mover
				    entre estágios (no desktop drag já cobre isso). stopPropagation evita que um
				    clique aqui dispare o onAbrirDetalhes do card. */}
				<div className="shrink-0 md:hidden" onClick={(event) => event.stopPropagation()}>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label="Mover para"
								onPointerDown={(event) => event.stopPropagation()}
								className="tap-target-44 rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							>
								<MoreVertical className="h-4 w-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Mover para:</DropdownMenuLabel>
							{outrosBuckets.map((bucket) => (
								<DropdownMenuItem key={bucket.key} onSelect={() => onMoverPara(bucket)}>
									{bucket.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
