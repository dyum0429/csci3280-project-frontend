declare module "@ffmpeg/ffmpeg" {
    export function createFFmpeg(config: { log: boolean }): any;
    export function fetchFile(file: Blob | string): Promise<Uint8Array>;
  }
  