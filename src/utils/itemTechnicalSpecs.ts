import { PackingSheetData, ItemType } from '../types/calculator';

export interface TechnicalRowItem {
  key: string;
  label: string;
  labelBn: string;
  value: string;
  highlight?: boolean;
  highlightColor?: 'amber' | 'indigo' | 'emerald' | 'rose' | 'purple' | 'sky';
  fieldKey: 'style' | 'gsm' | 'stretch' | 'tipping' | 'finish' | 'pattern';
}

export interface TechnicalRowPair {
  id: string;
  item1: TechnicalRowItem;
  item2?: TechnicalRowItem;
}

export interface ItemSpecSuggestions {
  styles: string[];
  field2Label: string;
  field2Options: string[];
  field3Label: string;
  field3Options: string[];
}

export const ITEM_SPEC_SUGGESTIONS: Record<string, ItemSpecSuggestions> = {
  elastic: {
    styles: ['WOVEN JACQUARD', 'KNITTED ELASTIC', 'CROCHET ELASTIC', 'SILICONE GRIPPER', 'FOLDOVER ELASTIC', 'BOXER WAISTBAND'],
    field2Label: 'GSM / Weight',
    field2Options: ['180 GSM', '220 GSM', '240 GSM', '280 GSM', '320 GSM', '360 GSM'],
    field3Label: 'Stretch / Elongation',
    field3Options: ['130% STRETCH', '140% HIGH RECOVERY', '150% HEAVY DUTY', '160% SOFT STRETCH'],
  },
  bow: {
    styles: ['SATIN RIBBON BOW', 'GROSGRAIN BOW', 'VELVET TRIM BOW', 'PRE-TIED BUTTERFLY', 'ORGANZA MINI BOW'],
    field2Label: 'Attachment / Finish',
    field2Options: ['BAR-TACK ULTRASONIC', 'HAND-TIED STITCH', 'HEAT-SEALED BAR', 'SAFETY PIN BACK', 'CENTRAL KNOT TACK'],
    field3Label: 'Ribbon Width / Span',
    field3Options: ['3MM RIBBON | 35MM SPAN', '3MM RIBBON | 45MM SPAN', '6MM RIBBON | 50MM SPAN', '10MM RIBBON | 65MM SPAN'],
  },
  drawstring: {
    styles: ['BRAIDED ROUND CORD', 'FLAT TUBULAR CORD', 'TWISTED ROPE CORD', 'WAXED COTTON CORD', 'REFLECTIVE FLECK CORD'],
    field2Label: 'Tipping / Aglet',
    field2Options: ['CLEAR FILM TIP 15MM', 'BLACK SILICONE DIP', 'GUNMETAL METAL AGLET', 'HEAT-SEALED KNOT', 'RUBBER COATED AGLET'],
    field3Label: 'Cord Spec / Cut Length',
    field3Options: ['Ø 4MM × 100 CM', 'Ø 5MM × 120 CM', 'Ø 6MM × 130 CM', 'Ø 8MM × 140 CM'],
  },
  tape: {
    styles: ['HERRINGBONE TWILL', 'PLAIN WEBBING', 'HEAVY COTTON TAPE', 'BIAS BINDING TAPE', 'POLYESTER GROSGRAIN'],
    field2Label: 'GSM / Density',
    field2Options: ['200 GSM', '260 GSM', '320 GSM', '380 GSM', '450 GSM'],
    field3Label: 'Thickness / Finish',
    field3Options: ['1.0MM STANDARD', '1.2MM HEAVY DUTY', '1.5MM EXTRA HEAVY', 'HEAT-SET CALENDERED'],
  },
};

/**
 * Returns default technical specs tailored to the item type
 */
export function getDefaultSpecsForItem(itemType?: ItemType): Partial<PackingSheetData> {
  const key = (itemType || 'elastic').toLowerCase();
  
  if (key === 'bow') {
    return {
      style: 'SATIN RIBBON BOW',
      finish: 'BAR-TACK ULTRASONIC',
      pattern: '3MM RIBBON | 45MM SPAN',
      gsm: undefined,
      tipping: undefined,
      stretch: undefined,
    };
  }
  
  if (key === 'drawstring') {
    return {
      style: 'BRAIDED ROUND CORD',
      tipping: 'CLEAR FILM TIP 15MM',
      pattern: 'Ø 5MM × 120 CM CUT',
      gsm: undefined,
      stretch: undefined,
      finish: undefined,
    };
  }
  
  if (key === 'tape') {
    return {
      style: 'HERRINGBONE TWILL',
      gsm: '320 GSM',
      finish: '1.2MM HEAVY DUTY',
      stretch: 'HIGH TENACITY',
      pattern: undefined,
      tipping: undefined,
    };
  }

  // Default: Elastic
  return {
    style: 'WOVEN JACQUARD',
    gsm: '240 GSM',
    stretch: '140% HIGH RECOVERY',
    finish: 'OEKO-TEX PASS',
    pattern: undefined,
    tipping: undefined,
  };
}

/**
 * Generates dynamic technical row pairs for sticker label layouts based on itemType
 */
