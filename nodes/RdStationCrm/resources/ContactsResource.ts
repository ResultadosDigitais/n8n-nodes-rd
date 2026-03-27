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

function assertHexId(value: string, label: string, context: IExecuteFunctions, itemIndex: number): string {
	const v = String(value ?? '').trim();
	if (!/^[0-9a-f]{24}$/i.test(v)) {
		throw new NodeOperationError(context.getNode(), `${label} must be a 24-hex string`, { itemIndex });
	}
	return v;
}

function quoteRdqlString(value: string): string {
	const v = value ?? '';
	// Only quote if it contains whitespace and isn't already quoted
	if (/\s/.test(v) && !/^".*"$/.test(v)) {
		// Escape quotes
		const escaped = v.replace(/"/g, '\\"');
		return `"${escaped}"`;
	}
	return v;
}

function formatRdqlDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return quoteRdqlString(value);
	const iso = date.toISOString().replace('T', ' ').replace('Z', '');
	return quoteRdqlString(iso);
}

function formatDateOnly(value: string, context: IExecuteFunctions, itemIndex: number, label: string): string {
	const raw = String(value ?? '').trim();
	if (!raw) return '';
	// If already YYYY-MM-DD, keep it
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

	// If ISO string, take date part
	if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);

	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) {
		throw new NodeOperationError(context.getNode(), `${label} must be a valid date`, { itemIndex });
	}
	return parsed.toISOString().slice(0, 10);
}

