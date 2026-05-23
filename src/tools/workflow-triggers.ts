import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerWorkflowTriggerTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"list_triggers",
		{
			description:
				"List all triggers for a workflow app (e.g. schedule triggers, webhook triggers). Shows trigger type, ID, and enabled status.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id }) => {
			try {
				const result = await client.listTriggers(app_id);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"set_trigger_enabled",
		{
			description:
				"Enable or disable a workflow trigger (e.g. pause/resume a schedule trigger). Use list_triggers to get the trigger ID.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				trigger_id: z.string().describe("Trigger ID (from list_triggers)"),
				enabled: z.boolean().describe("true to enable, false to disable"),
			},
		},
		async ({ app_id, trigger_id, enabled }) => {
			try {
				const result = await client.setTriggerEnabled(app_id, trigger_id, enabled);
				return {
					content: [
						{
							type: "text",
							text: `Trigger ${enabled ? "enabled" : "disabled"}: ${result.result}`,
						},
					],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
