import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getRdCrmBaseUrl, rdCrmRequest } from '../Helpers';

type RdCrmListResponse = {
	data?: IDataObject[];
	links?: IDataObject;
	has_more?: boolean;
};

type RdCrmObjectResponse = {
	data?: IDataObject;
	links?: IDataObject;
};

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: unknown): value is string {
	return typeof value === 'string' && value.trim() !== '';
}

function quoteRdqlString(value: string): string {
	const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `"${escaped}"`;
}

function formatRdqlDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return quoteRdqlString(value);
	const iso = date.toISOString().replace('T', ' ').replace('Z', '');
	return quoteRdqlString(iso);
}

function removeEmpty(obj: IDataObject): IDataObject {
	const cleaned: IDataObject = {};

	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null) continue;
		if (typeof value === 'string' && value.trim() === '') continue;
		if (Array.isArray(value) && value.length === 0) continue;

		cleaned[key] = value;
	}

	return cleaned;
}

function parseCsvIds(value?: string): string[] | undefined {
	if (!value || typeof value !== 'string') return undefined;

	const ids = value
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);

	return ids.length ? ids : undefined;
}

function buildTasksRdql(
	filterField: string,
	filterValue: string,
	filterType: string,
	filterStatus: string,
	filterOwnerIds: string[],
	filterDateFrom: string,
	filterDateTo: string,
): string | undefined {
	if (!filterField || filterField === 'none') return undefined;

	if (filterField === 'completed_at' || filterField === 'due_date') {
		const parts: string[] = [];
		if (hasString(filterDateFrom)) parts.push(`${filterField}:>=${formatRdqlDateTime(filterDateFrom)}`);
		if (hasString(filterDateTo)) parts.push(`${filterField}:<=${formatRdqlDateTime(filterDateTo)}`);
		return parts.length > 0 ? parts.join(' ') : undefined;
	}

	if (filterField === 'owner_ids') {
		const ids = (filterOwnerIds ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0);
		if (ids.length === 0) return undefined;
		return `owner_ids:(${ids.join(',')})`;
	}

	if (filterField === 'type') {
		return hasString(filterType) ? `type:${filterType}` : undefined;
	}

	if (filterField === 'status') {
		return hasString(filterStatus) ? `status:${filterStatus}` : undefined;
	}

	if (filterField === 'deal_id') {
		const value = (filterValue ?? '').trim();
		if (!value) return undefined;
		return `deal_id:${value.includes(' ') ? quoteRdqlString(value) : value}`;
	}

	return undefined;
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
	const filterType = context.getNodeParameter('filterType', itemIndex, 'task') as string;
	const filterStatus = context.getNodeParameter('filterStatus', itemIndex, 'open') as string;
	const filterOwnerIds = context.getNodeParameter('filterOwnerIds', itemIndex, []) as string[];
	const filterDateFrom = context.getNodeParameter('filterDateFrom', itemIndex, '') as string;
	const filterDateTo = context.getNodeParameter('filterDateTo', itemIndex, '') as string;
	const sortField = context.getNodeParameter('sortField', itemIndex, 'none') as string;
	const sortDirection = context.getNodeParameter('sortDirection', itemIndex, 'asc') as string;

	const rdql = buildTasksRdql(
		filterField,
		filterValue,
		filterType,
		filterStatus,
		filterOwnerIds,
		filterDateFrom,
		filterDateTo,
	);
	if (rdql) qs.filter = rdql;

	if (sortField && sortField !== 'none') {
		qs.sort = {
			[sortField]: sortDirection === 'desc' ? 'desc' : 'asc',
		};
	}

	qs.page = {
		number: pageNumber,
		size: pageSize,
	};

	return qs;
}

function extractDataArray(response: unknown): IDataObject[] {
	if (isObject(response) && Array.isArray((response as IDataObject).data)) {
		return (response as IDataObject).data as IDataObject[];
	}
	if (Array.isArray(response)) return response as IDataObject[];
	return [];
}

