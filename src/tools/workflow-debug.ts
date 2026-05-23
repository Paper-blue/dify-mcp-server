import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerWorkflowDebugTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"run_draft_workflow",
		{
			description:
				"Run the draft workflow for testing (not the published version). Returns SSE stream events as text. Use this to verify workflow behavior before publishing.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				inputs: z
					.string()
					.optional()
					.describe("JSON string of input variables, e.g. {\"query\": \"hello\"}"),
			},
		},
		async ({ app_id, inputs }) => {
			try {
				const parsedInputs = inputs ? JSON.parse(inputs) : {};
				const stream = await client.runDraftWorkflow(app_id, parsedInputs);
				const reader = stream.getReader();
				const decoder = new TextDecoder();
				const lines: string[] = [];
				let done = false;

				while (!done) {
					const { value, done: streamDone } = await reader.read();
					done = streamDone;
					if (value) {
						const chunk = decoder.decode(value, { stream: !done });
						lines.push(chunk);
						// Stop after collecting enough output (avoid infinite streams)
						if (lines.join("").length > 50000) {
							reader.cancel();
							break;
						}
					}
				}

				return {
					content: [{ type: "text", text: lines.join("") }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"run_draft_node",
		{
			description:
				"Run a single node in the draft workflow for debugging. Returns the node's inputs, outputs, status, and elapsed time synchronously.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				node_id: z.string().describe("Node ID to run (from get_workflow nodes[].id)"),
				inputs: z
					.string()
					.optional()
					.describe("JSON string of node input variables"),
			},
			annotations: { readOnlyHint: false },
		},
		async ({ app_id, node_id, inputs }) => {
			try {
				const parsedInputs = inputs ? JSON.parse(inputs) : {};
				const result = await client.runDraftWorkflowNode(app_id, node_id, parsedInputs);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"get_node_last_run",
		{
			description: "Get the last execution result of a specific node in the draft workflow.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				node_id: z.string().describe("Node ID"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id, node_id }) => {
			try {
				const result = await client.getNodeLastRun(app_id, node_id);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"run_iteration_node",
		{
			description:
				"Debug a single Iteration node in the draft workflow. Returns inputs, outputs, status, and elapsed time.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				node_id: z.string().describe("Iteration node ID (from get_workflow nodes[].id)"),
				inputs: z.string().optional().describe("JSON string of node input variables"),
			},
		},
		async ({ app_id, node_id, inputs }) => {
			try {
				const parsedInputs = inputs ? JSON.parse(inputs) : {};
				const result = await client.runIterationNode(app_id, node_id, parsedInputs);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"run_loop_node",
		{
			description:
				"Debug a single Loop node in the draft workflow. Returns inputs, outputs, status, and elapsed time.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				node_id: z.string().describe("Loop node ID (from get_workflow nodes[].id)"),
				inputs: z.string().optional().describe("JSON string of node input variables"),
			},
		},
		async ({ app_id, node_id, inputs }) => {
			try {
				const parsedInputs = inputs ? JSON.parse(inputs) : {};
				const result = await client.runLoopNode(app_id, node_id, parsedInputs);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"get_workflow_run_count",
		{
			description:
				"Get workflow run statistics (total, running, succeeded, failed, stopped). Filter by status or time range.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				status: z
					.enum(["running", "succeeded", "failed", "stopped", "partial-succeeded"])
					.optional()
					.describe("Filter by status"),
				time_range: z
					.string()
					.optional()
					.describe("Time range filter, e.g. '7d', '4h', '30m'"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ app_id, status, time_range }) => {
			try {
				const result = await client.getWorkflowRunCount(app_id, status, time_range);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"stop_workflow_task",
		{
			description: "Stop a running workflow task by task ID.",
			inputSchema: {
				app_id: z.string().describe("Application ID"),
				task_id: z.string().describe("Task ID to stop (from run_draft_workflow SSE events)"),
			},
		},
		async ({ app_id, task_id }) => {
			try {
				const result = await client.stopWorkflowTask(app_id, task_id);
				return {
					content: [{ type: "text", text: `Stopped: ${result.result}` }],
				};
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
