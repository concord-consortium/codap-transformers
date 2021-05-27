import { DataSet } from "./types";
import { CodapAttribute, Collection } from "../utils/codapPhone/types";
import { reparent } from "./util";

// TODO: add option for "collapse other groupings" which will
// not only group by the indicated attributes, but ensure that
// all other attributes are collapsed into the same collection
// in the output. This is useful if you have a currently grouped dataset,
// but want to "re-group" it.
// User can supply a name for the collection holding all other attributes.

/**
 * Groups a dataset by the indicated attributes, by removing them from
 * their current positions and putting them all together in a new
 * parent collection. CODAP handles the grouping of cases with the
 * same content for us.
 *
 * @param dataset the dataset to group
 * @param groupByAttrs the attributes to separate into a parent collection
 * @param newParentName the name of newly-created parent collection
 * @returns the grouped dataset
 */
export function groupBy(
  dataset: DataSet,
  attrNames: string[],
  newParentName: string
): DataSet {
  const groupedAttrs: CodapAttribute[] = [];
  let collections = dataset.collections.slice();

  // extract attributes from collections into a list
  attrLoop: for (const attrName of attrNames) {
    for (const coll of collections) {
      const attr = coll.attrs?.find((attr) => attr.name === attrName);

      // attribute was found in this collection
      if (attr !== undefined) {
        // copy and rename grouped attribute
        // NOTE: formulas cannot be safely copied into a parent collection.
        // This is because formulas might reference child attributes, which
        // causes an error in CODAP. Instead, we copy values of the formula
        // in the original attribute, and group by these values in the copied
        // attribute.
        groupedAttrs.push({
          ...attr,
          name: groupedAttrName(attr.name), // rename attribute uniquely
          formula: undefined, // do not copy formulas
        });
        continue attrLoop;
      }
    }

    // attribute was not found in any collection
    throw new Error(`bad attribute name: ${attrName}`);
  }

  // remove any collections with no attributes after the group,
  // and reparent collections that referenced them.
  collections = collections
    .map((coll) => {
      // make topmost parent collection child of the new parent
      if (coll.parent === undefined) {
        coll.parent = newParentName;
      }
      return coll;
    })
    .filter((coll) => {
      // remove any collections that now lack attributes
      const keep = coll.attrs === undefined || coll.attrs.length > 0;
      if (!keep) {
        reparent(collections, coll);
      }
      return keep;
    });

  const collection: Collection = {
    name: newParentName,
    attrs: groupedAttrs,
    labels: {},
  };

  const records = dataset.records.slice();
  for (const record of records) {
    for (const attrName of attrNames) {
      // make copy of record data from original attr into grouped attr
      record[groupedAttrName(attrName)] = record[attrName];
    }
  }

  return {
    collections: [collection].concat(collections),
    records,
  };
}

/**
 * Constructs the name of the copy of the original attribute that
 * appears in the collection everything is grouped by.
 * @param attr original attribute
 * @returns grouped attribute name
 */
function groupedAttrName(attrName: string): string {
  return `${attrName} Group`;
}