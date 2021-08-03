import {
  CodapLanguageType,
  DataSet,
  MissingValueReport,
  TransformationOutput,
} from "./types";
import { evalExpression, getContextAndDataSet } from "../lib/codapPhone";
import { TransformerTemplateState } from "../components/transformer-template/TransformerTemplate";
import { isMissing, tryTitle } from "../transformers/util";
import { cloneCollection, shallowCopy, validateAttribute } from "./util";
import { reportTypeErrorsForRecords } from "../lib/utils/typeChecking";

/**
 * Produces a dataset with the indicated attribute's values transformed
 * to be the result of evaluating the given expression in the context
 * of each case.
 */
export async function transformColumn({
  context1: contextName,
  attribute1: attributeName,
  expression1: expression,
  typeContract1: { outputType },
}: TransformerTemplateState): Promise<TransformationOutput> {
  if (contextName === null) {
    throw new Error("Please choose a valid dataset to transform.");
  }
  if (attributeName === null) {
    throw new Error("Please select an attribute to transform");
  }
  if (expression.trim() === "") {
    throw new Error("Please enter a non-empty expression to transform with");
  }
  if (outputType === null) {
    throw new Error("Please enter a valid output type");
  }

  const { context, dataset } = await getContextAndDataSet(contextName);
  const ctxtName = tryTitle(context);

  const [transformed, mvr] = await uncheckedTransformColumn(
    dataset,
    attributeName,
    expression,
    outputType
  );

  mvr.extraInfo = `The formula for the transformed column evaluated to a missing value for ${mvr.missingValues.length} rows.`;

  return [
    transformed,
    `TransformColumn(${ctxtName}, ...)`,
    `A copy of ${ctxtName}, with the ${attributeName} attribute's values ` +
      `determined by the formula \`${expression}\`.`,
    mvr,
  ];
}

export async function uncheckedTransformColumn(
  dataset: DataSet,
  attributeName: string,
  expression: string,
  outputType: CodapLanguageType,
  evalFormula = evalExpression
): Promise<[DataSet, MissingValueReport]> {
  validateAttribute(
    dataset.collections,
    attributeName,
    `Invalid attribute to transform: ${attributeName}`
  );

  const records = dataset.records.map(shallowCopy);
  const exprValues = await evalFormula(expression, records);

  // Check for type errors (might throw error and abort transformer)
  await reportTypeErrorsForRecords(
    records,
    exprValues,
    outputType,
    evalFormula
  );

  const mvr: MissingValueReport = {
    kind: "formula",
    missingValues: [],
  };

  exprValues.forEach((value, i) => {
    // Note values for which the formula evaluated to missing
    if (isMissing(value)) {
      mvr.missingValues.push(i + 1);
    }

    records[i][attributeName] = value;
  });

  const collections = dataset.collections.map(cloneCollection);
  for (const coll of collections) {
    const attr = coll.attrs?.find((attr) => attr.name === attributeName);

    // erase the transformed attribute's formula and set description
    if (attr !== undefined) {
      attr.formula = undefined;
      attr.description = `The ${attributeName} attribute, transformed by the formula \`${expression}\``;
      break;
    }
  }

  return [
    {
      collections,
      records,
    },
    mvr,
  ];
}
