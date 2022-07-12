import { TransformerTemplateState } from "../components/transformer-template/TransformerTemplate";
import { tryTitle } from "../transformers/util";
import { getContextAndDataSet } from "../lib/codapPhone";
import { DataSet, EMPTY_MVR, TransformationOutput } from "./types";
import { t } from "../strings";

/**
 * Produces a dataset with an identical structure (collection hierarchy,
 * attributes) to the input, but with no records.
 */
export async function copyStructure({
  context1: contextName,
  name,
}: TransformerTemplateState): Promise<TransformationOutput> {
  if (contextName === null) {
    throw new Error(t("errors:validation.noDataSet"));
  }

  const { context, dataset } = await getContextAndDataSet(contextName);
  const ctxtName = tryTitle(context);
  name = name || "CopyStructure";

  return [
    await uncheckedCopyStructure(dataset),
    `${name}(${ctxtName})`,
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
