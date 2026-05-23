import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DifyClient } from "../dify-client.js";

export const registerWorkspaceMemberTools = (server: McpServer, client: DifyClient) => {
	server.registerTool(
		"list_workspace_members",
		{
			description: "List all members of the current workspace",
			inputSchema: {
				page: z.number().optional().describe("Page number (default 1)"),
				limit: z.number().optional().describe("Items per page (default 30)"),
			},
			annotations: { readOnlyHint: true },
		},
		async ({ page, limit }) => {
			try {
				const result = await client.listWorkspaceMembers(page ?? 1, limit ?? 30);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"invite_member",
		{
			description: "Invite a new member to the workspace by email",
			inputSchema: {
				email: z.string().email().describe("Email address to invite"),
				role: z
					.enum(["normal", "editor", "admin"])
					.describe("Role to assign (normal, editor, admin)"),
				language: z
					.string()
					.optional()
					.describe("Invitation email language, e.g. 'en-US' or 'zh-Hans' (default: en-US)"),
			},
		},
		async ({ email, role, language }) => {
			try {
				const result = await client.inviteMember(email, role, language ?? "en-US");
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"update_member_role",
		{
			description: "Update the role of an existing workspace member",
			inputSchema: {
				member_id: z.string().describe("Member ID (from list_workspace_members)"),
				role: z.enum(["normal", "editor", "admin"]).describe("New role to assign"),
			},
			annotations: { idempotentHint: true },
		},
		async ({ member_id, role }) => {
			try {
				const result = await client.updateMemberRole(member_id, role);
				return { content: [{ type: "text", text: `Updated: ${result.result}` }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);

	server.registerTool(
		"remove_member",
		{
			description: "Remove a member from the workspace",
			inputSchema: {
				member_id: z.string().describe("Member ID to remove (from list_workspace_members)"),
			},
			annotations: { destructiveHint: true },
		},
		async ({ member_id }) => {
			try {
				const result = await client.removeMember(member_id);
				return { content: [{ type: "text", text: `Removed: ${result.result}` }] };
			} catch (e) {
				return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
			}
		},
	);
};
