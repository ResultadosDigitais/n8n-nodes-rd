import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

type FullResponse = {
	body?: unknown;
	headers?: IDataObject;
	statusCode?: number;
	statusMessage?: string;
};

export type RdCrmEnvironment = 'production' | 'staging';

const CRM_BASE_URLS: Record<RdCrmEnvironment, string> = {
	production: 'https://api.rd.services/crm/v2',
	staging: 'https://api-staging.rd.services/crm/v2',
};

type EnvironmentContext = Pick<IExecuteFunctions, 'getCredentials'> |
	Pick<ILoadOptionsFunctions, 'getCredentials'> |
	Pick<IHookFunctions, 'getCredentials'> |
	Pick<IWebhookFunctions, 'getCredentials'>;

function normalizeEnvironment(value: unknown): RdCrmEnvironment | undefined {
	const raw = String(value ?? '').trim().toLowerCase();
	if (raw === 'production') return 'production';
	if (raw === 'staging') return 'staging';
	return undefined;
}

function inferEnvironmentFromCredential(credentials: ICredentialDataDecryptedObject): RdCrmEnvironment | undefined {
	const authUrl = String(credentials.authUrl ?? '').toLowerCase();
	const tokenUrl = String(credentials.accessTokenUrl ?? '').toLowerCase();
	const merged = `${authUrl} ${tokenUrl}`;
	if (merged.includes('staging')) return 'staging';
	if (merged.includes('api.rd.services') || merged.includes('accounts.rdstation.com')) return 'production';
	return undefined;
}

async function getCredentialsSafely(
	context: EnvironmentContext,
	itemIndex: number,
): Promise<ICredentialDataDecryptedObject | undefined> {
	try {
		return (await context.getCredentials('rdStationCrmApi', itemIndex)) as ICredentialDataDecryptedObject;
	} catch {
		try {
			return (await context.getCredentials('rdStationCrmApi')) as ICredentialDataDecryptedObject;
		} catch {
			return undefined;
		}
	}
}

export async function getRdCrmEnvironment(
	context: EnvironmentContext,
	itemIndex = 0,
): Promise<RdCrmEnvironment> {
	const credentials = await getCredentialsSafely(context, itemIndex);
	if (credentials) {
		const explicitEnv = normalizeEnvironment(credentials.environment);
		if (explicitEnv) return explicitEnv;

		const inferredEnv = inferEnvironmentFromCredential(credentials);
		if (inferredEnv) return inferredEnv;
	}

	return 'staging';
}

export async function getRdCrmBaseUrl(
	context: EnvironmentContext,
	itemIndex = 0,
): Promise<string> {
	const environment = await getRdCrmEnvironment(context, itemIndex);
	return CRM_BASE_URLS[environment];
}

export async function rdCrmRequest(
	context: IExecuteFunctions,
	credentialName: string,
	options: IHttpRequestOptions,
): Promise<IDataObject | IDataObject[]> {
	const req: IHttpRequestOptions = {
		...options,
		// Ensure we get { body, statusCode, headers } for consistent error handling.
		returnFullResponse: true,
		// Avoid throwing on HTTP errors so we can return debug payloads.
		ignoreHttpStatusErrors: true,
	};

	try {
		const res = (await context.helpers.httpRequestWithAuthentication.call(
			context,
			credentialName,
			req,
		)) as FullResponse;

		const statusCode = typeof res.statusCode === 'number' ? res.statusCode : null;
		const body = res.body ?? res;

		// HTTP error: return full debug payload.
		if (typeof statusCode === 'number' && statusCode >= 400) {
			return {
				_error_debug: true,
				message: `HTTP ${statusCode}`,
				statusCode,
				requestUrl: options.url,
				requestQs: options.qs ?? {},
				responseBody: body ?? 'No body',
			} as IDataObject;
		}

		// Success: return body only.
		return body as IDataObject | IDataObject[];
	} catch (error) {
		// Network/TLS/DNS failure: no statusCode available.
		const err = (error ?? {}) as { code?: string; message?: string };
		return {
			_error_debug: true,
			message: err?.message ?? 'Request failed (no HTTP response)',
			requestUrl: options.url,
			requestQs: options.qs ?? {},
			errorCode: err?.code ?? null,
		} as IDataObject;
	}
}
