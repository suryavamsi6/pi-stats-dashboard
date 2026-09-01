import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { aggregate } from "./aggregate.js";
const html = readFileSync(new URL("./dashboard.html", import.meta.url), "utf8");
export async function startServer({ port=3847 }={}) {
  const token=randomBytes(18).toString("hex"); let data; const refresh=async()=>{data=await aggregate()}; await refresh();
  const server=createServer(async(req,res)=>{const url=new URL(req.url??"/","http://127.0.0.1"); const supplied=url.searchParams.get("token")??req.headers["x-pi-stats-token"]??""; const ok=supplied.length===token.length&&timingSafeEqual(Buffer.from(supplied),Buffer.from(token)); res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'"); if(req.method!=="GET")return end(res,405,"Method Not Allowed");if(req.headers.host!=="127.0.0.1"&&req.headers.host!==`127.0.0.1:${server.address()?.port}`)return end(res,403,"Forbidden");if(!ok)return end(res,401,"Unauthorized");if(url.pathname==="/"){res.setHeader("Content-Type","text/html; charset=utf-8");return res.end(html.replaceAll("__TOKEN__",token).replace("__DATA__",JSON.stringify(data).replace(/</g,"\\u003c")))}if(url.pathname==="/api/stats"){await refresh();res.setHeader("Content-Type","application/json");return res.end(JSON.stringify(data))}end(res,404,"Not Found")});
  await listen(server, port); const actual=server.address().port; return {server,token,url:`http://127.0.0.1:${actual}/?token=${token}`,close:()=>new Promise(r=>server.close(r))};
}
async function listen(server, port) { try { await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,"127.0.0.1",resolve)}); } catch (error) { if (error.code !== "EADDRINUSE" || port === 0) throw error; await new Promise((resolve,reject)=>{server.removeAllListeners("error");server.once("error",reject);server.listen(0,"127.0.0.1",resolve)}); } }
function end(res,status,text){res.statusCode=status;res.setHeader("Content-Type","text/plain; charset=utf-8");res.end(text)}
