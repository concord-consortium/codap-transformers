import { default as transformerList } from "../transformerList";
import {
  TransformerTemplateState,
  FullOverrideFunction,
} from "../components/transformer-template/TransformerTemplate";
import {
  DataSetTransformationOutput,
  SingleValueTransformationOutput,
} from "../transformers/types";
import { updateContextWithDataSet, updateText } from "../lib/codapPhone";
import { makeDatasetImmutable } from "../transformers/util";
import { displaySingleValue } from "../transformers/util";
import {
  ActionTypes,
  ActiveTransformations,
  ActiveTransformationsAction,
  DatasetCreatorDescription,
  FullOverrideDescription,
  TransformationDescription,
  TransformationOutputType,
} from "./types";

export function serializeActiveTransformations(
  transformations: ActiveTransformations
): TransformationDescription[] {
  const serialized = new Set<TransformationDescription>();
  for (const descriptions of Object.values(transformations)) {
    descriptions.forEach((d) => serialized.add(d));
  }
  return Array.from(serialized);
}

export function deserializeActiveTransformations(
  transformations: TransformationDescription[]
): ActiveTransformations {
  const deserialized: ActiveTransformations = {};
  for (const transform of transformations) {
    for (const input of transform.inputs) {
      if (deserialized[input] === undefined) {
        deserialized[input] = [transform];
      } else {
        deserialized[input].push(transform);
      }
    }
  }
  return deserialized;
}

export async function updateFromDescription(
  description: TransformationDescription,
  dispatch: React.Dispatch<ActiveTransformationsAction>,
  editedOutputs: Set<string>
): Promise<void> {
  const transformFunc =
    transformerList[description.transformer].componentData.transformerFunction;
  if (transformFunc.kind === "datasetCreator") {
    description = description as DatasetCreatorDescription;
    if (description.outputType === TransformationOutputType.CONTEXT) {
      await updateContextFromDatasetCreator(
        description.state,
        description.output,
        transformFunc.func as (
          state: TransformerTemplateState
        ) => Promise<DataSetTransformationOutput>,

        // If the output title has not been edited by the user, flow title name
        !editedOutputs.has(description.output)
      );
    } else if (description.outputType === TransformationOutputType.TEXT) {
      await updateTextFromDatasetCreator(
        description.state,
        description.output,
        transformFunc.func as (
          state: TransformerTemplateState
        ) => Promise<SingleValueTransformationOutput>,

        // If the output title has not been edited by the user, flow title name
        !editedOutputs.has(description.output)
      );
    }
  } else if (transformFunc.kind === "fullOverride") {
    description = description as FullOverrideDescription;
    await updateFromFullOverride(description, dispatch, editedOutputs);
  }
}

async function updateContextFromDatasetCreator(
  state: TransformerTemplateState,
  outputName: string,
  transformFunc: (
    state: TransformerTemplateState
  ) => Promise<DataSetTransformationOutput>,
  updateTitle: boolean
): Promise<void> {
  const [transformed, newTitle, newDescription] = await transformFunc(state);
  const immutableTransformed = makeDatasetImmutable(transformed);
  if (updateTitle) {
    await updateContextWithDataSet(outputName, immutableTransformed, newTitle, {
      description: newDescription,
    });
  } else {
    await updateContextWithDataSet(outputName, immutableTransformed);
  }
}

async function updateTextFromDatasetCreator(
  state: TransformerTemplateState,
  outputName: string,
  transformFunc: (
    state: TransformerTemplateState
  ) => Promise<SingleValueTransformationOutput>,
  updateTitle: boolean
): Promise<void> {
  const [result, newTitle] = await transformFunc(state);
  await updateText(
    outputName,
    displaySingleValue(result),
    updateTitle ? newTitle : undefined
  );
}

async function updateFromFullOverride(
  description: FullOverrideDescription,
  dispatch: React.Dispatch<ActiveTransformationsAction>,
  editedOutputs: Set<string>
) {
  const newState = await (
    transformerList[description.transformer].componentData
      .transformerFunction as FullOverrideFunction
  ).updateFunc(description.state, editedOutputs);
  dispatch({
    type: ActionTypes.EDIT,
    transformation: description,
    newState,
  });
}

/**
 * Active Transformtions Reducer
 *
 * Reducer function for the activeTransformations object
 */
export function activeTransformationsReducer(
  oldState: ActiveTransformations,
  action: ActiveTransformationsAction
): ActiveTransformations {
  switch (action.type) {
    case ActionTypes.SET:
      return action.newTransformations;
    case ActionTypes.ADD:
      return addTransformation(oldState, action.newTransformation);
    case ActionTypes.EDIT:
      return editTransformation(
        oldState,
        action.transformation,
        action.newState
      );
    case ActionTypes.DELETE:
      return deleteTransformation(oldState, action.transformation);
  }
}

function addTransformation(
  transformations: ActiveTransformations,
  newTransformation: TransformationDescription
): ActiveTransformations {
  const cloned = { ...transformations };
  for (const input of newTransformation.inputs) {
    if (cloned[input] === undefined) {
      cloned[input] = [newTransformation];
    } else {
      cloned[input].push(newTransformation);
    }
  }
  return cloned;
}

function editTransformation(
  transformations: ActiveTransformations,
  oldTransformation: FullOverrideDescription,
  newState: {
    extraDependencies?: string[];
    state?: Partial<FullOverrideDescription["state"]>;
  }
): ActiveTransformations {
  const cloned = { ...transformations };
  for (const input of oldTransformation.inputs) {
    cloned[input] = cloned[input].map((description) => {
      if (description === oldTransformation) {
        description = {
          ...description,
          extraDependencies:
            newState.extraDependencies || description.extraDependencies,
          state: { ...description.state, ...newState.state },
        };
      }
      return description;
    });
  }
  return cloned;
}

function deleteTransformation(
  transformations: ActiveTransformations,
  toDelete: TransformationDescription
): ActiveTransformations {
  const cloned = { ...transformations };
  for (const input of toDelete.inputs) {
    cloned[input] = cloned[input].filter((d) => d !== toDelete);
  }
  return cloned;
}

export function findTransformation(
  activeTranformations: ActiveTransformations,
  predicate: (t: TransformationDescription) => boolean
): TransformationDescription | undefined {
  for (const input of Object.keys(activeTranformations)) {
    const result = activeTranformations[input].find(predicate);
    if (result !== undefined) {
      return result;
    }
  }
}
