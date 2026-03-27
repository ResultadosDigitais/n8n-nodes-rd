import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getRdCrmBaseUrl, rdCrmRequest } from '../Helpers';

async function listGeneric(
	context: IExecuteFunctions, 
	itemIndex: number, 
	baseUrl: string,
	endpoint: string, 
	responseKey: string | null
): Promise<IDataObject[]> {
	const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = context.getNodeParameter('limit', itemIndex, 50) as number;
	
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${baseUrl}${endpoint}`,
		json: true,
	};

	const response = await rdCrmRequest(context, 'rdStationCrmApi', options);

	if ((response as IDataObject)._error_debug) return [response as IDataObject];

	let batch: IDataObject[] = [];
	if (response && typeof response === 'object') {
		if (responseKey && Array.isArray((response as IDataObject)[responseKey])) {
			batch = (response as IDataObject)[responseKey] as IDataObject[];
		} else if (Array.isArray(response)) {
			batch = response as IDataObject[];
		} else {
			batch = [response as IDataObject];
		}
	}

	if (!returnAll) {
		return batch.slice(0, limit);
	}

	return batch;
}

export async function executeMetadata(
	context: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	const baseUrl = await getRdCrmBaseUrl(context, i);
	
	if (operation === 'getPipelines') {
		return listGeneric(context, i, baseUrl, '/pipelines', null); 
	} 
	else if (operation === 'getCustomFields') {
		return listGeneric(context, i, baseUrl, '/custom_fields', 'custom_fields');
	} 
	else if (operation === 'getUsers') {
	
		return listGeneric(context, i, baseUrl, '/users', 'users');
	} 
	else if (operation === 'getDealSources') {
		return listGeneric(context, i, baseUrl, '/sources', 'sources');
	}
	else {
		throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
	}
}
