import type { INodeProperties } from 'n8n-workflow';

const productFilterFieldOptions: Array<{ name: string; value: string; description?: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Name', value: 'name', description: 'Filter by product name (exact match only)' },
	{ name: 'Visible', value: 'is:visible', description: 'Filter by whether the product is visible' },
	{ name: 'Custom Field (Slug)', value: 'customField', description: 'Filter by a custom field using @&lt;slug&gt;' },
];

const productSortFieldOptions: Array<{ name: string; value: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Name', value: 'name' },
];

export const productsDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['products'],
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
				resource: ['products'],
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
		default: 50,
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['getAll'],
			},
		},
		description: 'Number of records fetched per request (RD Station paginated list)',
	},

	{
		displayName: 'Filter By',
		name: 'filterField',
		type: 'options',
		options: productFilterFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['getAll'],
			},
		},
		description: 'Property to filter the results (RDQL)',
	},
	{
		displayName: 'Filter Value',
		name: 'filterValue',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['getAll'],
				filterField: ['name', 'customField'],
			},
		},
		description: 'Value used in the selected filter',
	},
	{
		displayName: 'Custom Field Slug',
		name: 'customFieldSlug',
		type: 'string',
		default: '',
		placeholder: 'e.g. erp_id',
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['getAll'],
				filterField: ['customField'],
			},
		},
		description: 'Slug (key) of the custom field to filter by',
	},
	{
		displayName: 'Visible',
		name: 'filterVisible',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['getAll'],
				filterField: ['is:visible'],
			},
		},
		description: 'Whether to return visible products (disabled returns non-visible products)',
	},

	{
		displayName: 'Sort By',
		name: 'sortField',
		type: 'options',
		options: productSortFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['getAll'],
			},
		},
		description: 'Property to sort the results by',
	},
	{
		displayName: 'Sort Direction',
		name: 'sortDirection',
		type: 'options',
		options: [
			{ name: 'Ascending', value: 'asc' },
			{ name: 'Descending', value: 'desc' },
		],
		default: 'asc',
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['getAll'],
				sortField: ['name'],
			},
		},
		description: 'Direction to order the results',
	},

	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['get', 'update'],
			},
		},
		description: '24-hex ID of the product',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['create'],
			},
		},
		description: 'Product name',
	},
	{
		displayName: 'Price',
		name: 'price',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 0 },
		required: true,
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['create'],
			},
		},
		description: 'Product price',
	},
	{
		displayName: 'Visible',
		name: 'visible',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['create'],
			},
		},
		description: 'Whether the product is visible in the catalog',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Product description',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				options: [
					{
						displayName: 'Custom Field Values',
						name: 'customFieldValues',
						type: 'collection',
						default: [],
						options: [
							{
								displayName: 'Slug',
								name: 'slug',
								type: 'string',
								default: '',
								placeholder: 'e.g. erp_id',
								description: 'Custom field slug',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom field value',
							},
						],
					},
				],
				description: 'Custom fields keyed by slug',
			},
		],
	},

	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['products'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				options: [
					{
						displayName: 'Custom Field Values',
						name: 'customFieldValues',
						type: 'collection',
						default: [],
						options: [
							{
								displayName: 'Slug',
								name: 'slug',
								type: 'string',
								default: '',
								placeholder: 'e.g. erp_id',
								description: 'Custom field slug',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom field value',
							},
						],
					},
				],
				description: 'Custom fields keyed by slug',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Product description',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Product name',
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Product price',
			},
			{
				displayName: 'Visible',
				name: 'visible',
				type: 'boolean',
				default: true,
				description: 'Whether the product is visible',
			},
		],
	},
];
