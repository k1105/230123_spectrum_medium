import { MutableRefObject } from "react";

type Props = {
  margin_x: number;
  col: number;
  max_col: number;
  controllerRefs: MutableRefObject<HTMLDivElement>[];
};

export const MotionControllUI = ({
  margin_x,
  col,
  max_col,
  controllerRefs,
}: Props) => {
  return (
    <>
      <div className="container">
        {(() => {
          const elem = [];
          for (let i = 0; i < max_col; i++) {
            elem.push(
              <div key={"item_" + i} className="item" ref={controllerRefs[i]}>
                <a>mute</a>
                <a>delete</a>
              </div>
            );
          }
          return elem;
        })()}
      </div>
      <style jsx>{`
        .container {
          color: #ccc;
          width: calc(100vw - ${margin_x * 2}px);
          position: absolute;
          bottom: 75px;
          left: ${margin_x}px;
          display: flex;
          font-size: 0.8rem;
          justify-content: space-between;
        }
        .item {
          width: ${100 / max_col}%;
          opacity: 0;
          pointer-events: none;
        }
        p {
          margin: 0;
        }
        a {
          display: block;
        }
      `}</style>
    </>
  );
};
