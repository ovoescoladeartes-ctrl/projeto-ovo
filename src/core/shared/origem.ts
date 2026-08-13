export const ORIGENS = ["wix", "manual"] as const;
export type Origem = (typeof ORIGENS)[number];
