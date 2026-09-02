import { redirect } from "next/navigation";

import { PendenciaRow } from "@/components/dashboard/PendenciaRow";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";
import { CAIXA_ROLES } from "@/core/dashboard/consultas";
import { buscarPendenciasManuais, montarPendenciasAcionaveis } from "@/core/financeiro/pendencias/consultas";
import { buscarPendenciasRitualHerdadas } from "@/core/financeiro/ritual/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { PendenciaAcionavelRow } from "./PendenciaAcionavelRow";

export default async function PendenciasPage(): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

	const firestore = getFirebaseAdminFirestore();
	const agora = new Date();

	const [pendenciasAcionaveis, pendenciasManuais, pendenciasHerdadas] = await Promise.all([
		montarPendenciasAcionaveis(firestore, agora),
		buscarPendenciasManuais(firestore),
		buscarPendenciasRitualHerdadas(firestore, agora),
	]);

	const pendencias = [...pendenciasAcionaveis, ...pendenciasManuais];

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Caixa", href: "/caixa" }, { label: "Pendências" }]} />
			<div className="mb-6 mt-2">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pendências Acionáveis</h1>
			</div>

			<section>
				<h2 className="mb-3 text-base font-semibold text-foreground">Pendências</h2>
				{pendencias.length > 0 ? (
					<div className="divide-y divide-border overflow-hidden rounded-xl border border-l-4 border-border border-l-foreground bg-card">
						{pendencias.map((item) => (
							<PendenciaAcionavelRow key={item.id} item={item} />
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Nenhuma pendência acionável no momento.</p>
				)}
			</section>

			{pendenciasHerdadas.length > 0 ? (
				<section className="mt-6">
					<h2 className="mb-3 text-base font-semibold text-foreground">Item Herdado das Rotinas de Segunda</h2>
					<div className="divide-y divide-border overflow-hidden rounded-xl border border-l-4 border-border border-l-foreground bg-card">
						{pendenciasHerdadas.map((pendencia) => (
							<PendenciaRow
								key={pendencia.id}
								icon={pendencia.icon}
								titulo={pendencia.titulo}
								meta={pendencia.meta}
								href={`/caixa/checklist?semana=${pendencia.semana}`}
								actionLabel="Ver Detalhes"
							/>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}
