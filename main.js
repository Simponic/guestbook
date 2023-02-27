import http from "node:http";
import fs from "node:fs";
import path from "node:path";

import notifier from "node-notifier";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SOCKET_PATH = "/var/run/guestbookd/guestbookd.sock";
const GUEST_COUNT_CACHE_SEC = 20;
const HTML_PATH = path.join(process.cwd(), "/html");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_TOKEN
);

const app = express();

const fetch_count = async () => {
  const { count, error } = await supabase
    .from("signatures")
    .select("*", { count: "exact" })
    .eq("server_name", process.env.SERVER_NAME);

  return count;
};

const fetch_signature_by_client_ip = async (ip) => {
  return await supabase
    .from("signatures")
    .select("*")
    .eq("client_ip", ip)
    .eq("server_name", process.env.SERVER_NAME)
    .limit(1)
    .single();
};

const get_ip = (req) => req.headers["x-real-ip"] || req.socket.remoteAddress;

const render = async (req, res) => {
  const ip = get_ip(req).toString();
  const count = await fetch_count();
  const { data, error } = await fetch_signature_by_client_ip(ip);

  res.render(path.join(HTML_PATH, "index"), {
    client_ip: ip,
    client_message: data?.message,
    guest_count: count,
    server_name: process.env.SERVER_NAME,
  });
};

app.set("view engine", "ejs");
app.set("trust proxy", true);

app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/", async (req, res) => render(req, res));

app.post("/", async (req, res) => {
  const { data, error } = await supabase.from("signatures").insert({
    server_name: process.env.SERVER_NAME,
    client_ip: get_ip(req),
    message: req.body.message,
  });

  render(req, res);
});

fs.stat(SOCKET_PATH, (err) => {
  if (!err) fs.unlinkSync(SOCKET_PATH);

  http.createServer(app).listen(SOCKET_PATH, () => {
    fs.chmodSync(SOCKET_PATH, "777");
    console.log("Express server listening at " + SOCKET_PATH);
  });
});

// Notifications

const channel = supabase
  .channel("table-db-changes")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "signatures",
    },
    (payload) =>
      notifier.notify({
        title: `Guest Book - New Message On ${payload.new.server_name}`,
        message: payload.new.message.replaceAll("\n", ""),
      })
  )
  .subscribe();
