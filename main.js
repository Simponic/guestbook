import http from "node:http";
import fs from "node:fs";
import path from "node:path";

import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SOCKET_PATH = "/var/run/guestbookd/guestbookd.sock";
const HTML_PATH = path.join(process.cwd(), "/html");
const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(HTML_PATH, "index.html"));
});

fs.stat(SOCKET_PATH, (err) => {
  if (!err) fs.unlinkSync(SOCKET_PATH);

  http.createServer(app).listen(SOCKET_PATH, () => {
    fs.chmodSync(SOCKET_PATH, "777");
    console.log("Express server listening at " + SOCKET_PATH);
  });
});
