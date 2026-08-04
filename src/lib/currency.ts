/** Dinheiro sempre em centavos inteiros — nunca float. Ver decisões técnicas do plano v1. */

export function formatCentavos(valorCentavos: number): string {
	return (valorCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Aceita "150", "150,50" ou "1.234,56" (formato BR). Retorna `null` se inválido. */
export function parseCentavosInput(valor: string): number | null {
	const bruto = valor.trim();
	if (bruto === "") {
		return null;
	}

	const normalizado = bruto.replace(/\./g, "").replace(",", ".");
	const numero = Number(normalizado);

	if (!Number.isFinite(numero) || numero < 0) {
		return null;
	}

	return Math.round(numero * 100);
}
