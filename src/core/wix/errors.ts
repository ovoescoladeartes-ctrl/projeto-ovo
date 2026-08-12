export class WixApiError extends Error {
	readonly httpStatus: number;
	readonly wixErrorCode: string | null;

	constructor(httpStatus: number, message: string, wixErrorCode: string | null = null) {
		super(message);
		this.name = "WixApiError";
		this.httpStatus = httpStatus;
		this.wixErrorCode = wixErrorCode;
	}
}
