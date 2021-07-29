import { DataSet, TransformationOutput } from "./types";
import {
  allAttrNames,
  cloneCollection,
  codapValueToString,
  validateAttribute,
} from "./util";
import { TransformerTemplateState } from "../components/transformer-template/TransformerTemplate";
import { getContextAndDataSet } from "../lib/codapPhone";
import { readableName } from "../transformers/util";
import { uniqueName } from "../lib/utils/names";
import {
  colorToRgbString,
  GREEN,
  GREY,
  interpolateColor,
  RED,
} from "../lib/utils/colors";
import { uncheckedFlatten } from "./flatten";
import { uncheckedGroupBy } from "./groupBy";
import { t } from "../strings";

const COMPARE_STATUS_COLUMN_BASE = "Compare Status";
const COMPARE_VALUE_COLUMN_BASE = "Difference";

/**
 * Compares two contexts in a variety of ways
 */
export async function compare({
  context1: inputDataContext1,
  attribute1: inputAttribute1,
  attribute2: inputAttribute2,
  dropdown1: kind,
}: TransformerTemplateState): Promise<TransformationOutput> {
  if (!inputDataContext1) {
    throw new Error(t("errors:validation.noDataSet"));
  }
  if (!(inputAttribute1 && inputAttribute2)) {
    throw new Error(t("errors:compare.noAttribute"));
  }
  if (!(kind === "categorical" || kind === "numeric")) {
    throw new Error(t("errors:compare.noComparisonType"));
  }

  const { context, dataset } = await getContextAndDataSet(inputDataContext1);

  const contextName = readableName(context);

  if (kind === "categorical") {
    return [
      await uncheckedCategoricalCompare(
        dataset,
        inputAttribute1,
        inputAttribute2
      ),
      `Compare(${contextName}, ...)`,
      `A categorical comparison of the attributes ${inputAttribute1} and ${inputAttribute2} (from ${contextName})`,
    ];
  } else {
    return [
      await uncheckedNumericCompare(dataset, inputAttribute1, inputAttribute2),
      `Compare(${contextName}, ...)`,
      `A numeric comparison of the attributes ${inputAttribute1} and ${inputAttribute2} (from ${contextName})`,
    ];
  }
}

