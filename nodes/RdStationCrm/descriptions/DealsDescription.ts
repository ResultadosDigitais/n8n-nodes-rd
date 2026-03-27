import type { INodeProperties } from 'n8n-workflow';

const dealFilterFieldOptions: Array<{ name: string; value: string; description?: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'ID', value: 'id', description: 'Filter by one or more deal IDs' },
	{ name: 'Name', value: 'name', description: 'Filter by deal name (supports match)' },
	{ name: 'Rating', value: 'rating', description: 'Filter by numeric rating' },
	{ name: 'Status', value: 'status', description: 'Filter by status (won, lost, ongoing, paused)' },
	{ name: 'Closed At', value: 'closed_at', description: 'Filter by deal close date/time (DateTime)' },
	{ name: 'Created At', value: 'created_at', description: 'Filter by creation date/time (DateTime)' },
	{ name: 'Updated At', value: 'updated_at', description: 'Filter by last update date/time (DateTime)' },
	{ name: 'Expected Close Date', value: 'expected_close_date', description: 'Filter by expected close date (Date)' },
	{ name: 'Organization ID', value: 'organization_id', description: 'Filter by organization ID' },
	{ name: 'Contact ID', value: 'contact_id', description: 'Filter by one or more contact IDs' },
	{ name: 'Stage ID', value: 'stage_id', description: 'Filter by pipeline stage ID' },
	{ name: 'Lost Reason ID', value: 'lost_reason_id', description: 'Filter by lost reason ID' },
	{ name: 'Campaign ID', value: 'campaign_id', description: 'Filter by campaign ID' },
	{ name: 'Owner ID', value: 'owner_id', description: 'Filter by owner (user) ID' },
	{ name: 'Pipeline ID', value: 'pipeline_id', description: 'Filter by pipeline ID' },
	{ name: 'Product IDs', value: 'product_ids', description: 'Filter by one or more product IDs' },
	{ name: 'Has Product', value: 'has:product', description: 'Filter deals that have products associated' },
	{ name: 'Custom Field (Slug)', value: 'customField', description: 'Filter by a custom field using @&lt;slug&gt;' },
];

const dealSortFieldOptions: Array<{ name: string; value: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Name', value: 'name' },
	{ name: 'Rating', value: 'rating' },
	{ name: 'Created At', value: 'created_at' },
	{ name: 'Updated At', value: 'updated_at' },
	{ name: 'Closed At', value: 'closed_at' },
];

