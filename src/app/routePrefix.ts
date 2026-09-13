export const getRoutePrefix = (baseUrl: string): string =>
  baseUrl === "/" ? "" : baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
