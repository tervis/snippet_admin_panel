'use strict'

//const http = require("http");
//const fs = require("fs");
//const path = require("path");

import { createServer } from "http";
import { promises } from "fs";
import { resolve, join } from "path";

import { Mime } from "mime";
import { WebSocketServer } from "ws";
import { watch } from "chokidar";


//const mime = require("mime");
//const ws = require("ws");
//const chokidar = require("chokidar");

////////////////////
// Project Constants
////////////////////

// Path to the files we want to serve
const ROOT = resolve("./src");

// Port to run the HTTP server on.
const PORT = 3080;

// Port to run the WebSocket server on.
const WS_PORT = 3081;

////////////////////
// HTTP Server
////////////////////

const assetsServer = createServer(async (request, response) => {
  // Special Case: Reject non-GET methods.
  if (request.method !== "GET") {
    const responseBody = `Forbidden Method: ${request.method}`;

    response.writeHead(403, {
      "Content-Type": "plain/text",
      "Content-Length": Buffer.byteLength(responseBody),
    });

    return response.end(responseBody);
  }

  // Special Case: GET '/client.js'
  if (request.url === "/client.js") {
    const responseBody = await promises.readFile("./client.js");

    response.writeHead(200, {
      "Content-Length": responseBody.length,
      "Content-Type": "application/javascript",
    });

    return response.end(responseBody);
  }

  // General Case: GET request for any resource

  // Parse the request URL to get the resource pathname.
  const url = new URL(request.url, `http://${request.headers.host}`);
  let pathname = url.pathname;

  // If the pathname ends with '/', append 'index.html'.
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  try {
    // Try to read the given resource into a Buffer.
    const resourcePath = join(ROOT, pathname);
    let responseBody = await promises.readFile(resourcePath);

    // HTML Files: Inject a <script> tag before </body>
    if (resourcePath.endsWith(".html")) {
      responseBody = responseBody
        .toString()
        .replace("</body>", '<script src="client.js"></script></body>');

      responseBody = Buffer.from(responseBody);
    }

    const mime = new Mime();
    response.writeHead(200, {
      "Content-Type": mime.getType(resourcePath),
      "Content-Length": responseBody.length,
    });

    return response.end(responseBody);
  } catch (e) {
    // Respond to all errors with a 404 response.
    const responseBody = `Cannot GET resource: ${pathname}`;

    response.writeHead(404, {
      "Content-Type": "plain/text",
      "Content-Length": Buffer.byteLength(responseBody),
    });

    return response.end(responseBody);
  }
});

assetsServer.listen(PORT, () => {
  console.log(`Assets Server is running on port: ${PORT}`);
  console.log(assetsServer.address());
});

////////////////////
// WebSocket Server
////////////////////

const reloadServer = new WebSocketServer({
  port: WS_PORT,
});

reloadServer.on("listening", () => {
  console.log(`WebSocket Server is running on port: ${WS_PORT}`);
});

reloadServer.on("reload", () => {
  reloadServer.clients.forEach((client) => {
    client.send("RELOAD");
  });
});

////////////////////
// File Watching
////////////////////

watch(ROOT + "/**/*.*").on("all", () => {
  reloadServer.emit("reload");
});