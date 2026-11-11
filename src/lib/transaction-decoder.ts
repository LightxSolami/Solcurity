export function decodeTransactionData(input: string) {
  const value = input.trim();
  if (!value) {
    throw new Error("Please enter transaction data");
  }

  let bytes: Uint8Array;
  const hasHexPrefix = value.startsWith("0x");
  const hex = hasHexPrefix ? value.slice(2) : value;

  if (hasHexPrefix && (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0)) {
    throw new Error("Enter valid hexadecimal or base64 data");
  }

  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
    bytes = Uint8Array.from(
      hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16))
    );
  } else {
    const base64 = value.replace(/\s/g, "");
    if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 === 1) {
      throw new Error("Enter valid hexadecimal or base64 data");
    }

    try {
      const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
      throw new Error("Enter valid hexadecimal or base64 data");
    }
  }

  const decodedHex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return {
    length: bytes.length,
    bytes: Array.from(bytes.slice(0, 64)),
    decodedHex: decodedHex.slice(0, 200) + (decodedHex.length > 200 ? "..." : ""),
  };
}
