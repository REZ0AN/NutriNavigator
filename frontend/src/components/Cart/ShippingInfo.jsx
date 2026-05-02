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
import "./Shipping.css";

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
      <div className="shipping-page">
        <div className="shipping-card">
          <h2 className="shipping-title">Shipping Details</h2>
          <form className="shipping-form" onSubmit={handleSubmit}>
            {[
              { icon: MdHome, placeholder: "Address", value: address, setter: setAddress, type: "text" },
              { icon: MdLocationCity, placeholder: "City", value: city, setter: setCity, type: "text" },
              { icon: MdPinDrop, placeholder: "PIN Code", value: pinCode, setter: setPinCode, type: "number" },
              { icon: MdPhone, placeholder: "Phone Number (11 digits)", value: phoneNo, setter: setPhoneNo, type: "tel" },
            ].map(({ icon: Icon, placeholder, value, setter, type }) => (
              <div key={placeholder} className="shipping-field">
                <Icon className="shipping-field__icon" />
                <input type={type} placeholder={placeholder} required value={value} onChange={(e) => setter(e.target.value)} />
              </div>
            ))}

            <div className="shipping-field">
              <MdPublic className="shipping-field__icon" />
              <select required value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Select Country</option>
                {Country.getAllCountries().map((c) => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
              </select>
            </div>

            {country && (
              <div className="shipping-field">
                <MdTransferWithinAStation className="shipping-field__icon" />
                <select required value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">Select State</option>
                  {State.getStatesOfCountry(country).map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                </select>
              </div>
            )}

            <button type="submit" className="btn btn--primary shipping-submit" disabled={!state}>Continue</button>
          </form>
        </div>
      </div>
    </>
  );
};
export default ShippingInfo;
