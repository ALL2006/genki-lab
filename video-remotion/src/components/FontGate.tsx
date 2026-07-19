import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
} from "remotion";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  FONT_ERROR_MESSAGE,
  FONT_WEIGHT,
  SOURCE_HAN_FONT_CANDIDATES,
} from "../styles/typography";

const SourceHanFontContext = createContext<string | null>(null);

export const useSourceHanFont = (): string => {
  const fontFamily = useContext(SourceHanFontContext);
  if (!fontFamily) {
    throw new Error("FontGate尚未提供思源黑体家族。所有正式场景必须位于FontGate内。 ");
  }
  return fontFamily;
};

export type FontGateProps = {
  children: ReactNode;
};

export const FontGate = ({ children }: FontGateProps) => {
  const [handle] = useState(() => delayRender("检测Windows思源黑体"));
  const [fontFamily, setFontFamily] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const detectFont = async () => {
      try {
        await document.fonts.ready;
        const matched = SOURCE_HAN_FONT_CANDIDATES.find((candidate) =>
          document.fonts.check(
            `${FONT_WEIGHT} 48px "${candidate}"`,
            "元气森林青提茉莉气泡茶",
          ),
        );

        if (!matched) {
          cancelRender(new Error(FONT_ERROR_MESSAGE));
          return;
        }

        if (active) {
          setFontFamily(matched);
          continueRender(handle);
        }
      } catch (error) {
        cancelRender(error instanceof Error ? error : new Error(String(error)));
      }
    };

    void detectFont();
    return () => {
      active = false;
    };
  }, [handle]);

  if (!fontFamily) {
    return <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }} />;
  }

  return (
    <SourceHanFontContext.Provider value={fontFamily}>
      <AbsoluteFill style={{ fontFamily, fontWeight: FONT_WEIGHT }}>
        {children}
      </AbsoluteFill>
    </SourceHanFontContext.Provider>
  );
};
