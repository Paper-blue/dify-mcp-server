/**
 * Dify Console API client.
 * Password is Base64-encoded (Dify's @decrypt_password_field decorator).
 * Auth via cookies (__Host-access_token, __Host-csrf_token) since Dify 1.9.2+.
 * Supports auto-login and auto-retry on 401.
 */

import type {
	App,
	AppListResponse,
	ConversationListResponse,
	Dataset,
	DatasetListResponse,
	Document,
	DocumentListResponse,
	ImportResponse,
	LoginResponse,
	MCPServer,
	Message,
	MessageListResponse,
	Model,
	ModelProvider,
	PluginListResponse,
	Segment,
	SegmentListResponse,
	Tag,
	Workflow,
	WorkflowNodeExecution,
	WorkflowNodeExecutionListResponse,
	WorkflowNodeRunResult,
	WorkflowRun,
	WorkflowRunCount,
	WorkflowRunListResponse,
	WorkflowTrigger,
	WorkflowTriggerListResponse,
	WorkflowVersion,
	WorkflowVersionListResponse,
} from "./types.js";

// --- Client ---

export class DifyClient {
	private baseUrl: string;
	private email: string;
	private password: string;
	private cookies: Map<string, string> = new Map();
	private csrfToken: string | null = null;
	private authenticated = false;

