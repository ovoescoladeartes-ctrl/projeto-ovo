import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { PENDING_ACCESS } from "@/core/auth/Role";
import { SESSION_COOKIE_NAME } from "@/core/auth/sessionCookie";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/core/firebase/firebaseAdmin";

const registerRequestSchema = z.object({
	idToken: z.string().min(1),
	nome: z.string().trim().min(1, "Nome é obrigatório."),
});

/**
 * Cria o registro do usuário no Firestore após o cadastro no Firebase Auth.
 * NÃO atribui role real — role é uma decisão de acesso (constitution.md §5) e só pode
 * ser definida por um admin, via `scripts/set-role.ts` (bootstrap do primeiro admin,
 * quando ainda não há ninguém com acesso à UI) ou via `/admin/usuarios` (uso normal).
 * Enquanto isso, o usuário fica com `role: "pendente"` — autenticado mas sem acesso
 * a nenhum módulo protegido.
 */
export async function POST(request: Request): Promise<Response> {
	const body: unknown = await request.json();
	const parsed = registerRequestSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: "VALIDATION_ERROR",
					message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
				},
			},
			{ status: 400 },
		);
	}

	let uid: string;
	let email: string | null;

	try {
		const decoded = await getFirebaseAdminAuth().verifyIdToken(parsed.data.idToken);
		uid = decoded.uid;
		email = decoded.email ?? null;
	} catch {
		return NextResponse.json(
			{ error: { code: "UNAUTHORIZED", message: "Token inválido ou expirado." } },
			{ status: 401 },
		);
	}

	const usuarioRef = getFirebaseAdminFirestore().collection("users").doc(uid);
	const usuarioExistente = await usuarioRef.get();

	if (!usuarioExistente.exists) {
		await usuarioRef.set({
			nome: parsed.data.nome,
			email,
			role: PENDING_ACCESS,
			criadoEm: FieldValue.serverTimestamp(),
			atualizadoEm: FieldValue.serverTimestamp(),
		});
	}

	// Mantém o usuário autenticado após o cadastro — sem role ainda, então nenhuma
	// rota/tela protegida abre até um admin liberar o acesso (ver (protected)/layout.tsx).
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE_NAME, parsed.data.idToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60,
	});

	return NextResponse.json({ status: "ok" });
}
