import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MdMailOutline } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import { resendVerification, clearUserError } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";
import { AuthShell, AuthHeader, AuthField, authFormClass, authInputClass, authSubmitClass } from "../Login/AuthShell";

const ResendVerification = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.userR);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearUserError()); }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(resendVerification(email));
    if (!result.error) {
      setSent(true);
      toast.success("Verification email sent!", { ...toastifyOptions });
    }
  };

  return (
    <>
      <MetaData title="Resend Verification" />
      <AuthShell>
          <AuthHeader title="Resend Verification">{sent ? "Check your inbox for the new link." : "Enter your email to receive a new verification link."}</AuthHeader>
          {!sent && (
            <form className={authFormClass} onSubmit={handleSubmit}>
              <AuthField label="Email address" icon={MdMailOutline}>
                <input
                  type="email" placeholder="Your email address" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className={authInputClass}
                />
              </AuthField>
              <button type="submit" className={authSubmitClass} disabled={loading}>
                Send Verification Email
              </button>
            </form>
          )}
      </AuthShell>
    </>
  );
};

export default ResendVerification;
