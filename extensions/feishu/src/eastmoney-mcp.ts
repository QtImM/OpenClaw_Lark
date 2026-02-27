import { spawn } from "node:child_process";
import path from "node:path";
import type { FeishuConfig } from "./types.js";

export type EastMoneyMcpConfig = {
  enabled: boolean;
  command: string;
  args: string[];
  timeoutMs: number;
  fallbackToDirect: boolean;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
};

export type EastMoneyMcpResult =
  | {
      ok: true;
      markdown: string;
      structured?: Record<string, unknown>;
    }
  | {
      ok: false;
      error: string;
    };

export function resolveEastMoneyMcpConfig(
  feishuCfg: FeishuConfig,
  env: NodeJS.ProcessEnv,
): EastMoneyMcpConfig {
  const fromConfig = feishuCfg.eastmoneyMcp;
  const enabled = fromConfig?.enabled ?? false;
  const command = fromConfig?.command ?? env.EASTMONEY_MCP_COMMAND ?? "bun";
  const defaultArgs = ["extensions/feishu/mcp/eastmoney-mcp-server.ts"];
  const args = fromConfig?.args ?? defaultArgs;
  const timeoutMs = fromConfig?.timeoutMs ?? 15_000;
  const fallbackToDirect = fromConfig?.fallbackToDirect ?? false;
  return { enabled, command, args, timeoutMs, fallbackToDirect };
}

function buildRequest(id: number, method: string, params?: Record<string, unknown>): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params,
  };
}

async function sendRpc(
  stdin: NodeJS.WritableStream,
  pending: Map<number, (resp: JsonRpcResponse) => void>,
  req: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  return new Promise((resolve) => {
    pending.set(req.id, resolve);
    stdin.write(`${JSON.stringify(req)}\n`);
  });
}

function parseTextResult(result?: Record<string, unknown>): string | null {
  const content = result?.content;
  if (!Array.isArray(content)) return null;
  for (const item of content) {
    if (item && typeof item === "object" && (item as { type?: string }).type === "text") {
      const text = (item as { text?: string }).text;
      if (typeof text === "string") return text;
    }
  }
  return null;
}

export async function callEastMoneyMcpOnePager(params: {
  companyName: string;
  config: EastMoneyMcpConfig;
  log?: (msg: string) => void;
}): Promise<EastMoneyMcpResult> {
  const { companyName, config, log } = params;
  const scriptCwd = process.cwd();
  const resolvedArgs = config.args.map((arg) =>
    arg.endsWith("eastmoney-mcp-server.ts") ? path.resolve(scriptCwd, arg) : arg,
  );

  const child = spawn(config.command, resolvedArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  const pending = new Map<number, (resp: JsonRpcResponse) => void>();
  let buffer = "";
  let stderr = "";
  let closed = false;

  const timeout = setTimeout(() => {
    if (!closed) {
      closed = true;
      child.kill("SIGKILL");
    }
  }, config.timeoutMs);

  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line.length > 0) {
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          if (typeof msg.id === "number") {
            const resolver = pending.get(msg.id);
            if (resolver) {
              pending.delete(msg.id);
              resolver(msg);
            }
          }
        } catch (err) {
          log?.(`eastmoney mcp: failed to parse response: ${String(err)}`);
        }
      }
      index = buffer.indexOf("\n");
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });

  try {
    const initResp = await sendRpc(child.stdin, pending, buildRequest(1, "initialize", {
      protocolVersion: "2024-11-05",
      clientInfo: { name: "openclaw", version: "eastmoney-mcp-client" },
      capabilities: {},
    }));
    if (initResp.error) {
      return { ok: false, error: `MCP initialize failed: ${initResp.error.message}` };
    }

    const callResp = await sendRpc(child.stdin, pending, buildRequest(2, "tools/call", {
      name: "eastmoney.onepager",
      arguments: { companyName },
    }));

    if (callResp.error) {
      return { ok: false, error: `MCP tool error: ${callResp.error.message}` };
    }

    const markdown = parseTextResult(callResp.result) ?? "";
    const structured =
      callResp.result?.structured && typeof callResp.result.structured === "object"
        ? (callResp.result.structured as Record<string, unknown>)
        : undefined;

    if (!markdown && !structured) {
      return {
        ok: false,
        error: "MCP tool returned empty result",
      };
    }

    return { ok: true, markdown, structured };
  } catch (err) {
    return { ok: false, error: `MCP call failed: ${String(err)}` };
  } finally {
    clearTimeout(timeout);
    if (!closed) {
      child.kill("SIGTERM");
    }
    if (stderr.trim()) {
      log?.(`eastmoney mcp stderr: ${stderr.trim()}`);
    }
  }
}
