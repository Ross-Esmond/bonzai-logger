export enum LogLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export interface LogEntry {
  hasBeenLogged: boolean;
  level: LogLevel;
  name?: string;
  message: string;
  timestamp: Date;
}

export class Logger {
  private readonly logs: LogEntry[][] = [[]];
  private readonly handledErrors = new WeakSet<Error>();
  private readonly parentLogger?: Logger;

  constructor(parentLogger?: Logger) {
    this.parentLogger = parentLogger;
  }

  log(level: LogLevel, message: string, name?: string): void {
    this.logs[this.logs.length - 1].push({
      hasBeenLogged: false,
      level,
      name,
      message,
      timestamp: new Date(),
    });
  }

  info(name: string, message: string): void {
    this.log(LogLevel.Info, message, name);
  }
  warn(name: string, message: string): void {
    this.log(LogLevel.Warning, message, name);
  }
  error(error: Error): Error;
  error(message: string): Error;
  error(input: any): Error {
    if (typeof input === 'string') {
      this.log(LogLevel.Error, input);
      const error = new Error(input);
      this.addHandledError(error);
      this.parentLogger?.addHandledError(error);
      this.write();
      return error;
    } else if (input instanceof Error) {
      if (!this.handledErrors.has(input)) {
        this.log(LogLevel.Error, input.message);
        this.addHandledError(input);
        this.parentLogger?.addHandledError(input);
        this.write();
      }
      return input;
    } else {
      return this.error(new Error(String(input)));
    }
  }
  addHandledError(err: Error): void {
    this.handledErrors.add(err);
  }

  branch(fn?: () => void): void {
    this.logs.push([]);
    if (fn) {
      try {
        fn();
      } catch (error) {
        throw this.error(error);
      } finally {
        this.trim();
      }
    }
  }

  trim(): void {
    if (this.logs.length <= 1) {
      throw new Error('logger trim was called more times than branch');
    }
    this.logs.pop();
  }

  getChildLogger(): Logger {
    return new Logger(this);
  }

  write(): void {
    if (this.parentLogger) {
      this.parentLogger.write();
    }
    for (const logGroup of this.logs) {
      for (const log of logGroup) {
        if (log.hasBeenLogged) {
          continue;
        }
        if (log.level === LogLevel.Info) {
          console.log(log.message);
        } else if (log.level === LogLevel.Warning) {
          console.warn(log.message);
        } else if (log.level === LogLevel.Error) {
          console.error(log.message);
        }
        log.hasBeenLogged = true;
      }
    }
  }
}
