import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getRdCrmBaseUrl } from '../Helpers';

interface RdCrmListResponse {
	data?: IDataObject[];
	has_more?: boolean;
}

interface RdCrmObjectResponse {
	data?: IDataObject;
}

interface Pipeline {
	id: string;
	name?: string;
	order?: number;
}

interface Stage {
	id: string;
	name?: string;
	order?: number;
}

interface PipelineListResponse {
	data?: Pipeline[];
}

interface StageListResponse {
	data?: Stage[];
}

interface DealGetResponse {
	data?: {
		id?: string;
		pipeline_id?: string;
		stage_id?: string;
	} & IDataObject;
}

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
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getResponseData(response: unknown): unknown {
	if (!isObject(response)) return undefined;
	return response.data;
}

function quoteRdqlString(value: string): string {
	// RDQL supports quotes for strings with spaces/special chars.
	// Escape backslashes and double quotes.
	const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `"${escaped}"`;
}

function buildRdql(filterField: string, filterValue: string, useMatch: boolean, customFieldSlug?: string): string {
	const rawValue = (filterValue ?? '').trim();

	if (!rawValue) return '';

	if (filterField === 'customField') {
		const slug = (customFieldSlug ?? '').trim();
		if (!slug) return '';
		const v = rawValue.includes(' ') ? quoteRdqlString(rawValue) : rawValue;
		return `@${slug}:${v}`;
	}

	if (filterField === 'name') {
		const v = rawValue.includes(' ') ? quoteRdqlString(rawValue) : rawValue;
		return useMatch ? `name:~${v}` : `name:${v}`;
	}

	// Boolean pseudo-field (has:product) expects true/false
	if (filterField === 'has:product') {
		const v = rawValue.toLowerCase();
		return `has:product:${v === 'false' ? 'false' : 'true'}`;
	}

	// Strings: quote if needed
	const v = rawValue.includes(' ') ? quoteRdqlString(rawValue) : rawValue;
	return `${filterField}:${v}`;
}

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function formatRdqlDateTime(input: string): string {
	const d = new Date(input);
	if (Number.isNaN(d.getTime())) return '""';
	const yyyy = d.getFullYear();
	const mm = pad2(d.getMonth() + 1);
	const dd = pad2(d.getDate());
	const hh = pad2(d.getHours());
	const mi = pad2(d.getMinutes());
	const ss = pad2(d.getSeconds());
	// RDQL DateTime examples use "YYYY-MM-DD HH:MM:SS"
	return `"${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}"`;
}

function formatRdqlDate(input: string): string {
	const d = new Date(input);
	if (Number.isNaN(d.getTime())) return '';
	const yyyy = d.getFullYear();
	const mm = pad2(d.getMonth() + 1);
	const dd = pad2(d.getDate());
	return `${yyyy}-${mm}-${dd}`;
}



