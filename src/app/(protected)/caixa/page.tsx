import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";

import { CopilotoInput } from "@/components/dashboard/CopilotoInput";
import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { getServerSession } from "@/core/auth/getServerSession";
import { CAIXA_ROLES } from "@/core/dashboard/consultas";
import type { KpiCardData } from "@/core/dashboard/types";
import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";
import { calcularRecebidoNoMes, calcularSaldoVivo, contarRepassesPendentes } from "@/core/financeiro/saldo";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { CaixaTabs } from "./CaixaTabs";
import { NovoRecebimentoDialog } from "./NovoRecebimentoDialog";
import { NovoRepasseDialog } from "./NovoRepasseDialog";

// Sem isso, trocar só o searchParam `aba` na mesma rota pode servir uma resposta em cache do
// Router do Next em vez de buscar dados frescos no servidor (mesma causa raiz corrigida em
// pessoas/turmas/page.tsx).
export const dynamic = "force-dynamic";

interface RecebimentoDoc {
	pessoaId: string;
	turmaId: string | null;
	matriculaId: string | null;
	valorCentavos: number;
	formaPagamento: string;
	origem: string;
	status: string;
	dataRecebimento?: Timestamp;
	ativo: boolean;
	wixOrderId?: string | null;
	wixLineItemId?: string | null;
}

interface RepasseDoc {
	destinoTipo: string;
	destinoPessoaId: string | null;
	turmaId: string | null;
	valorCentavos: number;
	vencimento?: Timestamp;
	status: string;
	origem: string;
	ativo: boolean;
}

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

	const firestore = getFirebaseAdminFirestore();

	const [recebimentosSnapshot, repassesSnapshot, pessoasSnapshot, turmasSnapshot] = await Promise.all([
		firestore.collection("recebimentos").get(),
		firestore.collection("repasses").get(),
		firestore.collection("pessoas").get(),
		firestore.collection("turmas").get(),
	]);

	const pessoasNomes: Record<string, string> = {};
	pessoasSnapshot.docs.forEach((doc) => {
		pessoasNomes[doc.id] = (doc.data() as { nome: string }).nome;
	});

	const turmasNomes: Record<string, string> = {};
	const turmasAtivas: { id: string; nome: string }[] = [];
	turmasSnapshot.docs.forEach((doc) => {
		const data = doc.data() as { nome: string; ativo: boolean };
		turmasNomes[doc.id] = data.nome;
		if (data.ativo) {
			turmasAtivas.push({ id: doc.id, nome: data.nome });
		}
	});
	turmasAtivas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

	const recebimentos: Recebimento[] = recebimentosSnapshot.docs.map((doc) => {
		const data = doc.data() as RecebimentoDoc;
		return {
			id: doc.id,
			pessoaId: data.pessoaId,
			turmaId: data.turmaId,
			matriculaId: data.matriculaId,
			valorCentavos: data.valorCentavos,
			formaPagamento: data.formaPagamento as Recebimento["formaPagamento"],
			origem: data.origem as Recebimento["origem"],
			status: data.status as Recebimento["status"],
			dataRecebimento: toIso(data.dataRecebimento ?? null),
			ativo: data.ativo,
			wixOrderId: data.wixOrderId ?? null,
			wixLineItemId: data.wixLineItemId ?? null,
		};
	});
	recebimentos.sort((a, b) => (b.dataRecebimento ?? "").localeCompare(a.dataRecebimento ?? ""));

	const repasses: Repasse[] = repassesSnapshot.docs.map((doc) => {
		const data = doc.data() as RepasseDoc;
		return {
			id: doc.id,
			destinoTipo: data.destinoTipo as Repasse["destinoTipo"],
			destinoPessoaId: data.destinoPessoaId,
			turmaId: data.turmaId,
			valorCentavos: data.valorCentavos,
			vencimento: toIso(data.vencimento ?? null),
			status: data.status as Repasse["status"],
			origem: data.origem as Repasse["origem"],
			ativo: data.ativo,
		};
	});
	repasses.sort((a, b) => (b.vencimento ?? "").localeCompare(a.vencimento ?? ""));

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
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Caixa" }]} cta={caixaCta} />
			<div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Caixa</h1>
				<CopilotoInput />
				<div className="hidden md:inline-flex">{caixaCta}</div>
			</div>

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
