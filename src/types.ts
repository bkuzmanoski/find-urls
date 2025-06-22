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

export interface UrlMatch {
  raw: string;
  normalized: string;
  index: number;
}
