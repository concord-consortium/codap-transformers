import { CodapAttribute, Collection } from "../../lib/codapPhone/types";
import { Boundary, DataSet } from "../types";
import { cloneCollection, shallowCopy } from "../util";

/**
 * Make a collection object from its pieces.
 */
export function makeCollection(
  name: string,
  attributes: string[],
  parent?: string
): Collection {
  return {
    name,
    attrs: attributes.map((attr) => makeAttribute(attr)),
    parent,
  };
}

/**
 * Make an attribute object from its pieces.
 */
function makeAttribute(name: string): CodapAttribute {
  return {
    name,
  };
}

/**
 * Make a list of records from the attributes and values for those attributes.
 */
export function makeRecords(
  attributes: string[],
  valueLists: unknown[][]
): Record<string, unknown>[] {
  return valueLists.map((valueList) => {
    if (attributes.length !== valueList.length) {
      throw new Error("attributes list not the same length as a value list");
    }
    const map: Record<string, unknown> = {};
    valueList.forEach((value, i) => {
      map[attributes[i]] = value;
    });
    return map;
  });
}

/**
 *
 * @param randomize whether or not to the randomize the data in the boundary
 * object (if false the same boundary will be returned each time)
 * @returns a boundary object
 */
export function makeSimpleBoundary(randomize: boolean): Boundary {
  /**
   * Makes a latitude/longitude pair between -90 and 90
   */
  const makeLatLong = () => [
    Math.random() * 180 - 90,
    Math.random() * 180 - 90,
  ];

  return {
    jsonBoundaryObject: {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          randomize
            ? [
                makeLatLong(),
                makeLatLong(),
                makeLatLong(),
                makeLatLong(),
                makeLatLong(),
              ]
            : [
                [-93.0322265625, 36.29741818650811],
                [-88.65966796875, 36.29741818650811],
                [-88.65966796875, 39.26628442213066],
                [-93.0322265625, 39.26628442213066],
                [-93.0322265625, 36.29741818650811],
              ],
        ],
      },
      properties: {
        CENSUSAREA: 97093.141,
        GEO_ID: "0400000US56",
        LSAD: "",
        NAME: "Colorado",
        STATE: "56",
        THUMB:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAABuUlEQVR4nO3dTUoDQRRF4VPPiApBFyA4dQsu1424GBWciiD4i+2gTYeIoGmVuoPzgRPtwIu3q1LVeUmDJEmSJEmSJM3QYDgHjmc89gDY/9tyNtwBbx8/d1s+toCjb4757/rnuF4AZ8Bp70oEwGExnoEKUcDQuwitFdB6F6FJq94VaJNTVpbBQMIUsOhdhNYK2OldhCatGENRCMPIMhhIGAMJYyBZnLLSGEgYAwljIGEMJIuX39MYSBgDyVIGksXXkDDNJocsjpAwjpAwjpA0dp2EMZAsO05ZWXxRD1MGksVVVhinrDBOWWFsJQ3TbLbOYiBhWgF7vavQxEDCtAJ2e1ehNVdZWdwYhrH7PYzXssL4OfU0jpAsdi6GaU5ZYQq46V2EJq2Ay95VaK2Ap95FaDK4Uw9jIGFc9mapAl57V6GJV3vDuFMPYyBhbJQL4/shYby4GGbwe3uzDLYBZWmOkDD2ZWWxDSiNq6wwbgzDeFOwME5ZYRbABXD1xd/ugZdPv9tnvCHjyurmj3OdsN2y+xF4+OGxS8aTbcHvVpK3Wx6/+p8sGfd4T8Az43P9jrOVJEmSJEmSpHneAYtbL3RNXcxYAAAAAElFTkSuQmCC",
      },
    },
  };
}

/**
 * Evaluates a formula using the JS eval function. Use this function for
 * testing transformers like `buildColumn` that require evaluating expressions
 * @param expr the expression to be evaluated
 * @param records a list of key/value pairs. For each item in the list, the
 * expression will be evaluated with all values in the record added to the
 * environment.
 * @returns a list of the result of evaluated expr once for each record in records
 */
