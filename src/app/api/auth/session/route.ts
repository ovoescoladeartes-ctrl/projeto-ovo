import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SESSION_COOKIE_NAME } from "@/core/auth/sessionCookie";
import { getFirebaseAdminAuth } from "@/core/firebase/firebaseAdmin";

const sessionRequestSchema = z.object({
	idToken: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
	const body: unknown = await request.json();
	const parsed = sessionRequestSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: { code: "VALIDATION_ERROR", message: "idToken é obrigatório." } },
			{ status: 400 },
		);
	}

	try {
		// Confirma que o token é válido antes de gravar o cookie de sessão.
		await getFirebaseAdminAuth().verifyIdToken(parsed.data.idToken);
	} catch {
		return NextResponse.json(
			{ error: { code: "UNAUTHORIZED", message: "Token inválido ou expirado." } },
			{ status: 401 },
		);
	}

	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE_NAME, parsed.data.idToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60, // 1h — alinhado à validade do ID token do Firebase.
	});

	return NextResponse.json({ status: "ok" });
}

export async function DELETE(): Promise<Response> {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_COOKIE_NAME);
	return NextResponse.json({ status: "ok" });
}
