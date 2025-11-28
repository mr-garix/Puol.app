declare module 'ffmpeg-kit-react-native' {
  export class ReturnCode {
    static isSuccess(code: ReturnCode | null): boolean;
  }

  export class FFmpegSession {
    getReturnCode(): Promise<ReturnCode | null>;
    getFailStackTrace(): Promise<string | null>;
  }

  export class FFmpegKit {
    static execute(command: string): Promise<FFmpegSession>;
  }
}
