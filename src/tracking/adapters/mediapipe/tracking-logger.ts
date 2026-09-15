export const logger = {
  info: (message: string) => console.info(`[tracking] ${message}`),
  warn: (message: string) => console.warn(`[tracking] ${message}`),
  error: (message: string) => console.error(`[tracking] ${message}`),
};
