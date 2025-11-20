export function generateId(): string {
    return crypto.randomUUID();
}

export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
};

export const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote
                currentCell += '"';
                i++;
            } else {
                // Toggle quotes
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // End of cell
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            // End of row
            if (char === '\r' && nextChar === '\n') i++; // Handle CRLF

            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    // Push last row if exists
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
};

export const parseFlexibleDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();

    // Try standard ISO first
    let date = new Date(cleanStr);
    if (!isNaN(date.getTime())) return date;

    // Try DD-MMM-YY (e.g., 8-May-25)
    const ddmmyyRegex = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/;
    const match = cleanStr.match(ddmmyyRegex);
    if (match) {
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase();
        const yearStr = match[3];

        const months: { [key: string]: number } = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };

        const month = months[monthStr.substring(0, 3)];
        let year = parseInt(yearStr);
        if (year < 100) year += 2000; // Assume 20xx for 2-digit years

        if (month !== undefined) {
            return new Date(year, month, day);
        }
    }

    // Try DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;
    const match2 = cleanStr.match(ddmmyyyyRegex);
    if (match2) {
        const day = parseInt(match2[1]);
        const month = parseInt(match2[2]) - 1;
        let year = parseInt(match2[3]);
        if (year < 100) year += 2000;

        return new Date(year, month, day);
    }

    return null;
};


export interface ColumnAnalysis {
    type: 'text' | 'number' | 'date';
    uniqueValues: string[];
    hasEmpty: boolean;
}

export function analyzeColumnData(rows: string[][], columnIndex: number): ColumnAnalysis {
    const dataRows = rows.slice(1); // Skip header
    let isNumber = true;
    let isDate = true;
    const uniqueValues = new Set<string>();
    let hasEmpty = false;

    // Limit unique values collection to avoid memory issues with large files
    const MAX_UNIQUE_VALUES = 100;

    for (const row of dataRows) {
        const value = row[columnIndex]?.trim();

        if (!value) {
            hasEmpty = true;
            continue;
        }

        if (uniqueValues.size < MAX_UNIQUE_VALUES) {
            uniqueValues.add(value);
        }

        // Check Number
        if (isNumber) {
            // Allow currency symbols, commas, dots, but must parse to number
            const cleanValue = value.replace(/[^0-9.-]+/g, '');
            if (!cleanValue || isNaN(parseFloat(cleanValue))) {
                isNumber = false;
            }
        }

        // Check Date
        if (isDate) {
            if (!parseFlexibleDate(value)) {
                isDate = false;
            }
        }

        // Optimization: If both failed, we can stop checking types, but we still need unique values
        if (!isNumber && !isDate && uniqueValues.size >= MAX_UNIQUE_VALUES) {
            break;
        }
    }

    let type: 'text' | 'number' | 'date' = 'text';
    if (isDate) type = 'date';
    else if (isNumber) type = 'number';

    return {
        type,
        uniqueValues: Array.from(uniqueValues).slice(0, MAX_UNIQUE_VALUES),
        hasEmpty
    };
}
