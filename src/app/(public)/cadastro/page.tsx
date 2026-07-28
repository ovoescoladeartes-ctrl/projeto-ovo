"use client";

import { type FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";

import { getFirebaseAuth } from "@/core/firebase/firebaseClient";

function mensagemDeErro(error: unknown): string {
	const code = (error as FirebaseError | undefined)?.code;
	switch (code) {
		case "auth/email-already-in-use":
			return "Já existe uma conta com esse e-mail.";
		case "auth/invalid-email":
			return "E-mail inválido.";
		case "auth/weak-password":
			return "A senha precisa ter pelo menos 6 caracteres.";
		default:
			return "Não foi possível concluir o cadastro. Tente novamente.";
	}
}

export default function CadastroPage(): React.ReactElement {
	const [nome, setNome] = useState("");
	const [email, setEmail] = useState("");
	const [senha, setSenha] = useState("");
	const [confirmarSenha, setConfirmarSenha] = useState("");
	const [carregando, setCarregando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [cadastroConcluido, setCadastroConcluido] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setErro(null);

		if (senha !== confirmarSenha) {
			setErro("As senhas não coincidem.");
			return;
		}

		setCarregando(true);

		try {
			const credencial = await createUserWithEmailAndPassword(getFirebaseAuth(), email, senha);
			await updateProfile(credencial.user, { displayName: nome });
			// Força atualização do token para incluir o nome recém-definido no profile.
			const idToken = await credencial.user.getIdToken(true);

			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken, nome }),
			});

			if (!response.ok) {
				setErro("Conta criada, mas houve um problema ao salvar seus dados. Fale com um admin.");
				return;
			}

			setCadastroConcluido(true);
		} catch (error) {
			setErro(mensagemDeErro(error));
		} finally {
			setCarregando(false);
		}
	}

	if (cadastroConcluido) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
				<div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
					<h1 className="mb-2 text-lg font-semibold text-slate-900 sm:text-xl">
						Cadastro recebido
					</h1>
					<p className="mb-6 text-sm text-slate-500">
						Sua conta foi criada. Um admin precisa liberar seu acesso antes de você conseguir
						entrar nos módulos do sistema.
					</p>
					<Link
						href="/login"
						className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
					>
						Ir para o login
					</Link>
				</div>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<h1 className="mb-1 text-lg font-semibold text-slate-900 sm:text-xl">Criar conta</h1>
				<p className="mb-6 text-sm text-slate-500">Cadastre-se para solicitar acesso ao sistema.</p>

				<form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<label htmlFor="nome" className="text-sm font-medium text-slate-700">
							Nome
						</label>
						<input
							id="nome"
							name="nome"
							type="text"
							autoComplete="name"
							required
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
						/>
					</div>

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
							autoComplete="new-password"
							required
							minLength={6}
							value={senha}
							onChange={(event) => setSenha(event.target.value)}
							className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label htmlFor="confirmarSenha" className="text-sm font-medium text-slate-700">
							Confirmar senha
						</label>
						<input
							id="confirmarSenha"
							name="confirmarSenha"
							type="password"
							autoComplete="new-password"
							required
							minLength={6}
							value={confirmarSenha}
							onChange={(event) => setConfirmarSenha(event.target.value)}
							className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
						/>
					</div>

					{erro !== null ? <p className="text-sm text-red-600">{erro}</p> : null}

					<button
						type="submit"
						disabled={carregando}
						className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
					>
						{carregando ? "Criando conta..." : "Criar conta"}
					</button>

					<p className="text-center text-sm text-slate-500">
						Já tem conta?{" "}
						<Link href="/login" className="font-medium text-slate-900 underline">
							Entrar
						</Link>
					</p>
				</form>
			</div>
		</main>
	);
}
