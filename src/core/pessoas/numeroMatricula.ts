import "server-only";

import type { DocumentReference, Transaction } from "firebase-admin/firestore";

export type TipoNumeroMatricula = "aluno" | "professor";

const CONFIG_POR_TIPO: Record<TipoNumeroMatricula, { campo: string; prefixo: string }> = {
	aluno: { campo: "proximoNumeroAluno", prefixo: "A-" },
	professor: { campo: "proximoNumeroProfessor", prefixo: "P-" },
};

/**
 * Gera o próximo número (`A-AAAA-NNNN` pra aluno, `P-AAAA-NNNN` pra professor/colaborador) dentro
 * de uma transação Firestore já aberta. Sequencial global por tipo (não reinicia por ano) — `ano`
 * é só o ano do evento que gerou o número (primeira matrícula do aluno, ou o momento em que o
 * colaborador se torna educador de uma turma ativa pela primeira vez). Nunca reaproveita número
 * de registro arquivado, porque nunca decrementa o contador.
 *
 * Campo legado `proximoNumero` (sem prefixo, só existia pro lado aluno) é lido como fallback só
 * na primeira chamada depois do deploy, pra não reiniciar a sequência — a escrita sempre grava só
 * no campo novo (`proximoNumeroAluno`), então o campo antigo fica congelado a partir daí.
 */
export async function gerarProximoNumeroMatricula(
	tx: Transaction,
	contadorRef: DocumentReference,
	ano: number,
	tipoNumero: TipoNumeroMatricula,
): Promise<string> {
	const { campo, prefixo } = CONFIG_POR_TIPO[tipoNumero];
	const contadorDoc = await tx.get(contadorRef);
	const dados = contadorDoc.data() ?? {};
	const proximo =
		(dados[campo] as number | undefined) ??
		(tipoNumero === "aluno" ? (dados.proximoNumero as number | undefined) : undefined) ??
		1;
	tx.set(contadorRef, { [campo]: proximo + 1 }, { merge: true });
	return `${prefixo}${ano}-${String(proximo).padStart(4, "0")}`;
}
