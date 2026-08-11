export interface CopilotoCta {
	label: string;
	href: string;
}

export interface CopilotoMessage {
	id: string;
	role: "user" | "assistant";
	texto: string;
	cta?: CopilotoCta;
}
