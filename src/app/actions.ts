'use server';

import { parseStringPromise } from 'xml2js';

interface FixField {
  tag: string;
  name: string;
  type: string;
}

interface FixMessageField {
  tag: string;
  name: string;
  required: boolean;
}

interface FixMessage {
  name:string;
  msgtype: string;
  category: string;
  fields: FixMessageField[];
}

interface FixDefinition {
  version: string;
  header: number[];
  trailer: number[];
  fields: FixField[];
  messages: FixMessage[];
}

export async function convertFixXml(
  xmlContent: string
): Promise<{ data: FixDefinition | null; error: string | null }> {
  if (!xmlContent) {
    return { data: null, error: 'XML content is empty.' };
  }

  try {
    const parsedXml = await parseStringPromise(xmlContent, {
      explicitArray: true,
      tagNameProcessors: [key => key.toLowerCase()],
    });

    const fixNode = parsedXml.fix;
    if (!fixNode) {
      throw new Error('Invalid FIX XML structure: <fix> root tag not found.');
    }
    
    if (!fixNode.$.major || !fixNode.$.minor) {
        throw new Error('Could not determine FIX version from <fix> tag attributes (major, minor).');
    }
    const version = `FIX.${fixNode.$?.major}.${fixNode.$?.minor}`;

    const fieldsMap = new Map<string, { tag: string; type: string }>();
    
    const fieldsList: FixField[] = (fixNode.fields?.[0]?.field || []).map((f: any) => {
      if(!f.$.number || !f.$.name || !f.$.type) {
        throw new Error(`A field in <fields> is missing a required attribute (number, name, type).`);
      }
      const field = {
        tag: f.$.number,
        name: f.$.name,
        type: f.$.type,
      };
      fieldsMap.set(field.name, { tag: field.tag, type: field.type });
      return field;
    });

    const getFieldTags = (section: any[] | undefined): number[] => {
        if (!section) return [];
        return (section[0]?.field || []).map((f: any) => {
            const fieldInfo = fieldsMap.get(f.$.name);
            if (!fieldInfo) {
                console.warn(`Field "${f.$.name}" found in header/trailer but not in <fields> section. Tag will be missing.`);
                return -1; // Or some other indicator for a missing tag
            }
            return parseInt(fieldInfo.tag, 10);
        }).filter(tag => tag !== -1);
    };
    
    const header = getFieldTags(fixNode.header);
    const trailer = getFieldTags(fixNode.trailer);
    
    const messages: FixMessage[] = (fixNode.messages?.[0]?.message || []).map((m: any) => {
      if (!m.$.name || !m.$.msgtype) {
        throw new Error('A message in <messages> is missing required attribute (name, msgtype).');
      }
      return {
        name: m.$.name,
        msgtype: m.$.msgtype,
        category: m.$.msgcat || 'app',
        fields: (m.field || []).map((f: any) => {
          if(!f.$.name || !f.$.required) {
            throw new Error(`A field in message "${m.$.name}" is missing required attribute (name, required).`);
          }
          const fieldInfo = fieldsMap.get(f.$.name);
          if (!fieldInfo) {
            throw new Error(`Field "${f.$.name}" in message "${m.$.name}" not found in global <fields> list.`);
          }
          return {
            tag: fieldInfo.tag,
            name: f.$.name,
            required: f.$.required === 'Y',
          };
        }),
      };
    });

    const result: FixDefinition = {
      version,
      header,
      trailer,
      fields: fieldsList,
      messages,
    };

    return { data: result, error: null };
  } catch (e: any) {
    return { data: null, error: e.message || 'An unexpected error occurred during XML parsing.' };
  }
}
