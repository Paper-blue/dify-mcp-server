import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerModelProviderTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"list_model_providers",
		{
			description: "List all configured model providers in the current workspace",
			inputSchema: {
				model_type: z
					.string()
					.optional()
					.describe(
						"Filter by model type, e.g. 'llm', 'text-embedding', 'rerank', 'speech2text', 'tts'",
					),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ model_type }) => {
			try {
				const result = await client.listModelProviders(model_type);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"configure_model_provider",
		{
			description:
				"Configure credentials for a model provider (e.g. OpenAI, Anthropic). Pass provider name and credentials as JSON.",
			inputSchema: {
				provider: z
					.string()
					.describe('Model provider name, e.g. "openai", "anthropic", "azure_openai"'),
				credentials: z
					.string()
					.describe(
						'JSON object with provider-specific credentials, e.g. {"openai_api_key":"sk-..."}',
					),
			},
		},
		async ({ provider, credentials }) => {
			try {
				const parsed = JSON.parse(credentials);
				const result = await client.configureModelProvider(provider, parsed);
				return { content: [{ type: "text", text: `Configured: ${result.result}` }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"test_model_provider",
		{
			description:
				"Validate credentials for a model provider without saving them. Returns success or error message.",
			inputSchema: {
				provider: z
					.string()
					.describe('Model provider name, e.g. "openai", "anthropic", "azure_openai"'),
				credentials: z
					.string()
					.describe('JSON object with credentials to test, e.g. {"openai_api_key":"sk-..."}'),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ provider, credentials }) => {
			try {
				const parsed = JSON.parse(credentials);
				const result = await client.testModelProvider(provider, parsed);
				return { content: [{ type: "text", text: `Test result: ${result.result}` }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
