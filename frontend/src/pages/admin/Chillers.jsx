import EntityCRUD from "./EntityCRUD";
export default function Chillers() {
  return <EntityCRUD resource="chillers" addLabelKey="add_chiller" testidPrefix="chiller" />;
}
