import type { INodeProperties } from 'n8n-workflow';

const webhookEventOptions: Array<{ name: string; value: string }> = [
	{ name: 'Campaign Created', value: 'crm_campaign_created' },
	{ name: 'Campaign Deleted', value: 'crm_campaign_deleted' },
	{ name: 'Campaign Updated', value: 'crm_campaign_updated' },
	{ name: 'Contact Created', value: 'crm_contact_created' },
	{ name: 'Contact Deleted', value: 'crm_contact_deleted' },
	{ name: 'Contact Updated', value: 'crm_contact_updated' },
	{ name: 'Deal Created', value: 'crm_deal_created' },
	{ name: 'Deal Deleted', value: 'crm_deal_deleted' },
	{ name: 'Deal Updated', value: 'crm_deal_updated' },
	{ name: 'Lost Reason Created', value: 'crm_lost_reason_created' },
	{ name: 'Lost Reason Deleted', value: 'crm_lost_reason_deleted' },
	{ name: 'Lost Reason Updated', value: 'crm_lost_reason_updated' },
	{ name: 'Organization Created', value: 'crm_organization_created' },
	{ name: 'Organization Deleted', value: 'crm_organization_deleted' },
	{ name: 'Organization Updated', value: 'crm_organization_updated' },
	{ name: 'Product Created', value: 'crm_product_created' },
	{ name: 'Product Deleted', value: 'crm_product_deleted' },
	{ name: 'Product Updated', value: 'crm_product_updated' },
	{ name: 'Source Created', value: 'crm_source_created' },
	{ name: 'Source Deleted', value: 'crm_source_deleted' },
	{ name: 'Source Updated', value: 'crm_source_updated' },
	{ name: 'Task Created', value: 'crm_task_created' },
	{ name: 'Task Deleted', value: 'crm_task_deleted' },
	{ name: 'Task Updated', value: 'crm_task_updated' },
];

export const webhooksDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 200 },
		default: 25,
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['getAll'],
			},
		},
		description: 'Number of records fetched per request',
	},
	{
		displayName: 'Webhook ID',
		name: 'webhookId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '00000000-0000-0000-0000-000000000000',
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'Webhook ID (UUID)',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['create'],
			},
		},
		description: 'Webhook display name',
	},
	{
		displayName: 'Event Name',
		name: 'eventName',
		type: 'options',
		options: webhookEventOptions,
		default: 'crm_contact_created',
		required: true,
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['create'],
			},
		},
		description: 'Event that triggers this webhook',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/webhook',
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['create'],
			},
		},
		description: 'Destination URL for webhook delivery',
	},
	{
		displayName: 'HTTP Method',
		name: 'httpMethod',
		type: 'options',
		options: [{ name: 'POST', value: 'POST' }],
		default: 'POST',
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['create'],
			},
		},
		description: 'HTTP method used by RD Station CRM',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['create'],
			},
		},
		description: 'Optional authentication settings',
		options: [
			{
				displayName: 'Authentication Header',
				name: 'authHeader',
				type: 'string',
				default: '',
				placeholder: 'X-RD-Webhook-Key',
			},
			{
				displayName: 'Authentication Key',
				name: 'authKey',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['webhooks'],
				operation: ['update'],
			},
		},
		description: 'Fields to update',
		options: [
			{
				displayName: 'Authentication Header',
				name: 'authHeader',
				type: 'string',
				default: '',
				placeholder: 'X-RD-Webhook-Key',
			},
			{
				displayName: 'Authentication Key',
				name: 'authKey',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
			},
			{
				displayName: 'Event Name',
				name: 'eventName',
				type: 'options',
				options: webhookEventOptions,
				default: 'crm_contact_created',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [{ name: 'POST', value: 'POST' }],
				default: 'POST',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/webhook',
			},
		],
	},
];
