/**
 * CSV Parser Utility
 * Reusable CSV parsing functionality for all games
 */
class CSVParser {
    constructor(options = {}) {
        this.options = {
            delimiter: options.delimiter || ',',
            quoteChar: options.quoteChar || '"',
            escapeChar: options.escapeChar || '"',
            skipEmptyLines: options.skipEmptyLines !== false,
            trimValues: options.trimValues !== false,
            validateHeaders: options.validateHeaders !== false,
            ...options
        };
    }
    
    /**
     * Parse CSV text into structured data
     * @param {string} csvText - Raw CSV text
     * @param {Object} schema - Optional schema for validation/transformation
     * @returns {Promise<Array>} Parsed data array
     */
    async parse(csvText, schema = null) {
        try {
            if (!csvText || typeof csvText !== 'string') {
                throw new Error('Invalid CSV text provided');
            }
            
            const lines = this.splitLines(csvText);
            if (lines.length === 0) {
                throw new Error('Empty CSV file');
            }
            
            const headers = this.parseLine(lines[0]);
            if (headers.length === 0) {
                throw new Error('No headers found in CSV');
            }
            
            // Validate headers if schema provided
            if (schema && this.options.validateHeaders) {
                this.validateHeaders(headers, schema);
            }
            
            // Parse data rows
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                
                // Skip empty lines if configured
                if (this.options.skipEmptyLines && !line.trim()) {
                    continue;
                }
                
                try {
                    const values = this.parseLine(line);
                    
                    // Skip rows with no data
                    if (values.length === 0 || values.every(v => !v.trim())) {
                        continue;
                    }
                    
                    // Create row object
                    const row = this.createRowObject(headers, values, schema);
                    
                    // Validate row if schema provided
                    if (schema) {
                        this.validateRow(row, schema, i);
                    }
                    
                    data.push(row);
                } catch (error) {
                    console.warn(`Error parsing line ${i + 1}: ${error.message}`);
                    if (this.options.strictMode) {
                        throw new Error(`Parse error on line ${i + 1}: ${error.message}`);
                    }
                }
            }
            
            return data;
        } catch (error) {
            console.error('CSV parsing failed:', error);
            throw error;
        }
    }
    
    /**
     * Split CSV text into lines, handling different line endings
     * @param {string} csvText - Raw CSV text
     * @returns {Array<string>} Array of lines
     */
    splitLines(csvText) {
        // Handle different line endings
        return csvText.split(/\r\n|\r|\n/);
    }
    
    /**
     * Parse a single CSV line into values
     * @param {string} line - CSV line to parse
     * @returns {Array<string>} Array of values
     */
    parseLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === this.options.quoteChar) {
                if (inQuotes && nextChar === this.options.quoteChar) {
                    // Escaped quote
                    current += this.options.quoteChar;
                    i += 2;
                    continue;
                } else {
                    // Start or end of quoted field
                    inQuotes = !inQuotes;
                }
            } else if (char === this.options.delimiter && !inQuotes) {
                // Field separator
                values.push(this.options.trimValues ? current.trim() : current);
                current = '';
            } else {
                current += char;
            }
            
            i++;
        }
        
        // Add the last field
        values.push(this.options.trimValues ? current.trim() : current);
        
        return values;
    }
    
    /**
     * Create row object from headers and values
     * @param {Array<string>} headers - Column headers
     * @param {Array<string>} values - Row values
     * @param {Object} schema - Optional schema for transformation
     * @returns {Object} Row object
     */
    createRowObject(headers, values, schema) {
        const row = {};
        
        headers.forEach((header, index) => {
            const value = values[index] || '';
            
            if (schema && schema.columns && schema.columns[header]) {
                const columnSchema = schema.columns[header];
                row[header] = this.transformValue(value, columnSchema);
            } else {
                row[header] = value;
            }
        });
        
        return row;
    }
    
    /**
     * Transform a value according to schema
     * @param {string} value - Raw value from CSV
     * @param {Object} columnSchema - Column schema definition
     * @returns {*} Transformed value
     */
    transformValue(value, columnSchema) {
        if (!value && columnSchema.default !== undefined) {
            return columnSchema.default;
        }
        
        if (!value && columnSchema.required) {
            throw new Error(`Required field missing: ${columnSchema.name || 'unknown'}`);
        }
        
        if (!value) {
            return columnSchema.nullable ? null : '';
        }
        
        switch (columnSchema.type) {
            case 'string':
                return String(value);
                
            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    if (columnSchema.required) {
                        throw new Error(`Invalid number: ${value}`);
                    }
                    return columnSchema.default || 0;
                }
                return num;
                
            case 'integer':
                const int = parseInt(value, 10);
                if (isNaN(int)) {
                    if (columnSchema.required) {
                        throw new Error(`Invalid integer: ${value}`);
                    }
                    return columnSchema.default || 0;
                }
                return int;
                
            case 'float':
                const float = parseFloat(value);
                if (isNaN(float)) {
                    if (columnSchema.required) {
                        throw new Error(`Invalid float: ${value}`);
                    }
                    return columnSchema.default || 0.0;
                }
                return float;
                
            case 'boolean':
                return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
                
            case 'date':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    if (columnSchema.required) {
                        throw new Error(`Invalid date: ${value}`);
                    }
                    return null;
                }
                return date;
                
            default:
                return value;
        }
    }
    
    /**
     * Validate headers against schema
     * @param {Array<string>} headers - CSV headers
     * @param {Object} schema - Schema definition
     */
    validateHeaders(headers, schema) {
        if (!schema.columns) return;
        
        const requiredHeaders = Object.keys(schema.columns)
            .filter(key => schema.columns[key].required);
        
        const missingHeaders = requiredHeaders.filter(header => 
            !headers.includes(header)
        );
        
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
        }
    }
    
    /**
     * Validate a row against schema
     * @param {Object} row - Row object
     * @param {Object} schema - Schema definition
     * @param {number} lineNumber - Line number for error reporting
     */
    validateRow(row, schema, lineNumber) {
        if (!schema.columns) return;
        
        Object.keys(schema.columns).forEach(column => {
            const columnSchema = schema.columns[column];
            const value = row[column];
            
            // Check required fields
            if (columnSchema.required && (value === null || value === undefined || value === '')) {
                throw new Error(`Required field '${column}' is empty on line ${lineNumber}`);
            }
            
            // Check value constraints
            if (value !== null && value !== undefined && value !== '') {
                this.validateValueConstraints(value, columnSchema, column, lineNumber);
            }
        });
    }
    
    /**
     * Validate value constraints
     * @param {*} value - Value to validate
     * @param {Object} columnSchema - Column schema
     * @param {string} column - Column name
     * @param {number} lineNumber - Line number
     */
    validateValueConstraints(value, columnSchema, column, lineNumber) {
        // Min/Max validation for numbers
        if (typeof value === 'number') {
            if (columnSchema.min !== undefined && value < columnSchema.min) {
                throw new Error(`Value ${value} in column '${column}' is below minimum ${columnSchema.min} on line ${lineNumber}`);
            }
            if (columnSchema.max !== undefined && value > columnSchema.max) {
                throw new Error(`Value ${value} in column '${column}' is above maximum ${columnSchema.max} on line ${lineNumber}`);
            }
        }
        
        // Length validation for strings
        if (typeof value === 'string') {
            if (columnSchema.minLength !== undefined && value.length < columnSchema.minLength) {
                throw new Error(`Value '${value}' in column '${column}' is too short on line ${lineNumber}`);
            }
            if (columnSchema.maxLength !== undefined && value.length > columnSchema.maxLength) {
                throw new Error(`Value '${value}' in column '${column}' is too long on line ${lineNumber}`);
            }
        }
        
        // Pattern validation
        if (columnSchema.pattern && typeof value === 'string') {
            const regex = new RegExp(columnSchema.pattern);
            if (!regex.test(value)) {
                throw new Error(`Value '${value}' in column '${column}' doesn't match pattern on line ${lineNumber}`);
            }
        }
        
        // Enum validation
        if (columnSchema.enum && !columnSchema.enum.includes(value)) {
            throw new Error(`Value '${value}' in column '${column}' is not in allowed values on line ${lineNumber}`);
        }
    }
}

