"use client";

import { type FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { auth } from "@/core/firebase/firebaseClient";

function mensagemDeErro(error: unknown): string {
	const code = (error as FirebaseError | undefined)?.code;
	switch (code) {
		case "auth/invalid-email":
			return "E-mail inválido.";
		case "auth/invalid-credential":
		case "auth/wrong-password":
		case "auth/user-not-found":
			return "E-mail ou senha incorretos.";
		case "auth/too-many-requests":
			return "Muitas tentativas. Aguarde um pouco e tente novamente.";
		default:
			return "Não foi possível entrar. Tente novamente.";
	}
}

export default function LoginPage(): React.ReactElement {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [senha, setSenha] = useState("");
	const [carregando, setCarregando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setErro(null);
		setCarregando(true);

		try {
			const credencial = await signInWithEmailAndPassword(auth, email, senha);
			const idToken = await credencial.user.getIdToken();

			const response = await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});

			if (!response.ok) {
				setErro("Não foi possível iniciar a sessão. Tente novamente.");
				return;
			}

			router.push("/");
			router.refresh();
		} catch (error) {
			setErro(mensagemDeErro(error));
		} finally {
			setCarregando(false);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<h1 className="mb-1 text-lg font-semibold text-slate-900 sm:text-xl">OVO</h1>
				<p className="mb-6 text-sm text-slate-500">Entre com sua conta para continuar.</p>

				<form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<label htmlFor="email" className="text-sm font-medium text-slate-700">
							E-mail
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label htmlFor="senha" className="text-sm font-medium text-slate-700">
							Senha
						</label>
						<input
							id="senha"
							name="senha"
							type="password"
							autoComplete="current-password"
							required
							value={senha}
							onChange={(event) => setSenha(event.target.value)}
							className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
						/>
					</div>

					{erro !== null ? <p className="text-sm text-red-600">{erro}</p> : null}

					<button
						type="submit"
						disabled={carregando}
						className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
					>
						{carregando ? "Entrando..." : "Entrar"}
					</button>
				</form>
			</div>
		</main>
	);
}
