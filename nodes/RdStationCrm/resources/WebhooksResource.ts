import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getRdCrmBaseUrl } from '../Helpers';

type RdCrmListResponse = {
	data?: IDataObject[];
	links?: IDataObject;
	has_more?: boolean;
};

type RdCrmObjectResponse = {
	data?: IDataObject;
	links?: IDataObject;
};

type RdCrmRequestError = {
	description?: unknown;
	message?: string;
	request?: {
		href?: string;
	};
	response?: {
		body?: unknown;
		data?: unknown;
		status?: number;
	};
	statusCode?: number;
};

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getResponseData(response: unknown): unknown {
	if (!isObject(response)) return undefined;
	return response.data;
}

function isDebugResponseArray(response: unknown): response is IDataObject[] {
	return Array.isArray(response) && response.length > 0 && isObject(response[0]) && Boolean(response[0]._error_debug);
}

function hasString(value: unknown): value is string {
	return typeof value === 'string' && value.trim() !== '';
}

function assertUuid(value: string, label: string, context: IExecuteFunctions, itemIndex: number): string {
	const v = String(value ?? '').trim();
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
		throw new NodeOperationError(context.getNode(), `${label} must be a valid UUID`, { itemIndex });
	}
	return v;
}

async function rdCrmRequest<T = unknown>(
	context: IExecuteFunctions,
	options: IHttpRequestOptions,
	itemIndex: number,
): Promise<T> {
	try {
		const response = await context.helpers.httpRequestWithAuthentication.call(context, 'rdStationCrmApi', {
			...options,
			json: true,
			returnFullResponse: true,
		});

		return (response?.body ?? response) as T;
	} catch (error: unknown) {
		const requestError = (error ?? {}) as RdCrmRequestError;
		if (context.continueOnFail()) {
			return [
				{
					_error_debug: true,
					message: requestError.message ?? 'Request failed',
					statusCode: requestError.statusCode ?? requestError.response?.status,
					requestUrl: requestError.request?.href ?? options.url,
					responseBody: requestError.response?.body ?? requestError.response?.data ?? requestError.description,
				},
			] as unknown as T;
		}

		const statusCode = requestError.statusCode ?? requestError.response?.status;
		const responseBody = requestError.response?.body ?? requestError.response?.data ?? requestError.description;
		throw new NodeOperationError(
			context.getNode(),
			`HTTP ${statusCode ?? '???'} - ${requestError.message ?? 'The service was not able to process your request'}`,
			{
				itemIndex,
				description:
					typeof responseBody === 'string'
						? responseBody
						: responseBody
							? JSON.stringify(responseBody)
							: undefined,
			},
		);
	}
}

function extractDataArray(response: unknown): IDataObject[] {
	const data = getResponseData(response);
	if (Array.isArray(data)) return data as IDataObject[];
	if (Array.isArray(response)) return response as IDataObject[];
	return [];
}

function extractDataObject(response: unknown): IDataObject {
	const data = getResponseData(response);
	if (isObject(data)) return data;
	if (isObject(response)) return response as IDataObject;
	return {};
}

function responseHasNextPage(response: unknown): boolean {
	if (!isObject(response)) return false;
	if (Object.prototype.hasOwnProperty.call(response, 'has_more')) {
		return Boolean(response.has_more);
	}
	const links = response.links;
	if (isObject(links) && links.next) return true;
	return false;
}

function buildWebhookPayload(
	context: IExecuteFunctions,
	itemIndex: number,
	fields: IDataObject,
): IDataObject {
	const data: IDataObject = {};

	if (hasString(fields.name)) data.name = String(fields.name).trim();
	if (hasString(fields.eventName)) data.event_name = String(fields.eventName).trim();
	if (hasString(fields.url)) data.url = String(fields.url).trim();

	if (hasString(fields.httpMethod)) {
		const method = String(fields.httpMethod).trim().toUpperCase();
		if (method !== 'POST') {
			throw new NodeOperationError(context.getNode(), 'HTTP Method must be POST', { itemIndex });
		}
		data.http_method = method;
	}

	const authHeader = hasString(fields.authHeader) ? String(fields.authHeader).trim() : '';
	const authKey = hasString(fields.authKey) ? String(fields.authKey).trim() : '';

	if (authHeader || authKey) {
		if (!authHeader || !authKey) {
			throw new NodeOperationError(
				context.getNode(),
				'Authentication Header and Authentication Key must be provided together',
				{ itemIndex },
			);
		}
		data.auth_header = authHeader;
		data.auth_key = authKey;
	}

	return data;
}

