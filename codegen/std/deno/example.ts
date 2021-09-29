import {
  accept,
  close,
  connect,
  listen,
  Open,
  open,
  read,
  unlink,
  write,
} from "./std.ts";

const toString = (x: Uint8Array) => new TextDecoder().decode(x);
const toBuf = (s: string) => new TextEncoder().encode(s);

const fd = await open("file.txt", [Open.write, Open.create]);

await write(fd, toBuf("hello"));

await close(fd);

const fd2 = await open("file.txt", [Open.read]);

console.log(toString(await read(fd2)));

await close(fd2);

await unlink("file.txt");

const server = await listen(":8090");

(async () => {
  let conn = 0;
  setTimeout(() => {
    close(server);
  }, 3000);
  while ((conn = await accept(server)) !== -1) {
    console.log(toString(await read(conn)));

    await write(
      conn,
      toBuf(
        "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nHello",
      ),
    );

    await close(conn);
  }
})();

const conn = await connect("127.0.0.1:8090");

await write(
  conn,
  toBuf("POST / HTTP/1.1\r\nHost:127.0.0.1:8090\r\n\r\nHELLO WORLD\r\n"),
);

console.log(toString(await read(conn)));

await close(conn);
