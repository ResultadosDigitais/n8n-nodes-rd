# n8n-nodes-rd

Community node to integrate n8n with **RD Station**.

This package adds two nodes to n8n:

- **RD Station CRM**: read/write operations for CRM resources.
- **RD Station CRM Trigger**: trigger workflows from RD Station CRM webhook events.

## Implemented resources

| Resource                  | Operations                                                    |
| ------------------------- | ------------------------------------------------------------- |
| Deals                     | Create, Get Many, Update                                      |
| Contacts                  | Get Many, Get, Create, Update                                 |
| Companies (Organizations) | Get Many, Get, Create, Update                                 |
| Tasks                     | Get Many, Get, Create, Update                                 |
| Products                  | Get Many, Get, Create, Update                                 |
| Webhooks                  | Create, Delete, Get, Get Many, Update                         |
| Metadata (Config)         | Get Pipelines, Get Custom Fields, Get Users, Get Deal Sources |

### `RD Station CRM Trigger` events

- `crm_contact_created`
- `crm_contact_updated`
- `crm_deal_created`
- `crm_deal_updated`
- `crm_organization_created`
- `crm_organization_updated`

## Authentication

Credential: **RD Station CRM (OAuth2)**.

- Supports **Staging** and **Production** environments.
- OAuth2 URLs are automatically adjusted based on the selected environment.
- API base URL used by the node:
  - Production: `https://api.rd.services/crm/v2`
  - Staging: `https://api-staging.rd.services/crm/v2`

Official API documentation:

- <https://developers.rdstation.com/reference>

## Installation

In n8n (Community Nodes):

1. Go to **Settings** > **Community Nodes**.
2. Click **Install**.
3. Enter the package name: `n8n-nodes-rdstation-crm`.
4. Complete installation and reload the editor if needed.

## Quick start

### 1) List contacts

- Node: `RD Station CRM`
- Resource: `Contact`
- Operation: `Get Many`
- Optional: apply RDQL filters (name, email, date, custom field, etc.)

### 2) Create deal

- Node: `RD Station CRM`
- Resource: `Deal`
- Operation: `Create`
- Minimum fields: `Name`, `Owner ID`

### 3) Trigger workflow on deal update

- Node: `RD Station CRM Trigger`
- Event: `Deal Updated`
- Optional: configure `Authentication Header` + `Authentication Key`

## Filters, pagination, and validations

- List operations support `Return All`, `Limit`, and `Page Size`.
- Resources use field-based RDQL filters (including custom fields by slug when applicable).
- Primary entity IDs (deals, contacts, companies, products, etc.) are validated as **24-hex**.
- Webhook IDs in the `Webhook` resource are validated as **UUID**.
- In webhook settings, `Authentication Header` and `Authentication Key` must be provided together.
- For `Deal > Create`, the allowed creation status is `ongoing`.

## Local development

```bash
npm install
npm run build
npm run dev
npm run lint
```

## Quality and publishing (Verified Community Node checklist)

Based on the community node publishing reference and n8n ecosystem guidelines, this package should maintain:

1. **Code transparency**
   - Public GitHub repository.
   - Clear, auditable node source code and README.
2. **Package identity**
   - Package name following the community node pattern (`n8n-nodes-*`).
   - Consistent metadata in `package.json` (keywords, license, nodes, credentials).
3. **Documentation**
   - README with credentials, operations, examples, and limitations.
4. **Quality**
   - Run local linting and review before publishing.
   - (Optional) community package scanner:

     ```bash
     npx @n8n/scan-community-package n8n-nodes-rdstation-crm
     ```

5. **Submission**
   - Publish to npm and submit via the n8n Creator Portal with the correct links.

## License

[MIT](./LICENSE)
