export interface GridModeProperties {
  // If it blocks other objects (except agents or falling objects (if
  // squashable)) from occupying the same space.
  solid: boolean;
  // If it blocks agents from occupying the same space
  blocking: boolean;
  // If it falls due to gravity (when there's no solid object supporting it)
  heavy: boolean;
  // If an agent can move it
  movable: boolean;
  // If other items can be stacked on top without rolling off
  stackable: boolean;
  // If a falling object can occupy the same space
  squashable: boolean;
  // If the entity is an agent
  isAgent: boolean;
}

export const DEFAULT_GRID_MODE_PROPS: GridModeProperties = {
  solid: false,
  blocking: false,
  heavy: false,
  movable: false,
  stackable: false,
  squashable: false,
  isAgent: false
};
