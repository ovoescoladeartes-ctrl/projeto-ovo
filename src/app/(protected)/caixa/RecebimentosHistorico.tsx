"use client";

import { useMemo, useState } from "react";

import { RECEBIMENTO_STATUS, type Recebimento } from "@/core/financeiro/recebimentos/schema";
import { ORIGENS } from "@/core/financeiro/shared";
import { formatCentavos } from "@/lib/currency";

const STATUS_LABELS: Record<string, string> = {
	confirmado: "Confirmado",
	pendente: "Pendente",
	cancelado: "Cancelado",
};

const ORIGEM_LABELS: Record<string, string> = { wix: "Wix", manual: "Manual" };

const FORMA_LABELS: Record<string, string> = {
	pix: "Pix",
	dinheiro: "Dinheiro",
	cartao: "Cartão",
	transferencia: "Transferência",
	boleto: "Boleto",
	outro: "Outro",
};

function formatarData(iso: string | null): string {
	if (iso === null) {
		return "—";
	}
	return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

interface RecebimentosHistoricoProps {
	recebimentos: Recebimento[];
	pessoasNomes: Record<string, string>;
	turmasNomes: Record<string, string>;
}

export function RecebimentosHistorico({
	recebimentos,
	pessoasNomes,
	turmasNomes,
}: RecebimentosHistoricoProps): React.ReactElement {
	const [origem, setOrigem] = useState("todas");
	const [status, setStatus] = useState("todos");

	const filtrados = useMemo(() => {
		return recebimentos.filter(
			(recebimento) =>
				(origem === "todas" || recebimento.origem === origem) && (status === "todos" || recebimento.status === status),
		);
	}, [recebimentos, origem, status]);

	return (
		<div>
			<div className="mb-3 flex flex-wrap gap-2">
				<select
					value={origem}
					onChange={(event) => setOrigem(event.target.value)}
					className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
				>
					<option value="todas">Todas as origens</option>
					{ORIGENS.map((opcao) => (
						<option key={opcao} value={opcao}>
							{ORIGEM_LABELS[opcao]}
						</option>
					))}
				</select>
				<select
					value={status}
					onChange={(event) => setStatus(event.target.value)}
					className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
				>
					<option value="todos">Todos os status</option>
					{RECEBIMENTO_STATUS.map((opcao) => (
						<option key={opcao} value={opcao}>
							{STATUS_LABELS[opcao]}
						</option>
					))}
				</select>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Pessoa</th>
							<th className="px-4 py-3 font-medium">Turma</th>
							<th className="px-4 py-3 font-medium">Valor</th>
							<th className="px-4 py-3 font-medium">Forma</th>
							<th className="px-4 py-3 font-medium">Origem</th>
							<th className="px-4 py-3 font-medium">Status</th>
							<th className="px-4 py-3 font-medium">Data</th>
						</tr>
					</thead>
					<tbody>
						{filtrados.map((recebimento) => (
							<tr key={recebimento.id} className="border-b border-border last:border-0">
								<td className="px-4 py-3 text-foreground">{pessoasNomes[recebimento.pessoaId] ?? "—"}</td>
								<td className="px-4 py-3 text-muted-foreground">
									{recebimento.turmaId ? (turmasNomes[recebimento.turmaId] ?? "—") : "—"}
								</td>
								<td className="px-4 py-3 text-foreground">{formatCentavos(recebimento.valorCentavos)}</td>
								<td className="px-4 py-3 text-muted-foreground">{FORMA_LABELS[recebimento.formaPagamento]}</td>
								<td className="px-4 py-3 text-muted-foreground">{ORIGEM_LABELS[recebimento.origem]}</td>
								<td className="px-4 py-3">
									<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
										{STATUS_LABELS[recebimento.status]}
									</span>
								</td>
								<td className="px-4 py-3 text-muted-foreground">{formatarData(recebimento.dataRecebimento)}</td>
							</tr>
						))}
						{filtrados.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
									Nenhum recebimento encontrado.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}