export function getItemTechnicalRows(
  sheetData: PackingSheetData,
  lang: 'en' | 'bn' = 'en'
): TechnicalRowPair[] {
  const itemKey = (sheetData.itemType || 'elastic').toLowerCase();

  if (itemKey === 'bow') {
    const pairs: TechnicalRowPair[] = [
      {
        id: 'bow-row-1',
        item1: {
          key: 'style',
          label: 'STYLE / PATTERN:',
          labelBn: 'স্টাইল / প্যাটার্ন:',
          value: sheetData.style || 'SATIN RIBBON BOW',
          highlight: true,
          highlightColor: 'rose',
          fieldKey: 'style',
        },
        item2: {
          key: 'finish',
          label: 'ATTACHMENT:',
          labelBn: 'অ্যাটাচমেন্ট:',
          value: sheetData.finish || 'BAR-TACK ULTRASONIC',
          fieldKey: 'finish',
        },
      },
      {
        id: 'bow-row-2',
        item1: {
          key: 'pattern',
          label: 'RIBBON SPAN:',
          labelBn: 'রিবন সাইজ:',
          value: sheetData.pattern || '3MM RIBBON | 45MM SPAN',
          fieldKey: 'pattern',
        },
        item2: {
          key: 'bundle',
          label: 'PACKAGING:',
          labelBn: 'প্যাকেজিং:',
          value: sheetData.pcsPerPkt ? `${sheetData.pcsPerPkt} PCS/PKT` : '100 PCS/PKT',
          highlight: true,
          highlightColor: 'purple',
          fieldKey: 'pattern',
        },
      },
    ];
    return pairs;
  }

  if (itemKey === 'drawstring') {
    const pairs: TechnicalRowPair[] = [
      {
        id: 'drw-row-1',
        item1: {
          key: 'style',
          label: 'CORD STYLE:',
          labelBn: 'কর্ড স্টাইল:',
          value: sheetData.style || 'BRAIDED ROUND CORD',
          highlight: true,
          highlightColor: 'amber',
          fieldKey: 'style',
        },
        item2: {
          key: 'tipping',
          label: 'TIPPING / AGLET:',
          labelBn: 'টিপিং / এগলেট:',
          value: sheetData.tipping || 'CLEAR FILM TIP 15MM',
          fieldKey: 'tipping',
        },
      },
      {
        id: 'drw-row-2',
        item1: {
          key: 'pattern',
          label: 'CUT SPEC:',
          labelBn: 'কাট সাইজ:',
          value: sheetData.pattern || 'Ø 5MM × 120 CM CUT',
          fieldKey: 'pattern',
        },
        item2: {
          key: 'bundle',
          label: 'PACKAGING:',
          labelBn: 'প্যাকেজিং:',
          value: sheetData.pcsPerPkt ? `${sheetData.pcsPerPkt} PCS/PKT` : '50 PCS/PKT',
          highlight: true,
          highlightColor: 'purple',
          fieldKey: 'pattern',
        },
      },
    ];
    return pairs;
  }

  if (itemKey === 'tape') {
    const pairs: TechnicalRowPair[] = [
      {
        id: 'tape-row-1',
        item1: {
          key: 'style',
          label: 'STYLE / WEAVE:',
          labelBn: 'স্টাইল / বুনন:',
          value: sheetData.style || 'HERRINGBONE TWILL',
          highlight: true,
          highlightColor: 'emerald',
          fieldKey: 'style',
        },
        item2: {
          key: 'gsm',
          label: 'GSM / WEIGHT:',
          labelBn: 'জিএসএম:',
          value: sheetData.gsm || '320 GSM',
          highlight: true,
          highlightColor: 'indigo',
          fieldKey: 'gsm',
        },
      },
      {
        id: 'tape-row-2',
        item1: {
          key: 'finish',
          label: 'THICKNESS / FINISH:',
          labelBn: 'পুরুত্ব / ফিনিশ:',
          value: sheetData.finish || '1.2MM HEAVY DUTY',
          fieldKey: 'finish',
        },
        item2: {
          key: 'stretch',
          label: 'TENACITY:',
          labelBn: 'টেনেসিটি:',
          value: sheetData.stretch || 'HIGH TENACITY',
          fieldKey: 'stretch',
        },
      },
    ];
    return pairs;
  }

  // Default: Elastic
  return [
    {
      id: 'elastic-row-1',
      item1: {
        key: 'style',
        label: 'STYLE / WEAVE:',
        labelBn: 'স্টাইল / বুনন:',
        value: sheetData.style || 'WOVEN JACQUARD',
        highlight: true,
        highlightColor: 'indigo',
        fieldKey: 'style',
      },
      item2: {
        key: 'gsm',
        label: 'GSM (WEIGHT):',
        labelBn: 'জিএসএম:',
        value: sheetData.gsm || '240 GSM',
        highlight: true,
        highlightColor: 'emerald',
        fieldKey: 'gsm',
      },
    },
    {
      id: 'elastic-row-2',
      item1: {
        key: 'stretch',
        label: 'STRETCH / ELONGATION:',
        labelBn: 'ইলাস্টিসিটি / স্ট্রেচ:',
        value: sheetData.stretch || '140% - 160% HIGH RECOVERY',
        fieldKey: 'stretch',
      },
      item2: {
        key: 'finish',
        label: 'QUALITY SPEC:',
        labelBn: 'কোয়ালিটি স্পেক:',
        value: sheetData.finish || 'OEKO-TEX PASS',
        fieldKey: 'finish',
      },
    },
  ];
}
