import JSONbig from "json-bigint";

const JSONBig = JSONbig({
  storeAsString: false,
  useNativeBigInt: true,
});

export function parseJsonWithBigInt(jsonString: string): any {
  try {
    return JSONBig.parse(jsonString);
  } catch (error) {
    console.warn("json-bigint parsing failed, falling back to JSON.parse:", error);
    return JSON.parse(jsonString, (key, value) => {
      if (key === "uuid" || key === "parentId" || key === "from" || key === "to" || key === "structureId" || key === "startId" || key === "endId") {
        if (typeof value === "string" || typeof value === "number") {
          try {
            if (value === "-1" || value === -1) return BigInt(-1);
            return BigInt(value);
          } catch {
            return value;
          }
        }
      }
      return value;
    });
  }
}

/** Display helper — accepts bigint, number, or string ids. */
export function formatBigIntForDisplay(value: bigint | number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const str = typeof value === "bigint" || typeof value === "number" ? value.toString() : String(value);
  if (str.length <= 8) return str;
  return `…${str.slice(-7)}`;
}

export function formatBigIntForEditor(value: bigint | number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return typeof value === "bigint" || typeof value === "number" ? value.toString() : String(value);
}

export function isBigInt(value: any): value is bigint {
  return typeof value === "bigint";
}

export function idKey(value: bigint | number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return typeof value === "bigint" || typeof value === "number" ? value.toString() : String(value);
}

export function stringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === "bigint") return value.toString();
    return value;
  });
}
