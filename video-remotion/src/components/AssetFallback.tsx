export type AssetFallbackProps = {
  relativePath: string;
};

export const AssetFallback = ({ relativePath }: AssetFallbackProps) => (
  <div
    style={{
      alignItems: "center",
      backgroundColor: "#FFF1F0",
      border: "4px solid #D92D20",
      color: "#8A1C13",
      display: "flex",
      fontSize: 24,
      height: "100%",
      justifyContent: "center",
      lineHeight: 1.3,
      padding: 18,
      textAlign: "center",
      width: "100%",
      wordBreak: "break-all",
    }}
  >
    素材加载失败
    <br />
    {relativePath}
  </div>
);
