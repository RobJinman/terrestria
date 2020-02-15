export class Logger {
  debug(msg: string, ...extra: any[]) {
    console.debug(msg, ...extra);
  }

  info(msg: string, ...extra: any[]) {
    console.info(msg, ...extra);
  }

  warn(msg: string, ...extra: any[]) {
    console.warn(msg, ...extra);
  }

  error(msg: string, ...extra: any[]) {
    console.error(msg, ...extra);
  }
}