function buildListQuery(
	returnAll: boolean,
	limit: number,
	pageSize: number,
	filterField: string,
	filterValue: string,
	filterIds: string[],
	filterRatingFrom: number,
	filterRatingTo: number,
	filterDateFrom: string,
	filterDateTo: string,
	filterValueBoolean: boolean,
	useMatch: boolean,
	customFieldSlug: string,
	sortField: string,
	sortDirection: string,
): IDataObject {
	const qs: IDataObject = {};

	// Pagination (JSON:API style)
	const size = Math.max(1, Math.min(200, pageSize || 25));
	qs['page[size]'] = size;
	qs['page[number]'] = 1;

	// RDQL filter
	let rdql = '';

	if (filterField === 'id') {
		const ids = (filterIds ?? []).map((v) => String(v).trim()).filter((v) => v.length);
		if (ids.length) rdql = `id:(${ids.join(',')})`;
	} else if (filterField === 'rating') {
		const from = Number(filterRatingFrom ?? 0);
		const to = Number(filterRatingTo ?? 0);

		// Avoid applying an accidental 0-0 range when the user hasn't set anything yet
		if (!(from === 0 && to === 0)) {
			const parts: string[] = [];
			if (!Number.isNaN(from)) parts.push(`rating:>=${Math.trunc(from)}`);
			if (!Number.isNaN(to)) parts.push(`rating:<=${Math.trunc(to)}`);
			rdql = parts.join(' ');
		}
	} else if (filterField === 'closed_at' || filterField === 'created_at' || filterField === 'updated_at') {
		const parts: string[] = [];
		if ((filterDateFrom ?? '').trim()) parts.push(`${filterField}:>=${formatRdqlDateTime(filterDateFrom)}`);
		if ((filterDateTo ?? '').trim()) parts.push(`${filterField}:<=${formatRdqlDateTime(filterDateTo)}`);
		rdql = parts.join(' ');
	} else if (filterField === 'expected_close_date') {
		const parts: string[] = [];
		const from = (filterDateFrom ?? '').trim();
		const to = (filterDateTo ?? '').trim();
		if (from) parts.push(`${filterField}:>=${formatRdqlDate(from)}`);
		if (to) parts.push(`${filterField}:<=${formatRdqlDate(to)}`);
		rdql = parts.join(' ');
	} else if (filterField === 'has:product') {
		// The API exposes this as a pseudo-field. Using it as a presence filter is the most reliable.
		rdql = filterValueBoolean ? 'has:product' : '-has:product';
	} else if (filterField && filterField !== 'none') {
		rdql = buildRdql(filterField, filterValue ?? '', useMatch, customFieldSlug);
	}

	if (rdql) qs.filter = rdql;

	// Sorting (JSON:API style sort)
	if (sortField && sortField !== 'none') {
		// RD CRM expects deep-object syntax: sort[field]=asc|desc
		qs.sort = {
			[sortField]: sortDirection === 'desc' ? 'desc' : 'asc',
		};
	}

	// returnAll/limit are handled by caller (pagination loop), but keep qs consistent
	if (!returnAll) {
		// We'll stop after `limit` items, but still fetch by pages.
		qs.__limit = Math.max(1, limit || 1);
	}

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

async function rdCrmRequestLoadOptions<T = unknown>(
	context: ILoadOptionsFunctions,
	options: IHttpRequestOptions,
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
		const statusCode = requestError.statusCode ?? requestError.response?.status;
		const responseBody = requestError.response?.body ?? requestError.response?.data ?? requestError.description;
		throw new NodeOperationError(context.getNode(), `Failed to load options (HTTP ${statusCode ?? '???'})`, {
			description:
				typeof responseBody === 'string'
					? responseBody
					: responseBody
						? JSON.stringify(responseBody)
						: undefined,
		});
	}
}

function assertHexId(value: string, label: string, context: IExecuteFunctions, itemIndex: number): string {
	const v = (value ?? '').trim();
	if (!/^[0-9a-f]{24}$/i.test(v)) {
		throw new NodeOperationError(context.getNode(), `${label} must be a 24-hex string`, { itemIndex });
	}
	return v;
}

/**
 * Load Options Methods (export these and wire them in your node class)
 *
 * Example in RdStationCrm.node.ts:
 *
 * loadOptionsMethods = {
 *   ...dealsLoadOptionsMethods,
 * };
 */
