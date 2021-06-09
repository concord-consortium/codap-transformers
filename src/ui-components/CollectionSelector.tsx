import React, { ReactElement, ChangeEvent } from "react";
import CodapFlowSelect from "./CodapFlowSelect";
import { useCollections } from "../utils/hooks";

interface CollectionSelectorProps {
  context: string | null;
  value: string | null;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}

export default function CollectionSelector({
  context,
  value,
  onChange,
  disabled,
}: CollectionSelectorProps): ReactElement {
  const collections = useCollections(context);

  return (
    <CodapFlowSelect
      onChange={onChange}
      options={collections.map((collection) => ({
        value: collection.name,
        title: collection.title,
      }))}
      value={value}
      defaultValue="Select a collection"
      disabled={disabled}
    />
  );
}