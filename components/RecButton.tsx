import { RefObject } from "react";

type Props = {
  recButtonRef: RefObject<HTMLButtonElement>;
};

export const RecButton = ({ recButtonRef }: Props) => {
  return (
    <>
      <div className="container">
        <button
          ref={recButtonRef}
          //   onClick={() => {
          //     recButtonRef.current?.textContent = "Pause";
          //   }}
        >
          Record
        </button>
        <button>Reset</button>
      </div>

      <style jsx>{`
        .container {
          position: absolute;
          right: 11vw;
          top: 65vh;
          color: white;
          display: flex;
          width: 210px;
          justify-content: space-between;
        }
        button {
          color: black;
          background-color: #ccc;
          display: inline-block;
          width: 100px;
          padding: 10px;
          border: none;
        }
      `}</style>
    </>
  );
};
