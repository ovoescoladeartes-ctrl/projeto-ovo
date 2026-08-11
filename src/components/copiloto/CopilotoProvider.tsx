"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { gerarResposta } from "@/core/copiloto/answerEngine";
import type { CopilotoMessage } from "@/core/copiloto/types";

interface CopilotoContextValue {
	messages: CopilotoMessage[];
	isDrawerOpen: boolean;
	isThinking: boolean;
	openDrawer: () => void;
	closeDrawer: () => void;
	submitQuestion: (pergunta: string) => void;
}

const CopilotoContext = createContext<CopilotoContextValue | null>(null);

function proximoId(contador: React.MutableRefObject<number>): string {
	contador.current += 1;
	return `msg-${contador.current}`;
}

export function CopilotoProvider({ children }: { children: React.ReactNode }): React.ReactElement {
	const [messages, setMessages] = useState<CopilotoMessage[]>([]);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isThinking, setIsThinking] = useState(false);
	const idCounter = useRef(0);

	const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
	const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

	const submitQuestion = useCallback((pergunta: string) => {
		const textoLimpo = pergunta.trim();
		if (textoLimpo === "") {
			return;
		}

		setIsDrawerOpen(true);
		setMessages((atual) => [
			...atual,
			{ id: proximoId(idCounter), role: "user", texto: textoLimpo },
		]);
		setIsThinking(true);

		setTimeout(() => {
			const resposta = gerarResposta(textoLimpo);
			setMessages((atual) => [
				...atual,
				{ id: proximoId(idCounter), role: "assistant", ...resposta },
			]);
			setIsThinking(false);
		}, 700);
	}, []);

	return (
		<CopilotoContext.Provider
			value={{
				messages,
				isDrawerOpen,
				isThinking,
				openDrawer,
				closeDrawer,
				submitQuestion,
			}}
		>
			{children}
		</CopilotoContext.Provider>
	);
}

export function useCopiloto(): CopilotoContextValue {
	const context = useContext(CopilotoContext);
	if (context === null) {
		throw new Error("useCopiloto precisa ser usado dentro de um CopilotoProvider");
	}
	return context;
}
