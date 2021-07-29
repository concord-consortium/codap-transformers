import { TransformerTemplateState } from "../components/transformer-template/TransformerTemplate";
import { readableName } from "../transformers/util";
import { getContextAndDataSet } from "../lib/codapPhone";
import { DataSet, TransformationOutput } from "./types";
import { extractAttributeAsNumeric, validateAttribute } from "./util";
import { t } from "../strings";

/**
 * Finds the standard deviation of a given attribute's values.
 */
export async function standardDeviation({
  context1: contextName,
  attribute1: attribute,
}: TransformerTemplateState): Promise<TransformationOutput> {
  if (contextName === null) {
    throw new Error(t("errors:validation.noDataSet"));
  }

  if (attribute === null) {
    throw new Error(t("errors:standardDeviation.noAttribute"));
  }

  const { context, dataset } = await getContextAndDataSet(contextName);
  const ctxtName = readableName(context);

  return [
    uncheckedStandardDeviation(dataset, attribute),
    `StandardDeviation(${ctxtName}, ${attribute})`,
    `The standard deviation of the ${attribute} attribute in the ${ctxtName} dataset.`,
  ];
}

/**
 * Computes the mean value of a list of values.
 *
 * @param vs List of values to compute mean over
 * @returns The mean value
 */
function mean(vs: number[]): number {
  return vs.reduce((a, b) => a + b, 0) / vs.length;
}

/**
 * Finds the standard deviation of a given attribute's values.
 *
 * @param dataset - The input DataSet
 * @param attribute - The column to find the standard deviation of.
 */
export function uncheckedStandardDeviation(
  dataset: DataSet,
  attribute: string
): number {
  validateAttribute(dataset.collections, attribute);

  // Extract numeric values from the indicated attribute
  const values = extractAttributeAsNumeric(dataset, attribute);

  if (values.length === 0) {
    throw new Error(t("errors:standardDeviation.noValues"));
  }

  const populationMean = mean(values);
  const squaredDeviations = values.map((v) => Math.pow(v - populationMean, 2));
  const variance = mean(squaredDeviations);
  const stdDev = Math.sqrt(variance);

  return stdDev;
}
