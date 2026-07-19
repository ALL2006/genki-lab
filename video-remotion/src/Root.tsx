import { Composition, Folder } from "remotion";
import { AssetCheck } from "./compositions/AssetCheck";
import {
  BeverageProductAd,
  type BeverageProductAdProps,
} from "./compositions/BeverageProductAd";
import { qingtiJasmineProduct } from "./data/qingti-jasmine";
import { getProductDuration } from "./types/product-video";

export const RemotionRoot = () => (
  <>
    <Folder name="Quality-Gates">
      <Composition
        id="AssetCheck"
        component={AssetCheck}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
      />
    </Folder>
    <Folder name="Beverage-Ads">
      <Composition
        id="QingtiJasmineAd"
        component={BeverageProductAd}
        durationInFrames={getProductDuration(qingtiJasmineProduct)}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={
          {
            product: qingtiJasmineProduct,
          } satisfies BeverageProductAdProps
        }
      />
    </Folder>
  </>
);
