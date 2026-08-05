"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useMemo, useOptimistic, useState, useTransition } from "react";

import { BUCKETS, bucketKeyDe, type Bucket } from "@/core/comunicacao/buckets";
import type { ArquivadoMotivo, Contato, Estagio } from "@/core/comunicacao/contatos/schema";
import type { Mensagem } from "@/core/comunicacao/mensagens/schema";
import { cn } from "@/lib/utils";

import { moverEstagioContato } from "./actions";
import { ContatoCard } from "./ContatoCard";
import { MensagemPickerSheet } from "./MensagemPickerSheet";

interface MoverAction {
	id: string;
	estagio: Estagio;
	arquivadoMotivo: ArquivadoMotivo | null;
}

function agrupar(contatos: Contato[]): Map<string, Contato[]> {
	const grupos = new Map<string, Contato[]>();
	BUCKETS.forEach((bucket) => grupos.set(bucket.key, []));
	contatos.forEach((contato) => {
		grupos.get(bucketKeyDe(contato))?.push(contato);
	});
	return grupos;
}

function DroppableColuna({ bucket, children }: { bucket: Bucket; children: React.ReactNode }): React.ReactElement {
	const { setNodeRef, isOver } = useDroppable({ id: bucket.key });
	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex min-h-[200px] flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2 transition-colors",
				isOver && "bg-accent/40",
			)}
		>
			{children}
		</div>
	);
}

function DraggableCartao({ contato, children }: { contato: Contato; children: React.ReactNode }): React.ReactElement {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contato.id });
	const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
	return (
		<div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging && "z-10 opacity-60")}>
			{children}
		</div>
	);
}

interface BoardProps {
	contatos: Contato[];
	mensagens: Mensagem[];
}

export function Board({ contatos, mensagens }: BoardProps): React.ReactElement {
	const [pickerAberto, setPickerAberto] = useState(false);
	const [estagioMobile, setEstagioMobile] = useState<string>(BUCKETS[0]?.key ?? "novo");
	const [, startTransition] = useTransition();

	const [contatosOtimistas, moverOtimista] = useOptimistic(contatos, (estado: Contato[], acao: MoverAction) =>
		estado.map((contato) =>
			contato.id === acao.id
				? {
						...contato,
						estagio: acao.estagio,
						arquivadoMotivo: acao.arquivadoMotivo,
						estagioAtualizadoEm: new Date().toISOString(),
					}
				: contato,
		),
	);

	const grupos = useMemo(() => agrupar(contatosOtimistas), [contatosOtimistas]);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	function moverPara(contatoId: string, bucket: Bucket): void {
		startTransition(async () => {
			moverOtimista({ id: contatoId, estagio: bucket.estagio, arquivadoMotivo: bucket.arquivadoMotivo });
			await moverEstagioContato({ id: contatoId, estagio: bucket.estagio, arquivadoMotivo: bucket.arquivadoMotivo });
		});
	}

	function handleDragEnd(event: DragEndEvent): void {
		const { active, over } = event;
		if (over === null) {
			return;
		}
		const bucket = BUCKETS.find((item) => item.key === over.id);
		if (bucket === undefined) {
			return;
		}
		moverPara(String(active.id), bucket);
	}

	return (
		<div>
			<MensagemPickerSheet open={pickerAberto} onOpenChange={setPickerAberto} mensagens={mensagens} />

			{/* Desktop: 6 colunas lado a lado (Figma node 34:2756), com drag and drop. */}
			<div className="hidden md:block">
				<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
					<div className="grid grid-cols-6 gap-3">
						{BUCKETS.map((bucket) => {
							const cards = grupos.get(bucket.key) ?? [];
							return (
								<div key={bucket.key} className="min-w-0">
									<div className="mb-2 flex items-center justify-between px-1">
										<p className="truncate text-sm font-medium text-foreground">{bucket.label}</p>
										<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-medium text-background">
											{cards.length}
										</span>
									</div>
									<DroppableColuna bucket={bucket}>
										{cards.map((contato) => (
											<DraggableCartao key={contato.id} contato={contato}>
												<ContatoCard
													contato={contato}
													onMoverPara={(destino) => moverPara(contato.id, destino)}
													onAbrirBiblioteca={() => setPickerAberto(true)}
												/>
											</DraggableCartao>
										))}
									</DroppableColuna>
								</div>
							);
						})}
					</div>
				</DndContext>
			</div>

			{/* Mobile: uma coluna por vez via seletor de estágio — botão "mover para" é o caminho
			    primário aqui, drag fica só como capability desktop (requisito do PRD, não opcional). */}
			<div className="md:hidden">
				<select
					value={estagioMobile}
					onChange={(event) => setEstagioMobile(event.target.value)}
					className="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
				>
					{BUCKETS.map((bucket) => (
						<option key={bucket.key} value={bucket.key}>
							{bucket.label} ({(grupos.get(bucket.key) ?? []).length})
						</option>
					))}
				</select>

				<div className="flex flex-col gap-2">
					{(grupos.get(estagioMobile) ?? []).map((contato) => (
						<ContatoCard
							key={contato.id}
							contato={contato}
							onMoverPara={(destino) => moverPara(contato.id, destino)}
							onAbrirBiblioteca={() => setPickerAberto(true)}
						/>
					))}
					{(grupos.get(estagioMobile) ?? []).length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">Nenhum contato nesse estágio.</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
