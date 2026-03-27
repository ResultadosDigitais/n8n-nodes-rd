import type {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getRdCrmBaseUrl } from '../RdStationCrm/Helpers';

type RdStationWebhookEvent =
	| 'crm_contact_created'
	| 'crm_contact_updated'
	| 'crm_deal_created'
	| 'crm_deal_updated'
	| 'crm_organization_created'
	| 'crm_organization_updated';

const WEBHOOK_EVENT_OPTIONS: Array<{ name: string; value: RdStationWebhookEvent }> = [
	{ name: 'Contact Created', value: 'crm_contact_created' },
	{ name: 'Contact Updated', value: 'crm_contact_updated' },
	{ name: 'Deal Created', value: 'crm_deal_created' },
	{ name: 'Deal Updated', value: 'crm_deal_updated' },
	{ name: 'Company Created', value: 'crm_organization_created' },
	{ name: 'Company Updated', value: 'crm_organization_updated' },
];

type FullResponse = {
	statusCode?: number;
	body?: unknown;
};

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUrl(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
}

function extractDataObject(response: IDataObject): IDataObject {
	if (isObject(response.data)) return response.data as IDataObject;
	return response;
}

function getWebhookStorageKey(context: IHookFunctions): 'webhookId' | 'manualWebhookId' {
	return context.getActivationMode() === 'manual' ? 'manualWebhookId' : 'webhookId';
}

function getWebhookId(staticData: IDataObject, key: 'webhookId' | 'manualWebhookId'): string | undefined {
	return typeof staticData[key] === 'string' ? (staticData[key] as string) : undefined;
}

function getStringParameter(context: IHookFunctions | IWebhookFunctions, name: string): string {
	return String(context.getNodeParameter(name, '') ?? '').trim();
}

function getSelectedWebhookEvent(context: IHookFunctions | IWebhookFunctions): RdStationWebhookEvent {
	const eventName = String(context.getNodeParameter('eventName', 'crm_contact_created'));
	switch (eventName) {
		case 'crm_contact_updated':
		case 'crm_deal_created':
		case 'crm_deal_updated':
		case 'crm_organization_created':
		case 'crm_organization_updated':
			return eventName;
		default:
			return 'crm_contact_created';
	}
}

function getEventLabel(eventName: RdStationWebhookEvent): string {
	switch (eventName) {
		case 'crm_contact_created':
			return 'Contact Created';
		case 'crm_contact_updated':
			return 'Contact Updated';
		case 'crm_deal_created':
			return 'Deal Created';
		case 'crm_deal_updated':
			return 'Deal Updated';
		case 'crm_organization_created':
			return 'Company Created';
		case 'crm_organization_updated':
			return 'Company Updated';
		default:
			return eventName;
	}
}

