export const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const tryParseUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

export const isEmailAddress = (text: string): boolean =>
  text.includes("@") && !text.includes("://") && !text.substring(0, text.indexOf("@")).includes(":");

export const hasFileExtension = (url: string, extensions: Set<string>): boolean => {
  if (!url.includes(".")) {
    return false;
  }

  const extension = url.split(".").pop()?.toLowerCase();
  return extension ? extensions.has(extension) : false;
};

export const isAllowedHostname = (hostname: string, allowedHostnames: string[]): boolean =>
  allowedHostnames.includes(hostname);

export const isValidHostname = (hostname: string, allowedBareHostnames: string[]): boolean =>
  hostname.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || isAllowedHostname(hostname, allowedBareHostnames);
