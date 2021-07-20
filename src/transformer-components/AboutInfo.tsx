import React, { ReactElement } from "react";
import Popover from "../ui-components/Popover";
import "./AboutInfo.css";

function AboutInfo(): ReactElement {
  return (
    <Popover
      button={<button style={{ fontSize: "11px" }}>About</button>}
      buttonStyles={{ float: "right" }}
      tooltip={`About the Transformers Plugin`}
      innerContent={
        <div id="about-info">
          <h3>About</h3>
          <p>
            The Transformers plugin allows you to transform datasets to produce
            new, distinct output datasets or values, instead of modifying the
            original input dataset itself. This enables easy “what if”
            exploration and comparison of datasets that may represent distinct
            transformations performed on the same source dataset.
          </p>

          <p>
            The result of one transformer can be used as an input to another,
            and in this way transformers can be chained together, resulting in a
            sequence of datasets, each a transformed version of the previous.
            This way of manipulating a dataset can be useful for making clear
            the specific steps that were used to process the data or change its
            structure.
          </p>

          <p>
            Any updates made to the input of a transformer will flow through and
            affect its outputs. If you have a chain of transformed datasets, the
            updates will flow through the chain.
          </p>

          <p>
            You can also save a particular configuration of a transformer, and
            reuse this custom transformer on several datasets.
          </p>

          <h3>Getting Started</h3>
          <p>
            To get started with the Transformers plugin, check out the various
            transformers in the “Transformer Type” dropdown. To learn more about
            a specific transformer, click the “i” icon next to the dropdown.
          </p>

          <h3>Authors</h3>
          <p>
            This plugin is brought to you by the{" "}
            <a
              href="https://cs.brown.edu/research/plt/"
              target="_blank"
              rel="noreferrer"
            >
              Brown University PLT
            </a>{" "}
            in collaboration with{" "}
            <a href="https://concord.org/" target="_blank" rel="noreferrer">
              The Concord Consortium
            </a>{" "}
            and{" "}
            <a
              href="https://bootstrapworld.org/"
              target="_blank"
              rel="noreferrer"
            >
              Bootstrap World
            </a>
            .
          </p>
        </div>
      }
    />
  );
}

export default AboutInfo;