import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as descriptions from './descriptions';
import * as resources from './resources';

type RdStationCrmResource =
	| 'deals'
	| 'contacts'
	| 'companies'
	| 'tasks'
	| 'metadata'
	| 'products'
	| 'webhooks';

export class RdStationCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RD Station CRM',
		name: 'rdStationCrm',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with RD Station CRM',
		icon: 'file:rdstation.svg',
		defaults: {
			name: 'RD Station CRM',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'rdStationCrmApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'deals',
				options: [
					{ name: 'Company', value: 'companies' },
					{ name: 'Contact', value: 'contacts' },
					{ name: 'Deal', value: 'deals' },
					{ name: 'Metadata (Config)', value: 'metadata' },
					{ name: 'Product', value: 'products' },
					{ name: 'Task', value: 'tasks' },
					{ name: 'Webhook', value: 'webhooks' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['deals'] } },
				default: 'getAll',
				options: [
					{ name: 'Create', value: 'create', action: 'Create a deal' },
					{ name: 'Get Many', value: 'getAll', action: 'List deals' },
					{ name: 'Update', value: 'update', action: 'Update a deal' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contacts'] } },
				default: 'getAll',
				options: [
					{ name: 'Get Many', value: 'getAll', action: 'List contacts' },
					{ name: 'Get', value: 'get', action: 'Get a contact by ID' },
					{ name: 'Create', value: 'create', action: 'Create a contact' },
					{ name: 'Update', value: 'update', action: 'Update a contact' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['companies'] } },
				default: 'getAll',
				options: [
					{ name: 'Get Many', value: 'getAll', action: 'List companies' },
					{ name: 'Get', value: 'get', action: 'Get a company by ID' },
					{ name: 'Create', value: 'create', action: 'Create a company' },
					{ name: 'Update', value: 'update', action: 'Update a company' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['tasks'] } },
				default: 'getAll',
				options: [
					{ name: 'Get Many', value: 'getAll', action: 'List tasks' },
					{ name: 'Get', value: 'get', action: 'Get a task by ID' },
					{ name: 'Create', value: 'create', action: 'Create a task' },
					{ name: 'Update', value: 'update', action: 'Update a task' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['products'] } },
				default: 'getAll',
				options: [
					{ name: 'Get Many', value: 'getAll', action: 'List products' },
					{ name: 'Get', value: 'get', action: 'Get a product' },
					{ name: 'Create', value: 'create', action: 'Create a product' },
					{ name: 'Update', value: 'update', action: 'Update a product' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['webhooks'] } },
				default: 'getAll',
				options: [
					{ name: 'Create', value: 'create', action: 'Create a webhook' },
					{ name: 'Delete', value: 'delete', action: 'Delete a webhook' },
					{ name: 'Get', value: 'get', action: 'Get a webhook by ID' },
					{ name: 'Get Many', value: 'getAll', action: 'List webhooks' },
					{ name: 'Update', value: 'update', action: 'Update a webhook' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['metadata'] } },
				default: 'getPipelines',
				options: [
					{ name: 'Get Pipelines', value: 'getPipelines', action: 'List pipelines and stages' },
					{ name: 'Get Custom Fields', value: 'getCustomFields', action: 'List deal custom fields' },
					{ name: 'Get Users', value: 'getUsers', action: 'List active users' },
					{ name: 'Get Deal Sources', value: 'getDealSources', action: 'List deal sources' },
				],
			},
			...descriptions.dealsDescription,
			...descriptions.contactsDescription,
			...descriptions.companiesDescription,
			...descriptions.tasksDescription,
			...descriptions.productsDescription,
			...descriptions.webhooksDescription,
			...descriptions.metadataDescription,
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions: {
			...resources.dealsLoadOptionsMethods,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as RdStationCrmResource;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject | IDataObject[] | undefined;

				if (resource === 'deals') {
					result = await resources.executeDeals(this, i, operation);
				} else if (resource === 'contacts') {
					result = await resources.executeContacts(this, i);
				} else if (resource === 'companies') {
					result = await resources.executeCompanies(this, i);
				} else if (resource === 'tasks') {
					result = await resources.executeTasks(this, i, operation);
				} else if (resource === 'products') {
					result = await resources.executeProducts(this, i);
				} else if (resource === 'webhooks') {
					result = await resources.executeWebhooks(this, i);
				} else if (resource === 'metadata') {
					result = await resources.executeMetadata(this, i, operation);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
				}

				if (Array.isArray(result)) {
					for (const entry of result) returnData.push(entry);
				} else if (result) {
					returnData.push(result);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message, itemIndex: i });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
