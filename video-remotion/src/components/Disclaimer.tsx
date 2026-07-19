import { TextReveal } from "./TextReveal";

export type DisclaimerProps = {
  text: string;
  delay?: number;
  color?: string;
};

export const Disclaimer = ({
  text,
  delay = 18,
  color = "rgba(32,52,20,0.82)",
}: DisclaimerProps) => (
  <TextReveal
    delay={delay}
    duration={24}
    style={{
      bottom: 104,
      color,
      fontSize: 27,
      left: 86,
      letterSpacing: 0.3,
      lineHeight: 1.45,
      position: "absolute",
      right: 86,
      textAlign: "center",
    }}
  >
    {text}
  </TextReveal>
);
