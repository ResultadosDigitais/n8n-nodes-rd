import type { INodeProperties } from 'n8n-workflow';

const taskSortFieldOptions: Array<{ name: string; value: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Due Date', value: 'due_date' },
	{ name: 'Deal ID', value: 'deal_id' },
	{ name: 'Completed At', value: 'completed_at' },
	{ name: 'Updated At', value: 'updated_at' },
];

const taskFilterFieldOptions: Array<{ name: string; value: string; description?: string }> = [
	{ name: 'None', value: 'none' },
	{ name: 'Deal ID', value: 'deal_id', description: 'Filter by a specific deal ID' },
	{ name: 'Type', value: 'type', description: 'Filter by task type' },
	{ name: 'Owner IDs', value: 'owner_ids', description: 'Filter by one or more owner IDs' },
	{ name: 'Completed At', value: 'completed_at', description: 'Filter by completion date/time (DateTime)' },
	{ name: 'Due Date', value: 'due_date', description: 'Filter by due date/time (DateTime)' },
	{ name: 'Status', value: 'status', description: 'Filter by task status' },
];

export const tasksDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: { resource: ['tasks'], operation: ['getAll'] },
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
			show: { resource: ['tasks'], operation: ['getAll'], returnAll: [false] },
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
			show: { resource: ['tasks'], operation: ['getAll'] },
		},
		description: 'Number of records fetched per request (RD Station paginated list)',
	},
	{
		displayName: 'Filter By',
		name: 'filterField',
		type: 'options',
		options: taskFilterFieldOptions,
		default: 'none',
		displayOptions: {
			show: { resource: ['tasks'], operation: ['getAll'] },
		},
		description: 'Builds the RDQL filter parameter automatically',
	},
	{
		displayName: 'Filter Value',
		name: 'filterValue',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
				filterField: ['deal_id'],
			},
		},
		description: 'Deal ID value to filter by',
	},
	{
		displayName: 'Type',
		name: 'filterType',
		type: 'options',
		default: 'task',
		options: [
			{ name: 'Call', value: 'call' },
			{ name: 'Email', value: 'email' },
			{ name: 'Lunch', value: 'lunch' },
			{ name: 'Meeting', value: 'meeting' },
			{ name: 'Task', value: 'task' },
			{ name: 'Visit', value: 'visit' },
			{ name: 'WhatsApp', value: 'whatsapp' },
		],
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
				filterField: ['type'],
			},
		},
		description: 'Task type filter',
	},
	{
		displayName: 'Status',
		name: 'filterStatus',
		type: 'options',
		default: 'open',
		options: [
			{ name: 'Open', value: 'open' },
			{ name: 'Completed', value: 'completed' },
			{ name: 'Canceled', value: 'canceled' },
		],
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
				filterField: ['status'],
			},
		},
		description: 'Task status filter',
	},
	{
		displayName: 'Owner IDs',
		name: 'filterOwnerIds',
		type: 'string',
		default: [],
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Owner ID',
		},
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
				filterField: ['owner_ids'],
			},
		},
		description: 'One or more owner IDs (RDQL IN syntax: owner_ids:(id1,id2,...))',
	},
	{
		displayName: 'Date From',
		name: 'filterDateFrom',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
				filterField: ['completed_at', 'due_date'],
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
				resource: ['tasks'],
				operation: ['getAll'],
				filterField: ['completed_at', 'due_date'],
			},
		},
		description: 'End of the date interval (inclusive)',
	},
	{
		displayName: 'Sort Field',
		name: 'sortField',
		type: 'options',
		options: taskSortFieldOptions,
		default: 'none',
		displayOptions: {
			show: { resource: ['tasks'], operation: ['getAll'] },
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
				resource: ['tasks'],
				operation: ['getAll'],
				sortField: ['due_date', 'deal_id', 'completed_at', 'updated_at'],
			},
		},
	},

	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: { resource: ['tasks'], operation: ['get', 'update'] },
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: { resource: ['tasks'], operation: ['create'] },
		},
		description: 'Task subject ("name" field in API)',
	},
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: { resource: ['tasks'], operation: ['create'] },
		},
		description: 'Deal ID associated with the task (deal_id)',
	},
	{
		displayName: 'Created By ID',
		name: 'createdById',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: { resource: ['tasks'], operation: ['create'] },
		},
		description: 'User ID creating the task (created_by_id)',
	},
	{
		displayName: 'Create Fields',
		name: 'createFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['tasks'], operation: ['create'] },
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Additional task notes',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'task',
				options: [
					{ name: 'Call', value: 'call' },
					{ name: 'Email', value: 'email' },
					{ name: 'Lunch', value: 'lunch' },
					{ name: 'Meeting', value: 'meeting' },
					{ name: 'Task', value: 'task' },
					{ name: 'Visit', value: 'visit' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				description: 'Task type',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Task due date (due_date)',
			},
			{
				displayName: 'Owner IDs',
				name: 'ownerIds',
				type: 'string',
				default: '',
				placeholder: 'id1,id2,id3',
				description: 'Owner IDs separated by commas (owner_ids)',
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
			show: { resource: ['tasks'], operation: ['update'] },
		},
		options: [
			{
				displayName: 'Completed By ID',
				name: 'completedById',
				type: 'string',
				default: '',
				description: 'User ID who completed the task (completed_by_id)',
			},
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'string',
				default: '',
				description: 'Associated deal ID (deal_id)',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Additional task notes',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Task due date (due_date)',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Task subject (name)',
			},
			{
				displayName: 'Owner IDs',
				name: 'ownerIds',
				type: 'string',
				default: '',
				placeholder: 'id1,id2,id3',
				description: 'Owner IDs separated by commas (owner_ids)',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'open',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'Canceled', value: 'canceled' },
				],
				description: 'Task status',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'task',
				options: [
					{ name: 'Call', value: 'call' },
					{ name: 'Email', value: 'email' },
					{ name: 'Lunch', value: 'lunch' },
					{ name: 'Meeting', value: 'meeting' },
					{ name: 'Task', value: 'task' },
					{ name: 'Visit', value: 'visit' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				description: 'Task type',
			},
		],
	},
];
