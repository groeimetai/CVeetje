declare module 'mammoth' {
  interface Result {
    value: string;
    messages: Array<{
      type: string;
      message: string;
      error?: Error;
    }>;
  }

  interface ConvertOptions {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    ignoreEmptyParagraphs?: boolean;
    transformDocument?: (element: unknown) => unknown;
  }

  interface ExtractRawTextOptions {
    buffer?: Buffer;
    arrayBuffer?: ArrayBuffer;
    path?: string;
  }

  export function convertToHtml(
    input: { buffer?: Buffer; arrayBuffer?: ArrayBuffer; path?: string },
    options?: ConvertOptions
  ): Promise<Result>;

  export function convertToMarkdown(
    input: { buffer?: Buffer; arrayBuffer?: ArrayBuffer; path?: string },
    options?: ConvertOptions
  ): Promise<Result>;

  export function extractRawText(
    input: ExtractRawTextOptions
  ): Promise<Result>;
}
