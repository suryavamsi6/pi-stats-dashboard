import { startServer } from "../src/server.js";
import { spawn } from "node:child_process";
let dashboard;
function openBrowser(url) {
  const [command,args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const child=spawn(command,args,{detached:true,stdio:"ignore"}); child.unref();
}
export default function statsExtension(pi) {
  pi.registerCommand("stats", { description: "Open the Pi usage statistics dashboard", handler: async (_args, ctx) => {
    try { dashboard ??= await startServer(); openBrowser(dashboard.url); ctx.ui?.notify?.(`Pi Stats: ${dashboard.url}`, "info"); }
    catch (error) { ctx.ui?.notify?.(`Pi Stats failed: ${error.message}`, "error"); }
  }});
  pi.on("session_shutdown", async () => { if(dashboard){await dashboard.close().catch(()=>{});dashboard=undefined;} });
}
