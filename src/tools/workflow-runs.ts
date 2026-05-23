import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerWorkflowRunTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"list_workflow_runs",
		{
			description:
				"List workflow run history for an application. Filter by status and paginate with last_id.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				limit: z.number().optional().describe("Number of runs to return (1-100, default 20)"),
				status: z
					.enum(["running", "succeeded", "failed", "stopped", "partial-succeeded"])
					.optional()
					.describe("Filter by status"),
				last_id: z.string().optional().describe("Cursor for pagination (last run ID from previous page)"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id, limit, status, last_id }) => {
			try {
				const result = await client.listWorkflowRuns(app_id, limit ?? 20, status, last_id);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"get_workflow_run",
		{
			description: "Get details of a specific workflow run including inputs, outputs, and status.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				run_id: z.string().describe("Workflow run ID"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id, run_id }) => {
			try {
				const result = await client.getWorkflowRun(app_id, run_id);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"get_workflow_run_logs",
		{
			description:
				"Get node-level execution logs for a workflow run. Shows each node's inputs, outputs, status, and elapsed time.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				run_id: z.string().describe("Workflow run ID"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id, run_id }) => {
			try {
				const result = await client.getWorkflowRunNodeExecutions(app_id, run_id);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