async function rdCrmHookRequest(
	context: IHookFunctions,
	options: IHttpRequestOptions,
	allowNotFound = false,
): Promise<IDataObject | undefined> {
	const response = (await context.helpers.httpRequestWithAuthentication.call(context, 'rdStationCrmApi', {
		...options,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as FullResponse;

	const statusCode = response.statusCode ?? 0;
	const body = response.body;

	if (statusCode >= 400) {
		if (allowNotFound && statusCode === 404) return undefined;

		const responseBody =
			typeof body === 'string'
				? body
				: body
					? JSON.stringify(body)
					: 'No response body';

		throw new NodeOperationError(context.getNode(), `RD Station CRM request failed with status ${statusCode}`, {
			description: responseBody,
		});
	}

	if (isObject(body)) return body;
	return {};
}

function webhookMatchesEvent(
	webhook: IDataObject,
	expectedUrl: string,
	expectedEventName: RdStationWebhookEvent,
): boolean {
	const eventName = String(webhook.event_name ?? '');
	const httpMethod = String(webhook.http_method ?? '').toUpperCase();
	const url = String(webhook.url ?? '');

	return eventName === expectedEventName && httpMethod === 'POST' && normalizeUrl(url) === normalizeUrl(expectedUrl);
}

function buildWebhookPayload(
	context: IHookFunctions,
	webhookUrl: string,
	eventName: RdStationWebhookEvent,
): IDataObject {
	const webhookName = getStringParameter(context, 'webhookName');
	const authHeader = getStringParameter(context, 'authHeader');
	const authKey = getStringParameter(context, 'authKey');

	const data: IDataObject = {
		name: webhookName || `n8n - ${context.getNode().name} - ${getEventLabel(eventName)}`,
		event_name: eventName,
		http_method: 'POST',
		url: webhookUrl,
	};

	if (authHeader || authKey) {
		if (!authHeader || !authKey) {
			throw new NodeOperationError(
				context.getNode(),
				'Authentication Header and Authentication Key must be provided together',
			);
		}

		data.auth_header = authHeader;
		data.auth_key = authKey;
	}

	return data;
}

function validateInboundAuthHeader(context: IWebhookFunctions): void {
	const authHeader = getStringParameter(context, 'authHeader');
	const authKey = getStringParameter(context, 'authKey');

	if (!authHeader && !authKey) return;
	if (!authHeader || !authKey) {
		throw new NodeOperationError(
			context.getNode(),
			'Authentication Header and Authentication Key must be provided together',
		);
	}

	const headers = context.getHeaderData();
	const received = headers[authHeader.toLowerCase()];
	const receivedValue = Array.isArray(received) ? received[0] : received;

	if (String(receivedValue ?? '') !== authKey) {
		throw new NodeOperationError(context.getNode(), 'Invalid webhook authentication header');
	}
}

export class RdStationCrmTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RD Station CRM Trigger',
		name: 'rdStationCrmTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a selected RD Station CRM event happens',
		icon: 'file:rdstation.svg',
		defaults: {
			name: 'RD Station CRM Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'rdStationCrmApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				responseData: 'noData',
				path: 'contact-created',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'eventName',
				type: 'options',
				options: WEBHOOK_EVENT_OPTIONS,
				default: 'crm_contact_created',
				description: 'Webhook event to listen for',
			},
			{
				displayName: 'Webhook Name',
				name: 'webhookName',
				type: 'string',
				default: '',
				placeholder: 'n8n - CRM Event',
				description: 'Name to show in RD Station CRM. Leave empty to use a default name.',
			},
			{
				displayName: 'Authentication Header',
				name: 'authHeader',
				type: 'string',
				default: '',
				placeholder: 'X-RD-Webhook-Key',
				description: 'Header name sent by RD Station CRM with each webhook event',
			},
			{
				displayName: 'Authentication Key',
				name: 'authKey',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'Header value sent by RD Station CRM. Requires Authentication Header.',
			},
		],
		usableAsTool: true,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const storageKey = getWebhookStorageKey(this);
				const webhookId = getWebhookId(staticData, storageKey);
				if (!webhookId) return false;

				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) return false;
				const expectedEventName = getSelectedWebhookEvent(this);

				const baseUrl = await getRdCrmBaseUrl(this);
				const response = await rdCrmHookRequest(
					this,
					{
						method: 'GET',
						url: `${baseUrl}/webhooks/${webhookId}`,
						headers: {
							accept: 'application/json',
						},
					},
					true,
				);

				if (!response) {
					delete staticData[storageKey];
					return false;
				}

				const existingWebhook = extractDataObject(response);
				if (!webhookMatchesEvent(existingWebhook, webhookUrl, expectedEventName)) {
					await rdCrmHookRequest(
						this,
						{
							method: 'DELETE',
							url: `${baseUrl}/webhooks/${webhookId}`,
						},
						true,
					);
					delete staticData[storageKey];
					return false;
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) return false;

				const baseUrl = await getRdCrmBaseUrl(this);
				const eventName = getSelectedWebhookEvent(this);
				const data = buildWebhookPayload(this, webhookUrl, eventName);

				const response = await rdCrmHookRequest(this, {
					method: 'POST',
					url: `${baseUrl}/webhooks`,
					headers: {
						accept: 'application/json',
						'content-type': 'application/json',
					},
					body: {
						data,
					},
				});

				if (!response) {
					throw new NodeOperationError(this.getNode(), 'RD Station CRM did not return webhook details');
				}

				const createdWebhook = extractDataObject(response);
				const webhookId = String(createdWebhook.id ?? '').trim();

				if (!webhookId) {
					throw new NodeOperationError(this.getNode(), 'Could not read webhook ID from RD Station CRM response');
				}

				const staticData = this.getWorkflowStaticData('node');
				const storageKey = getWebhookStorageKey(this);
				staticData[storageKey] = webhookId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const storageKey = getWebhookStorageKey(this);
				const webhookId = getWebhookId(staticData, storageKey);
				if (!webhookId) return true;

				const baseUrl = await getRdCrmBaseUrl(this);

				await rdCrmHookRequest(
					this,
					{
						method: 'DELETE',
						url: `${baseUrl}/webhooks/${webhookId}`,
					},
					true,
				);

				delete staticData[storageKey];
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		validateInboundAuthHeader(this);

		const body = this.getBodyData();
		const eventName = String(body.event_name ?? '');
		const expectedEventName = getSelectedWebhookEvent(this);

		if (eventName && eventName !== expectedEventName) {
			return {
				workflowData: [[]],
			};
		}

		const item: INodeExecutionData = {
			json: body,
		};

		return {
			workflowData: [[item]],
		};
	}
}
