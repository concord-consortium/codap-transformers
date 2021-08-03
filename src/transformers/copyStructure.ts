import { TransformerTemplateState } from "../components/transformer-template/TransformerTemplate";
import { tryTitle } from "../transformers/util";
import { getContextAndDataSet } from "../lib/codapPhone";
import { DataSet, EMPTY_MVR, TransformationOutput } from "./types";

/**
 * Produces a dataset with an identical structure (collection hierarchy,
 * attributes) to the input, but with no records.
 */
export async function copyStructure({
  context1: contextName,
}: TransformerTemplateState): Promise<TransformationOutput> {
  if (contextName === null) {
    throw new Error("Please choose a valid dataset to transform.");
  }

  const { context, dataset } = await getContextAndDataSet(contextName);
  const ctxtName = tryTitle(context);

  return [
    await uncheckedCopyStructure(dataset),
    `CopyStructure(${ctxtName})`,
    `A copy of the collections and attributes of the ${ctxtName} dataset, but with no cases.`,
    EMPTY_MVR,
  ];
}

export function uncheckedCopyStructure(dataset: DataSet): DataSet {
  return {
    collections: dataset.collections,
    records: [],
  };
}
