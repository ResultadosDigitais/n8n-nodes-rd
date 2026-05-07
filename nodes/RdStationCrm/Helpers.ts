import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

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