export const dealsDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['deals'],
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
				resource: ['deals'],
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
				resource: ['deals'],
				operation: ['getAll'],
			},
		},
		description: 'Number of deals per page (API default is 25)',
	},

	{
		displayName: 'Filter By',
		name: 'filterField',
		type: 'options',
		options: dealFilterFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['deals'],
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
				resource: ['deals'],
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
				resource: ['deals'],
				operation: ['getAll'],
				filterField: ['name'],
			},
		},
		description: 'Whether to use case-insensitive partial match (name:~value)',
	},
	{
	displayName: 'Deal IDs',
	name: 'filterIds',
	type: 'string',
	default: [],
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Deal ID',
	},
	displayOptions: {
		show: {
			resource: ['deals'],
			operation: ['getAll'],
			filterField: ['id'],
		},
	},
	description: 'One or more deal IDs (RDQL IN syntax: ID:(id1,id2,...))',
},
{
	displayName: 'Filter Value',
	name: 'filterValue',
	type: 'string',
	default: '',
	displayOptions: {
		show: {
			resource: ['deals'],
			operation: ['getAll'],
			filterField: [
				'name',
				'status',
				'organization_id',
				'contact_id',
				'stage_id',
				'lost_reason_id',
				'campaign_id',
				'owner_id',
				'pipeline_id',
				'product_ids',
				'customField',
			],
		},
	},
	description:
		'Value to filter by. If the value contains spaces, it will be quoted automatically (RDQL supports "strings with spaces").',
},
{
	displayName: 'Rating From',
	name: 'filterRatingFrom',
	type: 'number',
	default: 0,
	typeOptions: { minValue: 0 },
	displayOptions: {
		show: {
			resource: ['deals'],
			operation: ['getAll'],
			filterField: ['rating'],
		},
	},
	description: 'Minimum rating (inclusive)',
},
{
	displayName: 'Rating To',
	name: 'filterRatingTo',
	type: 'number',
	default: 0,
	typeOptions: { minValue: 0 },
	displayOptions: {
		show: {
			resource: ['deals'],
			operation: ['getAll'],
			filterField: ['rating'],
		},
	},
	description: 'Maximum rating (inclusive)',
},
{
	displayName: 'Date From',
	name: 'filterDateFrom',
	type: 'dateTime',
	default: '',
	displayOptions: {
		show: {
			resource: ['deals'],
			operation: ['getAll'],
			filterField: ['closed_at', 'created_at', 'updated_at', 'expected_close_date'],
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
			resource: ['deals'],
			operation: ['getAll'],
			filterField: ['closed_at', 'created_at', 'updated_at', 'expected_close_date'],
		},
	},
	description: 'End of the date interval (inclusive)',
},
{
	displayName: 'Has Product',
	name: 'filterValueBoolean',
	type: 'boolean',
	default: true,
	displayOptions: {
		show: {
			resource: ['deals'],
			operation: ['getAll'],
			filterField: ['has:product'],
		},
	},
	description: 'Whether the deal must have products associated',
},
{
		displayName: 'Sort By',
		name: 'sortField',
		type: 'options',
		options: dealSortFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Sort Direction',
		name: 'sortDirection',
		type: 'options',
		options: [
			{ name: 'Ascending', value: 'asc' },
			{ name: 'Descending', value: 'desc' },
		],
		default: 'desc',
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['getAll'],
				sortField: ['name', 'rating', 'created_at', 'updated_at', 'closed_at'],
			},
		},
	},


	// -------- Create (POST /deals) --------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['create'],
			},
		},
		description: 'Deal name',
	},
	{
		displayName: 'Owner ID',
		name: 'ownerId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '24-hex ID',
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['create'],
			},
		},
		description: 'User (owner) ID responsible for the deal',
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPipelines',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['create'],
			},
		},
		description: 'Optional. Select the target pipeline for the new deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCreatePipelineStages',
			loadOptionsDependsOn: ['pipelineId'],
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['create'],
			},
		},
		description: 'Optional. Select the stage inside the selected pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['create'],
			},
		},
		description: 'Optional fields for deal creation',
		options: [
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
			},
			{
				displayName: 'Contact IDs',
				name: 'contactIds',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Contact ID',
				},
				description: 'Contact IDs associated with the deal',
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
				displayName: 'Distribution Settings',
				name: 'distributionSettings',
				type: 'collection',
				default: {},
				description: 'Builds `distribution_settings` (write-only) payload',
				options: [
					{
						displayName: 'Stage ID',
						name: 'distributionStageId',
						type: 'string',
						default: '',
						placeholder: '24-hex ID',
					},
					{
						displayName: 'Rule Type',
						name: 'distributionRuleType',
						type: 'options',
						default: 'owner',
						options: [
							{ name: 'All', value: 'all' },
							{ name: 'All Admins', value: 'all_admins' },
							{ name: 'All Users', value: 'all_users' },
							{ name: 'Owner', value: 'owner' },
							{ name: 'Team', value: 'team' },
							{ name: 'User', value: 'user' },
						],
					},
					{
						displayName: 'Rule ID',
						name: 'distributionRuleId',
						type: 'string',
						default: '',
						placeholder: '24-hex ID',
						description: 'User/team ID used by some rule types (optional)',
					},
					{
						displayName: 'Rule Email',
						name: 'distributionRuleEmail',
						type: 'string',
						default: '',
						placeholder: 'user@email.com',
						description: 'User email used by some rule types (optional)',
					},
				],
			},
			{
				displayName: 'Expected Close Date',
				name: 'expectedCloseDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
			},
			{
				displayName: 'One-Time Price',
				name: 'oneTimePrice',
				type: 'number',
				default: 0,
				description: 'One-time value (float)',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
				description: 'Organization/company ID associated with the deal',
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'number',
				default: 0,
				description: 'Deal rating (integer)',
			},
			{
				displayName: 'Recurring Price',
				name: 'recurrencePrice',
				type: 'number',
				default: 0,
				description: 'Recurring value (float)',
			},
			{
				displayName: 'Source ID',
				name: 'sourceId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
				description: 'Deal source ID',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'ongoing',
				options: [{ name: 'Ongoing', value: 'ongoing' }],
				description: 'On create, status must be ongoing',
			},
		],
	},

	// -------- Update (PUT /deals/{id}) --------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['update'],
			},
		},
		description: 'Deal identifier (24-hex string)',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['update'],
			},
		},
		description:
			'Only the fields you set here will be sent. This endpoint updates editable deal fields and can move the deal between stages/funnels, re-assign the owner, etc.',
		options: [
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
			},
			{
				displayName: 'Contact IDs',
				name: 'contactIds',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Contact ID',
				},
				description: 'Contact IDs associated with the deal',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description:
					'Adds entries to `custom_fields` (key = custom field slug, value = the field value as string)',
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
				displayName: 'Distribution Settings',
				name: 'distributionSettings',
				type: 'collection',
				default: {},
				description: 'Builds `distribution_settings` (write-only) payload',
				options: [
					{
						displayName: 'Stage ID',
						name: 'distributionStageId',
						type: 'string',
						default: '',
						placeholder: '24-hex ID',
					},
					{
						displayName: 'Rule Type',
						name: 'distributionRuleType',
						type: 'options',
						default: 'owner',
						options: [
							{ name: 'All', value: 'all' },
							{ name: 'All Admins', value: 'all_admins' },
							{ name: 'All Users', value: 'all_users' },
							{ name: 'Owner', value: 'owner' },
							{ name: 'Team', value: 'team' },
							{ name: 'User', value: 'user' },
						],
					},
					{
						displayName: 'Rule ID',
						name: 'distributionRuleId',
						type: 'string',
						default: '',
						placeholder: '24-hex ID',
						description: 'User/team ID used by some rule types (optional)',
					},
					{
						displayName: 'Rule Email',
						name: 'distributionRuleEmail',
						type: 'string',
						default: '',
						placeholder: 'user@email.com',
						description: 'User email used by some rule types (optional)',
					},
				],
			},
			{
				displayName: 'Expected Close Date',
				name: 'expectedCloseDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
			},
			{
				displayName: 'Lost Reason ID',
				name: 'lostReasonId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Deal name',
			},
			{
				displayName: 'One-Time Price',
				name: 'oneTimePrice',
				type: 'number',
				default: 0,
				description: 'One-time value (float)',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
				description: 'Organization/company ID associated with the deal',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
				description: 'User (owner) ID responsible for the deal',
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'number',
				default: 0,
				description: 'Deal rating (integer)',
			},
			{
				displayName: 'Recurring Price',
				name: 'recurrencePrice',
				type: 'number',
				default: 0,
				description: 'Recurring value (float)',
			},
			{
				displayName: 'Source ID',
				name: 'sourceId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
				description: 'Deal source ID',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'ongoing',
				options: [
					{ name: 'Ongoing', value: 'ongoing' },
					{ name: 'Paused', value: 'paused' },
					{ name: 'Won', value: 'won' },
					{ name: 'Lost', value: 'lost' },
				],
				description: 'Deal status',
			},
		],
	},

	{
		displayName: 'Move Deal',
		name: 'moveMode',
		type: 'options',
		default: 'none',
		options: [
			{ name: 'No Move', value: 'none' },
			{ name: 'Change Stage Only', value: 'stage' },
			{ name: 'Change Pipeline & Stage', value: 'pipeline' },
		],
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['update'],
			},
		},
		description: 'User-friendly stage/pipeline move. Stage lists are loaded from the API (no manual IDs).',
	},

	{
		displayName: 'Stage Name or ID',
		name: 'moveStageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDealStages',
			loadOptionsDependsOn: ['dealId'],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['update'],
				moveMode: ['stage'],
			},
		},
		description: 'Select a stage from the deal’s current pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	{
		displayName: 'Pipeline Name or ID',
		name: 'movePipelineId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPipelines',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['update'],
				moveMode: ['pipeline'],
			},
		},
		description: 'Select the target pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'movePipelineStageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPipelineStages',
			loadOptionsDependsOn: ['movePipelineId'],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['deals'],
				operation: ['update'],
				moveMode: ['pipeline'],
			},
		},
		description: 'Select the target stage in the selected pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];

export const dealDescription = dealsDescription;
