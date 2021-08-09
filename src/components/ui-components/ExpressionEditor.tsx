import React, { ReactElement, useCallback } from "react";
import { Controlled as CodeMirrorElement } from "react17-codemirror2";
import { getFunctionInfo } from "../../lib/codapPhone";

// This is required for defineSimpleMode
import "codemirror/addon/mode/simple.js";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/show-hint.js";
import "codemirror/addon/display/placeholder.js";
import "codemirror/lib/codemirror.css";
import CodeMirror, { HintFunction } from "codemirror";
import "./styles/ExpressionEditor.css";

// Adapted from codap/apps/dg/formula/formula.js
const firstChar =
  "A-Za-z_\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE";
const otherChars = "0-9" + firstChar;

const functionRegExp = new RegExp(`[${firstChar}][${otherChars}]*(?=\\()`);
const identifierRegExp = new RegExp(`[${firstChar}][${otherChars}]*`);

// Adapted from codap/apps/dg/formula/codapFormulaMode.js
// Docs for defineSimpleMode: https://codemirror.net/demo/simplemode.html
CodeMirror.defineSimpleMode("codapFormula", {
  start: [
    {
      regex: /(?:"(?:[^\\]|\\.)*?(?:"|$))|(?:'(?:[^\\]|\\.)*?(?:'|$))/,
      token: "string",
    },
    { regex: /true|false/, token: "atom" },
    {
      regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
      token: "number",
    },
    { regex: /[-+/*=<>!^]+/, token: "operator" },
    { regex: functionRegExp, token: "function" },
    { regex: identifierRegExp, token: "variable" },
    { regex: /(?:`(?:[^\\]|\\.)*?(?:`|$))/, token: "variable" },
  ],
  meta: {
    dontIndentStates: ["start"],
  },
});

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  attributeNames?: string[];
  disabled?: boolean;
  onBlur?: () => void;
}

const delimiters = new Set([" ", "(", ")", "`"]);

function isMatchableChar(m: string) {
  return !delimiters.has(m);
}

/**
 * Checks if `candidate` is a prefix of the lowercase version of `full`,
 * assumes candidate is already lowercase.
 */
function isLowerCasePrefix(full: string, candidate: string) {
  return full.toLowerCase().startsWith(candidate);
}

/**
 * A word with its position
 */
interface Word {
  start: number;
  end: number;
  word: string;
}

function getCurrentWord(cm: CodeMirror.Editor): Word {
  const cursor = cm.getCursor();
  const end = cursor.ch;
  let start = end;

  const currentLine = cm.getLine(cursor.line);
  while (start && isMatchableChar(currentLine.charAt(start - 1))) --start;

  return {
    start,
    end,
    word: currentLine.slice(start, end),
  };
}

const LOOKUP_FUNCTIONS_CATEGORY = "Lookup Functions";

export default function ExpressionEditor({
  value,
  onChange,
  attributeNames = [],
  disabled,
  onBlur,
}: ExpressionEditorProps): ReactElement {
  const codapFormulaHints: HintFunction = useCallback(
    async (cm) => {
      const cursor = cm.getCursor();
      const { start, end, word } = getCurrentWord(cm);
      const wordLower = word.toLowerCase();
      const fromPos = CodeMirror.Pos(cursor.line, start);
      const toPos = CodeMirror.Pos(cursor.line, end);

      // Don't complete if word is empty string
      const completionList =
        word === ""
          ? []
          : attributeNames
              .filter((w) => isLowerCasePrefix(w, wordLower))

              // When completing words with spaces, include backticks
              .map((w) => {
                if (w.includes(" ")) {
                  return {
                    displayText: w,
                    text: `\`${w}\``,
                  };
                } else {
                  return w;
                }
              });

      // Complete function names
      const functionInfo = await getFunctionInfo();
      const functionCompletionList =
        word === ""
          ? []
          : functionInfo
              // Do not include lookup functions as they are not available in
              // our plain formula context
              .filter((f) => f.category !== LOOKUP_FUNCTIONS_CATEGORY)
              .map((f) => f.name)
              .filter((w) => isLowerCasePrefix(w, wordLower))
              // Add parens
              .map((w) => w + "()")
              .map((w) => ({
                text: w,
                displayText: w,
                hint: () => {
                  cm.replaceRange(w, fromPos, toPos);
                  const newCursor = cm.getCursor();
                  cm.setCursor(
                    CodeMirror.Pos(newCursor.line, newCursor.ch - 1)
                  );
                },
              }));

      return {
        list: completionList.concat(functionCompletionList),
        from: fromPos,
        to: toPos,
      };
    },
    [attributeNames]
  );

  return (
    <>
      <CodeMirrorElement
        className={disabled ? "editor-disabled" : undefined}
        value={value}
        options={{
          mode: "codapFormula",
          hintOptions: {
            completeSingle: false,
            hint: codapFormulaHints,
          },
          readOnly: disabled,
          placeholder: "Formula expression",
        }}
        onInputRead={(editor) => {
          editor.showHint();
        }}
        onBeforeChange={(editor, data, value) => {
          onChange(value);
        }}
        onBlur={onBlur}
      />
    </>
  );
}
