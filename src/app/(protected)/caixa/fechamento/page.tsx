import { redirect } from "next/navigation";

import { RitualChecklistItem } from "@/components/dashboard/RitualChecklistItem";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { buscarFechamentoDoMes, chavePeriodoDoMes } from "@/core/financeiro/fechamento/consultas";
import { periodoSchema, type FechamentoItemId } from "@/core/financeiro/fechamento/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { FechamentoItemCheckbox } from "./FechamentoItemCheckbox";

// `?periodo=` muda o conteúdo da mesma rota — mesma razão de `caixa/page.tsx` e `caixa/checklist/page.tsx`.
export const dynamic = "force-dynamic";

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

interface FechamentoPageProps {
	searchParams: Promise<{ periodo?: string }>;
}

export default async function FechamentoPage({ searchParams }: FechamentoPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const agora = new Date();
	const periodoPadrao = chavePeriodoDoMes(agora);
	const periodo = filtros.periodo !== undefined && periodoSchema.safeParse(filtros.periodo).success ? filtros.periodo : periodoPadrao;

	const fechamento = await buscarFechamentoDoMes(getFirebaseAdminFirestore(), periodo);
	const concluidos = fechamento.linhas.filter((linha) => linha.concluido).length;

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Caixa", href: "/caixa" }, { label: "Fechamento" }]} />
			<div className="mb-6 mt-2">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Fechamento Mensal</h1>
			</div>

			<div className="flex flex-col gap-6">
				{/* Figma mostra só rótulo+valor (2 linhas) nesses 3 cards — diferente do 3º texto
				("subtitle") que `KpiCard`/`KpiCardData` exigem, então esses cards são montados
				diretamente com `Card` (mesmas classes de `KpiCard`) em vez de reaproveitar
				`KpiCardsGrid`, que forçaria inventar uma legenda que não existe no Figma. */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Card className="min-w-0 p-5">
						<p className="text-xs font-medium text-muted-foreground">Semanas Fechadas</p>
						<p className="mt-2 text-3xl font-bold text-foreground">
							{fechamento.semanasFechadas} semana{fechamento.semanasFechadas === 1 ? "" : "s"}
						</p>
					</Card>
					<Card className="min-w-0 p-5">
						<p className="text-xs font-medium text-muted-foreground">Pendências Restantes</p>
						<p className="mt-2 text-3xl font-bold text-foreground">
							{fechamento.pendenciasRestantes} pendência{fechamento.pendenciasRestantes === 1 ? "" : "s"}
						</p>
					</Card>
					<Card className="min-w-0 p-5">
						<p className="text-xs font-medium text-muted-foreground">Período de Referência</p>
						<p className="mt-2 text-3xl font-bold text-foreground">{fechamento.periodoLabel}</p>
					</Card>
				</div>

				<Card>
					<CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
						<CardTitle className="text-base">Checklist Consolidado de Fechamento — {fechamento.periodoLabel}</CardTitle>
						<Badge variant="secondary">
							{concluidos} de {fechamento.linhas.length} concluídos
						</Badge>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="divide-y divide-border">
							{fechamento.linhas.map((linha) =>
								linha.tipo === "fixo" ? (
									<FechamentoItemCheckbox
										key={linha.id}
										id={linha.id as FechamentoItemId}
										periodo={periodo}
										label={linha.label}
										concluido={linha.concluido}
									/>
								) : (
									<RitualChecklistItem key={linha.id} label={linha.label} concluido={linha.concluido} />
								),
							)}
						</div>
					</CardContent>
				</Card>

				{/* "Exportar Relatório" (Figma) não tem formato/ação definidos hoje — o próprio texto do
				Figma diz "Formato de exportação pendente de confirmação com a contadora". Sem uma regra
				ou ação do produto pra isso, o botão fica desabilitado em vez de simular um clique que
				não faz nada. */}
				<div className="flex flex-col gap-3">
					<Button type="button" className="w-fit" disabled>
						Exportar Relatório
					</Button>
					<div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
						Formato de exportação pendente de confirmação com a contadora. Aguarde antes de enviar.
					</div>
				</div>
			</div>
		</div>
	);
}
