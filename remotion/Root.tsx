import { Composition } from "remotion";
import { SKUDemo } from "./compositions/SKUDemo.js";
import { IntroScene } from "./scenes/IntroScene.js";
import { SpecManagementScene } from "./scenes/SpecManagementScene.js";
import { SpreadsheetScene } from "./scenes/SpreadsheetScene.js";
import { SettingsScene } from "./scenes/SettingsScene.js";
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
      <Composition
        id="IntroScene"
        component={IntroScene}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SpecManagementScene"
        component={SpecManagementScene}
        durationInFrames={210}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SpreadsheetScene"
        component={SpreadsheetScene}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SettingsScene"
        component={SettingsScene}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
