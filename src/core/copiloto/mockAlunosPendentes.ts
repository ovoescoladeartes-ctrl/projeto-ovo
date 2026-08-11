export interface AlunoPendente {
	nome: string;
	motivo: string;
}

/**
 * Simula o resultado de uma consulta ao financeiro (recebimentos com status
 * "pendente") — o answerEngine monta a frase de resposta a partir desta lista,
 * em vez de uma string fixa, pra já deixar o formato pronto pra virar uma
 * consulta real no v5.
 */
export const mockAlunosPendentes: AlunoPendente[] = [
	{ nome: "Carlos Menezes", motivo: "Pix" },
	{ nome: "Rita Souza", motivo: "falha no cartão" },
	{ nome: "Jorge Lima", motivo: "boleto vencido" },
];
