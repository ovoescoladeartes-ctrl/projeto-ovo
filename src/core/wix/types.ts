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

export const wixProductSchema = z.object({
	id: z.string(),
	name: z.string(),
	productType: z.string().optional(),
	price: z.object({ price: z.number(), currency: z.string().optional() }).optional(),
});
export type WixProduct = z.infer<typeof wixProductSchema>;

export const wixProductsQueryResponseSchema = z.object({
	products: z.array(wixProductSchema).default([]),
	totalResults: z.number().optional(),
	metadata: z.object({ items: z.number().optional(), offset: z.number().optional() }).optional(),
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