export const jsEvalExpression = (
  expr: string,
  records: Record<string, unknown>[]
): Promise<unknown[]> => {
  const expressionOutputs: unknown[] = [];

  for (const record of records) {
    // Prepend to the beginning of the expression `let` statements that bind
    // all values in `record`
    const fullExpr = Object.entries(record)
      .map(([key, value]) => `let ${key} = ${JSON.stringify(value)}`)
      .join(";\n")
      .concat(`;\n${expr}`);

    expressionOutputs.push(eval(fullExpr));
  }

  return Promise.resolve(expressionOutputs);
};

/**
 * Makes a clone of a dataset.
 */
export function cloneDataSet(dataset: DataSet): DataSet {
  return {
    collections: dataset.collections.map((coll) => cloneCollection(coll)),
    records: dataset.records.map((rec) => shallowCopy(rec)),
    editable: dataset.editable,
  };
}

/**
 * Gets copies of attributes with the given names from the given dataset.
 */
export function copyAttributes(
  dataset: DataSet,
  attributes: string[]
): CodapAttribute[] {
  return dataset.collections
    .map((coll) => coll.attrs || [])
    .flat()
    .filter((attr) => attributes.includes(attr.name))
    .map((attr) => shallowCopy(attr));
}

/**
 * Given a list of values, constructs a dataset with a single
 * collection "Collection" containing a single attribute "Attribute"
 * which contains these values.
 *
 * @param values The values to include in the dataset
 * @returns A dataset consisting of an attribute with the given values.
 */
export function datasetFromValues(values: unknown[]): DataSet {
  return {
    collections: [makeCollection("Collection", ["Attribute"])],
    records: makeRecords(
      ["Attribute"],
      values.map((v) => [v])
    ),
  };
}

/**
 * A small example dataset with attributes A, B, and C across two collections.
 */
export const DATASET_A: DataSet = {
  collections: [
    makeCollection("parent", ["A"]),
    makeCollection("child", ["B", "C"], "parent"),
  ],
  records: makeRecords(
    ["A", "B", "C"],
    [
      [3, true, 2000],
      [8, true, 2003],
      [10, false, 1998],
      [4, true, 2010],
      [10, false, 2014],
    ]
  ),
};

export const DATASET_A_SUPERSET: DataSet = {
  collections: [
    makeCollection("parent", ["A"]),
    makeCollection("child", ["B", "C", "D"], "parent"),
  ],
  records: makeRecords(
    ["A", "B", "C", "D"],
    [
      [3, true, 2000, "a"],
      [8, true, 2003, "a"],
      [10, false, 1998, "a"],
      [4, true, 2010, "a"],
      [10, false, 2014, "a"],
    ]
  ),
};

export const DATASET_A_SUBSET: DataSet = {
  collections: [
    makeCollection("parent", ["A"]),
    makeCollection("child", ["B"], "parent"),
  ],
  records: makeRecords(
    ["A", "B"],
    [
      [3, true],
      [8, true],
      [10, false],
      [4, true],
      [10, false],
    ]
  ),
};

/**
 * A small example dataset with attributes Name, Birth_Year, Current
 * Year, and Grade.
 */
export const DATASET_B: DataSet = {
  collections: [
    makeCollection("cases", ["Name", "Birth_Year", "Current_Year", "Grade"]),
  ],
  records: makeRecords(
    ["Name", "Birth_Year", "Current_Year", "Grade"],
    [
      ["Jon", 1990, 2021, 88],
      ["Sheila", 1995, 2021, 91],
      ["Joseph", 2001, 2021, 100],
      ["Eve", 2000, 2021, 93],
      ["Nick", 1998, 2021, 95],
      ["Paula", 1988, 2021, 81],
    ]
  ),
};

/**
 * A dataset with student names and grades on multiple assessments, with each
 * assessment as a separate attribute
 */
export const GRADES_DATASET_WIDER: DataSet = {
  collections: [
    makeCollection("Collection", ["name", "quiz1", "quiz2", "test1"]),
  ],
  records: makeRecords(
    ["name", "quiz1", "quiz2", "test1"],
    [
      ["Billy", "", "D", "C"],
      ["Jenny", "A", "A", "B"],
      ["Joshua", "C", "B", "B"],
      ["Suzy", "F", "", ""],
      ["Lionel", "B", "C", "B"],
    ]
  ),
};

/**
 * A dataset with student names and grades on multiple assessments, with all assessments
 * in one column
 */
