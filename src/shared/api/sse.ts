/** Минимальный разбор потока text/event-stream: работает с fetch, а значит и с MSW. */
export function formatSse(data: unknown, event = 'message'): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createSseParser(onMessage: (event: string, data: string) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, '\n');
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) onMessage(event, data.join('\n'));
    }
  };
}
