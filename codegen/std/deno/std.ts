const files = new Map<number, Uint8Array>();
const listeners = new Map<number, { server: Deno.Listener; buf: Uint8Array }>();
const connections = new Map<number, { conn: Deno.Conn; buf: Uint8Array }>();

const empty = new Uint8Array();

export enum Open {
  // (def open_read 0)
  read = 0,
  // (def open_write 1)
  write = 1,
  // (def open_append 2)
  append = 2,
  // (def open_truncate 3)
  truncate = 3,
  // (def open_create 4)
  create = 4,
  // (def open_create_new 5)
  createNew = 5,
}

// (defun (open: int) [(path: string) (opts: int[])])
export const open = (path: string, opts?: Open[]): Promise<number> => {
  const _opts: Deno.OpenOptions = {
    read: opts ? opts.includes(Open.read) : true,
    write: opts ? opts.includes(Open.write) : false,
    append: opts ? opts.includes(Open.append) : false,
    create: opts ? opts.includes(Open.create) : false,
    createNew: opts ? opts.includes(Open.createNew) : false,
  };
  const fd = Deno.openSync(path, _opts).rid; // TODO: handle errors
  files.set(fd, new Uint8Array(1024 * 32));
  return Promise.resolve(fd);
};

// (defun (close: nil) [(fd: int)])
export const close = (fd: number): Promise<void> => {
  if (files.has(fd)) {
    files.delete(fd);
    new Deno.File(fd).close();
    return Promise.resolve();
  }
  if (listeners.has(fd)) {
    const listener = listeners.get(fd)!;
    listeners.delete(fd);
    listener.server.close();
    return Promise.resolve();
  }
  if (connections.has(fd)) {
    const { conn } = connections.get(fd)!;
    connections.delete(fd);
    conn.close();
    return Promise.resolve();
  }
  return Promise.resolve(); // TODO: handle errors
};

// (defun (read: int[]) [(fd: int)])
export const read = async (fd: number): Promise<Uint8Array> => {
  if (files.has(fd)) {
    const buf = files.get(fd)!;
    const file = new Deno.File(fd);
    let nread = 0;
    while (nread < 1) {
      const result = file.readSync(buf); // TODO: handle errors
      if (result === null) {
        return empty;
      }
      nread += result;
    }
    return buf.subarray(0, nread);
  }
  if (connections.has(fd)) {
    const { conn, buf } = connections.get(fd)!;
    let nread = 0;
    while (nread < 1) {
      const result = await conn.read(buf);
      if (result === null) {
        return empty;
      }
      nread += result;
    }
    return buf.subarray(0, nread);
  }
  return empty;
};

// (defun (write: nil) [(fd: int) (data: int[])])
export const write = async (fd: number, data: Uint8Array): Promise<void> => {
  if (files.has(fd)) {
    let nwritten = 0;
    const file = new Deno.File(fd);
    while (nwritten < data.byteLength) {
      nwritten += file.writeSync(data.subarray(nwritten)); // TODO: handle errors
    }
  }
  if (connections.has(fd)) {
    const { conn } = connections.get(fd)!;
    let nwritten = 0;
    while (nwritten < data.byteLength) {
      nwritten += await conn.write(data.subarray(nwritten));
    }
  }
};

// (defun (unlink: nil) [(path: string)])
export const unlink = async (path: string): Promise<void> => {
  await Deno.remove(path); // TODO: handle errors
};

// (defun (listen: int) [(address: string)])
export const listen = (address: string): Promise<number> => {
  const [h, p] = address.split(":");
  if (!p) {
    return Promise.resolve(-1); // TODO: handle errors
  }
  const host = h || "0.0.0.0";
  const port = Number(p);
  const listener = Deno.listen({ port, hostname: host }); // TODO: handle errors
  listeners.set(listener.rid, {
    server: listener,
    buf: new Uint8Array(1024 * 32),
  });
  return Promise.resolve(listener.rid);
};

// (defun (accept: int) [(listener: int)])
export const accept = async (listener: number): Promise<number> => {
  const _listener = listeners.get(listener);
  if (!_listener) {
    return -1; // TODO: handle errors
  }
  try {
    const conn = await _listener.server.accept();
    connections.set(conn.rid, { conn, buf: new Uint8Array(1024 * 32) });
    return conn.rid;
  } catch (_err) {
    return -1; // TODO: handle errors
  }
};

// (defun (connect: int) [(address: string)])
export const connect = async (address: string): Promise<number> => {
  const [h, p] = address.split(":");
  if (!p) {
    return -1; // TODO: handle errors
  }
  const host = h || "0.0.0.0";
  const port = Number(p);
  const conn = await Deno.connect({ port, hostname: host }); // TODO: handle errors
  connections.set(conn.rid, { conn, buf: new Uint8Array(1024 * 32) });
  return conn.rid;
};