export const dealsLoadOptionsMethods = {
	async getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const baseUrl = await getRdCrmBaseUrl(this);

		const response = await rdCrmRequestLoadOptions<PipelineListResponse>(this, {
			method: 'GET',
			url: `${baseUrl}/pipelines`,
			qs: {
				'page[number]': 1,
				'page[size]': 200,
			},
			headers: { accept: 'application/json' },
		});

		const pipelines = Array.isArray(response?.data) ? response.data : [];
		return pipelines
			.map((p) => ({
				name: p.name ? String(p.name) : p.id,
				value: p.id,
				description: typeof p.order === 'number' ? `Order: ${p.order}` : undefined,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	},

	async getPipelineStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const baseUrl = await getRdCrmBaseUrl(this);

		const pipelineIdRaw = this.getNodeParameter('movePipelineId', 0) as string;
		const pipelineId = (pipelineIdRaw ?? '').trim();
		if (!/^[0-9a-f]{24}$/i.test(pipelineId)) return [];

		const response = await rdCrmRequestLoadOptions<StageListResponse>(this, {
			method: 'GET',
			url: `${baseUrl}/pipelines/${pipelineId}/stages`,
			qs: {
				'page[number]': 1,
				'page[size]': 200,
			},
			headers: { accept: 'application/json' },
		});

		const stages = Array.isArray(response?.data) ? response.data : [];
		return stages
			.map((s) => ({
				name: s.name ? String(s.name) : s.id,
				value: s.id,
				description: typeof s.order === 'number' ? `Order: ${s.order}` : undefined,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	},

	async getCreatePipelineStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const baseUrl = await getRdCrmBaseUrl(this);

		const pipelineIdRaw = this.getNodeParameter('pipelineId', 0) as string;
		const pipelineId = (pipelineIdRaw ?? '').trim();
		if (!/^[0-9a-f]{24}$/i.test(pipelineId)) return [];

		const response = await rdCrmRequestLoadOptions<StageListResponse>(this, {
			method: 'GET',
			url: `${baseUrl}/pipelines/${pipelineId}/stages`,
			qs: {
				'page[number]': 1,
				'page[size]': 200,
			},
			headers: { accept: 'application/json' },
		});

		const stages = Array.isArray(response?.data) ? response.data : [];
		return stages
			.map((s) => ({
				name: s.name ? String(s.name) : s.id,
				value: s.id,
				description: typeof s.order === 'number' ? `Order: ${s.order}` : undefined,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	},


	async getDealStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const baseUrl = await getRdCrmBaseUrl(this);

		const dealIdRaw = this.getNodeParameter('dealId', 0) as string;
		const dealId = (dealIdRaw ?? '').trim();
		if (!/^[0-9a-f]{24}$/i.test(dealId)) return [];

		// 1) Get deal to discover its current pipeline
		const dealRes = await rdCrmRequestLoadOptions<DealGetResponse>(this, {
			method: 'GET',
			url: `${baseUrl}/deals/${dealId}`,
			headers: { accept: 'application/json' },
		});

		const pipelineId = String(dealRes?.data?.pipeline_id ?? '').trim();
		if (!/^[0-9a-f]{24}$/i.test(pipelineId)) return [];

		// 2) List stages in that pipeline
		const stageRes = await rdCrmRequestLoadOptions<StageListResponse>(this, {
			method: 'GET',
			url: `${baseUrl}/pipelines/${pipelineId}/stages`,
			qs: {
				'page[number]': 1,
				'page[size]': 200,
			},
			headers: { accept: 'application/json' },
		});

		const stages = Array.isArray(stageRes?.data) ? stageRes.data : [];
		return stages
			.map((s) => ({
				name: s.name ? String(s.name) : s.id,
				value: s.id,
				description: typeof s.order === 'number' ? `Order: ${s.order}` : undefined,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	},
};

/**
 * Deals resource executor
 * Operations supported in this file:
 * - getAll: GET /deals
 * - update: PUT /deals/{id}
 */
export async function executeDeals(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	const baseUrl = await getRdCrmBaseUrl(context, itemIndex);

	if (operation !== 'getAll' && operation !== 'update' && operation !== 'create') {
		throw new NodeOperationError(context.getNode(), `Unsupported operation: ${operation}`, { itemIndex });
	}

	
	if (operation === 'create') {
		const nameRaw = context.getNodeParameter('name', itemIndex) as string;
		const name = (nameRaw ?? '').trim();
		if (!name) {
			throw new NodeOperationError(context.getNode(), 'Name is required', { itemIndex });
		}

		const ownerIdRaw = context.getNodeParameter('ownerId', itemIndex) as string;
		const ownerId = assertHexId(ownerIdRaw, 'Owner ID', context, itemIndex);

		const pipelineIdRaw = context.getNodeParameter('pipelineId', itemIndex, '') as string;
		const stageIdRaw = context.getNodeParameter('stageId', itemIndex, '') as string;

		const additionalFields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

		const data: IDataObject = {
			name,
			status: 'ongoing',
		};

		const hasString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
		const hasNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);

		// Status is restricted on create
		if (hasString(additionalFields.status) && String(additionalFields.status) !== 'ongoing') {
			throw new NodeOperationError(context.getNode(), 'On create, Status must be "ongoing"', { itemIndex });
		}

		// Required
		data.owner_id = ownerId;

		// Strings
		if (hasString(additionalFields.sourceId)) data.source_id = String(additionalFields.sourceId).trim();
		if (hasString(additionalFields.campaignId)) data.campaign_id = String(additionalFields.campaignId).trim();
		if (hasString(additionalFields.organizationId)) data.organization_id = String(additionalFields.organizationId).trim();

		// expected_close_date (format: YYYY-MM-DD)
		if (hasString(additionalFields.expectedCloseDate)) {
			const raw = String(additionalFields.expectedCloseDate).trim();
			if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
				throw new NodeOperationError(context.getNode(), 'Expected Close Date must be in YYYY-MM-DD format', {
					itemIndex,
				});
			}
			data.expected_close_date = raw;
		}

		// Numbers
		if (hasNumber(additionalFields.rating)) data.rating = additionalFields.rating;
		if (hasNumber(additionalFields.recurrencePrice)) data.recurrence_price = additionalFields.recurrencePrice;
		if (hasNumber(additionalFields.oneTimePrice)) data.one_time_price = additionalFields.oneTimePrice;

		// contact_ids (array)
		const contactIds = (additionalFields.contactIds as string[] | undefined)?.filter(Boolean);
		if (Array.isArray(contactIds) && contactIds.length > 0) {
			data.contact_ids = contactIds.map((c) => String(c).trim()).filter((c) => c !== '');
		}

		// custom_fields (object with slug keys)
		const customFieldsUi = additionalFields.customFieldsUi as IDataObject | undefined;
		const customFieldValues =
			(customFieldsUi?.customFieldValues as Array<{ slug?: string; value?: string }> | undefined) ?? [];
		if (Array.isArray(customFieldValues) && customFieldValues.length > 0) {
			const customFields: IDataObject = {};
			for (const entry of customFieldValues) {
				const slug = (entry?.slug ?? '').trim();
				if (!slug) continue;
				customFields[slug] = entry?.value ?? '';
			}
			if (Object.keys(customFields).length > 0) {
				data.custom_fields = customFields;
			}
		}

		// distribution_settings (write-only)
		const distributionSettings = additionalFields.distributionSettings as IDataObject | undefined;
		if (distributionSettings && Object.keys(distributionSettings).length > 0) {
			const ds: IDataObject = {};
			if (hasString(distributionSettings.distributionStageId))
				ds.stage_id = String(distributionSettings.distributionStageId).trim();
			if (hasString(distributionSettings.distributionRuleType))
				ds.rule_type = String(distributionSettings.distributionRuleType);
			if (hasString(distributionSettings.distributionRuleId))
				ds.rule_id = String(distributionSettings.distributionRuleId).trim();
			if (hasString(distributionSettings.distributionRuleEmail))
				ds.rule_email = String(distributionSettings.distributionRuleEmail).trim();

			if (Object.keys(ds).length > 0) data.distribution_settings = ds;
		}

		// pipeline_id / stage_id (optional)
		if (hasString(stageIdRaw) && !hasString(pipelineIdRaw)) {
			throw new NodeOperationError(context.getNode(), 'Pipeline must be set when Stage is set', { itemIndex });
		}
		if (hasString(pipelineIdRaw)) {
			data.pipeline_id = assertHexId(pipelineIdRaw, 'Pipeline ID', context, itemIndex);
		}
		if (hasString(stageIdRaw)) {
			data.stage_id = assertHexId(stageIdRaw, 'Stage ID', context, itemIndex);
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${baseUrl}/deals`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: {
				data,
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject[] | IDataObject>(
			context,
			options,
			itemIndex,
		);

		// If continueOnFail returned debug item array
		if (Array.isArray(response)) return response;

		// Prefer JSON:API envelope { data: {...} }, but support raw objects too
		const responseData = getResponseData(response);
		if (isObject(responseData)) {
			return responseData;
		}
		return (response as unknown as IDataObject) ?? {};
	}

if (operation === 'update') {
		const dealId = assertHexId(context.getNodeParameter('dealId', itemIndex) as string, 'Deal ID', context, itemIndex);
		const updateFields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;

		// Move options (user-friendly dropdowns)
		const moveMode = context.getNodeParameter('moveMode', itemIndex, 'none') as string;
		const moveStageIdRaw = context.getNodeParameter('moveStageId', itemIndex, '') as string;
		const movePipelineIdRaw = context.getNodeParameter('movePipelineId', itemIndex, '') as string;
		const movePipelineStageIdRaw = context.getNodeParameter('movePipelineStageId', itemIndex, '') as string;

		const data: IDataObject = {};

		const hasString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
		const hasNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);

		// Strings
		if (hasString(updateFields.name)) data.name = updateFields.name.trim();
		if (hasString(updateFields.status)) data.status = updateFields.status;
		if (hasString(updateFields.ownerId)) data.owner_id = updateFields.ownerId.trim();
		if (hasString(updateFields.sourceId)) data.source_id = updateFields.sourceId.trim();
		if (hasString(updateFields.campaignId)) data.campaign_id = updateFields.campaignId.trim();
		if (hasString(updateFields.lostReasonId)) data.lost_reason_id = updateFields.lostReasonId.trim();
		if (hasString(updateFields.organizationId)) data.organization_id = updateFields.organizationId.trim();

		// expected_close_date (format: YYYY-MM-DD)
		if (hasString(updateFields.expectedCloseDate)) {
			const raw = updateFields.expectedCloseDate.trim();
			if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
				throw new NodeOperationError(context.getNode(), 'Expected Close Date must be in YYYY-MM-DD format', {
					itemIndex,
				});
			}
			data.expected_close_date = raw;
		}

		// Numbers
		if (hasNumber(updateFields.rating)) data.rating = updateFields.rating;
		if (hasNumber(updateFields.recurrencePrice)) data.recurrence_price = updateFields.recurrencePrice;
		if (hasNumber(updateFields.oneTimePrice)) data.one_time_price = updateFields.oneTimePrice;

		// contact_ids (array)
		const contactIds = (updateFields.contactIds as string[] | undefined)?.filter(Boolean);
		if (Array.isArray(contactIds) && contactIds.length > 0) {
			data.contact_ids = contactIds.map((c) => String(c).trim()).filter((c) => c !== '');
		}

		// custom_fields (object with slug keys)
		const customFieldsUi = updateFields.customFieldsUi as IDataObject | undefined;
		const customFieldValues =
			(customFieldsUi?.customFieldValues as Array<{ slug?: string; value?: string }> | undefined) ?? [];
		if (Array.isArray(customFieldValues) && customFieldValues.length > 0) {
			const customFields: IDataObject = {};
			for (const entry of customFieldValues) {
				const slug = (entry?.slug ?? '').trim();
				if (!slug) continue;
				customFields[slug] = entry?.value ?? '';
			}
			if (Object.keys(customFields).length > 0) {
				data.custom_fields = customFields;
			}
		}

		// distribution_settings (write-only)
		const distributionSettings = updateFields.distributionSettings as IDataObject | undefined;
		if (distributionSettings && Object.keys(distributionSettings).length > 0) {
			const ds: IDataObject = {};
			if (hasString(distributionSettings.distributionStageId))
				ds.stage_id = String(distributionSettings.distributionStageId).trim();
			if (hasString(distributionSettings.distributionRuleType))
				ds.rule_type = String(distributionSettings.distributionRuleType);
			if (hasString(distributionSettings.distributionRuleId))
				ds.rule_id = String(distributionSettings.distributionRuleId).trim();
			if (hasString(distributionSettings.distributionRuleEmail))
				ds.rule_email = String(distributionSettings.distributionRuleEmail).trim();

			if (Object.keys(ds).length > 0) data.distribution_settings = ds;
		}

		// Move deal (pipeline_id / stage_id)
		if (moveMode === 'stage') {
			const stageId = assertHexId(moveStageIdRaw, 'Stage ID', context, itemIndex);
			data.stage_id = stageId;
		} else if (moveMode === 'pipeline') {
			const pipelineId = assertHexId(movePipelineIdRaw, 'Pipeline ID', context, itemIndex);
			const stageId = assertHexId(movePipelineStageIdRaw, 'Stage ID', context, itemIndex);
			data.pipeline_id = pipelineId;
			data.stage_id = stageId;
		}

		if (Object.keys(data).length === 0) {
			throw new NodeOperationError(context.getNode(), 'Nothing to update: set at least one field or move option', {
				itemIndex,
			});
		}

		const options: IHttpRequestOptions = {
			method: 'PUT',
			url: `${baseUrl}/deals/${dealId}`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: {
				data,
			},
		};

		const response = await rdCrmRequest<RdCrmObjectResponse | IDataObject[] | IDataObject>(
			context,
			options,
			itemIndex,
		);

		// If continueOnFail returned debug item array
		if (Array.isArray(response)) return response;

		// Prefer JSON:API envelope { data: {...} }, but support raw objects too
		const responseData = getResponseData(response);
		if (isObject(responseData)) {
			return responseData;
		}
		return (response as unknown as IDataObject) ?? {};
	}

	// getAll
	const returnAll = context.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = context.getNodeParameter('limit', itemIndex, 50) as number;
	const pageSize = context.getNodeParameter('pageSize', itemIndex, 25) as number;

	const filterField = context.getNodeParameter('filterField', itemIndex, 'none') as string;
	const filterValue = context.getNodeParameter('filterValue', itemIndex, '') as string;
	const filterIds = context.getNodeParameter('filterIds', itemIndex, []) as string[];
	const filterRatingFrom = context.getNodeParameter('filterRatingFrom', itemIndex, 0) as number;
	const filterRatingTo = context.getNodeParameter('filterRatingTo', itemIndex, 0) as number;
	const filterDateFrom = context.getNodeParameter('filterDateFrom', itemIndex, '') as string;
	const filterDateTo = context.getNodeParameter('filterDateTo', itemIndex, '') as string;
	const filterValueBoolean = context.getNodeParameter('filterValueBoolean', itemIndex, true) as boolean;
	const useMatch = context.getNodeParameter('useMatch', itemIndex, false) as boolean;
	const customFieldSlug = context.getNodeParameter('customFieldSlug', itemIndex, '') as string;

	const sortField = context.getNodeParameter('sortField', itemIndex, 'none') as string;
	const sortDirection = context.getNodeParameter('sortDirection', itemIndex, 'desc') as string;

	const qs = buildListQuery(
		returnAll,
		limit,
		pageSize,
		filterField,
		filterValue,
		filterIds,
		filterRatingFrom,
		filterRatingTo,
		filterDateFrom,
		filterDateTo,
		filterValueBoolean,
		useMatch,
		customFieldSlug,
		sortField,
		sortDirection,
	);

	const results: IDataObject[] = [];
	let pageNumber = 1;
	const maxItems = returnAll ? Infinity : Math.max(1, limit || 1);

	while (results.length < maxItems) {
		qs['page[number]'] = pageNumber;

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl}/deals`,
			qs,
			headers: {
				accept: 'application/json',
			},
		};

		const response = await rdCrmRequest<RdCrmListResponse | IDataObject[]>(context, options, itemIndex);

		// If continueOnFail returned debug item array
		if (Array.isArray(response)) return response;

		const items = Array.isArray(response?.data) ? response.data : [];
		results.push(...items);

		const hasMore = Boolean(response?.has_more);
		if (!hasMore) break;

		pageNumber += 1;
		if (pageNumber > 999) break;
	}

	return results.slice(0, maxItems);
}
