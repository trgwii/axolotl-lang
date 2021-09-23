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

const fd = open("file.txt", [Open.write, Open.create]);

await write(fd, toBuf("hello"));

close(fd);

const fd2 = open("file.txt", [Open.read]);

console.log(toString(await read(fd2)));

close(fd2);

unlink("file.txt");

const server = listen(":8090");

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

    close(conn);
  }
})();

const conn = await connect("127.0.0.1:8090");

await write(
  conn,
  toBuf("POST / HTTP/1.1\r\nHost:127.0.0.1:8090\r\n\r\nHELLO WORLD\r\n"),
);

console.log(toString(await read(conn)));

close(conn);
