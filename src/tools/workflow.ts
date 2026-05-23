import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerWorkflowTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"get_workflow",
		{
			description: "Get the draft workflow of an application (nodes, edges, features)",
			inputSchema: { app_id: z.string().describe("Application ID") },
			annotations: { readOnlyHint: true },
		},
		async ({ app_id }) => {
			try {
				const wf = await client.getWorkflowDraft(app_id);
				return {
					content: [{ type: "text", text: JSON.stringify(wf, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"update_workflow",
		{
			description: "Update the draft workflow graph of an application",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				graph: z.string().describe("Workflow graph JSON (nodes + edges)"),
				features: z.string().describe("Workflow features JSON"),
				hash: z.string().describe("Current workflow hash (from get_workflow)"),
			},
			annotations: { idempotentHint: true },
		},
		async ({ app_id, graph, features, hash }) => {
			try {
				const result = await client.updateWorkflowDraft(
					app_id,
					JSON.parse(graph),
					JSON.parse(features),
					hash,
				);
				return { content: [{ type: "text", text: `Update: ${result.result}` }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);


};
