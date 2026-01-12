#!/usr/bin/env bun
/**
 * Simple test REPL for testing Harbor inter-pane communication
 * 
 * Commands:
 *   echo <text>     - Echo back the text
 *   time            - Show current time
 *   env             - Show HARBOR_* environment variables
 *   add <a> <b>     - Add two numbers
 *   users           - List fake users
 *   user <id>       - Get fake user by ID
 *   slow [ms]       - Respond after delay (default 2000ms)
 *   help            - Show this help
 *   exit            - Exit the REPL
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'repl> '
});

// Fake user database for testing
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' },
];

console.log('Harbor Test REPL v1.0.0');
console.log('Type "help" for available commands\n');

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  const [cmd, ...args] = input.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case 'echo':
      console.log(args.join(' ') || '(empty)');
      break;

    case 'time':
      console.log(new Date().toISOString());
      break;

    case 'env':
      console.log('HARBOR_SESSION:', process.env.HARBOR_SESSION || '(not set)');
      console.log('HARBOR_SOCKET:', process.env.HARBOR_SOCKET || '(not set)');
      console.log('HARBOR_SERVICE:', process.env.HARBOR_SERVICE || '(not set)');
      console.log('HARBOR_WINDOW:', process.env.HARBOR_WINDOW || '(not set)');
      break;

    case 'add':
      const a = parseFloat(args[0]);
      const b = parseFloat(args[1]);
      if (isNaN(a) || isNaN(b)) {
        console.log('Usage: add <number> <number>');
      } else {
        console.log(`${a} + ${b} = ${a + b}`);
      }
      break;

    case 'users':
      console.log(JSON.stringify(users, null, 2));
      break;

    case 'user':
      const id = parseInt(args[0]);
      const user = users.find(u => u.id === id);
      if (user) {
        console.log(JSON.stringify(user, null, 2));
      } else {
        console.log(`User ${id} not found`);
      }
      break;

    case 'slow':
      const delay = parseInt(args[0]) || 2000;
      console.log(`Waiting ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      console.log('Done!');
      break;

    case 'help':
      console.log(`
Available commands:
  echo <text>     Echo back the text
  time            Show current time
  env             Show HARBOR_* environment variables
  add <a> <b>     Add two numbers
  users           List fake users
  user <id>       Get fake user by ID
  slow [ms]       Respond after delay (default 2000ms)
  help            Show this help
  exit            Exit the REPL
`);
      break;

    case 'exit':
      console.log('Goodbye!');
      process.exit(0);
      break;

    case '':
      // Empty input, just show prompt
      break;

    default:
      console.log(`Unknown command: ${cmd}. Type "help" for available commands.`);
  }

  rl.prompt();
});

rl.on('close', () => {
  console.log('\nREPL closed');
  process.exit(0);
});