function extractDataObject(response: unknown): IDataObject {
	if (isObject(response) && isObject((response as IDataObject).data)) {
		return (response as IDataObject).data as IDataObject;
	}
	if (isObject(response)) return response as IDataObject;
	return {};
}

function responseHasNextPage(response: unknown): boolean {
	if (!isObject(response)) return false;
	if (Object.prototype.hasOwnProperty.call(response, 'has_more')) {
		return Boolean((response as IDataObject).has_more);
	}
	const links = (response as IDataObject).links;
	if (isObject(links) && links.next) return true;
	return false;
}

export async function executeTasks(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
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
			const qs = buildListQuery(context, itemIndex, pageNumber, effectivePageSize);

			const options: IHttpRequestOptions = {
				method: 'GET',
				url: `${baseUrl}/tasks`,
				qs,
				headers: {
					accept: 'application/json',
				},
			};

			const response = await rdCrmRequest(
				context,
				'rdStationCrmApi',
				options,
			) as RdCrmListResponse | IDataObject[] | IDataObject;

			if (isObject(response) && (response as IDataObject)._error_debug) {
				return response as IDataObject;
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
		const taskId = context.getNodeParameter('taskId', itemIndex) as string;

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl}/tasks/${taskId}`,
			headers: {
				accept: 'application/json',
			},
		};

		const response = await rdCrmRequest(
			context,
			'rdStationCrmApi',
			options,
		) as RdCrmObjectResponse | IDataObject[] | IDataObject;

		if (isObject(response) && (response as IDataObject)._error_debug) {
			return response as IDataObject;
		}

		return extractDataObject(response);
	}

	if (operation === 'create') {
		const name = context.getNodeParameter('name', itemIndex) as string;
		const dealId = context.getNodeParameter('dealId', itemIndex) as string;
		const createdById = context.getNodeParameter('createdById', itemIndex) as string;
		const createFields = context.getNodeParameter('createFields', itemIndex, {}) as IDataObject;

		const payload = removeEmpty({
			name,
			deal_id: dealId,
			created_by_id: createdById,
			description: createFields.description as string | undefined,
			type: createFields.type as string | undefined,
			due_date: createFields.dueDate as string | undefined,
			owner_ids: parseCsvIds(createFields.ownerIds as string | undefined),
		});

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${baseUrl}/tasks`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: { data: payload },
		};

		const response = await rdCrmRequest(
			context,
			'rdStationCrmApi',
			options,
		) as RdCrmObjectResponse | IDataObject[] | IDataObject;

		if (isObject(response) && (response as IDataObject)._error_debug) {
			return response as IDataObject;
		}

		return extractDataObject(response);
	}

	if (operation === 'update') {
		const taskId = context.getNodeParameter('taskId', itemIndex) as string;
		const updateFields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;

		const payload = removeEmpty({
			name: updateFields.name as string | undefined,
			description: updateFields.description as string | undefined,
			type: updateFields.type as string | undefined,
			status: updateFields.status as string | undefined,
			due_date: updateFields.dueDate as string | undefined,
			deal_id: updateFields.dealId as string | undefined,
			completed_by_id: updateFields.completedById as string | undefined,
			owner_ids: parseCsvIds(updateFields.ownerIds as string | undefined),
		});

		if (Object.keys(payload).length === 0) {
			throw new NodeOperationError(
				context.getNode(),
				'Provide at least one field to update the task.',
				{ itemIndex },
			);
		}

		const options: IHttpRequestOptions = {
			method: 'PUT',
			url: `${baseUrl}/tasks/${taskId}`,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: { data: payload },
		};

		const response = await rdCrmRequest(
			context,
			'rdStationCrmApi',
			options,
		) as RdCrmObjectResponse | IDataObject[] | IDataObject;

		if (isObject(response) && (response as IDataObject)._error_debug) {
			return response as IDataObject;
		}

		return extractDataObject(response);
	}

	throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`, {
		itemIndex,
	});
}
