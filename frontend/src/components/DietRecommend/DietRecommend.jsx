import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import MetaData from "../layouts/Header/MetaData";
import { toastifyOptions } from "../../utils/toastify";

const sectionTitleClass = "mb-4 border-b-2 border-brand-50 pb-3 font-body text-base font-bold text-brand-900";
const fieldClass = "flex flex-col gap-2 font-body text-sm font-medium text-earth-600 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-300 [&_input]:bg-cream-100 [&_input]:px-4 [&_input]:py-3 [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input:focus]:border-brand-700 [&_input:focus]:bg-white [&_input:focus]:outline-none";
const foodCardClass = "flex min-h-[190px] flex-col items-start gap-3 rounded-card border border-admin-border bg-white p-5 font-body text-earth-900 shadow-sm";

const HEALTH_CONDITIONS = [
  { label: "High Blood Pressure", key: "hbp",         yesValue: 1 },
  { label: "Low Blood Pressure",  key: "lbp",         yesValue: 2 },
  { label: "Anaemia",             key: "anaemia",      yesValue: 3 },
  { label: "Allergies",           key: "allergies",    yesValue: 4 },
  { label: "Cholesterol",         key: "cholesterol",  yesValue: 5 },
  { label: "Asthma",              key: "asthma",       yesValue: 6 },
  { label: "Diabetes",            key: "diabetes",     yesValue: 7 },
];

const defaultConditions = Object.fromEntries(HEALTH_CONDITIONS.map(({ key }) => [key, 0]));

const DietRecommend = () => {
  const [age,     setAge]     = useState("");
  const [height,  setHeight]  = useState("");
  const [weight,  setWeight]  = useState("");
  const [gender,  setGender]  = useState("0");
  const [conditions, setConditions] = useState(defaultConditions);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleCondition = (key, yesValue) => {
    setConditions((prev) => ({ ...prev, [key]: prev[key] === yesValue ? 0 : yesValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!age || !height || !weight) {
      toast.error("Please fill in all personal details.", { ...toastifyOptions });
      return;
    }
    setLoading(true);
    try {
      const diseases = HEALTH_CONDITIONS.map(({ key }) => conditions[key]);
      const { data: recommendationData } = await axios.post("/api/v1/diet/recommend", {
        age: Number(age), height: Number(height), weight: Number(weight),
        gender: Number(gender), diseases,
      });

      setRecommendations(recommendationData.recommendations || []);
      if (!recommendationData.recommendations?.length) {
        toast.info("No matching products found for your profile.", { ...toastifyOptions });
      }
    } catch (err) {
      toast.error("Could not get recommendations. Please try again.", { ...toastifyOptions });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MetaData title="Diet Recommendation" />
      <div className="min-h-[calc(100vh-68px)]">
        <div className="relative flex min-h-[480px] flex-col items-center justify-center overflow-hidden bg-brand-900 px-6 pb-32 pt-24 text-center">
          <img src="/searchA.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-brand-900/60 via-brand-900/40 to-brand-900/30" />
          <h1 className="relative font-display text-3xl text-white drop-shadow-lg sm:text-4xl">Your Personalised Diet Plan</h1>
          <p className="relative mt-3 font-body text-base text-white/90 drop-shadow">We do not share this information anywhere.</p>
        </div>

        <div className="relative z-10 mx-auto -mt-44 flex max-w-[820px] flex-col gap-8 px-4 pb-12 sm:px-6 sm:pb-20">
          <form className="flex flex-col gap-8 rounded-card border border-admin-border bg-white p-5 shadow-xl sm:p-8" onSubmit={handleSubmit}>
            <div>
              <h3 className={sectionTitleClass}>Personal Details</h3>
              <div className="grid grid-cols-1 gap-4 min-[421px]:grid-cols-2 md:grid-cols-3">
                <label className={fieldClass}>Age<input type="number" min="1" max="120" placeholder="e.g. 28" value={age} onChange={(e) => setAge(e.target.value)} required /></label>
                <label className={fieldClass}>Height (m)<input type="number" step="0.01" min="0.5" max="5" placeholder="e.g. 1.72" value={height} onChange={(e) => setHeight(e.target.value)} required /></label>
                <label className={fieldClass}>Weight (kg)<input type="number" step="0.1" min="10" max="300" placeholder="e.g. 68" value={weight} onChange={(e) => setWeight(e.target.value)} required /></label>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <p className="font-body text-sm font-medium text-earth-600">Gender</p>
                <div className="flex gap-3" role="group" aria-label="Gender">
                  {[{ v: "0", l: "Female" }, { v: "1", l: "Male" }].map(({ v, l }) => (
                    <button
                      key={v} type="button" aria-pressed={gender === v}
                      className={`flex-1 rounded-lg border px-4 py-3 font-body text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 ${gender === v ? "border-brand-900 bg-brand-900 text-white" : "border-brand-300 bg-white text-earth-600 hover:border-brand-700"}`}
                      onClick={() => setGender(v)}
                    >{l}</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className={sectionTitleClass}>Health Conditions</h3>
              <p className="mb-3 font-body text-sm text-earth-600">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {HEALTH_CONDITIONS.map(({ label, key, yesValue }) => (
                  <button
                    key={key} type="button" aria-pressed={conditions[key] !== 0}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-body text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 ${conditions[key] !== 0 ? "border-brand-300 bg-brand-50 font-semibold text-brand-900" : "border-brand-300 bg-white text-earth-600 hover:border-brand-700 hover:text-brand-900"}`}
                    onClick={() => toggleCondition(key, yesValue)}
                  >
                    {label}
                    {conditions[key] !== 0 && <span aria-hidden="true" className="text-brand-700">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 self-center px-10 py-4" disabled={loading}>
              {loading ? "Analysing..." : "Get Recommendations"}
            </button>
          </form>

          {recommendations.length > 0 && (
            <div className="text-center">
              <h3 className="mb-6 font-display text-2xl text-brand-900">Recommended for You</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 text-left">
                {recommendations.map(({ name, reason, product }) => (
                  product ? (
                    <Link key={name} to={product.href} className={`${foodCardClass} transition-colors hover:border-brand-500 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700`}>
                      <span className="font-body text-xs font-bold uppercase tracking-wide text-brand-900">Available in our catalog</span>
                      <strong className="font-display text-xl text-brand-900">{name}</strong>
                      <small className="max-w-60 flex-1 font-body text-sm leading-normal text-earth-600">{reason}</small>
                      <span className="font-body text-sm font-bold text-brand-900">View product <span aria-hidden="true">→</span></span>
                    </Link>
                  ) : (
                    <div key={name} className={`${foodCardClass} border-brand-300 bg-admin-border`}>
                      <span className="font-body text-xs font-bold uppercase tracking-wide text-earth-600">Not in our catalog</span>
                      <strong className="font-display text-xl text-earth-600">{name}</strong>
                      <small className="max-w-60 flex-1 font-body text-sm leading-normal text-earth-600">{reason}</small>
                      <em className="font-body text-xs not-italic leading-normal text-earth-600">We found this recommendation, but it is not currently available to buy here.</em>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DietRecommend;
