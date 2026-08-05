import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";

import { CopilotoInput } from "@/components/dashboard/CopilotoInput";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { Contato } from "@/core/comunicacao/contatos/schema";
import type { Mensagem } from "@/core/comunicacao/mensagens/schema";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { toIso } from "@/core/shared/serialize";

import { Board } from "./Board";
import { NovoContatoDialog } from "./NovoContatoDialog";

const VAGOES_ROLES: readonly Role[] = ["admin", "comunicacao"];

interface ContatoDoc {
	nome: string;
	canal: string;
	interesseInicial: string;
	estagio: string;
	arquivadoMotivo: string | null;
	pessoaId: string | null;
	estagioAtualizadoEm?: Timestamp;
	criadoEm?: Timestamp;
	ativo: boolean;
}

interface MensagemDoc {
	categoria: string;
	titulo: string;
	texto: string;
	ativo: boolean;
}

export default async function VagoesPage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		redirect("/");
	}

	const firestore = getFirebaseAdminFirestore();

	// Uma única query, agrupada em memória nos 6 baldes visuais (ver src/core/comunicacao/buckets.ts).
	// Exige o índice composto (ativo ASC, estagioAtualizadoEm ASC) — se o Firestore ainda não tiver
	// esse índice, o erro traz um link para criá-lo automaticamente no Console.
	const [contatosSnapshot, mensagensSnapshot] = await Promise.all([
		firestore.collection("contatos").where("ativo", "==", true).orderBy("estagioAtualizadoEm", "asc").get(),
		firestore.collection("mensagens").where("ativo", "==", true).get(),
	]);

	const contatos: Contato[] = contatosSnapshot.docs.map((doc) => {
		const data = doc.data() as ContatoDoc;
		return {
			id: doc.id,
			nome: data.nome,
			canal: data.canal as Contato["canal"],
			interesseInicial: data.interesseInicial,
			estagio: data.estagio as Contato["estagio"],
			arquivadoMotivo: data.arquivadoMotivo as Contato["arquivadoMotivo"],
			pessoaId: data.pessoaId,
			estagioAtualizadoEm: toIso(data.estagioAtualizadoEm ?? null),
			criadoEm: toIso(data.criadoEm ?? null),
			ativo: data.ativo,
		};
	});

	const mensagens: Mensagem[] = mensagensSnapshot.docs.map((doc) => {
		const data = doc.data() as MensagemDoc;
		return {
			id: doc.id,
			categoria: data.categoria as Mensagem["categoria"],
			titulo: data.titulo,
			texto: data.texto,
			ativo: data.ativo,
		};
	});

	return (
		<div>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<CopilotoInput />
				<div className="flex items-center gap-2">
					<select
						disabled
						className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground opacity-70"
					>
						<option>Curso: todos</option>
					</select>
					<NovoContatoDialog />
				</div>
			</div>

			<Tabs defaultValue="comunicacao" className="mb-4">
				<TabsList className="bg-transparent p-0">
					<TabsTrigger
						value="comunicacao"
						className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
					>
						Comunicação
					</TabsTrigger>
					<TabsTrigger
						value="financeiro"
						disabled
						className="ml-6 rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
					>
						Financeiro
					</TabsTrigger>
				</TabsList>
			</Tabs>

			<Board contatos={contatos} mensagens={mensagens} />
		</div>
	);
}
