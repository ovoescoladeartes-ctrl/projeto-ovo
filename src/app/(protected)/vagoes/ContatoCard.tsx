"use client";

import { MessageSquareText, MoveRight } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BUCKETS, bucketKeyDe, type Bucket } from "@/core/comunicacao/buckets";
import type { Contato } from "@/core/comunicacao/contatos/schema";

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
	const outrosBuckets = BUCKETS.filter((bucket) => bucket.key !== bucketKeyDe(contato));
	const curso = contato.interesseInicial.slice(0, 24);
	const dias = `${diasDesde(contato.estagioAtualizadoEm)}d`;
	const subtitulo = curso === "" ? dias : `${curso} - ${dias}`;

	const conteudo = (
		<div className="flex items-start justify-between gap-2">
			<div className="flex min-w-0 flex-col gap-1">
				<div className="flex min-w-0 items-center gap-3">
					<Avatar className="shrink-0">
						<AvatarFallback className="text-sm font-semibold">{iniciais(contato.nome)}</AvatarFallback>
					</Avatar>
					<p className="truncate text-sm font-semibold text-foreground">{contato.nome}</p>
				</div>
				<p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
			</div>

			{/* Só existe no mobile: lá não tem drag, então esse é o único jeito de mover ou
			    abrir a biblioteca. No desktop os ícones ficam de fora — drag cobre o "mover"
			    e o hover do card (acima) já basta como feedback, sem gastar espaço da coluna.
			    stopPropagation aqui evita que um clique nesses botões dispare a navegação do
			    card pra página da pessoa. */}
			<div className="flex shrink-0 items-center gap-0.5 md:hidden" onClick={(event) => event.stopPropagation()}>
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
	);

	const classeCartao = "block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent";

	// Só vira link quando já existe uma Pessoa vinculada — contato ainda "solto" (lead sem
	// conversão) não tem pra onde navegar.
	if (contato.pessoaId !== null) {
		return (
			<Link href={`/pessoas/${contato.pessoaId}`} className={classeCartao}>
				{conteudo}
			</Link>
		);
	}

	return <div className={classeCartao}>{conteudo}</div>;
}
