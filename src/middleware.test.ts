import middy from "@middy/core";
import { describe, expect, test } from "vitest";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import {
  NotAcceptable,
  UnsupportedMediaType,
  UnprocessableEntity,
} from "http-errors";

import mcpMiddleware from "./index.js";

const mcpServer = new McpServer({
  name: "test",
  version: "7.7.7",
});
const defaultContext = {} as unknown as Context & {
  jsonRPCMessages: JSONRPCMessage[];
};
const handler = middy().use(mcpMiddleware({ mcpServer }));

describe("mcp middleware happy path", () => {
  test("should acknowledge ping message", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 123 }),
      isBase64Encoded: false,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, defaultContext);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toStrictEqual({
      jsonrpc: "2.0",
      result: {},
      id: 123,
    });
  });
});

describe("mcp middleware errors cases", () => {
  test("shoud throw a 406 when the accept header is not application/json", async () => {
    const event = {
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
    } as unknown as APIGatewayProxyEvent;

    expect(handler(event, defaultContext)).rejects.toThrowError(NotAcceptable);
  });

  test("shoud throw a 415 when the content-type header is not application/json", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
    } as unknown as APIGatewayProxyEvent;

    expect(handler(event, defaultContext)).rejects.toThrowError(
      UnsupportedMediaType
    );
  });
  test("shoud throw a 422 when the body is empty", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "",
    } as unknown as APIGatewayProxyEvent;

    expect(handler(event, defaultContext)).rejects.toThrowError(
      UnprocessableEntity
    );
  });
  test("shoud throw a 422 when the RPC messages are malformed", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key: "value" }),
    } as unknown as APIGatewayProxyEvent;

    expect(handler(event, defaultContext)).rejects.toThrowError(
      UnprocessableEntity
    );
  });
});
