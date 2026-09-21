"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { alternarItemRitual } from "@/app/(protected)/caixa/checklist/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { FechamentoTarefaRecorrentePendente } from "@/core/financeiro/fechamento/schema";

interface FechamentoTarefaRecorrenteProps {
	tarefa: FechamentoTarefaRecorrentePendente;
}

/** Só "Exportar relatório semanal" tem uma ação de exportação — o resto marca como concluído (seção 2 da 7ª rodada de feedback). Como não existe hoje nenhuma geração real de relatório no projeto, "exportar" aqui resolve as semanas selecionadas da mesma forma que "marcar como concluídas", só com rótulo/ícone que combinam com a tarefa. */
const ITEM_EXPORTAVEL = "exportar-relatorio";

/**
 * Uma tarefa recorrente do Ritual (ex.: "Conferir entradas novas") com N semanas pendentes,
 * agrupada numa linha só — expande em accordion revelando uma semana por linha, com checkbox
 * (pré-marcadas), e resolve as selecionadas de uma vez. Cada semana marcada chama
 * `alternarItemRitual` pro doc `ritualSemanas/{semana}` correspondente — mesmo dado do Ritual, não
 * uma cópia (item 2 da 7ª rodada de feedback).
 */
export function FechamentoTarefaRecorrente({ tarefa }: FechamentoTarefaRecorrenteProps): React.ReactElement {
	const [selecionadas, setSelecionadas] = useState<ReadonlySet<string>>(new Set(tarefa.semanas.map((semana) => semana.semana)));
	const [isPending, startTransition] = useTransition();
	const [erro, setErro] = useState<string | null>(null);
	const router = useRouter();

	const exportavel = tarefa.itemId === ITEM_EXPORTAVEL;

	function alternarSelecao(semana: string, marcado: boolean): void {
		setSelecionadas((atual) => {
			const proximo = new Set(atual);
			if (marcado) {
				proximo.add(semana);
			} else {
				proximo.delete(semana);
			}
			return proximo;
		});
	}

	function handleConfirmar(): void {
		setErro(null);
		startTransition(async () => {
			const resultados = await Promise.all(
				[...selecionadas].map((semana) => alternarItemRitual({ semana, itemId: tarefa.itemId, concluido: true })),
			);
			const falha = resultados.find((resultado) => resultado.status === "error");
			if (falha !== undefined) {
				setErro(falha.message ?? "Não foi possível salvar. Tente novamente.");
				return;
			}
			router.refresh();
		});
	}

	return (
		<Accordion type="single" collapsible>
			<AccordionItem value={tarefa.itemId} className="border-none">
				<AccordionTrigger className="px-4 py-3 hover:no-underline">
					<div className="flex flex-col items-start gap-0.5 text-left">
						<span className="text-sm font-medium text-foreground">{tarefa.label}</span>
						<span className="text-xs text-muted-foreground">{tarefa.periodoLabel}</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="px-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							{tarefa.semanas.map((semana) => (
								<label key={semana.semana} className="flex items-center gap-3 text-sm text-foreground">
									<Checkbox
										checked={selecionadas.has(semana.semana)}
										disabled={isPending}
										onCheckedChange={(checked) => alternarSelecao(semana.semana, checked === true)}
									/>
									{semana.label}
								</label>
							))}
						</div>
						{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-fit"
							disabled={isPending || selecionadas.size === 0}
							onClick={handleConfirmar}
						>
							{exportavel ? <Download className="h-4 w-4" /> : null}
							{isPending ? "Salvando..." : exportavel ? "Exportar selecionadas" : "Marcar selecionadas como concluídas"}
						</Button>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
