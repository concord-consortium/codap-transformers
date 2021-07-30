import { CodapLanguageType } from "../../transformers/types";
import { evalExpression } from "../codapPhone";
import { prettyPrintCase } from "./prettyPrint";

/**
 * Enum representing all type checking predicates in CODAP
 */
enum CodapTypePredicateFunctions {
  Boolean = "isBoolean",
  String = "!isBoundary",
  Boundary = "isBoundary",
  Color = "isColor",
  Date = "isDate",
  Missing = "isMissing",
  Number = "isNumber",
  Finite = "isFinite",
}

export async function reportTypeErrorsForRecords(
  records: Record<string, unknown>[],
  values: unknown[],
  type: CodapLanguageType
): Promise<void> {
  const errorIndices = await findTypeErrors(values, type);
  if (errorIndices.length !== 0) {
    throw new Error(
      `Formula did not evaluate to ${type} for case ${prettyPrintCase(
        records[errorIndices[0]]
      )}`
    );
  }
}

/**
 * Type checks a set of values.
 * @param values list of values to type check
 * @param type type to match against
 * @returns indices that doesn't match the type, or empty list if all
 * values match
 */
async function findTypeErrors(
  values: unknown[],
  type: CodapLanguageType
): Promise<number[]> {
  switch (type) {
    case "any":
      // All values are allowed for any, so we can return immediately
      return [];
    case "number":
      return checkTypeOfValues(CodapTypePredicateFunctions.Number, values);
    case "string":
      return checkTypeOfValues(CodapTypePredicateFunctions.String, values);
    case "boolean":
      return checkTypeOfValues(CodapTypePredicateFunctions.Boolean, values);
    case "boundary":
      return checkTypeOfValues(CodapTypePredicateFunctions.Boundary, values);
  }
}

/**
 * Given a list of values, checks them against the provided type predicate and
 * returns the indices of those which do not match the predicate
 */
export async function checkTypeOfValues(
  predicate: CodapTypePredicateFunctions,
  values: unknown[]
): Promise<number[]> {
  const expr = `${predicate}(attr)`;
  const records = values.map((value) => ({ attr: value }));
  const results = await evalExpression(expr, records);

  const failingIndices = results
    .filter((result) => result !== true)
    .map((_result, i) => i);

  return failingIndices;
}
