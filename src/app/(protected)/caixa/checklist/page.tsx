import { redirect } from "next/navigation";

import { PendenciaRow } from "@/components/dashboard/PendenciaRow";
import { ChecklistItemToggle } from "@/components/checklist/ChecklistItemToggle";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import { buscarPendenciasRitualHerdadas, buscarRitualDaSemana, chaveSemana, segundaFeiraDaSemana } from "@/core/financeiro/ritual/consultas";
import { semanaSchema } from "@/core/financeiro/ritual/schema";
import { formatarDataCurta } from "@/core/financeiro/shared";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { alternarItemRitual } from "./actions";

// `?semana=` muda o conteúdo da mesma rota — sem isso o Router do Next pode servir uma resposta
// em cache em vez de buscar a semana pedida (mesma causa raiz corrigida em `caixa/page.tsx`).
export const dynamic = "force-dynamic";

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

interface ChecklistPageProps {
	searchParams: Promise<{ semana?: string }>;
}

/** `semana` já passou por `semanaSchema` (formato + é uma segunda-feira real) antes de chegar aqui. */
function parseSemanaParaData(semana: string): Date {
	return new Date(Number(semana.slice(0, 4)), Number(semana.slice(5, 7)) - 1, Number(semana.slice(8, 10)));
}

export default async function ChecklistPage({ searchParams }: ChecklistPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const agora = new Date();
	const semanaPadrao = chaveSemana(segundaFeiraDaSemana(agora));
	const semana = filtros.semana !== undefined && semanaSchema.safeParse(filtros.semana).success ? filtros.semana : semanaPadrao;
	const dataLabel = formatarDataCurta(parseSemanaParaData(semana));

	const firestore = getFirebaseAdminFirestore();
	const [ritual, pendenciasHerdadas] = await Promise.all([
		buscarRitualDaSemana(firestore, semana),
		buscarPendenciasRitualHerdadas(firestore, agora),
	]);

	const pendentes = ritual.itens.filter((item) => !item.concluido).length;

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Caixa", href: "/caixa" }, { label: "Checklist" }]} />
			<div className="mb-6 mt-2">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Checklist</h1>
			</div>

			<Card>
				<CardHeader className="flex-row items-center gap-2 space-y-0">
					<CardTitle className="text-base">Ritual de Segunda — {dataLabel}</CardTitle>
					<Badge variant="secondary">
						{pendentes} de {ritual.itens.length} pendentes
					</Badge>
				</CardHeader>
				<CardContent className="pt-0">
					{/* Texto do Figma (frame "Checklist — Ritual de Segunda") — vive dentro do conteúdo do
					card, não como subtítulo estático abaixo do <h1> (regra 17 de docs/design.md, que já
					removeu esse padrão de Caixa antes). */}
					<p className="mb-3 text-sm text-muted-foreground">
						Rotina financeira semanal. Conclua os rituais básicos antes de gerar o fechamento quinzenal.
					</p>
					<div className="divide-y divide-border">
						{ritual.itens.map((item) => (
							<ChecklistItemToggle
								key={item.id}
								label={item.label}
								concluido={item.concluido}
								onToggle={(concluido) => alternarItemRitual({ semana, itemId: item.id, concluido })}
							/>
						))}
					</div>
				</CardContent>
			</Card>

			{pendenciasHerdadas.length > 0 ? (
				<section className="mt-6">
					<h2 className="mb-3 text-base font-semibold text-foreground">Pendências</h2>
					<div className="divide-y divide-border overflow-hidden rounded-xl border border-l-4 border-border border-l-foreground bg-card">
						{pendenciasHerdadas.map((pendencia) => (
							<PendenciaRow
								key={pendencia.id}
								icon={pendencia.icon}
								titulo={pendencia.titulo}
								meta={pendencia.meta}
								href={`/caixa/checklist?semana=${pendencia.semana}`}
								actionLabel="Resolver"
							/>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}
