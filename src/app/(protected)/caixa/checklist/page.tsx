import { redirect } from "next/navigation";

import { PendenciaRow } from "@/components/dashboard/PendenciaRow";
import { RitualChecklistItem } from "@/components/dashboard/RitualChecklistItem";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/core/auth/getServerSession";
import { CAIXA_ROLES } from "@/core/dashboard/consultas";
import { buscarPendenciasRitualHerdadas, buscarRitualDaSemana } from "@/core/financeiro/ritual/consultas";
import { chaveSemana, chaveSemanaValida, formatarDataCurta, segundaFeiraDe } from "@/core/financeiro/ritual/semana";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

// `?semana=` muda o conteúdo da mesma rota — sem isso o Router do Next pode servir uma resposta
// em cache em vez de buscar a semana pedida (mesma causa raiz de `caixa/page.tsx`).
export const dynamic = "force-dynamic";

interface ChecklistPageProps {
	searchParams: Promise<{ semana?: string }>;
}

export default async function ChecklistPage({ searchParams }: ChecklistPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const agora = new Date();
	const semana =
		filtros.semana !== undefined && chaveSemanaValida(filtros.semana) ? filtros.semana : chaveSemana(segundaFeiraDe(agora));
	const dataLabel = formatarDataCurta(new Date(`${semana}T00:00:00`));

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
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Ritual de Segunda — {dataLabel}</h1>
			</div>

			<Card>
				<CardHeader className="flex-row items-center gap-2 space-y-0">
					<CardTitle className="text-base">Ritual de Segunda — {dataLabel}</CardTitle>
					<Badge variant="secondary">
						{pendentes} de {ritual.itens.length} pendentes
					</Badge>
				</CardHeader>
				<CardContent className="pt-0">
					{ritual.itens.map((item) => (
						<RitualChecklistItem key={item.id} id={item.id} label={item.label} concluido={item.concluido} semana={semana} />
					))}
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