// Predefined schemas for common data types
const SCHEMAS = {
    MLB_PLAYER: {
        columns: {
            Player: { type: 'string', required: true, minLength: 1 },
            League: { type: 'string', required: true, enum: ['AL', 'NL'] },
            Team: { type: 'string', required: true, minLength: 2 },
            Age: { type: 'integer', required: true, min: 18, max: 50 },
            Runs: { type: 'integer', required: true, min: 0 },
            SB: { type: 'integer', required: true, min: 0 },
            HR: { type: 'integer', required: true, min: 0 },
            OPS: { type: 'float', required: true, min: 0.0, max: 2.0 }
        }
    },
    
    NFL_PLAYER: {
        columns: {
            Player: { type: 'string', required: true, minLength: 1 },
            Age: { type: 'integer', required: true, min: 18, max: 50 },
            Conference: { type: 'string', required: true, enum: ['AFC', 'NFC'] },
            Team: { type: 'string', required: true, minLength: 2 },
            Position: { type: 'string', required: true },
            'Rec Yds': { type: 'integer', required: true, min: 0 },
            'Rush Yds': { type: 'integer', required: true, min: 0 },
            TDs: { type: 'integer', required: true, min: 0 }
        }
    },
    
    NBA_PLAYER: {
        columns: {
            Player: { type: 'string', required: true, minLength: 1 },
            Conference: { type: 'string', required: true, enum: ['Eastern', 'Western'] },
            Team: { type: 'string', required: true, minLength: 2 },
            Position: { type: 'string', required: true },
            Age: { type: 'integer', required: true, min: 18, max: 50 },
            PTS: { type: 'float', required: true, min: 0 },
            REB: { type: 'float', required: true, min: 0 },
            AST: { type: 'float', required: true, min: 0 }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CSVParser, SCHEMAS };
} else {
    window.CSVParser = CSVParser;
    window.CSV_SCHEMAS = SCHEMAS;
} 