import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/PageHeader";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { KpiCardData } from "@/core/dashboard/types";
import { lerPessoas } from "@/core/db/pessoas";
import { lerRecebimentos } from "@/core/db/recebimentos";
import { lerRepasses } from "@/core/db/repasses";
import { lerTurmas } from "@/core/db/turmas";
import { calcularRecebidoNoMes, calcularSaldoVivo, contarRepassesPendentes } from "@/core/financeiro/saldo";
import { formatCentavos } from "@/lib/currency";

import { CaixaTabs } from "./CaixaTabs";
import { NovoRecebimentoDialog } from "./NovoRecebimentoDialog";
import { NovoRepasseDialog } from "./NovoRepasseDialog";

// Sem isso, trocar só o searchParam `aba` na mesma rota pode servir uma resposta em cache do
// Router do Next em vez de buscar dados frescos no servidor (mesma causa raiz corrigida em
// pessoas/turmas/page.tsx).
export const dynamic = "force-dynamic";

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

interface CaixaPageProps {
	searchParams: Promise<{ aba?: string }>;
}

export default async function CaixaPage({ searchParams }: CaixaPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;
	const aba = filtros.aba === "repasses" ? "repasses" : "recebimentos";

	const [recebimentosLidos, repassesLidos, pessoas, turmas] = await Promise.all([lerRecebimentos(), lerRepasses(), lerPessoas(), lerTurmas()]);

	const pessoasNomes: Record<string, string> = {};
	pessoas.forEach((pessoa) => {
		pessoasNomes[pessoa.id] = pessoa.nome;
	});

	const turmasNomes: Record<string, string> = {};
	const turmasAtivas: { id: string; nome: string }[] = [];
	turmas.forEach((turma) => {
		turmasNomes[turma.id] = turma.nome;
		if (turma.ativo) {
			turmasAtivas.push({ id: turma.id, nome: turma.nome });
		}
	});
	turmasAtivas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	const recebimentos = [...recebimentosLidos].sort((a, b) => (b.dataRecebimento ?? "").localeCompare(a.dataRecebimento ?? ""));
	const repasses = [...repassesLidos].sort((a, b) => (b.vencimento ?? "").localeCompare(a.vencimento ?? ""));

	const kpis: KpiCardData[] = [
		{
			label: "Saldo vivo",
			value: formatCentavos(calcularSaldoVivo(recebimentos, repasses)),
			subtitle: "Confirmado − repasses pagos",
		},
		{
			label: "Recebido no mês",
			value: formatCentavos(calcularRecebidoNoMes(recebimentos)),
			subtitle: "Recebimentos confirmados",
		},
		{ label: "Repasses pendentes", value: String(contarRepassesPendentes(repasses)), subtitle: "Aguardando pagamento" },
	];

	const caixaCta =
		aba === "recebimentos" ? <NovoRecebimentoDialog turmas={turmasAtivas} /> : <NovoRepasseDialog turmas={turmasAtivas} />;

	return (
		<div>
			<PageHeader breadcrumb={[{ label: "Dashboard", href: "/" }, { label: "Caixa" }]} title="Caixa" cta={caixaCta} />

			<CaixaTabs
				kpis={kpis}
				recebimentos={recebimentos}
				repasses={repasses}
				pessoasNomes={pessoasNomes}
				turmasNomes={turmasNomes}
			/>
		</div>
	);
}
