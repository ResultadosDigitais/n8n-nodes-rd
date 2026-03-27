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

function parseBooleanLike(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value === 'string') {
		const v = value.trim().toLowerCase();
		if (['true', '1', 'yes', 'y', 'sim'].includes(v)) return true;
		if (['false', '0', 'no', 'n', 'nao', 'não'].includes(v)) return false;
	}
	return undefined;
}

function parseNumberLike(value: unknown): number | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		let s = value.trim();
		s = s.replace(/[^0-9,.-]/g, '');
		if (!s) return undefined;

		const lastComma = s.lastIndexOf(',');
		const lastDot = s.lastIndexOf('.');
		if (lastComma !== -1 && lastDot !== -1) {
			if (lastComma > lastDot) {
				s = s.replace(/\./g, '').replace(/,/g, '.');
			} else {
				s = s.replace(/,/g, '');
			}
		} else if (lastComma !== -1) {
			s = s.replace(/,/g, '.');
		}

		const n = Number(s);
		return Number.isFinite(n) ? n : undefined;
	}
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}

function assertHexId(value: string, label: string, context: IExecuteFunctions, itemIndex: number): string {
	const v = String(value ?? '').trim();
	if (!/^[0-9a-f]{24}$/i.test(v)) {
		throw new NodeOperationError(context.getNode(), `${label} must be a 24-hex string`, { itemIndex });
	}
	return v;
}