function buildContactsRdql(
	filterField: string,
	filterValue: string,
	useMatch: boolean,
	customFieldSlug: string,
	filterDateFrom: string,
	filterDateTo: string,
): string | undefined {
	if (!filterField || filterField === 'none') return undefined;

	// Date interval filters
	if (filterField === 'created_at' || filterField === 'updated_at') {
		const parts: string[] = [];
		if (hasString(filterDateFrom)) parts.push(`${filterField}:>=${formatRdqlDateTime(filterDateFrom)}`);
		if (hasString(filterDateTo)) parts.push(`${filterField}:<=${formatRdqlDateTime(filterDateTo)}`);
		return parts.length > 0 ? parts.join(';') : undefined;
	}

	// Custom field @<slug>
	if (filterField === 'customField') {
		if (!hasString(customFieldSlug)) return undefined;
		if (!hasString(filterValue)) return undefined;
		const field = `@${String(customFieldSlug).trim()}`;
		return `${field}:${quoteRdqlString(filterValue)}`;
	}

	// Other string fields
	if (!hasString(filterValue)) return undefined;
	const op = useMatch && (filterField === 'name' || filterField === 'job_title') ? ':~' : ':';
	return `${filterField}${op}${quoteRdqlString(filterValue)}`;
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
	const useMatch = context.getNodeParameter('useMatch', itemIndex, false) as boolean;
	const filterDateFrom = context.getNodeParameter('filterDateFrom', itemIndex, '') as string;
	const filterDateTo = context.getNodeParameter('filterDateTo', itemIndex, '') as string;

	const rdql = buildContactsRdql(filterField, filterValue, useMatch, customFieldSlug, filterDateFrom, filterDateTo);
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

function buildContactPayloadFromFields(
	context: IExecuteFunctions,
	itemIndex: number,
	fields: IDataObject,
): IDataObject {
	const data: IDataObject = {};

	if (hasString(fields.name)) data.name = String(fields.name).trim();
	if (hasString(fields.jobTitle)) data.job_title = String(fields.jobTitle).trim();
	if (hasString(fields.organizationId))
		data.organization_id = assertHexId(String(fields.organizationId), 'Organization ID', context, itemIndex);

	if (hasString(fields.birthday)) data.birthday = formatDateOnly(String(fields.birthday), context, itemIndex, 'Birthday');

	// emails
	const emailsUi = fields.emailsUi as IDataObject | undefined;
	const emailValues =
		(emailsUi?.emailValues as Array<{ email?: string }> | undefined) ?? [];
	if (Array.isArray(emailValues) && emailValues.length > 0) {
		const emails = emailValues
			.map((e) => (e?.email ?? '').trim())
			.filter((e) => e !== '')
			.map((email) => ({ email }));
		if (emails.length > 0) data.emails = emails;
	}

	// phones
	const phonesUi = fields.phonesUi as IDataObject | undefined;
	const phoneValues =
		(phonesUi?.phoneValues as Array<{ phone?: string; type?: string }> | undefined) ?? [];
	if (Array.isArray(phoneValues) && phoneValues.length > 0) {
		const phones = phoneValues
			.map((p) => ({
				phone: (p?.phone ?? '').trim(),
				type: p?.type ?? 'mobile',
			}))
			.filter((p) => p.phone !== '');
		if (phones.length > 0) data.phones = phones;
	}

	// social_profiles
	const socialProfilesUi = fields.socialProfilesUi as IDataObject | undefined;
	const socialProfileValues =
		(socialProfilesUi?.socialProfileValues as Array<{ type?: string; username?: string }> | undefined) ?? [];
	if (Array.isArray(socialProfileValues) && socialProfileValues.length > 0) {
		const socialProfiles = socialProfileValues
			.map((sp) => ({
				type: sp?.type ?? 'linkedin',
				username: (sp?.username ?? '').trim(),
			}))
			.filter((sp) => sp.username !== '');
		if (socialProfiles.length > 0) data.social_profiles = socialProfiles;
	}

	// legal_bases
	const legalBasesUi = fields.legalBasesUi as IDataObject | undefined;
	const legalBaseValues =
		(legalBasesUi?.legalBaseValues as Array<{ category?: string; type?: string; status?: string }> | undefined) ?? [];
	if (Array.isArray(legalBaseValues) && legalBaseValues.length > 0) {
		const legalBases = legalBaseValues
			.map((lb) => ({
				category: lb?.category ?? 'communications',
				type: lb?.type ?? 'consent',
				status: lb?.status ?? 'granted',
			}))
			.filter((lb) => lb.category && lb.type && lb.status);
		if (legalBases.length > 0) data.legal_bases = legalBases;
	}

	// custom_fields
	const customFieldsUi = fields.customFieldsUi as IDataObject | undefined;
	const customFieldValues =
		(customFieldsUi?.customFieldValues as Array<{ slug?: string; value?: string }> | undefined) ?? [];
	if (Array.isArray(customFieldValues) && customFieldValues.length > 0) {
		const customFields: IDataObject = {};
		for (const entry of customFieldValues) {
			const slug = (entry?.slug ?? '').trim();
			if (!slug) continue;
			customFields[slug] = entry?.value ?? '';
		}
		if (Object.keys(customFields).length > 0) data.custom_fields = customFields;
	}

	return data;
}

export async function executeContacts(context: IExecuteFunctions, itemIndex: number): Promise<IDataObject | IDataObject[]> {
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
				url: `${baseUrl}/contacts`,
				qs,
				headers: {
					accept: 'application/json',
				},
			};

			const response = await rdCrmRequest<RdCrmListResponse | IDataObject[] | IDataObject>(context, options, itemIndex);

			// continueOnFail: return error item(s)
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
		const contactId = assertHexId(context.getNodeParameter('contactId', itemIndex) as string, 'Contact ID', context, itemIndex);

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl}/contacts/${contactId}`,
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
		const jobTitle = context.getNodeParameter('jobTitle', itemIndex, '') as string;
		const organizationId = context.getNodeParameter('organizationId', itemIndex, '') as string;
		const additionalFields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

		const fields: IDataObject = { ...additionalFields, name, jobTitle, organizationId };

		const data = buildContactPayloadFromFields(context, itemIndex, fields);

		if (!hasString(data.name as string)) {
			throw new NodeOperationError(context.getNode(), 'Name is required', { itemIndex });
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${baseUrl}/contacts`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: {
				data,
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject[] | IDataObject>(context, options, itemIndex);

		if (Array.isArray(response)) return response;

		return extractDataObject(response);
	}

	if (operation === 'update') {
		const contactId = assertHexId(context.getNodeParameter('contactId', itemIndex) as string, 'Contact ID', context, itemIndex);
		const updateFields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;

		const data = buildContactPayloadFromFields(context, itemIndex, updateFields);

		const options: IHttpRequestOptions = {
			method: 'PUT',
			url: `${baseUrl}/contacts/${contactId}`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: {
				data,
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject[] | IDataObject>(context, options, itemIndex);

		if (Array.isArray(response)) return response;

		return extractDataObject(response);
	}

	throw new NodeOperationError(context.getNode(), `The operation "${operation}" is not supported for Contacts`, {
		itemIndex,
	});
}
