import EntityCRUD from "./EntityCRUD";
export default function CoolingTowers() {
  return <EntityCRUD resource="cooling-towers" addLabelKey="add_cooling_tower" testidPrefix="cooling-tower" reorderable />;
}
