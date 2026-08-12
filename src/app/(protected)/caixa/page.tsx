import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";

import { KpiCardsGrid } from "@/components/dashboard/KpiCardsGrid";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { KpiCardData } from "@/core/dashboard/types";
import type { Recebimento } from "@/core/financeiro/recebimentos/schema";
import type { Repasse } from "@/core/financeiro/repasses/schema";
import { calcularRecebidoNoMes, calcularSaldoVivo, contarRepassesPendentes } from "@/core/financeiro/saldo";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";
import { formatCentavos } from "@/lib/currency";

import { CaixaTabs } from "./CaixaTabs";

const CAIXA_ROLES: readonly Role[] = ["admin", "financeiro"];

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

export default async function CaixaPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !CAIXA_ROLES.includes(session.role)) {
		redirect("/");
	}

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

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Caixa</h1>
				<p className="text-sm text-muted-foreground">Recebimentos e repasses financeiros da escola.</p>
			</div>

			<div className="mb-6">
				<KpiCardsGrid items={kpis} />
			</div>

			<CaixaTabs
				recebimentos={recebimentos}
				repasses={repasses}
				pessoasNomes={pessoasNomes}
				turmasNomes={turmasNomes}
				turmasAtivas={turmasAtivas}
			/>
		</div>
	);
}
