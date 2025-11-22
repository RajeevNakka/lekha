export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'file';

export interface FieldConfig {
    key: string;
    label: string;
    type: FieldType;
    visible: boolean;
    required?: boolean;
    order: number;
    options?: string[]; // For dropdowns
    multiline?: boolean;
    validation?: {
        min?: number;
        max?: number;
        regex?: string;
    };
}


export interface FieldTemplate {
    id: string;
    name: string;
    description: string;
    field_config: FieldConfig[];
    preferences?: Book['preferences'];
    is_default?: boolean;
    created_at: string;
}

export interface Book {
    id: string;
    name: string;
    currency: string;
    role: Role;
    created_at: string;
    field_config: FieldConfig[];
    members?: { user_id: string; role: Role }[];
    primary_amount_field?: string; // Key of the field to use as "Amount" for calculations
    preferences?: {
        dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
        defaultTransactionTime?: 'current' | 'startOfDay' | string; // 'HH:mm' format for custom
        defaultType?: 'income' | 'expense' | 'transfer';
        defaultCategory?: string;
        decimalPlaces?: number;
        showZeroDecimals?: boolean;
    };
}


export interface Transaction {
    id: string;
    book_id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    date: string;
    description: string;
    category_id: string;
    party_id?: string;
    payment_mode?: string;
    tags?: string[];
    attachments?: string[];
    custom_data?: Record<string, string | number | boolean | null | undefined>;
    created_by?: string;
    created_at: string;
}

export interface Category {
    id: string;
    book_id: string;
    name: string;
    type: 'income' | 'expense';
    icon?: string;
    color?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
}

export interface AuditLog {
    id: string;
    book_id: string;
    transaction_id: string;
    action: 'create' | 'update' | 'delete';
    changes: {
        field: string;
        old_value: unknown;
        new_value: unknown;
    }[];
    performed_by: string;
    timestamp: string;
}
