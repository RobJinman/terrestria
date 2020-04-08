export interface FreeModeProperties {
  heavy: boolean;
  fixedAngle: boolean;
  bodiless?: boolean;
}

export const DEFAULT_FREE_MODE_PROPS: FreeModeProperties = {
  heavy: false,
  fixedAngle: true,
  bodiless: true
};