export function uncheckedNumericCompare(
  dataset: DataSet,
  attributeName1: string,
  attributeName2: string
): DataSet {
  t;

  const [, attribute1Data] = validateAttribute(
    dataset.collections,
    attributeName1,
    t("errors:compare.invalidFirstAttribute")
  );
  const [, attribute2Data] = validateAttribute(
    dataset.collections,
    attributeName2,
    t("errors:compare.invalidSecondAttribute")
  );
  const collections = dataset.collections.map(cloneCollection);

  // Find the index of the collections that contain the attributes
  const attribute1CollectionIndex = collections.findIndex(
    (collection) =>
      collection.attrs?.find((attr) => attr.name === attribute1Data.name) !==
      undefined
  );
  const attribute2CollectionIndex = collections.findIndex(
    (collection) =>
      collection.attrs?.find((attr) => attr.name === attribute2Data.name) !==
      undefined
  );

  // FIXME: Is this check not necessary because of validateAttribute?
  // Make sure both attributes were found
  if (attribute1CollectionIndex === -1) {
    throw new Error("First attribute not found in dataset");
  }
  if (attribute2CollectionIndex === -1) {
    throw new Error("Second attribute not found in dataset");
  }

  // Between the two collections that the attributes are in, we want to pick the rightmost one.
  const toAdd =
    collections[Math.max(attribute1CollectionIndex, attribute2CollectionIndex)];

  // Ensure generated comparison attributes don't collide with attributes being compared
  const compareStatusColumnName = uniqueName(
    COMPARE_STATUS_COLUMN_BASE,
    allAttrNames(dataset)
  );
  const compareValueColumnName = uniqueName(
    COMPARE_VALUE_COLUMN_BASE,
    allAttrNames(dataset)
  );

  if (!toAdd.attrs) {
    toAdd.attrs = [];
  }

  toAdd.attrs.push({
    name: compareValueColumnName,
    description: "",
    editable: true,
    hidden: false,
    type: "numeric",
  });
  toAdd.attrs.push({
    name: compareStatusColumnName,
    description: "",
    editable: true,
    hidden: false,
    type: "categorical",
  });

  const values1 = dataset.records.map((record) => record[attribute1Data.name]);
  const values2 = dataset.records.map((record) => record[attribute2Data.name]);

  const records = dataset.records;

  // Start by looping through all records and finding those that
  // can be numerically compared successfully
  const validIndicesAndValues: Record<number, [number, number]> = {};
  for (let i = 0; i < Math.max(values1.length, values2.length); i++) {
    const v1 = values1[i];
    const v2 = values2[i];

    const parsed1: number = parseFloat(`${v1}`);
    const parsed2: number = parseFloat(`${v2}`);

    // If either is not a number (and also not empty string), throw an error
    if (isNaN(parsed1) && v1 !== "") {
      throw new Error(
        t("errors:compare.typeMismatch", {
          type: "number",
          value: codapValueToString(v1),
        })
      );
    }
    if (isNaN(parsed2) && v2 !== "") {
      throw new Error(
        t("errors:compare.typeMismatch", {
          type: "number",
          value: codapValueToString(v2),
        })
      );
    }

    // If either is null/undefined/empty string, skip and continue
    if (
      v1 === null ||
      v2 === null ||
      v1 === undefined ||
      v2 === undefined ||
      v1 === "" ||
      v2 === ""
    ) {
      continue;
    }

    validIndicesAndValues[i] = [parsed1, parsed2];
  }

  // Loop through all valid values and find the largest numeric difference
  // (negative or positive)
  let largestDifference = 0;
  for (const [, [v1, v2]] of Object.entries(validIndicesAndValues)) {
    const difference = v2 - v1;
    if (Math.abs(difference) > Math.abs(largestDifference)) {
      largestDifference = difference;
    }
  }

  // Loop through all indices and add records to output dataset. If we've
  // previously seen that a given index has two valid values that can be compared,
  // then compare them and compute a color for the output. Otherwise, just include
  // the values as strings and leave the comparison columns blank.
  for (let i = 0; i < Math.max(values1.length, values2.length); i++) {
    if (i in validIndicesAndValues) {
      const [v1, v2] = validIndicesAndValues[i];
      const difference = v2 - v1;

      const colorScalar = Math.abs(difference / largestDifference);
      let color;
      if (difference > 0) {
        color = colorToRgbString(interpolateColor(GREY, GREEN, colorScalar));
      } else if (difference < 0) {
        color = colorToRgbString(interpolateColor(GREY, RED, colorScalar));
      } else {
        color = colorToRgbString(GREY);
      }
      records[i][compareValueColumnName] = difference;
      records[i][compareStatusColumnName] = color;
    } else {
      records[i][compareValueColumnName] = "";
      records[i][compareStatusColumnName] = "";
    }
  }

  return { records, collections };
}

export function uncheckedCategoricalCompare(
  dataset: DataSet,
  attributeName1: string,
  attributeName2: string
): DataSet {
  const [, attribute1Data] = validateAttribute(
    dataset.collections,
    attributeName1,
    t("errors:compare.invalidFirstAttribute")
  );
  const [, attribute2Data] = validateAttribute(
    dataset.collections,
    attributeName2,
    t("errors:compare.invalidSecondAttribute")
  );

  dataset = uncheckedFlatten(dataset);
  const out = uncheckedGroupBy(
    dataset,
    [
      {
        attrName: attribute1Data.name,
        groupedName: `${attribute1Data.name} Category`,
      },
      {
        attrName: attribute2Data.name,
        groupedName: `${attribute2Data.name} Category`,
      },
    ],
    "Comparison"
  );
  return out;
}
