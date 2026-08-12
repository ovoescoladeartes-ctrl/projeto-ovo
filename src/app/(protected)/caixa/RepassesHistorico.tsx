"use client";

import { useMemo, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPASSE_STATUS, type DestinoTipo, type Repasse } from "@/core/financeiro/repasses/schema";
import { ORIGENS } from "@/core/financeiro/shared";
import { formatCentavos } from "@/lib/currency";

import { MarcarPagoButton } from "./MarcarPagoButton";

const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", pago: "Pago" };
const ORIGEM_LABELS: Record<string, string> = { wix: "Wix", manual: "Manual" };
const DESTINO_LABELS: Record<DestinoTipo, string> = { educador: "Educador", espaco: "Espaço", outro: "Outro" };

function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

interface RepassesHistoricoProps {
	repasses: Repasse[];
	pessoasNomes: Record<string, string>;
	turmasNomes: Record<string, string>;
}

export function RepassesHistorico({ repasses, pessoasNomes, turmasNomes }: RepassesHistoricoProps): React.ReactElement {
	const [origem, setOrigem] = useState("todas");
	const [status, setStatus] = useState("todos");

	const filtrados = useMemo(() => {
		return repasses.filter(
			(repasse) => (origem === "todas" || repasse.origem === origem) && (status === "todos" || repasse.status === status),
		);
	}, [repasses, origem, status]);

	return (
		<div>
			<div className="mb-3 flex flex-wrap gap-2">
				<Select value={origem} onValueChange={setOrigem}>
					<SelectTrigger className="w-auto min-w-[9rem]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="todas">Todas as origens</SelectItem>
						{ORIGENS.map((opcao) => (
							<SelectItem key={opcao} value={opcao}>
								{ORIGEM_LABELS[opcao]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={status} onValueChange={setStatus}>
					<SelectTrigger className="w-auto min-w-[9rem]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="todos">Todos os status</SelectItem>
						{REPASSE_STATUS.map((opcao) => (
							<SelectItem key={opcao} value={opcao}>
								{STATUS_LABELS[opcao]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Destino</th>
							<th className="px-4 py-3 font-medium">Turma / papel</th>
							<th className="px-4 py-3 font-medium">Valor</th>
							<th className="px-4 py-3 font-medium">Origem</th>
							<th className="px-4 py-3 font-medium">Status</th>
							<th className="px-4 py-3 font-medium">Vencimento</th>
							<th className="px-4 py-3 font-medium" />
						</tr>
					</thead>
					<tbody>
						{filtrados.map((repasse) => (
							<tr key={repasse.id} className="border-b border-border last:border-0">
								<td className="px-4 py-3 text-foreground">
									{repasse.destinoTipo === "educador"
										? (repasse.destinoPessoaId ? (pessoasNomes[repasse.destinoPessoaId] ?? "—") : "—")
										: DESTINO_LABELS[repasse.destinoTipo]}
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{repasse.turmaId ? (turmasNomes[repasse.turmaId] ?? "—") : "—"}
								</td>
								<td className="px-4 py-3 text-foreground">{formatCentavos(repasse.valorCentavos)}</td>
								<td className="px-4 py-3 text-muted-foreground">{ORIGEM_LABELS[repasse.origem]}</td>
								<td className="px-4 py-3">
									<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
										{STATUS_LABELS[repasse.status]}
									</span>
								</td>
								<td className="px-4 py-3 text-muted-foreground">{formatarData(repasse.vencimento)}</td>
								<td className="px-4 py-3 text-right">
									{repasse.status === "pendente" ? <MarcarPagoButton id={repasse.id} /> : null}
								</td>
							</tr>
						))}
						{filtrados.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
									Nenhum repasse encontrado.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
