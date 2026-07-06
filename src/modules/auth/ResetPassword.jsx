import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const ResetPassword = () => {
  const [password, setPassword] = useState("");

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) alert(error.message);
    else alert("Password updated successfully!");
  };

  return (
    <div style={{ padding: "50px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Reset Password</h2>

      <input
        type="password"
        placeholder="Enter new password"
        style={{ width: "100%", padding: "10px", marginTop: "10px", boxSizing: "border-box" }}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button
        onClick={handleReset}
        style={{
          width: "100%",
          padding: "10px",
          background: "#6366f1",
          color: "white",
          border: "none",
          cursor: "pointer",
          borderRadius: "6px",
        }}
      >
        Update Password
      </button>
    </div>
  );
};

export default ResetPassword;
