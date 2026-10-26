import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

// Persistent local development database. Does not touch the MongoDB service on 27017.
const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(backend, '.mongo-data');
mkdirSync(dataPath, { recursive: true });
let binary = process.env.MONGOD_BINARY || 'mongod';
if (!process.env.MONGOD_BINARY && process.platform === 'win32') {
  const root = join(process.env.ProgramFiles || 'C:/Program Files', 'MongoDB', 'Server');
  if (existsSync(root)) {
    const version = readdirSync(root).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).find(v => existsSync(join(root, v, 'bin', 'mongod.exe')));
    if (version) binary = join(root, version, 'bin', 'mongod.exe');
  }
}
const child = spawn(binary, ['--dbpath', dataPath, '--replSet', 'p2p-rs', '--bind_ip', '127.0.0.1', '--port', '27018', '--oplogSize', '128', '--wiredTigerCacheSizeGB', '0.25', '--logpath', join(dataPath, 'mongod.log'), '--logappend'], { windowsHide: true, stdio: 'ignore' });
let stopped = false;
child.on('error', error => { stopped = true; console.error(`Cannot start MongoDB: ${error.message}. Install MongoDB or set MONGOD_BINARY.`); process.exitCode = 1; });
child.on('exit', code => { stopped = true; if (code && !process.exitCode) { console.error(`MongoDB exited (${code}). Check ${join(dataPath, 'mongod.log')}. Port 27018 must be free.`); process.exitCode = 1; } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(); });
const pause = () => new Promise(resolve => setTimeout(resolve, 250));
try {
  const deadline = Date.now() + 30000;
  let initialized = false, ready = false;
  while (!stopped && Date.now() < deadline) {
    const client = new mongoose.mongo.MongoClient('mongodb://127.0.0.1:27018/?directConnection=true', { serverSelectionTimeoutMS: 500 });
    try {
      await client.connect();
      if (stopped) break;
      const hello = await client.db('admin').command({ hello: 1 });
      if (hello.setName && hello.setName !== 'p2p-rs') throw new Error('Port 27018 belongs to a different replica set');
      if (!hello.setName && !initialized) {
        await client.db('admin').command({ replSetInitiate: { _id: 'p2p-rs', members: [{ _id: 0, host: '127.0.0.1:27018' }] } });
        initialized = true;
      }
      if (hello.isWritablePrimary && hello.setName === 'p2p-rs') { ready = true; break; }
    } catch (error) {
      if (error.message.includes('different replica set')) throw error;
    } finally { await client.close(); }
    await pause();
  }
  if (!ready) throw new Error('Local replica set did not become ready. Check .mongo-data/mongod.log.');
  console.log('YouSupply local MongoDB ready: mongodb://127.0.0.1:27018/p2p?replicaSet=p2p-rs');
  console.log('Keep this terminal running. In another terminal run npm run dev. Ctrl+C stops this database.');
} catch (error) {
  console.error(error.message); process.exitCode = 1; child.kill();
}
