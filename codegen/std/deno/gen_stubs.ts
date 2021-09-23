import { readLines } from "https://deno.land/std@0.108.0/io/bufio.ts";

const file = await Deno.open(new URL("std.ts", import.meta.url));

for await (const line of readLines(file)) {
  const trimmed = line.trim();
  if (trimmed.startsWith("//")) {
    console.log(trimmed.slice(2).trim());
  }
}
