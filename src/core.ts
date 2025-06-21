export interface UrlMatch {
  raw: string;
  normalized: string;
  index: number;
}

export interface ExtractUrlsOptions {
  /**
   * If true, only URLs that start with a protocol (e.g., "https://") or are protocol-relative (i.e., "//") will be
   * extracted and URLs like "example.com" will be ignored.
   * @default false
   */
  requireProtocol?: boolean;
  /**
   * The protocol to prepend to URLs without one. Ignored if `requireProtocol` is true.
   * @default "https"
   */
  defaultProtocol?: string;
  /**
   * An array of allowed protocol schemes. If provided, only URLs with these protocols will be matched. If null, any
   * protocol is allowed.
   * @default ["http", "https"]
   */
  allowedProtocols?: string[] | null;
  /**
   * A array of file extensions that are considered part of a valid URL only if a protocol or path is present. This
   * prevents treating a filename like "readme.md" as a domain. Because TLDs have a minimum of two characters,
   * extensions of _less than_ two characters implicitly included.
   * @default [DEFAULTS.extensionsRequiringProtocol]
   */
  extensionsRequiringProtocol?: string[];
  /**
   * An array of bare domains to allow if a potential URL does not have a TLD (e.g., "https://localhost").
   * @default ["localhost"]
   */
  allowedBareHostnames?: string[];
  /**
   * If true, URLs will be deduplicated based on their normalized form.
   * @default false
   */
  deduplicate?: boolean;
}

export type CompleteOptions = Required<ExtractUrlsOptions>;

export const DEFAULTS: CompleteOptions = {
  requireProtocol: false,
  defaultProtocol: "https",
  allowedProtocols: ["http", "https"],
  // prettier-ignore
  extensionsRequiringProtocol: [
    // Document & Text Files (excluded valid TLDs: md)
    "txt", "pdf", "doc", "docx", "odt", "rtf", "rtfd", "tex", "wpd", "pages", "pages-tef", "epub", "mobi", "azw", "ps",
    "eps", "fb2", "lit", "pdb", "prc", "lrf", "djvu",

    // Spreadsheet & Data Files
    "csv", "xls", "xlsx", "ods", "numbers", "numbers-tef", "json", "xml", "yaml", "yml", "toml", "ini", "conf", "cfg",
    "log", "env", "properties", "reg",

    // Presentation Files
    "ppt", "pptx", "odp", "key", "key-tef",

    // Image Files
    "png", "jpg", "jpeg", "gif", "webp", "svg", "tiff", "tif", "bmp", "psd", "heic", "heif", "avif", "ico", "raw",
    "cr2", "nef", "arw", "dng", "dcm", "dicom", "fits", "hdr", "exr",

    // Audio Files
    "mp3", "wav", "aac", "ogg", "oga", "flac", "m4a", "wma", "mid", "midi", "opus", "ra", "rm", "3ga", "amr", "caf",

    // Video Files
    "mp4", "mov", "webm", "avi", "mkv", "flv", "wmv", "mpg", "mpeg", "m4v", "3gp", "ogv", "vob", "ts", "mts", "m2ts",
    "divx", "xvid",

    // Archive & Compressed Files (excluded valid TLDs: zip)
    "rar", "7z", "tar", "gz", "bz2", "xz", "iso", "dmg", "pkg", "cab", "lzh", "ace", "arj", "lha", "zoo", "arc", "pak",

    // Font Files
    "woff", "woff2", "ttf", "otf", "eot",

    // Web Development
    "html", "htm", "css", "less", "sass", "scss", "js", "jsx", "ts", "tsx", "vue", "svelte", "map", "wasm",

    // Programming & Scripting (excluded valid TLDs: rs, pm)
    "py", "rb", "php", "java", "class", "jar", "cpp", "hpp", "cs", "go", "swift", "sh", "zsh", "bash", "bat", "ps1",
    "pl", "patch", "diff", "lua", "jl", "kt", "dart", "elm", "clj", "hs", "ml", "fs", "vb", "pas", "scala", "groovy",
    "perl", "tcl", "awk", "sed", "vim", "emacs", "unity", "unitypackage", "blend", "max", "ma", "mb", "apk", "ipa",
    "aab", "xcodeproj", "xcworkspace",

    // CAD & Design Files
    "dwg", "dxf", "ai", "sketch", "fig", "obj", "fbx", "stl", "dae", "glb", "gltf",

    // System & Executable Files (excluded valid TLDs: app, so)
    "exe", "dll", "bin", "msi", "deb", "rpm",

    // Database Files
    "sql", "db", "sqlite", "mdb", "accdb",

    // Virtual Machine & Container Files
    "ova", "ovf", "qcow2", "ipsw", "iso", "vdi", "vhd", "vhdx", "vmdk", "vmsd", "qed",

    // Configuration Files
    "dockerfile", "docker-compose", "k8s", "helm", "plist", "entitlements",

    // Backup & Temporary Files
    "bak", "tmp", "temp", "swp", "swo", "old", "orig",
  ],
  allowedBareHostnames: ["localhost"],
  deduplicate: false,
};

