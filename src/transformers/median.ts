import { TransformerTemplateState } from "../components/transformer-template/TransformerTemplate";
import { tryTitle } from "../transformers/util";
import { getContextAndDataSet } from "../lib/codapPhone";
import { DataSet, EMPTY_MVR, TransformationOutput } from "./types";
import { extractAttributeAsNumeric, validateAttribute } from "./util";

/**
 * Finds the median of a given attribute's values.
 */
export async function median({
  context1: contextName,
  attribute1: attribute,
}: TransformerTemplateState): Promise<TransformationOutput> {
  if (contextName === null) {
    throw new Error("Please choose a valid dataset to transform.");
  }

  if (attribute === null) {
    throw new Error("Please choose an attribute to find the median of.");
  }

  const { context, dataset } = await getContextAndDataSet(contextName);
  const ctxtName = tryTitle(context);

  return [
    uncheckedMedian(context.name, dataset, attribute),
    `Median(${ctxtName}, ${attribute})`,
    `The median value of the ${attribute} attribute in the ${ctxtName} dataset.`,
    // TODO: needs MVR
    EMPTY_MVR,
  ];
}

/**
 * Finds the median of a given attribute's values.
 *
 * @param contextName - Name of data context associated with input dataset
 * @param dataset - The input DataSet
 * @param attribute - The column to find the median of.
 */
export function uncheckedMedian(
  contextName: string,
  dataset: DataSet,
  attribute: string
): number {
  validateAttribute(dataset.collections, attribute);

  // Extract numeric values from the indicated attribute
  const [values] = extractAttributeAsNumeric(contextName, dataset, attribute);

  if (values.length === 0) {
    throw new Error(`Cannot find median of no numeric values`);
  }

  // Sort the numeric values ascending
  values.sort((a, b) => a - b);

  if (values.length % 2 === 0) {
    const middleRight = values.length / 2;
    const middleLeft = middleRight - 1;

    // Median is average of middle elements
    return (values[middleLeft] + values[middleRight]) / 2;
  } else {
    // Median is the middle element
    return values[Math.floor(values.length / 2)];
  }
}
