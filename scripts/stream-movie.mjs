import http from 'node:http';
import {createReadStream, statSync, readFileSync, mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {resolve} from 'node:path';

const file = resolve(process.argv[2] || '');
if (!process.argv[2] || !statSync(file).isFile()) throw new Error('Usage: node scripts/stream-movie.mjs /path/to/movie.mp4');
const size = statSync(file).size;
const state = `${homedir()}/.local/state/portfolio-stream`;
mkdirSync(state, {recursive:true, mode:0o700});
const tokenFile = `${state}/token`;
if (!existsSync(tokenFile)) writeFileSync(tokenFile, randomBytes(32).toString('hex'), {mode:0o600});
const token = readFileSync(tokenFile,'utf8').trim();
const valid = value => typeof value === 'string' && Buffer.byteLength(value) === Buffer.byteLength(token) && timingSafeEqual(Buffer.from(value), Buffer.from(token));
const page = readFileSync(new URL('../public/watch/index.html', import.meta.url));
const server = http.createServer(async (req,res) => {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const path = new URL(req.url,'http://localhost').pathname;
  const end = (status,body='') => {res.writeHead(status); res.end(body);};
  if(path === '/watch/' && ['GET','HEAD'].includes(req.method)) {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    return end(200,req.method === 'HEAD' ? '' : page);
  }
  if(path === '/watch/session' && req.method === 'POST') {
    if(req.headers.origin !== 'https://watch.mattlack.com') return end(403);
    let body='';
    try { for await (const chunk of req) {body += chunk; if(body.length > 256) return end(413);} } catch {return end(400);}
    if(!valid(body)) return end(401);
    res.setHeader('Set-Cookie',`watch_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/watch/; Max-Age=43200`);
    return end(204);
  }
  const cookie = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('watch_session='))?.slice(14);
  if(!valid(cookie)) return end(401);
  if(path !== '/watch/movie.mp4') return end(404);
  if(!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD'); return end(405);}
  res.setHeader('Content-Type','video/mp4');
  res.setHeader('Accept-Ranges','bytes');
  let start=0,stop=size-1,status=200;
  if(req.headers.range) {
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    const invalid=()=>{res.setHeader('Content-Range',`bytes */${size}`);return end(416);};
    if(!match || (!match[1] && !match[2])) return invalid();
    if(!match[1]) {const suffix=Number(match[2]); if(!Number.isSafeInteger(suffix)||suffix<=0)return invalid(); start=Math.max(0,size-suffix);}
    else {start=Number(match[1]); stop=match[2]?Math.min(Number(match[2]),size-1):size-1;}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(stop)||start>=size||start>stop)return invalid();
    status=206; res.setHeader('Content-Range',`bytes ${start}-${stop}/${size}`);
  }
  res.setHeader('Content-Length',stop-start+1);
  res.writeHead(status);
  if(req.method==='HEAD')return res.end();
  const stream=createReadStream(file,{start,end:stop});
  stream.on('error',()=>res.destroy()); res.on('close',()=>stream.destroy()); stream.pipe(res);
});
let tunnel,awake,retry,stopping=false;
function connect(){
  tunnel=spawn('ssh',['-N','-T','-o','BatchMode=yes','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3','-o','ConnectTimeout=10','-R','127.0.0.1:18765:127.0.0.1:18765','events'],{stdio:['ignore','ignore','inherit']});
  tunnel.on('error',e=>console.error(e.message));
  tunnel.on('close',()=>{if(!stopping)retry=setTimeout(connect,5000);});
}
server.listen(18765,'127.0.0.1',()=>{
  writeFileSync(`${state}/pid`,String(process.pid),{mode:0o600});
  console.log('Local stream ready; connecting SSH relay.');
  if(process.platform==='darwin') {awake=spawn('caffeinate',['-i','-w',String(process.pid)],{stdio:'ignore'}); awake.on('error',()=>{});}
  connect();
});
function shutdown(){stopping=true;clearTimeout(retry);tunnel?.kill();awake?.kill();server.close();server.closeAllConnections();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