// Constants for punctuation handling
export const MIN_URL_LENGTH = 4;
export const PUNCTUATION_PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  "<": ">",
  "`": "`",
  "'": "'",
  '"': '"',
  "\u2018": "\u2019", // Smart single quotes
  "\u201C": "\u201D", // Smart double quotes
};
export const PUNCTUATION_SINGLES = new Set([
  ".",
  "!",
  "?",
  ",",
  ":",
  ";",
  "-",
  "\u2013", // En dash
  "\u2014", // Em dash
]);
export const ALL_PUNCTUATION = new Set([
  ...Object.keys(PUNCTUATION_PAIRS),
  ...Object.values(PUNCTUATION_PAIRS),
  ...PUNCTUATION_SINGLES,
]);

export const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Permissive regex builder: finds URL-like substrings for post-processing
export const buildRegex = (allowedBareHostnames: string[]): RegExp => {
  const protocol = "(?:[a-zA-Z][a-zA-Z0-9+.-]*:\\/\\/|\\/\\/)?";
  const www = "(?:www\\.)?";
  const userInfo = "(?:[a-zA-Z0-9._~!$&'()*+,;=%-]+(?::[a-zA-Z0-9._~!$&'()*+,;=%-]*)?@)?";
  const label = "[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]{0,61}[\\p{L}\\p{N}])?";
  const tld = "[\\p{L}]{2,}";
  const fqdn = `(?:(?:${label}\\.)+${tld})`;
  const ipv4 = "(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)";
  const hostParts = [fqdn, ipv4, ...allowedBareHostnames.map((domain) => escapeRegExp(domain))];
  const host = `(?:${hostParts.join("|")})`;
  const port = "(?::\\d{1,5})?";
  const path = "(?:\\/[^\\s<>?#]*)?";
  const query = "(?:\\?[^\\s<>#]*)?";
  const fragment = "(?:#[^\\s<>]*)?";
  const pattern = `(${protocol}${www}${userInfo}${host}${port}${path}${query}${fragment})`;
  return new RegExp(pattern, "giu");
};

// Simple URL parser wrapper
export const tryParseUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

// Check if string is an email address
export const isEmailAddress = (text: string): boolean =>
  text.includes("@") && !text.includes("://") && !text.substring(0, text.indexOf("@")).includes(":");

// Check if potential match has a file extension that requires a protocol to be considered a valid URL
export const hasFileExtension = (url: string, extensions: Set<string>): boolean => {
  if (!url.includes(".")) {
    return false;
  }

  const extension = url.split(".").pop()?.toLowerCase();
  return extension ? extensions.has(extension) : false;
};

// Check if hostname is allowed without TLD
export const isAllowedHostname = (hostname: string, allowedBareHostnames: string[]): boolean =>
  allowedBareHostnames.includes(hostname);

// Check if hostname is valid (has TLD, is IP, or is explicitly allowed)
export const isValidHostname = (hostname: string, allowedBareHostnames: string[]): boolean =>
  hostname.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || isAllowedHostname(hostname, allowedBareHostnames);

