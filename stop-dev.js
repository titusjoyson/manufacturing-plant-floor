import { execSync } from 'child_process';
import os from 'os';

const PORTS = [3001, 8080, 1883, 5173, 5174];

console.log('═══════════════════════════════════════════');
console.log('  Stopping Zoladex Manufacturing Simulator');
console.log('═══════════════════════════════════════════');

const isWin = os.platform() === 'win32';
let killedCount = 0;

PORTS.forEach(port => {
  try {
    let pids = [];
    if (isWin) {
      // Find PID using netstat
      const output = execSync(`netstat -ano`).toString();
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.includes(`:${port}`)) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && !pids.includes(pid)) {
              pids.push(pid);
            }
          }
        }
      });
    } else {
      // Find PID using lsof
      const output = execSync(`lsof -t -i:${port}`).toString();
      pids = output.split('\n').map(p => p.trim()).filter(Boolean);
    }

    pids.forEach(pid => {
      if (parseInt(pid) === process.pid) return; // Don't kill self
      try {
        console.log(`[Stop] Killing process PID ${pid} listening on port ${port}...`);
        if (isWin) {
          execSync(`taskkill /F /PID ${pid}`);
        } else {
          process.kill(pid, 'SIGKILL');
        }
        killedCount++;
      } catch (err) {
        // Process might have already closed
      }
    });
  } catch (err) {
    // Port not in use, ignore
  }
});

console.log(`[Done] Port cleanup complete. Closed ${killedCount} services.`);
console.log('═══════════════════════════════════════════');
