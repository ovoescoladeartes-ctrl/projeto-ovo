import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CopilotoInput } from "@/components/dashboard/CopilotoInput";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { Contato } from "@/core/comunicacao/contatos/schema";
import type { Mensagem } from "@/core/comunicacao/mensagens/schema";
import { CAIXA_ROLES } from "@/core/dashboard/consultas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { listarInteressesAtivos } from "@/core/interesses/actions";
import { toIso } from "@/core/shared/serialize";
import { cn } from "@/lib/utils";

import { Board } from "./Board";
import { NovoContatoDialog } from "./NovoContatoDialog";
import { VagoesFiltroBar } from "./VagoesFiltroBar";

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
	interesses?: string[];
}

interface MensagemDoc {
	categoria: string;
	titulo: string;
	texto: string;
	ativo: boolean;
}

interface VagoesPageProps {
	searchParams: Promise<{ interesse?: string }>;
}

export default async function VagoesPage({ searchParams }: VagoesPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		redirect("/");
	}

	const podeVerFinanceiro = CAIXA_ROLES.includes(session.role);
	const filtros = await searchParams;
	const firestore = getFirebaseAdminFirestore();

	// Uma única query, agrupada em memória nos 6 baldes visuais (ver src/core/comunicacao/buckets.ts).
	// Exige o índice composto (ativo ASC, estagioAtualizadoEm ASC) — se o Firestore ainda não tiver
	// esse índice, o erro traz um link para criá-lo automaticamente no Console.
	const [contatosSnapshot, mensagensSnapshot, opcoesInteresse] = await Promise.all([
		firestore.collection("contatos").where("ativo", "==", true).orderBy("estagioAtualizadoEm", "asc").get(),
		firestore.collection("mensagens").where("ativo", "==", true).get(),
		listarInteressesAtivos(),
	]);

	let contatos: Contato[] = contatosSnapshot.docs.map((doc) => {
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
			interesses: data.interesses ?? [],
		};
	});

	if (filtros.interesse) {
		contatos = contatos.filter((contato) => contato.interesses.includes(filtros.interesse as string));
	}

	// Card mostra "o curso" — antes de convertido é o interesseInicial (o que a pessoa
	// perguntou); a partir de convertido, o dado que importa é o curso em que ela está
	// matriculada de verdade, então buscamos isso via matriculas/turmas e sobrescrevemos
	// só pra exibição (o interesseInicial original continua intacto no Firestore).
	const pessoaIdsConvertidos = contatos
		.filter((contato) => contato.estagio === "convertido" && contato.pessoaId !== null)
		.map((contato) => contato.pessoaId as string);

	const cursoAtualPorPessoaId = new Map<string, string>();

	if (pessoaIdsConvertidos.length > 0) {
		const [matriculasSnapshot, turmasSnapshot] = await Promise.all([
			firestore.collection("matriculas").where("status", "==", "ativa").get(),
			firestore.collection("turmas").get(),
		]);

		const nomeTurmaPorId = new Map(
			turmasSnapshot.docs.map((doc) => [doc.id, (doc.data() as { nome: string }).nome]),
		);

		matriculasSnapshot.docs.forEach((doc) => {
			const data = doc.data() as { pessoaId: string; turmaId: string };
			if (cursoAtualPorPessoaId.has(data.pessoaId)) {
				return;
			}
			const nomeTurma = nomeTurmaPorId.get(data.turmaId);
			if (nomeTurma !== undefined) {
				cursoAtualPorPessoaId.set(data.pessoaId, nomeTurma);
			}
		});
	}

	const contatosComCurso: Contato[] = contatos.map((contato) => {
		const cursoAtual = contato.pessoaId !== null ? cursoAtualPorPessoaId.get(contato.pessoaId) : undefined;
		return cursoAtual !== undefined ? { ...contato, interesseInicial: cursoAtual } : contato;
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
		<div className="flex h-full min-h-0 flex-col">
			<div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Vagões</h1>
				<CopilotoInput />
				<div className="flex shrink-0 items-center gap-2">
					<Suspense fallback={null}>
						<VagoesFiltroBar opcoesInteresse={opcoesInteresse} />
					</Suspense>
					<NovoContatoDialog opcoesInteresse={opcoesInteresse} />
				</div>
			</div>

			<Tabs defaultValue="comunicacao" className="mb-6">
				<TabsList className="bg-transparent p-0">
					{podeVerFinanceiro ? (
						<TabsTrigger
							value="financeiro"
							disabled
							className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
						>
							Financeiro
						</TabsTrigger>
					) : null}
					<TabsTrigger
						value="comunicacao"
						className={cn(
							"rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none",
							podeVerFinanceiro && "ml-6",
						)}
					>
						Comunicação
					</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="min-h-0 flex-1">
				<Board contatos={contatosComCurso} mensagens={mensagens} />
			</div>
		</div>
	);
}
