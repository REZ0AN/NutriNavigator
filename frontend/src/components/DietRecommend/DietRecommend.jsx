import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import MetaData from "../layouts/Header/MetaData";
import { toastifyOptions } from "../../utils/toastify";
import "./DietRecommend.css";

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
  const [recommendedFoods, setRecommendedFoods] = useState([]);
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
      const disease = HEALTH_CONDITIONS.map(({ key }) => conditions[key]);
      const { data: mlData } = await axios.post("/api/v1/diet/recommend", {
        age: Number(age), height: Number(height), weight: Number(weight),
        gender: Number(gender), diesease: disease,
      });

      setRecommendedFoods(mlData.recommended_foods || []);
      if (mlData.recommended_foods.length === 0) {
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
      <div className="diet-page">
        <div className="diet-hero">
          <h1 className="diet-hero__title">Your Personalised Diet Plan</h1>
          <p className="diet-hero__subtitle">We do not share this information anywhere.</p>
        </div>

        <div className="diet-layout">
          <form className="diet-form" onSubmit={handleSubmit}>
            <div className="diet-form__section">
              <h3>Personal Details</h3>
              <div className="diet-form__row">
                <div className="diet-input-group">
                  <label>Age</label>
                  <input type="number" min="1" max="120" placeholder="e.g. 28" value={age} onChange={(e) => setAge(e.target.value)} required />
                </div>
                <div className="diet-input-group">
                  <label>Height (m)</label>
                  <input type="number" step="0.01" min="0.5" max="5" placeholder="e.g. 1.72" value={height} onChange={(e) => setHeight(e.target.value)} required />
                </div>
                <div className="diet-input-group">
                  <label>Weight (kg)</label>
                  <input type="number" step="0.1" min="10" max="300" placeholder="e.g. 68" value={weight} onChange={(e) => setWeight(e.target.value)} required />
                </div>
              </div>
              <div className="diet-input-group">
                <label>Gender</label>
                <div className="diet-gender-btns">
                  {[{ v: "0", l: "Female" }, { v: "1", l: "Male" }].map(({ v, l }) => (
                    <button
                      key={v} type="button"
                      className={`diet-gender-btn ${gender === v ? "diet-gender-btn--active" : ""}`}
                      onClick={() => setGender(v)}
                    >{l}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="diet-form__section">
              <h3>Health Conditions</h3>
              <p className="diet-form__hint">Select all that apply</p>
              <div className="diet-conditions">
                {HEALTH_CONDITIONS.map(({ label, key, yesValue }) => (
                  <button
                    key={key} type="button"
                    className={`diet-condition-chip ${conditions[key] !== 0 ? "diet-condition-chip--active" : ""}`}
                    onClick={() => toggleCondition(key, yesValue)}
                  >
                    {label}
                    {conditions[key] !== 0 && <span className="diet-condition-chip__check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn--primary diet-submit" disabled={loading}>
              {loading ? "Analysing..." : "Get Recommendations"}
            </button>
          </form>

          {recommendedFoods.length > 0 && (
            <div className="diet-results">
              <h3 className="diet-results__title">Recommended for You</h3>
              <div className="diet-results__grid">
                {recommendedFoods.map((food) => (
                  <Link key={food} to={`/products/${food}`} className="diet-food-chip">
                    {food}
                  </Link>
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
