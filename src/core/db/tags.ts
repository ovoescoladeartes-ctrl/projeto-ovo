import "server-only";

/**
 * Toda coleção do Firestore que o app lê, nomeada igual ao nome real da coleção — dobra como tag
 * de cache (ver `cacheDeColecao.ts`) e como vocabulário único de invalidação (`revalidar.ts`).
 */
export const COLECOES = [
	"pessoas",
	"turmas",
	"matriculas",
	"recebimentos",
	"repasses",
	"contatos",
	"mensagens",
	"interesses",
	"pendenciasManuais",
	"materiaisChecklist",
	"ritualSemanas",
	"fechamentosMensais",
	"checklistComunicacaoDias",
	"checklists",
	"checklistsPreferencias",
	"users",
] as const;

export type Colecao = (typeof COLECOES)[number];

/**
 * Rede de proteção contra um `revalidateTag` esquecido em algum write site — nunca o mecanismo
 * principal de frescor (esse é o `revalidateTag` chamado por `revalidarColecoes`). Com a base
 * atual (~500 docs no total), um refill completo de todas as coleções custa ~525 leituras; a 1h
 * isso equivale a ~4.200 leituras/dia num uso de 8h (8% da cota diária de 50k do plano Spark),
 * com folga confortável mesmo no pior caso de uso contínuo o dia todo.
 */
export const TTL_SEGUNDOS = 3600;
