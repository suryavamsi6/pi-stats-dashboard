import test from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../src/server.js";
test("protects loopback dashboard and API",async()=>{const d=await startServer({port:0});try{let r=await fetch(d.url);assert.equal(r.status,200);r=await fetch(new URL("/api/stats?token="+d.token,d.url));assert.equal(r.status,200);assert.equal(r.headers.get("cache-control"),"no-store");r=await fetch(new URL("/api/stats?token="+d.token,d.url),{method:"POST"});assert.equal(r.status,405);r=await fetch("http://127.0.0.1:"+new URL(d.url).port+"/api/stats");assert.equal(r.status,401)}finally{await d.close()}});
