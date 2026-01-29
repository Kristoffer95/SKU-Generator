import { Composition } from "remotion";
import { SKUDemo } from "./compositions/SKUDemo.js";
import "../src/index.css";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SKUDemo"
        component={SKUDemo}
        durationInFrames={1050}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
