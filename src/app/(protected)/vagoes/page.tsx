import type { Timestamp } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shell/PageHeader";
import { getServerSession } from "@/core/auth/getServerSession";
import type { Role } from "@/core/auth/Role";
import type { Contato } from "@/core/comunicacao/contatos/schema";
import { lerMatriculas } from "@/core/db/matriculas";
import { lerMensagensAtivas } from "@/core/db/mensagens";
import { lerTurmas } from "@/core/db/turmas";
import { getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";
import { listarInteressesAtivos } from "@/core/interesses/actions";
import { toIso } from "@/core/shared/serialize";

import { Board } from "./Board";
import { NovoContatoDialog } from "./NovoContatoDialog";
import { VagoesFiltroBar } from "./VagoesFiltroBar";

const VAGOES_ROLES: readonly Role[] = ["admin", "comunicacao"];

interface InteracaoContatoDoc {
	texto: string;
	criadoEm: string;
	autorNome: string;
}

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
	linkReferencia?: string | null;
	observacoes?: string | null;
	historico?: InteracaoContatoDoc[];
}

interface VagoesPageProps {
	searchParams: Promise<{ interesse?: string; contato?: string }>;
}

export default async function VagoesPage({ searchParams }: VagoesPageProps): Promise<React.ReactElement> {
	const session = await getServerSession();

	// Autorização checada de novo aqui (não só na sidebar) — cada rota protege a si mesma.
	if (session === null || !VAGOES_ROLES.includes(session.role)) {
		redirect("/");
	}

	const filtros = await searchParams;

	// Contatos continua leitura direta (não `lerContatosAtivos()`) — é o único consumidor que
	// precisa de `historico`, de propósito fora do repositório cacheado (ver `src/core/db/contatos.ts`).
	// Uma única query, agrupada em memória nos 6 baldes visuais (ver src/core/comunicacao/buckets.ts).
	// Exige o índice composto (ativo ASC, estagioAtualizadoEm ASC) — se o Firestore ainda não tiver
	// esse índice, o erro traz um link para criá-lo automaticamente no Console.
	const [contatosSnapshot, mensagensLidas, opcoesInteresse] = await Promise.all([
		getFirebaseAdminFirestore().collection("contatos").where("ativo", "==", true).orderBy("estagioAtualizadoEm", "asc").get(),
		lerMensagensAtivas(),
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
			linkReferencia: data.linkReferencia ?? null,
			observacoes: data.observacoes ?? null,
			historico: data.historico ?? [],
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
		const [matriculasAtivas, todasTurmas] = await Promise.all([lerMatriculas(), lerTurmas()]);

		const nomeTurmaPorId = new Map(todasTurmas.map((turma) => [turma.id, turma.nome]));

		matriculasAtivas
			.filter((matricula) => matricula.status === "ativa")
			.forEach((matricula) => {
				if (cursoAtualPorPessoaId.has(matricula.pessoaId)) {
					return;
				}
				const nomeTurma = nomeTurmaPorId.get(matricula.turmaId);
				if (nomeTurma !== undefined) {
					cursoAtualPorPessoaId.set(matricula.pessoaId, nomeTurma);
				}
			});
	}

	const contatosComCurso: Contato[] = contatos.map((contato) => {
		const cursoAtual = contato.pessoaId !== null ? cursoAtualPorPessoaId.get(contato.pessoaId) : undefined;
		return cursoAtual !== undefined ? { ...contato, interesseInicial: cursoAtual } : contato;
	});

	const cta = (
		<>
			<Suspense fallback={null}>
				<VagoesFiltroBar opcoesInteresse={opcoesInteresse} />
			</Suspense>
			<NovoContatoDialog opcoesInteresse={opcoesInteresse} />
		</>
	);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<PageHeader breadcrumb={[{ label: "Dashboard", href: "/" }, { label: "Vagões" }]} title="Vagões" cta={cta} />

			<div className="min-h-0 flex-1">
				<Board
					contatos={contatosComCurso}
					mensagens={mensagensLidas}
					opcoesInteresse={opcoesInteresse}
					contatoIdInicial={filtros.contato ?? null}
				/>
			</div>
		</div>
	);
}
