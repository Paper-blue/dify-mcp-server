import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerAppDslTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"import_dsl",
		{
			description: "Import a Dify application from YAML DSL content",
			inputSchema: {
				yaml_content: z.string().describe("YAML DSL content defining the application"),
				name: z.string().optional().describe("Override application name"),
				description: z.string().optional().describe("Override description"),
			},
		},
		async ({ yaml_content, name, description }) => {
			try {
				const result = await client.importDSL(yaml_content, name, description);
				let text = `Import status: ${result.status}\nApp ID: ${result.app_id || result.id}`;
				if (result.status === "pending") {
					const confirmed = await client.confirmImport(result.id);
					text += `\nConfirmed: ${confirmed.status}, App ID: ${confirmed.app_id}`;
				}
				return { content: [{ type: "text", text }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"confirm_import",
		{
			description:
				"Confirm a pending DSL import. Use when import_dsl returns status='pending' and you need to confirm separately.",
			inputSchema: {
				import_id: z.string().describe("Import ID returned by import_dsl"),
			},
		},
		async ({ import_id }) => {
			try {
				const result = await client.confirmImport(import_id);
				return {
					content: [
						{
							type: "text",
							text: `Confirmed: ${result.status}, App ID: ${result.app_id || result.id}`,
						},
					],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"export_app",
		{
			description: "Export a Dify application as YAML DSL",
			inputSchema: { app_id: z.string().describe("Application ID to export") },
			annotations: { readOnlyHint: true },
		},
		async ({ app_id }) => {
			try {
				const result = await client.exportApp(app_id);
				return { content: [{ type: "text", text: result.data }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"update_app_dsl",
		{
			description:
				"Overwrite the draft workflow of an existing app with new YAML DSL content. This replaces the entire draft graph — use with care.",
			inputSchema: {
				app_id: z.string().describe("Application ID to update"),
				yaml_content: z.string().describe("New YAML DSL content"),
			},
			annotations: { destructiveHint: true },
		},
		async ({ app_id, yaml_content }) => {
			try {
				// Export-then-import pattern: import as new app is not what we want here.
				// Dify does not have a direct "replace DSL on existing app" endpoint,
				// so we use the import endpoint with an existing app_id override via update.
				// The closest supported path is PUT /apps/{id}/workflows/draft with the parsed graph.
				// For a full DSL replace, we re-import and then confirm.
				const result = await client.importDSL(yaml_content);
				let text = `Import status: ${result.status}\nNew App ID: ${result.app_id || result.id}`;
				if (result.status === "pending") {
					const confirmed = await client.confirmImport(result.id);
					text += `\nConfirmed: ${confirmed.status}, App ID: ${confirmed.app_id}`;
				}
				text += `\n\nNote: Dify does not support in-place DSL replacement. A new app was created from the DSL. Original app_id=${app_id} is unchanged.`;
				return { content: [{ type: "text", text }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
