#!/usr/bin/env node
import { createInterface } from "node:readline";
import {
  generateEastMoneyOnePagerStructured,
  type EastMoneyOnePagerConfig,
} from "../src/eastmoney-onepager.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
};

function writeResponse(res: JsonRpcResponse): void {
  process.stdout.write(`${JSON.stringify(res)}\n`);
}

function parseConfigFromEnv(): EastMoneyOnePagerConfig {
  const endpoint = process.env.EASTMONEY_ENDPOINT ?? "http://datacenter.eastmoney.com";
  const timeoutMsRaw = process.env.EASTMONEY_TIMEOUT_MS;
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : 10_000;
  return {
    enabled: true,
    endpoint,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 10_000,
  };
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let req: JsonRpcRequest;
  try {
    req = JSON.parse(line) as JsonRpcRequest;
  } catch {
    return;
  }

  if (typeof req.id !== "number") {
    return;
  }

  try {
    if (req.method === "initialize") {
      writeResponse({
        jsonrpc: "2.0",
        id: req.id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "eastmoney-mcp", version: "0.1.0" },
          capabilities: { tools: {} },
        },
      });
      return;
    }

    if (req.method === "tools/list") {
      writeResponse({
        jsonrpc: "2.0",
        id: req.id,
        result: {
          tools: [
            {
              name: "eastmoney.onepager",
              description: "Generate structured One Pager for a company",
              inputSchema: {
                type: "object",
                properties: {
                  companyName: { type: "string", description: "Company name or stock code" },
                },
                required: ["companyName"],
              },
            },
          ],
        },
      });
      return;
    }

    if (req.method === "tools/call") {
      const name = String(req.params?.name ?? "");
      const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
      if (name !== "eastmoney.onepager") {
        writeResponse({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32602, message: `Unknown tool: ${name}` },
        });
        return;
      }

      const companyName = String(args.companyName ?? "").trim();
      if (!companyName) {
        writeResponse({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32602, message: "companyName is required" },
        });
        return;
      }

      const config = parseConfigFromEnv();
      const result = await generateEastMoneyOnePagerStructured({
        companyName,
        config,
      });

      if (!result.ok) {
        writeResponse({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32000, message: result.error },
        });
        return;
      }

      writeResponse({
        jsonrpc: "2.0",
        id: req.id,
        result: {
          content: [{ type: "text", text: result.markdown }],
          structured: result.structured,
        },
      });
      return;
    }

    writeResponse({
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32601, message: `Method not found: ${req.method}` },
    });
  } catch (err) {
    writeResponse({
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32000, message: String(err) },
    });
  }
});

rl.on("close", () => {
  process.exit(0);
});
