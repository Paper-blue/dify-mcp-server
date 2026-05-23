import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerAppAccessTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"delete_api_key",
		{
			description: "Delete an API key for an application",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				key_id: z.string().describe("API key ID to delete"),
			},
			annotations: { destructiveHint: true },
		},
		async ({ app_id, key_id }) => {
			try {
				const result = await client.deleteAppApiKey(app_id, key_id);
				return { content: [{ type: "text", text: `Deleted API key: ${result.result}` }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"get_site_config",
		{
			description: "Get the web site (chat UI) configuration for an application",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id }) => {
			try {
				const config = await client.getSiteConfig(app_id);
				return {
					content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"update_site_config",
		{
			description:
				"Update the web site (chat UI) configuration for an application. Pass only the fields you want to change as a JSON object.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				config: z
					.string()
					.describe(
						'JSON object with site config fields to update, e.g. {"title":"My App","description":"...","icon":"🤖"}',
					),
			},
			annotations: { idempotentHint: true },
		},
		async ({ app_id, config }) => {
			try {
				const parsed = JSON.parse(config);
				const result = await client.updateSiteConfig(app_id, parsed);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"get_app_access_mode",
		{
			description: "Get the access mode of an application (public, private, etc.)",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id }) => {
			try {
				const result = await client.getAppAccessMode(app_id);
				return {
					content: [{ type: "text", text: `Access mode: ${result.access_mode}` }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
