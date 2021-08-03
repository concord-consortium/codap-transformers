import React, { ReactElement, useReducer } from "react";
import { useState } from "react";
import "./styles/Views.css";
import ErrorDisplay from "../components/ui-components/Error";
import { SavedTransformer } from "../components/transformer-template/types";
import { TextArea, TextInput } from "../components/ui-components";
import {
  getInteractiveFrame,
  notifyInteractiveFrameIsDirty,
  notifyInteractiveFrameWithSelect,
  updateInteractiveFrame,
} from "../lib/codapPhone";
import { useEffect } from "react";
import { InteractiveState } from "../lib/codapPhone/types";
import {
  addInteractiveStateRequestListener,
  removeInteractiveStateRequestListener,
} from "../lib/codapPhone/listeners";
import "../components/transformer-template/styles/DefinitionCreator.css";
import "./styles/SavedDefinitionView.css";
import { useActiveTransformations } from "../transformerStore";
import { ActionTypes } from "../transformerStore/types";
import { deserializeActiveTransformations } from "../transformerStore/util";
import { TransformerRenderer } from "../components/transformer-template/TransformerRenderer";

/**
 * SavedDefinitionView wraps a saved transformer in other important info
 * like it's name/purpose statement and an error box
 */
function SavedDefinitionView({
  transformer: urlTransformer,
}: {
  transformer: SavedTransformer;
}): ReactElement {
  const [errMsg, setErrMsg] = useReducer(
    (oldState: string | null, newState: string | null): string | null => {
      if (newState) {
        notifyInteractiveFrameWithSelect();
      }
      return newState;
    },
    null
  );
  const [editable, setEditable] = useState<boolean>(false);
  const [savedTransformer, setSavedTransformer] = useState(urlTransformer);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [, activeTransformationsDispatch, wrappedDispatch] =
    useActiveTransformations(setErrMsg);

  // Load saved state from CODAP memory
  useEffect(() => {
    async function fetchSavedState() {
      const savedState = (await getInteractiveFrame()).savedState;
      if (savedState === undefined) {
        return;
      }
      if (savedState.savedTransformation) {
        setSavedTransformer({
          ...savedTransformer,
          name: savedState.savedTransformation.name,
          description: savedState.savedTransformation.description,
        });
      }
      if (savedState.activeTransformations) {
        activeTransformationsDispatch({
          type: ActionTypes.SET,
          newTransformations: deserializeActiveTransformations(
            savedState.activeTransformations
          ),
        });
      }
    }
    fetchSavedState();

    // Identity of dispatch is stable since it came from useReducer
  }, [activeTransformationsDispatch, savedTransformer]);

  // Register a listener to generate the plugin's state
  useEffect(() => {
    const callback = (
      previousInteractiveState: InteractiveState
    ): InteractiveState => {
      return {
        ...previousInteractiveState,
        savedTransformation: {
          name: savedTransformer.name,
          description: savedTransformer.description || "",
        },
      };
    };

    addInteractiveStateRequestListener(callback);
    return () => removeInteractiveStateRequestListener(callback);
  }, [savedTransformer]);

  function notifyStateIsDirty() {
    notifyInteractiveFrameIsDirty();
  }

  return (
    <div className="transformer-view">
      {editable && (
        <div className="editing-indicator">
          <p>You are editing this transformer</p>
        </div>
      )}
      {editable ? (
        <TextInput
          value={savedTransformer.name}
          onChange={(e) => {
            setSavedTransformer({ ...savedTransformer, name: e.target.value });
            setSaveErr(null);
          }}
          placeholder={"Transformer Name"}
          className="saved-transformer-name"
          onBlur={notifyStateIsDirty}
        />
      ) : (
        <h2>
          {savedTransformer.name}
          <span id="transformerBase"> ({savedTransformer.content.base})</span>
        </h2>
      )}
      {editable ? (
        <>
          <TextArea
            value={savedTransformer.description || ""}
            onChange={(e) => {
              setSavedTransformer({
                ...savedTransformer,
                description: e.target.value,
              });
              setSaveErr(null);
            }}
            placeholder="Purpose Statement"
            className="purpose-statement"
            onBlur={notifyStateIsDirty}
          />
          <hr className="divider" />
        </>
      ) : (
        savedTransformer.description && <p>{savedTransformer.description}</p>
      )}
      <TransformerRenderer
        setErrMsg={setErrMsg}
        errorDisplay={<ErrorDisplay message={errMsg} />}
        transformer={savedTransformer}
        editable={editable}
        activeTransformationsDispatch={wrappedDispatch}
      />
      <button
        id="edit-button"
        onClick={() => {
          // clear the transformer application error message
          setErrMsg(null);

          // if going to non-editable (saving) and name is blank
          if (editable && savedTransformer.name.trim() === "") {
            setSaveErr("Please choose a name for the transformer");
            return;
          }

          // if saving, update the interactive frame to use the new transformer name
          if (editable) {
            updateInteractiveFrame({
              title: `Transformer: ${savedTransformer.name}`,
            });
          }

          setEditable(!editable);
        }}
        title={
          editable
            ? "Save changes made to this transformer"
            : "Make changes to this transformer"
        }
      >
        {editable ? "Save" : "Edit"}
      </button>
      <ErrorDisplay message={saveErr} />
    </div>
  );
}

export default SavedDefinitionView;
