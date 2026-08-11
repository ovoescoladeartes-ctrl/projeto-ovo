"use client";

import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
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

function DroppableColuna({
	bucket,
	vazio,
	children,
}: {
	bucket: Bucket;
	vazio: boolean;
	children: React.ReactNode;
}): React.ReactElement {
	const { setNodeRef, isOver } = useDroppable({ id: bucket.key });
	return (
		<div ref={setNodeRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-md">
			{vazio && !isOver ? (
				<p className="py-8 text-center text-xs text-muted-foreground">Nenhum contato nesse estágio.</p>
			) : (
				children
			)}
			{/* Slot de destino: aparece só enquanto um card está sendo arrastado por cima desta
			    coluna, indicando onde ele vai pousar ao soltar. */}
			{isOver ? <div className="min-h-16 shrink-0 rounded-xl border-2 border-dashed border-foreground/25 bg-accent/50" /> : null}
		</div>
	);
}

/**
 * O card original fica invisível (mas ocupa o mesmo espaço) enquanto arrasta — em cinza
 * claro tracejado, marcando "era aqui que ele estava". A cópia que segue o cursor é o
 * <DragOverlay> lá embaixo no Board, não este elemento: por isso aqui não tem transform
 * nenhum, só a troca de aparência.
 */
function DraggableCartao({ contato, children }: { contato: Contato; children: React.ReactNode }): React.ReactElement {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: contato.id });
	return (
		<div ref={setNodeRef} className="relative">
			<div {...listeners} {...attributes} className={cn(isDragging && "invisible")}>
				{children}
			</div>
			{isDragging ? (
				<div className="absolute inset-0 rounded-xl border-2 border-dashed border-border bg-muted/60" />
			) : null}
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
	const [activeId, setActiveId] = useState<string | null>(null);
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
	const activeContato = activeId !== null ? (contatosOtimistas.find((contato) => contato.id === activeId) ?? null) : null;

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	function moverPara(contatoId: string, bucket: Bucket): void {
		startTransition(async () => {
			moverOtimista({ id: contatoId, estagio: bucket.estagio, arquivadoMotivo: bucket.arquivadoMotivo });
			await moverEstagioContato({ id: contatoId, estagio: bucket.estagio, arquivadoMotivo: bucket.arquivadoMotivo });
		});
	}

	function handleDragStart(event: DragStartEvent): void {
		setActiveId(String(event.active.id));
	}

	function handleDragEnd(event: DragEndEvent): void {
		setActiveId(null);
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
		<div className="flex h-full min-h-0 flex-col">
			<MensagemPickerSheet open={pickerAberto} onOpenChange={setPickerAberto} mensagens={mensagens} />

			{/* Desktop: 6 colunas lado a lado (Figma node 34:2756), com drag and drop. Cada coluna
			    preenche a altura toda disponível e rola por conta própria (padrão kanban), em vez
			    de esticar a página inteira quando uma coluna tem muitos cards. */}
			<div className="hidden min-h-0 flex-1 md:block">
				<DndContext
					sensors={sensors}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={() => setActiveId(null)}
				>
					<div className="grid h-full grid-cols-6 gap-6">
						{BUCKETS.map((bucket) => {
							const cards = grupos.get(bucket.key) ?? [];
							return (
								<div key={bucket.key} className="flex min-w-0 flex-col rounded-lg bg-column p-3">
									<div className="mb-3 flex items-center gap-2 px-1">
										<p className="truncate text-base font-semibold text-foreground">{bucket.label}</p>
										<span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-medium text-background">
											{cards.length}
										</span>
									</div>
									<DroppableColuna bucket={bucket} vazio={cards.length === 0}>
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

					{/* Cópia flutuante que segue o cursor — some do fluxo normal (por isso z-index e
					    coluna nunca mais competem), com uma leve rotação/sombra pra dar a sensação de
					    "pegou o card", e anima suavemente até o slot de destino ao soltar. */}
					<DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
						{activeContato ? (
							<div className="rotate-2 shadow-xl">
								<ContatoCard contato={activeContato} onMoverPara={() => {}} onAbrirBiblioteca={() => {}} />
							</div>
						) : null}
					</DragOverlay>
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
