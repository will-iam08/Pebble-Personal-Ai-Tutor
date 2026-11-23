/**
 * Pebble Local CLI Subscription Bridge (inspired by T3 Code).
 *
 * Lets the Pebble Chrome Extension connect to existing subscription-backed CLIs
 * installed on your machine (Claude Code, OpenAI Codex CLI, Gemini CLI) without
 * needing a separate pay-per-token API key.
 *
 * Usage: npm run bridge
 * Default URL: http://127.0.0.1:4318
 */

import express from 'express';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PEBBLE_BRIDGE_PORT) || 4318;
const HOST = '127.0.0.1';
const CLI_TIMEOUT_MS = 120_000;

type CliId = 'claude' | 'codex' | 'gemini';

interface CliDescriptor {
  id: CliId;
  label: string;
  command: string;
  subscriptionNote: string;
}

const SUPPORTED_CLIS: CliDescriptor[] = [
  {
    id: 'claude',
    label: 'Claude Code CLI',
    command: 'claude',
    subscriptionNote: 'Uses your Claude Pro / Max login',
  },
  {
    id: 'codex',
    label: 'OpenAI Codex CLI',
    command: 'codex',
    subscriptionNote: 'Uses your ChatGPT Plus / Pro login',
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    command: 'gemini',
    subscriptionNote: 'Uses your Google account login',
  },
];

async function isCommandInstalled(command: string): Promise<boolean> {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  try {
    await execFileAsync(probe, [command], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function buildCliInvocation(
  cli: CliId,
  model?: string
): { command: string; args: string[] } {
  const cleanModel = (model || '').trim();
  const useCustomModel = Boolean(cleanModel && cleanModel !== cli && cleanModel !== 'default');

  switch (cli) {
    case 'claude': {
      const args = ['-p', '--output-format', 'text'];
      if (useCustomModel) args.push('--model', cleanModel);
      return { command: 'claude', args };
    }
    case 'codex': {
      const args = ['exec', '-'];
      if (useCustomModel) args.push('-m', cleanModel);
      return { command: 'codex', args };
    }
    case 'gemini': {
      const args = ['-p', ''];
      if (useCustomModel) args.push('-m', cleanModel);
      return { command: 'gemini', args };
    }
  }
}

function runCliCompletion(
  cli: CliId,
  prompt: string,
  model?: string
): Promise<string> {
  const { command, args } = buildCliInvocation(cli, model);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out after ${CLI_TIMEOUT_MS / 1000}s.`));
    }, CLI_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `Could not launch "${command}". Is it installed and on your PATH? (${err.message})`
        )
      );
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            (stderr || stdout || `${command} exited with code ${code}`).trim().slice(0, 500)
          )
        );
        return;
      }
      const trimmed = stdout.trim();
      if (!trimmed) {
        reject(new Error(`${command} returned an empty response.`));
        return;
      }
      resolve(trimmed);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return (
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  );
}

const app = express();
app.use(express.json({ limit: '4mb' }));

// Strict localhost + Chrome Extension CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/health', async (_req, res) => {
  const clis = await Promise.all(
    SUPPORTED_CLIS.map(async (item) => ({
      ...item,
      installed: await isCommandInstalled(item.command),
    }))
  );
  res.json({
    ok: true,
    version: '1.0.0',
    clis,
  });
});

app.post('/v1/complete', async (req, res) => {
  try {
    const { cli = 'claude', model, systemInstruction = '', userPrompt = '' } = req.body as {
      cli?: CliId;
      model?: string;
      systemInstruction?: string;
      userPrompt?: string;
    };

    if (!SUPPORTED_CLIS.some((c) => c.id === cli)) {
      res.status(400).json({ error: `Unsupported CLI "${String(cli)}". Choose claude, codex, or gemini.` });
      return;
    }

    if (!userPrompt.trim()) {
      res.status(400).json({ error: 'Prompt cannot be empty.' });
      return;
    }

    const combinedPrompt = systemInstruction.trim()
      ? `${systemInstruction.trim()}\n\n---\n\n${userPrompt.trim()}`
      : userPrompt.trim();

    const text = await runCliCompletion(cli, combinedPrompt, model);
    res.json({ text });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Local CLI bridge failed.',
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Pebble Local CLI Bridge listening on http://${HOST}:${PORT}`);
  console.log('Supports installed subscription CLIs: claude, codex, gemini');
});
