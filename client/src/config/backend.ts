export class BackendUrlError extends Error {
  constructor() {
    super("BACKEND_URL is not configured");
    this.name = "BackendUrlError";
  }
}

export const getBackendUrl = (): string => {
  const backendUrl = process.env.BACKEND_URL?.trim();

  if (!backendUrl) {
    throw new BackendUrlError();
  }

  return backendUrl;
};