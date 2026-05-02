import EntityCRUD from "./EntityCRUD";
export default function Machines() {
  return <EntityCRUD resource="machines" addLabelKey="add_machine" testidPrefix="machine" />;
}
