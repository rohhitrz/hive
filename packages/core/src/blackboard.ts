import { EventEmitter } from "node:events";
import type { BoardEntry, Message } from "./types.js";

// Shared workspace. In-memory for week 1; swap for Redis pub/sub + Postgres in week 2
// without changing the post/list/on interface.
export class Blackboard {
  private entries: BoardEntry[] = [];
  private events = new EventEmitter();

  post(from: string, msg: Message): BoardEntry {
    const entry = { ...msg, id: `m${this.entries.length + 1}`, from, at: Date.now() } as BoardEntry;
    this.entries.push(entry);
    this.events.emit("entry", entry);
    return entry;
  }

  list<T extends BoardEntry["type"]>(type?: T) {
    return this.entries.filter((e) => !type || e.type === type) as Extract<BoardEntry, { type: T }>[];
  }

  on(fn: (entry: BoardEntry) => void) {
    this.events.on("entry", fn);
  }
}
