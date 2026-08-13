import "server-only";

export interface WixEnv {
	apiKey: string;
	siteId: string;
}

export function getWixEnv(): WixEnv {
	const apiKey = process.env.API_KEY_WIX ?? "";
	const siteId = process.env.WIX_SITE_ID ?? "";

	if (!apiKey || !siteId) {
		throw new Error(
			"Wix não configurado. Preencha API_KEY_WIX e WIX_SITE_ID no .env " +
				"(gerar em manage.wix.com/account/api-keys; site ID vem da URL do dashboard do site).",
		);
	}

	return { apiKey, siteId };
}
