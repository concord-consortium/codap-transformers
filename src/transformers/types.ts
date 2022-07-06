import { Collection } from "../lib/codapPhone/types";
import { PartitionSaveState } from "./partition";

/**
 * DataSet represents a data context and all of the actual data
 * contained within it.
 */
export type DataSet = {
  collections: Collection[];
  records: Record<string, unknown>[];
  editable?: boolean;
};

export const codapLanguageTypes = [
  "Any",
  "String",
  "Number",
  "Boolean",
  "Boundary",
] as const;
export type CodapLanguageType = typeof codapLanguageTypes[number];

/**
 * The properties of a CODAP boundary value that are necessary for
 * extracting its name.
 */
export type Boundary = {
  jsonBoundaryObject: {
    properties: {
      NAME: string;
    };
  };
};

/**
 * SingleValue represents the output of a single-value transformer (e.g. median).
 */
export type SingleValue = number | number[];

/**
 * Locates a missing value within a dataset. The given string values should be
 * user-recognizable titles, instead of names.
 */
export type MissingValueLocation = {
  context: string;
  collection: string;
  attribute: string;
  itemIndex: number;
};

/**
 * A missing value report details what missing values were involved
 * in a transformer's computation. The `extraInfo` field contains extra
 * information about how missing values are dealt with by this particular
 * transformer.
 *
 * If a MVR is of kind "formula", then the locations of missing values
 * are recorded as row numbers for which the formula evaluated to missing.
 */
export type MissingValueReport =
  | {
      kind: "input";
      missingValues: MissingValueLocation[];
      extraInfo?: string;
    }
  | {
      kind: "formula";
      missingValues: number[];
      extraInfo?: string;
    };

/**
 * The empty missing value report.
 */
export const EMPTY_MVR: MissingValueReport = {
  kind: "input",
  missingValues: [],
};

/**
 * Symbol used to add an ominous nature to computations over missing values. (dragon)
 */
export const MISSING_VALUE_SCARE_SYMBOL = "\u{1F409}";

/**
 * Warning that is displayed when a transformer computes over missing values.
 */
export const MISSING_VALUE_WARNING =
  `Missing values were encountered in this computation. Proceed anyway? ` +
  `Proceeding will produce a missing value report, a table of missing values, ` +
  `and the Transformer's output.`;

/**
 * The format for output for most transformations contains three parts:
 *  1) dataset or numeric value (DataSet | number)
 *  2) output context name (string)
 *  3) output context description] (string)
 *  4) missing value report
 */
export type DataSetTransformationOutput = [
  DataSet,
  string,
  string,
  MissingValueReport
];
export type SingleValueTransformationOutput = [
  SingleValue,
  string,
  string,
  MissingValueReport
];

export type TransformationOutput =
  | DataSetTransformationOutput
  | SingleValueTransformationOutput;

export type FullOverrideSaveState = PartitionSaveState;
