import EntityCRUD from "./EntityCRUD";
export default function Panels() {
  return <EntityCRUD resource="panels" addLabelKey="add_panel" testidPrefix="panel" />;
}
