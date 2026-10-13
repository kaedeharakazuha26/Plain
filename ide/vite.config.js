import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite plugin to execute code directly via the Rust binary
function plainLanguagePlugin() {
  const binaryPath = path.resolve(__dirname, '../target/debug/plain');

  return {
    name: 'plain-language-runner',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'GET' && req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', engine: 'rust', binary: binaryPath }));
          return;
        }

        if (req.method === 'POST' && req.url === '/api/terminal/exec') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            let payload = {};
            try {
              payload = JSON.parse(body);
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
              return;
            }

            const { command, args = [], cwd, stdin, syncFile } = payload;
            const workspaceDir = cwd || path.resolve(__dirname, '..');

            if (syncFile && syncFile.name && typeof syncFile.content === 'string') {
              try {
                const fs = await import('fs');
                const filePath = path.resolve(workspaceDir, syncFile.name);
                fs.writeFileSync(filePath, syncFile.content, 'utf8');
              } catch (e) {
                console.warn('Failed to sync file:', e);
              }
            }

            let cmdToRun = command;
            let finalArgs = args;

            if (command === 'plain' || command === './plain') {
              cmdToRun = binaryPath;
            }

            const child = spawn(cmdToRun, finalArgs, {
              cwd: workspaceDir,
              shell: true,
              env: { ...process.env, PATH: `${process.env.HOME}/.cargo/bin:${process.env.PATH}` }
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', d => { stdout += d.toString(); });
            child.stderr.on('data', d => { stderr += d.toString(); });

            if (stdin) {
              child.stdin.write(stdin);
            }
            child.stdin.end();

            child.on('close', code => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                stdout,
                stderr,
                code: code ?? 0
              }));
            });

            child.on('error', err => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                stdout: '',
                stderr: err.message,
                code: 1
              }));
            });
          });
          return;
        }

        if (req.method === 'POST' && req.url === '/api/run') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', () => {
            let code = '';
            try {
              const parsed = JSON.parse(body);
              code = parsed.code ?? '';
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
              return;
            }

            const startTime = performance.now();
            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const child = spawn(binaryPath, ['--json'], {
              cwd: path.resolve(__dirname, '..'),
              env: { ...process.env, PATH: `${process.env.HOME}/.cargo/bin:${process.env.PATH}` }
            });

            const timeout = setTimeout(() => {
              timedOut = true;
              child.kill('SIGKILL');
            }, 6000);

            child.stdout.on('data', data => {
              stdout += data.toString();
            });

            child.stderr.on('data', data => {
              stderr += data.toString();
            });

            child.on('error', err => {
              clearTimeout(timeout);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: `Failed to spawn Rust interpreter: ${err.message}`,
                output: []
              }));
            });

            child.on('close', codeExit => {
              clearTimeout(timeout);
              const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

              if (timedOut) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: false,
                  error: 'Execution timed out (6-second limit reached - possible infinite loop)',
                  output: [],
                  executionTimeMs: durationMs
                }));
                return;
              }

              // Parse JSON output from Rust inspect_source
              try {
                // Stdout might contain the json
                const trimmed = stdout.trim();
                const jsonStart = trimmed.indexOf('{');
                if (jsonStart !== -1) {
                  const jsonStr = trimmed.slice(jsonStart);
                  const result = JSON.parse(jsonStr);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    ...result,
                    executionTimeMs: durationMs,
                    engine: 'rust-native'
                  }));
                  return;
                }
              } catch (parseErr) {
                // fall through if JSON parse fails
              }

              // Fallback if stdout wasn't JSON
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: codeExit === 0,
                output: stdout.split('\n').filter(Boolean),
                error: stderr.trim() || (codeExit !== 0 ? `Process exited with code ${codeExit}` : null),
                executionTimeMs: durationMs,
                engine: 'rust-native'
              }));
            });

            // Write payload (code & inputs) to child's stdin
            child.stdin.write(body);
            child.stdin.end();
          });

          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), plainLanguagePlugin()],
  server: {
    port: 5173,
    host: true
  }
});
