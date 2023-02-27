import http from "node:http";
import fs from "node:fs";
import path from "node:path";

import express from "express";
import expireCache from "expire-cache";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SOCKET_PATH = "/var/run/guestbookd/guestbookd.sock";
const GUEST_COUNT_CACHE_MS = 20_000;
const HTML_PATH = path.join(process.cwd(), "/html");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_TOKEN
);
const app = express();

const fetch_count = async () => {
  const { data, error } = await supabase
    .from("signatures")
    .eq("server_name", process.env.SERVER_NAME)
    .select("*", { count: "exact", head: true });
};

const get_count = async () => {
  if (!expireCache.get("guest_count")) {
    const count = await fetch_count();
    expireCache.set("signature-count", count, GUEST_COUNT_CACHE_MS);
  }
  return expireCache.get("signature-count");
};

app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render(path.join(HTML_PATH, "index"), {
    client_ip: req.socket.remoteAddress,
    client_already_sent: false,
    guest_count: 1,
    server_name: process.env.SERVER_NAME,
  });
});

fs.stat(SOCKET_PATH, (err) => {
  if (!err) fs.unlinkSync(SOCKET_PATH);

  http.createServer(app).listen(SOCKET_PATH, () => {
    fs.chmodSync(SOCKET_PATH, "777");
    console.log("Express server listening at " + SOCKET_PATH);
  });
});