// Extract protocol from URL string
export const resolveProtocol = (
  url: string,
  config: CompleteOptions
): { urlHasProtocol: boolean; resolvedProtocol: string | undefined; isDefaultProtocol: boolean } => {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//.exec(url);

  // Has protocol
  if (match) {
    return { urlHasProtocol: true, resolvedProtocol: match[1], isDefaultProtocol: false };
  }

  // Has protocol-relative URL
  if (url.startsWith("//") && config.defaultProtocol.length > 0) {
    return { urlHasProtocol: true, resolvedProtocol: config.defaultProtocol, isDefaultProtocol: false };
  }

  // No protocol but default protocol is set
  if (!config.requireProtocol && config.defaultProtocol.length > 0) {
    return { urlHasProtocol: false, resolvedProtocol: config.defaultProtocol, isDefaultProtocol: true };
  }

  return { urlHasProtocol: false, resolvedProtocol: undefined, isDefaultProtocol: false };
};

// Check if URL should be excluded based on configuration
export const shouldExcludeUrl = (
  url: URL,
  rawUrlString: string,
  isDefaultProtocol: boolean,
  config: CompleteOptions
): boolean => {
  const extensionsSet = new Set(config.extensionsRequiringProtocol);

  // Missing protocol
  if (config.requireProtocol && isDefaultProtocol) {
    return true;
  }

  // Invalid protocol
  if (config.allowedProtocols && !config.allowedProtocols.includes(url.protocol.slice(0, -1))) {
    return true;
  }

  // Known file extension without protocol/path
  if (isDefaultProtocol && url.pathname === "/" && hasFileExtension(rawUrlString, extensionsSet)) {
    return true;
  }

  // Invalid hostname
  if (!isValidHostname(url.hostname, config.allowedBareHostnames)) {
    return true;
  }

  return false;
};

// Recursively remove punctuation from URL boundaries
export const removePunctuation = (url: string): string => {
  const firstChar = url.charAt(0);
  const lastChar = url.charAt(url.length - 1);

  const openingPairForLastChar = Object.keys(PUNCTUATION_PAIRS).find((key) => PUNCTUATION_PAIRS[key] == lastChar);
  const shouldRemoveLeadingChar = ALL_PUNCTUATION.has(firstChar);
  const shouldRemoveTrailingChar =
    // Remove the closing character if it has a pair and is not balanced...
    (openingPairForLastChar && url.split(lastChar).length - 1 > url.split(openingPairForLastChar).length - 1) ??
    // ...or if it is an unpaired punctuation character
    PUNCTUATION_SINGLES.has(lastChar);

  let trimmedUrl = url;

  if (shouldRemoveLeadingChar) {
    trimmedUrl = trimmedUrl.slice(1);
  }

  if (shouldRemoveTrailingChar) {
    trimmedUrl = trimmedUrl.slice(0, -1);
  }

  if (trimmedUrl != url && trimmedUrl.length > 0) {
    return removePunctuation(trimmedUrl);
  }

  return trimmedUrl;
};

// Main extraction function
export const extractUrls = (text: string, options: ExtractUrlsOptions = {}): UrlMatch[] => {
  const config = { ...DEFAULTS, ...options };
  const regex = buildRegex(config.allowedBareHostnames);
  const seenUrls = new Set<string>();

  return Array.from(text.matchAll(regex)).reduce((acc: UrlMatch[], match) => {
    const rawMatch = match[0];

    if (isEmailAddress(rawMatch)) {
      return acc;
    }

    const cleanUrl = removePunctuation(rawMatch);
    if (cleanUrl.length < MIN_URL_LENGTH) {
      return acc;
    }

    const { urlHasProtocol, resolvedProtocol, isDefaultProtocol } = resolveProtocol(cleanUrl, config);
    if (!resolvedProtocol) {
      return acc;
    }

    const urlToParse = cleanUrl.startsWith("//")
      ? `${resolvedProtocol}:${cleanUrl}`
      : urlHasProtocol
      ? cleanUrl
      : `${resolvedProtocol}://${cleanUrl}`;
    const parsedUrl = tryParseUrl(urlToParse);

    if (!parsedUrl || shouldExcludeUrl(parsedUrl, cleanUrl, isDefaultProtocol, config)) {
      return acc;
    }

    const normalizedUrl = parsedUrl.toString();

    if (config.deduplicate && seenUrls.has(normalizedUrl)) {
      return acc;
    }

    acc.push({
      raw: cleanUrl,
      normalized: normalizedUrl,
      index: match.index,
    });

    if (config.deduplicate) {
      seenUrls.add(normalizedUrl);
    }

    return acc;
  }, []);
};
