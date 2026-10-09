const { spawn } = require('node:child_process');
const path = require('node:path');
if (process.argv.length > 2) throw new Error('Local review uses a fixed loopback host and port; custom launch arguments are not supported.');
// Review remains a development server bound to loopback. An optimized
// production build never contains an authentication bypass.
const child = spawn(process.execPath, [path.join(process.cwd(), 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3000'], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development', ITZLI_LOCAL_REVIEW: '1', VERCEL: '0',
    ITZLI_LOCAL_IMAGE_REVIEW_LEDGER: path.join(process.cwd(), 'data/openai-word-images-pending.json') },
});
child.on('exit', (code) => process.exit(code ?? 0));
