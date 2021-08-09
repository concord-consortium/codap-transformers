import React, { ReactElement } from "react";
import { SavedTransformer } from "./types";
import TransformerTemplate from "./TransformerTemplate";
import transformerList from "../../transformerList";
import { SafeActiveTransformationsDispatch } from "../../transformerStore/types";

interface TransformerRendererProps {
  transformer?: SavedTransformer;
  editable: boolean;
  setErrMsg: (s: string | null, id: number) => void;
  errorDisplay: ReactElement;
  activeTransformationsDispatch: SafeActiveTransformationsDispatch;
}

/**
 * A component which takes in data about a saved transformer and renders it properly
 */
export const TransformerRenderer = ({
  transformer,
  editable,
  setErrMsg,
  errorDisplay,
  activeTransformationsDispatch,
}: TransformerRendererProps): ReactElement => {
  if (transformer === undefined) {
    return <></>;
  }

  for (const key in transformerList) {
    if (transformer.content.base === key) {
      return (
        <TransformerTemplate
          setErrMsg={setErrMsg}
          errorDisplay={errorDisplay}
          init={transformerList[key].componentData.init}
          transformerFunction={
            transformerList[key].componentData.transformerFunction
          }
          base={transformer.content.base}
          saveData={transformer.content.data}
          editable={editable}
          activeTransformationsDispatch={activeTransformationsDispatch}
        />
      );
    }
  }

  return <div>Unrecognized Transformer</div>;
};
