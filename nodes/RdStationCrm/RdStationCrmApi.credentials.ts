import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class RdStationCrmApi implements ICredentialType {
	name = 'rdStationCrmApi';
	displayName = 'RD Station CRM (OAuth2)';
	documentationUrl = 'https://developers.rdstation.com/reference';
	extends = ['oAuth2Api'];
	icon: Icon = 'file:rdstation.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Staging',
					value: 'staging',
				},
				{
					name: 'Production',
					value: 'production',
				},
			],
			default: 'staging',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			required: true,
			default:
				'={{ $self["environment"] === "production" ? "https://accounts.rdstation.com/oauth/authorize" : "https://accounts-staging.rdstation.com/oauth/authorize" }}',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			required: true,
			default:
				'={{ $self["environment"] === "production" ? "https://api.rd.services/oauth2/token" : "https://api-staging.rd.services/oauth2/token" }}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