	constructor(baseUrl: string, email: string, password: string) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
		this.email = email;
		this.password = password;
	}

	private parseCookies(res: Response): void {
		const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
		for (const header of setCookieHeaders) {
			const match = header.match(/^([^=]+)=([^;]*)/);
			if (match) {
				this.cookies.set(match[1], match[2]);
				if (match[1].endsWith("csrf_token")) {
					this.csrfToken = match[2];
				}
			}
		}
	}

	private getCookieHeader(): string {
		return Array.from(this.cookies.entries())
			.map(([k, v]) => `${k}=${v}`)
			.join("; ");
	}

	private async rawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(options.headers as Record<string, string>),
		};

		if (this.cookies.size > 0) {
			headers.Cookie = this.getCookieHeader();
		}

		if (this.csrfToken) {
			headers["X-CSRF-Token"] = this.csrfToken;
		}

		const res = await fetch(`${this.baseUrl}/console/api${path}`, {
			...options,
			headers,
			redirect: "manual",
		});

		this.parseCookies(res);

		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Dify API ${res.status}: ${body}`);
		}

		const text = await res.text();
		if (!text) return { result: "success" } as T;
		return JSON.parse(text) as T;
	}

	private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
		if (!this.authenticated) {
			await this.login();
		}

		try {
			return await this.rawRequest<T>(path, options);
		} catch (e) {
			if (e instanceof Error && e.message.includes("401")) {
				this.authenticated = false;
				await this.login();
				return this.rawRequest<T>(path, options);
			}
			throw e;
		}
	}

	async login(): Promise<string> {
		if (!this.email || !this.password) {
			throw new Error("DIFY_EMAIL and DIFY_PASSWORD env vars required");
		}

		const passwordB64 = Buffer.from(this.password).toString("base64");

		const data = await this.rawRequest<LoginResponse>("/login", {
			method: "POST",
			body: JSON.stringify({
				email: this.email,
				password: passwordB64,
				language: "en-US",
				remember_me: true,
			}),
		});

		const hasAccessToken = Array.from(this.cookies.keys()).some((k) => k.endsWith("access_token"));
		if (data.result === "success" || hasAccessToken) {
			this.authenticated = true;
			return "Login successful";
		}

		throw new Error(`Login failed: ${JSON.stringify(data)}`);
	}

	// --- Apps ---

	async listApps(page = 1, limit = 30): Promise<AppListResponse> {
		return this.request<AppListResponse>(`/apps?page=${page}&limit=${limit}`);
	}

	async createApp(
		name: string,
		mode: "chat" | "agent-chat" | "advanced-chat" | "workflow" | "completion",
		description = "",
		icon = "\u{1F916}",
		iconBackground = "#FFEAD5",
	): Promise<App> {
		return this.request<App>("/apps", {
			method: "POST",
			body: JSON.stringify({
				name,
				mode,
				description,
				icon_type: "emoji",
				icon,
				icon_background: iconBackground,
			}),
		});
	}

	async deleteApp(appId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}`, { method: "DELETE" });
	}

	async importDSL(
		yamlContent: string,
		name?: string,
		description?: string,
	): Promise<ImportResponse> {
		const body: Record<string, string> = {
			mode: "yaml-content",
			yaml_content: yamlContent,
		};
		if (name) body.name = name;
		if (description) body.description = description;

		return this.request<ImportResponse>("/apps/imports", {
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	async confirmImport(importId: string): Promise<ImportResponse> {
		return this.request<ImportResponse>(`/apps/imports/${importId}/confirm`, {
			method: "POST",
		});
	}

	async exportApp(appId: string): Promise<{ data: string }> {
		return this.request<{ data: string }>(`/apps/${appId}/export`);
	}

	async getWorkflowDraft(appId: string): Promise<Workflow> {
		return this.request<Workflow>(`/apps/${appId}/workflows/draft`);
	}

	async updateWorkflowDraft(
		appId: string,
		graph: Record<string, unknown>,
		features: Record<string, unknown>,
		hash: string,
	): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/workflows/draft`, {
			method: "POST",
			body: JSON.stringify({ graph, features, hash }),
		});
	}

	async publishWorkflow(appId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/workflows/publish`, {
			method: "POST",
		});
	}

	async enableApi(appId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/api-enable`, { method: "POST" });
	}

	async enableSite(appId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/site-enable`, { method: "POST" });
	}

	async copyApp(appId: string, name?: string): Promise<App> {
		const body: Record<string, string> = {};
		if (name) body.name = name;
		return this.request<App>(`/apps/${appId}/copy`, {
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	async getAppApiKeys(
		appId: string,
	): Promise<{ data: Array<{ id: string; token: string; created_at: number }> }> {
		return this.request<{ data: Array<{ id: string; token: string; created_at: number }> }>(
			`/apps/${appId}/api-keys`,
		);
	}

	async createAppApiKey(appId: string): Promise<{ id: string; token: string; created_at: number }> {
		return this.request<{ id: string; token: string; created_at: number }>(
			`/apps/${appId}/api-keys`,
			{ method: "POST" },
		);
	}

	async deleteAppApiKey(appId: string, keyId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/api-keys/${keyId}`, {
			method: "DELETE",
		});
	}

	async getSiteConfig(appId: string): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(`/apps/${appId}/site`);
	}

	async updateSiteConfig(
		appId: string,
		config: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(`/apps/${appId}/site`, {
			method: "POST",
			body: JSON.stringify(config),
		});
	}

	async getAppAccessMode(appId: string): Promise<{ access_mode: string }> {
		return this.request<{ access_mode: string }>(`/apps/${appId}/access-mode`);
	}

	// --- Knowledge Base (Datasets) ---

	async listDatasets(page = 1, limit = 30): Promise<DatasetListResponse> {
		return this.request<DatasetListResponse>(`/datasets?page=${page}&limit=${limit}`);
	}

	async createDataset(
		name: string,
		description = "",
		indexingTechnique: "high_quality" | "economy" = "high_quality",
		permission: "only_me" | "all_team_members" = "all_team_members",
	): Promise<Dataset> {
		return this.request<Dataset>("/datasets", {
			method: "POST",
			body: JSON.stringify({
				name,
				description,
				indexing_technique: indexingTechnique,
				permission,
			}),
		});
	}

	async deleteDataset(datasetId: string): Promise<void> {
		return this.request<void>(`/datasets/${datasetId}`, { method: "DELETE" });
	}

	async listDocuments(datasetId: string, page = 1, limit = 30): Promise<DocumentListResponse> {
		return this.request<DocumentListResponse>(
			`/datasets/${datasetId}/documents?page=${page}&limit=${limit}`,
		);
	}

	async createDocumentByText(
		datasetId: string,
		name: string,
		text: string,
		indexingTechnique: "high_quality" | "economy" = "high_quality",
	): Promise<{ document: Document; batch: string }> {
		return this.request<{ document: Document; batch: string }>(
			`/datasets/${datasetId}/document/create-by-text`,
			{
				method: "POST",
				body: JSON.stringify({
					name,
					text,
					indexing_technique: indexingTechnique,
					process_rule: { mode: "automatic" },
				}),
			},
		);
	}

	async deleteDocument(datasetId: string, documentId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/datasets/${datasetId}/documents/${documentId}`, {
			method: "DELETE",
		});
	}

	async listSegments(
		datasetId: string,
		documentId: string,
		page = 1,
		limit = 30,
	): Promise<SegmentListResponse> {
		return this.request<SegmentListResponse>(
			`/datasets/${datasetId}/documents/${documentId}/segments?page=${page}&limit=${limit}`,
		);
	}

	async createSegment(
		datasetId: string,
		documentId: string,
		content: string,
		answer = "",
		keywords: string[] = [],
	): Promise<{ data: Segment }> {
		return this.request<{ data: Segment }>(
			`/datasets/${datasetId}/documents/${documentId}/segments`,
			{
				method: "POST",
				body: JSON.stringify({
					segments: [{ content, answer, keywords }],
				}),
			},
		);
	}

	async updateSegment(
		datasetId: string,
		documentId: string,
		segmentId: string,
		content: string,
		answer = "",
		keywords: string[] = [],
	): Promise<{ data: Segment }> {
		return this.request<{ data: Segment }>(
			`/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`,
			{
				method: "PATCH",
				body: JSON.stringify({
					segment: { content, answer, keywords },
				}),
			},
		);
	}

	async deleteSegment(
		datasetId: string,
		documentId: string,
		segmentId: string,
	): Promise<{ result: string }> {
		return this.request<{ result: string }>(
			`/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`,
			{ method: "DELETE" },
		);
	}

	// --- Model Providers ---

	async listModelProviders(modelType?: string): Promise<{ data: ModelProvider[] }> {
		const query = modelType ? `?model_type=${modelType}` : "";
		return this.request<{ data: ModelProvider[] }>(`/workspaces/current/model-providers${query}`);
	}

	async listProviderModels(provider: string): Promise<{ data: Model[] }> {
		return this.request<{ data: Model[] }>(
			`/workspaces/current/model-providers/${provider}/models`,
		);
	}

	async listModelsByType(modelType: string): Promise<{ data: Model[] }> {
		return this.request<{ data: Model[] }>(`/workspaces/current/models/model-types/${modelType}`);
	}

	// --- Plugins ---

	async listPlugins(page = 1, pageSize = 20): Promise<PluginListResponse> {
		return this.request<PluginListResponse>(
			`/workspaces/current/plugin/list?page=${page}&page_size=${pageSize}`,
		);
	}

	async installPluginFromMarketplace(
		pluginIdentifiers: string[],
	): Promise<{ task_id: string; plugins: string[] }> {
		return this.request<{ task_id: string; plugins: string[] }>(
			"/workspaces/current/plugin/install/marketplace",
			{
				method: "POST",
				body: JSON.stringify({ plugin_unique_identifiers: pluginIdentifiers }),
			},
		);
	}

	async uninstallPlugin(pluginInstallationId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>("/workspaces/current/plugin/uninstall", {
			method: "POST",
			body: JSON.stringify({ plugin_installation_id: pluginInstallationId }),
		});
	}

	async upgradePluginFromMarketplace(
		originalPluginId: string,
		newPluginId: string,
	): Promise<{ task_id: string }> {
		return this.request<{ task_id: string }>("/workspaces/current/plugin/upgrade/marketplace", {
			method: "POST",
			body: JSON.stringify({
				original_plugin_unique_identifier: originalPluginId,
				new_plugin_unique_identifier: newPluginId,
			}),
		});
	}

	async getPluginTask(
		taskId: string,
	): Promise<{ id: string; status: string; message?: string; plugin_unique_identifier?: string }> {
		return this.request<{
			id: string;
			status: string;
			message?: string;
			plugin_unique_identifier?: string;
		}>(`/workspaces/current/plugin/tasks/${taskId}`);
	}

	// --- Models (default) ---

	async getDefaultModel(
		modelType: string,
	): Promise<{ data: { provider: string; model: string; model_type: string } | null }> {
		return this.request<{
			data: { provider: string; model: string; model_type: string } | null;
		}>(`/workspaces/current/default-model?model_type=${modelType}`);
	}

	async setDefaultModel(
		modelType: string,
		provider: string,
		model: string,
	): Promise<{ result: string }> {
		return this.request<{ result: string }>("/workspaces/current/default-model", {
			method: "POST",
			body: JSON.stringify({ model_type: modelType, provider, model }),
		});
	}

	// --- App details ---

	async getApp(appId: string): Promise<App> {
		return this.request<App>(`/apps/${appId}`);
	}

	async updateApp(
		appId: string,
		name?: string,
		description?: string,
		icon?: string,
		iconBackground?: string,
	): Promise<App> {
		const body: Record<string, string> = {};
		if (name) body.name = name;
		if (description !== undefined) body.description = description;
		if (icon) body.icon = icon;
		if (iconBackground) body.icon_background = iconBackground;
		return this.request<App>(`/apps/${appId}`, {
			method: "PUT",
			body: JSON.stringify(body),
		});
	}

	// --- MCP Servers ---

	async listMCPServers(): Promise<MCPServer[]> {
		return this.request<MCPServer[]>("/workspaces/current/tools/mcp");
	}

	async getMCPServerTools(providerId: string): Promise<MCPServer> {
		return this.request<MCPServer>(`/workspaces/current/tool-provider/mcp/tools/${providerId}`);
	}

	async createMCPServer(
		name: string,
		serverUrl: string,
		serverIdentifier: string,
		icon = "\u{1F527}",
		iconBackground = "#FFEAD5",
		headers?: Record<string, string>,
	): Promise<MCPServer> {
		return this.request<MCPServer>("/workspaces/current/tool-provider/mcp", {
			method: "POST",
			body: JSON.stringify({
				server_url: serverUrl,
				name,
				icon,
				icon_type: "emoji",
				icon_background: iconBackground,
				server_identifier: serverIdentifier,
				headers: headers ?? {},
				configuration: { timeout: 30, sse_read_timeout: 300 },
			}),
		});
	}

	async updateMCPServer(
		providerId: string,
		name: string,
		serverUrl: string,
		serverIdentifier: string,
		icon = "\u{1F527}",
		iconBackground = "#FFEAD5",
		headers?: Record<string, string>,
	): Promise<MCPServer> {
		return this.request<MCPServer>("/workspaces/current/tool-provider/mcp", {
			method: "PUT",
			body: JSON.stringify({
				provider_id: providerId,
				server_url: serverUrl,
				name,
				icon,
				icon_type: "emoji",
				icon_background: iconBackground,
				server_identifier: serverIdentifier,
				headers: headers ?? {},
				configuration: { timeout: 30, sse_read_timeout: 300 },
			}),
		});
	}

	async deleteMCPServer(providerId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>("/workspaces/current/tool-provider/mcp", {
			method: "DELETE",
			body: JSON.stringify({ provider_id: providerId }),
		});
	}

	async refreshMCPServerTools(providerId: string): Promise<MCPServer> {
		return this.request<MCPServer>(`/workspaces/current/tool-provider/mcp/update/${providerId}`);
	}

	// --- Tags ---

	async listTags(type?: string): Promise<Tag[]> {
		const query = type ? `?type=${type}` : "";
		return this.request<Tag[]>(`/tags${query}`);
	}

	async createTag(name: string, type: "app" | "knowledge" = "app"): Promise<Tag> {
		return this.request<Tag>("/tags", {
			method: "POST",
			body: JSON.stringify({ name, type }),
		});
	}

	async deleteTag(tagId: string): Promise<void> {
		return this.request<void>(`/tags/${tagId}`, { method: "DELETE" });
	}

	async bindTag(
		tagIds: string[],
		targetId: string,
		type: "app" | "knowledge",
	): Promise<{ result: string }> {
		return this.request<{ result: string }>("/tag-bindings/create", {
			method: "POST",
			body: JSON.stringify({ tag_ids: tagIds, target_id: targetId, type }),
		});
	}

	async unbindTag(
		tagId: string,
		targetId: string,
		type: "app" | "knowledge",
	): Promise<{ result: string }> {
		return this.request<{ result: string }>("/tag-bindings/remove", {
			method: "POST",
			body: JSON.stringify({ tag_id: tagId, target_id: targetId, type }),
		});
	}

	// --- Conversations ---

	async listChatConversations(
		appId: string,
		page = 1,
		limit = 20,
		sortBy = "-updated_at",
	): Promise<ConversationListResponse> {
		return this.request<ConversationListResponse>(
			`/apps/${appId}/chat-conversations?page=${page}&limit=${limit}&sort_by=${sortBy}`,
		);
	}

	async listCompletionConversations(
		appId: string,
		page = 1,
		limit = 20,
	): Promise<ConversationListResponse> {
		return this.request<ConversationListResponse>(
			`/apps/${appId}/completion-conversations?page=${page}&limit=${limit}`,
		);
	}

	async deleteChatConversation(appId: string, conversationId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/chat-conversations/${conversationId}`, {
			method: "DELETE",
		});
	}

	// --- Messages ---

	async listChatMessages(
		appId: string,
		conversationId: string,
		limit = 20,
		firstId?: string,
	): Promise<MessageListResponse> {
		let url = `/apps/${appId}/chat-messages?conversation_id=${conversationId}&limit=${limit}`;
		if (firstId) url += `&first_id=${firstId}`;
		return this.request<MessageListResponse>(url);
	}

	async getMessage(appId: string, messageId: string): Promise<Message> {
		return this.request<Message>(`/apps/${appId}/messages/${messageId}`);
	}

	// --- Workflow Debug ---

	async runDraftWorkflow(
		appId: string,
		inputs: Record<string, unknown> = {},
	): Promise<ReadableStream<Uint8Array>> {
		if (!this.authenticated) await this.login();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Cookie: this.getCookieHeader(),
		};
		if (this.csrfToken) headers["X-CSRF-Token"] = this.csrfToken;
		const res = await fetch(`${this.baseUrl}/console/api/apps/${appId}/workflows/draft/run`, {
			method: "POST",
			headers,
			body: JSON.stringify({ inputs, files: [] }),
		});
		if (!res.ok) throw new Error(`Dify API ${res.status}: ${await res.text()}`);
		if (!res.body) throw new Error("No response body");
		return res.body;
	}

	async runDraftWorkflowNode(
		appId: string,
		nodeId: string,
		inputs: Record<string, unknown> = {},
	): Promise<WorkflowNodeRunResult> {
		return this.request<WorkflowNodeRunResult>(
			`/apps/${appId}/workflows/draft/nodes/${nodeId}/run`,
			{
				method: "POST",
				body: JSON.stringify({ inputs, query: "", files: [] }),
			},
		);
	}

	async getNodeLastRun(appId: string, nodeId: string): Promise<WorkflowNodeExecution> {
		return this.request<WorkflowNodeExecution>(
			`/apps/${appId}/workflows/draft/nodes/${nodeId}/last-run`,
		);
	}

	async stopWorkflowTask(appId: string, taskId: string): Promise<{ result: string }> {
		return this.request<{ result: string }>(
			`/apps/${appId}/workflow-runs/tasks/${taskId}/stop`,
			{ method: "POST" },
		);
	}

	// --- Workflow Runs (History & Logs) ---

	async listWorkflowRuns(
		appId: string,
		limit = 20,
		status?: string,
		lastId?: string,
	): Promise<WorkflowRunListResponse> {
		let url = `/apps/${appId}/workflow-runs?limit=${limit}`;
		if (status) url += `&status=${status}`;
		if (lastId) url += `&last_id=${lastId}`;
		return this.request<WorkflowRunListResponse>(url);
	}

	async getWorkflowRun(appId: string, runId: string): Promise<WorkflowRun> {
		return this.request<WorkflowRun>(`/apps/${appId}/workflow-runs/${runId}`);
	}

	async getWorkflowRunNodeExecutions(
		appId: string,
		runId: string,
	): Promise<WorkflowNodeExecutionListResponse> {
		return this.request<WorkflowNodeExecutionListResponse>(
			`/apps/${appId}/workflow-runs/${runId}/node-executions`,
		);
	}

	// --- Workflow Versions ---

	async listWorkflowVersions(
		appId: string,
		page = 1,
		limit = 20,
	): Promise<WorkflowVersionListResponse> {
		return this.request<WorkflowVersionListResponse>(
			`/apps/${appId}/workflows?page=${page}&limit=${limit}`,
		);
	}

	async restoreWorkflowVersion(
		appId: string,
		workflowId: string,
	): Promise<{ result: string }> {
		return this.request<{ result: string }>(
			`/apps/${appId}/workflows/${workflowId}/restore`,
			{ method: "POST" },
		);
	}

	async labelWorkflowVersion(
		appId: string,
		workflowId: string,
		markedName: string,
		markedComment = "",
	): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/workflows/${workflowId}`, {
			method: "PATCH",
			body: JSON.stringify({ marked_name: markedName, marked_comment: markedComment }),
		});
	}

	async publishWorkflowWithLabel(
		appId: string,
		markedName?: string,
		markedComment?: string,
	): Promise<{ result: string }> {
		const body: Record<string, string> = {};
		if (markedName) body.marked_name = markedName;
		if (markedComment) body.marked_comment = markedComment;
		return this.request<{ result: string }>(`/apps/${appId}/workflows/publish`, {
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	// --- Triggers ---

	async listTriggers(appId: string): Promise<WorkflowTriggerListResponse> {
		return this.request<WorkflowTriggerListResponse>(`/apps/${appId}/triggers`);
	}

	async setTriggerEnabled(
		appId: string,
		triggerId: string,
		enabled: boolean,
	): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/trigger-enable`, {
			method: "POST",
			body: JSON.stringify({ trigger_id: triggerId, enabled }),
		});
	}

	// --- Environment Variables (via workflow draft) ---

	async updateWorkflowDraftWithEnv(
		appId: string,
		graph: Record<string, unknown>,
		features: Record<string, unknown>,
		hash: string,
		environmentVariables: Array<{ name: string; value: string; value_type: "string" | "number" | "secret" }>,
		conversationVariables: Array<{ name: string; value: string; value_type: string }> = [],
	): Promise<{ result: string }> {
		return this.request<{ result: string }>(`/apps/${appId}/workflows/draft`, {
			method: "POST",
			body: JSON.stringify({
				graph,
				features,
				hash,
				environment_variables: environmentVariables,
				conversation_variables: conversationVariables,
			}),
		});
	}

	// --- Iteration / Loop Node Debug ---

	async runIterationNode(
		appId: string,
		nodeId: string,
		inputs: Record<string, unknown> = {},
	): Promise<WorkflowNodeRunResult> {
		return this.request<WorkflowNodeRunResult>(
			`/apps/${appId}/workflows/draft/iteration/nodes/${nodeId}/run`,
			{
				method: "POST",
				body: JSON.stringify({ inputs, query: "", files: [] }),
			},
		);
	}

	async runLoopNode(
		appId: string,
		nodeId: string,
		inputs: Record<string, unknown> = {},
	): Promise<WorkflowNodeRunResult> {
		return this.request<WorkflowNodeRunResult>(
			`/apps/${appId}/workflows/draft/loop/nodes/${nodeId}/run`,
			{
				method: "POST",
				body: JSON.stringify({ inputs, query: "", files: [] }),
			},
		);
	}

	async getWorkflowRunCount(
		appId: string,
		status?: string,
		timeRange?: string,
	): Promise<WorkflowRunCount> {
		let url = `/apps/${appId}/workflow-runs/count`;
		const params: string[] = [];
		if (status) params.push(`status=${status}`);
		if (timeRange) params.push(`time_range=${timeRange}`);
		if (params.length > 0) url += `?${params.join("&")}`;
		return this.request<WorkflowRunCount>(url);
	}

	// --- listApps with filters ---

	async listAppsFiltered(
		page = 1,
		limit = 30,
		tagIds?: string[],
		mode?: string,
		name?: string,
	): Promise<AppListResponse> {
		const params: string[] = [`page=${page}`, `limit=${limit}`];
		if (tagIds && tagIds.length > 0) {
			for (const id of tagIds) params.push(`tag_ids[]=${encodeURIComponent(id)}`);
		}
		if (mode) params.push(`mode=${encodeURIComponent(mode)}`);
		if (name) params.push(`name=${encodeURIComponent(name)}`);
		return this.request<AppListResponse>(`/apps?${params.join("&")}`);
	}
}
