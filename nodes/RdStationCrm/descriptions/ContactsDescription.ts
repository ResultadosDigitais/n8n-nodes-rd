import type { INodeProperties } from 'n8n-workflow';

const contactFilterFieldOptions: Array<{ name: string; value: string; description?: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Name', value: 'name', description: 'Filter by contact name (supports match ~)' },
	{ name: 'Job Title', value: 'job_title', description: 'Filter by job title (supports match ~)' },
	{ name: 'Email', value: 'email', description: 'Filter by contact email address' },
	{ name: 'Phone', value: 'phone', description: 'Filter by contact phone number' },
	{ name: 'Organization ID', value: 'organization_id', description: 'Filter by organization ID' },
	{ name: 'Created At', value: 'created_at', description: 'Filter by creation date/time (DateTime)' },
	{ name: 'Updated At', value: 'updated_at', description: 'Filter by last update date/time (DateTime)' },
	{ name: 'Custom Field (Slug)', value: 'customField', description: 'Filter by a custom field using @&lt;slug&gt;' },
];

const contactSortFieldOptions: Array<{ name: string; value: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Name', value: 'name' },
	{ name: 'Created At', value: 'created_at' },
];

export const contactsDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['contacts'],
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
				resource: ['contacts'],
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
				resource: ['contacts'],
				operation: ['getAll'],
			},
		},
		description: 'Number of records fetched per request (RD Station paginated list)',
	},

	{
		displayName: 'Filter By',
		name: 'filterField',
		type: 'options',
		options: contactFilterFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['contacts'],
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
		placeholder: 'e.g. cpf',
		displayOptions: {
			show: {
				resource: ['contacts'],
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
				resource: ['contacts'],
				operation: ['getAll'],
				filterField: ['name', 'job_title'],
			},
		},
		description: 'Whether to use case-insensitive partial match (field:~value)',
	},
	{
		displayName: 'Filter Value',
		name: 'filterValue',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contacts'],
				operation: ['getAll'],
				filterField: ['name', 'job_title', 'email', 'phone', 'organization_id', 'customField'],
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
				resource: ['contacts'],
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
				resource: ['contacts'],
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
		options: contactSortFieldOptions,
		default: 'none',
		displayOptions: {
			show: {
				resource: ['contacts'],
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
				resource: ['contacts'],
				operation: ['getAll'],
				sortField: ['name', 'created_at'],
			},
		},
	},

	// ------------------------
	// GET
	// ------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		placeholder: '24-hex ID',
		required: true,
		displayOptions: {
			show: {
				resource: ['contacts'],
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
				resource: ['contacts'],
				operation: ['create'],
			},
		},
		description: 'Contact name',
	},
	{
		displayName: 'Job Title',
		name: 'jobTitle',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contacts'],
				operation: ['create'],
			},
		},
		description: 'Contact job title',
	},
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'string',
		default: '',
		placeholder: '24-hex ID',
		displayOptions: {
			show: {
				resource: ['contacts'],
				operation: [''],
			},
		},
		description: 'Organization ID to associate with this contact',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['contacts'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'dateTime',
				default: '',
				description: 'Contact birthday (will be sent as YYYY-MM-DD)',
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
				displayName: 'Emails',
				name: 'emailsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Emails for this contact',
				options: [
					{
						displayName: 'Email',
						name: 'emailValues',
						values: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								placeholder: 'name@domain.com',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Legal Bases',
				name: 'legalBasesUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'LGPD legal bases for this contact',
				options: [
					{
						displayName: 'Legal Base',
						name: 'legalBaseValues',
						values: [
							{
								displayName: 'Category',
								name: 'category',
								type: 'options',
								default: 'communications',
								options: [{ name: 'Communications', value: 'communications' }],
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'consent',
								options: [
									{ name: 'Consent', value: 'consent' },
									{ name: 'Judicial Process', value: 'judicial_process' },
									{ name: 'Legitimate Interest', value: 'legitimate_interest' },
									{ name: 'Pre-Existent Contract', value: 'pre_existent_contract' },
									{ name: 'Public Interest', value: 'public_interest' },
									{ name: 'Vital Interest', value: 'vital_interest' },
								],
							},
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								default: 'granted',
								options: [
									{ name: 'Granted', value: 'granted' },
									{ name: 'Declined', value: 'declined' },
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Phones',
				name: 'phonesUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Phones for this contact',
				options: [
					{
						displayName: 'Phone',
						name: 'phoneValues',
						values: [
							{
								displayName: 'Phone',
								name: 'phone',
								type: 'string',
								default: '',
								required: true,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'mobile',
								options: [
									{ name: 'Work', value: 'work' },
									{ name: 'Fax', value: 'fax' },
									{ name: 'Home', value: 'home' },
									{ name: 'Mobile', value: 'mobile' },
								],
								description: 'Phone type',
							},
						],
					},
				],
			},
			{
				displayName: 'Social Profiles',
				name: 'socialProfilesUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Social profiles for this contact',
				options: [
					{
						displayName: 'Social Profile',
						name: 'socialProfileValues',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'linkedin',
								options: [
									{ name: 'Facebook', value: 'facebook' },
									{ name: 'LinkedIn', value: 'linkedin' },
									{ name: 'Skype', value: 'skype' },
								],
								description: 'Social profile type',
							},
							{
								displayName: 'Username',
								name: 'username',
								type: 'string',
								default: '',
								required: true,
								description: 'Social profile username',
							},
						],
					},
				],
			},
		],
		description: 'Additional fields for the contact',
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
				resource: ['contacts'],
				operation: ['update'],
			},
		},
		description: 'Fields to update',
		options: [
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'dateTime',
				default: '',
				description: 'Contact birthday (will be sent as YYYY-MM-DD)',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Replaces entries in `custom_fields` (key = custom field slug, value = the field value as string)',
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
				displayName: 'Emails',
				name: 'emailsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Replaces the emails array',
				options: [
					{
						displayName: 'Email',
						name: 'emailValues',
						values: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								placeholder: 'name@domain.com',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Legal Bases',
				name: 'legalBasesUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Replaces the legal_bases array',
				options: [
					{
						displayName: 'Legal Base',
						name: 'legalBaseValues',
						values: [
							{
								displayName: 'Category',
								name: 'category',
								type: 'options',
								default: 'communications',
								options: [{ name: 'Communications', value: 'communications' }],
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'consent',
								options: [
									{ name: 'Consent', value: 'consent' },
									{ name: 'Judicial Process', value: 'judicial_process' },
									{ name: 'Legitimate Interest', value: 'legitimate_interest' },
									{ name: 'Pre-Existent Contract', value: 'pre_existent_contract' },
									{ name: 'Public Interest', value: 'public_interest' },
									{ name: 'Vital Interest', value: 'vital_interest' },
								],
							},
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								default: 'granted',
								options: [
									{ name: 'Granted', value: 'granted' },
									{ name: 'Declined', value: 'declined' },
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				default: '',
				placeholder: '24-hex ID',
			},
			{
				displayName: 'Phones',
				name: 'phonesUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Replaces the phones array',
				options: [
					{
						displayName: 'Phone',
						name: 'phoneValues',
						values: [
							{
								displayName: 'Phone',
								name: 'phone',
								type: 'string',
								default: '',
								required: true,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'mobile',
								options: [
									{ name: 'Work', value: 'work' },
									{ name: 'Fax', value: 'fax' },
									{ name: 'Home', value: 'home' },
									{ name: 'Mobile', value: 'mobile' },
								],
								description: 'Phone type',
							},
						],
					},
				],
			},
			{
				displayName: 'Social Profiles',
				name: 'socialProfilesUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				description: 'Replaces the social_profiles array',
				options: [
					{
						displayName: 'Social Profile',
						name: 'socialProfileValues',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'linkedin',
								options: [
									{ name: 'Facebook', value: 'facebook' },
									{ name: 'LinkedIn', value: 'linkedin' },
									{ name: 'Skype', value: 'skype' },
								],
								description: 'Social profile type',
							},
							{
								displayName: 'Username',
								name: 'username',
								type: 'string',
								default: '',
								required: true,
								description: 'Social profile username',
							},
						],
					},
				],
			},
		],
	},
];
