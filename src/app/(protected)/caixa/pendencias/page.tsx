import { redirect } from "next/navigation";

import { PendenciaRow } from "@/components/dashboard/PendenciaRow";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { PendenciaIcon } from "@/core/dashboard/types";
import { montarPendenciasAcionaveis } from "@/core/financeiro/pendencias/consultas";
import { buscarPendenciasRitualHerdadas } from "@/core/financeiro/ritual/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { ResolverPendenciaManualButton } from "./ResolverPendenciaManualButton";

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

/** Figma não mostra ícone nas linhas desta tela, mas `PendenciaRow` exige um — reaproveita a mesma semântica já usada pra pendências equivalentes no Dashboard (`core/dashboard/consultas.ts`). */
function iconeDaPendenciaAcionavel(tipo: "repasse" | "recebimento"): PendenciaIcon {
	return tipo === "repasse" ? "prazo" : "info";
}

export default async function PendenciasPage(): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

	const firestore = getFirebaseAdminFirestore();
	const agora = new Date();
	const [pendenciasAcionaveis, pendenciasHerdadas] = await Promise.all([
		montarPendenciasAcionaveis(firestore, agora),
		buscarPendenciasRitualHerdadas(firestore, agora),
	]);

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Caixa", href: "/caixa" }, { label: "Pendências" }]} />
			<div className="mb-6 mt-2">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pendências Acionáveis</h1>
			</div>

			<section>
				<div className="mb-3">
					<h2 className="text-base font-semibold text-foreground">Pendências</h2>
					<p className="text-sm text-muted-foreground">Itens organizados por vencimento</p>
				</div>

				{pendenciasAcionaveis.length > 0 ? (
					<div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
						{pendenciasAcionaveis.map((pendencia) =>
							pendencia.tipo === "manual" && pendencia.pendenciaManualId !== null ? (
								<div
									key={pendencia.id}
									className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-foreground">{pendencia.titulo}</p>
										<p className="text-sm text-muted-foreground">{pendencia.meta}</p>
									</div>
									<div className="flex flex-col items-start gap-1 sm:items-end">
										<ResolverPendenciaManualButton id={pendencia.pendenciaManualId} />
										<p className="text-xs text-muted-foreground">Confirmação manual - não gera ação automática no sistema</p>
									</div>
								</div>
							) : (
								<PendenciaRow
									key={pendencia.id}
									icon={iconeDaPendenciaAcionavel(pendencia.tipo as "repasse" | "recebimento")}
									titulo={pendencia.titulo}
									meta={pendencia.meta}
								/>
							),
						)}
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