export const GRADES_DATASET_LONGER: DataSet = {
  collections: [makeCollection("Collection", ["name", "Assessment", "Grades"])],
  records: makeRecords(
    ["name", "Assessment", "Grades"],
    [
      ["Billy", "quiz1", ""],
      ["Billy", "quiz2", "D"],
      ["Billy", "test1", "C"],
      ["Jenny", "quiz1", "A"],
      ["Jenny", "quiz2", "A"],
      ["Jenny", "test1", "B"],
      ["Joshua", "quiz1", "C"],
      ["Joshua", "quiz2", "B"],
      ["Joshua", "test1", "B"],
      ["Suzy", "quiz1", "F"],
      ["Suzy", "quiz2", ""],
      ["Suzy", "test1", ""],
      ["Lionel", "quiz1", "B"],
      ["Lionel", "quiz2", "C"],
      ["Lionel", "test1", "B"],
    ]
  ),
};

/**
 * A dataset with lots of collection/attribute metadata (titles,
 * descriptions, formulas, etc.), but no records.
 */
export const DATASET_WITH_META: DataSet = {
  collections: [
    {
      name: "Collection",
      title: "Collection Title",
      description: "A description of the collection.",
      labels: {
        singleCase: "case",
        pluralCase: "cases",
      },
      attrs: [
        {
          name: "A",
          title: "A Attribute",
          type: "numeric",
          description: "Description for A",
          editable: true,
          formula: "B + 7",
          hidden: false,
          precision: 2,
          unit: "ft",
        },
        {
          name: "B",
          title: "B Attribute",
          type: "numeric",
          description: "Description for B",
          editable: false,
          formula: "abs(-7)",
          hidden: true,
          precision: 2,
          unit: "m",
        },
        {
          name: "C",
          title: "C Attribute",
          type: "categorical",
          description: "Description for C",
          editable: false,
          hidden: false,
        },
      ],
    },
  ],
  records: [],
};

/**
 * A dataset with no collections or records.
 */
export const EMPTY_DATASET: DataSet = {
  collections: [],
  records: [],
};

/**
 * A dataset with several collections but no records.
 */
export const EMPTY_RECORDS: DataSet = {
  collections: [
    makeCollection("Collection A", ["A", "B", "C"]),
    makeCollection("Collection B", ["D"], "Collection A"),
    makeCollection("Collection C", ["E", "F"], "Collection B"),
  ],
  records: [],
};

/**
 * A smaller version of the datasets produced by the US Microdata Portal
 * plugin.
 *
 * From: https://codap.concord.org/app/extn/plugins/sdlc/plugin/index.html?lang=en
 */
export const CENSUS_DATASET: DataSet = {
  collections: [
    {
      name: "places",
      title: "places",
      attrs: [
        {
          name: "State",
          title: "State",
          type: "categorical",
          description:
            "The state in which the individual lives, using a federal coding \
            scheme that lists states alphabetically. Note that you must select \
            this attribute if you want to display state names in your case table \
            or graphs.",
          editable: true,
          hidden: false,
          precision: 2,
          unit: null,
        },
      ],
    },
    {
      name: "people",
      title: "people",
      attrs: [
        {
          name: "sample",
          title: "sample",
          type: "categorical",
          description: "sample number",
          editable: true,
          hidden: false,
          precision: 2,
          unit: null,
        },
        {
          name: "Sex",
          title: "Sex",
          type: "categorical",
          description: "Each individual's biological sex as male or female.",
          editable: true,
          hidden: false,
          precision: 2,
          unit: null,
        },
        {
          name: "Age",
          title: "Age",
          type: "numeric",
          description:
            "The individual's age in years as of the last birthday. Values range \
            from 0 (less than 1 year old) to 90 and above.  See codebook for special codes.",
          editable: true,
          hidden: false,
          precision: 2,
          unit: null,
        },
        {
          name: "Year",
          title: "Year",
          type: "categorical",
          description:
            "The four-digit year of the decennial census or ACS for each person's \
            questionnaire responses. Note that you must select this attribute if \
            you want to display year indicators in your case table or graphs.",
          editable: true,
          hidden: false,
          precision: 2,
          unit: null,
        },
      ],
    },
  ],
  records: makeRecords(
    ["State", "sample", "Sex", "Age", "Year"],
    [
      ["Arizona", 1, "Male", 71, 2017],
      ["Arizona", 1, "Male", 11, 2017],
      ["Florida", 1, "Female", 16, 2017],
      ["Florida", 1, "Male", 5, 2017],
      ["Florida", 1, "Female", 52, 2017],
      ["California", 1, "Male", 18, 2017],
      ["California", 1, "Male", 72, 2017],
      ["California", 1, "Female", 22, 2017],
      ["California", 1, "Female", 48, 2017],
      ["Texas", 1, "Female", 18, 2017],
      ["Texas", 1, "Female", 47, 2017],
      ["Texas", 1, "Female", 20, 2017],
      ["Texas", 1, "Female", 4, 2017],
      ["Texas", 1, "Male", 30, 2017],
      ["Texas", 1, "Male", 63, 2017],
      ["South Carolina", 1, "Female", 27, 2017],
      ["South Carolina", 1, "Female", 38, 2017],
      ["Idaho", 1, "Male", 67, 2017],
      ["Idaho", 1, "Female", 47, 2017],
      ["Massachusetts", 1, "Female", 64, 2017],
      ["Massachusetts", 1, "Male", 33, 2017],
      ["Massachusetts", 1, "Female", 83, 2017],
    ]
  ),
};

