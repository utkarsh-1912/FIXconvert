'use server';

import { parseStringPromise } from 'xml2js';

interface FixField {
  tag: string;
  name: string;
  type?: string;
}

interface FixMessageField {
  name: string;
  required: 'Y' | 'N';
}

interface FixMessage {
  name:string;
  msgType: string;
  fields: FixMessageField[];
}

interface FixDefinition {
  version: string;
  header: { name: string, tag: string }[];
  trailer: { name: string, tag: string }[];
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
    
    const version = `FIX.${fixNode.$?.major}.${fixNode.$?.minor}`;
    if (!fixNode.$.major || !fixNode.$.minor) {
        throw new Error('Could not determine FIX version from <fix> tag attributes (major, minor).');
    }

    const fieldsMap = new Map<string, { tag: string; type?: string }>();
    
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

    const getFieldsByName = (section: any[] | undefined): { name: string }[] => {
      if (!section) return [];
      return (section[0]?.field || []).map((f: any) => ({ name: f.$.name }));
    };

    const headerFieldNames = getFieldsByName(fixNode.header);
    const trailerFieldNames = getFieldsByName(fixNode.trailer);
    
    const mapFieldsToTags = (fieldNames: {name: string}[]) => {
      return fieldNames.map(f => {
        const fieldInfo = fieldsMap.get(f.name);
        if (!fieldInfo) {
          console.warn(`Field "${f.name}" found in header/trailer but not in <fields> section. Tag will be "N/A".`);
        }
        return { name: f.name, tag: fieldInfo?.tag || 'N/A' };
      });
    }

    const header = mapFieldsToTags(headerFieldNames);
    const trailer = mapFieldsToTags(trailerFieldNames);

    const messages: FixMessage[] = (fixNode.messages?.[0]?.message || []).map((m: any) => {
      if (!m.$.name || !m.$.msgtype) {
        throw new Error('A message in <messages> is missing required attribute (name, msgtype).');
      }
      return {
        name: m.$.name,
        msgType: m.$.msgtype,
        fields: (m.field || []).map((f: any) => {
          if(!f.$.name || !f.$.required) {
            throw new Error(`A field in message "${m.$.name}" is missing required attribute (name, required).`);
          }
          return {
            name: f.$.name,
            required: f.$.required,
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
