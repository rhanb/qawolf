import { EventEmitter } from "events";
import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { JWT_KEY } from "../../../lib/client";
import { File, User } from "../../../lib/types";

export class FileModel extends EventEmitter {
  _doc = new Y.Doc();
  _awareness = new Awareness(this._doc);
  _content = this._doc.getText("file.content");
  _metadata = this._doc.getMap("file.metadata");

  _file?: File;
  _provider?: WebsocketProvider;

  constructor() {
    super();

    this._content.observe(() => {
      this.emit("changed", { key: "content" });
    });

    this._metadata.observe(({ keysChanged }) => {
      keysChanged.forEach((key) => this.emit("changed", { key }));
    });
  }

  get awareness(): Awareness {
    return this._awareness;
  }

  bind<T>(key: string, callback: (value: T) => void): () => void {
    const onChange = (event: { key: string }) => {
      if (event.key === key) callback(this[key]);
    };

    this.on("changed", onChange);

    // allow time for the unbind to be set
    setTimeout(() => callback(this[key]), 0);

    return () => this.off("changed", onChange);
  }

  get changed_keys(): string[] {
    const keys = this._metadata.get("changed_keys") || "";
    if (keys.length < 1) return [];

    return keys.split(",");
  }

  get content(): string {
    return this.is_initialized
      ? this._content.toJSON()
      : this._file?.content || "";
  }

  get error(): string {
    return this._metadata.get("error") || "";
  }

  delete(index: number, length: number): void {
    this._content.delete(index, length);
  }

  didCommit(): void {
    if (!this.is_initialized) return;

    this._metadata.set("committed_at", Date.now());
  }

  dispose(): void {
    this._provider?.destroy();
    this._provider = null;
    this._doc.destroy();
    this.removeAllListeners();
  }

  get id(): string | undefined {
    return this._file?.id;
  }

  get is_initialized(): boolean {
    return !!this._metadata.get("is_initialized");
  }

  insert(index: number, text: string): void {
    this._content.insert(index, text);
  }

  get path(): string {
    return this._metadata.get("path") || this._file?.path || "";
  }

  set path(value: string) {
    this._metadata.set("path", value);
  }

  setFile(file: File): void {
    // only set the file once
    if (this._file) return;

    this._file = file;

    this._provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_MULTIPLAYER_URL,
      file.id,
      this._doc,
      {
        awareness: this.awareness,
        params: { authorization: localStorage.getItem(JWT_KEY) },
      }
    );

    this.emit("changed", { key: "content" });
    this.emit("changed", { key: "path" });
  }

  setUserState(user: User, created_at: number): void {
    this.awareness.setLocalStateField("user", {
      avatar_url: user.avatar_url,
      // used to determine the color
      created_at: created_at,
      email: user.email,
      wolf_variant: user.wolf_variant,
    });
  }
}