/**
 * A dataset that attempts to exercise many CODAP features including:
 *  boundaries,
 *  strings (including punctuation and whitespace),
 *  colors,
 *  numbers,
 *  booleans,
 *  missing values
 */
export const FULLY_FEATURED_DATASET: DataSet = {
  collections: [
    makeCollection("Collection 1", ["Attribute_1", "Attribute_2"]),
    makeCollection(
      "Collection 2",
      ["Attribute_3", "Attribute_4"],
      "Collection 1"
    ),
    makeCollection("Collection 3", ["Attribute_5"], "Collection 2"),
  ],
  records: makeRecords(
    ["Attribute_1", "Attribute_2", "Attribute_3", "Attribute_4", "Attribute_5"],
    [
      ["rgb(100,200,0)", -1, makeSimpleBoundary(false), "test 1", true],
      ["  \n  ", -2, makeSimpleBoundary(false), "test 2", true],
      [".;'[]-=<>", 3, makeSimpleBoundary(false), "test 3", false],
      ["", "", "", "", ""],
    ]
  ),
};

/**
 * A dataset with one attribute per CODAP datatype. Includes types: Number,
 * String, Boolean, Boundary, Color, Missing.
 */
export const TYPES_DATASET: DataSet = {
  collections: [
    makeCollection("Collection", [
      "Number",
      "String",
      "NumericString",
      "Boolean",
      "Boundary",
      "Color",
      "Missing",
    ]),
  ],
  records: makeRecords(
    [
      "Number",
      "String",
      "NumericString",
      "Boolean",
      "Boundary",
      "Color",
      "Missing",
    ],
    [
      [40, "abc", "10", true, makeSimpleBoundary(false), "#ff00ff", ""],
      [-5, "DEFG", "11", false, makeSimpleBoundary(false), "rgb(10,41,28)", ""],
      [
        700.2,
        "hIjKLm",
        "12",
        false,
        makeSimpleBoundary(false),
        "rgba(2,3,4,0.5)",
        "",
      ],
    ]
  ),
};

/**
 * A dataset which contains numeric values interspersed with missing values.
 */
export const DATASET_WITH_MISSING: DataSet = {
  collections: [makeCollection("Collection", ["A", "B", "C"])],
  records: makeRecords(
    ["A", "B", "C"],
    [
      [6, "", 10],
      [3, 12, 1],
      ["", "", 4],
      [10, 2, ""],
      ["", "", ""],
      [5, 2, 3],
    ]
  ),
};

/**
 * A dataset whose attributes are all marked as uneditable.
 */
export const DATASET_WITH_UNEDITABLE_ATTRS: DataSet = {
  collections: [
    {
      name: "Collection 1",
      attrs: [
        {
          name: "A",
          editable: false,
        },
        {
          name: "B",
          editable: false,
        },
      ],
    },
    {
      name: "Collection 2",
      attrs: [
        {
          name: "C",
          editable: false,
        },
        {
          name: "D",
          editable: false,
        },
        {
          name: "E",
          editable: false,
        },
      ],
    },
  ],
  records: [],
};
