import * as XLSX from 'xlsx';
import { PackingSheetData, SummaryStats, CartonRow } from '../types/calculator';
import { recomputeCarton, calculateSummary } from './calc';

/**
 * Export packing sheet to clean CSV
 */
export function exportPackingSheetToCsv(sheetData: PackingSheetData, summary: SummaryStats) {
  const lines: string[] = [];

  // Order Header
  lines.push(`Company,${sheetData.companyName}`);
  lines.push(`REF / PO,${sheetData.ref}`);
  lines.push(`Customer,${sheetData.customer}`);
  lines.push(`Buyer,${sheetData.buyer}`);
  lines.push(`Size,${sheetData.size}`);
  lines.push(`Color,${sheetData.color}`);
  lines.push(`Default Tare (Kg),${sheetData.defaultTare}`);
  lines.push(`Unit Weight (gm/m),${sheetData.defaultWtPerUnit}`);
  lines.push('');

  // Table Column Headers
  lines.push('Carton No,Gross Wt (Kg),Tare Wt (Kg),Net Wt (Kg),Wt/Unit (gm),Length (Mtr),Length (Gry),Length (Yds),Notes');

  // Rows
  const activeCartons = sheetData.cartons.filter(c => c.netWt !== 0 || c.grossWt > 0 || c.lengthMtr > 0);
  for (const c of activeCartons) {
    lines.push(
      `${c.cartonNo},${c.grossWt},${c.tareWt},${c.netWt},${c.wtPerUnit},${c.lengthMtr},${c.lengthGry},${c.lengthYds || 0},"${c.notes || ''}"`
    );
  }

  // Summary
  lines.push('');
  lines.push(`Total Cartons,${summary.totalCtn} CTN`);
  lines.push(`Total Gross Wt,${summary.totalGrossWt} Kg`);
  lines.push(`Total Tare Wt,${summary.totalTareWt} Kg`);
  lines.push(`TOTAL NET WEIGHT,${summary.totalNetWt} Kg (${summary.totalNetWtLbs} Lbs / ${summary.totalNetWtGm} gm)`);
  lines.push(`Total Net Wt / Carton,${summary.totalNetWt} Kg / ${summary.totalCtn} CTN`);
  lines.push(`Total Length (Mtr),${summary.totalMtr} Mtr`);
  lines.push(`Total Length (Gry),${summary.totalGry} Gry`);
  lines.push(`Total Length (Yds),${summary.totalYds} Yds`);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Packing_List_${sheetData.ref || 'Order'}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export packing sheet to authentic multi-sheet Microsoft Excel (.xlsx) workbook
 * Compatible with OneDrive, Microsoft Excel Online, Google Sheets, and Desktop Excel
 */
export function exportPackingSheetToExcel(sheetData: PackingSheetData, summary: SummaryStats) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Detailed Packing List
  const packingRows: (string | number)[][] = [
    ['PACKING SPECIFICATION LIST', '', '', '', '', '', '', ''],
    ['Company', sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd', '', 'Export Date', new Date().toLocaleDateString()],
    ['REF / PO', sheetData.ref || '', '', 'Buyer', sheetData.buyer || ''],
    ['Customer', sheetData.customer || '', '', 'Color', sheetData.color || ''],
    ['Size', sheetData.size || '', '', 'Unit Weight', `${sheetData.defaultWtPerUnit} gm/m`],
    ['Default Tare', `${sheetData.defaultTare} Kg`, '', 'Carton Count', `${summary.totalCtn} CTN`],
    [],
    ['Carton No', 'Gross Wt (Kg)', 'Tare Wt (Kg)', 'Net Wt (Kg)', 'Wt/Unit (gm)', 'Length (Mtr)', 'Length (Gry)', 'Length (Yds)', 'Notes'],
  ];

  const activeCartons = sheetData.cartons.filter(c => c.netWt !== 0 || c.grossWt > 0 || c.lengthMtr > 0);
  for (const c of activeCartons) {
    packingRows.push([
      c.cartonNo,
      c.grossWt,
      c.tareWt,
      c.netWt,
      c.wtPerUnit,
      c.lengthMtr,
      c.lengthGry,
      c.lengthYds || 0,
      c.notes || '',
    ]);
  }

  // Summary footer in sheet
  packingRows.push([]);
  packingRows.push(['TOTAL / SUMMARY', '', '', '', '', '', '', '']);
  packingRows.push(['Total Cartons', summary.totalCtn, 'CTN']);
  packingRows.push(['Total Gross Weight', summary.totalGrossWt, 'Kg']);
  packingRows.push(['Total Tare Weight', summary.totalTareWt, 'Kg']);
  packingRows.push(['TOTAL NET WEIGHT', summary.totalNetWt, 'Kg', `(${summary.totalNetWtLbs} Lbs / ${summary.totalNetWtGm} gm)`]);
  packingRows.push(['Total Net Wt / Carton', `${summary.totalNetWt} Kg / ${summary.totalCtn} CTN`, '']);
  packingRows.push(['Net / Gross Ratio', `${summary.netGrossRatio}%`]);
  packingRows.push(['Total Length (Meters)', summary.totalMtr, 'Mtr']);
  packingRows.push(['Total Length (Gross Yards)', summary.totalGry, 'Gry']);
  packingRows.push(['Total Length (Yards)', summary.totalYds, 'Yds']);

  const ws1 = XLSX.utils.aoa_to_sheet(packingRows);
  
  // Set column widths
  ws1['!cols'] = [
    { wch: 14 }, // Carton No
    { wch: 14 }, // Gross Wt
    { wch: 14 }, // Tare Wt
    { wch: 14 }, // Net Wt
    { wch: 14 }, // Wt/Unit
    { wch: 16 }, // Length Mtr
    { wch: 16 }, // Length Gry
    { wch: 16 }, // Length Yds
    { wch: 24 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Packing List');

  // 2. Sheet 2: Net Weight Summary Breakdown
  const netWeightSummaryRows: (string | number)[][] = [
    ['NET WEIGHT & PRODUCTION SUMMARY', ''],
    ['Metric', 'Value', 'Unit'],
    ['Total Carton Count', summary.totalCtn, 'CTN'],
    ['Active Cartons (with Net Wt)', summary.activeNetCartonCount, 'CTN'],
    ['TOTAL NET WEIGHT (Kg)', summary.totalNetWt, 'Kg'],
    ['TOTAL NET WEIGHT (Lbs)', summary.totalNetWtLbs, 'Lbs'],
    ['TOTAL NET WEIGHT (Grams)', summary.totalNetWtGm, 'gm'],
    ['Total Net Wt / Carton', `${summary.totalNetWt} Kg / ${summary.totalCtn} CTN`, ''],
    ['Minimum Carton Net Wt', summary.minNetWt, 'Kg'],
    ['Maximum Carton Net Wt', summary.maxNetWt, 'Kg'],
    ['Total Gross Weight', summary.totalGrossWt, 'Kg'],
    ['Net to Gross Efficiency', `${summary.netGrossRatio}%`, ''],
    ['Total Meters Produced', summary.totalMtr, 'Mtr'],
    ['Total Gross Yards (Gry)', summary.totalGry, 'Gry'],
    ['Total Yards (Yds)', summary.totalYds, 'Yds'],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(netWeightSummaryRows);
  ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Net Weight Summary');

  // Generate binary and trigger download
  const fileName = `Packing_List_${(sheetData.ref || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV ArrayBuffer into PackingSheetData
 */
export async function parseExcelOrCsvFile(
  fileBuffer: ArrayBuffer,
  currentSheetData: PackingSheetData
): Promise<{
  success: boolean;
  importedHeader?: Partial<PackingSheetData>;
  cartons: CartonRow[];
  summary: SummaryStats;
  message?: string;
}> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, cartons: [], summary: calculateSummary([]), message: 'No sheets found in Excel file' };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // Convert sheet to json matrix
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    if (!rows || rows.length === 0) {
      return { success: false, cartons: [], summary: calculateSummary([]), message: 'Empty sheet data' };
    }

    // Try to detect metadata in top rows
    const importedHeader: Partial<PackingSheetData> = {};
    let tableHeaderRowIndex = -1;

    for (let r = 0; r < Math.min(rows.length, 12); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim().toLowerCase();
        const nextCell = String(row[c + 1] || '').trim();

        if (cell === 'company' && nextCell) importedHeader.companyName = nextCell;
        if ((cell.includes('ref') || cell.includes('po')) && nextCell && !cell.includes('carton')) importedHeader.ref = nextCell;
        if (cell === 'buyer' && nextCell) importedHeader.buyer = nextCell;
        if (cell === 'customer' && nextCell) importedHeader.customer = nextCell;
        if (cell === 'size' && nextCell) importedHeader.size = nextCell;
        if (cell === 'color' && nextCell) importedHeader.color = nextCell;
        if (cell.includes('unit weight') && nextCell) {
          const num = parseFloat(nextCell);
          if (!isNaN(num) && num > 0) importedHeader.defaultWtPerUnit = num;
        }
        if (cell.includes('tare') && nextCell) {
          const num = parseFloat(nextCell);
          if (!isNaN(num) && num > 0) importedHeader.defaultTare = num;
        }
      }

      // Check if this row is the column header row
      const rowStr = row.map(v => String(v).toLowerCase()).join(' ');
      if (
        (rowStr.includes('carton') || rowStr.includes('ctn') || rowStr.includes('no')) &&
        (rowStr.includes('gross') || rowStr.includes('net') || rowStr.includes('weight') || rowStr.includes('wt'))
      ) {
        tableHeaderRowIndex = r;
      }
    }

    const defaultTare = importedHeader.defaultTare || currentSheetData.defaultTare || 0.50;
    const defaultWtPerUnit = importedHeader.defaultWtPerUnit || currentSheetData.defaultWtPerUnit || 30.00;

    // If table header was found, identify columns
    let colGross = -1;
    let colTare = -1;
    let colNet = -1;
    let colWtUnit = -1;
    let colNotes = -1;

    let startDataRow = 0;

    if (tableHeaderRowIndex !== -1) {
      const headerRow = rows[tableHeaderRowIndex];
      startDataRow = tableHeaderRowIndex + 1;

      headerRow.forEach((colVal: any, colIdx: number) => {
        const val = String(colVal).toLowerCase();
        if (val.includes('gross')) colGross = colIdx;
        else if (val.includes('tare')) colTare = colIdx;
        else if (val.includes('net')) colNet = colIdx;
        else if (val.includes('unit') || val.includes('gm')) colWtUnit = colIdx;
        else if (val.includes('note') || val.includes('remark')) colNotes = colIdx;
      });
    }

    const parsedCartons: CartonRow[] = [];
    let cartonCount = 0;

    for (let r = startDataRow; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      // Stop if row indicates total summary
      const rowStr = row.map(v => String(v).toLowerCase()).join(' ');
      if (rowStr.includes('total') || rowStr.includes('summary')) {
        break;
      }

      // Try reading values
      let grossWt = 0;
      let tareWt = defaultTare;
      let netWt = 0;
      let wtPerUnit = defaultWtPerUnit;
      let notes = '';

      if (colGross !== -1 && row[colGross] !== undefined) {
        grossWt = parseFloat(String(row[colGross]).replace(/[^\d.]/g, '')) || 0;
      }
      if (colTare !== -1 && row[colTare] !== undefined) {
        const tVal = parseFloat(String(row[colTare]).replace(/[^\d.]/g, ''));
        if (!isNaN(tVal) && tVal > 0) tareWt = tVal;
      }
      if (colNet !== -1 && row[colNet] !== undefined) {
        netWt = parseFloat(String(row[colNet]).replace(/[^\d.]/g, '')) || 0;
      }
      if (colWtUnit !== -1 && row[colWtUnit] !== undefined) {
        const wVal = parseFloat(String(row[colWtUnit]).replace(/[^\d.]/g, ''));
        if (!isNaN(wVal) && wVal > 0) wtPerUnit = wVal;
      }
      if (colNotes !== -1 && row[colNotes] !== undefined) {
        notes = String(row[colNotes]).trim();
      }

      // If columns weren't identified, attempt standard positional column parsing:
      // Col 0: Carton No, Col 1: Gross, Col 2: Tare, Col 3: Net (or single column numbers)
      if (colGross === -1 && colNet === -1) {
        const numbers = row
          .map(v => parseFloat(String(v).replace(/[^\d.]/g, '')))
          .filter(v => !isNaN(v) && v > 0);

        if (numbers.length >= 2) {
          grossWt = numbers[0] > 50 ? numbers[1] : numbers[0]; // Avoid reading carton 1 as weight if 1st col
          if (numbers.length >= 3) {
            tareWt = numbers[1];
            netWt = numbers[2];
          }
        } else if (numbers.length === 1) {
          grossWt = numbers[0];
        }
      }

      if (grossWt > 0 || netWt > 0) {
        cartonCount++;
        const computed = recomputeCarton(
          {
            cartonNo: cartonCount,
            grossWt,
            tareWt,
            netWt: netWt > 0 ? netWt : undefined,
            wtPerUnit,
            notes,
          },
          cartonCount - 1,
          defaultTare,
          wtPerUnit
        );
        parsedCartons.push(computed);
      }
    }

    // Pad with minimum 12 cartons for grid
    while (parsedCartons.length < 12) {
      const idx = parsedCartons.length;
      parsedCartons.push(
        recomputeCarton(
          {
            cartonNo: idx + 1,
            grossWt: 0,
            tareWt: defaultTare,
            netWt: 0,
            wtPerUnit: defaultWtPerUnit,
          },
          idx,
          defaultTare,
          defaultWtPerUnit
        )
      );
    }

    const summary = calculateSummary(parsedCartons);

    return {
      success: true,
      importedHeader,
      cartons: parsedCartons,
      summary,
      message: `Successfully imported ${cartonCount} cartons from Excel`,
    };
  } catch (err: any) {
    return {
      success: false,
      cartons: [],
      summary: calculateSummary([]),
      message: err?.message || 'Failed to parse Excel file',
    };
  }
}
