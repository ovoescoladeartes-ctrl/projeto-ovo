import { FieldValue } from "firebase-admin/firestore";

import type { ArquivadoMotivo, Canal, Estagio } from "./schema";

interface AlunoOrigem {
	id: string;
	nome: string;
	statusAluno: string;
	ativo: boolean;
}

interface ContatoDeAlunoDoc {
	nome: string;
	canal: Canal;
	interesseInicial: string;
	estagio: Estagio;
	arquivadoMotivo: ArquivadoMotivo | null;
	pessoaId: string;
	estagioAtualizadoEm: FirebaseFirestore.FieldValue;
	criadoEm: FirebaseFirestore.FieldValue;
	ativo: boolean;
}

/**
 * Todo aluno precisa aparecer no funil de Vagões, não importa a origem (cadastro manual,
 * CSV, futura API do Wix) — este é o único lugar que decide o estágio inicial do contato
 * a partir do status da pessoa, usado tanto na criação direta quanto na importação em lote.
 * Colaborador fica de fora por enquanto: quando o funil financeiro existir, ele terá sua
 * própria lógica de conversão, sem depender deste mapeamento (que é específico de aluno).
 *
 * `curso`, quando conhecido no momento da criação (ex.: coluna "turma" do CSV), vira o
 * interesseInicial — é o texto que o card mostra antes de convertido. Depois de convertido,
 * o card troca isso pelo curso da matrícula ativa (ver join em vagoes/page.tsx), então esse
 * valor aqui só importa mesmo enquanto o contato ainda não virou "Matriculado".
 */
export function contatoInicialDeAluno(aluno: AlunoOrigem, curso: string | null = null): ContatoDeAlunoDoc {
	const estagio: Estagio = aluno.statusAluno === "matriculado" ? "convertido" : "novo";

	return {
		nome: aluno.nome,
		canal: "outro",
		interesseInicial: curso ?? "",
		estagio,
		arquivadoMotivo: null,
		pessoaId: aluno.id,
		estagioAtualizadoEm: FieldValue.serverTimestamp(),
		criadoEm: FieldValue.serverTimestamp(),
		ativo: aluno.ativo,
	};
}
