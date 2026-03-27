import type { INodeProperties } from 'n8n-workflow';

export const metadataDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: true,
		displayOptions: {
			show: { resource: ['metadata'], operation: ['getPipelines', 'getUsers', 'getDealSources', 'getCustomFields'] },
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: { resource: ['metadata'], operation: ['getPipelines', 'getUsers', 'getDealSources', 'getCustomFields'], returnAll: [false] },
		},
	},
];