function quoteRdqlString(value: string): string {
	const v = value ?? '';
	if (/\s/.test(v) && !/^".*"$/.test(v)) {
		const escaped = v.replace(/"/g, '\\"');
		return `"${escaped}"`;
	}
	return v;
}

function buildProductsRdql(
	filterField: string,
	filterValue: string,
	customFieldSlug: string,
	filterVisible: boolean,
): string {
	const field = (filterField ?? 'none').trim();
	const value = (filterValue ?? '').trim();
	const slug = (customFieldSlug ?? '').trim();

	if (!field || field === 'none') return '';

	if (field === 'name') {
		if (!value) return '';
		return `name:${quoteRdqlString(value)}`;
	}

	if (field === 'is:visible') {
		return `is:visible:${filterVisible ? 'true' : 'false'}`;
	}

	if (field === 'customField') {
		if (!slug || !value) return '';
		return `@${slug}:${quoteRdqlString(value)}`;
	}

	return '';
}

function buildListQuery(
	context: IExecuteFunctions,
	itemIndex: number,
	pageNumber: number,
	pageSize: number,
): IDataObject {
	const qs: IDataObject = {};

	const filterField = context.getNodeParameter('filterField', itemIndex, 'none') as string;
	const filterValue = context.getNodeParameter('filterValue', itemIndex, '') as string;
	const customFieldSlug = context.getNodeParameter('customFieldSlug', itemIndex, '') as string;
	const filterVisible = context.getNodeParameter('filterVisible', itemIndex, true) as boolean;

	const rdql = buildProductsRdql(filterField, filterValue, customFieldSlug, filterVisible);
	if (rdql) qs.filter = rdql;

	const sortField = context.getNodeParameter('sortField', itemIndex, 'none') as string;
	const sortDirection = context.getNodeParameter('sortDirection', itemIndex, 'asc') as string;

	if (sortField && sortField !== 'none') {
		const prefix = sortDirection === 'asc' ? '' : '-';
		qs.sort = `${prefix}${sortField}`;
	}

	qs['page[number]'] = pageNumber;
	qs['page[size]'] = pageSize;

	return qs;
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

function buildProductPayloadFromFields(
	context: IExecuteFunctions,
	itemIndex: number,
	fields: IDataObject,
): IDataObject {
	const data: IDataObject = {};

	if (hasString(fields.name)) data.name = String(fields.name).trim();
	if (hasString(fields.description)) data.description = String(fields.description).trim();

	const parsedPrice = parseNumberLike(fields.price);
	if (parsedPrice !== undefined) {
		if (!Number.isFinite(parsedPrice)) {
			throw new NodeOperationError(context.getNode(), 'Price must be a valid number', { itemIndex });
		}
		data.price = parsedPrice;
	}

	const parsedVisible = parseBooleanLike(fields.visible);
	if (parsedVisible !== undefined) {
		data.visible = parsedVisible;
	}

	const customFieldsUi = fields.customFieldsUi as IDataObject | undefined;
	const entries =
		(customFieldsUi?.customFieldValues as Array<{ slug?: string; value?: string }> | undefined) ?? [];

	if (Array.isArray(entries) && entries.length > 0) {
		const customFields: IDataObject = {};
		for (const entry of entries) {
			const slug = (entry?.slug ?? '').trim();
			if (!slug) continue;
			customFields[slug] = entry?.value ?? '';
		}
		if (Object.keys(customFields).length > 0) data.custom_fields = customFields;
	}

	return data;
}

export async function executeProducts(context: IExecuteFunctions, itemIndex: number): Promise<IDataObject | IDataObject[]> {
	const operation = context.getNodeParameter('operation', itemIndex) as string;
	const baseUrl = await getRdCrmBaseUrl(context, itemIndex);

	if (operation === 'getAll') {
		const returnAll = context.getNodeParameter('returnAll', itemIndex, false) as boolean;
		const limit = context.getNodeParameter('limit', itemIndex, 50) as number;
		const pageSizeParam = context.getNodeParameter('pageSize', itemIndex, 50) as number;

		const pageSize = Math.max(1, Math.min(200, pageSizeParam || 50));
		const effectivePageSize = returnAll ? pageSize : Math.min(pageSize, Math.max(1, limit || 1));

		let pageNumber = 1;
		const dataToReturn: IDataObject[] = [];

		while (true) {
			const qs = buildListQuery(context, itemIndex, pageNumber, effectivePageSize);

			const options: IHttpRequestOptions = {
				method: 'GET',
				url: `${baseUrl}/products`,
				qs,
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
		const productId = assertHexId(context.getNodeParameter('productId', itemIndex) as string, 'Product ID', context, itemIndex);

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl}/products/${productId}`,
			headers: {
				accept: 'application/json',
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject>(context, options, itemIndex);
		if (isDebugResponseArray(response)) {
			return response;
		}
		return extractDataObject(response);
	}

	if (operation === 'create') {
		const name = context.getNodeParameter('name', itemIndex) as string;
		const priceInput = context.getNodeParameter('price', itemIndex) as unknown;
		const visibleInput = context.getNodeParameter('visible', itemIndex, true) as unknown;
		const additionalFields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

		const data = buildProductPayloadFromFields(context, itemIndex, {
			name,
			price: priceInput,
			visible: visibleInput,
			...additionalFields,
		} as IDataObject);

		if (!hasString(data.name)) {
			throw new NodeOperationError(context.getNode(), 'Name is required', { itemIndex });
		}
		if (data.price === undefined || !Number.isFinite(data.price as number)) {
			throw new NodeOperationError(context.getNode(), 'Price is required', { itemIndex });
		}
		if (data.visible === undefined) {
			throw new NodeOperationError(context.getNode(), 'Visible is required', { itemIndex });
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${baseUrl}/products`,
			body: {
				data,
			},
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject>(context, options, itemIndex);
		if (isDebugResponseArray(response)) {
			return response;
		}
		return extractDataObject(response);
	}

	if (operation === 'update') {
		const productId = assertHexId(context.getNodeParameter('productId', itemIndex) as string, 'Product ID', context, itemIndex);
		const updateFields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;

		const data = buildProductPayloadFromFields(context, itemIndex, updateFields);

		if (Object.keys(data).length === 0) {
			throw new NodeOperationError(context.getNode(), 'Update Fields cannot be empty. Add at least one field to update.', { itemIndex });
		}

		const getOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl}/products/${productId}`,
			headers: {
				accept: 'application/json',
			},
		};

		const existingResponse = await rdCrmRequest<RdCrmObjectResponse | IDataObject>(context, getOptions, itemIndex);
		if (isDebugResponseArray(existingResponse)) {
			return existingResponse;
		}

		const existing = extractDataObject(existingResponse);
		const writableExisting: IDataObject = {};
		if (hasString(existing.name)) writableExisting.name = String(existing.name).trim();
		if (hasString(existing.description)) writableExisting.description = String(existing.description).trim();
		if (existing.price !== undefined && existing.price !== null && existing.price !== '') {
			const n = parseNumberLike(existing.price);
			if (n !== undefined && Number.isFinite(n)) writableExisting.price = n;
		}
		const v = parseBooleanLike(existing.visible);
		if (v !== undefined) writableExisting.visible = v;
		if (isObject(existing.custom_fields) && Object.keys(existing.custom_fields as IDataObject).length > 0) {
			writableExisting.custom_fields = existing.custom_fields as IDataObject;
		}

		const merged = {
			...writableExisting,
			...data,
		};

		if (!hasString(merged.name)) {
			throw new NodeOperationError(context.getNode(), 'Name is required to update a product', { itemIndex });
		}

		const options: IHttpRequestOptions = {
			method: 'PUT',
			url: `${baseUrl}/products/${productId}`,
			body: {
				data: merged,
			},
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject>(context, options, itemIndex);
		if (isDebugResponseArray(response)) {
			return response;
		}
		return extractDataObject(response);
	}

	throw new NodeOperationError(context.getNode(), `Unsupported operation: ${operation}`, { itemIndex });
}
