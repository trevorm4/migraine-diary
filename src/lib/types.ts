export enum HeadacheLocation {
  Temple = "Temple",
  Forehead = "Forehead",
  Front = "Front",
}

export enum MedicineType {
  Preventative = "Preventative",
  Acute = "Acute",
}

export interface Medicine {
  id: number;
  name: string;
  medicine_type: MedicineType;
  description: string;
}

/** A medication reference sent when submitting/editing an entry. */
export interface MedicineDose {
  medicine_id: number;
  dose: string | null;
}

/** A medication shown against an entry, with its resolved name. */
export interface MedicineUse {
  medicine_id: number;
  name: string;
  dose: string | null;
}

export interface Entry {
  id: number;
  start_dt: string;
  end_dt: string;
  description: string;
  severity: number;
  headache_location: HeadacheLocation;
  medications: MedicineUse[];
}