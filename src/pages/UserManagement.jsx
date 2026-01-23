import CreateUser from "./CreateUser";
import ShowAllUsers from "./ShowAllUsers";
import Offerletter from "./Offerletter";

export default function UserManagement() {
  return (
    <main style={{ padding: "20px", background: "#f3f4f6", minHeight: "100vh" }}>
      <CreateUser />
      <ShowAllUsers />
      <Offerletter />
    </main>
  );
}
