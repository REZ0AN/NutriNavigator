import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Country, State } from "country-state-city";
import { MdHome, MdLocationCity, MdPinDrop, MdPhone, MdPublic, MdTransferWithinAStation } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import CheckoutSteps from "./CheckoutSteps";
import { saveShippingInfo } from "../../store/slices/cartSlice";
import { toastifyOptions } from "../../utils/toastify";

const fieldClass = "flex items-center gap-3 rounded-lg border border-brand-300 bg-cream-100 px-4 py-3 focus-within:border-brand-700 focus-within:bg-white";
const controlClass = "min-w-0 flex-1 border-0 bg-transparent font-body text-sm text-earth-900 outline-none";

const ShippingInfo = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { shippingInfo } = useSelector((s) => s.cartR);
  const [address,  setAddress]  = useState(shippingInfo.address  || "");
  const [city,     setCity]     = useState(shippingInfo.city     || "");
  const [pinCode,  setPinCode]  = useState(shippingInfo.pinCode  || "");
  const [phoneNo,  setPhoneNo]  = useState(shippingInfo.phoneNo  || "");
  const [country,  setCountry]  = useState(shippingInfo.country  || "");
  const [state,    setState]    = useState(shippingInfo.state    || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (phoneNo.length !== 11) { toast.error("Phone number must be 11 digits", { ...toastifyOptions }); return; }
    dispatch(saveShippingInfo({ address, city, pinCode, phoneNo, country, state }));
    navigate("/order/confirm");
  };

  return (
    <>
      <MetaData title="Shipping Details" />
      <CheckoutSteps activeStep={0} />
      <div className="flex min-h-[70vh] items-center justify-center bg-cream-100 px-4 py-8">
        <div className="w-full max-w-[480px] rounded-card border border-admin-border bg-white p-6 shadow-md sm:p-8">
          <h2 className="mb-6 text-center font-display text-2xl text-brand-900">Shipping Details</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {[
              { icon: MdHome, placeholder: "Address", value: address, setter: setAddress, type: "text" },
              { icon: MdLocationCity, placeholder: "City", value: city, setter: setCity, type: "text" },
              { icon: MdPinDrop, placeholder: "PIN Code", value: pinCode, setter: setPinCode, type: "number" },
              { icon: MdPhone, placeholder: "Phone Number (11 digits)", value: phoneNo, setter: setPhoneNo, type: "tel" },
            ].map(({ icon: Icon, placeholder, value, setter, type }) => (
              <label key={placeholder} className={fieldClass}>
                <Icon aria-hidden="true" className="shrink-0 text-lg text-admin-muted" />
                <span className="sr-only">{placeholder}</span>
                <input type={type} placeholder={placeholder} required value={value} onChange={(e) => setter(e.target.value)} className={controlClass} />
              </label>
            ))}

            <label className={fieldClass}>
              <MdPublic aria-hidden="true" className="shrink-0 text-lg text-admin-muted" />
              <span className="sr-only">Country</span>
              <select required value={country} onChange={(e) => setCountry(e.target.value)} className={controlClass}>
                <option value="">Select Country</option>
                {Country.getAllCountries().map((c) => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
              </select>
            </label>

            {country && (
              <label className={fieldClass}>
                <MdTransferWithinAStation aria-hidden="true" className="shrink-0 text-lg text-admin-muted" />
                <span className="sr-only">State</span>
                <select required value={state} onChange={(e) => setState(e.target.value)} className={controlClass}>
                  <option value="">Select State</option>
                  {State.getStatesOfCountry(country).map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                </select>
              </label>
            )}

            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 mt-2 w-full py-4" disabled={!state}>Continue</button>
          </form>
        </div>
      </div>
    </>
  );
};
export default ShippingInfo;
