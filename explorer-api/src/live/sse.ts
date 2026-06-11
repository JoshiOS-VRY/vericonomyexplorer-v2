import type { ServerResponse } from 'node:http';

export interface SsePayload {
  event?: string;
  data: string;
  id?: string;
}

export function writeSse(res: ServerResponse, payload: SsePayload): void {
  if (payload.id) {
    res.write(`id: ${payload.id}\n`);
  }
  if (payload.event) {
    res.write(`event: ${payload.event}\n`);
  }
  for (const line of payload.data.split('\n')) {
    res.write(`data: ${line}\n`);
  }
  res.write('\n');
}

export function initSse(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
}
