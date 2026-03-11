declare module "d3-bboxCollide" {
  import { SimulationNodeDatum } from "d3-force";

  interface BboxCollideForce<NodeDatum extends SimulationNodeDatum> {
    (alpha: number): void;
    initialize(nodes: NodeDatum[]): void;
    bbox(
      bbox: (d: NodeDatum) => [[number, number], [number, number]]
    ): this;
    strength(strength: number): this;
    iterations(iterations: number): this;
  }

  export function bboxCollide<NodeDatum extends SimulationNodeDatum>(
    bbox: (d: NodeDatum) => [[number, number], [number, number]]
  ): BboxCollideForce<NodeDatum>;
}
