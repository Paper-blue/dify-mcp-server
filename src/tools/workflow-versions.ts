import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerWorkflowVersionTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"list_workflow_versions",
		{
			description: "List all published versions of a workflow, with version name, comment, and hash.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				page: z.number().optional().describe("Page number (default 1)"),
				limit: z.number().optional().describe("Items per page (default 20)"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id, page, limit }) => {
			try {
				const result = await client.listWorkflowVersions(app_id, page ?? 1, limit ?? 20);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"restore_workflow_version",
		{
			description:
				"Restore a published workflow version back to draft. Use list_workflow_versions to find the workflow_id. After restoring, you can edit and publish again.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				workflow_id: z.string().describe("Workflow version ID to restore (from list_workflow_versions)"),
			},
		},
		async ({ app_id, workflow_id }) => {
			try {
				const result = await client.restoreWorkflowVersion(app_id, workflow_id);
				return {
					content: [{ type: "text", text: `Restored: ${result.result}` }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"label_workflow_version",
		{
			description: "Add a name and comment to a published workflow version for easier identification.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				workflow_id: z.string().describe("Workflow version ID to label"),
				marked_name: z.string().max(20).describe("Version name, max 20 characters (e.g. 'v1.2')"),
				marked_comment: z.string().max(100).optional().describe("Version comment, max 100 characters"),
			},
		},
		async ({ app_id, workflow_id, marked_name, marked_comment }) => {
			try {
				const result = await client.labelWorkflowVersion(
					app_id,
					workflow_id,
					marked_name,
					marked_comment ?? "",
				);
				return {
					content: [{ type: "text", text: `Labeled: ${result.result}` }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"publish_workflow",
		{
			description:
				"Publish the current draft workflow to make it live. Optionally add a version name and comment.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				marked_name: z.string().max(20).optional().describe("Version name, max 20 chars (e.g. 'v2.0')"),
				marked_comment: z.string().max(100).optional().describe("Version comment, max 100 chars"),
			},
		},
		async ({ app_id, marked_name, marked_comment }) => {
			try {
				const result = await client.publishWorkflowWithLabel(app_id, marked_name, marked_comment);
				return {
					content: [{ type: "text", text: `Published: ${result.result}` }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"update_workflow_env_vars",
		{
			description:
				"Update environment variables in the draft workflow. Requires the current graph and features from get_workflow. Secret values are write-only (cannot be read back).",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				graph: z.string().describe("Workflow graph JSON (from get_workflow)"),
				features: z.string().describe("Workflow features JSON (from get_workflow)"),
				hash: z.string().describe("Current workflow hash (from get_workflow)"),
				env_vars: z
					.string()
					.describe(
						'JSON array of env vars: [{"name":"MY_KEY","value":"secret","value_type":"secret"},{"name":"BASE_URL","value":"https://...","value_type":"string"}]',
					),
			},
		},
		async ({ app_id, graph, features, hash, env_vars }) => {
			try {
				const result = await client.updateWorkflowDraftWithEnv(
					app_id,
					JSON.parse(graph),
					JSON.parse(features),
					hash,
					JSON.parse(env_vars),
				);
				return {
					content: [{ type: "text", text: `Updated: ${result.result}` }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
