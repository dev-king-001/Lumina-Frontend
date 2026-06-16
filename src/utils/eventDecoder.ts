
import { xdr, Address } from "@stellar/stellar-sdk";
import contractAbi from "../data/contractAbi.json";

export interface DecodedEvent {
  eventName: string;
  contractAddress: string;
  data: Record<string, unknown>;
  rawTopics: string[];
  rawData: string;
  isUnknown: boolean;
}

interface ContractEvent {
  eventName: string;
  topics: string[];
  decode: Record<string, string>;
}

interface ContractAbi {
  contractAddress: string;
  events: ContractEvent[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeScVal(val: any, typeHint: string): unknown {
  try {
    switch (typeHint) {
      case "u32": return val.u32();
      case "i128": {
        const i128 = val.i128();
        return Number(i128.hi()) * 2 ** 64 + Number(i128.lo());
      }
      case "address": return Address.fromScVal(val).toString();
      case "string": return val.str()?.toString() ?? val.sym()?.toString() ?? "";
      default: return val.value();
    }
  } catch { return null; }
}

function decodeTopicHex(hex: string): string {
  try {
    const bytes = Buffer.from(hex.replace(/^0x/, ""), "hex");
    const scVal = xdr.ScVal.fromXDR(bytes);
    return scVal.sym()?.toString() ?? scVal.str()?.toString() ?? hex;
  } catch { return hex; }
}

export function decodeEvent(
  contractAddress: string,
  rawTopics: string[],
  rawData: string
): DecodedEvent {
  const contract = (contractAbi.contracts as ContractAbi[]).find(
    (c) => c.contractAddress === contractAddress
  );

  const decodedTopics = rawTopics.map(decodeTopicHex);
  const eventSignature = decodedTopics[0] ?? "";
  const eventDef = contract?.events.find((e) =>
    e.topics.some((t) => t === eventSignature)
  );

  if (!eventDef) {
    return { eventName: "Unknown event", contractAddress, data: {}, rawTopics, rawData, isUnknown: true };
  }

  const decodedData: Record<string, unknown> = {};
  try {
    const dataBytes = Buffer.from(rawData.replace(/^0x/, ""), "hex");
    const dataVal = xdr.ScVal.fromXDR(dataBytes);
    const fields = Object.entries(eventDef.decode);
    if (dataVal.switch().name === "scvMap") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataVal.map() ?? []).forEach((entry: any) => {
        const key = entry.key().sym()?.toString() ?? "";
        const matchedField = fields.find(([k]) => k === key);
        if (matchedField) decodedData[matchedField[0]] = decodeScVal(entry.val(), matchedField[1]);
      });
    } else if (fields.length === 1) {
      decodedData[fields[0][0]] = decodeScVal(dataVal, fields[0][1]);
    }
  } catch { /* decoding failed */ }

  return { eventName: eventDef.eventName, contractAddress, data: decodedData, rawTopics, rawData, isUnknown: false };
}