export async function executeWebhooks(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const operation = context.getNodeParameter('operation', itemIndex) as string;
	const baseUrl = await getRdCrmBaseUrl(context, itemIndex);

	if (operation === 'getAll') {
		const returnAll = context.getNodeParameter('returnAll', itemIndex, false) as boolean;
		const limit = context.getNodeParameter('limit', itemIndex, 50) as number;
		const pageSizeParam = context.getNodeParameter('pageSize', itemIndex, 25) as number;

		const pageSize = Math.max(1, Math.min(200, pageSizeParam || 25));
		const effectivePageSize = returnAll ? pageSize : Math.min(pageSize, Math.max(1, limit || 1));

		let pageNumber = 1;
		const dataToReturn: IDataObject[] = [];

		while (true) {
			const options: IHttpRequestOptions = {
				method: 'GET',
				url: `${baseUrl}/webhooks`,
				qs: {
					page: {
						number: pageNumber,
						size: effectivePageSize,
					},
				},
				headers: {
					accept: 'application/json',
				},
			};

			const response = await rdCrmRequest<RdCrmListResponse | IDataObject[] | IDataObject>(context, options, itemIndex);

			if (isDebugResponseArray(response)) {
				return response;
			}

			const pageData = extractDataArray(response);
			if (pageData.length === 0) break;

			if (returnAll) {
				dataToReturn.push(...pageData);
			} else {
				const remaining = Math.max(0, (limit || 1) - dataToReturn.length);
				if (remaining <= 0) break;
				dataToReturn.push(...pageData.slice(0, remaining));
			}

			const hasMoreExplicit = responseHasNextPage(response);
			const hasMoreInferred = pageData.length === effectivePageSize;

			if (returnAll) {
				if (!(hasMoreExplicit || hasMoreInferred)) break;
			} else {
				if (dataToReturn.length >= (limit || 1)) break;
				if (!(hasMoreExplicit || hasMoreInferred)) break;
			}

			pageNumber += 1;
		}

		return dataToReturn;
	}

	if (operation === 'get') {
		const webhookId = assertUuid(
			context.getNodeParameter('webhookId', itemIndex) as string,
			'Webhook ID',
			context,
			itemIndex,
		);

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl}/webhooks/${webhookId}`,
			headers: {
				accept: 'application/json',
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject[] | IDataObject>(context, options, itemIndex);
		if (Array.isArray(response)) return response;
		return extractDataObject(response);
	}

	if (operation === 'create') {
		const name = context.getNodeParameter('name', itemIndex) as string;
		const eventName = context.getNodeParameter('eventName', itemIndex) as string;
		const url = context.getNodeParameter('url', itemIndex) as string;
		const httpMethod = context.getNodeParameter('httpMethod', itemIndex, 'POST') as string;
		const additionalFields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

		const payload = buildWebhookPayload(context, itemIndex, {
			name,
			eventName,
			url,
			httpMethod,
			...additionalFields,
		});

		if (!hasString(payload.name)) {
			throw new NodeOperationError(context.getNode(), 'Name is required', { itemIndex });
		}
		if (!hasString(payload.event_name)) {
			throw new NodeOperationError(context.getNode(), 'Event Name is required', { itemIndex });
		}
		if (!hasString(payload.url)) {
			throw new NodeOperationError(context.getNode(), 'URL is required', { itemIndex });
		}
		if (!hasString(payload.http_method)) {
			throw new NodeOperationError(context.getNode(), 'HTTP Method is required', { itemIndex });
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${baseUrl}/webhooks`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: {
				data: payload,
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject[] | IDataObject>(context, options, itemIndex);
		if (Array.isArray(response)) return response;
		return extractDataObject(response);
	}

	if (operation === 'update') {
		const webhookId = assertUuid(
			context.getNodeParameter('webhookId', itemIndex) as string,
			'Webhook ID',
			context,
			itemIndex,
		);
		const updateFields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;

		const payload = buildWebhookPayload(context, itemIndex, updateFields);

		if (Object.keys(payload).length === 0) {
			throw new NodeOperationError(context.getNode(), 'Nothing to update: set at least one field', { itemIndex });
		}

		const options: IHttpRequestOptions = {
			method: 'PUT',
			url: `${baseUrl}/webhooks/${webhookId}`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: {
				data: payload,
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject[] | IDataObject>(context, options, itemIndex);
		if (Array.isArray(response)) return response;
		return extractDataObject(response);
	}

	if (operation === 'delete') {
		const webhookId = assertUuid(
			context.getNodeParameter('webhookId', itemIndex) as string,
			'Webhook ID',
			context,
			itemIndex,
		);

		const options: IHttpRequestOptions = {
			method: 'DELETE',
			url: `${baseUrl}/webhooks/${webhookId}`,
			headers: {
				accept: 'application/json',
			},
		};

		const response = await rdCrmRequest<IDataObject[] | IDataObject>(context, options, itemIndex);
		if (Array.isArray(response)) return response;

		return {
			id: webhookId,
			deleted: true,
		};
	}

	throw new NodeOperationError(context.getNode(), `The operation "${operation}" is not supported for Webhooks`, {
		itemIndex,
	});
}
