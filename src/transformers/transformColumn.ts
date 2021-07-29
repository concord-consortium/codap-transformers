import { CodapLanguageType, DataSet, TransformationOutput } from "./types";
import { evalExpression, getContextAndDataSet } from "../lib/codapPhone";
import { TransformerTemplateState } from "../components/transformer-template/TransformerTemplate";
import { readableName } from "../transformers/util";
import {
  reportTypeErrorsForRecords,
  cloneCollection,
  shallowCopy,
  validateAttribute,
} from "./util";
import { t } from "../strings";

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
    throw new Error(t("errors:validation.noDataSet"));
  }
  if (attributeName === null) {
    throw new Error(t("errors:transformColumn.noAttribute"));
  }
  if (expression.trim() === "") {
    throw new Error(t("errors:transformColumn.noExpression"));
  }
  if (outputType === null) {
    throw new Error(t("errors:transformColumn.noOutputType"));
  }

  const { context, dataset } = await getContextAndDataSet(contextName);
  const ctxtName = readableName(context);
  return [
    await uncheckedTransformColumn(
      dataset,
      attributeName,
      expression,
      outputType
    ),
    `TransformColumn(${ctxtName}, ...)`,
    `A copy of ${ctxtName}, with the ${attributeName} attribute's values ` +
      `determined by the formula \`${expression}\`.`,
  ];
}

export async function uncheckedTransformColumn(
  dataset: DataSet,
  attributeName: string,
  expression: string,
  outputType: CodapLanguageType,
  evalFormula = evalExpression
): Promise<DataSet> {
  validateAttribute(
    dataset.collections,
    attributeName,
    t("errors:transformColumn.invalidAttribute", { name: attributeName })
  );

  const records = dataset.records.map(shallowCopy);
  const exprValues = await evalFormula(expression, records);

  // Check for type errors (might throw error and abort transformer)
  reportTypeErrorsForRecords(records, exprValues, outputType);

  exprValues.forEach((value, i) => {
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

  return new Promise((resolve) =>
    resolve({
      collections,
      records,
    })
  );
}
