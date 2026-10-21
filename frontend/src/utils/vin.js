/** VIN rules shared by every form and search box (the contract enforces the same length). */
export const VIN_LENGTH = 17;

export const normalizeVin = (value) => value.trim().toUpperCase();

export const isValidVin = (value) => normalizeVin(value).length === VIN_LENGTH;

export const normalizeRegNumber = (value) => value.replace(/\s+/g, "").toUpperCase();
