import { z } from "zod";

// Schemas defensivos — validam só o subconjunto de campos que este projeto consome
// das respostas da Wix (API externa, shape real tem dezenas de campos irrelevantes
// aqui, confirmados batendo na API real em scripts/wix-spike.ts).

export const wixContactSchema = z.object({
	id: z.string(),
	info: z
		.object({
			name: z.object({ first: z.string().optional(), last: z.string().optional() }).optional(),
		})
		.optional(),
	primaryInfo: z
		.object({
			email: z.string().optional(),
			phone: z.string().optional(),
		})
		.optional(),
});
export type WixContact = z.infer<typeof wixContactSchema>;

export const wixContactsQueryResponseSchema = z.object({
	contacts: z.array(wixContactSchema).default([]),
	pagingMetadata: z
		.object({
			offset: z.number().optional(),
			total: z.number().optional(),
			hasNext: z.boolean().optional(),
		})
		.optional(),
});

// Stores Catalog V3 — a Wix migrou o site da Ovo de V1 pra V3 (set/2026; V1 passou
// a responder 501 "This Catalog V1 operation is not supported for sites using
// Catalog V3"). IDs de produto foram preservados na migração. Preço vem como
// string decimal em actualPriceRange (min = max quando não há variantes).
export const wixProductSchema = z.object({
	id: z.string(),
	name: z.string(),
	productType: z.string().optional(),
	actualPriceRange: z
		.object({ minValue: z.object({ amount: z.string() }).nullish() })
		.nullish(),
});
export type WixProduct = z.infer<typeof wixProductSchema>;

export const wixProductsQueryResponseSchema = z.object({
	products: z.array(wixProductSchema).default([]),
	pagingMetadata: z
		.object({
			cursors: z.object({ next: z.string().nullish() }).optional(),
			hasNext: z.boolean().optional(),
		})
		.optional(),
});

export const wixOrderLineItemSchema = z.object({
	id: z.string(),
	catalogReference: z.object({ catalogItemId: z.string().optional() }).optional(),
	price: z.object({ amount: z.string() }).optional(),
	productName: z.object({ original: z.string().optional() }).optional(),
});
export type WixOrderLineItem = z.infer<typeof wixOrderLineItemSchema>;

export const wixOrderSchema = z.object({
	id: z.string(),
	number: z.string().optional(),
	status: z.string(),
	paymentStatus: z.string(),
	createdDate: z.string().optional(),
	buyerInfo: z.object({ contactId: z.string().optional(), email: z.string().optional() }).optional(),
	lineItems: z.array(wixOrderLineItemSchema).default([]),
});
export type WixOrder = z.infer<typeof wixOrderSchema>;

export const wixOrdersSearchResponseSchema = z.object({
	orders: z.array(wixOrderSchema).default([]),
	metadata: z
		.object({
			cursors: z.object({ next: z.string().optional() }).optional(),
			hasNext: z.boolean().optional(),
			total: z.number().optional(),
		})
		.optional(),
});
