import type { INodeProperties } from 'n8n-workflow';

const companyFilterFieldOptions: Array<{ name: string; value: string; description?: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Name', value: 'name', description: 'Filter by company name (supports match ~)' },
	{ name: 'Owner ID', value: 'owner_id', description: 'Filter by owner (user) ID' },
	{ name: 'Segment IDs', value: 'segment_ids', description: 'Filter by one or more segment IDs' },
	{ name: 'Created At', value: 'created_at', description: 'Filter by creation date/time (DateTime)' },
	{ name: 'Updated At', value: 'updated_at', description: 'Filter by last update date/time (DateTime)' },
	{ name: 'Custom Field (Slug)', value: 'customField', description: 'Filter by a custom field using @&lt;slug&gt;' },
];

const companySortFieldOptions: Array<{ name: string; value: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Name', value: 'name' },
	{ name: 'Created At', value: 'created_at' },
	{ name: 'Updated At', value: 'updated_at' },
];

export const companiesDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['companies'],
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
				resource: ['companies'],
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
				resource: ['companies'],
				operation: ['getAll'],
			},
		},
		description: 'Number of records fetched per request (RD Station paginated list)',
	},

	{
		displayName: 'Filter By',
		name: 'filterField',
		type: 'options',
		options: companyFilterFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
			},
		},
		description: 'Builds the RDQL filter parameter automatically',
	},
	{
		displayName: 'Custom Field Slug',
		name: 'customFieldSlug',
		type: 'string',
		default: '',
		placeholder: 'e.g. erp_id',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
				filterField: ['customField'],
			},
		},
		description: 'Slug of the custom field (used as @&lt;slug&gt; in RDQL)',
	},
	{
		displayName: 'Use Match (~)',
		name: 'useMatch',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
				filterField: ['name'],
			},
		},
		description: 'Whether to use case-insensitive partial match (name:~value)',
	},
	{
		displayName: 'Segment IDs',
		name: 'filterSegmentIds',
		type: 'string',
		default: [],
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Segment ID',
		},
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
				filterField: ['segment_ids'],
			},
		},
		description: 'One or more segment IDs (RDQL IN syntax: segment_ids:(id1,id2,...))',
	},
	{
		displayName: 'Filter Value',
		name: 'filterValue',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
				filterField: ['name', 'owner_id', 'customField'],
			},
		},
		description:
			'Value to filter by. If the value contains spaces, it will be quoted automatically (RDQL supports "strings with spaces").',
	},
	{
		displayName: 'Date From',
		name: 'filterDateFrom',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
				filterField: ['created_at', 'updated_at'],
			},
		},
		description: 'Start of the date interval (inclusive)',
	},
	{
		displayName: 'Date To',
		name: 'filterDateTo',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
				filterField: ['created_at', 'updated_at'],
			},
		},
		description: 'End of the date interval (inclusive)',
	},

	{
		displayName: 'Sort Field',
		name: 'sortField',
		type: 'options',
		options: companySortFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['getAll'],
			},
		},
		description: 'Field to sort results by',
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
				resource: ['companies'],
				operation: ['getAll'],
				sortField: ['name', 'created_at', 'updated_at'],
			},
		},
	},

	// ------------------------
	// GET
	// ------------------------
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		placeholder: '24-hex ID',
		required: true,
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['get', 'update'],
			},
		},
	},

	// ------------------------
	// CREATE
	// ------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['create'],
			},
		},
		description: 'Company name',
	},
	{
		displayName: 'Owner ID',
		name: 'ownerId',
		type: 'string',
		default: '',
		placeholder: '24-hex ID',
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['create'],
			},
		},
		description: 'User responsible for this company',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'addressUi',
				type: 'fixedCollection',
				default: {},
				description: 'Company address information',
				options: [
					{
						displayName: 'Address',
						name: 'addressValues',
						values: [
							{
								displayName: 'Line',
								name: 'line',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Latitude',
								name: 'latitude',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Longitude',
								name: 'longitude',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Adds entries to `custom_fields` (key = custom field slug, value = the field value as string)',
				options: [
					{
						displayName: 'Custom Field',
						name: 'customFieldValues',
						values: [
							{
								displayName: 'Slug',
								name: 'slug',
								type: 'string',
								default: '',
								placeholder: 'e.g. erp_id',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Follower IDs',
				name: 'followerIds',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Follower ID',
				},
				description: 'IDs of the users following this company',
			},
			{
				displayName: 'Segment IDs',
				name: 'segmentIds',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Segment ID',
				},
				description: 'IDs of the company segments',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com',
			},
		],
		description: 'Additional fields for the company',
	},

	// ------------------------
	// UPDATE
	// ------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['companies'],
				operation: ['update'],
			},
		},
		description: 'Fields to update',
		options: [
			{
				displayName: 'Address',
				name: 'addressUi',
				type: 'fixedCollection',
				default: {},
				description: 'Replaces the address object',
				options: [
					{
						displayName: 'Address',
						name: 'addressValues',
						values: [
							{
								displayName: 'Line',
								name: 'line',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Latitude',
								name: 'latitude',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Longitude',
								name: 'longitude',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Replaces/sets entries in `custom_fields`',
				options: [
					{
						displayName: 'Custom Field',
						name: 'customFieldValues',
						values: [
							{
								displayName: 'Slug',
								name: 'slug',
								type: 'string',
								default: '',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Follower IDs',
				name: 'followerIds',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Follower ID',
				},
				description: 'Replaces the follower_ids array',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
			},
			{
				displayName: 'Segment IDs',
				name: 'segmentIds',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Segment ID',
				},
				description: 'Replaces the segment_ids array',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com',
			},
		],
	},
];
