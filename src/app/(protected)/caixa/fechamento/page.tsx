import { redirect } from "next/navigation";

import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getServerSession } from "@/core/auth/getServerSession";
import { CAIXA_ROLES } from "@/core/dashboard/consultas";
import type { KpiCardData } from "@/core/dashboard/types";
import { buscarFechamentoDoMes } from "@/core/financeiro/fechamento/consultas";
import { chavePeriodo, chavePeriodoValida } from "@/core/financeiro/fechamento/periodo";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { FechamentoItemRow } from "./FechamentoItemRow";

// `?periodo=` muda o conteúdo da mesma rota — mesma razão de `caixa/page.tsx`.
export const dynamic = "force-dynamic";

interface FechamentoPageProps {
	searchParams: Promise<{ periodo?: string }>;
}

export default async function FechamentoPage({ searchParams }: FechamentoPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const periodo = filtros.periodo !== undefined && chavePeriodoValida(filtros.periodo) ? filtros.periodo : chavePeriodo(new Date());

	const fechamento = await buscarFechamentoDoMes(getFirebaseAdminFirestore(), periodo);

	const kpis: KpiCardData[] = [
		{ label: "Semanas Fechadas", value: `${fechamento.semanasFechadas} semanas`, subtitle: `de ${fechamento.totalSemanas} no período` },
		{
			label: "Pendências Restantes",
			value: `${fechamento.pendenciasRestantes} pendência${fechamento.pendenciasRestantes === 1 ? "" : "s"}`,
			subtitle: "itens ainda não concluídos",
		},
		{ label: "Período de Referência", value: fechamento.periodoLabel, subtitle: "mês de referência do fechamento" },
	];

	const concluidos = fechamento.linhas.filter((linha) => linha.concluido).length;

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Caixa", href: "/caixa" }, { label: "Fechamento" }]} />
			<div className="mb-6 mt-2">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Fechamento Mensal</h1>
			</div>

			<div className="flex flex-col gap-6">
				<KpiCardsGrid items={kpis} />

				<section>
					<div className="mb-3 flex items-center justify-between gap-2">
						<h2 className="text-base font-semibold text-foreground">Checklist Consolidado de Fechamento — {fechamento.periodoLabel}</h2>
						<span className="shrink-0 text-sm text-muted-foreground">
							{concluidos} de {fechamento.linhas.length} concluídos
						</span>
					</div>
					<div className="divide-y divide-border overflow-hidden rounded-xl border border-l-4 border-border border-l-foreground bg-card">
						{fechamento.linhas.map((linha) => (
							<FechamentoItemRow
								key={linha.id}
								id={linha.id}
								label={linha.label}
								concluido={linha.concluido}
								editavel={linha.editavel}
								periodo={periodo}
							/>
						))}
					</div>
				</section>

				<Tooltip>
					<TooltipTrigger asChild>
						<span className="w-fit">
							<Button type="button" variant="outline" disabled>
								Exportar Relatório
							</Button>
						</span>
					</TooltipTrigger>
					<TooltipContent>Formato de exportação pendente de confirmação com contadora. Aguarde antes de revisar.</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
