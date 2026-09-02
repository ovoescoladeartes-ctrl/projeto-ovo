import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

import { PageBreadcrumb } from "@/components/shell/PageBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/core/auth/getServerSession";
import { buscarChecklistComunicacaoDoDia, chaveDia } from "@/core/comunicacao/checklist/consultas";
import { VAGOES_ROLES } from "@/core/dashboard/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

import { AdicionarMaterialButton } from "./AdicionarMaterialButton";
import { ChecklistItemCheckbox } from "./ChecklistItemCheckbox";

export default async function ChecklistComunicacaoPage(): Promise<React.ReactElement> {
	const session = await getServerSession();
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		redirect("/");
	}

	const agora = new Date();
	const dia = chaveDia(agora);
	const checklist = await buscarChecklistComunicacaoDoDia(getFirebaseAdminFirestore(), dia, agora);

	return (
		<div>
			<PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Vagões", href: "/vagoes" }, { label: "Checklist" }]} />
			<div className="mb-6 mt-2">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Checklist do Dia</h1>
			</div>

			<div className="flex flex-col gap-6">
				{checklist.pendenciasAnteriores.length > 0 ? (
					<Card className="border-red-200">
						<CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
							<CardTitle className="text-base">Pendências anteriores</CardTitle>
							<span className="text-sm font-medium text-red-700">
								{checklist.pendenciasAnteriores.length} {checklist.pendenciasAnteriores.length === 1 ? "item não concluído" : "itens não concluídos"}
							</span>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="divide-y divide-border">
								{checklist.pendenciasAnteriores.map((item) => (
									<ChecklistItemCheckbox
										key={item.contatoId}
										dia={dia}
										tipo="contato"
										itemId={item.contatoId}
										label={item.nome}
										meta={`${item.canal} · vencido há ${item.diasAguardando} dia${item.diasAguardando === 1 ? "" : "s"}`}
										concluido={item.concluido}
										avatarNome={item.nome}
										destaque
									/>
								))}
							</div>
						</CardContent>
					</Card>
				) : null}

				{checklist.blocos.map((bloco) => (
					<Card key={bloco.id}>
						<CardHeader>
							<CardTitle className="text-base font-medium text-muted-foreground">{bloco.label}</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							{!bloco.disponivel ? (
								<div className="flex items-center justify-center rounded-lg bg-muted/50 py-6 text-sm text-muted-foreground">
									Disponível às {bloco.horaInicio}h
								</div>
							) : bloco.itens.length > 0 ? (
								<div className="divide-y divide-border">
									{bloco.itens.map((item) => (
										<ChecklistItemCheckbox
											key={item.contatoId}
											dia={dia}
											tipo="contato"
											itemId={item.contatoId}
											label={item.nome}
											meta={`${item.canal} · aguardando há ${item.diasAguardando} dia${item.diasAguardando === 1 ? "" : "s"}`}
											concluido={item.concluido}
											avatarNome={item.nome}
										/>
									))}
								</div>
							) : (
								<div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 py-6 text-sm text-muted-foreground">
									<CheckCircle2 className="h-4 w-4" />
									Nada pendente nesse horário
								</div>
							)}
						</CardContent>
					</Card>
				))}

				{checklist.manuais.length > 0 ? (
					<Card>
						<CardHeader className="flex-row items-center gap-2 space-y-0">
							<CardTitle className="text-base">Outros itens</CardTitle>
							<Badge variant="secondary">
								{checklist.manuais.filter((item) => !item.concluido).length} de {checklist.manuais.length} pendentes
							</Badge>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="divide-y divide-border">
								{checklist.manuais.map((item) => (
									<ChecklistItemCheckbox
										key={item.id}
										dia={dia}
										tipo="manual"
										itemId={item.id}
										label={item.titulo}
										concluido={item.concluido}
									/>
								))}
							</div>
						</CardContent>
					</Card>
				) : null}
			</div>

			<AdicionarMaterialButton dia={dia} />
		</div>
	);
}
