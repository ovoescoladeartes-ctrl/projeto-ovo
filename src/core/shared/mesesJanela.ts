const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function labelAnoMes(anoMes: string): string {
	const [ano, mes] = anoMes.split("-") as [string, string];
	return `${MESES_ABREV[Number(mes) - 1]}/${ano.slice(2)}`;
}

export interface PontoMes {
	anoMes: string;
	label: string;
}

/** Últimos `meses` meses, do mais antigo pro mais recente (inclui o mês corrente). */
export function gerarJanelaMeses(meses: number, agora: Date): PontoMes[] {
	const janela: PontoMes[] = [];
	for (let i = meses - 1; i >= 0; i--) {
		const data = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 1));
		const anoMes = `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
		janela.push({ anoMes, label: labelAnoMes(anoMes) });
	}
	return janela;
}
