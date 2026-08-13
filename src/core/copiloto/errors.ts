export class GeminiApiError extends Error {
	readonly httpStatus: number;

	constructor(httpStatus: number, message: string) {
		super(message);
		this.name = "GeminiApiError";
		this.httpStatus = httpStatus;
	}
}
