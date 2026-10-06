import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// Dev-server-only endpoints so the avatar workshop can save into the repo. Never part of a build.
const ID = /^[a-z0-9-]+$/;
const PART = /^[a-zA-Z]+$/;
const SOURCE_DIR = 'avatars';
const OUT_DIR = 'public/assets/avatars';

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function workshopPlugin(): Plugin {
  return {
    name: 'avatar-workshop',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__workshop', async (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        try {
          if (req.method === 'GET' && req.url === '/list') {
            mkdirSync(SOURCE_DIR, { recursive: true });
            return send(200, readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.avatar.json')).map((f) => f.replace('.avatar.json', '')));
          }
          if (req.method === 'POST' && req.url === '/save') {
            const doc = await readJson(req);
            if (!ID.test(doc?.id)) return send(400, { error: 'bad id' });
            mkdirSync(SOURCE_DIR, { recursive: true });
            writeFileSync(join(SOURCE_DIR, `${doc.id}.avatar.json`), JSON.stringify(doc, null, 2) + '\n');
            return send(200, { ok: true });
          }
          if (req.method === 'POST' && req.url === '/export') {
            const { id, parts, rig } = await readJson(req);
            if (!ID.test(id)) return send(400, { error: 'bad id' });
            const dir = join(OUT_DIR, id, 'parts');
            // Start clean so parts deleted in the workshop don't linger as stale PNGs.
            rmSync(dir, { recursive: true, force: true });
            mkdirSync(dir, { recursive: true });
            for (const p of parts as { id: string; png: string }[]) {
              if (!PART.test(p.id)) continue;
              writeFileSync(join(dir, `${p.id}.png`), Buffer.from(p.png.replace(/^data:image\/png;base64,/, ''), 'base64'));
            }
            writeFileSync(join(OUT_DIR, id, 'rig.json'), JSON.stringify(rig, null, 2) + '\n');
            return send(200, { ok: true, dir });
          }
          send(404, { error: 'not found' });
        } catch (e) {
          send(500, { error: String(e) });
        }
      });
    },
  };
}
