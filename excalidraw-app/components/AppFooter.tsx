import { Footer } from "@excalidraw/excalidraw/index";
import React from "react";

import { isExcalidrawPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

export const AppFooter = React.memo(
  ({ onChange }: { onChange: () => void }) => {
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {!isExcalidrawPlusSignedUser && <EncryptedIcon />}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ opacity: 0.7, fontSize: ".75rem" }}
          >
            Privacy
          </a>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ opacity: 0.7, fontSize: ".75rem" }}
          >
            Terms
          </a>
        </div>
      </Footer>
    );
  },
);
